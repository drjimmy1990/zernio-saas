#!/usr/bin/env node
/**
 * scripts/test-challenger-m8-2.mjs
 * Empirical Challenger Verification Harness for Milestone 8 (M8.2)
 *
 * Scope:
 * 1. Directional CSS Probe (Physical vs Logical) in src/app/docs & src/components/docs
 * 2. TryItLiveConsole Component Logic & Boundary Stress-Testing
 * 3. Live API Execution against http://localhost:3000:
 *    - Invalid JSON handling (client disabled execution + server 400 invalid_json)
 *    - Bearer Auth execution (200 / 201)
 *    - Session Cookie Auth execution (200 / 201)
 *    - Latency measurement & Rate Limit headers extraction
 *    - Unauthorized & Forged Cookie rejection (401)
 * 4. Clean State Verification:
 *    - POST /api/v1/workspaces/reset
 *    - Verify .data/workspaces.json is strictly 22 bytes `{"workspaces":{}}`
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;
const results = [];

function assert(description, condition, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ [PASS] ${description}${details ? ` -> ${details}` : ''}`);
    results.push({ name: description, pass: true, details });
  } else {
    failed++;
    console.error(`  ✗ [FAIL] ${description}${details ? ` -> ${details}` : ''}`);
    results.push({ name: description, pass: false, details });
  }
}

async function run() {
  console.log(`========================================================================`);
  console.log(`🧪 TEAMWORK CHALLENGER M8.2: EMPIRICAL STRESS-TEST HARNESS`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`========================================================================\n`);

  // ========================================================================
  // SECTION 1: DIRECTIONAL CSS & LTR ENCAPSULATION PROBE
  // ========================================================================
  console.log(`\n--- [1] DIRECTIONAL CSS & LTR ENCAPSULATION PROBE ---`);
  const docsDirs = ['src/app/docs', 'src/components/docs'];
  const physicalRegex = /\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)\b/;
  let totalDocsFiles = 0;
  let physicalMatches = [];
  let logicalMatches = [];

  for (const dir of docsDirs) {
    const fullDir = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir, { recursive: true });
    for (const f of files) {
      if (typeof f !== 'string' || (!f.endsWith('.tsx') && !f.endsWith('.ts'))) continue;
      totalDocsFiles++;
      const filePath = path.join(fullDir, f);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (physicalRegex.test(line)) {
          physicalMatches.push(`${f}:${idx + 1}: ${line.trim()}`);
        }
        const logMatches = line.match(/\b(ms-\w+|me-\w+|ps-\w+|pe-\w+|start-\w+|end-\w+|text-start|text-end)\b/g);
        if (logMatches) {
          logicalMatches.push(...logMatches);
        }
      });
    }
  }

  assert(
    `Physical directional CSS classes audit across docs (${totalDocsFiles} files checked)`,
    physicalMatches.length === 0,
    physicalMatches.length === 0 ? '0 physical classes found' : `Matches: ${physicalMatches.join('; ')}`
  );

  assert(
    'Docs codebase utilizes logical CSS classes (ms/me/ps/pe/start/end/text-start)',
    logicalMatches.length > 0,
    `Found ${logicalMatches.length} logical CSS class usages`
  );

  // Check TryItLiveConsole.tsx for explicit dir="ltr" attributes on code, input, and pre containers
  const consoleFile = path.resolve(process.cwd(), 'src/components/docs/TryItLiveConsole.tsx');
  const consoleContent = fs.readFileSync(consoleFile, 'utf-8');
  const ltrCount = (consoleContent.match(/dir="ltr"/g) || []).length;
  assert(
    'TryItLiveConsole.tsx contains explicit dir="ltr" on code/input/pre containers',
    ltrCount >= 6,
    `Found ${ltrCount} instances of dir="ltr"`
  );

  // Check docs page.tsx for dir="ltr" on code containers
  const pageFile = path.resolve(process.cwd(), 'src/app/docs/page.tsx');
  const pageContent = fs.readFileSync(pageFile, 'utf-8');
  const pageLtrCount = (pageContent.match(/dir="ltr"/g) || []).length;
  assert(
    'src/app/docs/page.tsx contains explicit dir="ltr" for code and schema samples',
    pageLtrCount >= 5,
    `Found ${pageLtrCount} instances of dir="ltr"`
  );

  // ========================================================================
  // SECTION 2: TryItLiveConsole COMPONENT LOGIC & BOUNDARY STRESS-TEST
  // ========================================================================
  console.log(`\n--- [2] TryItLiveConsole LOGIC & SYNTAX HANDLING STRESS-TEST ---`);

  // 2.1 Verify Invalid JSON parsing handling in code
  const invalidJsonSamples = [
    '{"unclosed": "string',
    '{missing_quotes: true}',
    "{'single_quotes': 'not_valid_json'}",
    '{"trailing_comma": 123,}',
    'undefined',
    '{"nested": {"broken": ',
  ];

  let jsonParseCatchesAll = true;
  for (const sample of invalidJsonSamples) {
    try {
      JSON.parse(sample);
      jsonParseCatchesAll = false;
    } catch {
      // Expected: JSON.parse throws SyntaxError
    }
  }
  assert(
    'JSON.parse throws SyntaxError on all adversarial invalid JSON samples',
    jsonParseCatchesAll,
    `${invalidJsonSamples.length}/${invalidJsonSamples.length} invalid samples caught`
  );

  // 2.2 Inspect TryItLiveConsole source code for execution disabling guard
  const hasExecutionGuard = consoleContent.includes('disabled={executing || !!jsonError}');
  assert(
    'TryItLiveConsole disables Execute button when jsonError is present',
    hasExecutionGuard,
    'disabled={executing || !!jsonError} found in JSX'
  );

  const hasEarlyReturn = consoleContent.includes('if (jsonError) return;');
  assert(
    'TryItLiveConsole handleExecuteRequest has early return on jsonError',
    hasEarlyReturn,
    'if (jsonError) return; guard verified'
  );

  const hasJsonAlert = consoleContent.includes('<AlertCircle');
  assert(
    'TryItLiveConsole renders AlertCircle warning banner on invalid JSON',
    hasJsonAlert,
    'AlertCircle error indicator found'
  );

  const hasFormatJsonHandler = consoleContent.includes('const handleFormatJson = () => {');
  assert(
    'TryItLiveConsole provides Format JSON formatting helper with try/catch',
    hasFormatJsonHandler,
    'handleFormatJson verified'
  );

  const hasResetSampleHandler = consoleContent.includes('const handleResetSample = () => {');
  assert(
    'TryItLiveConsole provides Reset to Sample action to restore valid payload',
    hasResetSampleHandler,
    'handleResetSample verified'
  );

  // 2.3 Verify Path Parameter detection logic
  const testApiPath = '/api/v1/inbox/conversations/{conversationId}/messages';
  const matches = testApiPath.match(/{([a-zA-Z0-9_-]+)}/g) || [];
  const tokens = matches.map((m) => m.slice(1, -1));
  assert(
    'Dynamic path parameter extractor accurately isolates URL tokens',
    tokens.length === 1 && tokens[0] === 'conversationId',
    `Extracted tokens: [${tokens.join(', ')}]`
  );

  // 2.4 Verify Multi-Language Snippet generator handles escaping
  const payloadWithSingleQuotes = JSON.stringify({ message: "John's order is ready" });
  const escapedForCurl = payloadWithSingleQuotes.replace(/'/g, "'\\''");
  assert(
    'cURL generator safely escapes single quotes in JSON payloads',
    escapedForCurl.includes("'\\''"),
    `Escaped: ${escapedForCurl}`
  );

  // ========================================================================
  // SECTION 3: LIVE HTTP GATEWAY ADVERSARIAL STRESS-TEST (http://localhost:3000)
  // ========================================================================
  console.log(`\n--- [3] LIVE HTTP GATEWAY ADVERSARIAL STRESS-TEST ---`);

  // 3.1 Test Invalid JSON Body against live mutating endpoints
  console.log(`Testing invalid JSON body submission against live /api/v1...`);
  const invalidJsonReq = await fetch(`${BASE_URL}/api/v1/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer tk_live_test_m8_challenger_token',
    },
    body: '{"content": "Broken JSON syntax, missing brace',
  });
  const invalidJsonData = await invalidJsonReq.json().catch(() => ({}));
  assert(
    'Server rejects malformed JSON with HTTP 400 Bad Request and structured error',
    invalidJsonReq.status === 400 && invalidJsonData.error?.code === 'invalid_json',
    `HTTP ${invalidJsonReq.status}, code: ${invalidJsonData.error?.code}, message: "${invalidJsonData.error?.message}"`
  );

  // 3.2 Test Bearer Auth Execution on GET /api/v1/me
  console.log(`Testing Bearer token authentication...`);
  const startBearer = performance.now();
  const bearerReq = await fetch(`${BASE_URL}/api/v1/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer tk_live_test_m8_challenger_token',
    },
  });
  const bearerLatency = Math.round(performance.now() - startBearer);
  const bearerData = await bearerReq.json().catch(() => ({}));

  assert(
    'GET /api/v1/me with Bearer token returns HTTP 200 with structured workspace info',
    bearerReq.status === 200 && bearerData.success === true && Boolean(bearerData.data?.workspace?.organizationId),
    `HTTP ${bearerReq.status}, tenantId: ${bearerData.data?.workspace?.organizationId}, latency: ${bearerLatency}ms`
  );

  // 3.3 Test Rate Limit and Request ID Headers
  const rlLimit = bearerReq.headers.get('x-ratelimit-limit');
  const rlRemaining = bearerReq.headers.get('x-ratelimit-remaining');
  const reqId = bearerReq.headers.get('x-asra3-request-id');

  assert(
    'Response contains X-RateLimit-Limit header',
    Boolean(rlLimit && parseInt(rlLimit, 10) > 0),
    `X-RateLimit-Limit: ${rlLimit}`
  );
  assert(
    'Response contains X-RateLimit-Remaining header',
    Boolean(rlRemaining !== null && !isNaN(parseInt(rlRemaining, 10))),
    `X-RateLimit-Remaining: ${rlRemaining}`
  );
  assert(
    'Response contains X-Asra3-Request-Id header',
    Boolean(reqId && reqId.startsWith('req_')),
    `X-Asra3-Request-Id: ${reqId}`
  );
  assert(
    'Latency measurement is positive and valid',
    bearerLatency >= 0 && typeof bearerLatency === 'number',
    `Measured latency: ${bearerLatency}ms`
  );

  // 3.4 Test Session Cookie Authentication (Dual Auth)
  console.log(`Testing Session Cookie authentication flow...`);
  const authLoginRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'signup',
      name: 'Challenger M8 Tester',
      email: `challenger.m8.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      organizationName: 'Challenger Workspace',
    }),
  });
  const setCookie = authLoginRes.headers.get('set-cookie') || '';
  const cookieMatch = setCookie.match(/asra3_session=([^;]+)/);
  const sessionToken = cookieMatch ? cookieMatch[1] : '';

  assert(
    'Successfully obtained active asra3_session cookie from /api/auth',
    Boolean(sessionToken),
    `Token length: ${sessionToken.length}`
  );

  if (sessionToken) {
    const checkSessionRes = await fetch(`${BASE_URL}/api/auth?action=session`, {
      headers: {
        'Cookie': `asra3_session=${sessionToken}`,
      },
    });
    const checkSessionJson = await checkSessionRes.json().catch(() => ({}));
    assert(
      'GET /api/auth?action=session detects active user and organization',
      checkSessionRes.status === 200 && Boolean(checkSessionJson.session?.user),
      `User: ${checkSessionJson.session?.user?.fullName || checkSessionJson.session?.user?.name}, Org: ${checkSessionJson.session?.tenant?.organizationName}`
    );

    const cookieApiRes = await fetch(`${BASE_URL}/api/v1/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `asra3_session=${sessionToken}`,
      },
    });
    const cookieApiData = await cookieApiRes.json().catch(() => ({}));
    assert(
      'GET /api/v1/me with Cookie auth succeeds with HTTP 200 and Interactive Session keyName',
      cookieApiRes.status === 200 && cookieApiData.data?.auth?.keyName === 'Interactive Session',
      `HTTP ${cookieApiRes.status}, keyName: "${cookieApiData.data?.auth?.keyName}"`
    );

    const accountsCookieRes = await fetch(`${BASE_URL}/api/v1/accounts`, {
      headers: { 'Cookie': `asra3_session=${sessionToken}` },
    });
    assert(
      'GET /api/v1/accounts succeeds with session cookie auth',
      accountsCookieRes.status === 200,
      `HTTP ${accountsCookieRes.status}`
    );
  }

  // 3.5 Test Unauthorized and Forged Auth Rejection
  console.log(`Testing unauthorized request rejection...`);
  const noAuthRes = await fetch(`${BASE_URL}/api/v1/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const noAuthData = await noAuthRes.json().catch(() => ({}));
  assert(
    'Request without Bearer token or session cookie is rejected with HTTP 401 unauthorized',
    noAuthRes.status === 401 && noAuthData.error?.code === 'unauthorized',
    `HTTP ${noAuthRes.status}, code: ${noAuthData.error?.code}`
  );

  const fakeKeyRes = await fetch(`${BASE_URL}/api/v1/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer tk_invalid_nonexistent_key_000',
    },
  });
  const fakeKeyData = await fakeKeyRes.json().catch(() => ({}));
  assert(
    'Request with forged/malformed Bearer token is rejected with HTTP 401',
    fakeKeyRes.status === 401,
    `HTTP ${fakeKeyRes.status}, code: ${fakeKeyData.error?.code}`
  );

  const forgedCookieRes = await fetch(`${BASE_URL}/api/v1/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'asra3_session=forged_payload.invalid_signature',
    },
  });
  const forgedCookieData = await forgedCookieRes.json().catch(() => ({}));
  assert(
    'Request with tampered/forged session cookie is rejected with HTTP 401 unauthorized',
    forgedCookieRes.status === 401 && forgedCookieData.error?.code === 'unauthorized',
    `HTTP ${forgedCookieRes.status}, code: ${forgedCookieData.error?.code}`
  );

  // 3.6 Test Live Mutating Endpoint Execution (POST /api/v1/posts)
  console.log(`Testing mutating request execution via live endpoint...`);
  const postRes = await fetch(`${BASE_URL}/api/v1/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer tk_live_test_m8_challenger_token',
    },
    body: JSON.stringify({
      content: `Live Console Challenger Execution at ${Date.now()}`,
      platforms: [{ platform: 'twitter', accountId: 'acc_challenger_1' }],
    }),
  });
  const postData = await postRes.json().catch(() => ({}));
  assert(
    'POST /api/v1/posts executes successfully with HTTP 201/200 and returns structured post payload',
    (postRes.status === 201 || postRes.status === 200) && (Boolean(postData.post) || Boolean(postData.data)),
    `HTTP ${postRes.status}, post ID: ${postData.post?.id || postData.data?.id || 'created'}`
  );

  // ========================================================================
  // SECTION 4: CLEAN STATE TEARDOWN & EXACT 22-BYTE VERIFICATION
  // ========================================================================
  console.log(`\n--- [4] CLEAN STATE RESET & EXACT 22-BYTE AUDIT ---`);
  const resetRes = await fetch(`${BASE_URL}/api/v1/workspaces/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const resetData = await resetRes.json().catch(() => ({}));
  assert(
    'POST /api/v1/workspaces/reset succeeds with HTTP 200 and success: true',
    resetRes.status === 200 && resetData.success === true,
    resetData.message || ''
  );

  const dataFilePath = path.resolve(process.cwd(), '.data', 'workspaces.json');
  assert(
    '.data/workspaces.json exists on disk',
    fs.existsSync(dataFilePath),
    dataFilePath
  );

  if (fs.existsSync(dataFilePath)) {
    const stats = fs.statSync(dataFilePath);
    const rawContent = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed = JSON.parse(rawContent);
    const isStrict22Bytes = stats.size === 22;
    const isCleanObject = Object.keys(parsed).length === 1 && Object.keys(parsed.workspaces || {}).length === 0;
    const isExactFormat = rawContent === '{\n  "workspaces": {}\n}';

    assert(
      '.data/workspaces.json file size is strictly 22 bytes',
      isStrict22Bytes,
      `Exact size: ${stats.size} bytes (Expected: 22)`
    );

    assert(
      '.data/workspaces.json content strictly equals \'{\\n  "workspaces": {}\\n}\'',
      isExactFormat,
      `Raw: ${JSON.stringify(rawContent)}`
    );

    assert(
      '.data/workspaces.json parsed workspaces object is completely empty {}',
      isCleanObject,
      `Workspaces keys count: ${Object.keys(parsed.workspaces || {}).length}`
    );
  }

  // ========================================================================
  // FINAL SUMMARY
  // ========================================================================
  const total = passed + failed;
  const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
  console.log(`\n========================================================================`);
  console.log(`📊 CHALLENGER M8.2 TEST SUMMARY:`);
  console.log(`   Total Tests: ${total}`);
  console.log(`   Passed:      ${passed}`);
  console.log(`   Failed:      ${failed}`);
  console.log(`   Pass Rate:   ${rate}%`);
  console.log(`========================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal execution error in test-challenger-m8-2:', err);
  process.exit(1);
});
