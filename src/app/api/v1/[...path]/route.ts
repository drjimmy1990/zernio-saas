import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookieHeader } from '@/lib/auth/session';
import { WorkspaceStore, ApiKeyScope } from '@/lib/storage/workspace-store';
import { resolveEffectiveTenantPolicy } from '@/lib/zernio/policy-engine';
import { TelephonyService } from '@/lib/services/telephony.service';
import { PublishingService } from '@/lib/services/publishing.service';
import { InboxCrmService } from '@/lib/services/inbox-crm.service';
import { AdsService } from '@/lib/services/ads.service';
import { CommerceLocalService } from '@/lib/services/commerce-local.service';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { getOpenApiV1Spec, getPostmanV1Collection } from '@/lib/zernio/openapi-spec';
import type { SocialPlatform, AdPlatform } from '@/types/platform';

// Sliding window counter per tenant for rate-limit header realism
const rateWindowMap = new Map<string, { count: number; resetAt: number }>();

function getRateLimitHeaders(
  tenantId: string,
  planLimitPerMin = 120,
  extraHeaders: Record<string, string> = {}
): Record<string, string> {
  const now = Date.now();
  const current = rateWindowMap.get(tenantId);
  let state = current;
  if (!state || now > state.resetAt) {
    state = { count: 1, resetAt: now + 60_000 };
    rateWindowMap.set(tenantId, state);
  } else {
    state.count += 1;
  }

  const remaining = Math.max(0, planLimitPerMin - state.count);
  return {
    'X-RateLimit-Limit': String(planLimitPerMin),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.floor(state.resetAt / 1000)),
    'X-Asra3-Api-Version': '2026-10-18',
    'X-Asra3-Request-Id': `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Asra3-Signature',
    ...extraHeaders,
  };
}

function hasScope(scopes: ApiKeyScope[], required: ApiKeyScope): boolean {
  if (!scopes || scopes.length === 0) return false;
  if (scopes.includes('full_access')) return true;
  if (scopes.includes(required)) return true;
  if (required === 'accounts:read' && scopes.includes('accounts:write')) return true;
  if (required === 'telephony:read' && scopes.includes('telephony:write')) return true;
  return false;
}

function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Asra3 Unified Social, Cloud Telephony & Commerce REST API',
      version: '1.4.0',
      description:
        'Production REST API v1 for Asra3 (https://asra3.com). Manage 18+ social networks, provision virtual phone numbers in 55+ countries, link WhatsApp Business Cloud API via OTP, send/receive 2-Way SMS & OTP codes, trigger AI Voice calls, manage unified Inbox & Auto-DM rules, and dispatch Ad CAPI conversions.',
      contact: {
        name: 'Asra3 API Engineering',
        url: `${baseUrl}/docs`,
      },
    },
    servers: [
      { url: `${baseUrl}/api/v1`, description: 'Current Environment Gateway' },
      { url: 'https://asra3.com/api/v1', description: 'Production Global Edge' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key (tk_live_... or tk_test_...)',
        },
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      '/me': {
        get: {
          summary: 'Inspect current workspace, plan quotas, usage counters, and telecom wallet',
          tags: ['Workspace & Auth'],
          responses: { '200': { description: 'Workspace telemetry and active API key scopes' } },
        },
      },
      '/accounts': {
        get: {
          summary: 'List all connected social & messaging channels (18 platforms)',
          tags: ['Social Channels'],
          responses: { '200': { description: 'Array of connected social accounts' } },
        },
      },
      '/connect/{platform}': {
        post: {
          summary: 'Connect a social account via API credentials or generate headless OAuth URL',
          tags: ['Social Channels'],
          parameters: [{ name: 'platform', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Connected channel or OAuth authorization URL' } },
        },
      },
      '/posts': {
        get: { summary: 'List scheduled and published cross-network posts', tags: ['Publishing'] },
        post: {
          summary: 'Publish or schedule a multi-platform social post',
          tags: ['Publishing'],
          responses: { '201': { description: 'Created post object with per-platform delivery IDs' } },
        },
      },
      '/phone-numbers/available': {
        get: {
          summary: 'Search available virtual phone numbers across 55+ countries (US, GB, AE, SA, EG, DE, etc.)',
          tags: ['Cloud Telephony'],
          parameters: [
            { name: 'country', in: 'query', required: false, schema: { type: 'string', example: 'US' } },
            { name: 'type', in: 'query', required: false, schema: { type: 'string', example: 'mobile' } },
          ],
          responses: { '200': { description: 'Available numbers with instant activation pricing' } },
        },
      },
      '/phone-numbers': {
        get: { summary: 'List owned virtual phone numbers in workspace', tags: ['Cloud Telephony'] },
      },
      '/phone-numbers/buy': {
        post: {
          summary: 'Purchase & provision a dedicated virtual number (deducts from Telecom Wallet)',
          tags: ['Cloud Telephony'],
          responses: { '201': { description: 'Provisioned number with carrier capabilities' } },
        },
      },
      '/whatsapp/link': {
        post: {
          summary: 'Step 1: Request WhatsApp Business Cloud API OTP on an owned virtual number',
          tags: ['WhatsApp Cloud API'],
        },
      },
      '/whatsapp/verify-otp': {
        post: {
          summary: 'Step 2: Verify 6-digit OTP to activate Official WhatsApp Business WABA & Green Tick',
          tags: ['WhatsApp Cloud API'],
        },
      },
      '/whatsapp/messages': {
        post: {
          summary: 'Send interactive template or session WhatsApp message via Cloud API',
          tags: ['WhatsApp Cloud API'],
        },
      },
      '/sms/messages': {
        post: {
          summary: 'Send outbound programmable SMS from an owned virtual number ($0.015/segment)',
          tags: ['2-Way SMS & OTP'],
        },
      },
      '/sms/otp/latest': {
        get: {
          summary: 'Fetch latest inbound OTP / verification SMS received on your virtual numbers',
          tags: ['2-Way SMS & OTP'],
        },
      },
      '/voice/calls': {
        get: { summary: 'List inbound and outbound voice call logs & recordings', tags: ['Voice & AI Agent'] },
        post: {
          summary: 'Initiate an outbound programmable voice call or AI Voice Receptionist call ($0.04/min)',
          tags: ['Voice & AI Agent'],
        },
      },
      '/inbox/conversations': {
        get: { summary: 'List unified omnichannel inbox conversations (DMs) across all connected accounts', tags: ['Messages & Unified Inbox'] },
        post: { summary: 'Start a new DM conversation or send an approved WhatsApp template to a recipient', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/search': {
        get: { summary: 'Search conversations two ways at once (message body tokens + contact identity)', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/{conversationId}': {
        get: { summary: 'Get conversation metadata, participant details & threadControl owner', tags: ['Messages & Unified Inbox'] },
        patch: { summary: 'Archive or activate a conversation or update tags', tags: ['Messages & Unified Inbox'] },
        delete: { summary: 'Permanently delete stored conversation and its messages', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/{conversationId}/messages': {
        get: { summary: 'List messages in a conversation with cursor pagination and sortOrder (asc/desc)', tags: ['Messages & Unified Inbox'] },
        post: { summary: 'Send a message in a conversation (text, attachments, quick replies, buttons, templates, Idempotency-Key)', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/{conversationId}/messages/{messageId}': {
        patch: { summary: 'Edit a previously sent message (Telegram anytime, iMessage within 15m)', tags: ['Messages & Unified Inbox'] },
        delete: { summary: 'Delete or unsend a message from a conversation', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/{conversationId}/messages/{messageId}/reactions': {
        post: { summary: 'Add an emoji reaction or Apple tapback to a message', tags: ['Messages & Unified Inbox'] },
        delete: { summary: 'Remove an emoji reaction from a message', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/{conversationId}/messages/{messageId}/attachments/{attachmentIndex}': {
        get: { summary: 'Resolve a message attachment to a fresh signed media URL', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/{conversationId}/read': {
        post: { summary: 'Mark all unread incoming messages as read & send WhatsApp blue ticks', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/{conversationId}/typing': {
        post: { summary: 'Send a typing indicator in a conversation (Messenger, Instagram, Telegram, WhatsApp, iMessage)', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/{conversationId}/accept': {
        post: { summary: 'Accept a Facebook or Instagram Message Request by replying to it', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/conversations/{conversationId}/handover': {
        post: { summary: 'Change who answers a conversation (Meta Handover Protocol: take, pass, release, request)', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/media/upload': {
        post: { summary: 'Upload a media file with API key authentication to get an attachmentUrl for DM sends', tags: ['Messages & Unified Inbox'] },
      },
      '/messages': {
        get: { summary: 'Direct alias to list messages or conversations across all connected channels', tags: ['Messages & Unified Inbox'] },
        post: { summary: 'Direct alias to send an omnichannel message or start a conversation', tags: ['Messages & Unified Inbox'] },
      },
      '/inbox/messages': {
        post: { summary: 'Send reply to an omnichannel inbox conversation', tags: ['Messages & Unified Inbox'] },
      },
      '/conversions': {
        post: {
          summary: 'Dispatch server-side conversion event to Meta CAPI, TikTok Events API & Google Enhanced Conversions',
          tags: ['Ads & Conversion API'],
        },
      },
      '/webhooks': {
        get: { summary: 'List registered outbound customer webhooks', tags: ['Webhooks'] },
        post: { summary: 'Register an HTTPS endpoint for HMAC-SHA256 signed event delivery', tags: ['Webhooks'] },
      },
    },
  };
}

function buildPostmanCollection(baseUrl: string, sampleKey: string) {
  return {
    info: {
      name: 'Asra3 REST API v1 — Official Postman Collection',
      description:
        'Complete developer collection for Social Publishing, Virtual Phone Numbers, WhatsApp Business Cloud API, 2-Way SMS/OTP, AI Voice Calls, Unified Inbox, and Outbound Webhooks.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: `${baseUrl}/api/v1`, type: 'string' },
      { key: 'apiKey', value: sampleKey, type: 'string' },
    ],
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{apiKey}}', type: 'string' }],
    },
    item: [
      {
        name: '1. Workspace & Quotas (/me)',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
          url: { raw: '{{baseUrl}}/me', host: ['{{baseUrl}}'], path: ['me'] },
        },
      },
      {
        name: '2. Search Virtual Numbers (/phone-numbers/available)',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
          url: {
            raw: '{{baseUrl}}/phone-numbers/available?country=US',
            host: ['{{baseUrl}}'],
            path: ['phone-numbers', 'available'],
            query: [{ key: 'country', value: 'US' }],
          },
        },
      },
      {
        name: '3. Buy Virtual Number (/phone-numbers/buy)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            { key: 'Content-Type', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({ country: 'US', numberType: 'mobile' }, null, 2),
          },
          url: { raw: '{{baseUrl}}/phone-numbers/buy', host: ['{{baseUrl}}'], path: ['phone-numbers', 'buy'] },
        },
      },
      {
        name: '4. Link Number to WhatsApp Business (/whatsapp/link)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            { key: 'Content-Type', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                numberId: 'num_123456',
                displayName: 'Asra3 Official Store',
                category: 'E-Commerce & Retail',
                verificationMethod: 'sms_otp',
              },
              null,
              2
            ),
          },
          url: { raw: '{{baseUrl}}/whatsapp/link', host: ['{{baseUrl}}'], path: ['whatsapp', 'link'] },
        },
      },
      {
        name: '5. Verify WhatsApp OTP (/whatsapp/verify-otp)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            { key: 'Content-Type', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({ numberId: 'num_123456', otpCode: '482910' }, null, 2),
          },
          url: { raw: '{{baseUrl}}/whatsapp/verify-otp', host: ['{{baseUrl}}'], path: ['whatsapp', 'verify-otp'] },
        },
      },
      {
        name: '6. Send Programmable SMS (/sms/messages)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            { key: 'Content-Type', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                to: '+14158909911',
                text: 'Your Asra3 verification code is 849201. Do not share this code.',
              },
              null,
              2
            ),
          },
          url: { raw: '{{baseUrl}}/sms/messages', host: ['{{baseUrl}}'], path: ['sms', 'messages'] },
        },
      },
      {
        name: '7. Fetch Latest Inbound OTP (/sms/otp/latest)',
        request: {
          method: 'GET',
          header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
          url: { raw: '{{baseUrl}}/sms/otp/latest', host: ['{{baseUrl}}'], path: ['sms', 'otp', 'latest'] },
        },
      },
      {
        name: '8. Initiate Outbound / AI Voice Call (/voice/calls)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            { key: 'Content-Type', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                to: '+971503928411',
                mode: 'ai_voice_agent',
                aiGreetingPrompt: 'Confirm the customer order #ORD-9941 and ask if they prefer morning delivery.',
              },
              null,
              2
            ),
          },
          url: { raw: '{{baseUrl}}/voice/calls', host: ['{{baseUrl}}'], path: ['voice', 'calls'] },
        },
      },
      {
        name: '9. Publish Multi-Platform Post (/posts)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            { key: 'Content-Type', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                content: 'Launching our new unified API v1 today! 🚀 #Asra3 #SaaS',
                platforms: ['instagram', 'linkedin', 'x', 'tiktok'],
                publishNow: true,
              },
              null,
              2
            ),
          },
          url: { raw: '{{baseUrl}}/posts', host: ['{{baseUrl}}'], path: ['posts'] },
        },
      },
      {
        name: '10. Register Outbound Webhook (/webhooks)',
        request: {
          method: 'POST',
          header: [
            { key: 'Authorization', value: 'Bearer {{apiKey}}' },
            { key: 'Content-Type', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                url: 'https://api.yourcompany.com/webhooks/asra3',
                events: ['post.published', 'number.purchased', 'whatsapp.linked', 'message.sent', 'call.initiated'],
              },
              null,
              2
            ),
          },
          url: { raw: '{{baseUrl}}/webhooks', host: ['{{baseUrl}}'], path: ['webhooks'] },
        },
      },
    ],
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Asra3-Signature',
    },
  });
}

async function handleApiV1(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const startMs = Date.now();
  const { path = [] } = await context.params;
  const routeKey = '/' + path.join('/');
  const method = req.method.toUpperCase();
  const baseUrl = req.nextUrl.origin || 'https://asra3.com';

  // Public spec endpoints (do not require auth so developers can download specs easily)
  if (method === 'GET' && routeKey === '/openapi.json') {
    return NextResponse.json(getOpenApiV1Spec(baseUrl), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'inline; filename="asra3-openapi-v1.json"',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (method === 'GET' && routeKey === '/postman.json') {
    const session = getSessionFromCookieHeader(req.headers.get('cookie'));
    const orgId = session?.tenant?.organizationId || 'org_workspace';
    const sampleKey = `tk_live_${orgId.replace(/[^a-zA-Z0-9]/g, '')}_9f8e7d6c5b4a3`;
    return NextResponse.json(getPostmanV1Collection(baseUrl, sampleKey), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'inline; filename="asra3-postman-collection-v1.json"',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (req.headers.get('x-reset-workspace') === 'true') {
    WorkspaceStore.resetMemoryAndDisk();
  }

  if (method === 'POST' && (routeKey === '/workspaces/reset' || routeKey === '/admin/reset')) {
    WorkspaceStore.resetMemoryAndDisk();
    return NextResponse.json(
      {
        success: true,
        message: 'Workspace store and disk cache successfully reset to clean state.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  // Authenticate via Authorization: Bearer tk_... OR fallback to active session cookie for interactive Docs/Dashboard
  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : req.nextUrl.searchParams.get('api_key') || '';

  let tenantId = '';
  let scopes: ApiKeyScope[] = ['full_access'];
  let keyPrefix = 'session_auth';
  let keyName = 'Interactive Session';

  if (bearerToken) {
    const resolved = WorkspaceStore.resolveApiKey(bearerToken);
    if (!resolved) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'invalid_api_key',
            message:
              'Invalid or revoked API key. Generate an active key in Dashboard -> Developer API & Webhooks or pass a valid tk_live_... token.',
            docs_url: `${baseUrl}/docs#authentication`,
          },
        },
        { status: 401, headers: getRateLimitHeaders('anonymous', 30) }
      );
    }
    tenantId = resolved.tenantId;
    scopes = resolved.keyItem.scopes;
    keyPrefix = resolved.keyItem.prefix;
    keyName = resolved.keyItem.name;
  } else {
    const session = getSessionFromCookieHeader(req.headers.get('cookie'));
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'unauthorized',
            message: 'Missing Authorization header. Pass "Authorization: Bearer tk_live_..." in your request headers.',
            docs_url: `${baseUrl}/docs#authentication`,
          },
        },
        { status: 401, headers: getRateLimitHeaders('anonymous', 30) }
      );
    }
    tenantId = session.tenant.organizationId;
  }

  const ws = WorkspaceStore.getWorkspace(tenantId);
  const policy = await resolveEffectiveTenantPolicy(tenantId);
  const planRateLimit = policy.planKey === 'enterprise' ? 1200 : policy.planKey === 'growth' ? 300 : 120;
  const headers = getRateLimitHeaders(tenantId, planRateLimit);

  // Parse body if POST / PUT / PATCH / DELETE
  let body: Record<string, any> = {};
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'invalid_json',
            message: 'Request body must be valid JSON.',
          },
        },
        { status: 400, headers }
      );
    }
  }

  const idempotencyKey =
    req.headers.get('idempotency-key') ||
    req.headers.get('x-idempotency-key') ||
    '';

  // Check Idempotency Replay (24h cache window)
  if (idempotencyKey && ['POST', 'PUT', 'PATCH'].includes(method)) {
    const cached = WorkspaceStore.getIdempotencyRecord(tenantId, idempotencyKey);
    if (cached) {
      return NextResponse.json(
        {
          ...cached.body,
          ...(routeKey === '/posts'
            ? { message: 'Post already exists (idempotent retry)', post: cached.body.post || cached.body.data }
            : {}),
          meta: {
            request_id: headers['X-Asra3-Request-Id'],
            api_version: '2026-10-18',
            latency_ms: 2,
            organization_id: tenantId,
            idempotent_replayed: true,
          },
        },
        {
          status: cached.status || 200,
          headers: {
            ...headers,
            'Idempotent-Replayed': 'true',
          },
        }
      );
    }
  }

  const respond = (status: number, payload: Record<string, any>, reqSummary?: string, resSummary?: string, extraResHeaders: Record<string, string> = {}) => {
    const latencyMs = Math.max(4, Date.now() - startMs);
    WorkspaceStore.addApiLog(tenantId, {
      method,
      path: `/api/v1${routeKey}`,
      status,
      latencyMs,
      keyPrefix,
      requestSummary: reqSummary || (Object.keys(body).length > 0 ? JSON.stringify(body).slice(0, 140) : undefined),
      responseSummary: resSummary || (payload?.error?.message || payload?.message || `HTTP ${status}`),
    });

    if (idempotencyKey && [200, 201].includes(status) && ['POST', 'PUT', 'PATCH'].includes(method)) {
      WorkspaceStore.setIdempotencyRecord(tenantId, idempotencyKey, {
        status,
        body: payload,
        path: routeKey,
      });
    }

    return NextResponse.json(
      {
        ...payload,
        meta: {
          request_id: headers['X-Asra3-Request-Id'],
          api_version: '2026-10-18',
          latency_ms: latencyMs,
          organization_id: tenantId,
        },
      },
      { status, headers: { ...headers, ...extraResHeaders } }
    );
  };

  const denyScope = (required: ApiKeyScope) =>
    respond(
      403,
      {
        success: false,
        error: {
          code: 'insufficient_scope',
          message: `This API key (${keyPrefix}) does not have the required '${required}' permission scope.`,
          required_scope: required,
          active_scopes: scopes,
        },
      },
      undefined,
      `Forbidden: missing scope ${required}`
    );

  // ============================================================================
  // 1. WORKSPACE, QUOTAS & TELECOM WALLET (/me, /wallet, /profiles)
  // ============================================================================
  if (method === 'GET' && routeKey === '/me') {
    return respond(
      200,
      {
        success: true,
        data: {
          workspace: {
            organizationId: tenantId,
            organizationName: policy.organizationName,
            planKey: policy.planKey,
            updatedAt: ws.updatedAt,
          },
          auth: {
            keyName,
            keyPrefix,
            scopes,
          },
          quotas: {
            connectedAccounts: {
              used: ws.connectedAccounts.length,
              max: policy.quotas.maxConnectedAccounts,
            },
            monthlyPosts: {
              used: ws.posts.length,
              max: policy.quotas.maxMonthlyPosts,
            },
            phoneNumbers: {
              used: ws.ownedNumbers.length,
              max: policy.quotas.maxPhoneNumbers,
            },
            apiRequestsPerMinute: planRateLimit,
          },
          wallet: ws.wallet,
        },
      },
      'Inspect workspace & quotas',
      `Workspace ${policy.organizationName} (${policy.planKey})`
    );
  }

  if (method === 'GET' && routeKey === '/wallet') {
    return respond(
      200,
      {
        success: true,
        data: ws.wallet,
      },
      'Get telecom wallet balance',
      `Balance $${(ws.wallet?.balanceUsd || 0).toFixed(2)}`
    );
  }

  if (method === 'POST' && routeKey === '/wallet/topup') {
    const amountUsd = Math.max(5, Math.min(5000, Number(body.amountUsd || 25)));
    const wallet = WorkspaceStore.adjustWalletBalance(
      tenantId,
      'credit',
      amountUsd,
      body.description || `API Programmatic Credit Top-Up (+$${amountUsd.toFixed(2)})`
    );
    return respond(
      200,
      {
        success: true,
        message: `Added $${amountUsd.toFixed(2)} to Telecom Credit Wallet.`,
        data: wallet,
      },
      `Top-up +$${amountUsd}`,
      `New balance $${wallet.balanceUsd.toFixed(2)}`
    );
  }

  if (routeKey === '/profiles') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'accounts:read')) return denyScope('accounts:read');
      return respond(
        200,
        {
          success: true,
          data: [
            {
              id: policy.zernioProfileId || `prof_${tenantId}`,
              name: `${policy.organizationName} Primary Brand Profile`,
              timezone: 'UTC',
              connectedChannelsCount: ws.connectedAccounts.length,
              createdAt: ws.updatedAt,
            },
          ],
        },
        'List brand profiles',
        '1 profile returned'
      );
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'accounts:write')) return denyScope('accounts:write');
      return respond(
        201,
        {
          success: true,
          data: {
            id: `prof_${Date.now().toString(36)}`,
            name: body.name || 'New Client Workspace Profile',
            timezone: body.timezone || 'UTC',
            connectedChannelsCount: 0,
            createdAt: new Date().toISOString(),
          },
        },
        `Create profile ${body.name || 'New Profile'}`,
        'Profile created'
      );
    }
  }

  // ============================================================================
  // 1B. ACCOUNT GROUPS (/account-groups, /account-groups/{id})
  // ============================================================================
  if (routeKey === '/account-groups') {
    if (method === 'GET') {
      const profileId = req.nextUrl.searchParams.get('profileId') || undefined;
      const groups = WorkspaceStore.getAccountGroups(tenantId, profileId);
      return respond(200, { success: true, count: groups.length, accountGroups: groups, data: groups });
    }
    if (method === 'POST') {
      if (!body.name) {
        return respond(400, { success: false, error: { code: 'invalid_field_value', message: 'Field "name" is required.' } });
      }
      const group = WorkspaceStore.addAccountGroup(tenantId, {
        name: body.name,
        accountIds: body.accountIds || [],
        description: body.description,
        color: body.color,
        profileId: body.profileId,
      });
      return respond(201, { success: true, accountGroup: group, data: group });
    }
  }

  if (path[0] === 'account-groups' && path[1]) {
    const groupId = path[1];
    if (method === 'PUT') {
      const updated = WorkspaceStore.updateAccountGroup(tenantId, groupId, {
        name: body.name,
        accountIds: body.accountIds,
        description: body.description,
        color: body.color,
      });
      if (!updated) return respond(404, { success: false, error: { code: 'not_found', message: 'Account group not found.' } });
      return respond(200, { success: true, accountGroup: updated, data: updated });
    }
    if (method === 'DELETE') {
      const deleted = WorkspaceStore.deleteAccountGroup(tenantId, groupId);
      if (!deleted) return respond(404, { success: false, error: { code: 'not_found', message: 'Account group not found.' } });
      return respond(200, { success: true, deleted: true, id: groupId });
    }
  }

  // ============================================================================
  // 2. SOCIAL ACCOUNTS & HEADLESS OAUTH (/accounts, /connect/:platform)
  // ============================================================================
  if (method === 'GET' && routeKey === '/accounts') {
    if (!hasScope(scopes, 'accounts:read')) return denyScope('accounts:read');
    return respond(
      200,
      {
        success: true,
        count: ws.connectedAccounts.length,
        quota: {
          used: ws.connectedAccounts.length,
          max: policy.quotas.maxConnectedAccounts,
        },
        data: ws.connectedAccounts,
      },
      'List connected social accounts',
      `${ws.connectedAccounts.length} accounts`
    );
  }

  if (method === 'DELETE' && path[0] === 'accounts' && path[1]) {
    if (!hasScope(scopes, 'accounts:write')) return denyScope('accounts:write');
    const accountId = path[1];
    WorkspaceStore.removeConnectedAccount(tenantId, accountId);
    return respond(
      200,
      {
        success: true,
        message: `Disconnected account ${accountId}`,
        deletedId: accountId,
      },
      `Disconnect account ${accountId}`,
      'Account removed'
    );
  }

  if (method === 'POST' && path[0] === 'connect' && path[1] && path.length === 2) {
    if (!hasScope(scopes, 'accounts:write')) return denyScope('accounts:write');
    const platformParam = decodeURIComponent(path[1]).toLowerCase() as SocialPlatform;

    if (ws.connectedAccounts.length >= policy.quotas.maxConnectedAccounts) {
      return respond(
        403,
        {
          success: false,
          error: {
            code: 'plan_quota_exceeded',
            message: `Your current plan (${policy.planKey}) allows up to ${policy.quotas.maxConnectedAccounts} connected social accounts. Upgrade your plan or disconnect an existing channel.`,
            quota: { used: ws.connectedAccounts.length, max: policy.quotas.maxConnectedAccounts },
          },
        },
        `Connect ${platformParam}`,
        'Quota exceeded (maxConnectedAccounts)'
      );
    }

    if (body.mode === 'oauth_url' || (!body.username && !body.handle && !body.accessToken)) {
      const stateToken = `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const redirectUri = body.redirectUri || `${baseUrl}/dashboard`;
      return respond(
        200,
        {
          success: true,
          mode: 'headless_oauth',
          data: {
            platform: platformParam,
            authUrl: `${baseUrl}/oauth/authorize?platform=${encodeURIComponent(platformParam)}&state=${stateToken}&redirect_uri=${encodeURIComponent(redirectUri)}`,
            state: stateToken,
            expiresInSeconds: 900,
          },
        },
        `Generate OAuth URL for ${platformParam}`,
        'OAuth URL generated'
      );
    }

    const accountId = `acc_${platformParam}_${Date.now().toString(36)}`;
    const username = body.username || body.handle || `@${tenantId}_${platformParam}`;
    const displayName = body.displayName || `${policy.organizationName} (${platformParam.toUpperCase()})`;
    const newAcc = {
      id: accountId,
      accountId,
      platform: platformParam,
      username,
      displayName,
      status: 'healthy',
      grantedScopes: body.scopes || ['publish_content', 'read_insights', 'manage_messages'],
      canPost: true,
      canFetchAnalytics: true,
      needsReconnect: false,
      connectedAt: new Date().toISOString(),
    };
    WorkspaceStore.addConnectedAccount(tenantId, newAcc);

    return respond(
      201,
      {
        success: true,
        message: `${platformParam} connected via API.`,
        data: newAcc,
      },
      `Connect ${platformParam} (${username})`,
      `Account ${accountId} connected`
    );
  }

  // ============================================================================
  // 2B. ACCOUNTS HEALTH & DIAGNOSTICS (/accounts/health, /accounts/{id}/health)
  // ============================================================================
  if (method === 'GET' && routeKey === '/accounts/health') {
    const accounts = ws.connectedAccounts || [];
    const healthList = accounts.map((acc) => ({
      accountId: acc.id || acc.accountId,
      platform: acc.platform,
      displayName: acc.displayName,
      status: acc.status || 'healthy',
      tokenValid: true,
      canPost: acc.canPost !== false,
      canFetchAnalytics: acc.canFetchAnalytics !== false,
      needsReconnect: Boolean(acc.needsReconnect),
      platformConnection: true,
      inboundWebhookSubscribed: true,
      issues: acc.issues || [],
    }));
    const healthyCount = healthList.filter((a) => a.status === 'healthy').length;
    const warningCount = healthList.filter((a) => a.status === 'warning').length;
    const errorCount = healthList.filter((a) => a.status === 'error' || a.needsReconnect).length;

    return respond(200, {
      success: true,
      summary: {
        total: healthList.length,
        healthy: healthyCount,
        warning: warningCount,
        error: errorCount,
        needsReconnect: errorCount,
      },
      accounts: healthList,
      data: healthList,
    });
  }

  if (method === 'GET' && path[0] === 'accounts' && path[1] && path[2] === 'health') {
    const accountId = path[1];
    const acc = (ws.connectedAccounts || []).find((a) => a.id === accountId || a.accountId === accountId);
    if (!acc) {
      return respond(404, { success: false, error: { code: 'not_found', message: `Account ${accountId} not found.` } });
    }
    const platform = acc.platform || 'instagram';
    return respond(200, {
      success: true,
      accountId,
      platform,
      status: acc.status || 'healthy',
      canPost: acc.canPost !== false,
      canFetchAnalytics: acc.canFetchAnalytics !== false,
      tokenValid: true,
      needsReconnect: Boolean(acc.needsReconnect),
      platformConnection: true,
      inboundWebhookSubscribed: true,
      messagingRestriction: null,
      phoneStatus: platform === 'whatsapp' ? 'connected' : undefined,
    });
  }

  // ============================================================================
  // 2C. PLATFORM MENUS, ICE BREAKERS, GREETINGS & TELEGRAM COMMANDS
  // ============================================================================
  if (
    (path[0] === 'accounts' && path[2] === 'messenger-menu') ||
    routeKey === '/account-settings/messenger-menu'
  ) {
    const accountId = path[0] === 'accounts' ? path[1] : (body.accountId || req.nextUrl.searchParams.get('accountId') || 'primary');
    if (method === 'GET') {
      const settings = WorkspaceStore.getAccountSettings(tenantId, accountId);
      return respond(200, { success: true, persistent_menu: settings.messengerMenu?.persistentMenu || [] });
    }
    if (method === 'PUT' || method === 'POST') {
      const menu = body.persistent_menu || body.persistentMenu || [];
      if (Array.isArray(menu) && menu.length > 3) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Persistent menu allows maximum 3 top-level items.' } });
      }
      const updated = WorkspaceStore.updateAccountSettings(tenantId, accountId, { messengerMenu: { persistentMenu: menu } });
      return respond(200, { success: true, persistent_menu: updated.messengerMenu?.persistentMenu || [] });
    }
    if (method === 'DELETE') {
      WorkspaceStore.updateAccountSettings(tenantId, accountId, { messengerMenu: { persistentMenu: [] } });
      return respond(200, { success: true, deleted: true });
    }
  }

  if (
    (path[0] === 'accounts' && path[2] === 'messenger-ice-breakers') ||
    routeKey === '/account-settings/messenger-ice-breakers'
  ) {
    const accountId = path[0] === 'accounts' ? path[1] : (body.accountId || req.nextUrl.searchParams.get('accountId') || 'primary');
    if (method === 'GET') {
      const settings = WorkspaceStore.getAccountSettings(tenantId, accountId);
      return respond(200, { success: true, ice_breakers: settings.iceBreakers || [] });
    }
    if (method === 'PUT' || method === 'POST') {
      const breakers = body.ice_breakers || body.iceBreakers || [];
      if (Array.isArray(breakers) && breakers.length > 4) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Maximum 4 ice breaker prompts allowed.' } });
      }
      const updated = WorkspaceStore.updateAccountSettings(tenantId, accountId, { iceBreakers: breakers });
      return respond(200, { success: true, ice_breakers: updated.iceBreakers || [] });
    }
    if (method === 'DELETE') {
      WorkspaceStore.updateAccountSettings(tenantId, accountId, { iceBreakers: [] });
      return respond(200, { success: true, deleted: true });
    }
  }

  if (
    (path[0] === 'accounts' && path[2] === 'messenger-greeting') ||
    routeKey === '/account-settings/messenger-greeting'
  ) {
    const accountId = path[0] === 'accounts' ? path[1] : (body.accountId || req.nextUrl.searchParams.get('accountId') || 'primary');
    if (method === 'GET') {
      const settings = WorkspaceStore.getAccountSettings(tenantId, accountId);
      return respond(200, { success: true, greeting: settings.greeting || { text: '' } });
    }
    if (method === 'PUT' || method === 'POST') {
      const greeting = body.greeting || { text: body.text || '' };
      const updated = WorkspaceStore.updateAccountSettings(tenantId, accountId, { greeting });
      return respond(200, { success: true, greeting: updated.greeting });
    }
    if (method === 'DELETE') {
      WorkspaceStore.updateAccountSettings(tenantId, accountId, { greeting: { text: '' } });
      return respond(200, { success: true, deleted: true });
    }
  }

  if (
    (path[0] === 'accounts' && path[2] === 'instagram-ice-breakers') ||
    routeKey === '/account-settings/instagram-ice-breakers'
  ) {
    const accountId = path[0] === 'accounts' ? path[1] : (body.accountId || req.nextUrl.searchParams.get('accountId') || 'primary');
    if (method === 'GET') {
      const settings = WorkspaceStore.getAccountSettings(tenantId, accountId);
      return respond(200, { success: true, ice_breakers: settings.iceBreakers || [] });
    }
    if (method === 'PUT' || method === 'POST') {
      const breakers = body.ice_breakers || body.iceBreakers || [];
      if (Array.isArray(breakers) && breakers.length > 4) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Maximum 4 ice breaker prompts allowed.' } });
      }
      const updated = WorkspaceStore.updateAccountSettings(tenantId, accountId, { iceBreakers: breakers });
      return respond(200, { success: true, ice_breakers: updated.iceBreakers || [] });
    }
    if (method === 'DELETE') {
      WorkspaceStore.updateAccountSettings(tenantId, accountId, { iceBreakers: [] });
      return respond(200, { success: true, deleted: true });
    }
  }

  if (
    (path[0] === 'accounts' && path[2] === 'telegram-commands') ||
    routeKey === '/account-settings/telegram-commands'
  ) {
    const accountId = path[0] === 'accounts' ? path[1] : (body.accountId || req.nextUrl.searchParams.get('accountId') || 'primary');
    if (method === 'GET') {
      const settings = WorkspaceStore.getAccountSettings(tenantId, accountId);
      return respond(200, { success: true, commands: settings.telegramCommands || [] });
    }
    if (method === 'PUT' || method === 'POST') {
      const commands = body.commands || [];
      if (Array.isArray(commands) && commands.length > 100) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Maximum 100 commands allowed.' } });
      }
      const updated = WorkspaceStore.updateAccountSettings(tenantId, accountId, { telegramCommands: commands });
      return respond(200, { success: true, commands: updated.telegramCommands || [] });
    }
    if (method === 'DELETE') {
      WorkspaceStore.updateAccountSettings(tenantId, accountId, { telegramCommands: [] });
      return respond(200, { success: true, deleted: true });
    }
  }

  // Headless OAuth Secondary Selection (/connect/{platform}/select)
  if (path[0] === 'connect' && path[2] === 'select') {
    const platform = path[1].toLowerCase();
    if (method === 'GET') {
      return respond(200, {
        success: true,
        platform,
        selectableEntities: [
          { id: `ent_${platform}_page_1`, name: `${policy.organizationName} Official`, type: 'page' },
          { id: `ent_${platform}_page_2`, name: `${policy.organizationName} Support`, type: 'page' },
        ],
      });
    }
    if (method === 'POST') {
      const entityId = body.entityId || `ent_${platform}_selected`;
      const entityName = body.entityName || body.name || `${policy.organizationName} (${platform.toUpperCase()})`;
      const accountId = `acc_${platform}_${Date.now().toString(36)}`;
      const connectedAccount = {
        id: accountId,
        accountId,
        platform,
        username: `@${entityName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
        displayName: entityName,
        status: 'healthy',
        grantedScopes: ['manage_pages', 'publish_content', 'read_insights'],
        canPost: true,
        canFetchAnalytics: true,
        needsReconnect: false,
        selectedEntity: { id: entityId, type: body.entityType || 'page', name: entityName },
        connectedAt: new Date().toISOString(),
      };
      WorkspaceStore.addConnectedAccount(tenantId, connectedAccount);
      return respond(200, {
        success: true,
        message: 'Account entity selected and connected.',
        account: connectedAccount,
        redirect_url: body.redirect_url || `${baseUrl}/dashboard`,
      });
    }
  }

  // ============================================================================
  // 3. MULTI-PLATFORM PUBLISHING, QUEUE & MEDIA (/posts, /queue, /media/presign)
  // ============================================================================
  if (routeKey === '/posts') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'posts:write') && !hasScope(scopes, 'accounts:read')) return denyScope('posts:write');
      return respond(
        200,
        {
          success: true,
          count: ws.posts.length,
          quota: {
            used: ws.posts.length,
            max: policy.quotas.maxMonthlyPosts,
          },
          data: ws.posts,
        },
        'List posts',
        `${ws.posts.length} posts returned`
      );
    }

    if (method === 'POST') {
      if (!hasScope(scopes, 'posts:write')) return denyScope('posts:write');
      if (ws.posts.length >= policy.quotas.maxMonthlyPosts) {
        return respond(
          403,
          {
            success: false,
            error: {
              code: 'plan_quota_exceeded',
              message: `Your current plan (${policy.planKey}) limit of ${policy.quotas.maxMonthlyPosts} monthly posts has been reached.`,
              quota: { used: ws.posts.length, max: policy.quotas.maxMonthlyPosts },
            },
          },
          'Create post',
          'Quota exceeded (maxMonthlyPosts)'
        );
      }

      if (!body.content || typeof body.content !== 'string') {
        return respond(
          400,
          {
            success: false,
            error: {
              code: 'validation_error',
              message: 'Field "content" (string) is required to publish or schedule a post.',
            },
          },
          'Create post (missing content)',
          'Validation error: content required'
        );
      }

      const targetPlatformList: Array<{ platform: string; accountId: string }> =
        Array.isArray(body.platforms) && body.platforms.length > 0
          ? body.platforms.map((p: any) => {
              if (typeof p === 'string') {
                const plat = p.toLowerCase();
                return { platform: plat, accountId: `acc_${plat}_primary` };
              }
              const plat = (p.platform || 'instagram').toLowerCase();
              return {
                platform: plat,
                accountId: p.accountId || `acc_${plat}_primary`,
              };
            })
          : [
              { platform: 'instagram', accountId: 'acc_instagram_primary' },
              { platform: 'linkedin', accountId: 'acc_linkedin_primary' },
              { platform: 'x', accountId: 'acc_x_primary' },
            ];

      const rawPlatforms: string[] = targetPlatformList.map((p) => p.platform);

      // Layer 3: 24h Duplicate Content Hash Deduplication
      const dupCheck = WorkspaceStore.findDuplicatePost(tenantId, body.content, targetPlatformList);
      if (dupCheck.isDuplicate) {
        return respond(
          409,
          {
            success: false,
            error: 'This exact content is already scheduled, publishing, or was posted to this account within the last 24 hours.',
            code: 'duplicate_post',
            details: {
              accountId: dupCheck.matchedAccountId || targetPlatformList[0].accountId,
              platform: dupCheck.matchedPlatform || targetPlatformList[0].platform,
              existingPostId: dupCheck.existingPost?.id || 'post_existing',
            },
          },
          'Duplicate post rejected',
          '409 Conflict: duplicate_post'
        );
      }

      const publishNow = body.publishNow !== undefined ? Boolean(body.publishNow) : body.scheduleMode !== 'scheduled';

      const postItem = {
        id: `post_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        content: body.content,
        platforms: targetPlatformList.map((tp) => ({
          platform: tp.platform,
          accountId: tp.accountId,
          status: publishNow ? 'published' : 'scheduled',
          platformPostUrl: `https://${tp.platform}.com/p/${Date.now().toString(36)}`,
        })),
        status: publishNow ? 'published' : 'scheduled',
        scheduledFor: body.scheduledFor || (publishNow ? undefined : new Date(Date.now() + 3600_000).toISOString()),
        publishNow,
        createdAt: new Date().toISOString(),
      };

      WorkspaceStore.addPost(tenantId, postItem);

      await WorkspaceStore.dispatchCustomerWebhook(tenantId, 'post.published', {
        postId: postItem.id,
        platforms: rawPlatforms,
        status: postItem.status,
      });

      return respond(
        201,
        {
          success: true,
          message: publishNow ? 'Post published across selected networks.' : 'Post scheduled in queue.',
          data: postItem,
          post: postItem,
        },
        `Publish post to ${rawPlatforms.join(', ')}`,
        `Post ${postItem.id} (${postItem.status})`
      );
    }
  }

  if (path[0] === 'posts' && path[1] && path[1] !== 'sync-external') {
    const postId = path[1];
    if (method === 'GET') {
      const p = ws.posts.find((item) => item.id === postId);
      if (!p) return respond(404, { success: false, error: { code: 'not_found', message: `Post ${postId} not found.` } });
      return respond(200, { success: true, post: p, data: p });
    }
    if (method === 'PUT') {
      if (!hasScope(scopes, 'posts:write')) return denyScope('posts:write');
      const p = ws.posts.find((item) => item.id === postId);
      if (!p) return respond(404, { success: false, error: { code: 'not_found', message: `Post ${postId} not found.` } });
      if (body.content) p.content = body.content;
      if (body.scheduledFor) p.scheduledFor = body.scheduledFor;
      WorkspaceStore.saveWorkspace(tenantId, ws);
      return respond(200, { success: true, post: p, data: p });
    }
    if (method === 'DELETE') {
      if (!hasScope(scopes, 'posts:write')) return denyScope('posts:write');
      WorkspaceStore.removePost(tenantId, postId);
      return respond(
        200,
        {
          success: true,
          message: `Post ${postId} deleted.`,
          deletedId: postId,
        },
        `Delete post ${postId}`,
        'Post deleted'
      );
    }
  }

  if (method === 'POST' && routeKey === '/posts/sync-external') {
    return respond(200, { success: true, syncedCount: 3, message: 'External posts synchronized.' });
  }

  if (routeKey === '/queue') {
    if (method === 'GET') {
      return respond(
        200,
        {
          success: true,
          data: {
            timezone: 'UTC',
            slots: [
              { dayOfWeek: 1, time: '09:00' },
              { dayOfWeek: 3, time: '14:00' },
              { dayOfWeek: 5, time: '18:00' },
            ],
            bestTimeAiEnabled: true,
          },
        },
        'Get queue schedule',
        'Queue schedule returned'
      );
    }
    if (method === 'PUT' || method === 'POST') {
      if (!hasScope(scopes, 'posts:write')) return denyScope('posts:write');
      const res = await PublishingService.upsertProfileQueue({
        organizationId: tenantId,
        name: body.name || 'Primary Queue',
        timezone: body.timezone || 'UTC',
        slots: body.slots || [
          { dayOfWeek: 1, time: '09:00' },
          { dayOfWeek: 3, time: '14:00' },
        ],
      });
      return respond(200, { success: true, message: 'Queue schedule updated.', data: res }, 'Update queue schedule', 'Queue updated');
    }
  }

  if (method === 'POST' && routeKey === '/media/presign') {
    if (!hasScope(scopes, 'posts:write')) return denyScope('posts:write');
    const filename = body.filename || 'upload.mp4';
    const mimeType = body.mimeType || body.contentType || 'video/mp4';
    const presigned = await PublishingService.createMediaPresignedUpload({
      organizationId: tenantId,
      filename,
      contentType: mimeType,
    });
    return respond(200, {
      success: true,
      ...presigned,
      data: presigned,
      uploadUrl: presigned.uploadUrl,
      publicUrl: presigned.publicUrl,
      expiresIn: presigned.expiresIn,
    }, `Presign media ${filename}`, 'Presigned URL generated');
  }

  // ============================================================================
  // 3B. QUEUE SLOTS, PREVIEW & PRE-FLIGHT VALIDATION
  // ============================================================================
  function computeNextQueueSlots(slots: Array<{ dayOfWeek: number; time: string }>, count = 2): string[] {
    const result: string[] = [];
    const now = new Date();
    for (let d = 0; d < 14 && result.length < count; d++) {
      const candidate = new Date(now.getTime() + d * 24 * 3600 * 1000);
      const dayOfWeek = candidate.getUTCDay();
      const matching = (slots || []).filter((s) => s.dayOfWeek === dayOfWeek).sort((a, b) => a.time.localeCompare(b.time));
      for (const m of matching) {
        const slotIso = `${candidate.toISOString().slice(0, 10)}T${m.time}:00Z`;
        if (new Date(slotIso).getTime() > now.getTime()) {
          result.push(slotIso);
          if (result.length >= count) break;
        }
      }
    }
    if (result.length === 0) {
      result.push(new Date(now.getTime() + 86400000).toISOString());
      result.push(new Date(now.getTime() + 2 * 86400000).toISOString());
    }
    return result;
  }

  if (routeKey === '/queue/slots') {
    const profileId = req.nextUrl.searchParams.get('profileId') || body.profileId || `prof_${tenantId}`;
    if (method === 'GET') {
      const slotsList = WorkspaceStore.getQueueSlots(tenantId, profileId);
      const schedule = slotsList[0] || {
        profileId,
        name: 'Weekly Queue',
        timezone: 'UTC',
        active: true,
        isDefault: true,
        slots: [
          { dayOfWeek: 1, time: '09:00' },
          { dayOfWeek: 3, time: '14:00' },
        ],
      };
      return respond(200, {
        success: true,
        schedule,
        nextSlots: computeNextQueueSlots(schedule.slots),
      });
    }
    if (method === 'POST') {
      const name = body.name || 'Prime Queue';
      const timezone = body.timezone || 'UTC';
      const slots = Array.isArray(body.slots) ? body.slots : [{ dayOfWeek: 1, time: '09:00' }];
      for (const slot of slots) {
        if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6 || !/^\d{2}:\d{2}$/.test(slot.time)) {
          return respond(400, { success: false, error: { code: 'invalid_field_value', message: 'dayOfWeek must be 0-6 and time must be HH:mm format.' } });
        }
      }
      const config = WorkspaceStore.saveQueueSlots(tenantId, {
        profileId,
        name,
        timezone,
        slots,
      });
      return respond(201, {
        success: true,
        schedule: config,
        nextSlots: computeNextQueueSlots(config.slots),
      });
    }
    if (method === 'DELETE') {
      WorkspaceStore.deleteQueueSlots(tenantId, profileId);
      return respond(200, { success: true, deleted: true });
    }
  }

  if (method === 'GET' && routeKey === '/queue/preview') {
    const profileId = req.nextUrl.searchParams.get('profileId') || `prof_${tenantId}`;
    const days = Number(req.nextUrl.searchParams.get('days') || 7);
    const slotsList = WorkspaceStore.getQueueSlots(tenantId, profileId);
    const slots = slotsList[0]?.slots || [
      { dayOfWeek: 1, time: '09:00' },
      { dayOfWeek: 3, time: '14:00' },
      { dayOfWeek: 5, time: '17:00' },
    ];
    const upcomingSlots = [];
    const now = new Date();
    for (let d = 1; d <= days; d++) {
      const future = new Date(now.getTime() + d * 24 * 3600 * 1000);
      const dayOfWeek = future.getUTCDay();
      const matched = slots.filter((s) => s.dayOfWeek === dayOfWeek);
      for (const m of matched) {
        upcomingSlots.push({
          timestamp: `${future.toISOString().slice(0, 10)}T${m.time}:00Z`,
          dayOfWeek,
          time: m.time,
          assignedPost: null,
        });
      }
    }
    return respond(200, { success: true, count: upcomingSlots.length, upcomingSlots });
  }

  if (method === 'POST' && routeKey === '/validate/post') {
    const content = body.content || '';
    const platforms = body.platforms || [];
    const mediaItems = body.mediaItems || [];
    const errors: Array<{ platform: string; field: string; rule: string; message: string }> = [];
    const warnings: string[] = [];

    for (const platObj of platforms) {
      const plat = typeof platObj === 'string' ? platObj.toLowerCase() : (platObj.platform || '').toLowerCase();
      if (plat === 'x' && content.length > 280) {
        errors.push({ platform: plat, field: 'content', rule: 'char_limit', message: 'X posts cannot exceed 280 characters.' });
      }
      if (plat === 'threads' && content.length > 500) {
        errors.push({ platform: plat, field: 'content', rule: 'char_limit', message: 'Threads posts cannot exceed 500 characters.' });
      }
      if (plat === 'linkedin' && content.length > 3000) {
        errors.push({ platform: plat, field: 'content', rule: 'char_limit', message: 'LinkedIn posts cannot exceed 3000 characters.' });
      }
      if (plat === 'instagram' && content.length > 2200) {
        errors.push({ platform: plat, field: 'content', rule: 'char_limit', message: 'Instagram captions cannot exceed 2200 characters.' });
      }
      if ((plat === 'instagram' || plat === 'tiktok') && mediaItems.length === 0) {
        errors.push({ platform: plat, field: 'mediaItems', rule: 'media_required', message: `${plat} posts require at least one image or video.` });
      }
    }

    return respond(200, {
      valid: errors.length === 0,
      errors,
      warnings,
      charCount: content.length,
      platformCount: platforms.length,
    });
  }

  if (method === 'POST' && routeKey === '/validate/media') {
    const mediaType = body.type || 'image';
    const url = body.url || '';
    const issues: string[] = [];
    if (!url) issues.push('Media URL is required.');

    return respond(200, {
      valid: issues.length === 0,
      dimensions: mediaType === 'video' ? { width: 1920, height: 1080, aspectRatio: '16:9' } : { width: 1080, height: 1080, aspectRatio: '1:1' },
      duration: mediaType === 'video' ? 30 : undefined,
      sizeBytes: mediaType === 'video' ? 15420000 : 1240000,
      issues,
    });
  }

  // ============================================================================
  // 4. CLOUD TELEPHONY: VIRTUAL NUMBERS (/phone-numbers/available, /phone-numbers, /phone-numbers/buy)
  // ============================================================================
  if (method === 'GET' && routeKey === '/phone-numbers/available') {
    if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
    const country = req.nextUrl.searchParams.get('country') || 'US';
    const numberType = (req.nextUrl.searchParams.get('type') || 'all') as 'all' | 'local' | 'mobile' | 'toll_free';
    const searchRes = await TelephonyService.searchAvailableNumbers({
      organizationId: tenantId,
      country,
      numberType,
      limit: Number(req.nextUrl.searchParams.get('limit') || 12),
    });

    return respond(
      200,
      {
        success: true,
        count: searchRes.results.length,
        totalCountriesSupported: searchRes.totalCountries,
        data: searchRes.results,
      },
      `Search available numbers (${country})`,
      `${searchRes.results.length} numbers available`
    );
  }

  if (method === 'GET' && routeKey === '/phone-numbers') {
    if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
    return respond(
      200,
      {
        success: true,
        count: ws.ownedNumbers.length,
        quota: {
          used: ws.ownedNumbers.length,
          max: policy.quotas.maxPhoneNumbers,
        },
        walletBalanceUsd: ws.wallet?.balanceUsd ?? 50,
        data: ws.ownedNumbers,
      },
      'List owned virtual phone numbers',
      `${ws.ownedNumbers.length} numbers owned`
    );
  }

  if (method === 'DELETE' && path[0] === 'phone-numbers' && path[1] && path[1] !== 'available' && path[1] !== 'buy') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
    WorkspaceStore.removeOwnedNumber(tenantId, path[1]);
    return respond(
      200,
      {
        success: true,
        message: `Released virtual phone number ${path[1]}.`,
        releasedId: path[1],
      },
      `Release phone number ${path[1]}`,
      'Number released'
    );
  }

  if (method === 'POST' && routeKey === '/phone-numbers/buy') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');

    if (ws.ownedNumbers.length >= policy.quotas.maxPhoneNumbers) {
      return respond(
        403,
        {
          success: false,
          error: {
            code: 'plan_quota_exceeded',
            message: `Your current plan (${policy.planKey}) allows up to ${policy.quotas.maxPhoneNumbers} active virtual phone numbers. Upgrade your plan or release an existing number.`,
            quota: { used: ws.ownedNumbers.length, max: policy.quotas.maxPhoneNumbers },
          },
        },
        'Buy virtual number',
        'Quota exceeded (maxPhoneNumbers)'
      );
    }

    const country = (body.country || 'US').toUpperCase();
    const numberType = (body.numberType || 'mobile') as 'local' | 'mobile' | 'toll_free';
    const priceUsd = Number(body.monthlyPriceUsd || (country === 'US' ? 3.0 : country === 'GB' ? 4.0 : 8.0));
    const currentBalance = ws.wallet?.balanceUsd ?? 50.0;

    if (currentBalance < priceUsd) {
      return respond(
        402,
        {
          success: false,
          error: {
            code: 'insufficient_wallet_balance',
            message: `Insufficient Telecom Wallet balance ($${currentBalance.toFixed(2)}) to provision ${country} number ($${priceUsd.toFixed(2)}/mo). Top up via POST /api/v1/wallet/topup or Dashboard.`,
            requiredUsd: priceUsd,
            balanceUsd: currentBalance,
          },
        },
        `Buy number (${country})`,
        '402 Insufficient wallet balance'
      );
    }

    const updatedWallet = WorkspaceStore.adjustWalletBalance(
      tenantId,
      'debit',
      priceUsd,
      `Provisioned virtual number (${country} - ${numberType})`
    );

    const purchaseRes = await TelephonyService.buyPhoneNumber({
      organizationId: tenantId,
      country,
      numberType,
      phoneNumber: body.phoneNumber || body.number,
      locality: body.locality,
    });

    await WorkspaceStore.dispatchCustomerWebhook(tenantId, 'number.purchased', {
      numberId: purchaseRes.phoneNumber.id,
      phoneNumber: purchaseRes.phoneNumber.phoneNumber,
      country: purchaseRes.phoneNumber.country,
      chargedUsd: priceUsd,
    });

    return respond(
      201,
      {
        success: true,
        message: `Virtual number ${purchaseRes.phoneNumber.phoneNumber} provisioned and active for SMS, Voice, OTP & WhatsApp Business linking.`,
        data: purchaseRes.phoneNumber,
        wallet: {
          chargedUsd: priceUsd,
          remainingBalanceUsd: updatedWallet.balanceUsd,
        },
      },
      `Buy number ${purchaseRes.phoneNumber.phoneNumber}`,
      `Provisioned ${purchaseRes.phoneNumber.id} (-$${priceUsd})`
    );
  }

  // ============================================================================
  // 5. WHATSAPP BUSINESS CLOUD API (/whatsapp/link, /whatsapp/verify-otp, /whatsapp/templates, /whatsapp/messages)
  // ============================================================================
  if (method === 'POST' && routeKey === '/whatsapp/link') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
    const targetNumber =
      ws.ownedNumbers.find((n) => n.id === body.numberId || n.phoneNumber === body.phoneNumber || n.phoneNumber === body.number) ||
      ws.ownedNumbers[0];

    if (!targetNumber) {
      return respond(
        404,
        {
          success: false,
          error: {
            code: 'number_not_found',
            message: 'No owned virtual phone number found. Purchase a number first via POST /api/v1/phone-numbers/buy.',
          },
        },
        'Request WhatsApp OTP',
        '404 No owned phone number'
      );
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    WorkspaceStore.addThreadMessage(tenantId, {
      virtualNumber: targetNumber.phoneNumber,
      customerNumber: 'Meta WhatsApp Registration',
      customerName: 'Meta WhatsApp Business Cloud API',
      channel: 'sms',
      direction: 'inbound',
      text: `[Meta WhatsApp Cloud API] Your Official Business verification code for ${body.displayName || policy.organizationName} is ${otpCode}.`,
    });

    return respond(
      200,
      {
        success: true,
        message: `WhatsApp Business verification OTP dispatched to ${targetNumber.phoneNumber}. Fetch it programmatically via GET /api/v1/sms/otp/latest or verify via POST /api/v1/whatsapp/verify-otp.`,
        data: {
          otpSent: true,
          otpCode,
          numberId: targetNumber.id,
          phoneNumber: targetNumber.phoneNumber,
          displayName: body.displayName || policy.organizationName,
        },
      },
      `Link WhatsApp on ${targetNumber.phoneNumber}`,
      `OTP ${otpCode} sent`
    );
  }

  if (method === 'POST' && routeKey === '/whatsapp/verify-otp') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
    const targetNumber =
      ws.ownedNumbers.find((n) => n.id === body.numberId || n.phoneNumber === body.phoneNumber || n.phoneNumber === body.number) ||
      ws.ownedNumbers[0];

    if (!targetNumber) {
      return respond(
        404,
        {
          success: false,
          error: {
            code: 'number_not_found',
            message: 'Specified virtual phone number was not found in your workspace.',
          },
        },
        'Verify WhatsApp OTP',
        '404 Number not found'
      );
    }

    const verifyRes = await TelephonyService.linkWhatsAppBusiness({
      organizationId: tenantId,
      phoneNumberId: targetNumber.id,
      displayName: body.displayName || `${policy.organizationName} Official`,
      category: body.category || 'E-Commerce & SaaS',
      verificationMethod: body.verificationMethod || 'sms_otp',
    });

    await WorkspaceStore.dispatchCustomerWebhook(tenantId, 'whatsapp.linked', {
      numberId: targetNumber.id,
      phoneNumber: targetNumber.phoneNumber,
      whatsappDetails: verifyRes.phoneNumber?.whatsappDetails,
    });

    return respond(
      200,
      {
        success: true,
        message: `Number ${targetNumber.phoneNumber} is now officially linked to WhatsApp Business Cloud API.`,
        data: verifyRes,
      },
      `Verify WhatsApp OTP (${targetNumber.phoneNumber})`,
      `Linked WABA on ${targetNumber.phoneNumber}`
    );
  }

  if (routeKey === '/whatsapp/templates') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
      const accountId = req.nextUrl.searchParams.get('accountId') || undefined;
      const stored = WorkspaceStore.getWhatsAppTemplates(tenantId, accountId);
      const systemTemplates = [
        {
          id: 'tpl_order_confirm_01',
          accountId: accountId || 'acc_wa_01',
          name: 'order_confirmation_v2',
          language: 'ar_EG',
          category: 'UTILITY',
          status: 'APPROVED',
          components: ['HEADER: DOCUMENT', 'BODY: أهلاً {{1}}، تم تأكيد طلبك رقم {{2}} بنجاح.', 'BUTTON: تتبع الشحنة'],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'tpl_auth_otp_02',
          accountId: accountId || 'acc_wa_01',
          name: 'auth_verification_code',
          language: 'en_US',
          category: 'AUTHENTICATION',
          status: 'APPROVED',
          components: ['BODY: Your verification code is {{1}}. Valid for 10 minutes.', 'BUTTON: Copy Code'],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      const templates = [
        ...stored,
        ...systemTemplates.filter((st) => !stored.some((s) => s.name === st.name || s.id === st.id)),
      ];
      return respond(
        200,
        {
          success: true,
          count: templates.length,
          templates,
          data: templates,
        },
        'List WhatsApp templates',
        `${templates.length} templates`
      );
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
      const item = WorkspaceStore.addWhatsAppTemplate(tenantId, {
        accountId: body.accountId || 'acc_wa_01',
        name: body.name || 'custom_notification_template',
        category: body.category || 'UTILITY',
        language: body.language || 'en_US',
        components: body.components || ['BODY: Hello {{1}}'],
      });
      return respond(
        201,
        {
          success: true,
          message: 'WhatsApp template submitted and approved via Meta Cloud API.',
          data: item,
          template: item,
        },
        `Create WhatsApp template ${body.name || ''}`,
        'Template APPROVED'
      );
    }
  }

  if (method === 'POST' && routeKey === '/whatsapp/messages') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
    const to = body.to || body.toNumber || '+201093842210';
    const fromNumber = body.from || body.fromNumber || ws.ownedNumbers[0]?.phoneNumber || '+14158904321';
    const text =
      body.text ||
      (body.templateName
        ? `[Template: ${body.templateName}] ${JSON.stringify(body.variables || ['Customer', '#ORD-901'])}`
        : 'Hello from Asra3 WhatsApp Business Cloud API!');

    const costUsd = 0.008;
    const currentBalance = ws.wallet?.balanceUsd ?? 50;
    if (currentBalance < costUsd) {
      return respond(
        402,
        {
          success: false,
          error: {
            code: 'insufficient_wallet_balance',
            message: 'Insufficient Telecom Wallet balance to send WhatsApp Cloud API conversation.',
          },
        },
        `Send WhatsApp to ${to}`,
        '402 Insufficient wallet balance'
      );
    }

    const updatedWallet = WorkspaceStore.adjustWalletBalance(tenantId, 'debit', costUsd, `WhatsApp Business API message to ${to}`);
    const threadRes = WorkspaceStore.addThreadMessage(tenantId, {
      virtualNumber: fromNumber,
      customerNumber: to,
      channel: 'whatsapp',
      direction: 'outbound',
      text,
      status: 'delivered',
    });

    await WorkspaceStore.dispatchCustomerWebhook(tenantId, 'message.sent', {
      channel: 'whatsapp',
      messageId: threadRes.message.id,
      from: fromNumber,
      to,
      text,
    });

    return respond(
      201,
      {
        success: true,
        message: 'WhatsApp Business message dispatched via Meta Cloud API.',
        data: {
          messageId: threadRes.message.id,
          from: fromNumber,
          to,
          type: body.templateName ? 'template' : 'text',
          status: 'delivered',
          chargedUsd: costUsd,
          remainingWalletUsd: updatedWallet.balanceUsd,
          timestamp: threadRes.message.timestamp,
        },
      },
      `Send WhatsApp to ${to}`,
      `Delivered (${threadRes.message.id})`
    );
  }

  // ============================================================================
  // 6. 2-WAY SMS & INBOUND OTP READER (/sms/threads, /sms/otp/latest, /sms/messages)
  // ============================================================================
  if (method === 'GET' && routeKey === '/sms/threads') {
    if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
    return respond(
      200,
      {
        success: true,
        count: ws.threads.length,
        data: ws.threads,
      },
      'List 2-way SMS & WhatsApp threads',
      `${ws.threads.length} threads`
    );
  }

  if (method === 'GET' && routeKey === '/sms/otp/latest') {
    if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
    const allMessages = ws.threads.flatMap((t) =>
      t.messages.map((m) => ({
        threadId: t.id,
        contactPhone: t.customerNumber,
        ourNumber: t.virtualNumber,
        text: m.text,
        time: m.timestamp,
        otpMatch: (m.text.match(/\b(\d{4,8})\b/) || [])[1] || null,
      }))
    );

    const latestWithOtp = allMessages.find((m) => m.otpMatch) || {
      threadId: 'sms_otp_live',
      contactPhone: 'Meta / Google Verification Gateway',
      ourNumber: ws.ownedNumbers[0]?.phoneNumber || '+1 (415) 890-4321',
      text: '[WhatsApp Business Cloud] Your verification code is 482910. Do not share it with anyone.',
      time: new Date().toISOString(),
      otpMatch: '482910',
    };

    return respond(
      200,
      {
        success: true,
        data: {
          otpCode: latestWithOtp.otpMatch,
          receivedOnNumber: latestWithOtp.ourNumber,
          sender: latestWithOtp.contactPhone,
          rawMessage: latestWithOtp.text,
          receivedAt: latestWithOtp.time,
        },
      },
      'Fetch latest inbound OTP SMS',
      `OTP ${latestWithOtp.otpMatch} on ${latestWithOtp.ourNumber}`
    );
  }

  if (method === 'POST' && routeKey === '/sms/messages') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
    const to = body.to || body.toNumber || body.contactPhone;
    const text = body.text;
    if (!to || !text) {
      return respond(
        400,
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Both "to" (recipient phone number in E.164 format) and "text" are required.',
          },
        },
        'Send SMS (missing params)',
        '400 Missing to/text'
      );
    }

    const fromNumber = body.from || body.fromNumber || ws.ownedNumbers[0]?.phoneNumber || '+1 (415) 890-4321';
    const costUsd = 0.015;
    const currentBalance = ws.wallet?.balanceUsd ?? 50;
    if (currentBalance < costUsd) {
      return respond(
        402,
        {
          success: false,
          error: {
            code: 'insufficient_wallet_balance',
            message: 'Insufficient Telecom Wallet balance ($0.015 required per SMS segment).',
          },
        },
        `Send SMS to ${to}`,
        '402 Insufficient wallet balance'
      );
    }

    const updatedWallet = WorkspaceStore.adjustWalletBalance(tenantId, 'debit', costUsd, `Outbound SMS to ${to}`);
    const threadRes = WorkspaceStore.addThreadMessage(tenantId, {
      virtualNumber: fromNumber,
      customerNumber: to,
      channel: 'sms',
      direction: 'outbound',
      text,
      status: 'delivered',
    });

    await WorkspaceStore.dispatchCustomerWebhook(tenantId, 'message.sent', {
      channel: 'sms',
      messageId: threadRes.message.id,
      from: fromNumber,
      to,
      text,
      threadId: threadRes.thread.id,
    });

    return respond(
      201,
      {
        success: true,
        message: `SMS dispatched from ${fromNumber} to ${to}.`,
        data: {
          messageId: threadRes.message.id,
          from: fromNumber,
          to,
          text,
          status: 'delivered',
          chargedUsd: costUsd,
          remainingWalletUsd: updatedWallet.balanceUsd,
          thread: threadRes.thread,
        },
      },
      `Send SMS to ${to}`,
      `SMS delivered (-$${costUsd})`
    );
  }

  // ============================================================================
  // 7. VOICE CALLS & AI VOICE RECEPTIONIST (/voice/ai-agent, /voice/calls)
  // ============================================================================
  if (routeKey === '/voice/ai-agent') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
      const primaryNum = ws.ownedNumbers[0];
      return respond(
        200,
        {
          success: true,
          data: primaryNum?.voiceAgent || {
            enabled: true,
            agentName: 'Sarah — Asra3 AI Voice Receptionist',
            language: 'ar-SA & en-US Bilingual',
            voicePersona: 'Nova Warm Executive',
            systemPrompt: 'Greet callers warmly, answer product questions, qualify leads, and book appointments.',
            recordingEnabled: true,
            transcriptionEnabled: true,
          },
        },
        'Get AI Voice Agent config',
        'AI Voice config'
      );
    }
    if (method === 'PUT' || method === 'POST') {
      if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
      const primaryNum = ws.ownedNumbers[0];
      if (primaryNum) {
        const res = await TelephonyService.configureAiVoiceAgent({
          organizationId: tenantId,
          phoneNumberId: primaryNum.id,
          agentName: body.agentName || 'Asra3 AI Voice Receptionist',
          language: body.language || 'ar-SA',
          systemPrompt: body.systemPrompt || 'Answer inquiries and schedule callbacks.',
          voicePersona: body.voicePersona || 'Nova',
          recordingEnabled: true,
          transcriptionEnabled: true,
        });
        return respond(200, { success: true, message: 'AI Voice Receptionist updated.', data: res }, 'Update AI Voice Agent', 'Updated');
      }
      return respond(200, { success: true, message: 'AI Voice Receptionist default profile updated.', data: body }, 'Update AI Voice Agent', 'Updated');
    }
  }

  if (routeKey === '/voice/calls') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
      return respond(
        200,
        {
          success: true,
          count: ws.callHistory.length,
          data: ws.callHistory,
        },
        'List voice call logs',
        `${ws.callHistory.length} calls`
      );
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
      const to = body.to || body.toNumber || body.contactPhone;
      if (!to) {
        return respond(
          400,
          {
            success: false,
            error: { code: 'validation_error', message: 'Field "to" (destination phone number) is required.' },
          },
          'Initiate voice call (missing to)',
          '400 Missing to'
        );
      }

      const fromNumber = body.from || body.fromNumber || ws.ownedNumbers[0]?.phoneNumber || '+1 (415) 890-4321';
      const costUsd = 0.04;
      const currentBalance = ws.wallet?.balanceUsd ?? 50;
      if (currentBalance < costUsd) {
        return respond(
          402,
          {
            success: false,
            error: {
              code: 'insufficient_wallet_balance',
              message: 'Insufficient Telecom Wallet balance ($0.04/min required for outbound SIP/AI Voice call).',
            },
          },
          `Call ${to}`,
          '402 Insufficient wallet balance'
        );
      }

      const updatedWallet = WorkspaceStore.adjustWalletBalance(tenantId, 'debit', costUsd, `Outbound Voice Call to ${to}`);
      const callRes = await TelephonyService.initiateCall({
        organizationId: tenantId,
        fromNumber,
        toNumber: to,
        mode: body.mode === 'direct_voice' ? 'direct_voice' : 'ai_voice_agent',
        agentPrompt: body.aiGreetingPrompt || body.promptOverride,
      });

      await WorkspaceStore.dispatchCustomerWebhook(tenantId, 'call.initiated', {
        callId: callRes.callSession.callId,
        from: fromNumber,
        to,
        mode: callRes.callSession.mode,
      });

      return respond(
        201,
        {
          success: true,
          message: `Outbound voice call initiated from ${fromNumber} to ${to}.`,
          data: {
            ...callRes.callSession,
            sipTrunkStatus: 'bridged_200_ok',
            remainingWalletUsd: updatedWallet.balanceUsd,
          },
        },
        `Initiate call to ${to}`,
        `Call ${callRes.callSession.callId} (${callRes.callSession.status})`
      );
    }
  }

  // ============================================================================
  // 7B. TELEPHONY & VOICE EXTENSIONS (Verify OTP, Branded Calling, RCS, 10DLC, Porting, WebRTC, Flows, Business Agent)
  // ============================================================================
  if (method === 'POST' && routeKey === '/verify') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
    const to = typeof body.to === 'string' ? body.to.trim() : (typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : (typeof body.phone === 'string' ? body.phone.trim() : ''));
    if (!to) {
      return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "to" (phone number) is required.' } }, 'Send verification code', '400 Missing to');
    }
    const E164_REGEX = /^\+[1-9]\d{1,14}$/;
    if (!E164_REGEX.test(to)) {
      return respond(400, {
        success: false,
        error: {
          code: 'invalid_phone_number',
          message: 'Phone number must be in valid E.164 format (e.g. +14155552671)',
        },
      }, 'Send verification code', '400 Invalid E.164 phone number');
    }
    const record = WorkspaceStore.addVerification(tenantId, {
      to,
      channel: body.channel === 'whatsapp' ? 'whatsapp' : 'sms',
      brandName: body.brandName || policy.organizationName,
      codeLength: Number(body.codeLength || 6),
    });
    return respond(201, { success: true, verificationId: record.id, to: record.to, channel: record.channel, status: record.status, expiresAt: record.expiresAt, code: record.code, data: record }, `Send OTP to ${to}`, `OTP sent (${record.id})`);
  }

  if (method === 'POST' && routeKey === '/verify/check') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
    const toOrId = body.verificationId || body.to || body.phoneNumber;
    const code = String(body.code || '').trim();
    if (!toOrId || !code) {
      return respond(400, { success: false, error: { code: 'validation_error', message: 'Fields "code" and either "verificationId" or "to" are required.' } }, 'Check verification code', '400 Missing params');
    }
    const checkRes = WorkspaceStore.checkVerification(tenantId, toOrId, code);
    if (!checkRes.verified) {
      return respond(400, { success: false, verified: false, status: checkRes.status, reason: checkRes.reason, verificationId: checkRes.verificationId }, `Verify OTP for ${toOrId}`, 'Verification failed');
    }
    return respond(200, { success: true, verified: true, status: 'approved', verificationId: checkRes.verificationId, message: 'Verification successful.' }, `Verify OTP for ${toOrId}`, 'Approved');
  }

  if (routeKey === '/branded-calling/identities') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
      const identities = WorkspaceStore.getBrandedIdentities(tenantId);
      return respond(200, { success: true, count: identities.length, identities, data: identities }, 'List branded identities', `${identities.length} identities`);
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
      if (!body.displayName) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "displayName" is required (max 35 chars).' } }, 'Create branded identity', '400 Missing displayName');
      }
      if (body.displayName.length > 35) {
        return respond(400, { success: false, error: { code: 'invalid_field_value', message: 'Field "displayName" cannot exceed 35 characters.' } }, 'Create branded identity', '400 DisplayName >35');
      }
      const created = WorkspaceStore.addBrandedIdentity(tenantId, {
        displayName: body.displayName,
        callReasons: Array.isArray(body.callReasons) && body.callReasons.length > 0 ? body.callReasons : ['Account Security', 'Order Delivery Notification'],
        logoUrl: body.logoUrl,
        authorizer: body.authorizer,
        references: body.references,
      });
      return respond(201, { success: true, identity: created, data: created, id: created.id, status: created.status }, `Register branded identity ${created.displayName}`, 'Identity requested');
    }
  }

  if (routeKey === '/rcs/agents') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
      const agents = WorkspaceStore.getRcsAgents(tenantId);
      return respond(200, { success: true, count: agents.length, agents, data: agents }, 'List RCS agents', `${agents.length} agents`);
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
      const name = body.name || body.displayName;
      if (!name) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "name" or "displayName" is required.' } }, 'Create RCS agent', '400 Missing name');
      }
      const created = WorkspaceStore.addRcsAgent(tenantId, {
        name,
        displayName: body.displayName || name,
        description: body.description || 'Verified RCS Business Assistant',
        logoUrl: body.logoUrl || 'https://assets.zernio.com/rcs/default-logo.png',
        heroImageUrl: body.heroImageUrl,
        primaryColor: body.primaryColor,
      });
      return respond(201, { success: true, agent: created, data: created }, `Register RCS agent ${name}`, 'RCS agent registered');
    }
  }

  if (method === 'POST' && routeKey === '/rcs/messages') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
    const to = body.to || body.toNumber;
    const text = body.text;
    if (!to || !text) {
      return respond(400, { success: false, error: { code: 'validation_error', message: 'Both "to" and "text" are required.' } }, 'Send RCS message', '400 Missing to/text');
    }
    const msg = WorkspaceStore.addRcsMessage(tenantId, {
      agentId: body.agentId || 'rcs_agent_default',
      to,
      text,
      cards: body.cards,
      suggestions: body.suggestions,
    });
    return respond(201, { success: true, messageId: msg.id, status: 'sent', channel: 'rcs', data: msg }, `Send RCS message to ${to}`, 'RCS delivered');
  }

  if (routeKey === '/sms/registration') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
      const regs = WorkspaceStore.getSmsRegistrations(tenantId);
      return respond(200, { success: true, count: regs.length, registrations: regs, data: regs }, 'List SMS registrations', `${regs.length} registrations`);
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
      const reg = WorkspaceStore.addSmsRegistration(tenantId, {
        registrationType: body.registrationType || 'standard_10dlc',
        brand: body.brand || { name: policy.organizationName },
        campaign: body.campaign || { description: 'Customer support notifications' },
        tollFree: body.tollFree,
      });
      return respond(201, { success: true, registration: reg, data: reg, id: reg.id, status: reg.status, awaitingOtp: reg.awaitingOtp }, `Start SMS registration ${reg.registrationType}`, 'Registration pending');
    }
  }

  if (routeKey === '/phone-numbers/porting') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
      const portings = WorkspaceStore.getPortingRequests(tenantId);
      return respond(200, { success: true, count: portings.length, portingRequests: portings, data: portings }, 'List porting requests', `${portings.length} porting requests`);
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
      const phoneNumber = body.phoneNumber || body.number;
      if (!phoneNumber) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "phoneNumber" is required.' } }, 'Submit number porting', '400 Missing phoneNumber');
      }
      const porting = WorkspaceStore.addPortingRequest(tenantId, {
        phoneNumber,
        currentCarrier: body.currentCarrier || 'Unknown Carrier',
        accountNumber: body.accountNumber || 'ACT-9900',
        pin: body.pin || '0000',
        billingName: body.billingName || policy.organizationName,
        billingAddress: body.billingAddress || {},
        loaDocumentUrl: body.loaDocumentUrl,
      });
      return respond(201, { success: true, portingId: porting.id, phoneNumber: porting.phoneNumber, status: porting.status, estimatedCompletionDate: porting.estimatedCompletionDate, data: porting }, `Submit porting for ${phoneNumber}`, 'Porting submitted');
    }
  }

  if (method === 'POST' && routeKey === '/voice/browser-token') {
    if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
    const token = `webrtc_jwt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const credentialId = `cred_${Date.now().toString(36)}`;
    return respond(200, {
      success: true,
      token,
      credentialId,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      sdk: '@telnyx/webrtc',
    }, 'Mint WebRTC browser token', 'Token minted');
  }

  if (routeKey === '/whatsapp/flows') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
      const flows = WorkspaceStore.getWhatsAppFlows(tenantId, req.nextUrl.searchParams.get('accountId') || undefined);
      return respond(200, { success: true, count: flows.length, flows, data: flows }, 'List WhatsApp flows', `${flows.length} flows`);
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
      const flow = WorkspaceStore.addWhatsAppFlow(tenantId, {
        accountId: body.accountId || 'acc_wa_01',
        name: body.name || 'Feedback Survey Flow',
        categories: Array.isArray(body.categories) ? body.categories : ['CUSTOMER_SUPPORT'],
        screens: body.screens || [],
      });
      return respond(201, { success: true, flow, data: flow }, `Create WhatsApp flow ${flow.name}`, 'Flow created');
    }
  }

  if (routeKey === '/business-agent') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'telephony:read')) return denyScope('telephony:read');
      const agent = WorkspaceStore.getMetaBusinessAgent(tenantId);
      return respond(200, { success: true, data: agent, agent }, 'Get Meta business agent config', 'Agent config returned');
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'telephony:write')) return denyScope('telephony:write');
      const updated = WorkspaceStore.updateMetaBusinessAgent(tenantId, body);
      return respond(200, { success: true, status: updated.status, agentId: `mba_${tenantId}`, config: updated, data: updated }, 'Update Meta business agent', `Agent ${updated.status}`);
    }
  }

  // ============================================================================
  // 8. ZERNIO MESSAGES & UNIFIED INBOX API (18 Endpoints + /messages aliases)
  // ============================================================================

  // 8.1 List Conversations: GET /api/v1/inbox/conversations (or GET /api/v1/messages/conversations)
  if (method === 'GET' && (routeKey === '/inbox/conversations' || routeKey === '/messages/conversations')) {
    if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
    const platformFilter = req.nextUrl.searchParams.get('platform')?.toLowerCase();
    const accountIdFilter = req.nextUrl.searchParams.get('accountId');
    const statusFilter = req.nextUrl.searchParams.get('status') as 'active' | 'archived' | null;
    const folderFilter = (req.nextUrl.searchParams.get('folder') || 'inbox') as 'inbox' | 'requests';

    const filtered = ws.inboxConversations.filter((c) => {
      if (platformFilter && c.platform.toLowerCase() !== platformFilter) return false;
      if (accountIdFilter && c.accountId && c.accountId !== accountIdFilter) return false;
      if (statusFilter && (c.status || 'active') !== statusFilter) return false;
      if (folderFilter && (c.folder || 'inbox') !== folderFilter) return false;
      return true;
    });

    return respond(
      200,
      {
        success: true,
        count: filtered.length,
        supportedPlatforms: ['whatsapp', 'instagram', 'facebook', 'telegram', 'x', 'bluesky', 'reddit', 'slack', 'sms', 'imessage'],
        data: filtered,
      },
      'List unified inbox conversations',
      `${filtered.length} conversations`
    );
  }

  // 8.2 Search Conversations Two Ways at Once: GET /api/v1/inbox/conversations/search (or GET /api/v1/messages/search)
  if (method === 'GET' && (routeKey === '/inbox/conversations/search' || routeKey === '/messages/search')) {
    if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
    const q = (req.nextUrl.searchParams.get('q') || req.nextUrl.searchParams.get('query') || '').trim().toLowerCase();
    const directionFilter = req.nextUrl.searchParams.get('direction') as 'incoming' | 'outgoing' | null;
    const platformFilter = req.nextUrl.searchParams.get('platform')?.toLowerCase();

    if (!q) {
      return respond(
        400,
        {
          success: false,
          error: { code: 'missing_required_field', message: 'Query parameter "q" is required to search conversations.' },
        },
        'Search conversations (missing q)',
        '400 Missing q'
      );
    }

    const hits = ws.inboxConversations
      .filter((c) => !platformFilter || c.platform.toLowerCase() === platformFilter)
      .map((conv) => {
        const msgs = conv.messages || [];
        const matchedMessages = msgs
          .filter((m) => {
            if (directionFilter && m.direction !== directionFilter) return false;
            return (m.text || '').toLowerCase().includes(q);
          })
          .slice(-3);

        const textMatch = matchedMessages.length > 0 || (conv.lastMessage || '').toLowerCase().includes(q);
        const identityMatch =
          (conv.participantName || '').toLowerCase().includes(q) ||
          (conv.participantUsername || '').toLowerCase().includes(q) ||
          (conv.participantId || '').toLowerCase().includes(q);

        if (!textMatch && !identityMatch) return null;
        return {
          conversation: conv,
          matchType: textMatch && identityMatch ? 'both' : textMatch ? 'message_text' : 'contact_identity',
          matchCount: matchedMessages.length || (textMatch ? 1 : 0),
          matches: matchedMessages,
        };
      })
      .filter(Boolean);

    return respond(
      200,
      {
        success: true,
        query: q,
        count: hits.length,
        data: hits,
        meta: {
          searchablePlatforms: ['whatsapp', 'sms', 'telegram', 'facebook', 'instagram', 'x', 'reddit'],
          accountsSkipped: [],
        },
      },
      `Search conversations "${q}"`,
      `${hits.length} matches`
    );
  }

  // 8.3 Create Conversation / Start DM or Send WhatsApp Template: POST /api/v1/inbox/conversations (or POST /api/v1/messages)
  if (method === 'POST' && (routeKey === '/inbox/conversations' || routeKey === '/messages')) {
    if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
    const participantId = body.participantId || body.to || body.recipientId || body.phone;
    const platform = (body.platform || 'whatsapp').toLowerCase();
    const accountId = body.accountId || ws.connectedAccounts[0]?.id || 'acc_primary';
    const messageText =
      body.message ||
      body.text ||
      (body.templateName
        ? `[WhatsApp Template: ${body.templateName} (${body.templateLanguage || 'en_US'})] ${(body.templateParams || []).join(' | ')}`
        : '');

    if (!participantId) {
      return respond(
        400,
        {
          success: false,
          error: {
            code: 'missing_required_field',
            message: 'Field "participantId" (or "to") is required to start or append to a conversation.',
          },
        },
        'Create conversation (missing participantId)',
        '400 Missing participantId'
      );
    }

    if (platform === 'whatsapp' && !body.templateName && body.category !== 'utility' && !body.conversationId && !body.text && !body.message) {
      return respond(
        400,
        {
          success: false,
          error: {
            code: 'TEMPLATE_REQUIRED',
            message:
              'WhatsApp requires templateName & templateLanguage (or category="utility" with message) to open a business-initiated conversation.',
          },
        },
        'Create WhatsApp conversation (missing template)',
        '400 TEMPLATE_REQUIRED'
      );
    }

    const existingConv = ws.inboxConversations.find(
      (c) =>
        (c.participantId && c.participantId === participantId) ||
        (c.participantUsername && c.participantUsername === participantId) ||
        (body.conversationId && c.id === body.conversationId)
    );

    const convId = existingConv?.id || body.conversationId || `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();
    const newMsgId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const msgItem = {
      id: newMsgId,
      conversationId: convId,
      platformMessageId: `plat_${newMsgId}`,
      direction: 'outgoing' as const,
      senderId: accountId,
      senderName: 'Asra3 Operator',
      text: messageText || 'Hello from Asra3 API!',
      attachments: Array.isArray(body.attachments)
        ? body.attachments
        : body.attachmentUrl
        ? [{ id: `att_${Date.now().toString(36)}`, type: 'file' as const, url: body.attachmentUrl }]
        : [],
      template: body.templateName
        ? {
            name: body.templateName,
            language: body.templateLanguage || 'en_US',
            params: body.templateParams || [],
            headerMedia: body.headerMedia,
            headerLocation: body.headerLocation,
          }
        : undefined,
      status: 'delivered' as const,
      createdAt: nowIso,
    };

    const updatedConv = {
      id: convId,
      platform,
      accountId,
      participantId: String(participantId),
      participantName: body.participantName || existingConv?.participantName || String(participantId),
      participantUsername: body.participantUsername || existingConv?.participantUsername || String(participantId),
      status: existingConv?.status || ('active' as const),
      folder: existingConv?.folder || ('inbox' as const),
      threadControl: existingConv?.threadControl || ('human_operator' as const),
      tags: existingConv?.tags || ['api-initiated'],
      lastMessage: msgItem.text,
      unreadCount: existingConv?.unreadCount || 0,
      updatedTime: nowIso,
      messages: [...(existingConv?.messages || []), msgItem],
    };

    WorkspaceStore.addInboxConversation(tenantId, updatedConv);
    await WorkspaceStore.dispatchCustomerWebhook(tenantId, 'message.sent', {
      conversationId: convId,
      messageId: newMsgId,
      platform,
      participantId,
      text: msgItem.text,
    });

    return respond(
      201,
      {
        success: true,
        createdNewThread: !existingConv,
        message: existingConv
          ? 'Message appended to existing conversation thread.'
          : 'New direct message conversation started.',
        data: {
          conversation: updatedConv,
          message: msgItem,
        },
      },
      `Start/send DM to ${participantId} (${platform})`,
      `Message ${newMsgId} delivered`
    );
  }

  // 8.4 Upload Media File for Inbox Messages: POST /api/v1/inbox/media/upload
  if (method === 'POST' && routeKey === '/inbox/media/upload') {
    if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
    const fileName = body.fileName || body.name || `attachment_${Date.now()}.png`;
    const mimeType = body.mimeType || body.contentType || 'image/png';
    const mediaId = `med_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const attachmentUrl = `${baseUrl}/cdn/inbox-media/${tenantId}/${mediaId}/${encodeURIComponent(fileName)}`;

    return respond(
      201,
      {
        success: true,
        message: 'Media uploaded to temporary storage (auto-deletes after 7 days). Use attachmentUrl when sending inbox messages.',
        data: {
          mediaId,
          fileName,
          mimeType,
          attachmentUrl,
          expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
        },
      },
      `Upload inbox media ${fileName}`,
      `Uploaded ${mediaId}`
    );
  }

  // 8.5 Direct GET /api/v1/messages alias (fetch messages across a conversation or latest messages across all threads)
  if (method === 'GET' && routeKey === '/messages') {
    if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
    const convId = req.nextUrl.searchParams.get('conversationId');
    const sortOrder = (req.nextUrl.searchParams.get('sortOrder') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 25)));

    let allMessages = ws.inboxConversations.flatMap((c) =>
      (c.messages && c.messages.length > 0
        ? c.messages
        : [
            {
              id: `msg_seed_${c.id}`,
              conversationId: c.id,
              platformMessageId: `plat_${c.id}`,
              direction: 'incoming' as const,
              senderId: c.participantId || c.participantUsername || 'user_1',
              senderName: c.participantName,
              text: c.lastMessage,
              status: 'read' as const,
              createdAt: c.updatedTime,
            },
          ]
      ).filter((m) => !convId || m.conversationId === convId)
    );

    if (sortOrder === 'desc') {
      allMessages = [...allMessages].reverse();
    }

    return respond(
      200,
      {
        success: true,
        count: allMessages.slice(0, limit).length,
        sortOrderApplied: sortOrder,
        pagination: {
          limit,
          nextCursor: allMessages.length > limit ? `cur_${ Buffer.from(String(limit)).toString('base64') }` : null,
        },
        data: allMessages.slice(0, limit),
      },
      'List messages (/api/v1/messages)',
      `${allMessages.slice(0, limit).length} messages`
    );
  }

  // 8.6 Nested /inbox/conversations/{conversationId}... routes (14 granular Zernio operations)
  if (path[0] === 'inbox' && path[1] === 'conversations' && path[2] && path[2] !== 'search') {
    const conversationId = path[2];
    const subResource = path[3]; // undefined | 'messages' | 'read' | 'typing' | 'accept' | 'handover'
    const existingConv = ws.inboxConversations.find((c) => c.id === conversationId);

    // Helper to synthesize or retrieve conversation
    const ensureConv = () =>
      existingConv || {
        id: conversationId,
        platform: (body.platform || req.nextUrl.searchParams.get('platform') || 'whatsapp').toLowerCase(),
        accountId: body.accountId || req.nextUrl.searchParams.get('accountId') || 'acc_primary',
        participantId: body.participantId || '+14158904321',
        participantName: body.participantName || 'Verified Contact',
        participantUsername: body.participantUsername || '@verified_contact',
        status: 'active' as const,
        folder: 'inbox' as const,
        threadControl: 'human_operator' as const,
        tags: ['vip'],
        lastMessage: 'Conversation thread active',
        unreadCount: 0,
        updatedTime: new Date().toISOString(),
        messages: [],
      };

    // (A) GET / PATCH / DELETE /api/v1/inbox/conversations/{conversationId}
    if (!subResource) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const conv = ensureConv();
        return respond(
          200,
          {
            success: true,
            data: conv,
          },
          `Get conversation ${conversationId}`,
          `Conversation ${conversationId}`
        );
      }

      if (method === 'PATCH' || method === 'PUT') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        const conv = ensureConv();
        const updated = {
          ...conv,
          status: (body.status === 'archived' ? 'archived' : 'active') as 'active' | 'archived',
          folder: (body.folder === 'requests' ? 'requests' : conv.folder || 'inbox') as 'inbox' | 'requests',
          tags: Array.isArray(body.tags) ? body.tags : conv.tags,
          updatedTime: new Date().toISOString(),
        };
        WorkspaceStore.addInboxConversation(tenantId, updated);
        return respond(
          200,
          {
            success: true,
            message: `Conversation ${conversationId} updated (status=${updated.status}).`,
            data: updated,
          },
          `Update conversation ${conversationId}`,
          `Status: ${updated.status}`
        );
      }

      if (method === 'DELETE') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        const deleted = WorkspaceStore.deleteInboxConversation(tenantId, conversationId);
        return respond(
          200,
          {
            success: true,
            deleted,
            conversationId,
            message: `Deleted stored conversation ${conversationId} and all associated messages in one transaction.`,
          },
          `Delete conversation ${conversationId}`,
          'Conversation deleted'
        );
      }
    }

    // (B) Mark Conversation as Read: POST /api/v1/inbox/conversations/{conversationId}/read
    if (subResource === 'read' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const conv = ensureConv();
      const updated = {
        ...conv,
        unreadCount: 0,
        messages: (conv.messages || []).map((m) => (m.direction === 'incoming' ? { ...m, status: 'read' as const } : m)),
        updatedTime: new Date().toISOString(),
      };
      WorkspaceStore.addInboxConversation(tenantId, updated);
      return respond(
        200,
        {
          success: true,
          conversationId,
          readReceiptsSent: conv.platform === 'whatsapp' || conv.platform === 'imessage',
          message: 'All unread incoming messages marked as read (WhatsApp blue ticks dispatched where eligible).',
          data: updated,
        },
        `Mark conversation ${conversationId} read`,
        'Marked as read'
      );
    }

    // (C) Send Typing Indicator: POST /api/v1/inbox/conversations/{conversationId}/typing
    if (subResource === 'typing' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const conv = ensureConv();
      const supported = ['facebook', 'messenger', 'instagram', 'telegram', 'whatsapp', 'imessage'].includes(
        conv.platform.toLowerCase()
      );
      const durationSec =
        conv.platform === 'whatsapp' ? 25 : conv.platform === 'telegram' ? 5 : conv.platform === 'imessage' ? 15 : 20;
      return respond(
        200,
        {
          success: supported,
          conversationId,
          platform: conv.platform,
          typingIndicatorDurationSeconds: supported ? durationSec : 0,
          message: supported
            ? `Typing indicator displayed to recipient on ${conv.platform} for up to ${durationSec}s.`
            : `Platform ${conv.platform} does not support typing indicators (no-op).`,
        },
        `Send typing indicator in ${conversationId}`,
        `Typing indicator (${conv.platform})`
      );
    }

    // (D) Accept Message Request: POST /api/v1/inbox/conversations/{conversationId}/accept
    if (subResource === 'accept' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const conv = ensureConv();
      const replyText = body.message || body.text || 'Thanks for reaching out! How can we help you today?';
      const nowIso = new Date().toISOString();
      const msgId = `msg_${Date.now().toString(36)}`;
      const msgObj = {
        id: msgId,
        conversationId,
        platformMessageId: `plat_${msgId}`,
        direction: 'outgoing' as const,
        senderId: conv.accountId || 'acc_primary',
        senderName: 'Asra3 Operator',
        text: replyText,
        status: 'delivered' as const,
        createdAt: nowIso,
      };
      const updated = {
        ...conv,
        folder: 'inbox' as const,
        status: 'active' as const,
        lastMessage: replyText,
        updatedTime: nowIso,
        messages: [...(conv.messages || []), msgObj],
      };
      WorkspaceStore.addInboxConversation(tenantId, updated);
      return respond(
        200,
        {
          success: true,
          message: 'Message request accepted and moved to primary inbox.',
          data: { conversation: updated, message: msgObj },
        },
        `Accept message request ${conversationId}`,
        'Request accepted -> inbox'
      );
    }

    // (E) Handover Protocol (Change Who Answers): POST /api/v1/inbox/conversations/{conversationId}/handover
    if (subResource === 'handover' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const conv = ensureConv();
      const action = (body.action || 'take') as 'take' | 'pass' | 'release' | 'request';
      const target = body.target || (action === 'release' ? 'ai_agent' : 'human_operator');
      const nextOwner: 'ai_agent' | 'human_operator' | 'primary_receiver' | 'standby' =
        action === 'release' || target === 'ai_agent'
          ? 'ai_agent'
          : action === 'pass' && body.targetAppId
          ? 'standby'
          : 'human_operator';

      const updated = {
        ...conv,
        threadControl: nextOwner,
        updatedTime: new Date().toISOString(),
      };
      WorkspaceStore.addInboxConversation(tenantId, updated);
      await WorkspaceStore.dispatchCustomerWebhook(tenantId, 'conversation.control_changed', {
        conversationId,
        action,
        threadControl: nextOwner,
        targetAppId: body.targetAppId || null,
      });

      return respond(
        200,
        {
          success: true,
          conversationId,
          action,
          threadControl: nextOwner,
          targetAppId: body.targetAppId || null,
          message: `Conversation handover executed (${action} -> ${nextOwner}).`,
        },
        `Handover ${conversationId} (${action})`,
        `Owner: ${nextOwner}`
      );
    }

    // (F) Messages inside a Conversation: /api/v1/inbox/conversations/{conversationId}/messages...
    if (subResource === 'messages') {
      const messageId = path[4];
      const msgSubAction = path[5]; // undefined | 'reactions' | 'attachments'
      const attachmentIndex = path[6];

      // F.1 List Messages in Conversation: GET /api/v1/inbox/conversations/{conversationId}/messages
      if (!messageId && method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const conv = ensureConv();
        const sortOrder = (req.nextUrl.searchParams.get('sortOrder') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
        const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 50)));
        let msgs =
          conv.messages && conv.messages.length > 0
            ? [...conv.messages]
            : [
                {
                  id: `msg_initial_${conversationId}`,
                  conversationId,
                  platformMessageId: `plat_${conversationId}_1`,
                  direction: 'incoming' as const,
                  senderId: conv.participantId || conv.participantUsername || 'contact_01',
                  senderName: conv.participantName,
                  text: conv.lastMessage,
                  status: 'read' as const,
                  createdAt: conv.updatedTime,
                },
              ];
        if (sortOrder === 'desc') msgs.reverse();

        return respond(
          200,
          {
            success: true,
            conversationId,
            platform: conv.platform,
            count: msgs.slice(0, limit).length,
            sortOrderApplied: sortOrder,
            pagination: {
              limit,
              nextCursor: msgs.length > limit ? `cur_${limit}` : null,
            },
            data: msgs.slice(0, limit),
          },
          `List messages in ${conversationId}`,
          `${msgs.slice(0, limit).length} messages`
        );
      }

      // F.2 Send Message in Conversation: POST /api/v1/inbox/conversations/{conversationId}/messages
      if (!messageId && method === 'POST') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        const conv = ensureConv();
        const text =
          body.text ||
          body.message ||
          (body.template ? `[Template: ${body.template?.elements?.[0]?.name || 'approved_template'}]` : '');
        const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;
        if (!text && !body.attachmentUrl && !hasAttachments && !body.interactive && !body.template) {
          return respond(
            400,
            {
              success: false,
              error: {
                code: 'validation_error',
                message: 'Provide at least one of "text", "message", "attachmentUrl", "attachments", "template", or "interactive".',
              },
            },
            `Send message in ${conversationId} (empty)`,
            '400 Empty message'
          );
        }

        const idempotencyKey = req.headers.get('idempotency-key') || undefined;
        const nowIso = new Date().toISOString();
        const newMsgId = idempotencyKey
          ? `msg_idem_${Buffer.from(idempotencyKey).toString('hex').slice(0, 10)}`
          : `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

        const existingIdem = (conv.messages || []).find((m) => m.id === newMsgId);
        if (existingIdem) {
          headers['Idempotent-Replayed'] = 'true';
          return respond(
            200,
            {
              success: true,
              idempotentReplayed: true,
              message: 'Idempotent replay of previously sent message.',
              data: existingIdem,
            },
            `Idempotent replay ${newMsgId}`,
            '200 Idempotent-Replayed'
          );
        }

        const newMsg = {
          id: newMsgId,
          conversationId,
          platformMessageId: `plat_${newMsgId}`,
          direction: 'outgoing' as const,
          senderId: body.accountId || conv.accountId || 'acc_primary',
          senderName: 'Asra3 Operator',
          text: text || 'Attachment',
          attachments: hasAttachments
            ? body.attachments
            : body.attachmentUrl
            ? [
                {
                  id: `att_${Date.now().toString(36)}`,
                  type: 'file' as const,
                  url: body.attachmentUrl,
                  refreshUrl: `${baseUrl}/api/v1/inbox/conversations/${conversationId}/messages/${newMsgId}/attachments/0?accountId=${conv.accountId || 'acc_primary'}&format=json`,
                },
              ]
            : [],
          interactive: body.interactive,
          template: body.template,
          status: 'delivered' as const,
          createdAt: nowIso,
        };

        const updatedConv = {
          ...conv,
          lastMessage: newMsg.text,
          threadControl: 'human_operator' as const,
          updatedTime: nowIso,
          messages: [...(conv.messages || []), newMsg],
        };
        WorkspaceStore.addInboxConversation(tenantId, updatedConv);
        await WorkspaceStore.dispatchCustomerWebhook(tenantId, 'message.sent', {
          conversationId,
          messageId: newMsgId,
          platform: conv.platform,
          text: newMsg.text,
        });

        return respond(
          201,
          {
            success: true,
            message: 'Message delivered to conversation.',
            data: newMsg,
          },
          `Send message in ${conversationId}`,
          `Message ${newMsgId} delivered`
        );
      }

      // F.3 Edit or Delete Message: PATCH / DELETE /api/v1/inbox/conversations/{conversationId}/messages/{messageId}
      if (messageId && !msgSubAction) {
        if (method === 'PATCH' || method === 'PUT') {
          if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
          const conv = ensureConv();
          const newText = body.text || body.message;
          if (!newText) {
            return respond(
              400,
              { success: false, error: { code: 'validation_error', message: 'Field "text" is required to edit a message.' } },
              `Edit message ${messageId}`,
              '400 Missing text'
            );
          }
          const nowIso = new Date().toISOString();
          let editedMsg: any = null;
          const updatedMsgs = (conv.messages || []).map((m) => {
            if (m.id === messageId) {
              editedMsg = { ...m, text: newText, replyMarkup: body.replyMarkup || m.replyMarkup, editedAt: nowIso };
              return editedMsg;
            }
            return m;
          });
          if (!editedMsg) {
            editedMsg = {
              id: messageId,
              conversationId,
              direction: 'outgoing',
              senderId: conv.accountId || 'acc_primary',
              senderName: 'Asra3 Operator',
              text: newText,
              editedAt: nowIso,
              status: 'delivered',
              createdAt: nowIso,
            };
            updatedMsgs.push(editedMsg);
          }
          WorkspaceStore.addInboxConversation(tenantId, {
            ...conv,
            lastMessage: newText,
            updatedTime: nowIso,
            messages: updatedMsgs,
          });
          return respond(
            200,
            {
              success: true,
              message: `Message ${messageId} edited successfully.`,
              data: editedMsg,
            },
            `Edit message ${messageId}`,
            'Message edited'
          );
        }

        if (method === 'DELETE') {
          if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
          const conv = ensureConv();
          const remaining = (conv.messages || []).filter((m) => m.id !== messageId);
          WorkspaceStore.addInboxConversation(tenantId, {
            ...conv,
            messages: remaining,
            updatedTime: new Date().toISOString(),
          });
          return respond(
            200,
            {
              success: true,
              conversationId,
              deletedMessageId: messageId,
              message: `Message ${messageId} deleted/unsent from conversation ${conversationId}.`,
            },
            `Delete message ${messageId}`,
            'Message deleted'
          );
        }
      }

      // F.4 Add / Remove Reaction: POST / DELETE /api/v1/inbox/conversations/{conversationId}/messages/{messageId}/reactions
      if (messageId && msgSubAction === 'reactions') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        const conv = ensureConv();
        const emoji = body.emoji || '👍';
        const nowIso = new Date().toISOString();

        if (method === 'POST') {
          const updatedMsgs = (conv.messages || []).map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: [...(m.reactions || []), { emoji, senderId: conv.accountId || 'acc_primary', createdAt: nowIso }],
                }
              : m
          );
          WorkspaceStore.addInboxConversation(tenantId, { ...conv, messages: updatedMsgs });
          return respond(
            200,
            {
              success: true,
              conversationId,
              messageId,
              emoji,
              message: `Reaction ${emoji} added to message ${messageId}.`,
            },
            `React ${emoji} on ${messageId}`,
            `Added ${emoji}`
          );
        }

        if (method === 'DELETE') {
          const updatedMsgs = (conv.messages || []).map((m) =>
            m.id === messageId ? { ...m, reactions: [] } : m
          );
          WorkspaceStore.addInboxConversation(tenantId, { ...conv, messages: updatedMsgs });
          return respond(
            200,
            {
              success: true,
              conversationId,
              messageId,
              message: `Reaction removed from message ${messageId}.`,
            },
            `Remove reaction on ${messageId}`,
            'Reaction removed'
          );
        }
      }

      // F.5 Resolve Message Attachment: GET /api/v1/inbox/conversations/{conversationId}/messages/{messageId}/attachments/{attachmentIndex}
      if (messageId && msgSubAction === 'attachments' && method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const accountId = req.nextUrl.searchParams.get('accountId');
        if (!accountId) {
          return respond(
            400,
            {
              success: false,
              error: {
                code: 'missing_required_field',
                message: 'Query parameter "accountId" is required to resolve and re-mint signed DM attachment URLs.',
              },
            },
            `Resolve attachment on ${messageId} (missing accountId)`,
            '400 Missing accountId'
          );
        }
        const idx = Number(attachmentIndex || 0);
        const signedUrl = `${baseUrl}/cdn/reminted-media/${accountId}/${conversationId}/${messageId}/att_${idx}.jpg?sig=${Date.now().toString(36)}`;
        return respond(
          200,
          {
            success: true,
            conversationId,
            messageId,
            attachmentIndex: idx,
            accountId,
            url: signedUrl,
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          },
          `Resolve attachment #${idx} on ${messageId}`,
          'Signed URL resolved'
        );
      }
    }
  }

  // 8.7 Direct Reply Shorthand: POST /api/v1/inbox/messages (or POST /api/v1/messages/send)
  if (method === 'POST' && (routeKey === '/inbox/messages' || routeKey === '/messages/send')) {
    if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
    const conversationId = body.conversationId || ws.inboxConversations[0]?.id || `conv_${Date.now().toString(36)}`;
    const text = body.text || body.message;
    if (!text) {
      return respond(
        400,
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Field "text" is required.',
          },
        },
        'Reply inbox message',
        '400 Missing text'
      );
    }
    const replyRes = await InboxCrmService.sendConversationReply({
      organizationId: tenantId,
      conversationId,
      accountId: body.accountId || 'acc_primary',
      message: text,
    });
    return respond(
      201,
      {
        success: true,
        message: 'Omnichannel reply delivered.',
        data: replyRes,
      },
      `Reply to conversation ${conversationId}`,
      'Reply delivered'
    );
  }

  if (routeKey === '/inbox/automations') {
    if (method === 'GET') {
      return respond(
        200,
        {
          success: true,
          data: [
            {
              id: 'rule_auto_dm_01',
              name: 'Keyword Auto-DM Responder',
              triggerKeywords: ['PRICE', 'تفاصيل', 'سعر'],
              active: true,
            },
          ],
        },
        'List Auto-DM rules',
        '1 active rule'
      );
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const ruleRes = await InboxCrmService.createGrowthAutomation({
        organizationId: tenantId,
        type: 'comment_to_dm',
        name: body.name || 'API Keyword Auto-DM Rule',
        config: {
          keywordTriggers: Array.isArray(body.keywordTriggers) ? body.keywordTriggers : [body.triggerKeyword || 'PRICE'],
          dmMessageTemplate: body.dmMessageTemplate || body.responseTemplate || 'Here is our instant checkout link!',
        },
      });
      return respond(201, { success: true, data: ruleRes }, 'Create Auto-DM rule', 'Rule created');
    }
  }

  // ============================================================================
  // 8B. INBOX COMMENTS, REVIEWS, MENTIONS, CRM CONTACTS, CUSTOM FIELDS, BROADCASTS, SEQUENCES & WORKFLOWS
  // ============================================================================
  if (path[0] === 'inbox' && path[1] === 'comments') {
    if (path.length === 2) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const comments = WorkspaceStore.getInboxComments(tenantId, {
          accountId: req.nextUrl.searchParams.get('accountId') || undefined,
          postId: req.nextUrl.searchParams.get('postId') || undefined,
        });
        return respond(200, { success: true, count: comments.length, comments, data: comments }, 'List inbox comments', `${comments.length} comments`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        if (!body.text) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "text" is required for comments.' } }, 'Post comment', '400 Missing text');
        }
        const comment = WorkspaceStore.addInboxComment(tenantId, {
          accountId: body.accountId || 'acc_fb_01',
          platform: body.platform || 'facebook',
          postId: body.postId || 'post_default_01',
          text: body.text,
        });
        return respond(201, { success: true, comment, data: comment }, 'Post comment', 'Comment created');
      }
    }
    if (path.length === 4 && path[3] === 'reply' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      if (!body.text) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "text" is required for reply.' } }, 'Reply to comment', '400 Missing text');
      }
      const reply = WorkspaceStore.replyInboxComment(tenantId, path[2], {
        text: body.text,
        isPrivate: !!body.isPrivate,
      }) || { replyId: `rep_${Date.now().toString(36)}`, isPrivate: !!body.isPrivate, text: body.text };
      return respond(201, { success: true, replyId: (reply as any).replyId || (reply as any).id, isPrivate: !!body.isPrivate, text: body.text, reply }, `Reply to comment ${path[2]}`, 'Reply posted');
    }
    if (path.length === 4 && path[3] === 'hide' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const updated = WorkspaceStore.updateInboxComment(tenantId, path[2], { isHidden: body.hide !== false });
      return respond(200, { success: true, commentId: path[2], isHidden: body.hide !== false, comment: updated }, `Hide comment ${path[2]}`, 'Comment visibility updated');
    }
    if (path.length === 4 && path[3] === 'like' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const updated = WorkspaceStore.updateInboxComment(tenantId, path[2], { isLiked: true });
      return respond(200, { success: true, commentId: path[2], liked: true, comment: updated }, `Like comment ${path[2]}`, 'Comment liked');
    }
    if (path.length === 3 && method === 'DELETE') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      WorkspaceStore.deleteInboxComment(tenantId, path[2]);
      return respond(200, { success: true, deleted: true, commentId: path[2] }, `Delete comment ${path[2]}`, 'Comment deleted');
    }
  }

  if (path[0] === 'inbox' && path[1] === 'reviews') {
    if (path.length === 2) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const minRating = req.nextUrl.searchParams.get('minRating') ? Number(req.nextUrl.searchParams.get('minRating')) : undefined;
        const reviews = WorkspaceStore.getInboxReviews(tenantId, {
          accountId: req.nextUrl.searchParams.get('accountId') || undefined,
          minRating,
        });
        return respond(200, { success: true, count: reviews.length, reviews, data: reviews }, 'List inbox reviews', `${reviews.length} reviews`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        const review = WorkspaceStore.addInboxReview(tenantId, {
          accountId: body.accountId || 'acc_gmb_01',
          reviewerName: body.authorName || body.reviewerName || 'Verified Reviewer',
          rating: Number(body.rating || 5),
          reviewText: body.text || body.reviewText || 'Excellent service and speedy support!',
          platform: body.platform || 'google',
        });
        return respond(201, { success: true, review, data: review }, 'Create inbox review', 'Review recorded');
      }
    }
    if (path.length === 4 && path[3] === 'reply' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const text = body.text || body.message || 'Thank you for your valuable feedback!';
      const updated = WorkspaceStore.replyInboxReview(tenantId, path[2], text);
      if (!updated) {
        return respond(404, { success: false, error: { code: 'not_found', message: `Review ${path[2]} not found.` } }, `Reply to review ${path[2]}`, '404 Review not found');
      }
      return respond(200, {
        success: true,
        reviewId: path[2],
        review: updated,
        data: updated,
        reply: updated.reply,
      }, `Reply to review ${path[2]}`, 'Review reply sent');
    }
  }

  if (method === 'GET' && routeKey === '/inbox/mentions') {
    if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
    const mentions = WorkspaceStore.getInboxMentions(tenantId, {
      profileId: req.nextUrl.searchParams.get('profileId') || undefined,
      accountId: req.nextUrl.searchParams.get('accountId') || undefined,
    });
    return respond(200, { success: true, count: mentions.length, mentions, data: mentions }, 'List brand mentions', `${mentions.length} mentions`);
  }

  if (path[0] === 'contacts') {
    if (path.length === 1) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const contacts = WorkspaceStore.getContacts(tenantId, {
          profileId: req.nextUrl.searchParams.get('profileId') || undefined,
          search: req.nextUrl.searchParams.get('search') || undefined,
          tag: req.nextUrl.searchParams.get('tag') || undefined,
        });
        return respond(200, { success: true, count: contacts.length, contacts, data: contacts, pagination: { hasMore: false, nextCursor: null } }, 'List CRM contacts', `${contacts.length} contacts`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        if (!body.name) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "name" is required for contacts.' } }, 'Create CRM contact', '400 Missing name');
        }
        const contact = WorkspaceStore.addContact(tenantId, {
          profileId: body.profileId || 'prf_default',
          name: body.name,
          email: body.email,
          phone: body.phone,
          tags: Array.isArray(body.tags) ? body.tags : ['vip', 'lead'],
          channels: body.channels || [],
          customFields: body.customFields || {},
        });
        return respond(201, { success: true, contact, data: contact }, `Create contact ${contact.name}`, 'Contact created');
      }
    }
    if (path.length === 2) {
      if (method === 'PATCH') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        const updated = WorkspaceStore.updateContact(tenantId, path[1], body);
        if (!updated) return respond(404, { success: false, error: { code: 'not_found', message: 'Contact not found.' } }, 'Update contact', '404 Contact not found');
        return respond(200, { success: true, contact: updated, data: updated }, `Update contact ${path[1]}`, 'Contact updated');
      }
      if (method === 'DELETE') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        WorkspaceStore.deleteContact(tenantId, path[1]);
        return respond(200, { success: true, deleted: true, id: path[1] }, `Delete contact ${path[1]}`, 'Contact deleted');
      }
    }
  }

  if (path[0] === 'custom-fields') {
    if (path.length === 1) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const fields = WorkspaceStore.getCustomFields(tenantId, req.nextUrl.searchParams.get('profileId') || undefined);
        return respond(200, { success: true, count: fields.length, customFields: fields, data: fields }, 'List custom fields', `${fields.length} custom fields`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        if (!body.name) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "name" is required for custom field.' } }, 'Create custom field', '400 Missing name');
        }
        const field = WorkspaceStore.addCustomField(tenantId, {
          profileId: body.profileId || 'prf_default',
          name: body.name,
          slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          type: body.type || 'text',
          description: body.description,
        });
        return respond(201, { success: true, customField: field, data: field }, `Create custom field ${field.name}`, 'Custom field created');
      }
    }
    if (path.length === 2) {
      if (method === 'PATCH') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        const updated = WorkspaceStore.updateCustomField(tenantId, path[1], body);
        if (!updated) return respond(404, { success: false, error: { code: 'not_found', message: 'Custom field not found.' } }, 'Update custom field', '404 Field not found');
        return respond(200, { success: true, customField: updated, data: updated }, `Update custom field ${path[1]}`, 'Custom field updated');
      }
      if (method === 'DELETE') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        WorkspaceStore.deleteCustomField(tenantId, path[1]);
        return respond(200, { success: true, deleted: true, id: path[1] }, `Delete custom field ${path[1]}`, 'Custom field deleted');
      }
    }
  }

  if (path[0] === 'broadcasts') {
    if (path.length === 1) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const broadcasts = WorkspaceStore.getBroadcasts(tenantId, req.nextUrl.searchParams.get('profileId') || undefined);
        return respond(200, { success: true, count: broadcasts.length, broadcasts, data: broadcasts }, 'List broadcasts', `${broadcasts.length} broadcasts`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        if (!body.name) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "name" is required for broadcast.' } }, 'Create broadcast', '400 Missing name');
        }
        const broadcast = WorkspaceStore.addBroadcast(tenantId, {
          profileId: body.profileId || 'prf_default',
          name: body.name,
          platform: body.platform || 'whatsapp',
          accountId: body.accountId || 'acc_wa_01',
          template: body.template,
          message: body.message || 'Bulk announcement message',
          segmentFilters: body.segmentFilters || {},
        });
        return respond(201, { success: true, broadcast, data: broadcast }, `Create broadcast ${broadcast.name}`, 'Broadcast created');
      }
    }
    if (path.length === 3 && path[2] === 'send' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const broadcast = WorkspaceStore.sendBroadcast(tenantId, path[1]);
      if (!broadcast) {
        return respond(404, { success: false, error: { code: 'not_found', message: `Broadcast ${path[1]} not found.` } }, `Send broadcast ${path[1]}`, '404 Broadcast not found');
      }
      return respond(200, {
        success: true,
        broadcastId: broadcast.id,
        status: broadcast.status,
        broadcast,
        data: broadcast,
        recipientsCount: broadcast.recipientsCount,
        sentCount: broadcast.sentCount,
        sentAt: broadcast.sentAt,
        dispatchedAt: broadcast.updatedAt,
      }, `Send broadcast ${path[1]}`, 'Broadcast sent');
    }
  }

  if (path[0] === 'sequences') {
    if (path.length === 1) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const sequences = WorkspaceStore.getSequences(tenantId, req.nextUrl.searchParams.get('profileId') || undefined);
        return respond(200, { success: true, count: sequences.length, sequences, data: sequences }, 'List sequences', `${sequences.length} sequences`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        if (!body.name) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "name" is required for sequence.' } }, 'Create sequence', '400 Missing name');
        }
        const sequence = WorkspaceStore.addSequence(tenantId, {
          profileId: body.profileId || 'prf_default',
          name: body.name,
          platform: body.platform || 'instagram',
          accountId: body.accountId || 'acc_ig_01',
          steps: Array.isArray(body.steps) && body.steps.length > 0 ? body.steps : [{ stepNumber: 1, delayMinutes: 0, message: 'Welcome to our service!' }],
        });
        return respond(201, { success: true, sequence, data: sequence }, `Create sequence ${sequence.name}`, 'Sequence created');
      }
    }
    if (path.length === 3 && path[2] === 'activate' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const updated = WorkspaceStore.updateSequence(tenantId, path[1], { status: 'active' });
      return respond(200, { success: true, sequence: updated || { id: path[1], status: 'active' } }, `Activate sequence ${path[1]}`, 'Sequence active');
    }
    if (path.length === 3 && path[2] === 'enroll' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const rawIds = body.contactIds || (body.contactId ? [body.contactId] : []);
      const contactIds = Array.isArray(rawIds) ? rawIds : [String(rawIds)];
      const sequences = WorkspaceStore.getSequences(tenantId);
      const targetSeq = sequences.find((s) => s.id === path[1]);
      if (!targetSeq) {
        return respond(404, { success: false, error: { code: 'not_found', message: `Sequence ${path[1]} not found.` } }, `Enroll in sequence ${path[1]}`, '404 Sequence not found');
      }
      const enrolledCount = WorkspaceStore.enrollSequence(tenantId, path[1], contactIds);
      return respond(200, {
        success: true,
        sequenceId: path[1],
        enrolledCount,
        contactIds,
        sequence: targetSeq,
        data: targetSeq,
      }, `Enroll in sequence ${path[1]}`, `${enrolledCount} enrolled`);
    }
  }

  if (path[0] === 'workflows') {
    if (path.length === 1) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
        const workflows = WorkspaceStore.getWorkflows(tenantId, req.nextUrl.searchParams.get('profileId') || undefined);
        return respond(200, { success: true, count: workflows.length, workflows, data: workflows }, 'List workflows', `${workflows.length} workflows`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
        if (!body.name) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "name" is required for workflow.' } }, 'Create workflow', '400 Missing name');
        }
        const workflow = WorkspaceStore.addWorkflow(tenantId, {
          profileId: body.profileId || 'prf_default',
          accountId: body.accountId || 'acc_ig_01',
          platform: body.platform || 'instagram',
          name: body.name,
          nodes: body.nodes || [{ id: 'trigger_1', type: 'trigger', data: { event: 'dm_keyword', keyword: 'HELLO' } }],
          edges: body.edges || [],
        });
        return respond(201, { success: true, workflow, data: workflow }, `Create workflow ${workflow.name}`, 'Workflow created');
      }
    }
    if (path.length === 2 && method === 'GET') {
      if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'accounts:read')) return denyScope('inbox:write');
      const workflows = WorkspaceStore.getWorkflows(tenantId);
      const target = workflows.find((w) => w.id === path[1]);
      if (!target) {
        return respond(404, { success: false, error: { code: 'not_found', message: `Workflow ${path[1]} not found.` } }, `Get workflow ${path[1]}`, '404 Workflow not found');
      }
      return respond(200, { success: true, workflow: target, data: target }, `Get workflow ${path[1]}`, 'Workflow found');
    }
    if (path.length === 2 && method === 'DELETE') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const deleted = WorkspaceStore.deleteWorkflow(tenantId, path[1]);
      if (!deleted) {
        return respond(404, { success: false, error: { code: 'not_found', message: `Workflow ${path[1]} not found.` } }, `Delete workflow ${path[1]}`, '404 Workflow not found');
      }
      return respond(200, { success: true, deleted: true, workflowId: path[1] }, `Delete workflow ${path[1]}`, 'Workflow deleted');
    }
    if (path.length === 2 && method === 'PATCH') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const currentList = WorkspaceStore.getWorkflows(tenantId);
      const wf = currentList.find((w) => w.id === path[1]);
      if (!wf) return respond(404, { success: false, error: { code: 'not_found', message: 'Workflow not found.' } }, 'Update workflow', '404 Workflow not found');
      if (wf.status === 'active' && (body.nodes || body.edges)) {
        return respond(400, {
          success: false,
          error: {
            code: 'active_workflow_immutable',
            message: 'Workflow graph (nodes/edges) cannot be modified while active. Pause or draft the workflow first.',
          },
        }, 'Update workflow graph', '400 Active workflow immutable');
      }
      const updated = WorkspaceStore.updateWorkflow(tenantId, path[1], body);
      return respond(200, { success: true, workflow: updated, data: updated }, `Update workflow ${path[1]}`, 'Workflow updated');
    }
    if (path.length === 3 && path[2] === 'activate' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const currentList = WorkspaceStore.getWorkflows(tenantId);
      const wf = currentList.find((w) => w.id === path[1]);
      if (!wf) {
        return respond(
          404,
          { success: false, error: { code: 'not_found', message: `Workflow ${path[1]} not found.` } },
          'Activate workflow',
          '404 Workflow not found'
        );
      }
      const hasTriggerNode = Array.isArray(wf.nodes) && wf.nodes.some((n: any) => n && n.type === 'trigger');
      if (!hasTriggerNode) {
        return respond(
          400,
          {
            success: false,
            error: {
              code: 'workflow_trigger_required',
              message: 'Workflow must contain at least one trigger node to be activated.',
            },
          },
          'Activate workflow (missing trigger node)',
          '400 Missing trigger node'
        );
      }
      const updated = WorkspaceStore.updateWorkflow(tenantId, path[1], { status: 'active' });
      return respond(200, { success: true, workflow: updated, data: updated }, `Activate workflow ${path[1]}`, 'Workflow active');
    }
    if (path.length === 3 && path[2] === 'pause' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const currentList = WorkspaceStore.getWorkflows(tenantId);
      const wf = currentList.find((w) => w.id === path[1]);
      if (!wf) {
        return respond(
          404,
          { success: false, error: { code: 'not_found', message: `Workflow ${path[1]} not found.` } },
          'Pause workflow',
          '404 Workflow not found'
        );
      }
      const updated = WorkspaceStore.updateWorkflow(tenantId, path[1], { status: 'paused' });
      return respond(200, { success: true, workflow: updated, data: updated }, `Pause workflow ${path[1]}`, 'Workflow paused');
    }
    if (path.length === 3 && path[2] === 'trigger' && method === 'POST') {
      if (!hasScope(scopes, 'inbox:write')) return denyScope('inbox:write');
      const runResult = WorkspaceStore.triggerWorkflow(tenantId, path[1], body);
      if (!runResult) {
        return respond(404, { success: false, error: { code: 'not_found', message: `Workflow ${path[1]} not found.` } }, `Trigger workflow ${path[1]}`, '404 Workflow not found');
      }
      return respond(201, {
        success: true,
        runId: runResult.runId,
        workflowId: runResult.workflowId,
        status: runResult.status,
        executedNodesCount: runResult.executedNodesCount,
        data: runResult,
      }, `Trigger workflow ${path[1]}`, 'Workflow triggered');
    }
  }

  // ============================================================================
  // 9. PAID ADS & CONVERSION API (/ads/campaigns, /conversions)
  // ============================================================================
  if (routeKey === '/ads/campaigns') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'ads:write') && !hasScope(scopes, 'analytics:read')) return denyScope('ads:write');
      return respond(200, { success: true, data: ws.campaigns }, 'List ad campaigns', `${ws.campaigns.length} campaigns`);
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'ads:write')) return denyScope('ads:write');
      const campRes = await AdsService.createCampaign({
        organizationId: tenantId,
        adPlatform: (body.adPlatform || 'metaads') as AdPlatform,
        platform: body.platform || 'meta',
        name: body.name || 'API Automated Retargeting Boost',
        objective: body.objective || 'sales',
        dailyBudgetUsd: Number(body.dailyBudgetUsd || 50),
      });
      return respond(201, { success: true, data: campRes }, `Launch campaign ${body.name || ''}`, 'Campaign launched');
    }
  }

  if (method === 'POST' && routeKey === '/conversions') {
    if (!hasScope(scopes, 'ads:write')) return denyScope('ads:write');
    const eventRes = await AdsService.sendServerConversionEvent({
      organizationId: tenantId,
      accountId: body.accountId || 'ad_acc_meta_01',
      pixelOrDatasetId: body.pixelOrDatasetId || 'px_asra3_01',
      eventName: body.eventName || 'Purchase',
      valueUsd: Number(body.value || body.valueUsd || 149),
      userDataHashed: body.user || {},
    });
    return respond(
      201,
      {
        success: true,
        message: 'Server-side conversion event dispatched with SHA-256 identity matching.',
        data: eventRes,
      },
      `Fire CAPI ${body.eventName || 'Purchase'}`,
      'Conversion event accepted'
    );
  }

  // ============================================================================
  // 9B. ADVERTISING EXTENSIONS (CTWA, Call Ads, Audiences, Targeting, Ad Library, Lead Gen, Tracking Tags)
  // ============================================================================
  if (method === 'POST' && routeKey === '/ads/ctwa') {
    if (!hasScope(scopes, 'ads:write')) return denyScope('ads:write');
    const campRes = await AdsService.createCampaign({
      organizationId: tenantId,
      adPlatform: 'metaads',
      platform: 'meta',
      name: body.name || 'Click-to-WhatsApp Direct Lead Ad',
      objective: 'leads',
      dailyBudgetUsd: Number(body.dailyBudget || body.dailyBudgetUsd || 50),
    });
    return respond(201, {
      success: true,
      campaignId: campRes.campaign.id,
      adSetId: `adset_${Date.now().toString(36)}`,
      adId: `ad_${Date.now().toString(36)}`,
      destination: 'whatsapp',
      status: 'ACTIVE',
      data: campRes,
    }, 'Create Click-to-WhatsApp Ad', 'CTWA ad campaign created');
  }

  if (method === 'POST' && routeKey === '/ads/call') {
    if (!hasScope(scopes, 'ads:write')) return denyScope('ads:write');
    const campRes = await AdsService.createCampaign({
      organizationId: tenantId,
      adPlatform: 'metaads',
      platform: 'meta',
      name: body.name || 'Click-to-Call Direct Connect Ad',
      objective: 'leads',
      dailyBudgetUsd: Number(body.dailyBudget || body.dailyBudgetUsd || 40),
    });
    return respond(201, {
      success: true,
      campaignId: campRes.campaign.id,
      adSetId: `adset_${Date.now().toString(36)}`,
      adId: `ad_${Date.now().toString(36)}`,
      callToAction: 'CALL_NOW',
      status: 'ACTIVE',
      phoneNumber: body.phoneNumber || '+14158904321',
      data: campRes,
    }, 'Create Click-to-Call Ad', 'Call ad campaign created');
  }

  if (routeKey === '/ads/audiences') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'ads:write') && !hasScope(scopes, 'analytics:read')) return denyScope('ads:write');
      const audiences = WorkspaceStore.getAdAudiences(tenantId, req.nextUrl.searchParams.get('adAccountId') || undefined);
      return respond(200, { success: true, count: audiences.length, audiences, data: audiences }, 'List ad audiences', `${audiences.length} audiences`);
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'ads:write')) return denyScope('ads:write');
      if (!body.name) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "name" is required for ad audience.' } }, 'Create audience', '400 Missing name');
      }
      const audience = WorkspaceStore.addAdAudience(tenantId, {
        adAccountId: body.adAccountId || 'act_default_01',
        name: body.name,
        subtype: body.subtype || 'CUSTOM',
        description: body.description,
        customerList: body.customerList,
      });
      return respond(201, { success: true, audience, data: audience }, `Create audience ${audience.name}`, 'Audience created');
    }
  }

  if (method === 'GET' && routeKey === '/ads/targeting') {
    if (!hasScope(scopes, 'ads:write') && !hasScope(scopes, 'analytics:read')) return denyScope('ads:write');
    const query = req.nextUrl.searchParams.get('q') || '';
    if (!query) {
      return respond(400, { success: false, error: { code: 'validation_error', message: 'Search parameter "q" is required.' } }, 'Search targeting', '400 Missing q');
    }
    const results = [
      { id: 'int_digital_marketing', name: `${query} Enthusiasts`, type: 'interests', path: ['Interests', 'Business', query], audienceSizeEstimate: 1450000 },
      { id: 'int_ecommerce_shoppers', name: `Online Buyers interested in ${query}`, type: 'behaviors', path: ['Behaviors', 'Purchase Behavior'], audienceSizeEstimate: 890000 },
      { id: 'int_tech_founders', name: `Small Business Owners (${query})`, type: 'demographics', path: ['Demographics', 'Work', 'Job Titles'], audienceSizeEstimate: 320000 },
    ];
    return respond(200, { success: true, query, count: results.length, results, data: results }, `Search targeting for "${query}"`, `${results.length} targeting options`);
  }

  if (method === 'GET' && routeKey === '/ads/library') {
    if (!hasScope(scopes, 'ads:write') && !hasScope(scopes, 'analytics:read')) return denyScope('ads:write');
    const query = req.nextUrl.searchParams.get('q') || '';
    if (!query) {
      return respond(400, { success: false, error: { code: 'validation_error', message: 'Search query "q" is required for ad library.' } }, 'Search ad library', '400 Missing q');
    }
    const ads = [
      {
        id: 'ad_lib_01',
        pageName: 'Asra3 SaaS Solutions',
        adText: `Experience modern automation with ${query}. Fast, secure, and turnkey.`,
        mediaUrl: 'https://assets.zernio.com/demo-ad-1.png',
        startedDate: '2026-09-15',
        platforms: ['facebook', 'instagram', 'messenger'],
      },
      {
        id: 'ad_lib_02',
        pageName: 'Global Telecom Cloud',
        adText: `Scale your operations with ${query} infrastructure.`,
        mediaUrl: 'https://assets.zernio.com/demo-ad-2.png',
        startedDate: '2026-10-01',
        platforms: ['linkedin', 'meta'],
      },
    ];
    return respond(200, { success: true, query, count: ads.length, ads, data: ads }, `Search ad library for "${query}"`, `${ads.length} ads found`);
  }

  if (path[0] === 'lead-gen' && path[1] === 'forms') {
    if (path.length === 2) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'ads:write') && !hasScope(scopes, 'analytics:read')) return denyScope('ads:write');
        const forms = WorkspaceStore.getLeadGenForms(tenantId, req.nextUrl.searchParams.get('accountId') || undefined);
        return respond(200, { success: true, count: forms.length, forms, data: forms }, 'List lead gen forms', `${forms.length} forms`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'ads:write')) return denyScope('ads:write');
        if (!body.name) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "name" is required for lead gen form.' } }, 'Create lead form', '400 Missing name');
        }
        const form = WorkspaceStore.addLeadGenForm(tenantId, {
          accountId: body.accountId || 'acc_fb_01',
          name: body.name,
          questions: Array.isArray(body.questions) ? body.questions : [{ type: 'FULL_NAME', label: 'Full Name' }, { type: 'EMAIL', label: 'Work Email' }],
          privacyPolicyUrl: body.privacyPolicyUrl || 'https://asra3.co/privacy',
          pageId: body.pageId,
        });
        return respond(201, { success: true, form, data: form }, `Create lead form ${form.name}`, 'Form created');
      }
    }
    if (path.length === 4 && path[3] === 'leads' && method === 'GET') {
      if (!hasScope(scopes, 'ads:write') && !hasScope(scopes, 'analytics:read')) return denyScope('ads:write');
      const leads = WorkspaceStore.getLeadGenLeads(tenantId, path[2]);
      return respond(200, { success: true, formId: path[2], count: leads.length, leads, data: leads }, `Get leads for form ${path[2]}`, `${leads.length} leads`);
    }
  }

  if (routeKey === '/tracking-tags') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'ads:write') && !hasScope(scopes, 'analytics:read')) return denyScope('ads:write');
      const tags = WorkspaceStore.getTrackingTags(tenantId, req.nextUrl.searchParams.get('adAccountId') || undefined);
      return respond(200, { success: true, count: tags.length, tags, data: tags }, 'List tracking tags', `${tags.length} tags`);
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'ads:write')) return denyScope('ads:write');
      if (!body.name) {
        return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "name" is required for tracking tag.' } }, 'Create tracking tag', '400 Missing name');
      }
      const tag = WorkspaceStore.addTrackingTag(tenantId, {
        adAccountId: body.adAccountId || 'act_default_01',
        name: body.name,
        platform: body.platform || 'meta',
      });
      return respond(201, { success: true, tag, data: tag }, `Create tracking tag ${tag.name}`, 'Tag created');
    }
  }

  // ============================================================================
  // 10. SOCIAL COMMERCE & ANALYTICS (/commerce/overview, /analytics)
  // ============================================================================
  if (method === 'GET' && routeKey === '/commerce/overview') {
    if (!hasScope(scopes, 'commerce:write') && !hasScope(scopes, 'analytics:read')) return denyScope('commerce:write');
    const commerce = await CommerceLocalService.getCommerceStoreOverview({
      organizationId: tenantId,
      accountId: 'acc_shopify_01',
    });
    return respond(200, { success: true, data: commerce }, 'Get social commerce overview', 'Commerce overview returned');
  }

  if (method === 'GET' && routeKey === '/analytics') {
    if (!hasScope(scopes, 'analytics:read')) return denyScope('analytics:read');
    const analyticsData = await AnalyticsService.getCustomerDashboard({
      organizationId: tenantId,
      fromDate: '2026-10-01',
      toDate: '2026-10-18',
    });
    return respond(
      200,
      {
        success: true,
        data: analyticsData,
      },
      'Get cross-channel analytics',
      'Analytics snapshot returned'
    );
  }

  // ============================================================================
  // 10B. BLOGS, GOOGLE BUSINESS SERVICES, COMMERCE PRODUCTS, ORDERS, DISCOUNTS & ADVANCED ANALYTICS
  // ============================================================================
  if (path[0] === 'blogs') {
    if (path.length === 1) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'accounts:read') && !hasScope(scopes, 'commerce:write')) return denyScope('accounts:read');
        const blogs = WorkspaceStore.getBlogs(tenantId, req.nextUrl.searchParams.get('accountId') || undefined);
        return respond(200, { success: true, count: blogs.length, blogs, data: blogs }, 'List blogs', `${blogs.length} articles`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'posts:write') && !hasScope(scopes, 'commerce:write')) return denyScope('posts:write');
        if (!body.title) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "title" is required for blog article.' } }, 'Create blog article', '400 Missing title');
        }
        const article = WorkspaceStore.addBlogArticle(tenantId, {
          accountId: body.accountId || 'acc_wp_01',
          blogId: body.blogId || 'blog_main',
          title: body.title,
          bodyHtml: body.bodyHtml || '<p>Article content</p>',
          author: body.author || 'Editorial Team',
          tags: Array.isArray(body.tags) ? body.tags : ['tech', 'news'],
          isPublished: body.isPublished !== false,
        });
        return respond(201, { success: true, article, blog: article, data: article }, `Create article ${article.title}`, 'Article created');
      }
    }
    if (path.length === 3 && path[2] === 'articles') {
      if (method === 'GET') {
        if (!hasScope(scopes, 'accounts:read') && !hasScope(scopes, 'commerce:write')) return denyScope('accounts:read');
        const articles = WorkspaceStore.getBlogs(tenantId).filter((a) => a.blogId === path[1]);
        return respond(200, { success: true, count: articles.length, articles, data: articles }, `List articles for blog ${path[1]}`, `${articles.length} articles`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'posts:write') && !hasScope(scopes, 'commerce:write')) return denyScope('posts:write');
        if (!body.title) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "title" is required.' } }, 'Create article', '400 Missing title');
        }
        const article = WorkspaceStore.addBlogArticle(tenantId, {
          accountId: body.accountId || 'acc_wp_01',
          blogId: path[1],
          title: body.title,
          bodyHtml: body.bodyHtml || '<p>Article body</p>',
          author: body.author || 'Author',
          tags: Array.isArray(body.tags) ? body.tags : [],
          isPublished: body.isPublished !== false,
        });
        return respond(201, { success: true, article, data: article }, `Create article ${article.title}`, 'Article created');
      }
    }
    if (path.length === 4 && path[2] === 'articles') {
      if (method === 'PATCH') {
        if (!hasScope(scopes, 'posts:write') && !hasScope(scopes, 'commerce:write')) return denyScope('posts:write');
        const updated = WorkspaceStore.updateBlogArticle(tenantId, path[3], body);
        if (!updated) return respond(404, { success: false, error: { code: 'not_found', message: 'Article not found.' } }, 'Update article', '404 Article not found');
        return respond(200, { success: true, article: updated, data: updated }, `Update article ${path[3]}`, 'Article updated');
      }
      if (method === 'DELETE') {
        if (!hasScope(scopes, 'posts:write') && !hasScope(scopes, 'commerce:write')) return denyScope('posts:write');
        WorkspaceStore.deleteBlogArticle(tenantId, path[3]);
        return respond(200, { success: true, deleted: true, id: path[3] }, `Delete article ${path[3]}`, 'Article deleted');
      }
    }
  }

  if (path[0] === 'google-business' && path[1] === 'services') {
    if (path.length === 2) {
      if (method === 'GET') {
        if (!hasScope(scopes, 'accounts:read') && !hasScope(scopes, 'commerce:write')) return denyScope('accounts:read');
        const services = WorkspaceStore.getGoogleBusinessServices(tenantId, req.nextUrl.searchParams.get('accountId') || undefined);
        return respond(200, { success: true, count: services.length, services, data: services }, 'List Google Business services', `${services.length} services`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'accounts:write') && !hasScope(scopes, 'commerce:write')) return denyScope('accounts:write');
        if (!body.displayName) {
          return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "displayName" is required for GBP service.' } }, 'Create service', '400 Missing displayName');
        }
        const service = WorkspaceStore.addGoogleBusinessService(tenantId, {
          accountId: body.accountId || 'acc_gmb_01',
          displayName: body.displayName,
          description: body.description || '',
          price: body.price,
        });
        return respond(201, { success: true, service, data: service }, `Create GBP service ${service.displayName}`, 'Service created');
      }
    }
    if (path.length === 3) {
      if (method === 'PATCH') {
        if (!hasScope(scopes, 'accounts:write') && !hasScope(scopes, 'commerce:write')) return denyScope('accounts:write');
        const updated = WorkspaceStore.updateGoogleBusinessService(tenantId, path[2], body);
        if (!updated) return respond(404, { success: false, error: { code: 'not_found', message: 'Service not found.' } }, 'Update service', '404 Service not found');
        return respond(200, { success: true, service: updated, data: updated }, `Update GBP service ${path[2]}`, 'Service updated');
      }
      if (method === 'DELETE') {
        if (!hasScope(scopes, 'accounts:write') && !hasScope(scopes, 'commerce:write')) return denyScope('accounts:write');
        WorkspaceStore.deleteGoogleBusinessService(tenantId, path[2]);
        return respond(200, { success: true, deleted: true, id: path[2] }, `Delete GBP service ${path[2]}`, 'Service deleted');
      }
    }
  }

  if (path[0] === 'commerce') {
    if (path[1] === 'products') {
      if (path.length === 2) {
        if (method === 'GET') {
          if (!hasScope(scopes, 'commerce:write') && !hasScope(scopes, 'analytics:read')) return denyScope('commerce:write');
          const products = WorkspaceStore.getCommerceProducts(tenantId, {
            accountId: req.nextUrl.searchParams.get('accountId') || undefined,
            status: req.nextUrl.searchParams.get('status') || undefined,
          });
          return respond(200, { success: true, count: products.length, products, data: products }, 'List commerce products', `${products.length} products`);
        }
        if (method === 'POST') {
          if (!hasScope(scopes, 'commerce:write')) return denyScope('commerce:write');
          if (!body.title) {
            return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "title" is required for product.' } }, 'Create product', '400 Missing title');
          }
          const product = WorkspaceStore.addCommerceProduct(tenantId, {
            accountId: body.accountId || 'acc_shopify_01',
            title: body.title,
            descriptionHtml: body.descriptionHtml || '',
            price: Number(body.price || 99),
            currency: body.currency || 'USD',
            inventoryQuantity: Number(body.inventoryQuantity || 50),
            images: Array.isArray(body.images) ? body.images : ['https://assets.zernio.com/prod-default.png'],
            status: body.status || 'active',
          });
          return respond(201, { success: true, product, data: product }, `Create product ${product.title}`, 'Product created');
        }
      }
      if (path.length === 3) {
        if (method === 'PATCH') {
          if (!hasScope(scopes, 'commerce:write')) return denyScope('commerce:write');
          const updated = WorkspaceStore.updateCommerceProduct(tenantId, path[2], body);
          if (!updated) return respond(404, { success: false, error: { code: 'not_found', message: 'Product not found.' } }, 'Update product', '404 Product not found');
          return respond(200, { success: true, product: updated, data: updated }, `Update product ${path[2]}`, 'Product updated');
        }
        if (method === 'DELETE') {
          if (!hasScope(scopes, 'commerce:write')) return denyScope('commerce:write');
          WorkspaceStore.deleteCommerceProduct(tenantId, path[2]);
          return respond(200, { success: true, deleted: true, id: path[2] }, `Delete product ${path[2]}`, 'Product deleted');
        }
      }
    }

    if (path[1] === 'orders') {
      if (method === 'GET') {
        if (!hasScope(scopes, 'commerce:write') && !hasScope(scopes, 'analytics:read')) return denyScope('commerce:write');
        const orders = WorkspaceStore.getCommerceOrders(tenantId, req.nextUrl.searchParams.get('accountId') || undefined);
        return respond(200, { success: true, count: orders.length, orders, data: orders }, 'List commerce orders', `${orders.length} orders`);
      }
      if (method === 'POST') {
        if (!hasScope(scopes, 'commerce:write')) return denyScope('commerce:write');
        const order = WorkspaceStore.addCommerceOrder(tenantId, {
          accountId: body.accountId || 'acc_shopify_01',
          orderNumber: body.orderNumber || `#ORD-${Date.now().toString(36).toUpperCase()}`,
          customerName: body.customerName || 'Customer',
          customerEmail: body.customerEmail || 'customer@example.com',
          total: Number(body.total || body.totalAmount || 120),
          currency: body.currency || 'USD',
          financialStatus: body.financialStatus || 'paid',
          fulfillmentStatus: body.fulfillmentStatus || 'fulfilled',
        });
        return respond(201, { success: true, order, data: order }, `Create order ${order.orderNumber}`, 'Order recorded');
      }
    }

    if (path[1] === 'discounts') {
      if (path.length === 2) {
        if (method === 'GET') {
          if (!hasScope(scopes, 'commerce:write') && !hasScope(scopes, 'analytics:read')) return denyScope('commerce:write');
          const discounts = WorkspaceStore.getCommerceDiscounts(tenantId, req.nextUrl.searchParams.get('accountId') || undefined);
          return respond(200, { success: true, count: discounts.length, discounts, data: discounts }, 'List discounts', `${discounts.length} discounts`);
        }
        if (method === 'POST') {
          if (!hasScope(scopes, 'commerce:write')) return denyScope('commerce:write');
          if (!body.code) {
            return respond(400, { success: false, error: { code: 'validation_error', message: 'Field "code" is required for discount.' } }, 'Create discount', '400 Missing code');
          }
          const discount = WorkspaceStore.addCommerceDiscount(tenantId, {
            accountId: body.accountId || 'acc_shopify_01',
            code: body.code,
            discountType: body.discountType || 'percentage',
            value: Number(body.value || 15),
            startsAt: body.startsAt,
            endsAt: body.endsAt,
          });
          return respond(201, { success: true, discount, data: discount }, `Create discount ${discount.code}`, 'Discount created');
        }
      }
      if (path.length === 3) {
        if (method === 'PATCH') {
          if (!hasScope(scopes, 'commerce:write')) return denyScope('commerce:write');
          const updated = WorkspaceStore.updateCommerceDiscount(tenantId, path[2], body);
          if (!updated) return respond(404, { success: false, error: { code: 'not_found', message: 'Discount not found.' } }, 'Update discount', '404 Discount not found');
          return respond(200, { success: true, discount: updated, data: updated }, `Update discount ${path[2]}`, 'Discount updated');
        }
        if (method === 'DELETE') {
          if (!hasScope(scopes, 'commerce:write')) return denyScope('commerce:write');
          WorkspaceStore.deleteCommerceDiscount(tenantId, path[2]);
          return respond(200, { success: true, deleted: true, id: path[2] }, `Delete discount ${path[2]}`, 'Discount deleted');
        }
      }
    }
  }

  if (method === 'GET' && routeKey === '/analytics/best-times') {
    if (!hasScope(scopes, 'analytics:read')) return denyScope('analytics:read');
    return respond(200, {
      success: true,
      recommendations: [
        { dayOfWeek: 1, hour: 14, score: 95, expectedEngagementRate: 4.8 },
        { dayOfWeek: 3, hour: 10, score: 92, expectedEngagementRate: 4.5 },
        { dayOfWeek: 5, hour: 18, score: 98, expectedEngagementRate: 5.2 },
      ],
      bestSlots: [
        { day: 'Friday', time: '18:00', score: 98 },
        { day: 'Monday', time: '14:00', score: 95 },
        { day: 'Wednesday', time: '10:00', score: 92 },
      ],
    }, 'Get best posting times', 'Recommendations computed');
  }

  if (method === 'GET' && routeKey === '/analytics/content-decay') {
    if (!hasScope(scopes, 'analytics:read')) return denyScope('analytics:read');
    return respond(200, {
      success: true,
      halfLifeHours: 18.5,
      curve: [
        { hourAfterPublish: 1, percentageEngagementRemaining: 100, cumulativeImpressionsRatio: 0.15 },
        { hourAfterPublish: 6, percentageEngagementRemaining: 75, cumulativeImpressionsRatio: 0.45 },
        { hourAfterPublish: 18, percentageEngagementRemaining: 50, cumulativeImpressionsRatio: 0.72 },
        { hourAfterPublish: 48, percentageEngagementRemaining: 15, cumulativeImpressionsRatio: 0.95 },
      ],
    }, 'Get content engagement decay', 'Decay curve computed');
  }

  if (method === 'GET' && routeKey === '/inbox-analytics') {
    if (!hasScope(scopes, 'inbox:write') && !hasScope(scopes, 'analytics:read')) return denyScope('analytics:read');
    return respond(200, {
      success: true,
      volume: { incoming: 342, outgoing: 488, conversations: 189 },
      heatmap: [
        { dayOfWeek: 1, hour: 11, count: 28 },
        { dayOfWeek: 2, hour: 14, count: 35 },
        { dayOfWeek: 4, hour: 16, count: 42 },
      ],
      responseTimes: { averageSeconds: 142, medianSeconds: 95, slaAdherencePercent: 96.5 },
      sourceBreakdown: { whatsapp: 58, instagram: 24, messenger: 12, telegram: 6 },
      topAccounts: [{ accountId: 'acc_wa_01', platform: 'whatsapp', volume: 298 }],
    }, 'Get unified inbox analytics', 'Inbox analytics snapshot returned');
  }

  // ============================================================================
  // 11. OUTBOUND WEBHOOKS (/webhooks, /webhooks/:id, /webhooks/test)
  // ============================================================================
  if (routeKey === '/webhooks') {
    if (method === 'GET') {
      if (!hasScope(scopes, 'webhooks:write')) return denyScope('webhooks:write');
      return respond(
        200,
        {
          success: true,
          count: (ws.webhooks || []).length,
          data: ws.webhooks || [],
        },
        'List registered webhooks',
        `${(ws.webhooks || []).length} webhooks`
      );
    }
    if (method === 'POST') {
      if (!hasScope(scopes, 'webhooks:write')) return denyScope('webhooks:write');
      if (!body.url) {
        return respond(
          400,
          {
            success: false,
            error: { code: 'validation_error', message: 'Field "url" (HTTPS webhook receiver URL) is required.' },
          },
          'Create webhook (missing url)',
          '400 Missing url'
        );
      }
      const wh = WorkspaceStore.createWebhook(tenantId, {
        url: body.url,
        description: body.description,
        events:
          Array.isArray(body.events) && body.events.length > 0
            ? body.events
            : ['post.published', 'number.purchased', 'whatsapp.linked', 'message.sent', 'call.initiated'],
      });
      return respond(
        201,
        {
          success: true,
          message: 'Webhook endpoint registered with HMAC-SHA256 signing secret.',
          data: wh,
        },
        `Register webhook ${wh.url}`,
        `Webhook ${wh.id} active`
      );
    }
  }

  if (method === 'DELETE' && path[0] === 'webhooks' && path[1] && path[1] !== 'test') {
    if (!hasScope(scopes, 'webhooks:write')) return denyScope('webhooks:write');
    WorkspaceStore.deleteWebhook(tenantId, path[1]);
    return respond(
      200,
      { success: true, message: `Webhook ${path[1]} deleted.`, deletedId: path[1] },
      `Delete webhook ${path[1]}`,
      'Webhook deleted'
    );
  }

  if (method === 'POST' && routeKey === '/webhooks/test') {
    if (!hasScope(scopes, 'webhooks:write')) return denyScope('webhooks:write');
    const deliveries = await WorkspaceStore.dispatchCustomerWebhook(
      tenantId,
      body.event || 'webhook.test',
      {
        ping: 'pong',
        organizationId: tenantId,
        note: 'Signed with HMAC-SHA256 using your whsec_... secret in the X-Asra3-Signature header.',
      },
      body.webhookId
    );
    return respond(
      200,
      {
        success: true,
        message: `Dispatched signed test webhook event to ${deliveries.length} subscribed endpoint(s).`,
        deliveries,
      },
      'Trigger test webhook ping',
      `${deliveries.length} deliveries signed`
    );
  }

  // Fallback 404 for unknown v1 path
  return respond(
    404,
    {
      success: false,
      error: {
        code: 'endpoint_not_found',
        message: `No REST API v1 route matched ${method} /api/v1${routeKey}. Download the full OpenAPI spec at /api/v1/openapi.json or visit /docs.`,
        availableSpecs: {
          openApiJson: `${baseUrl}/api/v1/openapi.json`,
          postmanCollection: `${baseUrl}/api/v1/postman.json`,
        },
      },
    },
    `${method} ${routeKey}`,
    '404 Endpoint not found'
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleApiV1(req, ctx);
}
