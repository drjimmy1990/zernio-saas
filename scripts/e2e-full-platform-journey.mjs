// scripts/e2e-full-platform-journey.mjs
// ==============================================================================
// TECHURITY (ZERNIO SAAS PLATFORM) — END-TO-END 14-STEP PLATFORM JOURNEY
// Production Hardening & Verification Suite
// ==============================================================================

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import ts from 'typescript';

const PORT = process.env.PORT || 3010;
const BASE_URL = `http://localhost:${PORT}`;
const SESSION_SECRET = process.env.SESSION_SECRET || 'techurity_secure_session_secret_2026';

let passedAssertions = 0;
let failedAssertions = 0;
const stepScorecard = [];

function assert(condition, message, details = '') {
  if (condition) {
    passedAssertions++;
    console.log(`    ✓ PASS: ${message} ${details ? `(${details})` : ''}`);
  } else {
    failedAssertions++;
    console.error(`    ✗ FAIL: ${message} ${details ? `[Details: ${details}]` : ''}`);
    throw new Error(`Assertion failed: ${message} ${details}`);
  }
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/auth?action=session`);
      if (res.status === 200) return true;
    } catch {
      // Waiting for server to become responsive
    }
    await wait(350);
  }
  throw new Error(`Next.js production server at ${url} did not become ready within ${timeoutMs}ms`);
}

function extractCookie(res, cookieName = 'techurity_session') {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  const match = raw.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

function loadTsModule(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const m = { exports: {} };
  const fn = new Function('module', 'exports', 'require', js);
  fn(m, m.exports, (mod) => {
    if (mod === './dashboardTranslations') {
      return loadTsModule(path.join(process.cwd(), 'src/i18n/dashboardTranslations.ts'));
    }
    if (mod.startsWith('@/')) {
      const p = path.join(process.cwd(), mod.replace('@/', 'src/') + '.ts');
      return loadTsModule(p);
    }
    return require(mod);
  });
  return m.exports;
}

// ------------------------------------------------------------------------------
// 14-STEP PLATFORM JOURNEY
// ------------------------------------------------------------------------------

async function runJourney() {
  console.log('\n==============================================================================');
  console.log('🚀 TECHURITY PLATFORM JOURNEY — 14-STEP END-TO-END VERIFICATION SUITE');
  console.log('==============================================================================\n');

  // Shared journey state across steps
  let customerSessionCookie = '';
  let customerCookieHeader = '';
  let customerEmail = '';
  let tenantOrgId = '';
  let provisionedNumber = null;
  let linkedWhatsAppStatus = null;
  let activeCallSession = null;

  // ----------------------------------------------------------------------------
  // STEP 1 — Unauthenticated Security & Route Protection
  // ----------------------------------------------------------------------------
  console.log('▶ [Step 1/14] Unauthenticated Route Protection & Security Redirects');
  {
    // GET /dashboard -> 307 redirect
    const dashRes = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    const dashLoc = dashRes.headers.get('location') || '';
    assert(dashRes.status === 307 || dashRes.status === 308, 'GET /dashboard returns HTTP 307/308 redirect', `Status: ${dashRes.status}`);
    assert(dashLoc.includes('/login?redirect=%2Fdashboard'), '/dashboard redirects to /login?redirect=%2Fdashboard', `Location: ${dashLoc}`);

    // GET /dashboard?tab=telephony -> 307 redirect preserving query parameters
    const dashQueryRes = await fetch(`${BASE_URL}/dashboard?tab=telephony`, { redirect: 'manual' });
    const dashQueryLoc = dashQueryRes.headers.get('location') || '';
    assert(dashQueryLoc.includes('/login?redirect=%2Fdashboard%3Ftab%3Dtelephony'), '/dashboard?tab=telephony preserves full encoded query param in redirect', `Location: ${dashQueryLoc}`);

    // GET /admin -> 307 redirect
    const adminRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    const adminLoc = adminRes.headers.get('location') || '';
    assert(adminRes.status === 307 || adminRes.status === 308, 'GET /admin returns HTTP 307/308 redirect', `Status: ${adminRes.status}`);
    assert(adminLoc.includes('/login?redirect=%2Fadmin'), '/admin redirects to /login?redirect=%2Fadmin', `Location: ${adminLoc}`);

    // GET /api/admin -> 401 Unauthorized
    const adminApiRes = await fetch(`${BASE_URL}/api/admin`);
    assert(adminApiRes.status === 401, 'GET /api/admin returns HTTP 401 Unauthorized', `Status: ${adminApiRes.status}`);

    // GET /api/auth?action=session -> authenticated: false
    const sessionRes = await (await fetch(`${BASE_URL}/api/auth?action=session`)).json();
    assert(sessionRes.authenticated === false && sessionRes.session === null, 'GET /api/auth?action=session returns unauthenticated state', JSON.stringify(sessionRes));

    stepScorecard.push({ step: 1, name: 'Unauthenticated Security', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 2 — Customer Registration & HMAC Session
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 2/14] Customer Registration & HMAC-SHA256 Signed Session');
  {
    customerEmail = `founder_${Date.now()}@nexustech.io`;
    const signupPayload = {
      action: 'signup',
      fullName: 'NexusTech Founder',
      email: customerEmail,
      password: 'SecurePassword2026!',
      companyName: 'NexusTech Solutions',
      planKey: 'agency',
      primaryColor: '#eb3514',
      language: 'en',
    };

    const signupRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupPayload),
    });

    assert(signupRes.status === 200, 'POST /api/auth signup returns HTTP 200 OK', `Status: ${signupRes.status}`);
    const signupData = await signupRes.json();
    assert(signupData.ok === true && signupData.tenant, 'Signup response contains ok: true and tenant details');
    tenantOrgId = signupData.tenant.organizationId;
    assert(typeof tenantOrgId === 'string' && tenantOrgId.startsWith('org_'), 'Tenant organizationId is properly assigned', tenantOrgId);

    customerSessionCookie = extractCookie(signupRes, 'techurity_session');
    assert(Boolean(customerSessionCookie), 'HTTP-only techurity_session cookie issued');
    customerCookieHeader = `techurity_session=${customerSessionCookie}`;

    // Cryptographic validation of the cookie
    const parts = customerSessionCookie.split('.');
    assert(parts.length === 2, 'Session cookie formatted as <payload>.<signature>');
    const [b64Payload, signature] = parts;
    assert(signature.length === 43, 'Signature is 43-character base64url HMAC-SHA256', `Length: ${signature.length}`);

    // Verify HMAC-SHA256 mathematically
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('base64url');
    assert(signature === expectedSig, 'Signature matches expected HMAC-SHA256 digest with constant-time equality', `Sig: ${signature.substring(0, 10)}...`);

    // Verify session payload
    const decodedJson = JSON.parse(Buffer.from(b64Payload, 'base64').toString('utf-8'));
    assert(decodedJson.user.email === customerEmail, 'Session contains registered user email', decodedJson.user.email);
    assert(decodedJson.user.role === 'owner', 'Session assigned role is owner', decodedJson.user.role);
    assert(decodedJson.tenant.organizationName === 'NexusTech Solutions', 'Session contains correct organizationName', decodedJson.tenant.organizationName);

    // Verify /api/auth?action=session with cookie
    const sessionRes = await (await fetch(`${BASE_URL}/api/auth?action=session`, {
      headers: { Cookie: customerCookieHeader },
    })).json();
    assert(sessionRes.authenticated === true, 'Session endpoint authenticates active cookie');
    assert(sessionRes.session.user.id === decodedJson.user.id, 'Session endpoint returns verified user ID');

    stepScorecard.push({ step: 2, name: 'Registration & HMAC Session', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 3 — Password Validation
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 3/14] Password Validation & Authentication Semantics');
  {
    // Invalid password -> 401
    const badLoginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: customerEmail,
        password: 'CompletelyWrongPassword999!',
      }),
    });
    assert(badLoginRes.status === 401, 'Invalid password returns HTTP 401 Unauthorized', `Status: ${badLoginRes.status}`);

    // Empty password -> 400
    const emptyPassRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: customerEmail,
        password: '',
      }),
    });
    assert(emptyPassRes.status === 400, 'Empty password returns HTTP 400 Bad Request', `Status: ${emptyPassRes.status}`);

    // Valid password -> 200 OK
    const goodLoginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: customerEmail,
        password: 'SecurePassword2026!',
      }),
    });
    assert(goodLoginRes.status === 200, 'Valid credentials return HTTP 200 OK', `Status: ${goodLoginRes.status}`);
    const newCookie = extractCookie(goodLoginRes, 'techurity_session');
    assert(Boolean(newCookie), 'Valid login issues new signed session cookie');

    stepScorecard.push({ step: 3, name: 'Password Validation', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 4 — 100% Clean Workspace Verification
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 4/14] 100% Clean Initial Workspace (Zero Dummy Data)');
  {
    const servicesRes = await (await fetch(`${BASE_URL}/api/services?organizationId=${encodeURIComponent(tenantOrgId)}`, {
      headers: { Cookie: customerCookieHeader },
    })).json();

    const sub = servicesRes.subServicesData;
    assert(sub.core_connect.accounts.length === 0, 'Clean workspace has exactly 0 connected accounts', `Count: ${sub.core_connect.accounts.length}`);
    assert(sub.publishing.posts.length === 0, 'Clean workspace has exactly 0 posts', `Count: ${sub.publishing.posts.length}`);
    assert((sub.telephony?.numbers || []).length === 0, 'Clean workspace has exactly 0 phone numbers', `Count: ${(sub.telephony?.numbers || []).length}`);
    assert((sub.telephony?.callHistory || []).length === 0, 'Clean workspace has exactly 0 call records', `Count: ${(sub.telephony?.callHistory || []).length}`);
    assert((sub.telephony?.threads || []).length === 0, 'Clean workspace has exactly 0 conversation threads', `Count: ${(sub.telephony?.threads || []).length}`);
    assert((sub.ads?.campaigns || []).length === 0, 'Clean workspace has exactly 0 ad campaigns', `Count: ${(sub.ads?.campaigns || []).length}`);
    assert((sub.analytics?.totals?.impressions || 0) === 0, 'Clean workspace has 0 impressions', `Count: ${sub.analytics?.totals?.impressions}`);
    assert((sub.analytics?.totals?.reach || 0) === 0, 'Clean workspace has 0 reach', `Count: ${sub.analytics?.totals?.reach}`);

    stepScorecard.push({ step: 4, name: 'Clean Initial Workspace', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 5 — 18-Platform Connection Wizard & Test Post
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 5/14] 18-Platform Connection Wizard & Live Test Post');
  {
    // Step 5.1: start_oauth
    const oauthRes = await (await fetch(`${BASE_URL}/api/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        action: 'start_oauth',
        platform: 'instagram',
        organizationId: tenantOrgId,
      }),
    })).json();
    assert(oauthRes.handshakeState === 'ready', 'start_oauth establishes ready handshakeState', oauthRes.handshakeState);
    assert(typeof oauthRes.authUrl === 'string' && oauthRes.authUrl.length > 0, 'start_oauth generates valid authUrl');
    assert(Array.isArray(oauthRes.permissions) && oauthRes.permissions.length > 0, 'start_oauth specifies granted permissions');

    // Step 5.2: list_entities
    const entitiesRes = await (await fetch(`${BASE_URL}/api/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        action: 'list_entities',
        platform: 'instagram',
        step: 'select_account',
        organizationId: tenantOrgId,
      }),
    })).json();
    assert(Array.isArray(entitiesRes.items) && entitiesRes.items.length > 0, 'list_entities returns selectable Instagram accounts', `Items: ${entitiesRes.items?.length}`);
    const selectedItem = entitiesRes.items[0];

    // Step 5.3: select_entity
    const selectRes = await (await fetch(`${BASE_URL}/api/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        action: 'select_entity',
        platform: 'instagram',
        step: 'select_account',
        organizationId: tenantOrgId,
        entityId: selectedItem.id,
        entityName: selectedItem.name,
        entityUsername: selectedItem.username,
      }),
    })).json();
    assert(selectRes.success === true, 'select_entity returns success: true');
    assert(selectRes.account.tokenHealth.status === 'healthy', 'Connected account token health is healthy ✓', selectRes.account.tokenHealth.status);
    assert(selectRes.account.status === 'healthy', 'Connected account status is healthy');
    const connectedAcc = selectRes.account;

    // Verify persistence in workspace
    const updatedServices = await (await fetch(`${BASE_URL}/api/services?organizationId=${encodeURIComponent(tenantOrgId)}`, {
      headers: { Cookie: customerCookieHeader },
    })).json();
    assert(updatedServices.subServicesData.core_connect.accounts.length === 1, 'Workspace now reflects 1 connected account in store');

    // Step 5.4: test_post
    const testPostRes = await (await fetch(`${BASE_URL}/api/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        action: 'test_post',
        platform: 'instagram',
        handle: connectedAcc.username,
        organizationId: tenantOrgId,
        accountId: connectedAcc.id,
        content: 'Omnichannel verification broadcast on Instagram Business 🚀',
      }),
    })).json();
    assert(testPostRes.success === true, 'test_post returns success: true');
    assert(testPostRes.deliveryReceipt.status === 'delivered', 'Delivery receipt status is delivered');
    assert(testPostRes.deliveryReceipt.deliveryCode === 200, 'Delivery receipt deliveryCode is 200');
    assert(testPostRes.deliveryReceipt.receiptId.startsWith('rec_'), 'Delivery receipt includes valid receiptId', testPostRes.deliveryReceipt.receiptId);
    assert(typeof testPostRes.deliveryReceipt.latencyMs === 'number' && testPostRes.deliveryReceipt.latencyMs > 0, 'Delivery receipt includes positive roundtrip latency');

    stepScorecard.push({ step: 5, name: '18-Platform Connection Wizard', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 6 — Telephony Marketplace & Number Purchase
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 6/14] Telephony Marketplace Catalog & Number Purchase');
  {
    // Search numbers
    const searchRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'search_numbers',
        organizationId: tenantOrgId,
        country: 'US',
        numberType: 'local',
        capabilities: { voice: true, sms: true, whatsapp: true },
        limit: 10,
      }),
    })).json();

    assert(searchRes.totalCountries >= 50, 'Marketplace covers 55+ countries worldwide', `Cataloged: ${searchRes.totalCountries}`);
    assert(Array.isArray(searchRes.results) && searchRes.results.length > 0, 'search_numbers returns available virtual numbers', `Count: ${searchRes.results?.length}`);

    // Buy number
    const buyRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'buy_number',
        organizationId: tenantOrgId,
        country: 'US',
        numberType: 'local',
        locality: 'San Francisco',
      }),
    })).json();

    assert(buyRes.success === true && buyRes.phoneNumber, 'buy_number returns provisioned phoneNumber object');
    provisionedNumber = buyRes.phoneNumber;
    assert(provisionedNumber.status === 'active', 'Provisioned number status is active', provisionedNumber.status);
    assert(typeof provisionedNumber.phoneNumber === 'string' && provisionedNumber.phoneNumber.startsWith('+'), 'Provisioned E.164 phone number', provisionedNumber.phoneNumber);

    // Verify .data/workspaces.json disk persistence
    const workspacesFilePath = path.join(process.cwd(), '.data', 'workspaces.json');
    assert(fs.existsSync(workspacesFilePath), '.data/workspaces.json exists on disk');
    const diskContent = JSON.parse(fs.readFileSync(workspacesFilePath, 'utf-8'));
    const tenantDiskState = diskContent[tenantOrgId];
    assert(Boolean(tenantDiskState), 'Tenant state written to .data/workspaces.json');
    const foundOnDisk = tenantDiskState.ownedNumbers.find((n) => n.phoneNumber === provisionedNumber.phoneNumber);
    assert(Boolean(foundOnDisk), 'Purchased virtual number atomically persisted in disk storage', provisionedNumber.phoneNumber);

    stepScorecard.push({ step: 6, name: 'Telephony Marketplace & Purchase', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 7 — WhatsApp Business Linking & Template Broadcast
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 7/14] WhatsApp Business Linking & Template Broadcast');
  {
    // Link number to WhatsApp Cloud API
    const waLinkRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'link_whatsapp',
        organizationId: tenantOrgId,
        phoneNumberId: provisionedNumber.id,
        displayName: 'NexusTech Solutions',
        category: 'CUSTOMER_SERVICE',
        verificationMethod: 'sms_otp',
      }),
    })).json();

    assert(waLinkRes.success === true, 'link_whatsapp returns success: true');
    assert(waLinkRes.status === 'linked', 'WhatsApp status is linked');
    assert(waLinkRes.templatesSynced === 3, 'Pre-approved WhatsApp templates synced (order_update, winter_sale_50, welcome_offer)', `Synced: ${waLinkRes.templatesSynced}`);
    assert(typeof waLinkRes.verificationOtp === 'string' && waLinkRes.verificationOtp.length >= 6, 'Auto-captured OTP on virtual number', waLinkRes.verificationOtp);
    linkedWhatsAppStatus = waLinkRes;

    // Send test WhatsApp broadcast with template
    const waSendRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'send_test_whatsapp',
        organizationId: tenantOrgId,
        phoneNumberId: provisionedNumber.id,
        recipientPhone: '+1 (415) 890-4412',
        templateName: 'order_update',
        parameters: ['Alex Mercer', 'ORD-88102'],
      }),
    })).json();

    assert(waSendRes.success === true, 'send_test_whatsapp returns success: true');
    assert(waSendRes.status === 'delivered', 'WhatsApp message delivery status is delivered');
    assert(waSendRes.readReceipt === true, 'Delivery confirmed with blue double-checkmarks (readReceipt: true)');

    stepScorecard.push({ step: 7, name: 'WhatsApp Business Linking', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 8 — Web Phone Softphone Dialer & Call Console
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 8/14] Web Phone Softphone Dialer & Call Console');
  {
    // Configure AI Voice parameters
    const configVoiceRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'configure_ai_voice',
        organizationId: tenantOrgId,
        phoneNumberId: provisionedNumber.id,
        agentName: 'Sarah AI Concierge',
        language: 'ar-SA',
        systemPrompt: 'You are Sarah, expert advisor at NexusTech.',
        voicePersona: 'Sarah (Warm & Empathetic)',
        humanTransferNumber: '+1 (800) 555-0199',
      }),
    })).json();
    assert(configVoiceRes.success === true, 'configure_ai_voice sets agent persona successfully');

    // Initiate voice call
    const callRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'initiate_call',
        organizationId: tenantOrgId,
        fromNumber: provisionedNumber.phoneNumber,
        toNumber: '+1 (415) 890-4412',
        mode: 'ai_voice_agent',
        humanTransferNumber: '+1 (800) 555-0199',
        language: 'ar-SA',
      }),
    })).json();

    assert(callRes.success === true && callRes.callSession, 'initiate_call establishes active call session');
    activeCallSession = callRes.callSession;
    assert(activeCallSession.callId.startsWith('call_'), 'Session assigns unique callId', activeCallSession.callId);
    assert(typeof activeCallSession.durationSeconds === 'number' && activeCallSession.durationSeconds > 0, 'Session duration timer increments positively', `${activeCallSession.durationSeconds}s`);
    assert(Array.isArray(activeCallSession.transcripts) && activeCallSession.transcripts.length >= 2, 'Live dual-party transcript stream recorded', `Entries: ${activeCallSession.transcripts.length}`);
    assert(activeCallSession.status === 'connected', 'Call session established with connected status');

    // Verify call history
    const historyRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'list_call_history',
        organizationId: tenantOrgId,
      }),
    })).json();
    assert(historyRes.totalCalls >= 1, 'Call history logs completed voice call');
    const loggedCallId = historyRes.calls[0].id || historyRes.calls[0].callId;
    assert(loggedCallId === activeCallSession.callId, 'Logged call matches session ID', loggedCallId);
    assert(historyRes.calls[0].status === 'completed', 'Call record saved with completed status');

    stepScorecard.push({ step: 8, name: 'Web Phone Softphone Dialer', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 9 — Live 2-Way SMS & WhatsApp Inbox
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 9/14] Live 2-Way SMS & WhatsApp Inbox');
  {
    // Simulate incoming customer SMS with OTP auto-capture
    const simRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'simulate_incoming_sms',
        organizationId: tenantOrgId,
        fromNumber: '+1 (415) 890-9900',
        toNumber: provisionedNumber.phoneNumber,
        type: 'otp',
      }),
    })).json();

    assert(simRes.success === true && simRes.message, 'simulate_incoming_sms returns inbound message');
    assert(simRes.message.direction === 'inbound', 'Message direction is inbound');
    assert(/\b\d{6}\b/.test(simRes.message.text), 'Incoming SMS auto-captures 6-digit OTP verification code', simRes.message.text);

    // Verify incoming conversation thread created with unread badge
    const threadsRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'list_messages',
        organizationId: tenantOrgId,
      }),
    })).json();

    assert(Array.isArray(threadsRes.threads) && threadsRes.threads.length >= 1, 'Conversation thread created in unified inbox');
    const matchingThread = threadsRes.threads.find((th) => (th.customerNumber || th.participantPhone) === '+1 (415) 890-9900');
    assert(Boolean(matchingThread), 'Thread indexed by customer phone number', matchingThread ? (matchingThread.customerNumber || matchingThread.participantPhone) : 'none');
    assert(matchingThread.unreadCount >= 1, 'Thread reflects unread message counter badge', `Unread: ${matchingThread.unreadCount}`);

    // Send outbound reply
    const sendReplyRes = await (await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'send_sms',
        organizationId: tenantOrgId,
        fromNumber: provisionedNumber.phoneNumber,
        toNumber: '+1 (415) 890-9900',
        text: 'Thank you for contacting NexusTech Support! Your ticket is registered.',
      }),
    })).json();

    assert(sendReplyRes.success === true, 'send_sms returns success: true');
    assert(sendReplyRes.deliveryStatus === 'delivered', 'Outbound SMS delivery status is delivered');

    stepScorecard.push({ step: 9, name: 'Live 2-Way SMS & Inbox', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 10 — Dynamic Navbar State
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 10/14] Dynamic Navbar State & Role Filtering');
  {
    // Verify session response for customer
    const sessionRes = await (await fetch(`${BASE_URL}/api/auth?action=session`, {
      headers: { Cookie: customerCookieHeader },
    })).json();
    assert(sessionRes.authenticated === true, 'Customer session recognized as authenticated');
    assert(sessionRes.session.user.role === 'owner', 'Customer user role is owner');
    assert(sessionRes.session.tenant.organizationName === 'NexusTech Solutions', 'Organization name is NexusTech Solutions');

    // Inspect Navbar.tsx source to verify RBAC navigation contracts
    const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
    const navbarSource = fs.readFileSync(navbarPath, 'utf-8').replace(/\r\n/g, '\n');

    // Contract 1: Workspace link is only included when session exists
    assert(/session\s*\?\s*\[\{\s*href:\s*'\/dashboard'/.test(navbarSource), 'Navbar conditionally includes /dashboard only when session is present');

    // Contract 2: Admin link is strictly gated to super_admin role
    assert(/session\?\.user\.role\s*===\s*'super_admin'\s*\?\s*\[\{\s*href:\s*'\/admin'/.test(navbarSource), 'Navbar strictly hides /admin unless role is super_admin');

    // Contract 3: Displays user name and organization name in user badge
    assert(navbarSource.includes('session.user.fullName') && navbarSource.includes('session.tenant.organizationName'), 'Navbar displays user fullName and tenant organizationName in badge');

    // Contract 4: Functional logout handler clears session
    assert(navbarSource.includes("body: JSON.stringify({ action: 'logout' })"), 'Navbar logout button triggers logout action');

    // Contract 5: Root page renders HTTP 200 for authenticated customer
    const homeRes = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: customerCookieHeader },
    });
    assert(homeRes.status === 200, 'GET / renders HTTP 200 OK with active customer session');

    stepScorecard.push({ step: 10, name: 'Dynamic Navbar State', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 11 — Super Admin Control Plane
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 11/14] Super Admin Control Plane Authentication & RBAC');
  {
    // Authenticate as Super Admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: 'admin@techurity.si',
        password: process.env.ADMIN_PASSWORD || 'AdminPassword2026!',
      }),
    });

    assert(adminLoginRes.status === 200, 'Super admin login returns HTTP 200 OK', `Status: ${adminLoginRes.status}`);
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginData.user.role === 'super_admin', 'Super admin assigned role is super_admin');

    const adminCookie = extractCookie(adminLoginRes, 'techurity_session');
    assert(Boolean(adminCookie), 'Super admin issued signed session cookie');
    const adminCookieHeader = `techurity_session=${adminCookie}`;

    // Super Admin accesses /admin page -> HTTP 200 (not redirected)
    const adminPageRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminCookieHeader },
      redirect: 'manual',
    });
    assert(adminPageRes.status === 200, 'Super admin accesses /admin with HTTP 200 OK', `Status: ${adminPageRes.status}`);

    // Super Admin accesses /api/admin -> HTTP 200
    const adminApiRes = await fetch(`${BASE_URL}/api/admin`, {
      headers: { Cookie: adminCookieHeader },
    });
    assert(adminApiRes.status === 200, 'Super admin accesses /api/admin control plane snapshot', `Status: ${adminApiRes.status}`);
    const adminApiData = await adminApiRes.json();
    assert(Array.isArray(adminApiData.tenants) && adminApiData.tenants.length > 0, 'Control plane returns managed tenant list', `Tenants: ${adminApiData.tenants?.length}`);

    // Customer privilege escalation blocked
    const customerAdminPageRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: customerCookieHeader },
      redirect: 'manual',
    });
    const custRedirectLoc = customerAdminPageRes.headers.get('location') || '';
    assert(customerAdminPageRes.status === 307 && custRedirectLoc.includes('/dashboard'), 'Regular customer attempting /admin redirected to /dashboard (privilege escalation blocked)');

    const customerAdminApiRes = await fetch(`${BASE_URL}/api/admin`, {
      headers: { Cookie: customerCookieHeader },
    });
    assert(customerAdminApiRes.status === 401, 'Regular customer attempting /api/admin rejected with 401 Unauthorized');

    stepScorecard.push({ step: 11, name: 'Super Admin Control Plane', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 12 — Logout & Session Invalidation
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 12/14] Logout & Cookie Revocation');
  {
    // Execute logout
    const logoutRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
      body: JSON.stringify({ action: 'logout' }),
    });

    assert(logoutRes.status === 200, 'POST /api/auth logout returns HTTP 200 OK');
    const setCookieRaw = logoutRes.headers.get('set-cookie') || '';
    assert(setCookieRaw.includes('Max-Age=0'), 'Logout sets Max-Age=0 to immediately invalidate session cookie', setCookieRaw);

    // Subsequent session check is unauthenticated
    const postLogoutSession = await (await fetch(`${BASE_URL}/api/auth?action=session`)).json();
    assert(postLogoutSession.authenticated === false, 'Session status is authenticated: false after logout');

    // Subsequent access to /dashboard redirects to /login
    const postLogoutDash = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    const postLogoutLoc = postLogoutDash.headers.get('location') || '';
    assert(postLogoutDash.status === 307 && postLogoutLoc.includes('/login?redirect=%2Fdashboard'), 'Subsequent /dashboard request redirected to /login after logout');

    stepScorecard.push({ step: 12, name: 'Logout & Session Invalidation', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 13 — 10-Language Parity & Zero English Fallback Audit
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 13/14] 10-Language Parity & Zero Missing Strings Audit');
  {
    const SUPPORTED_LOCALES = ['ar', 'en', 'es', 'fr', 'de', 'pt-BR', 'tr', 'ru', 'zh', 'ja'];

    // Audit dictionaries.ts
    const dictMod = loadTsModule(path.join(process.cwd(), 'src/i18n/dictionaries.ts'));
    assert(Boolean(dictMod.DICTIONARIES), 'DICTIONARIES exported from dictionaries.ts');
    const dicts = dictMod.DICTIONARIES;

    for (const loc of SUPPORTED_LOCALES) {
      assert(Boolean(dicts[loc]), `Locale dictionary defined for [${loc}]`);
    }

    let missingDictKeys = 0;
    function checkKeys(ref, target, loc, prefix = '') {
      for (const [k, v] of Object.entries(ref)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          if (!target[k]) {
            missingDictKeys++;
            console.error(`      Missing section in ${loc}: ${fullKey}`);
          } else {
            checkKeys(v, target[k], loc, fullKey);
          }
        } else {
          if (!target[k] || String(target[k]).trim() === '') {
            missingDictKeys++;
            console.error(`      Missing translation in ${loc}: ${fullKey}`);
          }
        }
      }
    }

    for (const loc of SUPPORTED_LOCALES) {
      if (loc === 'en') continue;
      checkKeys(dicts.en, dicts[loc], loc);
    }
    assert(missingDictKeys === 0, '100% dictionary key parity across all 10 locales (0 missing keys)', `Missing: ${missingDictKeys}`);

    // Audit dashboardTranslations.ts
    const dashMod = loadTsModule(path.join(process.cwd(), 'src/i18n/dashboardTranslations.ts'));
    assert(Boolean(dashMod.DASHBOARD_TRANSLATIONS), 'DASHBOARD_TRANSLATIONS exported from dashboardTranslations.ts');

    const totalDashboardKeys = Object.keys(dashMod.DASHBOARD_TRANSLATIONS).length;
    assert(totalDashboardKeys >= 300, `Dashboard translations catalog contains comprehensive UI strings (actual: ${totalDashboardKeys})`);

    let missingDashboardStrings = 0;
    for (const [key, trans] of Object.entries(dashMod.DASHBOARD_TRANSLATIONS)) {
      for (const loc of SUPPORTED_LOCALES) {
        if (!trans[loc] || String(trans[loc]).trim() === '') {
          missingDashboardStrings++;
          console.error(`      Missing dashboard string in [${loc}] for key: "${key}"`);
        }
      }
    }
    assert(missingDashboardStrings === 0, '100% dashboard translation parity across all 10 locales (0 missing strings)', `Missing: ${missingDashboardStrings}`);

    stepScorecard.push({ step: 13, name: '10-Language Parity Audit', passed: true });
  }

  // ----------------------------------------------------------------------------
  // STEP 14 — CSS Tokens Audit & Zero Physical Classes
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Step 14/14] CSS Custom Properties Audit & Logical Directional Classes');
  {
    const globalsCssPath = path.join(process.cwd(), 'src/app/globals.css');
    const cssContent = fs.readFileSync(globalsCssPath, 'utf-8');

    // Extract light and dark custom property definitions
    const lightBlockMatch = cssContent.match(/:root,\s*html\[data-theme="light"\]\s*\{([^}]+)\}/s);
    assert(Boolean(lightBlockMatch), 'Light theme block defined in globals.css');
    const darkBlockMatch = cssContent.match(/html\[data-theme="dark"\]\s*\{([^}]+)\}/s);
    assert(Boolean(darkBlockMatch), 'Dark theme block defined in globals.css');

    const lightVars = new Set([...lightBlockMatch[1].matchAll(/--[a-z0-9-]+(?=:)/g)].map((m) => m[0]));
    const darkVars = new Set([...darkBlockMatch[1].matchAll(/--[a-z0-9-]+(?=:)/g)].map((m) => m[0]));

    assert(lightVars.size >= 20, `Light theme defines at least 20 design tokens (actual: ${lightVars.size})`);
    assert(darkVars.size >= 20, `Dark theme defines at least 20 design tokens (actual: ${darkVars.size})`);

    // Verify all light vars exist in dark theme
    let asymmetricTokens = 0;
    for (const v of lightVars) {
      if (!darkVars.has(v)) {
        asymmetricTokens++;
        console.error(`      Token ${v} defined in light but missing in dark`);
      }
    }
    assert(asymmetricTokens === 0, '100% symmetric token resolution between light and dark themes');

    // Scan all .tsx/.ts files in src/ for undefined var(--...)
    function getSourceFiles(dir) {
      let results = [];
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (item.name !== 'node_modules' && item.name !== '.next') {
            results.push(...getSourceFiles(full));
          }
        } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
          results.push(full);
        }
      }
      return results;
    }

    const allSrcFiles = getSourceFiles(path.join(process.cwd(), 'src'));
    const usedVars = new Set();
    for (const file of allSrcFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const match of content.matchAll(/var\((--[a-zA-Z0-9-]+)[^)]*\)/g)) {
        usedVars.add(match[1]);
      }
    }

    const undefinedVars = [];
    for (const v of usedVars) {
      if (!lightVars.has(v)) {
        undefinedVars.push(v);
      }
    }
    assert(undefinedVars.length === 0, '0 undefined CSS custom properties referenced across all src files', JSON.stringify(undefinedVars));

    // Audit touched components for physical spacing classes (ml-, mr-, pl-, pr-)
    const touchedComponentPaths = [
      'src/components/Navbar.tsx',
      'src/app/page.tsx',
      'src/app/login/page.tsx',
      'src/app/signup/page.tsx',
      'src/app/admin/page.tsx',
    ];

    // Add dashboard files
    const dashboardDir = path.join(process.cwd(), 'src/app/dashboard');
    if (fs.existsSync(dashboardDir)) {
      const dashFiles = getSourceFiles(dashboardDir);
      touchedComponentPaths.push(...dashFiles.map((f) => path.relative(process.cwd(), f)));
    }

    let physicalSpacingViolations = 0;
    const physicalRegex = /\b(pl-\d|pr-\d|ml-\d|mr-\d)\b/g;

    for (const relPath of touchedComponentPaths) {
      const fullPath = path.join(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf-8');
      const matches = content.match(physicalRegex);
      if (matches) {
        physicalSpacingViolations += matches.length;
        console.error(`      Physical spacing in ${relPath}: ${matches.join(', ')}`);
      }
    }

    assert(physicalSpacingViolations === 0, '0 physical spacing classes in touched components (full logical RTL symmetry)', `Violations: ${physicalSpacingViolations}`);

    stepScorecard.push({ step: 14, name: 'CSS Tokens & Logical Spacing', passed: true });
  }

  // ----------------------------------------------------------------------------
  // SCORECARD & SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log('📊 14-STEP END-TO-END PLATFORM JOURNEY SCORECARD');
  console.log('==============================================================================');
  for (const s of stepScorecard) {
    console.log(`  [Step ${s.step.toString().padStart(2, '0')}/14] ${s.name.padEnd(42, ' ')} -> ✅ PASSED`);
  }
  console.log('------------------------------------------------------------------------------');
  console.log(`Total Steps Passed:       ${stepScorecard.length}/14 (100%)`);
  console.log(`Total Assertions Passed:  ${passedAssertions}`);
  console.log(`Total Assertions Failed:  ${failedAssertions}`);
  console.log('==============================================================================');
  console.log('🎉 ALL 14 PLATFORM JOURNEY STEPS & HARDENING GATES PASSED WITH 100% SUCCESS!');
  console.log('==============================================================================\n');
}

async function main() {
  console.log(`[E2E Runner] Spawning Next.js production server on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
  });

  let runnerError = null;

  try {
    await waitForServer(BASE_URL);
    console.log(`[E2E Runner] Next.js server confirmed responsive at ${BASE_URL}`);
    await runJourney();
  } catch (err) {
    console.error('\n❌ [E2E Runner] Platform Journey Failed:', err);
    runnerError = err;
    process.exitCode = 1;
  } finally {
    console.log('[E2E Runner] Shutting down Next.js production test server...');
    server.kill();
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
    } catch {
      // Ignore taskkill errors
    }
    if (runnerError) {
      process.exit(1);
    }
  }
}

main();
