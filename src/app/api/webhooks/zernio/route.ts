import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { WorkspaceStore } from '@/lib/storage/workspace-store';

export const SUPPORTED_ZERNIO_WEBHOOK_EVENTS = [
  // Posts (10)
  'post.scheduled',
  'post.published',
  'post.failed',
  'post.partial',
  'post.cancelled',
  'post.recycled',
  'post.platform.published',
  'post.platform.failed',
  'post.platform.deleted',
  'post.tiktok.url_resolved',
  // External Posts (3)
  'post.external.created',
  'post.external.updated',
  'post.external.deleted',
  // Accounts (5)
  'account.connected',
  'account.disconnected',
  'account.ads.initial_sync_completed',
  'account.ads.sync_failed',
  'account.ads.sync_recovered',
  // Analytics (1)
  'analytics.synced',
  // Messages (10)
  'message.received',
  'message.sent',
  'message.edited',
  'message.deleted',
  'message.delivered',
  'message.read',
  'message.played',
  'message.failed',
  'reaction.received',
  'referral.received',
  // Conversations (2)
  'conversation.started',
  'conversation.control_changed',
  // Contacts (3)
  'contact.tag_added',
  'contact.tag_removed',
  'contact.field_changed',
  // Sequences (2)
  'sequence.enrolled',
  'sequence.exited',
  // Workflows (3)
  'workflow.run.started',
  'workflow.run.completed',
  'workflow.run.failed',
  // Support Assistant (2)
  'support.run.completed',
  'support.run.failed',
  // Calls (4)
  'call.received',
  'call.ended',
  'call.failed',
  'call.permission_request',
  // Comments (1)
  'comment.received',
  // Reviews (2)
  'review.new',
  'review.updated',
  // Ads (3)
  'ad.status_changed',
  'ad.video.processed',
  'lead.received',
  // WhatsApp (16)
  'whatsapp.template.status_updated',
  'whatsapp.template.category_updated',
  'whatsapp.account.name_status_updated',
  'whatsapp.account.quality_updated',
  'whatsapp.account.status_updated',
  'whatsapp.account.alert_received',
  'whatsapp.contact.identity_changed',
  'whatsapp.number.activated',
  'whatsapp.number.declined',
  'whatsapp.number.action_required',
  'whatsapp.automatic_event',
  'whatsapp.number.verification_required',
  'whatsapp.number.suspended',
  'whatsapp.number.reactivated',
  'whatsapp.number.released',
  'whatsapp.number.kyc_submitted',
  // Phone Numbers (1)
  'phone_number.stock_available',
  // SMS (2)
  'sms.registration.action_required',
  'sms.registration.status_updated',
  // Branded Calling (3)
  'branded_calling.identity.status_updated',
  'branded_calling.identity.action_required',
  'branded_calling.number.status_updated',
  // RCS (1)
  'rcs.agent.status_updated',
  // Verify (2)
  'verification.approved',
  'verification.failed',
  // Commerce (3)
  'commerce.product.created',
  'commerce.product.updated',
  'commerce.product.deleted',
  // API Changelog (1)
  'api.changelog.published',
] as const;

export type ZernioWebhookEventType = (typeof SUPPORTED_ZERNIO_WEBHOOK_EVENTS)[number] | string;

interface ZernioWebhookPayload {
  id: string;
  event: ZernioWebhookEventType;
  timestamp?: string;
  test?: boolean;
  profiles?: Array<{
    id: string;
    externalId: string | null;
  }>;
  account?: {
    id?: string;
    accountId?: string;
    profileId?: string;
    platform?: string;
    username?: string;
    displayName?: string;
  };
  post?: {
    id: string;
    content?: string;
    status: string;
    scheduledFor?: string;
    publishedAt?: string;
    platforms?: Array<Record<string, unknown>>;
  };
  conversation?: {
    id: string;
    status?: 'active' | 'archived';
    threadControl?: 'ai_agent' | 'human_operator' | 'primary_receiver' | 'standby';
  };
  message?: {
    id: string;
    conversationId: string;
    platform: string;
    direction?: 'incoming' | 'outgoing';
    text?: string;
    emoji?: string;
    sender?: {
      id?: string;
      name?: string;
      username?: string;
    };
  };
  comment?: {
    id: string;
    postId?: string;
    platform?: string;
    authorName?: string;
    authorUsername?: string;
    text?: string;
  };
  review?: {
    id: string;
    platform?: 'facebook' | 'googlebusiness';
    reviewerName?: string;
    rating?: number;
    comment?: string;
  };
  contact?: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
  };
  call?: {
    id: string;
    from?: string;
    to?: string;
    direction?: 'inbound' | 'outbound';
    status?: string;
    durationSeconds?: number;
  };
  ad?: {
    id: string;
    status?: string;
  };
  lead?: {
    id: string;
    formId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  whatsapp?: {
    templateId?: string;
    templateName?: string;
    status?: string;
    category?: string;
    phoneNumber?: string;
    qualityRating?: string;
  };
  template?: {
    templateId: string;
    name: string;
    language: string;
    status?: string;
    category?: string;
    reason?: string;
  };
  verification?: {
    id: string;
    phoneNumber?: string;
    status?: 'approved' | 'failed';
  };
  product?: {
    id: string;
    title?: string;
    priceUsd?: number;
    sku?: string;
    inventoryCount?: number;
    status?: 'active' | 'draft' | 'archived';
  };
  runId?: string;
  workflowId?: string;
  sequenceId?: string;
  status?: string;
  answer?: string;
  costUsd?: number;
}

/**
 * SINGLE MULTI-TENANT ZERNIO WEBHOOK ROUTER
 * - Verifies `X-Zernio-Signature` using HMAC-SHA256 against the raw request body
 * - Deduplicates deliveries on `event.id` (at-least-once delivery contract)
 * - Routes every event across all 22 Zernio webhook categories (72 events)
 *   to the tenant whose durable organization/profile mapping matches the signed event.
 */
export async function POST(request: Request) {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET;
  if (!secret?.trim() || secret.trim().startsWith('whsec_your_')) {
    return NextResponse.json({ error: 'Webhook signing is not configured' }, { status: 503 });
  }
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('X-Zernio-Signature') || '';
  const computedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (
    !/^[a-f0-9]{64}$/.test(signatureHeader) ||
    !crypto.timingSafeEqual(Buffer.from(signatureHeader, 'hex'), Buffer.from(computedSignature, 'hex'))
  ) {
    return NextResponse.json({ error: 'Invalid X-Zernio-Signature' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const isIdentifier = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0 && value === value.trim();
  if (
    !isRecord(payload) || !isIdentifier(payload.id) || !isIdentifier(payload.event) ||
    (payload.test !== undefined && typeof payload.test !== 'boolean') ||
    (payload.timestamp !== undefined && (typeof payload.timestamp !== 'string' || !Number.isFinite(Date.parse(payload.timestamp)))) ||
    (payload.profiles !== undefined && (!Array.isArray(payload.profiles) || payload.profiles.some((profile) =>
      !isRecord(profile) || !isIdentifier(profile.id) ||
      (profile.externalId !== null && !isIdentifier(profile.externalId))
    )))
  ) {
    return NextResponse.json({ error: 'Invalid webhook envelope' }, { status: 400 });
  }
  if (payload.event === 'webhook.test' || payload.test === true) {
    return NextResponse.json({ ok: true, test: true, event: payload.event });
  }
  for (const field of ['account', 'post', 'conversation', 'control', 'message', 'comment', 'review', 'contact', 'call', 'ad', 'lead', 'whatsapp', 'template', 'verification', 'product', 'number']) {
    if (payload[field] !== undefined && !isRecord(payload[field])) {
      return NextResponse.json({ error: `Invalid webhook ${field}` }, { status: 400 });
    }
  }
  const event = payload as unknown as ZernioWebhookPayload;
  if (event.event === 'account.connected' && (!isIdentifier(event.account?.accountId || event.account?.id) || !isIdentifier(event.account?.platform))) {
    return NextResponse.json({ error: 'Invalid webhook account' }, { status: 400 });
  }
  if (event.event.startsWith('message.') && (!isIdentifier(event.message?.id) || !isIdentifier(event.conversation?.id || event.message?.conversationId))) {
    return NextResponse.json({ error: 'Invalid webhook message' }, { status: 400 });
  }
  if (event.event === 'conversation.control_changed') {
    const control = payload.control as Record<string, unknown> | undefined;
    if (!isIdentifier(event.account?.accountId || event.account?.id) || !isIdentifier(event.conversation?.id) ||
        !control || !['app', 'ai_agent', 'other'].includes(String(control.owner)) ||
        typeof payload.changedAt !== 'string' || !Number.isFinite(Date.parse(payload.changedAt))) {
      return NextResponse.json({ error: 'Invalid webhook conversation control' }, { status: 400 });
    }
  }
  if (event.event === 'whatsapp.template.status_updated' || event.event === 'whatsapp.template.category_updated') {
    if (!isIdentifier(event.account?.accountId) || !isIdentifier(event.template?.templateId) || !isIdentifier(event.template?.name) || !isIdentifier(event.template?.language) ||
      (event.event === 'whatsapp.template.status_updated' && !isIdentifier(event.template?.status)) ||
      (event.event === 'whatsapp.template.category_updated' && !['UTILITY', 'MARKETING', 'AUTHENTICATION'].includes(event.template?.category || ''))) {
      return NextResponse.json({ error: 'Invalid webhook template' }, { status: 400 });
    }
  }

  if (payload.statusAt !== undefined && (typeof payload.statusAt !== 'string' || !Number.isFinite(Date.parse(payload.statusAt)))) {
    return NextResponse.json({ error: 'Invalid webhook status time' }, { status: 400 });
  }
  const message = payload.message as Record<string, unknown> | undefined;
  if (message?.sentAt !== undefined && (typeof message.sentAt !== 'string' || !Number.isFinite(Date.parse(message.sentAt)))) {
    return NextResponse.json({ error: 'Invalid webhook message time' }, { status: 400 });
  }
  const number = payload.number as Record<string, unknown> | undefined;
  if (event.event.startsWith('whatsapp.number.') && (!isIdentifier(number?.id) || !isIdentifier(number?.profileId))) {
    return NextResponse.json({ error: 'Invalid webhook number' }, { status: 400 });
  }
  if (!event.profiles?.length) {
    if (event.account?.profileId != null) {
      return NextResponse.json({ error: 'Profile-scoped webhook is missing its routing profile' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, ignored: true, event: event.event });
  }
  // Multi-profile payloads can contain another tenant's resources. Splitting them
  // requires event-specific routing and is not supported by this single-tenant handler.
  if (event.profiles.length !== 1) {
    return NextResponse.json({ error: 'Multi-profile webhook routing is not supported' }, { status: 409 });
  }
  const { id: zernioProfileId, externalId: organizationId } = event.profiles[0];
  if (!organizationId || (number?.profileId !== undefined && number.profileId !== zernioProfileId) ||
      (event.account?.profileId !== undefined && event.account.profileId !== zernioProfileId) ||
      (event.account?.accountId !== undefined && event.account.id !== undefined && event.account.accountId !== event.account.id)) {
    return NextResponse.json({ error: 'Webhook account/profile mapping is inconsistent' }, { status: 409 });
  }
  const deadline = AbortSignal.timeout(4000);
  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return NextResponse.json({ error: 'Webhook service role unavailable' }, { status: 503 });
    supabase = createSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: 'Webhook tenant verification is unavailable' }, { status: 503 });
    const { data: organization, error } = await supabase.from('organizations')
      .select('id,zernio_profile_id').eq('id', organizationId).eq('zernio_profile_id', zernioProfileId).abortSignal(deadline).maybeSingle();
    if (error) return NextResponse.json({ error: 'Could not verify webhook tenant mapping' }, { status: 503 });
    if (!organization || organization.id !== organizationId || organization.zernio_profile_id !== zernioProfileId) {
      return NextResponse.json({ error: 'Webhook profile does not match a registered workspace' }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: 'Webhook tenant verification is unavailable' }, { status: 503 });
  }
  const nowIso = event.timestamp || new Date().toISOString();
  // Endpoint configuration is snapshotted into the same transaction as the event.
  // Customer network calls are handled by the leased outbox worker, never here.
  let ws: ReturnType<typeof WorkspaceStore.getWorkspace>;
  try { ws = WorkspaceStore.getWorkspace(organizationId); } catch {
    return NextResponse.json({ error: 'Webhook endpoint registry unavailable' }, { status: 503 });
  }
  const endpoints = (ws.webhooks || []).filter((endpoint) => endpoint.status === 'active' &&
    (endpoint.events.includes(event.event) || endpoint.events.includes('*')));
  try {
    const { data, error } = await supabase.rpc('accept_zernio_webhook', {
      p_organization_id: organizationId, p_profile_id: zernioProfileId,
      p_payload: payload, p_endpoints: endpoints.map(({ id, url, secret }) => ({ id, url, secret })),
    }).abortSignal(deadline);
    if (error || !data) return NextResponse.json({ error: 'Webhook persistence is unavailable' }, { status: 503 });
    if (data.error) return NextResponse.json({ error: data.error }, { status: 409 });
    if (data.deduplicated) return NextResponse.json({ ok: true, deduplicated: true });
  } catch {
    return NextResponse.json({ error: 'Webhook persistence is unavailable' }, { status: 503 });
  }
  // Legacy generic workspace views remain compatible. WhatsApp and message views
  // are read from the provider; the durable event journal is their audit trail.
  try {
  if (!event.event.startsWith('message.') && !event.event.startsWith('whatsapp.') && event.event !== 'conversation.control_changed') {
    // 1. Accounts
    if (event.event === 'account.connected' && event.account) {
      const accId = event.account.accountId || event.account.id || `acc_${Date.now()}`;
      const existingIdx = ws.connectedAccounts.findIndex(
        (a) => a.accountId === accId || a.id === accId
      );
      const record = {
        id: accId,
        accountId: accId,
        platform: event.account.platform || 'instagram',
        username: event.account.username || accId,
        displayName: event.account.displayName || event.account.username || accId,
        status: 'active',
        needsReconnect: false,
        syncTime: nowIso,
        connectedAt: nowIso,
      };
      if (existingIdx >= 0) {
        ws.connectedAccounts[existingIdx] = { ...ws.connectedAccounts[existingIdx], ...record };
      } else {
        ws.connectedAccounts.push(record);
      }
    } else if (event.event === 'account.disconnected' && event.account) {
      const accId = event.account.accountId || event.account.id;
      ws.connectedAccounts = ws.connectedAccounts.map((a) =>
        a.accountId === accId || a.id === accId
          ? { ...a, status: 'disconnected', needsReconnect: true }
          : a
      );
    }

    // 2. Posts & External Posts
    else if (event.event.startsWith('post.') && event.post?.id) {
      const idx = ws.posts.findIndex((p) => p.id === event.post!.id);
      if (idx >= 0) {
        ws.posts[idx] = {
          ...ws.posts[idx],
          status: event.post.status || event.event.replace('post.', ''),
          scheduledFor: event.post.scheduledFor || ws.posts[idx].scheduledFor,
        };
      } else if (event.event === 'post.external.created') {
        ws.posts.unshift({
          id: event.post.id,
          content: event.post.content || '',
          platforms: [],
          status: event.post.status || 'published',
          createdAt: nowIso,
        });
      }
    }

    // 3. Conversations & Messages
    else if (
      (event.event === 'conversation.started' ||
        event.event === 'message.received' ||
        event.event === 'referral.received') &&
      event.message
    ) {
      const convId = event.conversation?.id || event.message.conversationId;
      let conv = ws.inboxConversations.find((c) => c.id === convId);
      const msgItem = {
        id: event.message.id || `msg_${Date.now()}`,
        conversationId: convId,
        direction: event.message.direction || ('incoming' as const),
        senderId: event.message.sender?.id || 'external_user',
        senderName: event.message.sender?.name || event.message.sender?.username || 'Contact',
        text: event.message.text || '',
        status: 'delivered' as const,
        createdAt: nowIso,
      };
      if (!conv) {
        conv = {
          id: convId,
          platform: event.message.platform || 'whatsapp',
          accountId: event.account?.accountId || event.account?.id,
          participantId: event.message.sender?.id,
          participantName: event.message.sender?.name || 'Customer',
          participantUsername: event.message.sender?.username,
          status: 'active',
          lastMessage: msgItem.text,
          unreadCount: 1,
          updatedTime: nowIso,
          messages: [msgItem],
        };
        ws.inboxConversations.unshift(conv);
      } else {
        conv.lastMessage = msgItem.text;
        conv.unreadCount = (conv.unreadCount || 0) + 1;
        conv.updatedTime = nowIso;
        conv.messages = [...(conv.messages || []), msgItem];
      }
    } else if (event.event === 'conversation.control_changed' && event.conversation?.id) {
      const conv = ws.inboxConversations.find((c) => c.id === event.conversation!.id);
      if (conv && event.conversation.threadControl) {
        conv.threadControl = event.conversation.threadControl;
      }
    } else if (
      (event.event === 'message.sent' ||
        event.event === 'message.delivered' ||
        event.event === 'message.read' ||
        event.event === 'message.failed' ||
        event.event === 'message.edited' ||
        event.event === 'message.deleted') &&
      event.message?.id
    ) {
      const statusMap: Record<string, 'sent' | 'delivered' | 'read' | 'failed'> = {
        'message.sent': 'sent',
        'message.delivered': 'delivered',
        'message.read': 'read',
        'message.failed': 'failed',
      };
      for (const conv of ws.inboxConversations) {
        if (!conv.messages) continue;
        if (event.event === 'message.deleted') {
          conv.messages = conv.messages.filter((m) => m.id !== event.message!.id);
        } else {
          for (const msg of conv.messages) {
            if (msg.id === event.message.id) {
              if (statusMap[event.event]) msg.status = statusMap[event.event];
              if (event.event === 'message.edited' && event.message.text) {
                msg.text = event.message.text;
                msg.editedAt = nowIso;
              }
            }
          }
        }
      }
    }

    // 4. Comments & Reviews
    else if (event.event === 'comment.received' && event.comment?.id) {
      ws.inboxComments.unshift({
        id: event.comment.id,
        postId: event.comment.postId || 'post_external',
        platform: event.comment.platform || event.account?.platform || 'instagram',
        accountId: event.account?.accountId || 'acc_default',
        fromUser: {
          id: event.comment.authorUsername || 'usr_commenter',
          name: event.comment.authorName || 'User',
          username: event.comment.authorUsername || 'user',
        },
        text: event.comment.text || '',
        isHidden: false,
        isLiked: false,
        replies: [],
        createdAt: nowIso,
      });
    } else if ((event.event === 'review.new' || event.event === 'review.updated') && event.review?.id) {
      const existingIdx = ws.inboxReviews.findIndex((r) => r.id === event.review!.id);
      const revRecord = {
        id: event.review.id,
        platform: event.review.platform || 'googlebusiness',
        accountId: event.account?.accountId || 'acc_default',
        reviewerName: event.review.reviewerName || 'Customer',
        rating: event.review.rating ?? 5,
        reviewText: event.review.comment || '',
        createdAt: nowIso,
      };
      if (existingIdx >= 0) {
        ws.inboxReviews[existingIdx] = { ...ws.inboxReviews[existingIdx], ...revRecord };
      } else {
        ws.inboxReviews.unshift(revRecord);
      }
    }

    // 5. Contacts
    else if (event.event.startsWith('contact.') && event.contact?.id) {
      const contact = ws.contacts.find((c) => c.id === event.contact!.id);
      if (contact) {
        if (event.contact.tags) contact.tags = event.contact.tags;
        if (event.contact.customFields) {
          contact.customFields = {
            ...contact.customFields,
            ...(event.contact.customFields as Record<string, string | number | boolean>),
          };
        }
      }
    }

    // 6. Calls
    else if (event.event.startsWith('call.') && event.call?.id) {
      const existingCall = ws.callHistory.find((c) => c.id === event.call!.id);
      if (existingCall) {
        existingCall.status = (event.call.status as any) || existingCall.status;
        if (event.call.durationSeconds !== undefined) {
          existingCall.durationSeconds = event.call.durationSeconds;
        }
      } else {
        ws.callHistory.unshift({
          id: event.call.id,
          fromNumber: event.call.from || '+10000000000',
          toNumber: event.call.to || '+10000000000',
          channel: 'pstn',
          direction: event.call.direction || 'inbound',
          mode: 'direct_voice',
          status: (event.call.status as any) || 'completed',
          durationSeconds: event.call.durationSeconds ?? 0,
          recordingUrl: '',
          transcripts: [],
          createdAt: nowIso,
        });
      }
    }

    // 7. Ads & Leads
    else if (event.event === 'lead.received' && event.lead?.id) {
      ws.adLeads.unshift({
        id: event.lead.id,
        formId: event.lead.formId || 'form_default',
        fieldData: {
          full_name: event.lead.fullName || '',
          email: event.lead.email || '',
          phone_number: event.lead.phone || '',
        },
        submittedAt: nowIso,
      });
    } else if (event.event === 'ad.status_changed' && event.ad?.id) {
      const camp = ws.campaigns.find((c) => c.id === event.ad!.id);
      if (camp && event.ad.status) {
        camp.status = event.ad.status;
      }
    }

    // 8. WhatsApp Templates & Numbers
    else if (
      (event.event === 'whatsapp.template.status_updated' ||
        event.event === 'whatsapp.template.category_updated') &&
      event.template
    ) {
      const tpl = ws.whatsappTemplates.find(
        (t) => t.accountId === event.account?.accountId &&
          (t.id === event.template?.templateId ||
            (t.name === event.template?.name && t.language === event.template?.language))
      );
      if (tpl) {
        if (event.template.status) tpl.status = event.template.status as any;
        if (event.template.category) tpl.category = event.template.category as any;
      }
    }

    // 9. Verify OTP
    else if (
      (event.event === 'verification.approved' || event.event === 'verification.failed') &&
      event.verification?.id
    ) {
      const ver = ws.verifyRequests.find((v) => v.id === event.verification!.id);
      if (ver) {
        ver.status = event.event === 'verification.approved' ? 'approved' : 'failed';
      }
    }

    // 10. Commerce Products
    else if (event.event.startsWith('commerce.product.') && event.product?.id) {
      if (event.event === 'commerce.product.deleted') {
        ws.commerceProducts = ws.commerceProducts.filter((p) => p.id !== event.product!.id);
      } else {
        const idx = ws.commerceProducts.findIndex((p) => p.id === event.product!.id);
        const prodItem = {
          id: event.product.id,
          title: event.product.title || 'Product',
          price: event.product.priceUsd ?? 0,
          currency: 'USD',
          inventoryQuantity: event.product.inventoryCount ?? 0,
          images: [] as string[],
          status: (event.product.status === 'draft' ? 'draft' : 'active') as 'active' | 'draft',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        if (idx >= 0) {
          ws.commerceProducts[idx] = { ...ws.commerceProducts[idx], ...prodItem };
        } else {
          ws.commerceProducts.unshift(prodItem);
        }
      }
    }

    // Record in tenant API logs for observability
    if (!ws.apiLogs) ws.apiLogs = [];
    ws.apiLogs.unshift({
      id: `wh_log_${Date.now()}`,
      method: 'POST',
      path: `/webhooks/zernio (${event.event})`,
      status: 200,
      latencyMs: 4,
      keyPrefix: 'whsec_',
      timestamp: nowIso,
    });

    WorkspaceStore.saveWorkspace(organizationId, ws);

  }

  } catch { console.warn('Legacy webhook workspace projection unavailable after durable acceptance'); }
  return NextResponse.json({
    ok: true,
    routedOrganizationId: organizationId,
    event: event.event,
    supportedEvent: SUPPORTED_ZERNIO_WEBHOOK_EVENTS.includes(event.event as any),
  });
}

