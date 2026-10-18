import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ZernioClient, zernioClient } from '@/lib/zernio/client';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { WorkspaceStore } from '@/lib/storage/workspace-store';

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
   * Sends a reply in an inbox conversation with an `Idempotency-Key` so retries never double-send.
   * Ref: zernio.txt lines 19057-19139
   */
  public static async sendConversationReply(params: {
    organizationId: string;
    conversationId: string;
    accountId: string;
    message: string;
    idempotencyKey?: string;
  }) {
    await assertSubServiceAllowed(params.organizationId, 'inbox_crm');
    const idempotencyKey =
      params.idempotencyKey || ZernioClient.newIdempotencyKey('msg');

    if (!zernioClient.isConfigured()) {
      return {
        simulated: true,
        idempotencyKey,
        success: true,
        data: {
          messageId: `msg_${Date.now().toString(36)}`,
          conversationId: params.conversationId,
          status: 'accepted',
        },
      };
    }

    const { data } = await zernioClient.request<{
      success: boolean;
      data: { messageId: string; conversationId: string };
    }>({
      method: 'POST',
      path: `/inbox/conversations/${params.conversationId}/messages`,
      idempotencyKey,
      body: {
        accountId: params.accountId,
        message: params.message,
      },
    });

    return {
      simulated: false,
      idempotencyKey,
      ...data,
    };
  }

  /**
   * Lists or backfills conversations for a tenant (`GET /v1/inbox/conversations?profileId=`).
   * Surfaces `meta.failedAccounts` so the UI can prompt reconnection if a token expired.
   * Ref: zernio.txt lines 19141-19204
   */
  public static async listConversations(params: {
    organizationId: string;
    cursor?: string;
    limit?: number;
  }) {
    await assertSubServiceAllowed(params.organizationId, 'inbox_crm');
    const profileId = await CoreConnectService.ensureTenantProfile(
      params.organizationId
    );

    const ws = WorkspaceStore.getWorkspace(params.organizationId);

    if (!zernioClient.isConfigured()) {
      return {
        simulated: true,
        data: ws.inboxConversations || [],
        pagination: { hasMore: false, nextCursor: null },
        meta: { accountsQueried: 0, accountsFailed: 0, failedAccounts: [] },
      };
    }

    const { data } = await zernioClient.request({
      method: 'GET',
      path: '/inbox/conversations',
      query: {
        profileId,
        status: 'active',
        limit: params.limit ?? 50,
        ...(params.cursor ? { cursor: params.cursor } : {}),
      },
    });

    return { simulated: false, ...data };
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
