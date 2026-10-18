import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ZernioClient, zernioClient } from '@/lib/zernio/client';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { CoreConnectService } from '@/lib/services/core-connect.service';

/**
 * SUB-SERVICE 8: WHITE-LABEL AI DIAGNOSTICS & SUPPORT ASSISTANT
 * - Lets customers click "Diagnose with AI" on any failed post (`postId`),
 *   disconnected/erroring account (`accountId`), or profile (`profileId`).
 * - Calls `POST /v1/support/runs` with an `Idempotency-Key` and tenant `maxCostUsd` cap.
 * - Receives the root-cause answer via `support.run.completed` webhook and renders it
 *   inside your own SaaS UI so customers never leave your platform.
 * Ref: zernio.txt lines 650-792
 */
export class SupportAiService {
  public static async askDiagnosticQuestion(params: {
    organizationId: string;
    message: string;
    context: {
      postId?: string;
      accountId?: string;
      profileId?: string;
    };
    maxCostUsd?: number;
    idempotencyKey?: string;
  }) {
    const policy = await assertSubServiceAllowed(
      params.organizationId,
      'support_ai'
    );
    const profileId = await CoreConnectService.ensureTenantProfile(
      params.organizationId
    );

    const idempotencyKey =
      params.idempotencyKey || ZernioClient.newIdempotencyKey('support-diag');
    const maxCostUsd = Math.min(
      Math.max(params.maxCostUsd ?? 1.5, 0.5),
      Math.min(3.0, policy.quotas.maxAiSupportUsd)
    );

    if (!zernioClient.isConfigured()) {
      return {
        simulated: true,
        runId: `run_${Date.now().toString(36)}`,
        threadId: `thread_${Date.now().toString(36)}`,
        status: 'completed',
        stopReason: 'answered',
        question: params.message,
        answer:
          'Root-cause diagnosis: Meta returned HTTP 403 when fetching the image URL because the upstream bucket had private ACLs enabled, and the Facebook Page token for @acme_fb_page expired after a password reset. Fix: 1) Upload media through the Supabase White-Label CDN bucket or public URL, and 2) Click "Reconnect Page" in Connections to refresh the OAuth grant.',
        costUsd: 0.24,
        maxCostUsd,
      };
    }

    const { data } = await zernioClient.request<{
      runId: string;
      threadId: string;
      status: string;
      pollAfterSeconds?: number;
    }>({
      method: 'POST',
      path: '/support/runs',
      idempotencyKey,
      body: {
        message: params.message,
        context: {
          profileId,
          ...params.context,
        },
        maxCostUsd,
      },
    });

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase.from('ai_support_runs').insert({
        organization_id: params.organizationId,
        zernio_run_id: data.runId,
        zernio_thread_id: data.threadId,
        question: params.message,
        context: { profileId, ...params.context },
        status: data.status,
        max_cost_usd: maxCostUsd,
      });
    }

    return {
      simulated: false,
      maxCostUsd,
      ...data,
    };
  }
}
