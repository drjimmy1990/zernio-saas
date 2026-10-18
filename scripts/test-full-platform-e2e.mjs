#!/usr/bin/env node
/**
 * scripts/test-full-platform-e2e.mjs
 * Comprehensive automated end-to-end test suite for Zernio SaaS Platform.
 * 
 * Verifies:
 * 1. OpenAPI 3.1 & Postman 2.1 specs (Group 0)
 * 2. All 8 Zernio resource families (Groups 1 - 7):
 *    - Core, Connect & Platform Account Settings
 *    - Publishing, Queue Scheduling & Pre-Flight Validation
 *    - Unified Inbox, CRM Contacts, Custom Fields, Broadcasts, Sequences & Visual Workflows
 *    - Cloud Telephony, Virtual Numbers, WhatsApp Cloud, Voice AI, SMS, RCS & Turnkey Verify OTP
 *    - Advertising (8 Networks), CTWA, Call Ads, Audiences, Lead Gen Forms & CAPI Conversions
 *    - Platform APIs: Blogs (WordPress/Shopify), Google Business Profile, and E-Commerce (Products, Orders, Discounts)
 *    - Advanced Analytics: Best Time to Post Heatmap, Content Decay, and Inbox SLAs
 * 3. Dual Authentication & Comprehensive Error Handling (Group 8):
 *    - Bearer Token authentication (tk_live_...)
 *    - Session Cookie authentication (asra3_session=...)
 *    - 401 Unauthorized (missing auth & invalid token)
 *    - 400 Bad Request (malformed JSON, validation failure, invalid phone, active workflow immutability guard)
 *    - 404 Not Found (non-existent account health, non-existent workflow)
 *    - 409 Conflict (24h duplicate post protection with existingPostId)
 * 4. Clean State Reset & Teardown (Group 9):
 *    - POST /api/v1/workspaces/reset
 *    - Strict assertion: .data/workspaces.json exists, readable, and is strictly 22 bytes {"workspaces":{}}.
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const RUN_ID = Date.now().toString(36);
const TEST_API_KEY = process.env.TEST_API_KEY || `tk_live_e2e_${RUN_ID}`;
const VERBOSE = process.env.VERBOSE === 'true';

let passed = 0;
let failed = 0;
const results = [];

function record(name, ok, details = '') {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}${details ? ` (${details})` : ''}`);
    results.push({ name, ok: true, details });
  } else {
    failed++;
    console.error(`  ✗ ${name}: FAILED${details ? ` - ${details}` : ''}`);
    results.push({ name, ok: false, details });
  }
}

async function request(method, endpoint, body = null, extraHeaders = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  // If no auth header or cookie explicitly passed in extraHeaders, default to test bearer token
  const hasAuthExplicit = Object.keys(extraHeaders).some(
    (k) => k.toLowerCase() === 'authorization' || k.toLowerCase() === 'cookie'
  );
  if (!hasAuthExplicit) {
    headers['Authorization'] = `Bearer ${TEST_API_KEY}`;
  }

  // Remove keys with empty string to simulate omitted headers if needed
  for (const [k, v] of Object.entries(headers)) {
    if (v === '') delete headers[k];
  }

  const init = {
    method,
    headers,
  };

  if (body !== null && body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(url, init);
  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, headers: res.headers, data: json };
}

async function main() {
  console.log(`========================================================================`);
  console.log(`🚀 Zernio Full-Platform E2E Automated Verification Suite`);
  console.log(`Target: ${BASE_URL} | Auth: Dual Auth (Bearer: ${TEST_API_KEY} + Session Cookie)`);
  console.log(`========================================================================\n`);

  try {
    // ------------------------------------------------------------------------
    // PRE-FLIGHT: CLEAN STATE INITIALIZATION
    // ------------------------------------------------------------------------
    await fetch(`${BASE_URL}/api/v1/workspaces/reset`, { method: 'POST' }).catch(() => {});

    // ------------------------------------------------------------------------
    // GROUP 0: SPECIFICATIONS (OpenAPI 3.1 & Postman 2.1)
    // ------------------------------------------------------------------------
    console.log(`[Group 0] Specifications (OpenAPI 3.1 & Postman 2.1)`);
    const openapiRes = await request('GET', '/api/v1/openapi.json', null, { Authorization: '' });
    const pathCount = Object.keys(openapiRes.data.paths || {}).length;
    record(
      'GET /api/v1/openapi.json returns valid OpenAPI 3.1 with >=100 paths',
      openapiRes.status === 200 && openapiRes.data.openapi?.startsWith('3.1.') && pathCount >= 100,
      `v${openapiRes.data.openapi}, ${pathCount} paths`
    );

    const postmanRes = await request('GET', '/api/v1/postman.json', null, { Authorization: '' });
    const folderCount = (postmanRes.data.item || []).length;
    record(
      'GET /api/v1/postman.json returns valid Postman 2.1 collection with >=8 resource groups',
      postmanRes.status === 200 && postmanRes.data.info?.schema?.includes('v2.1.0') && folderCount >= 8,
      `${folderCount} resource folders`
    );

    // ------------------------------------------------------------------------
    // GROUP 1: CORE, CONNECT & PLATFORM ACCOUNT SETTINGS
    // ------------------------------------------------------------------------
    console.log(`\n[Group 1] Core, Connect & Platform Account Settings`);
    const meRes = await request('GET', '/api/v1/me');
    record(
      'GET /api/v1/me returns workspace identity, plan quotas & telecom wallet',
      meRes.status === 200 && meRes.data.success && meRes.data.data?.workspace?.planKey !== undefined
    );

    const accountsHealthRes = await request('GET', '/api/v1/accounts/health');
    record(
      'GET /api/v1/accounts/health returns aggregate platform connection health',
      accountsHealthRes.status === 200 && accountsHealthRes.data.summary !== undefined
    );

    const connectAccRes = await request('POST', '/api/v1/connect/facebook', {
      username: '@asra3_official',
      displayName: 'Asra3 Cloud (Facebook)',
    });
    const connectedAccId = connectAccRes.data.data?.id || 'acc_fb_primary';
    record(
      'POST /api/v1/connect/{platform} connects social channel account',
      (connectAccRes.status === 201 || connectAccRes.status === 200) && connectAccRes.data.data?.platform === 'facebook',
      `acc: ${connectedAccId}`
    );

    const singleHealthRes = await request('GET', `/api/v1/accounts/${connectedAccId}/health`);
    record(
      'GET /api/v1/accounts/{id}/health performs live diagnostic probe',
      singleHealthRes.status === 200 && singleHealthRes.data.platformConnection !== undefined
    );

    const createGroupRes = await request('POST', '/api/v1/account-groups', {
      profileId: 'prf_default',
      name: 'Global Cross-Posting Hub',
      accountIds: ['acc_tw_01', 'acc_li_01', 'acc_ig_01'],
      color: '#0066FF',
    });
    const groupId = createGroupRes.data.accountGroup?.id;
    record(
      'POST /api/v1/account-groups creates cross-posting group',
      createGroupRes.status === 201 && groupId
    );

    const listGroupsRes = await request('GET', '/api/v1/account-groups?profileId=prf_default');
    record(
      'GET /api/v1/account-groups lists account groups for profile',
      listGroupsRes.status === 200 && (listGroupsRes.data.accountGroups || []).length > 0
    );

    const updateGroupRes = await request('PUT', `/api/v1/account-groups/${groupId}`, {
      name: 'Global Cross-Posting Hub (Updated)',
    });
    record(
      'PUT /api/v1/account-groups/{id} updates account group details',
      updateGroupRes.status === 200 && updateGroupRes.data.accountGroup?.name.includes('Updated')
    );

    const deleteGroupRes = await request('DELETE', `/api/v1/account-groups/${groupId}`);
    record(
      'DELETE /api/v1/account-groups/{id} removes account group',
      deleteGroupRes.status === 200 && deleteGroupRes.data.deleted === true
    );

    const menuRes = await request('PUT', '/api/v1/accounts/acc_fb_01/messenger-menu', {
      persistent_menu: [{
        locale: 'default',
        call_to_actions: [{ type: 'postback', title: 'Main Menu', payload: 'MENU_MAIN' }]
      }]
    });
    record(
      'PUT /api/v1/accounts/{id}/messenger-menu configures persistent menu',
      menuRes.status === 200 && menuRes.data.success === true
    );

    const iceRes = await request('PUT', '/api/v1/accounts/acc_fb_01/messenger-ice-breakers', {
      ice_breakers: [{ locale: 'default', call_to_actions: [{ question: 'How do I place an order?', payload: 'FAQ_ORDER' }] }]
    });
    record(
      'PUT /api/v1/accounts/{id}/messenger-ice-breakers sets welcome prompts',
      iceRes.status === 200 && iceRes.data.success === true
    );

    const greetRes = await request('PUT', '/api/v1/accounts/acc_fb_01/messenger-greeting', {
      greeting: [{ locale: 'default', text: 'Welcome to our official customer service!' }]
    });
    record(
      'PUT /api/v1/accounts/{id}/messenger-greeting sets greeting text',
      greetRes.status === 200 && greetRes.data.success === true
    );

    const igIceRes = await request('PUT', '/api/v1/accounts/acc_ig_01/instagram-ice-breakers', {
      ice_breakers: [{ question: 'What are your working hours?' }]
    });
    record(
      'PUT /api/v1/accounts/{id}/instagram-ice-breakers sets IG DM ice-breakers',
      igIceRes.status === 200 && igIceRes.data.success === true
    );

    const tgCmdRes = await request('PUT', '/api/v1/accounts/acc_tg_01/telegram-commands', {
      commands: [{ command: 'start', description: 'Start conversation' }, { command: 'help', description: 'Show assistance' }]
    });
    record(
      'PUT /api/v1/accounts/{id}/telegram-commands sets bot commands',
      tgCmdRes.status === 200 && tgCmdRes.data.success === true
    );

    const selectRes = await request('POST', '/api/v1/connect/meta/select', {
      profileId: 'prf_default',
      entityId: 'page_123456789',
      entityType: 'page',
      tempToken: 'tmp_auth_secret_999',
      userProfile: { id: 'usr_meta', name: 'John Doe' },
    });
    record(
      'POST /api/v1/connect/{platform}/select performs headless OAuth entity selection',
      selectRes.status === 200 && selectRes.data.account !== undefined
    );

    // ------------------------------------------------------------------------
    // GROUP 2: PUBLISHING, QUEUE & PRE-FLIGHT VALIDATION
    // ------------------------------------------------------------------------
    console.log(`\n[Group 2] Publishing, Queue Scheduling & Pre-Flight Validation`);
    const presignRes = await request('POST', '/api/v1/media/presign', {
      filename: 'hero-banner.jpg',
      contentType: 'image/jpeg',
    });
    record(
      'POST /api/v1/media/presign mints upload and public media URLs',
      presignRes.status === 200 && presignRes.data.uploadUrl !== undefined
    );

    const validatePostRes = await request('POST', '/api/v1/validate/post', {
      content: 'Short valid tweet for X and LinkedIn',
      platforms: [{ platform: 'twitter' }, { platform: 'linkedin' }],
    });
    record(
      'POST /api/v1/validate/post validates character limits across networks',
      validatePostRes.status === 200 && validatePostRes.data.valid === true
    );

    const validateMediaRes = await request('POST', '/api/v1/validate/media', {
      url: presignRes.data.publicUrl || 'https://assets.zernio.com/banner.jpg',
      type: 'image',
    });
    record(
      'POST /api/v1/validate/media validates media format specifications',
      validateMediaRes.status === 200 && validateMediaRes.data.valid === true
    );

    const setSlotsRes = await request('POST', '/api/v1/queue/slots', {
      profileId: 'prf_default',
      name: 'Default Prime Slots',
      timezone: 'UTC',
      slots: [
        { dayOfWeek: 1, time: '09:00' },
        { dayOfWeek: 3, time: '14:30' },
        { dayOfWeek: 5, time: '18:00' },
      ],
    });
    record(
      'POST /api/v1/queue/slots configures recurring weekly slots',
      setSlotsRes.status === 201 && setSlotsRes.data.schedule !== undefined
    );

    const getSlotsRes = await request('GET', '/api/v1/queue/slots?profileId=prf_default');
    record(
      'GET /api/v1/queue/slots returns schedule and upcoming slots',
      getSlotsRes.status === 200 && (getSlotsRes.data.nextSlots || []).length > 0
    );

    const previewQueueRes = await request('GET', '/api/v1/queue/preview?profileId=prf_default&days=14');
    record(
      'GET /api/v1/queue/preview generates calendar slot forecast without fake synthesized posts',
      previewQueueRes.status === 200 && (previewQueueRes.data.upcomingSlots || []).length > 0
    );

    // Idempotency replay check
    const testPostContent = `Full Platform E2E Post Content ${Date.now()}`;
    const idemKey = `idem_e2e_${Date.now()}`;

    const post1Res = await request('POST', '/api/v1/posts', {
      content: testPostContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_e2e' }],
    }, { 'Idempotency-Key': idemKey });
    record(
      'POST /api/v1/posts creates multi-platform post with Idempotency-Key',
      post1Res.status === 201 && post1Res.data.data?.id !== undefined
    );

    const replayRes = await request('POST', '/api/v1/posts', {
      content: testPostContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_e2e' }],
    }, { 'Idempotency-Key': idemKey });
    const isReplayed = replayRes.headers.get('idempotent-replayed') === 'true';
    record(
      'POST /api/v1/posts replayed with same Idempotency-Key returns 201 with idempotent-replayed header',
      replayRes.status === 201 && isReplayed
    );

    // Cross-account post isolation
    const crossAccRes = await request('POST', '/api/v1/posts', {
      content: testPostContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_different_target' }],
    });
    record(
      'POST /api/v1/posts allows identical content to different target account (201 Created)',
      crossAccRes.status === 201 && crossAccRes.data.data?.id !== undefined
    );

    // List posts
    const listPostsRes = await request('GET', '/api/v1/posts');
    record(
      'GET /api/v1/posts lists published and scheduled posts',
      listPostsRes.status === 200 && (listPostsRes.data.posts || listPostsRes.data.data)?.length > 0
    );

    // ------------------------------------------------------------------------
    // GROUP 3: UNIFIED INBOX, CRM, BROADCASTS, SEQUENCES & WORKFLOWS
    // ------------------------------------------------------------------------
    console.log(`\n[Group 3] Unified Inbox, Social CRM, Broadcasts, Sequences & Workflows`);
    const convRes = await request('POST', '/api/v1/inbox/conversations', {
      platform: 'whatsapp',
      participantId: '+14155550188',
      participantName: 'Alice Customer',
      category: 'utility',
      message: 'Hello, I have an inquiry about pricing.',
    });
    const convId = convRes.data.data?.conversation?.id || convRes.data.conversation?.id || convRes.data.id;
    record(
      'POST /api/v1/inbox/conversations initiates omnichannel thread',
      (convRes.status === 201 || convRes.status === 200) && Boolean(convId)
    );

    const listConvRes = await request('GET', '/api/v1/inbox/conversations');
    const conversationsList = listConvRes.data.data || listConvRes.data.conversations || [];
    record(
      'GET /api/v1/inbox/conversations lists active conversations',
      listConvRes.status === 200 && Array.isArray(conversationsList) && conversationsList.length > 0
    );

    if (convId) {
      const sendMsgRes = await request('POST', `/api/v1/inbox/conversations/${convId}/messages`, {
        text: 'Glad to assist you! Our basic plan starts at $49/mo.',
      });
      record(
        'POST /api/v1/inbox/conversations/{id}/messages sends message into thread',
        (sendMsgRes.status === 201 || sendMsgRes.status === 200) && (sendMsgRes.data.data?.message !== undefined || sendMsgRes.data.message !== undefined)
      );

      const listMsgsRes = await request('GET', `/api/v1/inbox/conversations/${convId}/messages`);
      const msgList = Array.isArray(listMsgsRes.data.data) ? listMsgsRes.data.data : (listMsgsRes.data.messages || []);
      record(
        'GET /api/v1/inbox/conversations/{id}/messages fetches conversation message history',
        listMsgsRes.status === 200 && Array.isArray(msgList) && msgList.length > 0
      );
    }

    const commentRes = await request('POST', '/api/v1/inbox/comments', {
      accountId: 'acc_fb_01',
      postId: 'post_hero_01',
      text: 'What are the delivery terms?',
    });
    const cmtId = commentRes.data.comment?.id;
    record(
      'POST /api/v1/inbox/comments posts public top-level comment',
      commentRes.status === 201 && cmtId
    );

    const listCommentsRes = await request('GET', '/api/v1/inbox/comments');
    record(
      'GET /api/v1/inbox/comments lists post comments',
      listCommentsRes.status === 200 && (listCommentsRes.data.comments || []).length > 0
    );

    const replyCommentRes = await request('POST', `/api/v1/inbox/comments/${cmtId}/reply`, {
      text: 'Instant electronic delivery upon checkout.',
      isPrivate: false,
    });
    record(
      'POST /api/v1/inbox/comments/{id}/reply posts public reply to comment',
      replyCommentRes.status === 201 && replyCommentRes.data.replyId !== undefined
    );

    const hideCommentRes = await request('POST', `/api/v1/inbox/comments/${cmtId}/hide`, { hide: true });
    record(
      'POST /api/v1/inbox/comments/{id}/hide toggles comment visibility',
      hideCommentRes.status === 200 && hideCommentRes.data.isHidden === true
    );

    const likeCommentRes = await request('POST', `/api/v1/inbox/comments/${cmtId}/like`, {});
    record(
      'POST /api/v1/inbox/comments/{id}/like likes comment',
      likeCommentRes.status === 200 && likeCommentRes.data.liked === true
    );

    const deleteCommentRes = await request('DELETE', `/api/v1/inbox/comments/${cmtId}`);
    record(
      'DELETE /api/v1/inbox/comments/{id} deletes comment',
      deleteCommentRes.status === 200 && deleteCommentRes.data.deleted === true
    );

    const reviewRes = await request('POST', '/api/v1/inbox/reviews', {
      accountId: 'acc_gmb_01',
      authorName: 'David Miller',
      rating: 5,
      text: 'Exceptional cloud communication platform.',
    });
    const revId = reviewRes.data.review?.id;
    record(
      'POST /api/v1/inbox/reviews submits star review',
      reviewRes.status === 201 && revId
    );

    const listReviewsRes = await request('GET', '/api/v1/inbox/reviews?minRating=4');
    record(
      'GET /api/v1/inbox/reviews lists reviews filtered by rating',
      listReviewsRes.status === 200 && (listReviewsRes.data.reviews || []).length > 0
    );

    const replyReviewRes = await request('POST', `/api/v1/inbox/reviews/${revId}/reply`, {
      text: 'Thank you for your valuable feedback, David!',
    });
    record(
      'POST /api/v1/inbox/reviews/{id}/reply posts response to review',
      replyReviewRes.status === 200 && replyReviewRes.data.reply !== undefined
    );

    const mentionsRes = await request('GET', '/api/v1/inbox/mentions');
    record(
      'GET /api/v1/inbox/mentions lists brand mentions across networks',
      mentionsRes.status === 200 && mentionsRes.data.mentions !== undefined
    );

    // CRM Contacts & Custom Fields
    const customFieldRes = await request('POST', '/api/v1/custom-fields', {
      profileId: 'prf_default',
      name: 'Account Segment',
      type: 'text',
      description: 'SMB, Mid-Market, Enterprise',
    });
    const fieldId = customFieldRes.data.customField?.id;
    record(
      'POST /api/v1/custom-fields defines new contact custom field',
      customFieldRes.status === 201 && fieldId
    );

    const listFieldsRes = await request('GET', '/api/v1/custom-fields');
    record(
      'GET /api/v1/custom-fields lists defined fields',
      listFieldsRes.status === 200 && (listFieldsRes.data.customFields || []).length > 0
    );

    const contactRes = await request('POST', '/api/v1/contacts', {
      profileId: 'prf_default',
      name: 'Sherlock Holmes',
      email: 'sherlock@bakerstreet.co.uk',
      phone: '+447911987654',
      tags: ['investigator', 'vip'],
      customFields: { account_segment: 'Enterprise' },
    });
    const contactId = contactRes.data.contact?.id;
    record(
      'POST /api/v1/contacts creates unified CRM contact',
      contactRes.status === 201 && contactId
    );

    const listContactsRes = await request('GET', '/api/v1/contacts?search=Sherlock');
    record(
      'GET /api/v1/contacts searches contacts by query',
      listContactsRes.status === 200 && (listContactsRes.data.contacts || []).length > 0
    );

    const updateContactRes = await request('PATCH', `/api/v1/contacts/${contactId}`, {
      tags: ['investigator', 'vip', 'priority'],
    });
    record(
      'PATCH /api/v1/contacts/{id} updates contact tags and attributes',
      updateContactRes.status === 200 && updateContactRes.data.contact?.tags.includes('priority')
    );

    // Broadcasts & Sequences
    const broadcastRes = await request('POST', '/api/v1/broadcasts', {
      profileId: 'prf_default',
      name: 'Spring Promotional Blast',
      platform: 'whatsapp',
      message: 'Exclusive spring release offer: https://asra3.co/spring',
    });
    const broadcastId = broadcastRes.data.broadcast?.id;
    record(
      'POST /api/v1/broadcasts creates bulk broadcast campaign',
      broadcastRes.status === 201 && broadcastId
    );

    const sendBroadcastRes = await request('POST', `/api/v1/broadcasts/${broadcastId}/send`);
    record(
      'POST /api/v1/broadcasts/{id}/send triggers immediate broadcast dispatch',
      sendBroadcastRes.status === 200 && (sendBroadcastRes.data.status === 'sent' || sendBroadcastRes.data.status === 'sending')
    );

    const getBroadcastsRes = await request('GET', '/api/v1/broadcasts');
    const sentBroadcast = (getBroadcastsRes.data.broadcasts || []).find((b) => b.id === broadcastId);
    record(
      'GET /api/v1/broadcasts verifies broadcast dispatch status persisted',
      sentBroadcast && sentBroadcast.status === 'sent'
    );

    const sequenceRes = await request('POST', '/api/v1/sequences', {
      profileId: 'prf_default',
      name: 'Customer Onboarding Journey',
      platform: 'whatsapp',
      steps: [
        { stepNumber: 1, delayMinutes: 0, message: 'Welcome to Zernio! Step 1: verify your workspace.' },
        { stepNumber: 2, delayMinutes: 1440, message: 'Step 2: link your WhatsApp Business number.' },
      ],
    });
    const seqId = sequenceRes.data.sequence?.id;
    record(
      'POST /api/v1/sequences creates linear drip sequence',
      sequenceRes.status === 201 && seqId
    );

    const activateSeqRes = await request('POST', `/api/v1/sequences/${seqId}/activate`);
    record(
      'POST /api/v1/sequences/{id}/activate transitions sequence to active',
      activateSeqRes.status === 200 && activateSeqRes.data.sequence?.status === 'active'
    );

    const enrollSeqRes = await request('POST', `/api/v1/sequences/${seqId}/enroll`, {
      contactIds: [contactId],
    });
    record(
      'POST /api/v1/sequences/{id}/enroll enrolls CRM contacts',
      enrollSeqRes.status === 200 && enrollSeqRes.data.enrolledCount >= 1
    );

    // Visual Workflows & State Transitions
    const wfRes = await request('POST', '/api/v1/workflows', {
      profileId: 'prf_default',
      name: 'Support FAQ Flow',
      platform: 'instagram',
      nodes: [
        { id: 't1', type: 'trigger', data: { event: 'dm_keyword', keyword: 'HELP' } },
        { id: 'm1', type: 'message', data: { text: 'How can our support team help you?' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }],
    });
    const wfId = wfRes.data.workflow?.id;
    record(
      'POST /api/v1/workflows creates visual branching workflow',
      wfRes.status === 201 && wfId
    );

    const activateWfRes = await request('POST', `/api/v1/workflows/${wfId}/activate`);
    record(
      'POST /api/v1/workflows/{id}/activate activates workflow',
      activateWfRes.status === 200 && activateWfRes.data.workflow?.status === 'active'
    );

    const pauseWfRes = await request('POST', `/api/v1/workflows/${wfId}/pause`);
    record(
      'POST /api/v1/workflows/{id}/pause pauses active workflow',
      pauseWfRes.status === 200 && pauseWfRes.data.workflow?.status === 'paused'
    );

    const pausedEditRes = await request('PATCH', `/api/v1/workflows/${wfId}`, {
      name: 'Support FAQ Flow (Updated)',
      nodes: [
        { id: 't1', type: 'trigger', data: { event: 'dm_keyword', keyword: 'HELP' } },
        { id: 'm1', type: 'message', data: { text: 'Welcome to our premium helpdesk.' } },
      ],
    });
    record(
      'PATCH /api/v1/workflows/{id} allows graph modifications when paused',
      pausedEditRes.status === 200 && pausedEditRes.data.workflow?.name.includes('Updated')
    );

    const triggerWfRes = await request('POST', `/api/v1/workflows/${wfId}/trigger`, {
      contactId,
    });
    record(
      'POST /api/v1/workflows/{id}/trigger initiates workflow run',
      triggerWfRes.status === 201 && triggerWfRes.data.runId !== undefined
    );

    const getWorkflowsRes = await request('GET', '/api/v1/workflows');
    const targetWf = (getWorkflowsRes.data.workflows || []).find((w) => w.id === wfId);
    record(
      'GET /api/v1/workflows verifies execution count incremented',
      targetWf && targetWf.executionCount >= 1
    );

    const deleteWfRes = await request('DELETE', `/api/v1/workflows/${wfId}`);
    record(
      'DELETE /api/v1/workflows/{id} deletes workflow',
      deleteWfRes.status === 200 && deleteWfRes.data.deleted === true
    );

    // ------------------------------------------------------------------------
    // GROUP 4: TELEPHONY, BRANDED CALLING, VERIFY OTP, RCS & WEBRTC
    // ------------------------------------------------------------------------
    console.log(`\n[Group 4] Telephony, Branded Calling, Verify OTP, RCS & WebRTC`);
    const availNumbersRes = await request('GET', '/api/v1/phone-numbers/available?country=US');
    record(
      'GET /api/v1/phone-numbers/available searches virtual phone numbers catalog',
      availNumbersRes.status === 200 && (availNumbersRes.data.numbers || availNumbersRes.data.data)?.length > 0
    );

    const buyNumberRes = await request('POST', '/api/v1/phone-numbers/buy', {
      country: 'US',
      numberType: 'mobile',
    });
    const purchasedNumber = buyNumberRes.data.phoneNumber?.number || buyNumberRes.data.data?.number || '+14155550199';
    record(
      'POST /api/v1/phone-numbers/buy purchases & provisions virtual number',
      buyNumberRes.status === 201 && purchasedNumber
    );

    const listNumbersRes = await request('GET', '/api/v1/phone-numbers');
    record(
      'GET /api/v1/phone-numbers lists owned virtual phone numbers',
      listNumbersRes.status === 200 && (listNumbersRes.data.numbers || listNumbersRes.data.data)?.length > 0
    );

    const sendSmsRes = await request('POST', '/api/v1/sms/messages', {
      from: purchasedNumber,
      to: '+14159820011',
      text: 'Your order has been confirmed! Tracking: https://track.co/1234',
    });
    record(
      'POST /api/v1/sms/messages sends outbound programmable SMS',
      sendSmsRes.status === 201 && (sendSmsRes.data.data?.messageId !== undefined || sendSmsRes.data.messageId !== undefined)
    );

    const latestOtpRes = await request('GET', '/api/v1/sms/otp/latest?phoneNumber=' + encodeURIComponent(purchasedNumber));
    record(
      'GET /api/v1/sms/otp/latest inspects inbound SMS OTP inbox',
      latestOtpRes.status === 200
    );

    const voiceCallRes = await request('POST', '/api/v1/voice/calls', {
      from: purchasedNumber,
      to: '+14159820011',
      agentId: 'voice_agent_receptionist',
    });
    record(
      'POST /api/v1/voice/calls initiates outbound voice / AI agent call',
      voiceCallRes.status === 201 && (voiceCallRes.data.data?.callId !== undefined || voiceCallRes.data.callId !== undefined)
    );

    const listCallsRes = await request('GET', '/api/v1/voice/calls');
    record(
      'GET /api/v1/voice/calls lists call history and recordings',
      listCallsRes.status === 200 && (listCallsRes.data.calls || listCallsRes.data.data) !== undefined
    );

    const webrtcRes = await request('POST', '/api/v1/voice/browser-token');
    record(
      'POST /api/v1/voice/browser-token mints WebRTC softphone calling token',
      webrtcRes.status === 200 && webrtcRes.data.token && webrtcRes.data.sdk
    );

    // Turnkey Verify OTP
    const otpSendRes = await request('POST', '/api/v1/verify', {
      to: '+14159820011',
      channel: 'sms',
      brandName: 'Asra3 Cloud',
      codeLength: 6,
    });
    const verificationId = otpSendRes.data.verificationId;
    record(
      'POST /api/v1/verify sends turnkey phone verification OTP',
      otpSendRes.status === 201 && verificationId
    );

    const actualCode = otpSendRes.data.code || otpSendRes.data.data?.code;
    const otpCheckRes = await request('POST', '/api/v1/verify/check', {
      verificationId,
      code: actualCode,
    });
    record(
      'POST /api/v1/verify/check validates genuine verification code',
      otpCheckRes.status === 200 && otpCheckRes.data.verified === true
    );

    const brandIdRes = await request('POST', '/api/v1/branded-calling/identities', {
      displayName: 'Asra3 Fraud Alert',
      callReasons: ['Suspicious Activity Verification', 'Transaction Alert'],
      logoUrl: 'https://assets.zernio.com/logo.png',
    });
    record(
      'POST /api/v1/branded-calling/identities registers Display Identity Record',
      brandIdRes.status === 201 && brandIdRes.data.identity?.displayName !== undefined
    );

    const rcsAgentRes = await request('POST', '/api/v1/rcs/agents', {
      name: 'concierge_rcs',
      displayName: 'Zernio Concierge',
      description: 'Automated 24/7 VIP Concierge Assistant',
      logoUrl: 'https://assets.zernio.com/rcs/logo.png',
      primaryColor: '#0066FF',
    });
    const agentId = rcsAgentRes.data.agent?.id;
    record(
      'POST /api/v1/rcs/agents registers verified RCS business agent',
      rcsAgentRes.status === 201 && agentId
    );

    const rcsMsgRes = await request('POST', '/api/v1/rcs/messages', {
      agentId,
      to: '+14159820011',
      text: 'Hello from verified RCS Business Messaging!',
      suggestions: [{ text: 'View Catalog' }, { text: 'Talk to Support' }],
    });
    record(
      'POST /api/v1/rcs/messages dispatches rich RCS message',
      rcsMsgRes.status === 201 && rcsMsgRes.data.messageId !== undefined
    );

    const smsRegRes = await request('POST', '/api/v1/sms/registration', {
      registrationType: 'sole_prop_10dlc',
      brand: { name: 'Acme Supplies', mobilePhone: '+14159820011' },
      campaign: { description: 'Appointment reminders and shipping alerts' },
    });
    record(
      'POST /api/v1/sms/registration registers 10DLC campaign brand',
      smsRegRes.status === 201 && smsRegRes.data.registration?.status === 'pending'
    );

    const portingRes = await request('POST', '/api/v1/phone-numbers/porting', {
      phoneNumber: '+14155550199',
      currentCarrier: 'AT&T Wireline',
      accountNumber: 'ATT-992-0199',
      pin: '1234',
      billingName: 'Acme Holding LLC',
    });
    record(
      'POST /api/v1/phone-numbers/porting initiates number porting request',
      portingRes.status === 201 && portingRes.data.portingId !== undefined
    );

    const getPortingRes = await request('GET', '/api/v1/phone-numbers/porting');
    record(
      'GET /api/v1/phone-numbers/porting lists porting requests',
      getPortingRes.status === 200 && (getPortingRes.data.portingRequests || getPortingRes.data.data)?.length > 0
    );

    const waTemplateRes = await request('POST', '/api/v1/whatsapp/templates', {
      accountId: 'acc_wa_01',
      name: 'order_shipped_v1',
      category: 'UTILITY',
      language: 'en_US',
      components: [{ type: 'BODY', text: 'Your order {{1}} is on the way!' }],
    });
    record(
      'POST /api/v1/whatsapp/templates registers WhatsApp Business template',
      waTemplateRes.status === 201 && waTemplateRes.data.template?.status === 'APPROVED'
    );

    const getWaTemplatesRes = await request('GET', '/api/v1/whatsapp/templates');
    const waTemplatesList = getWaTemplatesRes.data.templates || getWaTemplatesRes.data.data || [];
    record(
      'GET /api/v1/whatsapp/templates returns template catalog containing created template',
      getWaTemplatesRes.status === 200 && waTemplatesList.some((t) => t.name === 'order_shipped_v1')
    );

    const waFlowRes = await request('POST', '/api/v1/whatsapp/flows', {
      accountId: 'acc_wa_01',
      name: 'Appointment Booking Flow',
      categories: ['APPOINTMENT_BOOKING'],
    });
    record(
      'POST /api/v1/whatsapp/flows registers interactive WhatsApp Flow',
      waFlowRes.status === 201 && waFlowRes.data.flow?.name !== undefined
    );

    const mbaUpdateRes = await request('POST', '/api/v1/business-agent', {
      enabled: true,
      tone: 'friendly',
      greeting: 'Welcome! How can our AI assistant help you today?',
    });
    record(
      'POST /api/v1/business-agent enables Meta Business AI Agent',
      mbaUpdateRes.status === 200 && mbaUpdateRes.data.status === 'active'
    );

    // ------------------------------------------------------------------------
    // GROUP 5: ADVERTISING & LEAD GENERATION
    // ------------------------------------------------------------------------
    console.log(`\n[Group 5] Paid Advertising & Lead Generation`);
    const ctwaRes = await request('POST', '/api/v1/ads/ctwa', {
      name: 'High-Intent WhatsApp Conversions Ad',
      dailyBudget: 60,
      whatsappPhoneNumber: '+14158904321',
    });
    record(
      'POST /api/v1/ads/ctwa launches Click-to-WhatsApp campaign',
      ctwaRes.status === 201 && ctwaRes.data.destination === 'whatsapp'
    );

    const callAdRes = await request('POST', '/api/v1/ads/call', {
      name: 'Emergency Dispatch Click-to-Call Ad',
      dailyBudget: 45,
      phoneNumber: '+14158904321',
    });
    record(
      'POST /api/v1/ads/call launches Click-to-Call ad campaign',
      callAdRes.status === 201 && callAdRes.data.callToAction === 'CALL_NOW'
    );

    const audienceRes = await request('POST', '/api/v1/ads/audiences', {
      adAccountId: 'act_marketing_01',
      name: 'High LTV 2026 Customers',
      subtype: 'CUSTOM',
    });
    record(
      'POST /api/v1/ads/audiences creates custom retargeting audience',
      audienceRes.status === 201 && audienceRes.data.audience?.name !== undefined
    );

    const targetingRes = await request('GET', '/api/v1/ads/targeting?q=SaaS');
    record(
      'GET /api/v1/ads/targeting discovers interests and demographics',
      targetingRes.status === 200 && targetingRes.data.results?.length > 0
    );

    const adLibraryRes = await request('GET', '/api/v1/ads/library?q=Cybersecurity');
    record(
      'GET /api/v1/ads/library conducts competitive ad intelligence',
      adLibraryRes.status === 200 && adLibraryRes.data.ads?.length > 0
    );

    const leadFormRes = await request('POST', '/api/v1/lead-gen/forms', {
      accountId: 'acc_fb_01',
      name: 'Enterprise Demo Request Form',
      privacyPolicyUrl: 'https://asra3.co/privacy',
    });
    const formId = leadFormRes.data.form?.id;
    record(
      'POST /api/v1/lead-gen/forms creates Instant Lead Form',
      leadFormRes.status === 201 && formId
    );

    const leadsRes = await request('GET', `/api/v1/lead-gen/forms/${formId}/leads`);
    record(
      'GET /api/v1/lead-gen/forms/{id}/leads fetches submitted leads',
      leadsRes.status === 200 && leadsRes.data.leads !== undefined
    );

    const pixelRes = await request('POST', '/api/v1/tracking-tags', {
      adAccountId: 'act_marketing_01',
      name: 'Shopify Checkout Pixel',
      platform: 'meta',
    });
    record(
      'POST /api/v1/tracking-tags registers platform measurement pixel',
      pixelRes.status === 201 && pixelRes.data.tag?.name !== undefined
    );

    const capiRes = await request('POST', '/api/v1/conversions', {
      eventName: 'Purchase',
      eventTime: Math.floor(Date.now() / 1000),
      userData: { email: 'customer@example.com' },
      customData: { currency: 'USD', value: 299 },
    });
    record(
      'POST /api/v1/conversions dispatches server-side conversion event (CAPI)',
      capiRes.status === 200 || capiRes.status === 201
    );

    // ------------------------------------------------------------------------
    // GROUP 6: BLOGS, GOOGLE BUSINESS PROFILE & COMMERCE
    // ------------------------------------------------------------------------
    console.log(`\n[Group 6] Blogs, Google Business Services & Social Commerce`);
    const blogRes = await request('POST', '/api/v1/blogs', {
      title: 'Announcing Zernio 2.0: Omnichannel Cloud Infrastructure',
      bodyHtml: '<p>Complete parity across all 8 communications and social hubs.</p>',
    });
    record(
      'POST /api/v1/blogs creates WordPress/Shopify blog article',
      blogRes.status === 201 && blogRes.data.article?.id !== undefined
    );

    const listArticlesRes = await request('GET', '/api/v1/blogs');
    record(
      'GET /api/v1/blogs lists published articles',
      listArticlesRes.status === 200 && (listArticlesRes.data.blogs || listArticlesRes.data.data)?.length > 0
    );

    const gbpServiceRes = await request('POST', '/api/v1/google-business/services', {
      displayName: 'Express Virtual Number Provisioning',
      description: 'Instant local and toll-free numbers for business communications',
      price: { currencyCode: 'USD', units: 15 },
    });
    record(
      'POST /api/v1/google-business/services adds Google Business Profile service item',
      gbpServiceRes.status === 201 && gbpServiceRes.data.service?.displayName !== undefined
    );

    const productRes = await request('POST', '/api/v1/commerce/products', {
      title: 'Telecom Enterprise Gateway v3',
      price: 299,
      currency: 'USD',
      inventoryQuantity: 100,
    });
    record(
      'POST /api/v1/commerce/products creates unified store product',
      productRes.status === 201 && productRes.data.product?.id !== undefined
    );

    const listProdsRes = await request('GET', '/api/v1/commerce/products');
    record(
      'GET /api/v1/commerce/products lists store catalog',
      listProdsRes.status === 200 && (listProdsRes.data.products || listProdsRes.data.data)?.length > 0
    );

    const orderRes = await request('POST', '/api/v1/commerce/orders', {
      orderNumber: '#ORD-8821',
      customerName: 'Marcus Aurelius',
      total: 299,
    });
    record(
      'POST /api/v1/commerce/orders records commerce order',
      orderRes.status === 201 && orderRes.data.order?.orderNumber !== undefined
    );

    const discountRes = await request('POST', '/api/v1/commerce/discounts', {
      code: 'GROWTH25',
      discountType: 'percentage',
      value: 25,
    });
    record(
      'POST /api/v1/commerce/discounts creates coupon/discount code',
      discountRes.status === 201 && discountRes.data.discount?.code === 'GROWTH25'
    );

    // ------------------------------------------------------------------------
    // GROUP 7: ADVANCED ANALYTICS
    // ------------------------------------------------------------------------
    console.log(`\n[Group 7] Advanced Posting & Inbox Analytics`);
    const bestTimesRes = await request('GET', '/api/v1/analytics/best-times');
    record(
      'GET /api/v1/analytics/best-times calculates engagement heatmap recommendations',
      bestTimesRes.status === 200 && bestTimesRes.data.recommendations?.length > 0
    );

    const decayRes = await request('GET', '/api/v1/analytics/content-decay');
    record(
      'GET /api/v1/analytics/content-decay computes engagement half-life curves',
      decayRes.status === 200 && decayRes.data.halfLifeHours > 0
    );

    const inboxAnalyticsRes = await request('GET', '/api/v1/inbox-analytics');
    record(
      'GET /api/v1/inbox-analytics provides volume, response time SLAs, and channel breakdown',
      inboxAnalyticsRes.status === 200 && inboxAnalyticsRes.data.volume?.conversations > 0
    );

    // ------------------------------------------------------------------------
    // GROUP 8: DUAL AUTHENTICATION & ERROR CONDITIONS (401, 400, 404, 409)
    // ------------------------------------------------------------------------
    console.log(`\n[Group 8] Dual Auth & Adversarial Error Conditions`);

    // 8.1 Dual Auth: Session Cookie Authentication (Interactive Session)
    const signupEmail = `e2e_session_${Date.now()}@nexustech.io`;
    const signupRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signup',
        fullName: 'Dual Auth Tester',
        email: signupEmail,
        password: 'SecurePassword2026!',
        companyName: 'Dual Auth Corp',
      }),
    });
    const setCookieHeader = signupRes.headers.get('set-cookie') || '';
    const cookieMatch = setCookieHeader.match(/asra3_session=([^;]+)/);
    const sessionCookie = cookieMatch ? cookieMatch[1] : '';

    if (sessionCookie) {
      const sessionMeRes = await request('GET', '/api/v1/me', null, {
        Authorization: '',
        Cookie: `asra3_session=${sessionCookie}`,
      });
      record(
        'Dual Auth: Authenticates via session cookie (asra3_session) without Bearer token',
        sessionMeRes.status === 200 && sessionMeRes.data.data?.auth?.keyName === 'Interactive Session',
        `auth: ${sessionMeRes.data.data?.auth?.keyName}`
      );
    } else {
      record('Dual Auth: Authenticates via session cookie', false, 'Failed to obtain session cookie from /api/auth');
    }

    // 8.2 401 Unauthorized: Missing Authorization & Cookie
    const unauthRes = await request('GET', '/api/v1/contacts', null, { Authorization: '', Cookie: '' });
    record(
      'HTTP 401: Unauthenticated request without token/cookie rejected with 401 unauthorized',
      unauthRes.status === 401 && unauthRes.data.error?.code === 'unauthorized',
      `code: ${unauthRes.data.error?.code}`
    );

    // 8.3 401 Unauthorized: Invalid Bearer Token
    const invalidTokenRes = await request('GET', '/api/v1/contacts', null, { Authorization: 'Bearer invalid_garbage_token_999' });
    record(
      'HTTP 401: Invalid Bearer token rejected with 401 invalid_api_key',
      invalidTokenRes.status === 401 && invalidTokenRes.data.error?.code === 'invalid_api_key',
      `code: ${invalidTokenRes.data.error?.code}`
    );

    // 8.4 400 Bad Request: Malformed JSON Syntax
    const malformedJsonRes = await request('POST', '/api/v1/contacts', '{"name": "Broken JSON syntax,', {
      'Content-Type': 'application/json',
    });
    record(
      'HTTP 400: Malformed JSON syntax rejected with 400 invalid_json',
      malformedJsonRes.status === 400 && malformedJsonRes.data.error?.code === 'invalid_json',
      `code: ${malformedJsonRes.data.error?.code}`
    );

    // 8.5 400 Bad Request: Validation Failure (Missing Name)
    const missingNameRes = await request('POST', '/api/v1/contacts', {
      email: 'noname@example.com',
    });
    record(
      'HTTP 400: Missing required fields rejected with 400 validation_error',
      missingNameRes.status === 400 && missingNameRes.data.error?.code === 'validation_error',
      `code: ${missingNameRes.data.error?.code}`
    );

    // 8.6 400 Bad Request: Invalid Phone Number format
    const invalidPhoneRes = await request('POST', '/api/v1/verify', {
      to: 'invalid_phone_123',
    });
    record(
      'HTTP 400: Non-E.164 phone number rejected with 400 invalid_phone_number',
      invalidPhoneRes.status === 400 && invalidPhoneRes.data.error?.code === 'invalid_phone_number',
      `code: ${invalidPhoneRes.data.error?.code}`
    );

    // 8.7 400 Bad Request: Active Workflow Immutability Guard
    const immutWfRes = await request('POST', '/api/v1/workflows', {
      profileId: 'prf_default',
      name: 'Active Guard Test Workflow',
      platform: 'instagram',
      nodes: [
        { id: 't1', type: 'trigger', data: { event: 'dm_keyword', keyword: 'PROMO' } },
        { id: 'm1', type: 'message', data: { text: 'Promo details here' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }],
    });
    const immutWfId = immutWfRes.data.workflow?.id;
    if (immutWfId) {
      await request('POST', `/api/v1/workflows/${immutWfId}/activate`);
      const guardEditRes = await request('PATCH', `/api/v1/workflows/${immutWfId}`, {
        nodes: [{ id: 'm2', type: 'message', data: { text: 'Forbidden graph edit while active' } }],
      });
      record(
        'HTTP 400: Active workflow graph modification rejected with 400 active_workflow_immutable',
        guardEditRes.status === 400 && guardEditRes.data.error?.code === 'active_workflow_immutable',
        `code: ${guardEditRes.data.error?.code}`
      );
      await request('DELETE', `/api/v1/workflows/${immutWfId}`);
    }

    // 8.8 400 Bad Request: Workflow Activation Missing Trigger Node
    const noTriggerWfRes = await request('POST', '/api/v1/workflows', {
      profileId: 'prf_default',
      name: 'No Trigger Workflow',
      platform: 'instagram',
      nodes: [{ id: 'm1', type: 'message', data: { text: 'Orphan message' } }],
      edges: [],
    });
    const noTriggerWfId = noTriggerWfRes.data.workflow?.id;
    if (noTriggerWfId) {
      const activateNoTriggerRes = await request('POST', `/api/v1/workflows/${noTriggerWfId}/activate`);
      record(
        'HTTP 400: Activating workflow without trigger node rejected with 400 workflow_trigger_required',
        activateNoTriggerRes.status === 400 && activateNoTriggerRes.data.error?.code === 'workflow_trigger_required',
        `code: ${activateNoTriggerRes.data.error?.code}`
      );
      await request('DELETE', `/api/v1/workflows/${noTriggerWfId}`);
    }

    // 8.9 400 Bad Request: Invalid OTP Code Rejection
    const dummyVerifyRes = await request('POST', '/api/v1/verify', {
      to: '+14159820011',
      brandName: 'OTP Rejection Check',
    });
    const dummyVerId = dummyVerifyRes.data.verificationId;
    if (dummyVerId) {
      const invalidOtpRes = await request('POST', '/api/v1/verify/check', {
        verificationId: dummyVerId,
        code: '999999',
      });
      record(
        'HTTP 400: Incorrect OTP verification code rejected with 400 and verified: false',
        invalidOtpRes.status === 400 && invalidOtpRes.data.verified === false,
        `verified: ${invalidOtpRes.data.verified}`
      );
    }

    // 8.10 404 Not Found: Non-existent Account Health Check
    const notFoundAccRes = await request('GET', '/api/v1/accounts/acc_non_existent_99999/health');
    record(
      'HTTP 404: Health probe on non-existent account returns 404 not_found',
      notFoundAccRes.status === 404 && notFoundAccRes.data.error?.code === 'not_found',
      `code: ${notFoundAccRes.data.error?.code}`
    );

    // 8.11 404 Not Found: Activating Non-existent Workflow
    const notFoundWfRes = await request('POST', '/api/v1/workflows/wf_non_existent_99999/activate');
    record(
      'HTTP 404: Activating non-existent workflow returns 404',
      notFoundWfRes.status === 404,
      `status: ${notFoundWfRes.status}`
    );

    // 8.12 409 Conflict: 24h Duplicate Post Rejection
    const dupContent = `Duplicate test content ${Date.now()}`;
    await request('POST', '/api/v1/posts', {
      content: dupContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_dup_target' }],
    });
    const dupRes = await request('POST', '/api/v1/posts', {
      content: dupContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_dup_target' }],
    });
    record(
      'HTTP 409: Duplicate post within 24h rejected with 409 Conflict (duplicate_post & existingPostId)',
      dupRes.status === 409 && dupRes.data.code === 'duplicate_post' && !!dupRes.data.details?.existingPostId,
      `code: ${dupRes.data.code}, existingPostId: ${dupRes.data.details?.existingPostId}`
    );

  } catch (err) {
    console.error('Unexpected error during E2E verification run:', err);
    failed++;
  } finally {
    // ------------------------------------------------------------------------
    // GROUP 9: CLEAN STATE RESET & TEARDOWN GUARANTEE
    // ------------------------------------------------------------------------
    console.log(`\n[Group 9] Clean State Teardown & .data/workspaces.json Reset`);
    const dataFilePath = path.resolve(process.cwd(), '.data', 'workspaces.json');

    try {
      // 1. Invoke workspace reset endpoint
      const resetRes = await fetch(`${BASE_URL}/api/v1/workspaces/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const resetJson = await resetRes.json().catch(() => ({}));
      record(
        'POST /api/v1/workspaces/reset returns 200 with success: true',
        resetRes.status === 200 && resetJson.success === true,
        resetJson.message || ''
      );

      // 2. Direct inspection of disk persistence file
      if (fs.existsSync(dataFilePath)) {
        const stats = fs.statSync(dataFilePath);
        const rawContent = fs.readFileSync(dataFilePath, 'utf-8');
        const expectedRaw = '{\n  "workspaces": {}\n}';
        const isExact22Bytes = stats.size === 22;
        const isCleanPayload = rawContent === expectedRaw;

        record(
          'Teardown: .data/workspaces.json exists and is strictly 22 bytes {"workspaces":{}}',
          isExact22Bytes && isCleanPayload,
          `actual size: ${stats.size} bytes, content: ${JSON.stringify(rawContent)}`
        );
      } else {
        record('Teardown: .data/workspaces.json exists on disk', false, 'File does not exist');
      }
    } catch (teardownErr) {
      console.error('Teardown assertion failure:', teardownErr);
      record('Teardown: Clean state reset execution', false, teardownErr.message);
    }
  }

  // ------------------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------------------
  const total = passed + failed;
  const rate = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log(`\n========================================================================`);
  console.log(`📊 Zernio Full-Platform E2E Test Suite Summary:`);
  console.log(`   Total Tests Executed: ${total}`);
  console.log(`   Passed:               ${passed}`);
  console.log(`   Failed:               ${failed}`);
  console.log(`   Success Rate:         ${rate}%`);
  console.log(`========================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
