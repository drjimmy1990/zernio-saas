#!/usr/bin/env node
/**
 * scripts/test-challenger-m8-adversarial.mjs
 * Independent Adversarial Verification Suite for Milestone 8 (Challenger m8_1)
 *
 * Directly tests:
 * 1. GET /api/v1/openapi.json (OpenAPI 3.1 validation, >=100 paths, 8 resource families, server URL)
 * 2. GET /api/v1/postman.json (Postman 2.1 validation, >=8 collection folders)
 * 3. Duplicate post rejection (HTTP 409 Conflict with content-hash matching within 24h)
 *    - Same content + same account -> 409 Conflict with existingPostId
 *    - Same content + different account -> 201 Created (allowed)
 *    - Empty content -> 400 Bad Request
 * 4. Idempotency-Key replay:
 *    - Initial request -> 201 Created
 *    - Replayed request with same Idempotency-Key -> 201 Created, Idempotent-Replayed header, identical post ID
 * 5. Dual Authentication & Adversarial Security Checks:
 *    - Bearer Token -> 200 OK
 *    - Genuine Session Cookie (techurity_session via /api/auth) -> 200 OK ("Interactive Session")
 *    - Forged / Fake Session Cookie -> 401 Unauthorized (tamper resistance)
 *    - Missing Auth -> 401 Unauthorized
 *    - Invalid Bearer -> 401 Unauthorized
 *    - Malformed JSON -> 400 Bad Request
 * 6. Clean State Teardown:
 *    - POST /api/v1/workspaces/reset -> 200 OK
 *    - .data/workspaces.json strictly 22 bytes and {"workspaces":{}}
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_KEY = 'tk_live_challenger_adv_m8';

let passed = 0;
let failed = 0;
const failures = [];

function assert(description, condition, details = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${description}${details ? ` -> ${details}` : ''}`);
  } else {
    failed++;
    const msg = `[FAIL] ${description}${details ? ` -> ${details}` : ''}`;
    console.error(`  ${msg}`);
    failures.push(msg);
  }
}

async function request(method, endpoint, body = null, extraHeaders = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const hasExplicitAuth = Object.keys(extraHeaders).some(
    (k) => k.toLowerCase() === 'authorization' || k.toLowerCase() === 'cookie'
  );
  if (!hasExplicitAuth) {
    headers['Authorization'] = `Bearer ${TEST_KEY}`;
  }

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
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _rawText: text };
  }

  return {
    status: res.status,
    headers: res.headers,
    data: json,
    rawText: text,
  };
}

async function runAdversarialSuite() {
  console.log('========================================================================');
  console.log('🧪 Milestone 8 Independent Adversarial Challenger Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log('========================================================================\n');

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: OpenAPI 3.1 & Postman 2.1 Specifications
    // ------------------------------------------------------------------------
    console.log('--- Section 1: Specifications (OpenAPI 3.1 & Postman 2.1) ---');
    const openapiRes = await request('GET', '/api/v1/openapi.json', null, { Authorization: '' });
    assert(
      'GET /api/v1/openapi.json returns HTTP 200',
      openapiRes.status === 200,
      `status: ${openapiRes.status}`
    );
    assert(
      'OpenAPI specification defines version 3.1.x',
      Boolean(openapiRes.data?.openapi?.startsWith('3.1.')),
      `version: ${openapiRes.data?.openapi}`
    );
    const openapiPaths = Object.keys(openapiRes.data?.paths || {});
    assert(
      'OpenAPI specification contains >= 100 paths',
      openapiPaths.length >= 100,
      `path count: ${openapiPaths.length}`
    );

    // Verify OpenAPI server URL points to /api/v1
    const serverUrls = (openapiRes.data?.servers || []).map((s) => s.url);
    assert(
      'OpenAPI specification defines /api/v1 server base gateway',
      serverUrls.some((u) => u.includes('/api/v1')),
      `servers: ${serverUrls.join(', ')}`
    );

    // Verify key resource paths (relative to /api/v1) across all 8 families exist
    const essentialPaths = [
      '/me',                         // Family 1: Core & Social Connect
      '/posts',                      // Family 2: Publishing & Queue
      '/inbox/conversations',        // Family 3: Unified Inbox & CRM
      '/phone-numbers/available',    // Family 4: Cloud Telephony & Voice
      '/ads/ctwa',                   // Family 5: Advertising (8 Networks)
      '/blogs',                      // Family 6: Platform APIs (Blogs & Commerce)
      '/analytics',                  // Family 7: Analytics & Insights
      '/webhooks',                   // Family 8: Webhooks & Admin
    ];
    const missingPaths = essentialPaths.filter((p) => !openapiRes.data?.paths?.[p]);
    assert(
      'OpenAPI specification paths cover all 8 Zernio resource families',
      missingPaths.length === 0,
      missingPaths.length === 0 ? 'All 8 family anchor paths present' : `Missing: ${missingPaths.join(', ')}`
    );

    const postmanRes = await request('GET', '/api/v1/postman.json', null, { Authorization: '' });
    assert(
      'GET /api/v1/postman.json returns HTTP 200',
      postmanRes.status === 200,
      `status: ${postmanRes.status}`
    );
    assert(
      'Postman collection uses schema v2.1.0',
      Boolean(postmanRes.data?.info?.schema?.includes('v2.1.0')),
      `schema: ${postmanRes.data?.info?.schema}`
    );
    const postmanItems = postmanRes.data?.item || [];
    assert(
      'Postman collection contains >= 8 top-level resource folders',
      postmanItems.length >= 8,
      `folders count: ${postmanItems.length}`
    );

    // ------------------------------------------------------------------------
    // SECTION 2: Duplicate Post Rejection (409 Conflict)
    // ------------------------------------------------------------------------
    console.log('\n--- Section 2: Duplicate Post Rejection (409 Conflict) ---');
    const uniqueDupToken = `adv_dup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const duplicateContent = `Adversarial duplicate test post content ${uniqueDupToken}`;
    const targetAccount1 = 'acc_twitter_adv_01';
    const targetAccount2 = 'acc_linkedin_adv_02';

    // 1. Initial post creation
    const initialPostRes = await request('POST', '/api/v1/posts', {
      content: duplicateContent,
      platforms: [{ platform: 'x', accountId: targetAccount1 }],
    });
    assert(
      'Initial post creation returns HTTP 201 Created',
      initialPostRes.status === 201 && Boolean(initialPostRes.data?.data?.id),
      `postId: ${initialPostRes.data?.data?.id}`
    );
    const initialPostId = initialPostRes.data?.data?.id;

    // 2. Re-attempt same content to same account within 24h -> MUST 409
    const secondPostRes = await request('POST', '/api/v1/posts', {
      content: duplicateContent,
      platforms: [{ platform: 'x', accountId: targetAccount1 }],
    });
    assert(
      'Re-posting exact content to same account within 24h returns HTTP 409 Conflict',
      secondPostRes.status === 409,
      `status: ${secondPostRes.status}`
    );
    assert(
      '409 Conflict error payload returns code="duplicate_post"',
      secondPostRes.data?.code === 'duplicate_post',
      `code: ${secondPostRes.data?.code}`
    );
    assert(
      '409 Conflict details contains existingPostId matching original post',
      secondPostRes.data?.details?.existingPostId === initialPostId,
      `expected: ${initialPostId}, actual: ${secondPostRes.data?.details?.existingPostId}`
    );

    // 3. Same content to DIFFERENT account -> MUST NOT 409, returns 201
    const diffAccountPostRes = await request('POST', '/api/v1/posts', {
      content: duplicateContent,
      platforms: [{ platform: 'linkedin', accountId: targetAccount2 }],
    });
    assert(
      'Posting same content to a DIFFERENT account succeeds with HTTP 201 Created',
      diffAccountPostRes.status === 201,
      `status: ${diffAccountPostRes.status}`
    );

    // 4. Empty content validation -> 400 Bad Request
    const emptyContentRes = await request('POST', '/api/v1/posts', {
      content: '',
      platforms: [{ platform: 'x', accountId: targetAccount1 }],
    });
    assert(
      'Posting empty content is rejected with HTTP 400 Bad Request',
      emptyContentRes.status === 400,
      `status: ${emptyContentRes.status}`
    );

    // ------------------------------------------------------------------------
    // SECTION 3: Idempotency-Key Replay Support
    // ------------------------------------------------------------------------
    console.log('\n--- Section 3: Idempotency-Key Replay Support ---');
    const idempotencyKey = `idem_adv_m8_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const idemPostContent = `Idempotent transaction content ${Date.now()}`;

    // 1. Initial request with Idempotency-Key
    const idemRes1 = await request(
      'POST',
      '/api/v1/posts',
      {
        content: idemPostContent,
        platforms: [{ platform: 'x', accountId: 'acc_idem_test' }],
      },
      { 'Idempotency-Key': idempotencyKey }
    );
    assert(
      'First request with Idempotency-Key returns HTTP 201 Created',
      idemRes1.status === 201 && Boolean(idemRes1.data?.data?.id || idemRes1.data?.post?.id),
      `postId: ${idemRes1.data?.data?.id || idemRes1.data?.post?.id}`
    );
    const idemCreatedPostId = idemRes1.data?.data?.id || idemRes1.data?.post?.id;

    // 2. Replayed request with SAME Idempotency-Key
    const idemRes2 = await request(
      'POST',
      '/api/v1/posts',
      {
        content: idemPostContent,
        platforms: [{ platform: 'x', accountId: 'acc_idem_test' }],
      },
      { 'Idempotency-Key': idempotencyKey }
    );
    assert(
      'Replayed request with same Idempotency-Key returns HTTP 201 Created',
      idemRes2.status === 201,
      `status: ${idemRes2.status}`
    );
    assert(
      'Replayed response includes Idempotent-Replayed: true header',
      idemRes2.headers.get('idempotent-replayed') === 'true',
      `header value: ${idemRes2.headers.get('idempotent-replayed')}`
    );
    assert(
      'Replayed response meta.idempotent_replayed is true',
      idemRes2.data?.meta?.idempotent_replayed === true,
      `meta: ${JSON.stringify(idemRes2.data?.meta)}`
    );
    const replayedPostId = idemRes2.data?.data?.id || idemRes2.data?.post?.id;
    assert(
      'Replayed response returns identical cached post ID without re-creating post',
      replayedPostId === idemCreatedPostId,
      `original: ${idemCreatedPostId}, replayed: ${replayedPostId}`
    );

    // ------------------------------------------------------------------------
    // SECTION 4: Dual Authentication & Adversarial Security Checks
    // ------------------------------------------------------------------------
    console.log('\n--- Section 4: Dual Authentication & Adversarial Security Checks ---');
    // 1. Bearer Token Auth
    const bearerAuthRes = await request('GET', '/api/v1/me', null, {
      Authorization: `Bearer ${TEST_KEY}`,
    });
    assert(
      'Authentication via Bearer token succeeds with HTTP 200',
      bearerAuthRes.status === 200 && bearerAuthRes.data?.success === true,
      `plan: ${bearerAuthRes.data?.data?.workspace?.planKey}`
    );

    // 2. Session Cookie Auth via genuine session from /api/auth
    const signupEmail = `adv_session_${Date.now()}@nexustech.io`;
    const signupRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signup',
        fullName: 'Adversarial Challenger',
        email: signupEmail,
        password: 'AdversarialSecure123!',
        companyName: 'Adversarial Security Corp',
      }),
    });
    const setCookieHeader = signupRes.headers.get('set-cookie') || '';
    const cookieMatch = setCookieHeader.match(/techurity_session=([^;]+)/);
    const validSessionCookie = cookieMatch ? cookieMatch[1] : '';

    assert(
      'User signup yields genuine encrypted techurity_session cookie',
      Boolean(validSessionCookie),
      `cookie length: ${validSessionCookie.length}`
    );

    const cookieAuthRes = await request('GET', '/api/v1/me', null, {
      Authorization: '',
      Cookie: `techurity_session=${validSessionCookie}`,
    });
    assert(
      'Authentication via genuine Session Cookie (techurity_session) succeeds with HTTP 200',
      cookieAuthRes.status === 200 && cookieAuthRes.data?.success === true,
      `auth: ${cookieAuthRes.data?.data?.auth?.keyName}`
    );
    assert(
      'Session cookie authentication identifies caller as "Interactive Session"',
      cookieAuthRes.data?.data?.auth?.keyName === 'Interactive Session',
      `keyName: ${cookieAuthRes.data?.data?.auth?.keyName}`
    );

    // 3. Forged Cookie Tamper Test: Forged/random session cookie MUST be rejected
    const forgedCookieRes = await request('GET', '/api/v1/me', null, {
      Authorization: '',
      Cookie: 'techurity_session=forged_untrusted_cookie_random_data_9999',
    });
    assert(
      'Forged/Untrusted session cookie is rejected with HTTP 401 Unauthorized',
      forgedCookieRes.status === 401 && forgedCookieRes.data?.error?.code === 'unauthorized',
      `status: ${forgedCookieRes.status}, code: ${forgedCookieRes.data?.error?.code}`
    );

    // 4. Missing Auth -> 401
    const noAuthRes = await request('GET', '/api/v1/me', null, {
      Authorization: '',
      Cookie: '',
    });
    assert(
      'Request with no token or cookie returns HTTP 401 Unauthorized',
      noAuthRes.status === 401 && noAuthRes.data?.error?.code === 'unauthorized',
      `status: ${noAuthRes.status}, code: ${noAuthRes.data?.error?.code}`
    );

    // 5. Invalid Bearer Token -> 401
    const invalidAuthRes = await request('GET', '/api/v1/me', null, {
      Authorization: 'Bearer invalid_garbage_token_999',
    });
    assert(
      'Request with invalid Bearer token returns HTTP 401 Unauthorized with code="invalid_api_key"',
      invalidAuthRes.status === 401 && invalidAuthRes.data?.error?.code === 'invalid_api_key',
      `status: ${invalidAuthRes.status}, code: ${invalidAuthRes.data?.error?.code}`
    );

    // 6. Malformed JSON Body -> 400
    const malformedJsonRes = await request('POST', '/api/v1/posts', '{ bad_json: broken', {
      'Content-Type': 'application/json',
    });
    assert(
      'Request with malformed JSON body returns HTTP 400 with code="invalid_json"',
      malformedJsonRes.status === 400 && malformedJsonRes.data?.error?.code === 'invalid_json',
      `status: ${malformedJsonRes.status}, code: ${malformedJsonRes.data?.error?.code}`
    );

    // ------------------------------------------------------------------------
    // SECTION 5: Clean State Teardown & Strict 22-Byte Assertion
    // ------------------------------------------------------------------------
    console.log('\n--- Section 5: Clean State Teardown & 22-Byte Reset ---');
    const resetRes = await fetch(`${BASE_URL}/api/v1/workspaces/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const resetJson = await resetRes.json().catch(() => ({}));
    assert(
      'POST /api/v1/workspaces/reset returns HTTP 200 with success: true',
      resetRes.status === 200 && resetJson.success === true,
      `message: ${resetJson.message}`
    );

    const workspacesFilePath = path.resolve(process.cwd(), '.data', 'workspaces.json');
    assert(
      '.data/workspaces.json file exists on disk',
      fs.existsSync(workspacesFilePath),
      `path: ${workspacesFilePath}`
    );

    if (fs.existsSync(workspacesFilePath)) {
      const stats = fs.statSync(workspacesFilePath);
      const rawContent = fs.readFileSync(workspacesFilePath, 'utf-8');
      const expectedContent = '{\n  "workspaces": {}\n}';

      assert(
        '.data/workspaces.json file size is STRICTLY 22 bytes',
        stats.size === 22,
        `size: ${stats.size} bytes`
      );

      assert(
        '.data/workspaces.json content is STRICTLY {"workspaces":{}}',
        rawContent === expectedContent,
        `content: ${JSON.stringify(rawContent)}`
      );
    }

  } catch (err) {
    console.error('Unexpected failure during adversarial test execution:', err);
    failed++;
    failures.push(err.message);
  }

  // ------------------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------------------
  const total = passed + failed;
  const rate = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log('\n========================================================================');
  console.log('📊 Challenger Adversarial Test Summary:');
  console.log(`   Total Assertions: ${total}`);
  console.log(`   Passed:           ${passed}`);
  console.log(`   Failed:           ${failed}`);
  console.log(`   Pass Rate:        ${rate}%`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error(`💥 Failures encountered (${failed}):`);
    for (const f of failures) {
      console.error(`   - ${f}`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL ADVERSARIAL CHALLENGE ASSERTIONS PASSED WITH ZERO FAILURES!');
    process.exit(0);
  }
}

runAdversarialSuite();
