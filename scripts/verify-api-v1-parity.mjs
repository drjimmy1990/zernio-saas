#!/usr/bin/env node
/**
 * scripts/verify-api-v1-parity.mjs
 * Comprehensive automated verification of Zernio REST API v1 Resource Parity:
 * - OpenAPI 3.1 & Postman 2.1 specs
 * - All 8 Zernio resource families
 * - 24h content-hash duplicate post rejection (409 Conflict)
 * - Idempotency-Key replay header and cached payload
 * - Active workflow graph immutability guard (400 Conflict)
 * - Reset .data/workspaces.json to {"workspaces":{}} on completion
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_API_KEY = 'tk_live_parity_m6_test_runner';
const HEADERS = {
  'Authorization': `Bearer ${TEST_API_KEY}`,
  'Content-Type': 'application/json',
};

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
  const init = {
    method,
    headers: { ...HEADERS, ...extraHeaders },
  };
  if (body) {
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
  console.log(`🚀 Starting Zernio API v1 Parity Automated Verification Suite`);
  console.log(`Target: ${BASE_URL} | Auth: Bearer ${TEST_API_KEY}`);
  console.log(`========================================================================\n`);

  try {
    // ------------------------------------------------------------------------
    // GROUP 0: SPECIFICATIONS (OpenAPI 3.1 & Postman 2.1)
    // ------------------------------------------------------------------------
    console.log(`[Group 0] OpenAPI 3.1 & Postman 2.1 Specification Endpoints`);
    const openapiRes = await request('GET', '/api/v1/openapi.json');
    const pathCount = Object.keys(openapiRes.data.paths || {}).length;
    record(
      'GET /api/v1/openapi.json returns valid OpenAPI 3.1 with >=100 paths',
      openapiRes.status === 200 && openapiRes.data.openapi?.startsWith('3.1.') && pathCount >= 100,
      `v${openapiRes.data.openapi}, ${pathCount} paths`
    );

    const postmanRes = await request('GET', '/api/v1/postman.json');
    const folderCount = (postmanRes.data.item || []).length;
    record(
      'GET /api/v1/postman.json returns valid Postman 2.1 collection',
      postmanRes.status === 200 && postmanRes.data.info?.schema?.includes('v2.1.0') && folderCount >= 8,
      `${folderCount} resource folders`
    );

    // ------------------------------------------------------------------------
    // GROUP 1: CORE, CONNECT & ACCOUNT SETTINGS
    // ------------------------------------------------------------------------
    console.log(`\n[Group 1] Core, Connect & Platform Account Settings`);
    const meRes = await request('GET', '/api/v1/me');
    record('GET /api/v1/me returns workspace identity', meRes.status === 200 && meRes.data.success);

    const accountsHealthRes = await request('GET', '/api/v1/accounts/health');
    record('GET /api/v1/accounts/health returns summary and diagnostics', accountsHealthRes.status === 200 && accountsHealthRes.data.summary);

    const connectAccRes = await request('POST', '/api/v1/connect/facebook', {
      username: '@techurity_official',
      displayName: 'Techurity Cloud (Facebook)',
    });
    const connectedAccId = connectAccRes.data.data?.id || 'acc_fb_primary';

    const singleHealthRes = await request('GET', `/api/v1/accounts/${connectedAccId}/health`);
    record('GET /api/v1/accounts/{id}/health live diagnostic probe', singleHealthRes.status === 200 && singleHealthRes.data.platformConnection !== undefined);

    const notFoundHealthRes = await request('GET', '/api/v1/accounts/acc_non_existent/health');
    record('GET /api/v1/accounts/{id}/health returns 404 for non-existent account', notFoundHealthRes.status === 404 && notFoundHealthRes.data.error?.code === 'not_found');

    const createGroupRes = await request('POST', '/api/v1/account-groups', {
      profileId: 'prf_default',
      name: 'Global Cross-Posting Hub',
      accountIds: ['acc_tw_01', 'acc_li_01', 'acc_ig_01'],
      color: '#0066FF',
    });
    const groupId = createGroupRes.data.accountGroup?.id;
    record('POST /api/v1/account-groups creates cross-posting group', createGroupRes.status === 201 && groupId);

    const listGroupsRes = await request('GET', '/api/v1/account-groups?profileId=prf_default');
    record('GET /api/v1/account-groups lists account groups', listGroupsRes.status === 200 && (listGroupsRes.data.accountGroups || []).length > 0);

    const updateGroupRes = await request('PUT', `/api/v1/account-groups/${groupId}`, {
      name: 'Global Cross-Posting Hub (Updated)',
    });
    record('PUT /api/v1/account-groups/{id} updates group', updateGroupRes.status === 200 && updateGroupRes.data.accountGroup?.name.includes('Updated'));

    const deleteGroupRes = await request('DELETE', `/api/v1/account-groups/${groupId}`);
    record('DELETE /api/v1/account-groups/{id} deletes group', deleteGroupRes.status === 200 && deleteGroupRes.data.deleted);

    const menuRes = await request('PUT', '/api/v1/accounts/acc_fb_01/messenger-menu', {
      persistent_menu: [{
        locale: 'default',
        call_to_actions: [{ type: 'postback', title: 'Main Menu', payload: 'MENU_MAIN' }]
      }]
    });
    record('PUT /api/v1/accounts/{id}/messenger-menu configures persistent menu', menuRes.status === 200 && menuRes.data.success);

    const iceRes = await request('PUT', '/api/v1/accounts/acc_fb_01/messenger-ice-breakers', {
      ice_breakers: [{ locale: 'default', call_to_actions: [{ question: 'How do I place an order?', payload: 'FAQ_ORDER' }] }]
    });
    record('PUT /api/v1/accounts/{id}/messenger-ice-breakers sets welcome prompts', iceRes.status === 200 && iceRes.data.success);

    const greetRes = await request('PUT', '/api/v1/accounts/acc_fb_01/messenger-greeting', {
      greeting: [{ locale: 'default', text: 'Welcome to our official customer service!' }]
    });
    record('PUT /api/v1/accounts/{id}/messenger-greeting sets greeting text', greetRes.status === 200 && greetRes.data.success);

    const igIceRes = await request('PUT', '/api/v1/accounts/acc_ig_01/instagram-ice-breakers', {
      ice_breakers: [{ question: 'What are your working hours?' }]
    });
    record('PUT /api/v1/accounts/{id}/instagram-ice-breakers sets IG DM prompts', igIceRes.status === 200 && igIceRes.data.success);

    const tgCmdRes = await request('PUT', '/api/v1/accounts/acc_tg_01/telegram-commands', {
      commands: [{ command: 'start', description: 'Start conversation' }, { command: 'help', description: 'Show assistance' }]
    });
    record('PUT /api/v1/accounts/{id}/telegram-commands sets bot commands', tgCmdRes.status === 200 && tgCmdRes.data.success);

    const selectRes = await request('POST', '/api/v1/connect/meta/select', {
      profileId: 'prf_default',
      entityId: 'page_123456789',
      entityType: 'page',
      tempToken: 'tmp_auth_secret_999',
      userProfile: { id: 'usr_meta', name: 'John Doe' },
    });
    record('POST /api/v1/connect/{platform}/select performs headless OAuth selection', selectRes.status === 200 && selectRes.data.account);

    // ------------------------------------------------------------------------
    // GROUP 2: CONTENT, QUEUE & VALIDATION
    // ------------------------------------------------------------------------
    console.log(`\n[Group 2] Content, Queue Scheduling & Pre-Flight Validation`);
    const presignRes = await request('POST', '/api/v1/media/presign', {
      filename: 'hero-banner.jpg',
      contentType: 'image/jpeg',
    });
    record('POST /api/v1/media/presign mints upload and public URLs', presignRes.status === 200 && presignRes.data.uploadUrl);

    const validatePostRes = await request('POST', '/api/v1/validate/post', {
      content: 'Short valid tweet for X and LinkedIn',
      platforms: [{ platform: 'twitter' }, { platform: 'linkedin' }],
    });
    record('POST /api/v1/validate/post pre-flight post length validation', validatePostRes.status === 200 && validatePostRes.data.valid === true);

    const validateMediaRes = await request('POST', '/api/v1/validate/media', {
      url: presignRes.data.publicUrl || 'https://assets.zernio.com/banner.jpg',
      type: 'image',
    });
    record('POST /api/v1/validate/media pre-flight media validation', validateMediaRes.status === 200 && validateMediaRes.data.valid === true);

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
    record('POST /api/v1/queue/slots configures recurring weekly slots', setSlotsRes.status === 201 && setSlotsRes.data.schedule);

    const getSlotsRes = await request('GET', '/api/v1/queue/slots?profileId=prf_default');
    record('GET /api/v1/queue/slots returns schedule and upcoming slots', getSlotsRes.status === 200 && getSlotsRes.data.nextSlots?.length > 0);

    const previewQueueRes = await request('GET', '/api/v1/queue/preview?profileId=prf_default&days=14');
    record('GET /api/v1/queue/preview generates calendar slot forecast', previewQueueRes.status === 200 && previewQueueRes.data.upcomingSlots?.length > 0);

    // 24h Duplicate Post Protection & Idempotency Replay
    const testPostContent = `Unique scheduled marketing announcement ${Date.now()}`;
    const idemKey = `idem_parity_${Date.now()}`;
    
    // 1st Post with Idempotency Key
    const post1Res = await request('POST', '/api/v1/posts', {
      content: testPostContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_dedup' }],
    }, { 'Idempotency-Key': idemKey });
    record('POST /api/v1/posts publishes post with Idempotency-Key', post1Res.status === 201 && post1Res.data.data?.id);

    // Replay with identical Idempotency-Key
    const replayRes = await request('POST', '/api/v1/posts', {
      content: testPostContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_dedup' }],
    }, { 'Idempotency-Key': idemKey });
    const isReplayed = replayRes.headers.get('idempotent-replayed') === 'true';
    record('POST /api/v1/posts replayed with same Idempotency-Key returns original post', replayRes.status === 201 && isReplayed);

    // Duplicate post without Idempotency-Key -> MUST be 409 Conflict
    const dupRes = await request('POST', '/api/v1/posts', {
      content: testPostContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_dedup' }],
    });
    record(
      'POST /api/v1/posts duplicate within 24h rejected with 409 Conflict',
      dupRes.status === 409 && dupRes.data.code === 'duplicate_post' && !!dupRes.data.details?.existingPostId,
      `code: ${dupRes.data.code}, existingPostId: ${dupRes.data.details?.existingPostId}`
    );

    // Cross-Account isolation: identical content to DIFFERENT account MUST succeed with 201 Created
    const crossAccRes = await request('POST', '/api/v1/posts', {
      content: testPostContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_different_brand' }],
    });
    record('POST /api/v1/posts publishes identical content to different account with 201 Created', crossAccRes.status === 201 && crossAccRes.data.data?.id);

    // ------------------------------------------------------------------------
    // GROUP 3: UNIFIED INBOX, CRM, BROADCASTS, SEQUENCES & WORKFLOWS
    // ------------------------------------------------------------------------
    console.log(`\n[Group 3] Unified Inbox, Social CRM, Broadcasts, Sequences & Workflows`);
    const commentRes = await request('POST', '/api/v1/inbox/comments', {
      accountId: 'acc_fb_01',
      postId: 'post_hero_01',
      text: 'How much does this cost in USD?',
    });
    const cmtId = commentRes.data.comment?.id;
    record('POST /api/v1/inbox/comments posts new top-level comment', commentRes.status === 201 && cmtId);

    const listCommentsRes = await request('GET', '/api/v1/inbox/comments');
    record('GET /api/v1/inbox/comments lists post comments', listCommentsRes.status === 200 && listCommentsRes.data.comments?.length > 0);

    const replyCommentRes = await request('POST', `/api/v1/inbox/comments/${cmtId}/reply`, {
      text: 'It is $99/mo with 14-day free trial.',
      isPrivate: false,
    });
    record('POST /api/v1/inbox/comments/{id}/reply posts public reply', replyCommentRes.status === 201 && replyCommentRes.data.replyId);

    const hideCommentRes = await request('POST', `/api/v1/inbox/comments/${cmtId}/hide`, { hide: true });
    record('POST /api/v1/inbox/comments/{id}/hide toggles visibility', hideCommentRes.status === 200 && hideCommentRes.data.isHidden === true);

    const likeCommentRes = await request('POST', `/api/v1/inbox/comments/${cmtId}/like`, {});
    record('POST /api/v1/inbox/comments/{id}/like likes comment', likeCommentRes.status === 200 && likeCommentRes.data.liked === true);

    const deleteCommentRes = await request('DELETE', `/api/v1/inbox/comments/${cmtId}`);
    record('DELETE /api/v1/inbox/comments/{id} deletes comment', deleteCommentRes.status === 200 && deleteCommentRes.data.deleted);

    const reviewRes = await request('POST', '/api/v1/inbox/reviews', {
      accountId: 'acc_gmb_01',
      authorName: 'Sarah Jenkins',
      rating: 5,
      text: 'Fantastic telecom connectivity and zero downtime.',
    });
    const revId = reviewRes.data.review?.id;
    record('POST /api/v1/inbox/reviews records star review', reviewRes.status === 201 && revId);

    const listReviewsRes = await request('GET', '/api/v1/inbox/reviews?minRating=4');
    record('GET /api/v1/inbox/reviews lists reviews filtered by rating', listReviewsRes.status === 200 && listReviewsRes.data.reviews?.length > 0);

    const replyReviewRes = await request('POST', `/api/v1/inbox/reviews/${revId}/reply`, {
      text: 'Thank you Sarah, thrilled to have you with us!',
    });
    record('POST /api/v1/inbox/reviews/{id}/reply posts response to review', replyReviewRes.status === 200 && replyReviewRes.data.reply);

    const getReviewsRes = await request('GET', '/api/v1/inbox/reviews');
    const targetReview = (getReviewsRes.data.reviews || []).find((r) => r.id === revId);
    record('GET /api/v1/inbox/reviews verifies reply persisted', targetReview && targetReview.reply?.text !== undefined);

    const mentionsRes = await request('GET', '/api/v1/inbox/mentions');
    record('GET /api/v1/inbox/mentions lists brand mentions', mentionsRes.status === 200 && mentionsRes.data.mentions !== undefined);

    // CRM Contacts & Custom Fields
    const customFieldRes = await request('POST', '/api/v1/custom-fields', {
      profileId: 'prf_default',
      name: 'Customer Tier',
      type: 'text',
      description: 'Bronze, Silver, Gold, Enterprise',
    });
    const fieldId = customFieldRes.data.customField?.id;
    record('POST /api/v1/custom-fields defines new contact custom field', customFieldRes.status === 201 && fieldId);

    const listFieldsRes = await request('GET', '/api/v1/custom-fields');
    record('GET /api/v1/custom-fields lists defined fields', listFieldsRes.status === 200 && listFieldsRes.data.customFields?.length > 0);

    const contactRes = await request('POST', '/api/v1/contacts', {
      profileId: 'prf_default',
      name: 'Dr. John Watson',
      email: 'watson@bakerstreet.co.uk',
      phone: '+447911123456',
      tags: ['vip', 'healthcare', 'uk'],
      customFields: { customer_tier: 'Enterprise' },
    });
    const contactId = contactRes.data.contact?.id;
    record('POST /api/v1/contacts creates unified CRM contact', contactRes.status === 201 && contactId);

    const listContactsRes = await request('GET', '/api/v1/contacts?search=Watson');
    record('GET /api/v1/contacts searches contacts by query', listContactsRes.status === 200 && listContactsRes.data.contacts?.length > 0);

    const updateContactRes = await request('PATCH', `/api/v1/contacts/${contactId}`, {
      tags: ['vip', 'healthcare', 'uk', 'renewed'],
    });
    record('PATCH /api/v1/contacts/{id} updates tags and attributes', updateContactRes.status === 200 && updateContactRes.data.contact?.tags.includes('renewed'));

    // Broadcasts & Sequences
    const broadcastRes = await request('POST', '/api/v1/broadcasts', {
      profileId: 'prf_default',
      name: 'Black Friday VIP Early Access',
      platform: 'whatsapp',
      message: 'Exclusive early access link for VIP members: https://techurity.co/vip',
    });
    const broadcastId = broadcastRes.data.broadcast?.id;
    record('POST /api/v1/broadcasts creates bulk broadcast campaign', broadcastRes.status === 201 && broadcastId);

    const sendBroadcastRes = await request('POST', `/api/v1/broadcasts/${broadcastId}/send`);
    record('POST /api/v1/broadcasts/{id}/send triggers immediate dispatch', sendBroadcastRes.status === 200 && (sendBroadcastRes.data.status === 'sent' || sendBroadcastRes.data.status === 'sending'));

    const getBroadcastsRes = await request('GET', '/api/v1/broadcasts');
    const sentBroadcast = (getBroadcastsRes.data.broadcasts || []).find((b) => b.id === broadcastId);
    record('GET /api/v1/broadcasts verifies broadcast sent status persisted', sentBroadcast && sentBroadcast.status === 'sent');

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
    record('POST /api/v1/sequences creates linear drip sequence', sequenceRes.status === 201 && seqId);

    const activateSeqRes = await request('POST', `/api/v1/sequences/${seqId}/activate`);
    record('POST /api/v1/sequences/{id}/activate transitions sequence to active', activateSeqRes.status === 200 && activateSeqRes.data.sequence?.status === 'active');

    const enrollSeqRes = await request('POST', `/api/v1/sequences/${seqId}/enroll`, {
      contactIds: [contactId],
    });
    record('POST /api/v1/sequences/{id}/enroll enrolls CRM contacts', enrollSeqRes.status === 200 && enrollSeqRes.data.enrolledCount >= 1);

    const getSequencesRes = await request('GET', '/api/v1/sequences');
    const targetSeq = (getSequencesRes.data.sequences || []).find((s) => s.id === seqId);
    record('GET /api/v1/sequences verifies enrolled count persisted', targetSeq && targetSeq.enrolledContactsCount >= 1);

    // Visual Branching Workflows & Active Immutability Guard
    const wfRes = await request('POST', '/api/v1/workflows', {
      profileId: 'prf_default',
      name: 'Support FAQ Router',
      platform: 'instagram',
      nodes: [
        { id: 't1', type: 'trigger', data: { event: 'dm_keyword', keyword: 'HELP' } },
        { id: 'm1', type: 'message', data: { text: 'How can our team support you today?' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'm1' }],
    });
    const wfId = wfRes.data.workflow?.id;
    record('POST /api/v1/workflows creates branching conversation automation', wfRes.status === 201 && wfId);

    const activateWfRes = await request('POST', `/api/v1/workflows/${wfId}/activate`);
    record('POST /api/v1/workflows/{id}/activate activates workflow', activateWfRes.status === 200 && activateWfRes.data.workflow?.status === 'active');

    // Attempt graph edit while active -> MUST fail with 400 active_workflow_immutable
    const guardEditRes = await request('PATCH', `/api/v1/workflows/${wfId}`, {
      nodes: [{ id: 'm2', type: 'message', data: { text: 'Forbidden graph edit while active' } }],
    });
    record(
      'PATCH /api/v1/workflows/{id} active graph immutability guard (400 Conflict)',
      guardEditRes.status === 400 && guardEditRes.data.error?.code === 'active_workflow_immutable',
      `code: ${guardEditRes.data.error?.code}`
    );

    // Pause workflow and edit graph
    const pauseWfRes = await request('POST', `/api/v1/workflows/${wfId}/pause`);
    record('POST /api/v1/workflows/{id}/pause pauses workflow', pauseWfRes.status === 200 && pauseWfRes.data.workflow?.status === 'paused');

    const pausedEditRes = await request('PATCH', `/api/v1/workflows/${wfId}`, {
      name: 'Support FAQ Router (Refined)',
      nodes: [
        { id: 't1', type: 'trigger', data: { event: 'dm_keyword', keyword: 'HELP' } },
        { id: 'm1', type: 'message', data: { text: 'Welcome to our premium helpdesk.' } },
      ],
    });
    record('PATCH /api/v1/workflows/{id} updates graph when paused', pausedEditRes.status === 200 && pausedEditRes.data.workflow?.name.includes('Refined'));

    const triggerWfRes = await request('POST', `/api/v1/workflows/${wfId}/trigger`, {
      contactId,
    });
    record('POST /api/v1/workflows/{id}/trigger initiates workflow run', triggerWfRes.status === 201 && triggerWfRes.data.runId);

    const getWorkflowsRes = await request('GET', '/api/v1/workflows');
    const targetWf = (getWorkflowsRes.data.workflows || []).find((w) => w.id === wfId);
    record('GET /api/v1/workflows verifies execution count incremented', targetWf && targetWf.executionCount >= 1);

    // Workflow trigger node validation & DELETE endpoint
    const noTriggerWfRes = await request('POST', '/api/v1/workflows', {
      profileId: 'prf_default',
      name: 'Workflow Without Trigger',
      platform: 'instagram',
      nodes: [{ id: 'm1', type: 'message', data: { text: 'Orphan message' } }],
      edges: [],
    });
    const noTriggerWfId = noTriggerWfRes.data.workflow?.id;
    const activateNoTriggerRes = await request('POST', `/api/v1/workflows/${noTriggerWfId}/activate`);
    record('POST /api/v1/workflows/{id}/activate rejects workflow without trigger node with 400', activateNoTriggerRes.status === 400 && activateNoTriggerRes.data.error?.code === 'workflow_trigger_required');

    const activateNotFoundWfRes = await request('POST', '/api/v1/workflows/wf_does_not_exist_999/activate');
    record('POST /api/v1/workflows/{id}/activate returns 404 for non-existent workflow', activateNotFoundWfRes.status === 404);

    const deleteWfRes = await request('DELETE', `/api/v1/workflows/${noTriggerWfId}`);
    record('DELETE /api/v1/workflows/{id} deletes workflow', deleteWfRes.status === 200 && deleteWfRes.data.deleted === true);

    // ------------------------------------------------------------------------
    // GROUP 4: TELEPHONY, BRANDED CALLING, VERIFY OTP, RCS & WEBRTC
    // ------------------------------------------------------------------------
    console.log(`\n[Group 4] Telephony, Branded Calling, Verify OTP, RCS & WebRTC`);
    const invalidPhoneRes = await request('POST', '/api/v1/verify', {
      to: 'invalid_phone_123',
    });
    record('POST /api/v1/verify rejects invalid non-E.164 phone number with 400', invalidPhoneRes.status === 400 && invalidPhoneRes.data.error?.code === 'invalid_phone_number');

    const otpSendRes = await request('POST', '/api/v1/verify', {
      to: '+14159820011',
      channel: 'sms',
      brandName: 'Techurity Cloud',
      codeLength: 6,
    });
    const verificationId = otpSendRes.data.verificationId;
    record('POST /api/v1/verify sends turnkey phone verification OTP', otpSendRes.status === 201 && verificationId);

    // Verify rejection of invalid code first (proves backdoor does not bypass)
    const invalidOtpRes = await request('POST', '/api/v1/verify/check', {
      verificationId,
      code: '000000',
    });
    record('POST /api/v1/verify/check rejects invalid OTP code', invalidOtpRes.status === 400 && invalidOtpRes.data.verified === false);

    // Verify acceptance of genuine code
    const actualCode = otpSendRes.data.code || otpSendRes.data.data?.code;
    const otpCheckRes = await request('POST', '/api/v1/verify/check', {
      verificationId,
      code: actualCode,
    });
    record('POST /api/v1/verify/check validates genuine verification code', otpCheckRes.status === 200 && otpCheckRes.data.verified === true);

    const brandIdRes = await request('POST', '/api/v1/branded-calling/identities', {
      displayName: 'Techurity Fraud Alert',
      callReasons: ['Suspicious Activity Verification', 'Transaction Alert'],
      logoUrl: 'https://assets.zernio.com/logo.png',
    });
    record('POST /api/v1/branded-calling/identities registers Display Identity Record', brandIdRes.status === 201 && brandIdRes.data.identity?.displayName);

    const rcsAgentRes = await request('POST', '/api/v1/rcs/agents', {
      name: 'concierge_rcs',
      displayName: 'Zernio Concierge',
      description: 'Automated 24/7 VIP Concierge Assistant',
      logoUrl: 'https://assets.zernio.com/rcs/logo.png',
      primaryColor: '#0066FF',
    });
    const agentId = rcsAgentRes.data.agent?.id;
    record('POST /api/v1/rcs/agents registers verified RCS agent', rcsAgentRes.status === 201 && agentId);

    const rcsMsgRes = await request('POST', '/api/v1/rcs/messages', {
      agentId,
      to: '+14159820011',
      text: 'Hello from verified RCS Business Messaging!',
      suggestions: [{ text: 'View Catalog' }, { text: 'Talk to Support' }],
    });
    record('POST /api/v1/rcs/messages dispatches rich RCS message', rcsMsgRes.status === 201 && rcsMsgRes.data.messageId);

    const smsRegRes = await request('POST', '/api/v1/sms/registration', {
      registrationType: 'sole_prop_10dlc',
      brand: { name: 'Acme Supplies', mobilePhone: '+14159820011' },
      campaign: { description: 'Appointment reminders and shipping alerts' },
    });
    record('POST /api/v1/sms/registration registers 10DLC campaign brand', smsRegRes.status === 201 && smsRegRes.data.registration?.status === 'pending');

    const portingRes = await request('POST', '/api/v1/phone-numbers/porting', {
      phoneNumber: '+14155550199',
      currentCarrier: 'AT&T Wireline',
      accountNumber: 'ATT-992-0199',
      pin: '1234',
      billingName: 'Acme Holding LLC',
    });
    record('POST /api/v1/phone-numbers/porting initiates number porting request', portingRes.status === 201 && portingRes.data.portingId);

    const getPortingRes = await request('GET', '/api/v1/phone-numbers/porting');
    record('GET /api/v1/phone-numbers/porting lists porting requests', getPortingRes.status === 200 && (getPortingRes.data.portingRequests || getPortingRes.data.data)?.length > 0);

    const webrtcRes = await request('POST', '/api/v1/voice/browser-token');
    record('POST /api/v1/voice/browser-token mints WebRTC calling token', webrtcRes.status === 200 && webrtcRes.data.token && webrtcRes.data.sdk);

    const waTemplateRes = await request('POST', '/api/v1/whatsapp/templates', {
      accountId: 'acc_wa_01',
      name: 'order_shipped_v1',
      category: 'UTILITY',
      language: 'en_US',
      components: [{ type: 'BODY', text: 'Your order {{1}} is on the way!' }],
    });
    record('POST /api/v1/whatsapp/templates creates WhatsApp Business template', waTemplateRes.status === 201 && waTemplateRes.data.template?.status === 'APPROVED');

    const getWaTemplatesRes = await request('GET', '/api/v1/whatsapp/templates');
    const waTemplatesList = getWaTemplatesRes.data.templates || getWaTemplatesRes.data.data || [];
    record('GET /api/v1/whatsapp/templates returns template catalog containing created template', getWaTemplatesRes.status === 200 && waTemplatesList.some((t) => t.name === 'order_shipped_v1'));

    const waFlowRes = await request('POST', '/api/v1/whatsapp/flows', {
      accountId: 'acc_wa_01',
      name: 'Appointment Booking Flow',
      categories: ['APPOINTMENT_BOOKING'],
    });
    record('POST /api/v1/whatsapp/flows registers interactive WhatsApp Flow', waFlowRes.status === 201 && waFlowRes.data.flow?.name);

    const mbaUpdateRes = await request('POST', '/api/v1/business-agent', {
      enabled: true,
      tone: 'friendly',
      greeting: 'Welcome! How can our AI assistant help you today?',
    });
    record('POST /api/v1/business-agent enables Meta Business AI Agent', mbaUpdateRes.status === 200 && mbaUpdateRes.data.status === 'active');

    // ------------------------------------------------------------------------
    // GROUP 5: ADVERTISING & LEAD GENERATION
    // ------------------------------------------------------------------------
    console.log(`\n[Group 5] Paid Advertising & Lead Generation`);
    const ctwaRes = await request('POST', '/api/v1/ads/ctwa', {
      name: 'High-Intent WhatsApp Conversions Ad',
      dailyBudget: 60,
      whatsappPhoneNumber: '+14158904321',
    });
    record('POST /api/v1/ads/ctwa launches Click-to-WhatsApp campaign', ctwaRes.status === 201 && ctwaRes.data.destination === 'whatsapp');

    const callAdRes = await request('POST', '/api/v1/ads/call', {
      name: 'Emergency Dispatch Click-to-Call Ad',
      dailyBudget: 45,
      phoneNumber: '+14158904321',
    });
    record('POST /api/v1/ads/call launches Click-to-Call ad campaign', callAdRes.status === 201 && callAdRes.data.callToAction === 'CALL_NOW');

    const audienceRes = await request('POST', '/api/v1/ads/audiences', {
      adAccountId: 'act_marketing_01',
      name: 'High LTV 2026 Customers',
      subtype: 'CUSTOM',
    });
    record('POST /api/v1/ads/audiences creates custom retargeting audience', audienceRes.status === 201 && audienceRes.data.audience?.name);

    const targetingRes = await request('GET', '/api/v1/ads/targeting?q=SaaS');
    record('GET /api/v1/ads/targeting discovers interests and demographics', targetingRes.status === 200 && targetingRes.data.results?.length > 0);

    const adLibraryRes = await request('GET', '/api/v1/ads/library?q=Cybersecurity');
    record('GET /api/v1/ads/library conducts competitive ad intelligence', adLibraryRes.status === 200 && adLibraryRes.data.ads?.length > 0);

    const leadFormRes = await request('POST', '/api/v1/lead-gen/forms', {
      accountId: 'acc_fb_01',
      name: 'Enterprise Demo Request Form',
      privacyPolicyUrl: 'https://techurity.co/privacy',
    });
    const formId = leadFormRes.data.form?.id;
    record('POST /api/v1/lead-gen/forms creates Instant Lead Form', leadFormRes.status === 201 && formId);

    const leadsRes = await request('GET', `/api/v1/lead-gen/forms/${formId}/leads`);
    record('GET /api/v1/lead-gen/forms/{id}/leads fetches submitted leads', leadsRes.status === 200 && leadsRes.data.leads !== undefined);

    const pixelRes = await request('POST', '/api/v1/tracking-tags', {
      adAccountId: 'act_marketing_01',
      name: 'Shopify Checkout Pixel',
      platform: 'meta',
    });
    record('POST /api/v1/tracking-tags registers platform measurement pixel', pixelRes.status === 201 && pixelRes.data.tag?.name);

    // ------------------------------------------------------------------------
    // GROUP 6: BLOGS, GOOGLE BUSINESS PROFILE & COMMERCE
    // ------------------------------------------------------------------------
    console.log(`\n[Group 6] Blogs, Google Business Services & Social Commerce`);
    const blogRes = await request('POST', '/api/v1/blogs', {
      title: 'Announcing Zernio 2.0: Omnichannel Cloud Infrastructure',
      bodyHtml: '<p>Today we unveil complete parity across all 8 communications and social hubs.</p>',
    });
    const blogArticleId = blogRes.data.article?.id;
    record('POST /api/v1/blogs creates WordPress/Shopify blog article', blogRes.status === 201 && blogArticleId);

    const listArticlesRes = await request('GET', '/api/v1/blogs');
    record('GET /api/v1/blogs lists published articles', listArticlesRes.status === 200 && listArticlesRes.data.blogs?.length > 0);

    const gbpServiceRes = await request('POST', '/api/v1/google-business/services', {
      displayName: 'Express Virtual Number Provisioning',
      description: 'Instant local and toll-free numbers for business communications',
      price: { currencyCode: 'USD', units: 15 },
    });
    record('POST /api/v1/google-business/services adds GBP service item', gbpServiceRes.status === 201 && gbpServiceRes.data.service?.displayName);

    const productRes = await request('POST', '/api/v1/commerce/products', {
      title: 'Telecom Enterprise Gateway v3',
      price: 299,
      currency: 'USD',
      inventoryQuantity: 100,
    });
    const prodId = productRes.data.product?.id;
    record('POST /api/v1/commerce/products creates unified store product', productRes.status === 201 && prodId);

    const listProdsRes = await request('GET', '/api/v1/commerce/products');
    record('GET /api/v1/commerce/products lists store catalog', listProdsRes.status === 200 && listProdsRes.data.products?.length > 0);

    const orderRes = await request('POST', '/api/v1/commerce/orders', {
      orderNumber: '#ORD-8821',
      customerName: 'Marcus Aurelius',
      total: 299,
    });
    record('POST /api/v1/commerce/orders records commerce order', orderRes.status === 201 && orderRes.data.order?.orderNumber);

    const discountRes = await request('POST', '/api/v1/commerce/discounts', {
      code: 'GROWTH25',
      discountType: 'percentage',
      value: 25,
    });
    record('POST /api/v1/commerce/discounts creates coupon/discount code', discountRes.status === 201 && discountRes.data.discount?.code === 'GROWTH25');

    // ------------------------------------------------------------------------
    // GROUP 7: ADVANCED ANALYTICS
    // ------------------------------------------------------------------------
    console.log(`\n[Group 7] Advanced Posting & Inbox Analytics`);
    const bestTimesRes = await request('GET', '/api/v1/analytics/best-times');
    record('GET /api/v1/analytics/best-times calculates engagement heatmap recommendations', bestTimesRes.status === 200 && bestTimesRes.data.recommendations?.length > 0);

    const decayRes = await request('GET', '/api/v1/analytics/content-decay');
    record('GET /api/v1/analytics/content-decay computes engagement half-life curves', decayRes.status === 200 && decayRes.data.halfLifeHours > 0);

    const inboxAnalyticsRes = await request('GET', '/api/v1/inbox-analytics');
    record('GET /api/v1/inbox-analytics provides volume, response time SLAs, and channel breakdown', inboxAnalyticsRes.status === 200 && inboxAnalyticsRes.data.volume?.conversations > 0);

  } catch (err) {
    console.error('Unexpected error during verification run:', err);
    failed++;
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP & STATE RESET (Zero Dirty State Guarantee)
    // ------------------------------------------------------------------------
    console.log(`\n[State Reset] Resetting .data/workspaces.json to {"workspaces":{}}...`);
    const dataFilePath = path.resolve(process.cwd(), '.data', 'workspaces.json');
    try {
      await fetch(`${BASE_URL}/api/v1/workspaces/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      }).catch(() => {});
    } catch {}
    try {
      if (fs.existsSync(dataFilePath)) {
        fs.writeFileSync(dataFilePath, JSON.stringify({ workspaces: {} }, null, 2), 'utf-8');
        console.log(`  ✓ Successfully reset ${dataFilePath} to empty state.`);
      }
    } catch (e) {
      console.error(`  ✗ Failed to reset workspace data file:`, e);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`📊 API v1 Parity Verification Summary:`);
  console.log(`   Total Tests: ${passed + failed}`);
  console.log(`   Passed:      ${passed}`);
  console.log(`   Failed:      ${failed}`);
  console.log(`   Success Rate: ${Math.round((passed / (passed + failed || 1)) * 100)}%`);
  console.log(`========================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
