/**
 * Zernio REST API v1 — OpenAPI 3.1.0 & Postman 2.1.0 Specification Module
 * File: src/lib/zernio/openapi-spec.ts
 *
 * OpenAPI 3.1.0 resource catalog and Postman examples across 8 families.
 * Availability and local verification are scoped to the documented phase:
 * 1. Core & Social Connect
 * 2. Publishing & Queue
 * 3. Unified Inbox & CRM
 * 4. Analytics & Insights
 * 5. Advertising (8 Networks)
 * 6. Platform APIs (Blogs & Commerce)
 * 7. Cloud Telephony & Voice
 * 8. Settings & Administration
 */

export interface OpenApiV1Document {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact: { name: string; url: string; email?: string };
    license?: { name: string; url: string };
  };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  components: {
    securitySchemes: Record<string, any>;
    schemas: Record<string, any>;
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
  };
  security: Array<Record<string, string[]>>;
  paths: Record<string, any>;
}

export function getOpenApiV1Spec(baseUrl: string): OpenApiV1Document {
  const conversationParam = { name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } };
  const broadcastParam = { name: 'broadcastId', in: 'path', required: true, schema: { type: 'string' } };
  const accountQuery = { name: 'accountId', in: 'query', required: true, schema: { type: 'string' }, description: 'Connected WhatsApp account owned by the authenticated workspace.' };
  const inboxAccountQuery = { ...accountQuery, description: 'Connected Facebook, Instagram or WhatsApp account owned by the authenticated workspace. Messenger uses the Facebook Page account.' };
  const retryHeader = { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', maxLength: 200 }, description: 'Stable key per send or draft creation. Message sends retain successful responses for 24 hours. A timeout or 5xx can still follow platform acceptance; review message history before another send. Empty history is inconclusive and retrying can duplicate a message.' };
  const errors = { '400': { description: 'Invalid input, missing account/key, or ineligible draft/template' }, '401': { description: 'Authentication required' }, '403': { description: 'Workspace/account/scope access denied' }, '404': { description: 'Conversation or broadcast not owned by selected account' }, '409': { description: 'Reconnect account or provider eligibility conflict' }, '429': { description: 'Provider rate limit' }, '501': { description: 'Non-WhatsApp or advanced operation unavailable' }, '502': { description: 'Malformed provider response; outcome may be uncertain' }, '503': { description: 'Provider or workspace verification unavailable' }, '504': { description: 'Provider timeout; outcome may be unknown, preserve the original intent key' } };
  const sendBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId'], description: 'Provide conversationId XOR recipient. Send text and/or one public HTTPS attachment, or a template separately. Text/media require the 24-hour service window. Provider checks template approval and permissions.', properties: { accountId: { type: 'string' }, conversationId: { type: 'string' }, recipient: { type: 'string', description: 'International phone number for a new conversation' }, text: { type: 'string' }, attachments: { type: 'array', maxItems: 1, items: { type: 'object', required: ['url', 'type'], properties: { url: { type: 'string', format: 'uri', pattern: '^https://' }, type: { enum: ['image', 'video', 'audio', 'file'] }, name: { type: 'string' } } } }, template: { type: 'object', required: ['name', 'language'], properties: { name: { type: 'string' }, language: { type: 'string' }, parameters: { type: 'array', items: { type: 'string' } }, components: { type: 'array', description: 'Existing conversation send-shape components', items: { type: 'object' } }, headerMedia: { type: 'object', description: 'New recipient only: {type:image|video|document,link or id,filename?}' } } } }, oneOf: [{ required: ['conversationId'], not: { required: ['recipient'] } }, { required: ['recipient'], not: { required: ['conversationId'] } }] }, example: { accountId: 'owned_whatsapp_account', conversationId: 'provider_conversation_id', text: 'Hello from Asra3' } } } };
  const sendOperation = { tags: ['Cloud Telephony & Voice'], summary: 'Send WhatsApp text, media, or approved template', parameters: [retryHeader], requestBody: sendBody, responses: { '200': { description: 'Provider acknowledgment; delivery/read require receipts' }, '201': { description: 'Provider accepted message; delivery remains unconfirmed' }, ...errors } };
  const unavailable = { tags: ['Cloud Telephony & Voice'], summary: 'Unavailable in this phase', responses: { '501': { description: 'No implemented provider flow' } } };
  const metaAccountQuery = { ...accountQuery, description: 'Owned connected Facebook Page or Instagram professional account.' };
  const postParam = { name: 'postId', in: 'path', required: true, schema: { type: 'string' }, description: 'Native platform post ID returned by GET /inbox/comments, not a publishing record ID.' };
  const commentParam = { name: 'commentId', in: 'path', required: true, schema: { type: 'string' } };
  const commentKey = { ...retryHeader, description: 'Stable intent key, 1–200 characters, required for public and private replies. JSON idempotencyKey is an alias. After uncertainty reconcile first; private replies must never retry automatically.' };
  const pageParams = [{ name: 'cursor', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }];
  const metaErrors = { ...errors, '400': { description: 'Invalid fields, locale/menu shape, unsupported account platform or login method' }, '404': { description: 'Post, comment or conversation not owned by the selected account' }, '409': { description: 'Reconnect, provider eligibility or thread-owner conflict' }, '501': { description: 'Unsupported operation or legacy alias' }, '503': { description: 'Provider/account verification unavailable or bounded ownership scan incomplete; no mutation sent when ownership is incomplete' } };
  const commentBody = (target: boolean) => ({ required: true, content: { 'application/json': { schema: { type: 'object', required: target ? ['accountId', 'commentId', 'message'] : ['accountId', 'message'], properties: { accountId: { type: 'string' }, ...(target ? { commentId: { type: 'string' } } : {}), message: { type: 'string', minLength: 1, description: 'Plain text only; text is an alias.' } } } } } });
  const threadControl = { tags: ['Unified Inbox & CRM'], summary: 'Request provider thread control for an owned Meta conversation', description: 'Requires inbox:write. pass requires targetAppId. take/request on Instagram require Facebook Login and a linked Page; provider primary-receiver eligibility remains authoritative. request stays pending. Acknowledgment alone does not switch ownership: confirmed requires matching provider control and refreshed conversation. Reconcile uncertain results before another action.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId', 'action'], properties: { accountId: { type: 'string' }, action: { enum: ['pass', 'take', 'request', 'release'] }, targetAppId: { type: 'string', pattern: '^[0-9]+$', description: 'Receiving Meta app ID; pass only.' }, metadata: { type: 'string' } } } } } }, responses: { '200': { description: 'Provider result, refreshed conversation, confirmed and pending flags' }, ...metaErrors } };
  const question = { type: 'object', additionalProperties: false, required: ['question', 'payload'], properties: { question: { type: 'string', minLength: 1, maxLength: 80 }, payload: { type: 'string', minLength: 1 } } };
  const questions = { type: 'array', minItems: 1, maxItems: 4, items: question };
  const locale = { type: 'string', description: 'Include exactly one default and no duplicate locales; other locales use xx_XX or xxx_XX.' };
  const menuItem = { type: 'object', required: ['type', 'title'], properties: { type: { enum: ['postback', 'web_url', 'nested'] }, title: { type: 'string', minLength: 1 }, payload: { type: 'string' }, url: { type: 'string', format: 'uri' }, call_to_actions: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'object', description: 'postback or web_url; no further nesting' } } }, description: 'postback requires payload; web_url requires an HTTP(S) URL without credentials. One nesting level only.' };
  const settingOperations = (field: string, entries: Record<string, any>, description: string) => ({
    parameters: [{ name: 'accountId', in: 'path', required: true, schema: { type: 'string' }, description: 'Connected account owned by the authenticated workspace.' }],
    get: { tags: ['Settings & Administration'], summary: `Read provider ${field}`, description: `Requires accounts:read. ${description}`, responses: { '200': { description: 'Canonical provider data[]; empty means unset' }, ...metaErrors } },
    put: { tags: ['Settings & Administration'], summary: `Replace provider ${field}`, description: `Requires accounts:write. ${description} Refresh canonical settings after an uncertain result; no local fallback.`, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: [field], properties: { [field]: entries } } } } }, responses: { '200': { description: 'Provider mutation acknowledgment' }, ...metaErrors } },
    delete: { tags: ['Settings & Administration'], summary: `Reset provider ${field}`, description: 'Requires accounts:write. Provider acknowledgment required; refresh settings to reconcile uncertainty.', responses: { '200': { description: 'Provider reset acknowledgment' }, ...metaErrors } },
  });
  return {
    openapi: '3.1.0',
    info: {
      title: 'Asra3 Unified Social, Telephony, Ads & Commerce REST API',
      version: '1.7.0',
      description:
        'Official OpenAPI 3.1.0 resource catalog for Asra3 (asra3.com). Phase 1A–D and Phase 2A–B are verified locally against isolated provider fixtures. Phase 2C adds Instagram publishing, provider content/media preflight and current publishing quota; final integration verification is recorded separately. Live asra3.com acceptance remains pending owner deployment. Availability varies by phase; this catalog does not certify other channels or later-phase capabilities.',
      contact: {
        name: 'Asra3 API Engineering',
        url: `${baseUrl}/docs`,
      },
    },
    servers: [
      { url: `${baseUrl}/api/v1`, description: 'Current Environment Gateway' },
      { url: 'https://asra3.com/api/v1', description: 'Production Global Edge' },
    ],
    tags: [
      {
        name: 'Core & Social Connect',
        description: 'Workspace telemetry, brand profiles, provider-backed connected accounts, fresh health observations, and headless OAuth selection.',
      },
      {
        name: 'Publishing & Queue',
        description: 'Facebook and Instagram owned post lifecycle, stable intent keys, provider preflight, current Instagram quota, queue creation and media presign. Unsupported operations return 501.',
      },
      {
        name: 'Unified Inbox & CRM',
        description: 'Locally implemented WhatsApp and customer-initiated Messenger/Instagram inbox, owned organic Meta comments and selected thread control. Other CRM resources are catalog entries with separate acceptance phases.',
      },
      {
        name: 'Analytics & Insights',
        description: 'Cross-network post insights, follower growth, best-time-to-post recommendations, content decay curves, and inbox response time heatmaps.',
      },
      {
        name: 'Advertising (8 Networks)',
        description: 'Campaign hierarchy, CTWA ads, Call ads, custom audiences, targeting discovery, competitor Ad Library, instant lead forms, and Conversions API (CAPI).',
      },
      {
        name: 'Platform APIs',
        description: 'Multi-platform blogs (WordPress & Shopify), unified e-commerce (products, orders, discounts), and Google Business Profile local SEO.',
      },
      {
        name: 'Cloud Telephony & Voice',
        description: 'Virtual numbers in 55+ countries, porting, branded calling identities, WebRTC softphone, AI voice agents, 2-way SMS/MMS, 10DLC, RCS, and turnkey OTP verification.',
      },
      {
        name: 'Settings & Administration',
        description: 'Selected provider Messenger greeting/menu/ice-breakers and Instagram ice-breakers. Other settings resources require their own phase validation.',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key (tk_live_... or tk_test_...)',
          description: 'Authenticate requests by passing your live or test API key in the Authorization header: `Authorization: Bearer tk_live_...`',
        },
      },
      schemas: {
        ApiResponseMeta: {
          type: 'object',
          required: ['request_id', 'api_version', 'latency_ms', 'organization_id'],
          properties: {
            request_id: { type: 'string', example: 'req_1729257600_ab12c' },
            api_version: { type: 'string', example: '2026-10-18' },
            latency_ms: { type: 'integer', example: 14 },
            organization_id: { type: 'string', example: 'org_workspace' },
          },
        },
        ApiSuccessEnvelope: {
          type: 'object',
          required: ['success', 'meta'],
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: ['string', 'null'], example: 'Operation completed successfully.' },
            data: { type: ['object', 'array'] },
            meta: { $ref: '#/components/schemas/ApiResponseMeta' },
          },
        },
        ApiErrorEnvelope: {
          type: 'object',
          required: ['success', 'error', 'meta'],
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', example: 'validation_error' },
                message: { type: 'string', example: 'Field "content" is required.' },
                details: { type: 'object' },
                docs_url: { type: 'string', example: `${baseUrl}/docs#error-handling` },
              },
            },
            meta: { $ref: '#/components/schemas/ApiResponseMeta' },
          },
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'post_1729257600_ab' },
            content: { type: 'string', example: 'Excited to announce our new product line! 🚀 #launch' },
            platforms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  platform: { type: 'string' },
                  accountId: { type: 'string' },
                  status: { type: 'string', enum: ['published', 'scheduled', 'failed'] },
                  platformPostUrl: { type: 'string' },
                },
              },
            },
            status: { type: 'string', enum: ['published', 'scheduled', 'draft', 'failed'] },
            scheduledFor: { type: ['string', 'null'], format: 'date-time' },
            publishNow: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ConnectedAccount: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'acc_instagram_9f8e7d' },
            accountId: { type: 'string', example: 'acc_instagram_9f8e7d' },
            platform: { type: 'string', example: 'instagram' },
            username: { type: 'string', example: '@brand_official' },
            displayName: { type: 'string', example: 'Brand Official Instagram' },
            status: { type: 'string', enum: ['healthy', 'warning', 'needs_reconnect'], example: 'healthy' },
            grantedScopes: { type: 'array', items: { type: 'string' } },
            canPost: { type: 'boolean', example: true },
            canFetchAnalytics: { type: 'boolean', example: true },
            needsReconnect: { type: 'boolean', example: false },
            connectedAt: { type: 'string', format: 'date-time' },
          },
        },
        VirtualPhoneNumber: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'num_us_1729257600' },
            phoneNumber: { type: 'string', example: '+14158904321' },
            country: { type: 'string', example: 'US' },
            numberType: { type: 'string', enum: ['local', 'mobile', 'toll_free'] },
            monthlyPriceUsd: { type: 'number', example: 3.0 },
            capabilities: {
              type: 'object',
              properties: {
                voice: { type: 'boolean' },
                sms: { type: 'boolean' },
                whatsapp: { type: 'boolean' },
                mms: { type: 'boolean' },
              },
            },
            status: { type: 'string', enum: ['active', 'released'] },
          },
        },
        AccountGroup: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            accountIds: { type: 'array', items: { type: 'string' } },
            color: { type: 'string' },
          },
        },
        CrmContact: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            channels: { type: 'array', items: { type: 'object' } },
            customFields: { type: 'object' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      // 1. Core & Social Connect
      '/me': {
        get: {
          tags: ['Core & Social Connect'],
          summary: 'Inspect current workspace, plan quotas, usage counters, and telecom wallet',
          responses: {
            '200': {
              description: 'Workspace telemetry and active scopes',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiSuccessEnvelope' } } },
            },
          },
        },
      },
      '/wallet': {
        get: {
          tags: ['Core & Social Connect'],
          summary: 'Inspect Telecom Credit Wallet balance & transaction history',
          responses: { '200': { description: 'Wallet status' } },
        },
      },
      '/wallet/topup': {
        post: {
          tags: ['Core & Social Connect'],
          summary: 'Add programmatic funds to Telecom Credit Wallet',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { amountUsd: { type: 'number' } } } } },
          },
          responses: { '200': { description: 'Wallet topped up' } },
        },
      },
      '/profiles': {
        get: {
          tags: ['Core & Social Connect'],
          summary: 'List multi-tenant brand profiles',
          responses: { '200': { description: 'Array of profiles' } },
        },
        post: {
          tags: ['Core & Social Connect'],
          summary: 'Create a brand profile',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, timezone: { type: 'string' } } } } },
          },
          responses: { '201': { description: 'Profile created' } },
        },
      },
      '/profiles/{profileId}': {
        get: { tags: ['Core & Social Connect'], summary: 'Get profile details', responses: { '200': { description: 'Profile details' } } },
        put: { tags: ['Core & Social Connect'], summary: 'Update profile', responses: { '200': { description: 'Profile updated' } } },
        delete: { tags: ['Core & Social Connect'], summary: 'Delete profile', responses: { '200': { description: 'Profile deleted' } } },
      },
      '/accounts': {
        get: {
          tags: ['Core & Social Connect'],
          summary: 'List workspace-owned provider accounts', description: 'Requires accounts:read. Fresh provider inventory and health, with id/accountId/_id, platform, isActive, needsReconnection, status (healthy/warning/error/unknown) and checkedAt. Provider outages return an error, never fabricated health.',
          responses: { '200': { description: 'Connected accounts array' } },
        },
      },
      '/accounts/health': {
        get: {
          tags: ['Core & Social Connect'],
          summary: 'Overall health diagnostic across all connected accounts',
          responses: { '200': { description: 'Accounts health summary' } },
        },
      },
      '/accounts/{accountId}': {
        get: { tags: ['Core & Social Connect'], summary: 'Get account details', responses: { '200': { description: 'Account details' } } },
        delete: { tags: ['Core & Social Connect'], summary: 'Disconnect owned provider account', description: 'Requires accounts:write. Provider DELETE followed by fresh inventory absence before local removal. Unconfirmed outcomes return 503; refresh before retrying.', responses: { '200': { description: 'Disconnection confirmed' }, ...errors } },
      },
      '/accounts/{accountId}/health': {
        get: {
          tags: ['Core & Social Connect'],
          summary: 'Fresh workspace-scoped provider health; missing observations are unknown',
          responses: { '200': { description: 'Diagnostic status' } },
        },
      },
      '/accounts/{accountId}/instagram/publishing-limit': { get: { tags: ['Publishing & Queue'], summary: 'Read the owned Instagram account’s current publishing quota', description: 'Requires accounts:read or posts:write. Compare quotaUsage against the returned quotaTotal; do not hardcode a cap. quotaDurationSeconds describes the current rolling window. Current exhaustion blocks immediate publishing/retry, while drafts and future schedules remain available. A quota observation does not reserve capacity or certify a later publish.', parameters: [{ name: 'accountId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'quotaUsage, quotaTotal, quotaDurationSeconds and httpStatus', content: { 'application/json': { schema: { type: 'object', required: ['quotaUsage', 'quotaTotal', 'quotaDurationSeconds'], properties: { quotaUsage: { type: 'integer', minimum: 0 }, quotaTotal: { type: 'integer', minimum: 1 }, quotaDurationSeconds: { type: 'integer', minimum: 1 } } } } } }, ...errors } } },
      '/connect/{platform}': {
        get: { tags: ['Core & Social Connect'], deprecated: true, summary: 'Use authenticated dashboard onboarding', responses: { '501': { description: 'Interactive onboarding required' } } },
        post: { tags: ['Core & Social Connect'], deprecated: true, summary: 'Use authenticated dashboard onboarding', responses: { '501': { description: 'Interactive onboarding required' } } },
      },
      '/connect/{platform}/select': {
        get: { tags: ['Core & Social Connect'], deprecated: true, summary: 'Use the dashboard account picker', responses: { '501': { description: 'Interactive onboarding required' } } },
        post: { tags: ['Core & Social Connect'], deprecated: true, summary: 'Use the dashboard account picker', responses: { '501': { description: 'Interactive onboarding required' } } },
      },

      // 2. Publishing & Queue
      '/posts': {
        get: { tags: ['Publishing & Queue'], summary: 'List provider posts owned by this workspace', description: 'Requires accounts:read OR posts:write. Returns posts[] and canonical provider pagination. Query page, limit, status and accountId.', responses: { '200': { description: 'Provider posts[] and pagination' }, ...errors } },
        post: { tags: ['Publishing & Queue'], summary: 'Create an owned Facebook/Instagram draft, publish, schedule or queue a post', description: 'Requires posts:write. Instagram professional accounts require media: one image for feed, 2–10 images/videos for a carousel, one video for a Reel, or exactly one image/video with platformSpecificData.contentType=story. Captions are at most 2,200 characters; Story captions are not displayed. Reel shareToFeed is optional. Direct Instagram Login supports baseline publishing; catalog audio and paid-partnership API fields require verified facebook_login metadata. Provider content/media preflight checks URL accessibility, MIME and size; it does not certify dimensions, aspect ratio or duration. Unknown media size is not certified. Preserve a stable Idempotency-Key (1–255 characters). No mode defaults to a draft; choose only one mode. Current quota applies to immediate publishing/retry rather than blocking drafts or future schedules. HTTP 207 with a persisted post can also contain a top-level error: inspect post and platformResults, retain the existing ID and reconcile before retrying.',
          parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 1, maxLength: 255 } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['platforms'], description: 'Routing comes from owned accountId. Instagram target customMedia/customContent override root fields. Omit contentType for feed/carousel/Reel; contentType only accepts story.', properties: {
            content: { type: 'string' }, platforms: { type: 'array', minItems: 1, items: { type: 'object', required: ['platform', 'accountId'], properties: { platform: { enum: ['facebook', 'instagram'] }, accountId: { type: 'string' }, customContent: { type: 'string' }, customMedia: { type: 'array', items: { type: 'object' } }, scheduledFor: { type: 'string', format: 'date-time' }, platformSpecificData: { type: 'object', properties: { contentType: { enum: ['story'] }, shareToFeed: { type: 'boolean', description: 'Single-video Reel only' } }, description: 'Additional API fields are validated against the installed SDK; catalog audio and partnership fields require Facebook Login. Dashboard exposes baseline fields only.' } } } },
            mediaItems: { type: 'array', items: { type: 'object', required: ['url', 'type'], properties: { url: { type: 'string', format: 'uri', pattern: '^https://' }, type: { enum: ['image', 'video', 'document'] } } } },
            isDraft: { type: 'boolean' }, publishNow: { type: 'boolean' }, scheduledFor: { type: 'string', format: 'date-time', description: 'Future ISO datetime with explicit Z or timezone offset' }, timezone: { type: 'string', description: 'IANA timezone, for example Africa/Cairo' }, useProfileQueue: { type: 'boolean' }, queueId: { type: 'string', description: 'Owned queue ID; requires useProfileQueue' }, idempotencyKey: { type: 'string', maxLength: 255, description: 'Body alias when header is absent' }
          } }, example: { content: 'Our latest update', platforms: [{ platform: 'facebook', accountId: '{{accountId}}' }], isDraft: true } } } },
          responses: { '200': { description: 'Provider post acknowledgment' }, '201': { description: 'Provider post created' }, '207': { description: 'Incomplete inline publishing: inspect post/platformResults' }, ...errors } },
      },
      '/posts/{postId}': {
        get: { tags: ['Publishing & Queue'], summary: 'Read an owned provider post', description: 'Requires accounts:read OR posts:write.', responses: { '200': { description: 'Canonical post and platform states' }, ...errors } },
        put: { tags: ['Publishing & Queue'], summary: 'Update an owned Facebook/Instagram draft or schedule', description: 'Requires posts:write and stable Idempotency-Key (1–255 characters). Uses the same content, target, media and delivery fields as create, merging unchanged canonical fields for validation. The server sets isDraft:false when promoting to publishing, scheduling or a queue. Published/publishing/partial records cannot be edited by this operation. Reconcile an uncertain update with GET before resubmitting; create replay guarantees do not establish update idempotency.', parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', maxLength: 255 } }], responses: { '200': { description: 'Provider post' }, '207': { description: 'Partial result' }, ...errors } },
        patch: { tags: ['Publishing & Queue'], summary: 'Update an owned Facebook/Instagram draft or schedule', description: 'Same contract as PUT; stable Idempotency-Key required.', responses: { '200': { description: 'Provider post' }, '207': { description: 'Partial result' }, ...errors } },
        delete: { tags: ['Publishing & Queue'], summary: 'Remove the Zernio post record', description: 'Requires posts:write. This does not guarantee removal of content already published on Facebook or Instagram.', responses: { '200': { description: 'Provider record removal acknowledged' }, ...errors } },
      },
      '/posts/{postId}/retry': { post: { tags: ['Publishing & Queue'], summary: 'Retry failed targets of an owned Facebook/Instagram post', description: 'Requires posts:write and stable Idempotency-Key (1–255 characters). Inspect canonical target results; validate failed Instagram target media and current quota before retry. Successful targets remain successful. After an uncertain retry, refresh the existing post before another attempt; a key alone does not establish retry idempotency.', parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', maxLength: 255 } }], responses: { '200': { description: 'Provider post' }, '207': { description: 'Partial result' }, ...errors } } },
      '/posts/sync-external': { post: { tags: ['Publishing & Queue'], summary: 'Not implemented in this phase', responses: { '501': { description: 'Not implemented' } } } },
      '/queue': { post: { tags: ['Publishing & Queue'], summary: 'Create a provider queue', description: 'Requires posts:write; name, IANA timezone and nonempty slots[{dayOfWeek:0..6,time:HH:mm}]. Workspace profile is server-resolved.', responses: { '200': { description: 'Provider queue' }, ...errors } } },
      '/queue/slots': {
        get: { tags: ['Publishing & Queue'], summary: 'Not implemented in this phase', responses: { '501': { description: 'Not implemented' } } },
        post: { tags: ['Publishing & Queue'], summary: 'Create a provider queue', description: 'Same contract as POST /queue: name, timezone and slots. Requires posts:write.', responses: { '200': { description: 'Provider queue' }, ...errors } },
        delete: { tags: ['Publishing & Queue'], summary: 'Not implemented in this phase', responses: { '501': { description: 'Not implemented' } } },
      },
      '/queue/preview': { get: { tags: ['Publishing & Queue'], summary: 'Not implemented in this phase', responses: { '501': { description: 'Not implemented' } } } },
      '/media/presign': { post: { tags: ['Publishing & Queue'], summary: 'Get HTTPS PUT upload URL and public media URL', description: 'Requires posts:write. PUT file bytes to uploadUrl, then attach publicUrl through mediaItems. No Facebook publication is performed by upload.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['filename', 'contentType'], properties: { filename: { type: 'string' }, contentType: { type: 'string' }, size: { type: 'integer', minimum: 1 } } } } } }, responses: { '200': { description: 'uploadUrl, publicUrl, expiresIn' }, ...errors } } },
      '/validate/post': { post: { tags: ['Publishing & Queue'], summary: 'Validate owned Facebook/Instagram post content without publishing', description: 'Requires posts:write. Local account/platform/plan checks precede provider validation. Provider checks content/format rules and returns valid/errors/warnings; it does not process media, publish, reserve quota or certify delivery. Use /validate/media separately for URL/MIME/size checks. A valid result is not a final publication guarantee.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['platforms'], properties: { content: { type: 'string' }, mediaItems: { type: 'array', items: { type: 'object' } }, platforms: { type: 'array', minItems: 1, items: { type: 'object', required: ['platform', 'accountId'], properties: { platform: { enum: ['facebook', 'instagram'] }, accountId: { type: 'string' }, customContent: { type: 'string' }, customMedia: { type: 'array', items: { type: 'object' } }, platformSpecificData: { type: 'object' } } } } } } } } }, responses: { '200': { description: 'valid, optional errors/warnings, httpStatus; valid=false may be a normal validation result' }, ...errors } } },
      '/validate/media': { post: { tags: ['Publishing & Queue'], summary: 'Inspect a public media URL for an owned publishing account', description: 'Requires posts:write and owned accountId. Public HTTPS URL without credentials/private hosts. Provider HEAD/GET detects accessibility, contentType and size plus platformLimits. Null/unknown size or missing comparisons cannot certify limits. Dimensions, aspect ratio, codec and duration are not checked by this endpoint. No file is published.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId', 'url'], properties: { accountId: { type: 'string' }, url: { type: 'string', format: 'uri', pattern: '^https://' } } } } } }, responses: { '200': { description: 'valid, url, error?, contentType, size (possibly null), type, platformLimits and httpStatus' }, ...errors } } },

      // 3. Unified Inbox & CRM
      '/inbox/conversations': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List owned WhatsApp, Messenger or Instagram conversations', description: 'Meta channels require accountId and customer-initiated threads. Optional cursor, limit and folder filters; retain meta.failedAccounts when sync is incomplete.', parameters: [inboxAccountQuery], responses: { '200': { description: 'Provider data[], pagination and sync metadata' }, ...errors } },
        post: sendOperation,
      },
      '/inbox/conversations/{conversationId}': { parameters: [conversationParam], get: { tags: ['Unified Inbox & CRM'], summary: 'Get an owned WhatsApp, Messenger or Instagram conversation', parameters: [inboxAccountQuery], responses: { '200': { description: 'Provider data object' }, ...errors } } },
      '/inbox/conversations/{conversationId}/messages': { parameters: [conversationParam],
        get: { tags: ['Unified Inbox & CRM'], summary: 'List provider messages and actual deliveryStatus', parameters: [inboxAccountQuery], responses: { '200': { description: 'messages[] with createdAt/direction/deliveryStatus and pagination' }, ...errors } },
        post: { ...sendOperation, tags: ['Unified Inbox & CRM'], summary: 'Reply to an owned WhatsApp, Messenger or Instagram conversation', description: 'conversationId comes from the URL. Body requires accountId and text or one HTTPS attachment; templates are WhatsApp-only. Messenger and Instagram require an existing customer-initiated conversation and eligibility in the 24-hour reply window. Provider acceptance is not delivery. After an uncertain outcome, review history before another send; even the same key may not prevent duplicates.', requestBody: { ...sendBody, content: { 'application/json': { schema: { type: 'object', required: ['accountId'], properties: { accountId: { type: 'string' }, text: { type: 'string' }, attachments: { type: 'array', maxItems: 1 }, template: { type: 'object', description: 'WhatsApp only' } } } } } } },
      },
      '/inbox/conversations/{conversationId}/read': { parameters: [conversationParam], post: { tags: ['Unified Inbox & CRM'], summary: 'Mark owned conversation read through provider', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId'], properties: { accountId: { type: 'string' } } } } } }, responses: { '200': { description: 'Provider acknowledgment' }, ...errors } } },
      '/inbox/conversations/search': { get: unavailable },
      '/inbox/conversations/{conversationId}/typing': { parameters: [conversationParam], post: unavailable },
      '/inbox/conversations/{conversationId}/accept': { parameters: [conversationParam], post: { tags: ['Unified Inbox & CRM'], summary: 'Accept a Messenger or Instagram message request with a reviewed reply', description: 'This sends a message, rather than only changing a local folder. Requires inbox:write and a stable Idempotency-Key. Review uncertain outcomes before another send.', parameters: [retryHeader], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId', 'text'], properties: { accountId: { type: 'string' }, text: { type: 'string', minLength: 1 } } } } } }, responses: { '200': { description: 'Provider acknowledgment' }, ...errors } } },
      '/inbox/conversations/{conversationId}/thread-control': { parameters: [conversationParam], post: threadControl },
      '/inbox/conversations/{conversationId}/handover': { parameters: [conversationParam], post: { ...threadControl, summary: 'Compatibility alias for provider thread-control', description: `${threadControl.description} Uses the same action body as /thread-control.` } },
      '/inbox/media/upload': { post: unavailable },
      '/inbox/comments': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List owned organic Facebook/Instagram posts with comments', description: 'Requires accounts:read or inbox:write. Retains native post IDs, pagination and failedAccounts/accountsSkipped metadata. Workspace profile and platform are server-resolved. Paid/dark ad posts are outside this phase.', parameters: [metaAccountQuery, ...pageParams, { name: 'since', in: 'query', schema: { type: 'string', format: 'date-time' } }, { name: 'minComments', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } }], responses: { '200': { description: 'Provider data[] posts, pagination and sync metadata; HTTP success can contain partial account failures' }, ...metaErrors } },
        post: unavailable,
        delete: unavailable,
      },
      '/inbox/comments/{postId}': { parameters: [postParam],
        get: { tags: ['Unified Inbox & CRM'], summary: 'Read an owned post’s native comments and replies', description: 'Requires accounts:read or inbox:write. accountId and native postId required. Optional commentId selects replies for an owned parent comment. Ownership verification is bounded to 25 provider pages and fails closed when incomplete.', parameters: [metaAccountQuery, ...pageParams, { name: 'commentId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Provider comments[], reply metadata and pagination' }, ...metaErrors } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Reply publicly to an owned native comment', description: 'Requires inbox:write, accountId, commentId and plain text. Verifies post/comment ownership before sending. No top-level comment creation. Reconcile uncertain outcomes before another reply.', parameters: [commentKey], requestBody: commentBody(true), responses: { '200': { description: 'Provider acknowledgment and data.commentId' }, ...metaErrors } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Delete an owned native comment through provider', description: 'Requires inbox:write; provider permissions remain authoritative.', parameters: [metaAccountQuery, { ...commentParam, in: 'query' }], responses: { '200': { description: 'Provider removal acknowledgment' }, ...metaErrors } },
      },
      '/inbox/comments/{postId}/{commentId}/private-reply': { parameters: [postParam, commentParam], post: { tags: ['Unified Inbox & CRM'], summary: 'Send one reviewed plain-text private reply to a comment', description: 'Requires inbox:write. Provider enforces one private reply per comment within 7 days. Keep separate from public reply. privateReplyConsumed=true forbids retry; privateReplyOutcome=unknown also blocks automatic retry and requires reconciliation. No buttons or quick replies in this phase.', parameters: [commentKey], requestBody: commentBody(false), responses: { '200': { description: 'Provider messageId, commentId and platform; acceptance is not delivery' }, ...metaErrors } } },
      '/inbox/comments/{postId}/{commentId}/hide': { parameters: [postParam, commentParam],
        post: { tags: ['Unified Inbox & CRM'], summary: 'Hide an owned native comment', description: 'Requires inbox:write; provider capability/permission checks apply.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId'], properties: { accountId: { type: 'string' } } } } } }, responses: { '200': { description: 'Provider success and isHidden=true' }, ...metaErrors } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Unhide an owned native comment', description: 'Requires inbox:write.', parameters: [metaAccountQuery], responses: { '200': { description: 'Provider success and isHidden=false' }, ...metaErrors } },
      },
      '/inbox/comments/{commentId}/reply': {
        post: unavailable,
      },
      '/inbox/comments/{commentId}/hide': {
        post: unavailable,
      },
      '/inbox/comments/{commentId}/like': {
        post: unavailable,
      },
      '/inbox/reviews': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List Facebook Page & Google Business Profile star reviews', responses: { '200': { description: 'Reviews list' } } },
      },
      '/inbox/reviews/{reviewId}/reply': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Reply to star review', responses: { '200': { description: 'Review reply posted' } } },
      },
      '/inbox/mentions': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List brand mentions across connected accounts', responses: { '200': { description: 'Mentions list' } } },
      },
      '/contacts': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List CRM contacts with channels and tags', responses: { '200': { description: 'Contacts list' } } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Create cross-platform CRM contact', responses: { '201': { description: 'Contact created' } } },
      },
      '/contacts/{contactId}': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'Get contact details', responses: { '200': { description: 'Contact details' } } },
        patch: { tags: ['Unified Inbox & CRM'], summary: 'Update contact tags, channels, or custom fields', responses: { '200': { description: 'Contact updated' } } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Delete contact', responses: { '200': { description: 'Contact deleted' } } },
      },
      '/custom-fields': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List custom field definitions for CRM contacts', responses: { '200': { description: 'Custom fields' } } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Define new custom field', responses: { '201': { description: 'Custom field created' } } },
      },
      '/custom-fields/{id}': {
        patch: { tags: ['Unified Inbox & CRM'], summary: 'Update custom field', responses: { '200': { description: 'Custom field updated' } } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Delete custom field', responses: { '200': { description: 'Custom field deleted' } } },
      },
      '/broadcasts': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List owned WhatsApp broadcasts', parameters: [accountQuery], responses: { '200': { description: 'Provider broadcasts[] and pagination' }, ...errors } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Create WhatsApp draft; does not add recipients or send', parameters: [retryHeader], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId', 'name', 'template'], properties: { accountId: { type: 'string' }, name: { type: 'string' }, template: { type: 'object', required: ['name', 'language'], properties: { name: { type: 'string' }, language: { type: 'string' }, variableMapping: { type: 'object', description: 'Position keys map to {field:custom,customValue:string} or supported contact fields' } } } } } } } }, responses: { '200': { description: 'Provider draft acknowledgment' }, '201': { description: 'Provider broadcast object with id and draft status' }, ...errors } },
      },
      '/broadcasts/{broadcastId}': { parameters: [broadcastParam], get: { tags: ['Unified Inbox & CRM'], summary: 'Get owned provider broadcast status/counts', parameters: [accountQuery], responses: { '200': { description: 'Provider broadcast; counts are not inferred' }, ...errors } } },
      '/broadcasts/{broadcastId}/recipients': { parameters: [broadcastParam], post: { tags: ['Unified Inbox & CRM'], summary: 'Add explicit international phones to existing draft', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId', 'phones'], properties: { accountId: { type: 'string' }, phones: { type: 'array', minItems: 1, maxItems: 1000, items: { type: 'string' } } } } } } }, responses: { '200': { description: 'Provider added/skipped counts; useSegment is disabled' }, ...errors } } },
      '/broadcasts/{broadcastId}/send': { parameters: [broadcastParam], post: { tags: ['Unified Inbox & CRM'], summary: 'Dispatch owned draft after recipient addition and approval checks', description: 'Optional Idempotency-Key; absent keys derive a stable workspace/account/broadcast operation key. After uncertainty refresh this broadcast before retrying.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId'], properties: { accountId: { type: 'string' } } } } } }, responses: { '200': { description: 'Provider status: sending/completed/failed with sent/failed/recipientCount; no delivery guarantee' }, ...errors } } },
      '/sequences': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List drip sequences', responses: { '200': { description: 'Sequences list' } } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Create linear drip campaign sequence', responses: { '201': { description: 'Sequence created' } } },
      },
      '/sequences/{sequenceId}/activate': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Activate drip sequence', responses: { '200': { description: 'Sequence activated' } } },
      },
      '/sequences/{sequenceId}/enroll': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Enroll contacts into drip sequence', responses: { '200': { description: 'Contacts enrolled' } } },
      },
      '/workflows': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List visual branching automations', responses: { '200': { description: 'Workflows list' } } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Create ManyChat-style visual branching workflow', responses: { '201': { description: 'Workflow created' } } },
      },
      '/workflows/{workflowId}': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'Get workflow details and graph', responses: { '200': { description: 'Workflow details' } } },
        patch: { tags: ['Unified Inbox & CRM'], summary: 'Update workflow graph (prevented while status is active)', responses: { '200': { description: 'Workflow updated' } } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Delete workflow', responses: { '200': { description: 'Workflow deleted' } } },
      },
      '/workflows/{workflowId}/activate': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Validate and activate workflow', responses: { '200': { description: 'Workflow activated' } } },
      },
      '/workflows/{workflowId}/pause': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Pause active workflow', responses: { '200': { description: 'Workflow paused' } } },
      },
      '/workflows/{workflowId}/trigger': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Programmatically trigger workflow run', responses: { '201': { description: 'Workflow execution triggered' } } },
      },
      '/inbox/automations': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List Comment-to-DM growth automations', responses: { '200': { description: 'Automations list' } } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Create Comment-to-DM growth automation', responses: { '201': { description: 'Automation created' } } },
      },

      // 4. Analytics & Insights
      '/analytics': {
        get: { tags: ['Analytics & Insights'], summary: 'Cross-channel publishing insights, follower growth, engagement', responses: { '200': { description: 'Analytics data' } } },
      },
      '/analytics/best-times': {
        get: { tags: ['Analytics & Insights'], summary: 'Best time to post recommendations based on engagement curves', responses: { '200': { description: 'Best times heatmap' } } },
      },
      '/analytics/content-decay': {
        get: { tags: ['Analytics & Insights'], summary: 'Half-life and engagement decay curves post-publish', responses: { '200': { description: 'Decay curve' } } },
      },
      '/inbox-analytics': {
        get: { tags: ['Analytics & Insights'], summary: 'Omnichannel inbox volume, day-by-hour heatmap, and SLA response times', responses: { '200': { description: 'Inbox analytics' } } },
      },

      // 5. Advertising (8 Networks)
      '/ads/campaigns': {
        get: { tags: ['Advertising (8 Networks)'], summary: 'List ad campaigns across 8 networks', responses: { '200': { description: 'Campaigns list' } } },
        post: { tags: ['Advertising (8 Networks)'], summary: 'Create ad campaign with Idempotency-Key', responses: { '201': { description: 'Campaign created' } } },
      },
      '/ads/ctwa': {
        post: { tags: ['Advertising (8 Networks)'], summary: 'Create Click-to-WhatsApp (CTWA) campaign, ad set, and ad', responses: { '201': { description: 'CTWA ad created' } } },
      },
      '/ads/call': {
        post: { tags: ['Advertising (8 Networks)'], summary: 'Create Click-to-Call campaign with CALL_NOW CTA', responses: { '201': { description: 'Call ad created' } } },
      },
      '/ads/audiences': {
        get: { tags: ['Advertising (8 Networks)'], summary: 'List custom/lookalike audiences', responses: { '200': { description: 'Audiences list' } } },
        post: { tags: ['Advertising (8 Networks)'], summary: 'Create custom audience or upload hashed customer list', responses: { '201': { description: 'Audience created' } } },
      },
      '/ads/targeting': {
        get: { tags: ['Advertising (8 Networks)'], summary: 'Targeting discovery (interests, behaviors, demographics, reach)', responses: { '200': { description: 'Targeting results' } } },
      },
      '/ads/library': {
        get: { tags: ['Advertising (8 Networks)'], summary: 'Competitor Ad Library spy search (Meta & LinkedIn archives)', responses: { '200': { description: 'Public ads list' } } },
      },
      '/lead-gen/forms': {
        get: { tags: ['Advertising (8 Networks)'], summary: 'List Instant Lead Gen Forms', responses: { '200': { description: 'Lead forms list' } } },
        post: { tags: ['Advertising (8 Networks)'], summary: 'Create Instant Lead Gen Form', responses: { '201': { description: 'Lead form created' } } },
      },
      '/lead-gen/forms/{formId}/leads': {
        get: { tags: ['Advertising (8 Networks)'], summary: 'Retrieve leads submitted through Instant Lead Gen Form', responses: { '200': { description: 'Leads list' } } },
      },
      '/tracking-tags': {
        get: { tags: ['Advertising (8 Networks)'], summary: 'List measurement pixels and tracking tags', responses: { '200': { description: 'Tracking tags' } } },
        post: { tags: ['Advertising (8 Networks)'], summary: 'Register platform pixel (Meta, TikTok, Google, LinkedIn)', responses: { '201': { description: 'Pixel registered' } } },
      },
      '/conversions': {
        post: { tags: ['Advertising (8 Networks)'], summary: 'Server-side Conversions API (CAPI) with SHA-256 matching', responses: { '200': { description: 'Conversions accepted' } } },
      },

      // 6. Platform APIs (Blogs & Commerce)
      '/blogs': {
        get: { tags: ['Platform APIs'], summary: 'List WordPress & Shopify connected blogs', responses: { '200': { description: 'Blogs list' } } },
        post: { tags: ['Platform APIs'], summary: 'Create blog article', responses: { '201': { description: 'Blog article created' } } },
      },
      '/blogs/{blogId}/articles': {
        get: { tags: ['Platform APIs'], summary: 'List articles in blog', responses: { '200': { description: 'Articles list' } } },
        post: { tags: ['Platform APIs'], summary: 'Publish new article in blog', responses: { '201': { description: 'Article published' } } },
        patch: { tags: ['Platform APIs'], summary: 'Update blog article', responses: { '200': { description: 'Article updated' } } },
        delete: { tags: ['Platform APIs'], summary: 'Delete blog article', responses: { '200': { description: 'Article deleted' } } },
      },
      '/commerce/overview': {
        get: { tags: ['Platform APIs'], summary: 'E-commerce store performance overview', responses: { '200': { description: 'Overview metrics' } } },
      },
      '/commerce/products': {
        get: { tags: ['Platform APIs'], summary: 'Unified store products across Shopify & WooCommerce', responses: { '200': { description: 'Products list' } } },
        post: { tags: ['Platform APIs'], summary: 'Create unified store product', responses: { '201': { description: 'Product created' } } },
        patch: { tags: ['Platform APIs'], summary: 'Update product', responses: { '200': { description: 'Product updated' } } },
        delete: { tags: ['Platform APIs'], summary: 'Delete product', responses: { '200': { description: 'Product deleted' } } },
      },
      '/commerce/orders': {
        get: { tags: ['Platform APIs'], summary: 'Unified e-commerce orders feed', responses: { '200': { description: 'Orders list' } } },
      },
      '/commerce/discounts': {
        get: { tags: ['Platform APIs'], summary: 'List store promotional discount codes', responses: { '200': { description: 'Discounts list' } } },
        post: { tags: ['Platform APIs'], summary: 'Create discount code', responses: { '201': { description: 'Discount created' } } },
        patch: { tags: ['Platform APIs'], summary: 'Update discount code', responses: { '200': { description: 'Discount updated' } } },
        delete: { tags: ['Platform APIs'], summary: 'Delete discount code', responses: { '200': { description: 'Discount deleted' } } },
      },
      '/google-business/services': {
        get: { tags: ['Platform APIs'], summary: 'Read Google Business Profile local services & menus', responses: { '200': { description: 'Services list' } } },
        post: { tags: ['Platform APIs'], summary: 'Add Google Business Profile local service', responses: { '201': { description: 'Service added' } } },
        patch: { tags: ['Platform APIs'], summary: 'Update local service', responses: { '200': { description: 'Service updated' } } },
        delete: { tags: ['Platform APIs'], summary: 'Delete local service', responses: { '200': { description: 'Service deleted' } } },
      },

      // 7. Cloud Telephony & Voice
      '/phone-numbers/available': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'Search provider inventory and current country/type prices', responses: { '200': { description: 'Available numbers and country catalog; regulated countries may require identity verification before allocation' }, '503': { description: 'Provider unavailable' } } },
      },
      '/phone-numbers': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List owned virtual phone numbers in workspace', responses: { '200': { description: 'Owned numbers' } } },
      },
      '/phone-numbers/buy': {
        post: {
          tags: ['Cloud Telephony & Voice'], summary: 'Purchase a number through Zernio using a persistent purchase intent',
          description: 'Retry the same purchaseIntentId and original selection after timeouts, payment setup, or identity verification. Billing is handled by the provider. Allocation does not mean WhatsApp is connected.',
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object', required: ['country', 'numberType', 'purchaseIntentId'], properties: {
              country: { type: 'string', example: 'US' },
              numberType: { type: 'string', enum: ['local', 'mobile', 'toll_free', 'national'] },
              purchaseIntentId: { type: 'string', description: 'Stable unique identifier for this purchase; preserve across retries.' },
              phoneNumber: { type: 'string', description: 'Optional exact E.164 number from instant inventory; omit for regulated countries.' },
              areaCode: { type: 'string' }, wantsSms: { type: 'boolean' },
              expectedMonthlyCents: { type: 'integer', minimum: 0, description: 'Optional accepted catalog price; a price change is rejected before a new purchase.' },
            },
          } } } },
          responses: {
            '200': { description: 'Provider-confirmed allocation or existing purchase; inspect phoneNumber.status' },
            '201': { description: 'Provider-confirmed allocation; inspect phoneNumber.status' },
            '202': { description: 'Identity verification or allocation pending; no number ID may exist yet' },
            '402': { description: 'Payment setup required; retry the same purchase intent after updating billing' },
            '409': { description: 'Number unavailable, conflicting intent, or an existing number on this profile' },
            '503': { description: 'Provider or durable purchase storage unavailable; retry the same intent' },
          },
        },
      },
      '/phone-numbers/{numberId}': {
        delete: { tags: ['Cloud Telephony & Voice'], summary: 'Number release is currently unavailable', responses: { '501': { description: 'No number released; provider billing unchanged' } } },
      },
      '/phone-numbers/porting': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List phone number porting requests', responses: { '200': { description: 'Porting requests' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Submit request to port phone number into Zernio', responses: { '201': { description: 'Porting request submitted' } } },
      },
      '/verify': { post: unavailable },
      '/verify/check': { post: unavailable },
      '/branded-calling/identities': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List Display Identity Records for branded calling', responses: { '200': { description: 'Identities list' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Create vetted Display Identity Record (business name, logo, call reasons)', responses: { '201': { description: 'Identity created' } } },
      },
      '/rcs/agents': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List verified RCS Business Messaging agents', responses: { '200': { description: 'RCS agents' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Register verified RCS Business Messaging agent', responses: { '201': { description: 'RCS agent registered' } } },
      },
      '/rcs/messages': {
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Send verified RCS message with rich cards and suggestions', responses: { '201': { description: 'RCS message dispatched' } } },
      },
      '/sms/registration': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List US 10DLC and Toll-Free SMS carrier registrations', responses: { '200': { description: 'Registrations list' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Start US 10DLC / Toll-Free / Alphanumeric carrier registration', responses: { '201': { description: 'Registration submitted' } } },
      },
      '/sms/messages': {
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Send outbound programmable SMS/MMS from owned virtual number', responses: { '201': { description: 'SMS dispatched' } } },
      },
      '/sms/otp/latest': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'Fetch latest inbound verification OTP received on virtual numbers', responses: { '200': { description: 'Latest OTP record' } } },
      },
      '/sms/threads': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List 2-way SMS conversation threads', responses: { '200': { description: 'Threads list' } } },
      },
      '/voice/calls': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List voice call records', responses: { '200': { description: 'Call history' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Initiate outbound PSTN call or trigger AI Voice Receptionist', responses: { '201': { description: 'Call initiated' } } },
      },
      '/voice/browser-token': {
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Mint WebRTC session token for in-browser softphone calling', responses: { '200': { description: 'WebRTC token generated' } } },
      },
      '/voice/ai-agent': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'Get AI Voice Receptionist configuration', responses: { '200': { description: 'AI agent config' } } },
        put: { tags: ['Cloud Telephony & Voice'], summary: 'Update AI Voice Receptionist settings', responses: { '200': { description: 'AI agent updated' } } },
      },
      '/whatsapp/link': {
        post: { tags: ['Cloud Telephony & Voice'], deprecated: true, summary: 'Replaced by Meta onboarding in the dashboard', responses: { '410': { description: 'Use WhatsApp setup and continue with Meta' } } },
      },
      '/whatsapp/verify-otp': {
        post: { tags: ['Cloud Telephony & Voice'], deprecated: true, summary: 'Replaced by Meta onboarding in the dashboard', responses: { '410': { description: 'Local OTP verification is no longer supported' } } },
      },
      '/whatsapp/templates': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List provider templates and actual approval state', parameters: [accountQuery], responses: { '200': { description: 'templates[] with Meta PENDING/APPROVED/REJECTED status' }, ...errors } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Submit template for Meta review; no automatic approval', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountId', 'name', 'language', 'category', 'components'], properties: { accountId: { type: 'string' }, name: { type: 'string' }, language: { type: 'string' }, category: { enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION'] }, components: { type: 'array', items: { type: 'object' } } } } } } }, responses: { '200': { description: 'Provider template acknowledgment' }, '201': { description: 'Submitted template with provider status; approval may be PENDING' }, ...errors } },
      },
      '/whatsapp/flows': { get: unavailable, post: unavailable },
      '/whatsapp/messages': { post: sendOperation, get: { tags: ['Cloud Telephony & Voice'], summary: 'List owned conversation messages', parameters: [accountQuery, { name: 'conversationId', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Provider messages[] and pagination' }, ...errors } } },
      '/business-agent': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'Get Meta Business AI Agent status on WhatsApp', responses: { '200': { description: 'Agent status' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Configure & toggle Meta Business AI Agent on connected number', responses: { '200': { description: 'Agent configured' } } },
      },

      // 8. Settings & Administration
      '/account-groups': {
        get: { tags: ['Settings & Administration'], summary: 'Account groups are coming soon', responses: { '501': { description: 'Account groups are unavailable in this release' } } },
        post: { tags: ['Settings & Administration'], summary: 'Account groups are coming soon', responses: { '501': { description: 'No group created' } } },
      },
      '/account-groups/{id}': {
        put: { tags: ['Settings & Administration'], summary: 'Account groups are coming soon', responses: { '501': { description: 'No group changed' } } },
        delete: { tags: ['Settings & Administration'], summary: 'Account groups are coming soon', responses: { '501': { description: 'No group deleted' } } },
      },
      '/accounts/{accountId}/messenger-menu': settingOperations('persistent_menu', { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['locale', 'composer_input_disabled', 'call_to_actions'], properties: { locale, composer_input_disabled: { type: 'boolean' }, call_to_actions: { type: 'array', minItems: 1, maxItems: 3, items: menuItem } } } }, 'Facebook Page account only. At most 3 top-level menu items, 5 items in a nested menu, and one nesting level.'),
      '/accounts/{accountId}/messenger-ice-breakers': settingOperations('ice_breakers', { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['locale', 'call_to_actions'], properties: { locale, call_to_actions: questions } } }, 'Facebook Page account only. Localized question/payload groups with up to 4 questions per locale.'),
      '/accounts/{accountId}/messenger-greeting': settingOperations('greeting', { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['locale', 'text'], properties: { locale, text: { type: 'string', minLength: 1, maxLength: 160 } } } }, 'Facebook Page account only. Localized greeting, up to 160 characters.'),
      '/accounts/{accountId}/instagram-ice-breakers': settingOperations('ice_breakers', questions, 'Instagram professional account only. PUT uses a flat question/payload list, up to 4 questions.'),
      '/accounts/{accountId}/telegram-commands': { get: { summary: 'Not implemented', responses: { '501': { description: 'Not implemented' } } }, put: { summary: 'Not implemented', responses: { '501': { description: 'Not implemented' } } }, delete: { summary: 'Not implemented', responses: { '501': { description: 'Not implemented' } } } },
      '/api-keys': {
        get: { tags: ['Settings & Administration'], summary: 'List issued developer API keys', responses: { '200': { description: 'API keys list' } } },
        post: { tags: ['Settings & Administration'], summary: 'Generate new developer API key', responses: { '201': { description: 'API key created' } } },
      },
      '/api-keys/{keyId}': {
        delete: { tags: ['Settings & Administration'], summary: 'Revoke developer API key', responses: { '200': { description: 'Key revoked' } } },
      },
      '/webhooks': {
        get: { tags: ['Settings & Administration'], summary: 'List registered outbound webhooks', responses: { '200': { description: 'Webhooks list' } } },
        post: { tags: ['Settings & Administration'], summary: 'Register outbound webhook endpoint with HMAC secret', responses: { '201': { description: 'Webhook registered' } } },
      },
      '/webhooks/{webhookId}': {
        delete: { tags: ['Settings & Administration'], summary: 'Delete webhook endpoint', responses: { '200': { description: 'Webhook deleted' } } },
      },
      '/webhooks/test': {
        post: { tags: ['Settings & Administration'], summary: 'Dispatch simulated test webhook with HMAC-SHA256 signature', responses: { '200': { description: 'Webhook dispatched' } } },
      },
    },
  };
}

export function getPostmanV1Collection(baseUrl: string, sampleKey: string) {
  const metaExample = (name: string, method: string, path: string, description: string, payload?: Record<string, any>, send = false) => ({ name, request: {
    method, description,
    header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }, ...(payload ? [{ key: 'Content-Type', value: 'application/json' }] : []), ...(send ? [{ key: 'Idempotency-Key', value: '{{commentIntentKey}}' }] : [])],
    url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.split('?')[0].slice(1).split('/'), ...(path.includes('?') ? { query: path.split('?')[1].split('&').map(pair => { const [key, value] = pair.split('='); return { key, value }; }) } : {}) },
    ...(payload ? { body: { mode: 'raw', raw: JSON.stringify(payload, null, 2) } } : {}),
  } });
  return {
    info: {
      name: 'Asra3 REST API v1 — Official Postman Collection',
      description:
        'Postman Collection v2.1.0 resource examples across 8 families. Selected Phase 2B–C examples follow the local OpenAPI contract; other catalog examples require separate validation. Use owned account/post/comment/conversation variables. No local test establishes live delivery.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: `${baseUrl}/api/v1`, type: 'string' },
      { key: 'apiKey', value: sampleKey, type: 'string' },
      { key: 'metaAccountId', value: 'replace_with_owned_facebook_account', type: 'string' },
      { key: 'instagramAccountId', value: 'replace_with_owned_instagram_account', type: 'string' },
      { key: 'nativePostId', value: 'replace_with_native_post_id', type: 'string' },
      { key: 'commentId', value: 'replace_with_owned_comment_id', type: 'string' },
      { key: 'conversationId', value: 'replace_with_owned_conversation_id', type: 'string' },
      { key: 'commentIntentKey', value: 'replace_with_stable_unique_intent_key', type: 'string' },
      { key: 'publishingIntentKey', value: 'replace_with_stable_unique_publish_intent', type: 'string' },
      { key: 'publicImageUrl', value: 'https://your-public-media.example/photo.jpg', type: 'string' },
      { key: 'publicVideoUrl', value: 'https://your-public-media.example/reel.mp4', type: 'string' },
    ],
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{apiKey}}', type: 'string' }],
    },
    item: [
      {
        name: '1. Core & Social Connect',
        item: [
          {
            name: 'Inspect Workspace & Quotas (/me)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/me', host: ['{{baseUrl}}'], path: ['me'] },
            },
          },
          {
            name: 'List Connected Accounts (/accounts)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/accounts', host: ['{{baseUrl}}'], path: ['accounts'] },
            },
          },
          {
            name: 'Account Health Diagnostic (/accounts/health)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/accounts/health', host: ['{{baseUrl}}'], path: ['accounts', 'health'] },
            },
          },
        ],
      },
      {
        name: '2. Publishing & Queue',
        item: [
          {
            name: 'Create Facebook Draft (/posts)',
            request: {
              method: 'POST',
              header: [
                { key: 'Authorization', value: 'Bearer {{apiKey}}' },
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Idempotency-Key', value: 'req_idem_post_01' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    content: 'Excited to announce our new product update! 🚀 #Launch',
                    platforms: [{ platform: 'facebook', accountId: '{{accountId}}' }],
                    isDraft: true,
                  },
                  null,
                  2
                ),
              },
              url: { raw: '{{baseUrl}}/posts', host: ['{{baseUrl}}'], path: ['posts'] },
            },
          },
          {
            name: 'Manage Queue Slots (/queue/slots)',
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
                    name: 'Morning Prime Queue',
                    timezone: 'UTC',
                    slots: [
                      { dayOfWeek: 1, time: '09:00' },
                      { dayOfWeek: 3, time: '14:00' },
                    ],
                  },
                  null,
                  2
                ),
              },
              url: { raw: '{{baseUrl}}/queue/slots', host: ['{{baseUrl}}'], path: ['queue', 'slots'] },
            },
          },
          metaExample('Validate owned Instagram post content', 'POST', '/validate/post', 'posts:write. Content/format check only; valid does not publish or certify media dimensions/duration.', { content: 'Our latest update', mediaItems: [{ type: 'image', url: '{{publicImageUrl}}' }], platforms: [{ platform: 'instagram', accountId: '{{instagramAccountId}}' }] }),
          metaExample('Inspect public publishing media', 'POST', '/validate/media', 'posts:write. Owned accountId required. Provider accessibility/MIME/size check; unknown size is not certified.', { accountId: '{{instagramAccountId}}', url: '{{publicImageUrl}}' }),
          metaExample('Read current Instagram publishing quota', 'GET', '/accounts/{{instagramAccountId}}/instagram/publishing-limit', 'accounts:read or posts:write. Compare returned quotaUsage/quotaTotal; no hardcoded cap or future quota reservation.'),
          metaExample('Create an Instagram feed draft', 'POST', '/posts', 'posts:write. Real public image and a stable idempotency key required. Draft preserves provider record; publication is a separate reviewed action.', { content: 'Our latest update', mediaItems: [{ type: 'image', url: '{{publicImageUrl}}' }], platforms: [{ platform: 'instagram', accountId: '{{instagramAccountId}}' }], isDraft: true, idempotencyKey: '{{publishingIntentKey}}' }),
          metaExample('Validate Instagram Reel shape', 'POST', '/validate/post', 'One video becomes a Reel; omit contentType. shareToFeed applies only to a Reel. URL/MIME/size inspection remains separate.', { mediaItems: [{ type: 'video', url: '{{publicVideoUrl}}' }], platforms: [{ platform: 'instagram', accountId: '{{instagramAccountId}}', platformSpecificData: { shareToFeed: true } }] }),
          metaExample('Validate Instagram Story shape', 'POST', '/validate/post', 'Exactly one image/video with contentType=story. Caption is not displayed on Stories.', { mediaItems: [{ type: 'image', url: '{{publicImageUrl}}' }], platforms: [{ platform: 'instagram', accountId: '{{instagramAccountId}}', platformSpecificData: { contentType: 'story' } }] }),
        ],
      },
      {
        name: '3. Unified Inbox & CRM',
        item: [
          metaExample('List owned organic Meta posts', 'GET', '/inbox/comments?accountId={{metaAccountId}}&limit=20', 'accounts:read or inbox:write. Retain pagination and partial account failures; nativePostId comes from this response.'),
          metaExample('Read owned native comments', 'GET', '/inbox/comments/{{nativePostId}}?accountId={{metaAccountId}}&limit=20', 'accounts:read or inbox:write. Optional commentId selects owned parent replies.'),
          metaExample('Public reply to owned comment', 'POST', '/inbox/comments/{{nativePostId}}', 'inbox:write. Review before sending. Preserve intent key and reconcile uncertainty before retry.', { accountId: '{{metaAccountId}}', commentId: '{{commentId}}', message: 'Thank you for your question.' }, true),
          metaExample('Reviewed one-shot private reply', 'POST', '/inbox/comments/{{nativePostId}}/{{commentId}}/private-reply', 'inbox:write. One plain-text private reply per comment within 7 days. Never automatically retry consumed or unknown outcomes.', { accountId: '{{metaAccountId}}', message: 'Here is the information you requested.' }, true),
          metaExample('Hide owned comment', 'POST', '/inbox/comments/{{nativePostId}}/{{commentId}}/hide', 'inbox:write. Provider permissions apply.', { accountId: '{{metaAccountId}}' }),
          metaExample('Unhide owned comment', 'DELETE', '/inbox/comments/{{nativePostId}}/{{commentId}}/hide?accountId={{metaAccountId}}', 'inbox:write. Refresh native comments after uncertain results.'),
          metaExample('Delete owned native comment', 'DELETE', '/inbox/comments/{{nativePostId}}?accountId={{metaAccountId}}&commentId={{commentId}}', 'inbox:write. Deletes the native comment only when provider permissions allow.'),
          metaExample('Request Meta thread control', 'POST', '/inbox/conversations/{{conversationId}}/thread-control', 'inbox:write. request remains pending. Instagram take/request require Facebook Login. Other actions: pass with targetAppId, take, release; confirmed ownership requires canonical refresh.', { accountId: '{{metaAccountId}}', action: 'request' }),
          {
            name: 'CRM Contacts Directory (/contacts)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/contacts', host: ['{{baseUrl}}'], path: ['contacts'] },
            },
          },
          {
            name: 'Create CRM Contact (/contacts)',
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
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    phone: '+14155552671',
                    tags: ['vip', 'lead'],
                  },
                  null,
                  2
                ),
              },
              url: { raw: '{{baseUrl}}/contacts', host: ['{{baseUrl}}'], path: ['contacts'] },
            },
          },
          {
            name: 'List Workflows (/workflows)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/workflows', host: ['{{baseUrl}}'], path: ['workflows'] },
            },
          },
        ],
      },
      {
        name: '4. Analytics & Insights',
        item: [
          {
            name: 'Best Time to Post (/analytics/best-times)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/analytics/best-times', host: ['{{baseUrl}}'], path: ['analytics', 'best-times'] },
            },
          },
          {
            name: 'Inbox Response Times & Volume (/inbox-analytics)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/inbox-analytics', host: ['{{baseUrl}}'], path: ['inbox-analytics'] },
            },
          },
        ],
      },
      {
        name: '5. Advertising (8 Networks)',
        item: [
          {
            name: 'Create Click-to-WhatsApp Ad (/ads/ctwa)',
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
                    accountId: 'acc_meta_01',
                    adAccountId: 'act_12345678',
                    name: 'Spring WhatsApp Promo',
                    headline: 'Chat With Our Team on WhatsApp',
                    body: 'Get instant 20% off your first order.',
                    dailyBudget: 25.0,
                  },
                  null,
                  2
                ),
              },
              url: { raw: '{{baseUrl}}/ads/ctwa', host: ['{{baseUrl}}'], path: ['ads', 'ctwa'] },
            },
          },
          {
            name: 'Search Ad Library Archives (/ads/library)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: {
                raw: '{{baseUrl}}/ads/library?q=saas',
                host: ['{{baseUrl}}'],
                path: ['ads', 'library'],
                query: [{ key: 'q', value: 'saas' }],
              },
            },
          },
        ],
      },
      {
        name: '6. Platform APIs',
        item: [
          {
            name: 'List Blog Articles (/blogs)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/blogs', host: ['{{baseUrl}}'], path: ['blogs'] },
            },
          },
          {
            name: 'Unified Store Products (/commerce/products)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/commerce/products', host: ['{{baseUrl}}'], path: ['commerce', 'products'] },
            },
          },
        ],
      },
      {
        name: '7. Cloud Telephony & Voice',
        item: [
          {
            name: 'Search Virtual Numbers (/phone-numbers/available)',
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
            name: 'Send Turnkey Verify OTP (/verify)',
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
                    to: '+14155552671',
                    channel: 'sms',
                    brandName: 'Asra3',
                  },
                  null,
                  2
                ),
              },
              url: { raw: '{{baseUrl}}/verify', host: ['{{baseUrl}}'], path: ['verify'] },
            },
          },
          {
            name: 'WebRTC Browser Dialer Token (/voice/browser-token)',
            request: {
              method: 'POST',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/voice/browser-token', host: ['{{baseUrl}}'], path: ['voice', 'browser-token'] },
            },
          },
        ],
      },
      {
        name: '8. Settings & Administration',
        item: [
          metaExample('Read Messenger greeting', 'GET', '/accounts/{{metaAccountId}}/messenger-greeting', 'accounts:read. Canonical provider data[]; empty means unset.'),
          metaExample('Replace Messenger greeting', 'PUT', '/accounts/{{metaAccountId}}/messenger-greeting', 'accounts:write. Facebook Page only; default locale required, 160-character greeting.', { greeting: [{ locale: 'default', text: 'Welcome. How can we help?' }] }),
          metaExample('Replace Messenger menu', 'PUT', '/accounts/{{metaAccountId}}/messenger-menu', 'accounts:write. Up to 3 top-level items, one nesting level with up to 5 items; HTTP(S) links without credentials.', { persistent_menu: [{ locale: 'default', composer_input_disabled: false, call_to_actions: [{ type: 'postback', title: 'Support', payload: 'SUPPORT' }] }] }),
          metaExample('Replace Messenger ice breakers', 'PUT', '/accounts/{{metaAccountId}}/messenger-ice-breakers', 'accounts:write. Localized groups, up to 4 questions, 80 characters each.', { ice_breakers: [{ locale: 'default', call_to_actions: [{ question: 'How can I contact support?', payload: 'SUPPORT' }] }] }),
          metaExample('Replace Instagram ice breakers', 'PUT', '/accounts/{{instagramAccountId}}/instagram-ice-breakers', 'accounts:write. Instagram professional account; flat list of up to 4 questions.', { ice_breakers: [{ question: 'How can I contact support?', payload: 'SUPPORT' }] }),
          metaExample('Reset Messenger greeting', 'DELETE', '/accounts/{{metaAccountId}}/messenger-greeting', 'accounts:write. GET/DELETE also apply to the other selected canonical setting paths; refresh after uncertainty.'),
          {
            name: 'Account Groups — unavailable (HTTP 501)',
            request: {
              method: 'GET',
              description: 'Account groups are coming soon. This release returns HTTP 501 without reading or changing groups.',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/account-groups', host: ['{{baseUrl}}'], path: ['account-groups'] },
            },
          },
          {
            name: 'Register Outbound Webhook (/webhooks)',
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
                    url: 'https://api.yourcompany.com/webhooks',
                    events: ['post.published', 'message.received', 'verification.completed'],
                  },
                  null,
                  2
                ),
              },
              url: { raw: '{{baseUrl}}/webhooks', host: ['{{baseUrl}}'], path: ['webhooks'] },
            },
          },
        ],
      },
    ],
  };
}
