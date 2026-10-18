/**
 * Zernio REST API v1 — OpenAPI 3.1.0 & Postman 2.1.0 Specification Module
 * File: src/lib/zernio/openapi-spec.ts
 *
 * Full OpenAPI 3.1.0 specification and Postman collection covering all 100 operations
 * across all 8 Zernio resource families:
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
  return {
    openapi: '3.1.0',
    info: {
      title: 'Techurity & Zernio Unified Social, Telephony, Ads & Commerce REST API',
      version: '1.5.0',
      description:
        'Official OpenAPI 3.1.0 specification for Techurity (powered by Zernio). Complete parity across all 8 Zernio resource families: Core, Publishing & Queue, Unified Inbox & CRM, Analytics, Advertising (8 Networks), Platform APIs (Blogs & Commerce), Cloud Telephony (Virtual Numbers, WhatsApp, Voice AI, SMS, RCS, Verify), and Settings & Administration.',
      contact: {
        name: 'Techurity API Engineering',
        url: `${baseUrl}/docs`,
      },
    },
    servers: [
      { url: `${baseUrl}/api/v1`, description: 'Current Environment Gateway' },
      { url: 'https://techurity.si/api/v1', description: 'Production Global Edge' },
    ],
    tags: [
      {
        name: 'Core & Social Connect',
        description: 'Workspace telemetry, brand profiles, connected accounts (18 platforms), token health probes, and headless OAuth selection.',
      },
      {
        name: 'Publishing & Queue',
        description: 'Cross-platform post publishing, 24h content-hash duplicate protection, recurring weekly queue slots, media presign, and pre-flight validation.',
      },
      {
        name: 'Unified Inbox & CRM',
        description: 'Omnichannel DMs across 18 networks, comments, reviews, mentions, CRM contacts & custom fields, broadcasts, sequences, and ManyChat-style visual workflows.',
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
        description: 'Account groups, Facebook/Instagram/Telegram ice-breakers & menus, developer API keys, and outbound webhooks with HMAC-SHA256 signatures.',
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
          summary: 'List all connected social & messaging channels (18 platforms)',
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
        delete: { tags: ['Core & Social Connect'], summary: 'Disconnect account', responses: { '200': { description: 'Account disconnected' } } },
      },
      '/accounts/{accountId}/health': {
        get: {
          tags: ['Core & Social Connect'],
          summary: 'Live token probe, permissions check, and WhatsApp connection diagnostic',
          responses: { '200': { description: 'Diagnostic status' } },
        },
      },
      '/connect/{platform}': {
        get: { tags: ['Core & Social Connect'], summary: 'Initiate OAuth connect flow', responses: { '200': { description: 'OAuth URL' } } },
        post: { tags: ['Core & Social Connect'], summary: 'Connect platform credentials', responses: { '200': { description: 'Connected account' } } },
      },
      '/connect/{platform}/select': {
        get: { tags: ['Core & Social Connect'], summary: 'List selectable entities (Pages, IG accounts, etc.)', responses: { '200': { description: 'Selectable items' } } },
        post: { tags: ['Core & Social Connect'], summary: 'Select and bind entity to workspace', responses: { '200': { description: 'Entity bound' } } },
      },

      // 2. Publishing & Queue
      '/posts': {
        get: {
          tags: ['Publishing & Queue'],
          summary: 'List published and scheduled posts',
          responses: { '200': { description: 'Posts array' } },
        },
        post: {
          tags: ['Publishing & Queue'],
          summary: 'Create, schedule, or publish a multi-platform post with 24h duplicate protection & Idempotency-Key replay',
          parameters: [{ name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string' },
                    platforms: { type: 'array', items: { type: 'object' } },
                    publishNow: { type: 'boolean' },
                    scheduledFor: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Post created/scheduled' },
            '200': { description: 'Idempotent post replay' },
            '409': { description: 'Duplicate post rejected within 24h' },
          },
        },
      },
      '/posts/{postId}': {
        get: { tags: ['Publishing & Queue'], summary: 'Get post status and platform URLs', responses: { '200': { description: 'Post details' } } },
        put: { tags: ['Publishing & Queue'], summary: 'Edit draft or scheduled post', responses: { '200': { description: 'Post updated' } } },
        delete: { tags: ['Publishing & Queue'], summary: 'Delete post', responses: { '200': { description: 'Post deleted' } } },
      },
      '/posts/sync-external': {
        post: { tags: ['Publishing & Queue'], summary: 'On-demand sync of externally published posts', responses: { '200': { description: 'Sync triggered' } } },
      },
      '/queue/slots': {
        get: { tags: ['Publishing & Queue'], summary: 'Read recurring weekly queue slots', responses: { '200': { description: 'Queue slots' } } },
        post: { tags: ['Publishing & Queue'], summary: 'Configure recurring weekly queue slots', responses: { '201': { description: 'Slots configured' } } },
        delete: { tags: ['Publishing & Queue'], summary: 'Clear queue slots', responses: { '200': { description: 'Slots cleared' } } },
      },
      '/queue/preview': {
        get: { tags: ['Publishing & Queue'], summary: 'Preview upcoming calendar queue assignments across next N days', responses: { '200': { description: 'Upcoming slot preview' } } },
      },
      '/media/presign': {
        post: {
          tags: ['Publishing & Queue'],
          summary: 'Generate direct upload URL and public CDN URL for media',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { filename: { type: 'string' }, contentType: { type: 'string' } } } } } },
          responses: { '200': { description: 'Presigned upload URL' } },
        },
      },
      '/validate/post': {
        post: {
          tags: ['Publishing & Queue'],
          summary: 'Pre-flight validation of post text and media limits per target network',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { content: { type: 'string' }, platforms: { type: 'array', items: { type: 'object' } } } } } } },
          responses: { '200': { description: 'Validation outcome' } },
        },
      },
      '/validate/media': {
        post: {
          tags: ['Publishing & Queue'],
          summary: 'Pre-flight media validation (aspect ratio, duration, format, size)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, type: { type: 'string' } } } } } },
          responses: { '200': { description: 'Media validation outcome' } },
        },
      },

      // 3. Unified Inbox & CRM
      '/inbox/conversations': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List omnichannel DM conversations', responses: { '200': { description: 'Conversations' } } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Start conversation or send initial message', responses: { '201': { description: 'Conversation started' } } },
      },
      '/inbox/conversations/search': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'Search conversations by text and contact', responses: { '200': { description: 'Search results' } } },
      },
      '/inbox/conversations/{conversationId}': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'Get conversation metadata', responses: { '200': { description: 'Conversation details' } } },
        patch: { tags: ['Unified Inbox & CRM'], summary: 'Update conversation status', responses: { '200': { description: 'Conversation updated' } } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Delete conversation', responses: { '200': { description: 'Conversation deleted' } } },
      },
      '/inbox/conversations/{conversationId}/messages': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List conversation messages', responses: { '200': { description: 'Messages list' } } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Send message reply with Idempotency-Key', responses: { '201': { description: 'Message sent' } } },
      },
      '/inbox/conversations/{conversationId}/messages/{messageId}': {
        patch: { tags: ['Unified Inbox & CRM'], summary: 'Edit message text', responses: { '200': { description: 'Message edited' } } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Delete or unsend message', responses: { '200': { description: 'Message deleted' } } },
      },
      '/inbox/conversations/{conversationId}/messages/{messageId}/reactions': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Add emoji reaction to message', responses: { '200': { description: 'Reaction added' } } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Remove emoji reaction', responses: { '200': { description: 'Reaction removed' } } },
      },
      '/inbox/conversations/{conversationId}/messages/{messageId}/attachments/{attachmentIndex}': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'Resolve attachment signed media URL', responses: { '200': { description: 'Media URL' } } },
      },
      '/inbox/conversations/{conversationId}/read': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Mark messages as read (sends blue checkmarks)', responses: { '200': { description: 'Marked read' } } },
      },
      '/inbox/conversations/{conversationId}/typing': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Send typing indicator', responses: { '200': { description: 'Typing sent' } } },
      },
      '/inbox/conversations/{conversationId}/accept': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Accept message request into primary inbox', responses: { '200': { description: 'Request accepted' } } },
      },
      '/inbox/conversations/{conversationId}/handover': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Meta Handover Protocol (switch between bot/AI and human agent)', responses: { '200': { description: 'Handover complete' } } },
      },
      '/inbox/media/upload': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Upload media attachment for DM', responses: { '200': { description: 'Uploaded media' } } },
      },
      '/inbox/comments': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'List post comments across platforms', responses: { '200': { description: 'Comments list' } } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Post top-level comment or public reply', responses: { '201': { description: 'Comment posted' } } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Delete comment', responses: { '200': { description: 'Comment deleted' } } },
      },
      '/inbox/comments/{commentId}/reply': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Send public comment reply or private DM reply', responses: { '201': { description: 'Reply posted' } } },
      },
      '/inbox/comments/{commentId}/hide': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Hide or unhide comment', responses: { '200': { description: 'Visibility updated' } } },
      },
      '/inbox/comments/{commentId}/like': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Like or unlike comment', responses: { '200': { description: 'Like toggled' } } },
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
        get: { tags: ['Unified Inbox & CRM'], summary: 'List broadcast campaigns', responses: { '200': { description: 'Broadcasts list' } } },
        post: { tags: ['Unified Inbox & CRM'], summary: 'Create bulk WhatsApp/SMS/DM broadcast campaign', responses: { '201': { description: 'Broadcast created' } } },
      },
      '/broadcasts/{broadcastId}': {
        get: { tags: ['Unified Inbox & CRM'], summary: 'Get broadcast status and delivery metrics', responses: { '200': { description: 'Broadcast status' } } },
        delete: { tags: ['Unified Inbox & CRM'], summary: 'Delete broadcast', responses: { '200': { description: 'Broadcast deleted' } } },
      },
      '/broadcasts/{broadcastId}/send': {
        post: { tags: ['Unified Inbox & CRM'], summary: 'Trigger immediate dispatch of broadcast campaign', responses: { '200': { description: 'Broadcast dispatched' } } },
      },
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
        get: { tags: ['Cloud Telephony & Voice'], summary: 'Search virtual phone numbers across 55+ countries', responses: { '200': { description: 'Available numbers' } } },
      },
      '/phone-numbers': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List owned virtual phone numbers in workspace', responses: { '200': { description: 'Owned numbers' } } },
      },
      '/phone-numbers/buy': {
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Provision virtual phone number (deducts from Telecom Wallet)', responses: { '201': { description: 'Number provisioned' } } },
      },
      '/phone-numbers/{numberId}': {
        delete: { tags: ['Cloud Telephony & Voice'], summary: 'Release owned phone number', responses: { '200': { description: 'Number released' } } },
      },
      '/phone-numbers/porting': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List phone number porting requests', responses: { '200': { description: 'Porting requests' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Submit request to port phone number into Zernio', responses: { '201': { description: 'Porting request submitted' } } },
      },
      '/verify': {
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Send turnkey OTP phone verification code via SMS or WhatsApp', responses: { '201': { description: 'Verification sent' } } },
      },
      '/verify/check': {
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Check verification OTP submitted by user', responses: { '200': { description: 'Check outcome' } } },
      },
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
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Request WhatsApp Business Cloud API verification OTP', responses: { '200': { description: 'OTP requested' } } },
      },
      '/whatsapp/verify-otp': {
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Verify OTP to activate Official WhatsApp WABA', responses: { '200': { description: 'WhatsApp activated' } } },
      },
      '/whatsapp/templates': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List approved WhatsApp templates', responses: { '200': { description: 'Templates list' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Submit WhatsApp template to Meta for approval', responses: { '201': { description: 'Template submitted' } } },
        delete: { tags: ['Cloud Telephony & Voice'], summary: 'Delete WhatsApp template', responses: { '200': { description: 'Template deleted' } } },
      },
      '/whatsapp/flows': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'List interactive native WhatsApp Flows', responses: { '200': { description: 'Flows list' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Create interactive WhatsApp Flow', responses: { '201': { description: 'Flow created' } } },
      },
      '/whatsapp/messages': {
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Send WhatsApp Cloud API message or template', responses: { '201': { description: 'WhatsApp message sent' } } },
      },
      '/business-agent': {
        get: { tags: ['Cloud Telephony & Voice'], summary: 'Get Meta Business AI Agent status on WhatsApp', responses: { '200': { description: 'Agent status' } } },
        post: { tags: ['Cloud Telephony & Voice'], summary: 'Configure & toggle Meta Business AI Agent on connected number', responses: { '200': { description: 'Agent configured' } } },
      },

      // 8. Settings & Administration
      '/account-groups': {
        get: { tags: ['Settings & Administration'], summary: 'List cross-posting account groups', responses: { '200': { description: 'Account groups' } } },
        post: { tags: ['Settings & Administration'], summary: 'Create cross-posting account group', responses: { '201': { description: 'Group created' } } },
      },
      '/account-groups/{id}': {
        put: { tags: ['Settings & Administration'], summary: 'Update account group', responses: { '200': { description: 'Group updated' } } },
        delete: { tags: ['Settings & Administration'], summary: 'Delete account group', responses: { '200': { description: 'Group deleted' } } },
      },
      '/accounts/{accountId}/messenger-menu': {
        get: { tags: ['Settings & Administration'], summary: 'Get Facebook Messenger persistent menu', responses: { '200': { description: 'Menu' } } },
        put: { tags: ['Settings & Administration'], summary: 'Update Messenger persistent menu', responses: { '200': { description: 'Menu updated' } } },
        delete: { tags: ['Settings & Administration'], summary: 'Delete Messenger persistent menu', responses: { '200': { description: 'Menu deleted' } } },
      },
      '/accounts/{accountId}/messenger-ice-breakers': {
        get: { tags: ['Settings & Administration'], summary: 'Get Facebook Messenger ice breakers', responses: { '200': { description: 'Ice breakers' } } },
        put: { tags: ['Settings & Administration'], summary: 'Update Messenger ice breakers', responses: { '200': { description: 'Ice breakers updated' } } },
        delete: { tags: ['Settings & Administration'], summary: 'Delete Messenger ice breakers', responses: { '200': { description: 'Ice breakers deleted' } } },
      },
      '/accounts/{accountId}/messenger-greeting': {
        get: { tags: ['Settings & Administration'], summary: 'Get Facebook Messenger greeting text', responses: { '200': { description: 'Greeting' } } },
        put: { tags: ['Settings & Administration'], summary: 'Update Messenger greeting text', responses: { '200': { description: 'Greeting updated' } } },
        delete: { tags: ['Settings & Administration'], summary: 'Delete Messenger greeting text', responses: { '200': { description: 'Greeting deleted' } } },
      },
      '/accounts/{accountId}/instagram-ice-breakers': {
        get: { tags: ['Settings & Administration'], summary: 'Get Instagram Direct ice breakers', responses: { '200': { description: 'Instagram ice breakers' } } },
        put: { tags: ['Settings & Administration'], summary: 'Update Instagram Direct ice breakers', responses: { '200': { description: 'Instagram ice breakers updated' } } },
        delete: { tags: ['Settings & Administration'], summary: 'Delete Instagram Direct ice breakers', responses: { '200': { description: 'Instagram ice breakers deleted' } } },
      },
      '/accounts/{accountId}/telegram-commands': {
        get: { tags: ['Settings & Administration'], summary: 'Get Telegram bot commands', responses: { '200': { description: 'Commands' } } },
        put: { tags: ['Settings & Administration'], summary: 'Update Telegram bot slash commands', responses: { '200': { description: 'Commands updated' } } },
        delete: { tags: ['Settings & Administration'], summary: 'Delete Telegram bot commands', responses: { '200': { description: 'Commands deleted' } } },
      },
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
  return {
    info: {
      name: 'Techurity & Zernio REST API v1 — Official Postman Collection',
      description:
        'Complete Postman Collection v2.1.0 covering all 8 Zernio resource families: Core, Publishing & Queue, Unified Inbox & CRM, Analytics, Advertising, Platform APIs, Cloud Telephony & Voice, and Settings & Administration.',
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
            name: 'Create Post with Duplicate Check (/posts)',
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
                    platforms: ['instagram', 'linkedin', 'x'],
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
                    profileId: 'prof_default',
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
          {
            name: 'Pre-Flight Post Validation (/validate/post)',
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
                    content: 'Check out our new features!',
                    platforms: [{ platform: 'x' }, { platform: 'linkedin' }],
                  },
                  null,
                  2
                ),
              },
              url: { raw: '{{baseUrl}}/validate/post', host: ['{{baseUrl}}'], path: ['validate', 'post'] },
            },
          },
        ],
      },
      {
        name: '3. Unified Inbox & CRM',
        item: [
          {
            name: 'List Inbox Comments (/inbox/comments)',
            request: {
              method: 'GET',
              header: [{ key: 'Authorization', value: 'Bearer {{apiKey}}' }],
              url: { raw: '{{baseUrl}}/inbox/comments', host: ['{{baseUrl}}'], path: ['inbox', 'comments'] },
            },
          },
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
                    profileId: 'prof_default',
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
                    brandName: 'Techurity',
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
          {
            name: 'List Account Groups (/account-groups)',
            request: {
              method: 'GET',
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
