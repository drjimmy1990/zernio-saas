import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ZernioApiException, ZernioClient, zernioClient } from '@/lib/zernio/client';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { runInboxPublicApi, runInboxReply } from '@/lib/inbox/actions';

/**
 * SUB-SERVICE 3: UNIFIED OMNICHANNEL INBOX, CRM, BROADCASTS & AUTOMATIONS
 * - Real-time webhook-first DM inbox across Instagram, Facebook, WhatsApp, X, Telegram,
 *   Bluesky, Reddit, Slack, SMS, RCS & iMessage
 * - Unified Comments (`/v1/comments`), Reviews (`/v1/reviews`) & Mentions (`/v1/mentions`)
 * - Cross-Platform Contact CRM (`/v1/contacts`) & Custom Fields (`/v1/custom-fields`)
 * - Comment-to-DM Growth Automations (`/v1/comment-automations`)
 * - Multi-channel Broadcasts (`/v1/broadcasts`), Drip Sequences (`/v1/sequences`) &
 *   Branching Workflows (`/v1/workflows`)
 * Ref: zernio.txt lines 18898-19226
 */
export class InboxCrmService {
  /**
   * Sends through the verified account's channel. An uncertain send requires
   * reconciliation; idempotency alone does not guarantee safe retries after 5xx.
   * Ref: zernio.txt lines 19057-19139
   */
  public static async sendConversationReply(params: {
    organizationId: string;
    conversationId: string;
    accountId: string;
    message: string;
    idempotencyKey?: string;
  }) {
    return runInboxReply(params.organizationId, {
      accountId: params.accountId, conversationId: params.conversationId,
      text: params.message, idempotencyKey: params.idempotencyKey });
  }

  /**
   * Lists or backfills conversations for a tenant (`GET /v1/inbox/conversations?profileId=`).
   * Surfaces `meta.failedAccounts` so the UI can prompt reconnection if a token expired.
   * Ref: zernio.txt lines 19141-19204
   */
  public static async listConversations(params: {
    organizationId: string;
    accountId?: string;
    platform?: 'facebook' | 'instagram' | 'whatsapp';
    cursor?: string;
    limit?: number;
  }) {
    return runInboxPublicApi(params.organizationId, 'GET', ['inbox', 'conversations'], params);
  }

  /**
   * Creates a Comment-to-DM Growth Automation, Broadcast, Drip Sequence, or Branching Workflow.
   * Ref: zernio.txt lines 35-46 & 170-173 & 274-297
   */
  public static async createGrowthAutomation(params: {
    organizationId: string;
    type: 'comment_to_dm' | 'broadcast' | 'sequence' | 'workflow';
    name: string;
    config: Record<string, unknown>;
  }) {
    if (params.type === 'broadcast') {
      throw new ZernioApiException({ status: 410, code: 'use_whatsapp_broadcast_flow', error: 'Create a reviewed WhatsApp draft through /api/v1/broadcasts with an account, approved template and stable idempotency key.' });
    }
    await assertSubServiceAllowed(params.organizationId, 'inbox_crm');
    const profileId = await CoreConnectService.ensureTenantProfile(
      params.organizationId
    );

    const endpointMap = {
      comment_to_dm: '/comment-automations',
      broadcast: '/broadcasts',
      sequence: '/sequences',
      workflow: '/workflows',
    } as const;

    if (!zernioClient.isConfigured()) {
      const record = {
        id: `auto_${params.type}_${Date.now().toString(36)}`,
        profileId,
        type: params.type,
        name: params.name,
        status: 'active',
        config: params.config,
      };
      return { simulated: true, automation: record };
    }

    const { data } = await zernioClient.request({
      method: 'POST',
      path: endpointMap[params.type],
      idempotencyKey: ZernioClient.newIdempotencyKey(params.type),
      body: {
        profileId,
        name: params.name,
        ...params.config,
      },
    });

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      await supabase.from('growth_automations').insert({
        organization_id: params.organizationId,
        automation_type: params.type,
        name: params.name,
        status: 'active',
        config: params.config,
      });
    }

    return { simulated: false, automation: data };
  }
}
