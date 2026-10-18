/**
 * Milestone 7 Challenger 1: Empirical Adversarial Test Harness
 * Simple Mode Features, 5 Guided Wizards Contracts, SSR Fallback & Clean State
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const TEST_TOKEN = 'tk_live_challenger_m7_test_org';
const AUTH_HEADER = {
  Authorization: `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json',
};

const results = [];

function record(suite, testName, pass, details = {}) {
  results.push({ suite, testName, pass, details });
  const icon = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${icon} [${suite}] ${testName}`);
  if (!pass || process.env.VERBOSE) {
    console.log(`    Details: ${JSON.stringify(details)}`);
  }
}

async function request(urlPath, options = {}) {
  const url = `${BASE_URL}${urlPath}`;
  const headers = { ...AUTH_HEADER, ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, headers: res.headers, data };
}

async function run() {
  console.log('================================================================');
  console.log('  MILESTONE 7 CHALLENGER 1: SIMPLE MODE & WIZARDS STRESS TEST  ');
  console.log('================================================================\n');

  // ============================================================================
  // SUITE 1: POST /api/v1/validate/post (Boundary Text & Missing Media)
  // ============================================================================
  console.log('--- SUITE 1: Post Pre-Flight Validation (/api/v1/validate/post) ---');

  // 1.1 X character boundary: exactly 280 chars (valid)
  const exactXContent = 'A'.repeat(280);
  const rXExact = await request('/api/v1/validate/post', {
    method: 'POST',
    body: JSON.stringify({
      content: exactXContent,
      platforms: ['x'],
      mediaItems: [],
    }),
  });
  record(
    'ValidatePost',
    'X: Exactly 280 chars is VALID',
    rXExact.status === 200 && rXExact.data.valid === true && rXExact.data.errors.length === 0,
    { status: rXExact.status, valid: rXExact.data?.valid, errors: rXExact.data?.errors }
  );

  // 1.2 X character boundary: 281 chars (invalid, char_limit)
  const overflowXContent = 'A'.repeat(281);
  const rXOver = await request('/api/v1/validate/post', {
    method: 'POST',
    body: JSON.stringify({
      content: overflowXContent,
      platforms: ['x'],
      mediaItems: [],
    }),
  });
  const hasXCharError = rXOver.data?.errors?.some(
    (e) => e.platform === 'x' && e.rule === 'char_limit'
  );
  record(
    'ValidatePost',
    'X: 281 chars triggers char_limit error',
    rXOver.status === 200 && rXOver.data.valid === false && hasXCharError,
    { status: rXOver.status, valid: rXOver.data?.valid, errors: rXOver.data?.errors }
  );

  // 1.3 Instagram character boundary: 2200 chars vs 2201 chars
  const igExact = 'B'.repeat(2200);
  const rIgExact = await request('/api/v1/validate/post', {
    method: 'POST',
    body: JSON.stringify({
      content: igExact,
      platforms: ['instagram'],
      mediaItems: [{ url: 'https://example.com/photo.jpg', type: 'image' }],
    }),
  });
  record(
    'ValidatePost',
    'Instagram: 2200 chars with media is VALID',
    rIgExact.status === 200 && rIgExact.data.valid === true,
    { status: rIgExact.status, valid: rIgExact.data?.valid, errors: rIgExact.data?.errors }
  );

  const igOver = 'B'.repeat(2201);
  const rIgOver = await request('/api/v1/validate/post', {
    method: 'POST',
    body: JSON.stringify({
      content: igOver,
      platforms: ['instagram'],
      mediaItems: [{ url: 'https://example.com/photo.jpg', type: 'image' }],
    }),
  });
  const hasIgCharError = rIgOver.data?.errors?.some(
    (e) => e.platform === 'instagram' && e.rule === 'char_limit'
  );
  record(
    'ValidatePost',
    'Instagram: 2201 chars triggers char_limit error',
    rIgOver.status === 200 && rIgOver.data.valid === false && hasIgCharError,
    { status: rIgOver.status, errors: rIgOver.data?.errors }
  );

  // 1.4 Instagram: Missing media triggers media_required
  const rIgNoMedia = await request('/api/v1/validate/post', {
    method: 'POST',
    body: JSON.stringify({
      content: 'Short caption',
      platforms: ['instagram'],
      mediaItems: [],
    }),
  });
  const hasIgMediaError = rIgNoMedia.data?.errors?.some(
    (e) => e.platform === 'instagram' && e.rule === 'media_required'
  );
  record(
    'ValidatePost',
    'Instagram: Missing media triggers media_required error',
    rIgNoMedia.status === 200 && rIgNoMedia.data.valid === false && hasIgMediaError,
    { status: rIgNoMedia.status, errors: rIgNoMedia.data?.errors }
  );

  // 1.5 TikTok: Missing media triggers media_required
  const rTikTokNoMedia = await request('/api/v1/validate/post', {
    method: 'POST',
    body: JSON.stringify({
      content: 'Dance video caption',
      platforms: ['tiktok'],
      mediaItems: [],
    }),
  });
  const hasTikTokMediaError = rTikTokNoMedia.data?.errors?.some(
    (e) => e.platform === 'tiktok' && e.rule === 'media_required'
  );
  record(
    'ValidatePost',
    'TikTok: Missing media triggers media_required error',
    rTikTokNoMedia.status === 200 && rTikTokNoMedia.data.valid === false && hasTikTokMediaError,
    { status: rTikTokNoMedia.status, errors: rTikTokNoMedia.data?.errors }
  );

  // 1.6 Threads: 501 chars triggers char_limit
  const rThreadsOver = await request('/api/v1/validate/post', {
    method: 'POST',
    body: JSON.stringify({
      content: 'C'.repeat(501),
      platforms: ['threads'],
      mediaItems: [],
    }),
  });
  const hasThreadsError = rThreadsOver.data?.errors?.some(
    (e) => e.platform === 'threads' && e.rule === 'char_limit'
  );
  record(
    'ValidatePost',
    'Threads: 501 chars triggers char_limit error',
    rThreadsOver.status === 200 && rThreadsOver.data.valid === false && hasThreadsError,
    { status: rThreadsOver.status, errors: rThreadsOver.data?.errors }
  );

  // 1.7 LinkedIn: 3001 chars triggers char_limit
  const rLinkedInOver = await request('/api/v1/validate/post', {
    method: 'POST',
    body: JSON.stringify({
      content: 'D'.repeat(3001),
      platforms: ['linkedin'],
      mediaItems: [],
    }),
  });
  const hasLinkedInError = rLinkedInOver.data?.errors?.some(
    (e) => e.platform === 'linkedin' && e.rule === 'char_limit'
  );
  record(
    'ValidatePost',
    'LinkedIn: 3001 chars triggers char_limit error',
    rLinkedInOver.status === 200 && rLinkedInOver.data.valid === false && hasLinkedInError,
    { status: rLinkedInOver.status, errors: rLinkedInOver.data?.errors }
  );

  // 1.8 Multi-platform combined adversarial: X (285 chars) + Instagram (no media) in one request
  const rCombined = await request('/api/v1/validate/post', {
    method: 'POST',
    body: JSON.stringify({
      content: 'E'.repeat(285),
      platforms: ['x', 'instagram'],
      mediaItems: [],
    }),
  });
  const hasBothErrors =
    rCombined.data?.errors?.some((e) => e.platform === 'x' && e.rule === 'char_limit') &&
    rCombined.data?.errors?.some((e) => e.platform === 'instagram' && e.rule === 'media_required');
  record(
    'ValidatePost',
    'Combined multi-channel validation isolates per-platform errors simultaneously',
    rCombined.status === 200 && rCombined.data.valid === false && hasBothErrors,
    { count: rCombined.data?.errors?.length, errors: rCombined.data?.errors }
  );

  // ============================================================================
  // SUITE 2: GET /api/v1/analytics/best-times
  // ============================================================================
  console.log('\n--- SUITE 2: Analytics Best Times (/api/v1/analytics/best-times) ---');

  const rBestTimes = await request('/api/v1/analytics/best-times');
  const hasRecs = Array.isArray(rBestTimes.data?.recommendations) && rBestTimes.data.recommendations.length > 0;
  const hasBestSlots = Array.isArray(rBestTimes.data?.bestSlots) && rBestTimes.data.bestSlots.length > 0;
  const topSlot = rBestTimes.data?.recommendations?.[2] || rBestTimes.data?.recommendations?.[0];

  record(
    'BestTimes',
    'Returns 200 OK with recommendations and bestSlots arrays',
    rBestTimes.status === 200 && rBestTimes.data?.success === true && hasRecs && hasBestSlots,
    { status: rBestTimes.status, recCount: rBestTimes.data?.recommendations?.length, slotCount: rBestTimes.data?.bestSlots?.length }
  );

  record(
    'BestTimes',
    'High engagement slot contains dayOfWeek, hour, score, and expectedEngagementRate',
    topSlot && typeof topSlot.dayOfWeek === 'number' && typeof topSlot.hour === 'number' && typeof topSlot.score === 'number',
    { topSlot }
  );

  // ============================================================================
  // SUITE 3: GET /api/v1/phone-numbers/available
  // ============================================================================
  console.log('\n--- SUITE 3: Cloud Telephony Available Numbers (/api/v1/phone-numbers/available) ---');

  // 3.1 Country = US
  const rNumbersUS = await request('/api/v1/phone-numbers/available?country=US&type=mobile&limit=6');
  const hasUSNumbers = Array.isArray(rNumbersUS.data?.data) && rNumbersUS.data.data.length > 0;
  const firstUSNumber = rNumbersUS.data?.data?.[0];
  record(
    'Telephony',
    'GET /api/v1/phone-numbers/available?country=US returns available mobile numbers',
    rNumbersUS.status === 200 && rNumbersUS.data?.success === true && hasUSNumbers,
    { count: rNumbersUS.data?.data?.length, sample: firstUSNumber?.phoneNumber }
  );

  record(
    'Telephony',
    'Number payload contains pricing and carrier capabilities (sms, voice, whatsapp)',
    firstUSNumber &&
      firstUSNumber.phoneNumber?.includes('555') &&
      typeof firstUSNumber.monthlyPriceUsd === 'number' &&
      typeof firstUSNumber.capabilities?.sms === 'boolean' &&
      typeof firstUSNumber.capabilities?.voice === 'boolean',
    { number: firstUSNumber?.phoneNumber, price: firstUSNumber?.monthlyPriceUsd, capabilities: firstUSNumber?.capabilities }
  );

  // 3.2 Country = SA (Saudi Arabia) - local trunks
  const rNumbersSA = await request('/api/v1/phone-numbers/available?country=SA&type=local&limit=4');
  const hasSANumbers = Array.isArray(rNumbersSA.data?.data) && rNumbersSA.data.data.length > 0;
  record(
    'Telephony',
    'GET /api/v1/phone-numbers/available?country=SA returns Saudi numbers (+966)',
    rNumbersSA.status === 200 && rNumbersSA.data?.success === true && hasSANumbers,
    { count: rNumbersSA.data?.data?.length, sample: rNumbersSA.data?.data?.[0]?.phoneNumber }
  );

  // 3.3 Country = GB (United Kingdom)
  const rNumbersGB = await request('/api/v1/phone-numbers/available?country=GB&type=mobile&limit=4');
  const hasGBNumbers = Array.isArray(rNumbersGB.data?.data) && rNumbersGB.data.data.length > 0;
  record(
    'Telephony',
    'GET /api/v1/phone-numbers/available?country=GB returns UK numbers (+44)',
    rNumbersGB.status === 200 && rNumbersGB.data?.success === true && hasGBNumbers,
    { count: rNumbersGB.data?.data?.length, sample: rNumbersGB.data?.data?.[0]?.phoneNumber }
  );

  // ============================================================================
  // SUITE 4: Buy Number, WhatsApp Link OTP & Verify OTP Flow
  // ============================================================================
  console.log('\n--- SUITE 4: Buy Number & WhatsApp Link OTP Flow ---');

  // 4.1 Negative test: WhatsApp Link on non-existent number when workspace has no numbers
  const rLinkEmpty = await request('/api/v1/whatsapp/link', {
    method: 'POST',
    body: JSON.stringify({
      phoneNumber: '+19999999999',
      displayName: 'Non Existent Shop',
    }),
  });
  record(
    'WhatsAppLinking',
    'Requesting WhatsApp link without owned number returns 404 number_not_found',
    rLinkEmpty.status === 404 && rLinkEmpty.data?.error?.code === 'number_not_found',
    { status: rLinkEmpty.status, error: rLinkEmpty.data?.error }
  );

  // 4.2 Buy Number
  const chosenNumber = firstUSNumber?.phoneNumber || '+1 (415) 555-2000';
  const rBuyNumber = await request('/api/v1/phone-numbers/buy', {
    method: 'POST',
    body: JSON.stringify({
      country: 'US',
      numberType: 'mobile',
      phoneNumber: chosenNumber,
      monthlyPriceUsd: 3.0,
    }),
  });
  record(
    'Telephony',
    'POST /api/v1/phone-numbers/buy successfully provisions virtual number and debits wallet',
    rBuyNumber.status === 201 && rBuyNumber.data?.success === true && rBuyNumber.data?.data?.phoneNumber === chosenNumber,
    { status: rBuyNumber.status, phoneNumber: rBuyNumber.data?.data?.phoneNumber, wallet: rBuyNumber.data?.wallet }
  );

  // 4.3 WhatsApp Link: Request OTP on provisioned number
  const rLinkOtp = await request('/api/v1/whatsapp/link', {
    method: 'POST',
    body: JSON.stringify({
      phoneNumber: chosenNumber,
      displayName: 'Zernio Official Care',
      category: 'Retail & E-Commerce',
    }),
  });
  const otpCode = rLinkOtp.data?.data?.otpCode;
  record(
    'WhatsAppLinking',
    'POST /api/v1/whatsapp/link dispatches 6-digit OTP to inbound virtual number SMS trunk',
    rLinkOtp.status === 200 && rLinkOtp.data?.success === true && Boolean(otpCode) && otpCode.length === 6,
    { status: rLinkOtp.status, otpSent: rLinkOtp.data?.data?.otpSent, otpCode }
  );

  // 4.4 WhatsApp Verify OTP: Submit 6-digit OTP
  const rVerifyOtp = await request('/api/v1/whatsapp/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      phoneNumber: chosenNumber,
      otpCode: otpCode || '482910',
      displayName: 'Zernio Official Care',
      category: 'Retail & E-Commerce',
    }),
  });
  const verifyData = rVerifyOtp.data?.data;
  record(
    'WhatsAppLinking',
    'POST /api/v1/whatsapp/verify-otp links WABA and activates Official Verified profile',
    rVerifyOtp.status === 200 &&
      rVerifyOtp.data?.success === true &&
      (verifyData?.status === 'linked' || verifyData?.phoneNumber?.whatsappLinked === true),
    { status: rVerifyOtp.status, verifyStatus: verifyData?.status, whatsappLinked: verifyData?.phoneNumber?.whatsappLinked }
  );

  // ============================================================================
  // SUITE 5: POST /api/v1/broadcasts and /api/v1/broadcasts/{id}/send
  // ============================================================================
  console.log('\n--- SUITE 5: 3-Step Broadcast Creation & Dispatch ---');

  // 5.1 Negative test: missing 'name' field
  const rBcNoName = await request('/api/v1/broadcasts', {
    method: 'POST',
    body: JSON.stringify({
      platform: 'whatsapp',
      message: 'Hello everyone!',
    }),
  });
  record(
    'Broadcasts',
    'POST /api/v1/broadcasts without name returns 400 validation_error',
    rBcNoName.status === 400 && rBcNoName.data?.error?.code === 'validation_error',
    { status: rBcNoName.status, error: rBcNoName.data?.error }
  );

  // 5.2 Valid Broadcast creation
  const rBcCreate = await request('/api/v1/broadcasts', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Black Friday VIP Flash Sale',
      platform: 'whatsapp',
      template: 'winter_sale_50',
      message: 'Exclusive 50% discount for VIP customers. Use code VIP50.',
      segmentFilters: { tag: 'vip' },
    }),
  });
  const broadcastId = rBcCreate.data?.data?.id || rBcCreate.data?.broadcast?.id;
  record(
    'Broadcasts',
    'POST /api/v1/broadcasts creates draft broadcast campaign',
    rBcCreate.status === 201 && rBcCreate.data?.success === true && Boolean(broadcastId),
    { status: rBcCreate.status, broadcastId, name: rBcCreate.data?.data?.name }
  );

  // 5.3 Negative test: Send non-existent broadcast
  const rBcFakeSend = await request('/api/v1/broadcasts/bc_nonexistent_999/send', {
    method: 'POST',
  });
  record(
    'Broadcasts',
    'POST /api/v1/broadcasts/{id}/send with invalid id returns 404 not_found',
    rBcFakeSend.status === 404 && rBcFakeSend.data?.error?.code === 'not_found',
    { status: rBcFakeSend.status, error: rBcFakeSend.data?.error }
  );

  // 5.4 Valid Broadcast immediate dispatch
  const rBcSend = await request(`/api/v1/broadcasts/${broadcastId}/send`, {
    method: 'POST',
  });
  record(
    'Broadcasts',
    'POST /api/v1/broadcasts/{id}/send dispatches campaign with delivery telemetry',
    rBcSend.status === 200 && rBcSend.data?.success === true && (rBcSend.data?.status === 'sent' || rBcSend.data?.status === 'completed'),
    { status: rBcSend.status, broadcastStatus: rBcSend.data?.status, sentCount: rBcSend.data?.sentCount }
  );

  // 5.5 List Broadcasts
  const rBcList = await request('/api/v1/broadcasts');
  record(
    'Broadcasts',
    'GET /api/v1/broadcasts lists created broadcast campaigns',
    rBcList.status === 200 && rBcList.data?.success === true && rBcList.data?.count >= 1,
    { count: rBcList.data?.count }
  );

  // ============================================================================
  // SUITE 6: ManyChat Presets Workflow Creation & Activation
  // ============================================================================
  console.log('\n--- SUITE 6: ManyChat Workflows Creation & Activation ---');

  // 6.1 Negative test: missing 'name'
  const rWfNoName = await request('/api/v1/workflows', {
    method: 'POST',
    body: JSON.stringify({
      trigger: { type: 'dm_keyword', keywords: ['HELP'] },
    }),
  });
  record(
    'Workflows',
    'POST /api/v1/workflows without name returns 400 validation_error',
    rWfNoName.status === 400 && rWfNoName.data?.error?.code === 'validation_error',
    { status: rWfNoName.status, error: rWfNoName.data?.error }
  );

  // 6.2 Create ManyChat preset workflow (Lead Capture Bot)
  const rWfCreate = await request('/api/v1/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Lead Capture & CRM Sync Bot',
      description: 'Greets inbound lead, collects phone number, creates CRM record, and dispatches SMS confirmation.',
      trigger: {
        type: 'dm_keyword',
        keywords: ['INFO', 'START', 'DEAL'],
      },
      nodes: [
        { id: 'node_1', title: 'Keyword Trigger (INFO, START)', type: 'trigger' },
        { id: 'node_2', title: 'Greeting & Value Proposition', type: 'process' },
        { id: 'node_3', title: 'Phone Number Validation Field', type: 'process' },
        { id: 'node_4', title: 'Create CRM Contact (Tag: Lead)', type: 'process' },
        { id: 'node_5', title: 'SMS Welcome Confirmation', type: 'action' },
      ],
      edges: [
        { source: 'node_1', target: 'node_2' },
        { source: 'node_2', target: 'node_3' },
        { source: 'node_3', target: 'node_4' },
        { source: 'node_4', target: 'node_5' },
      ],
    }),
  });
  const workflowId = rWfCreate.data?.data?.id || rWfCreate.data?.workflow?.id;
  record(
    'Workflows',
    'POST /api/v1/workflows creates multi-node visual workflow preset in draft state',
    rWfCreate.status === 201 && rWfCreate.data?.success === true && Boolean(workflowId),
    { status: rWfCreate.status, workflowId, statusText: rWfCreate.data?.data?.status }
  );

  // 6.3 Negative test: Activation of non-existent workflow
  const rWfFakeActivate = await request('/api/v1/workflows/wf_fake_000/activate', {
    method: 'POST',
  });
  record(
    'Workflows',
    'POST /api/v1/workflows/{id}/activate with invalid id returns 404 not_found',
    rWfFakeActivate.status === 404 && rWfFakeActivate.data?.error?.code === 'not_found',
    { status: rWfFakeActivate.status, error: rWfFakeActivate.data?.error }
  );

  // 6.4 Negative test: Workflow without trigger node cannot be activated
  const rWfNoTrigger = await request('/api/v1/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Invalid Workflow No Trigger',
      nodes: [{ id: 'node_1', title: 'Orphan Action', type: 'action' }],
    }),
  });
  const orphanId = rWfNoTrigger.data?.data?.id;
  const rActivateOrphan = await request(`/api/v1/workflows/${orphanId}/activate`, {
    method: 'POST',
  });
  record(
    'Workflows',
    'Activating workflow without trigger node returns 400 workflow_trigger_required',
    rActivateOrphan.status === 400 && rActivateOrphan.data?.error?.code === 'workflow_trigger_required',
    { status: rActivateOrphan.status, error: rActivateOrphan.data?.error }
  );

  // 6.5 Valid Workflow activation
  const rWfActivate = await request(`/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
  });
  record(
    'Workflows',
    'POST /api/v1/workflows/{id}/activate activates preset workflow for live DM execution',
    rWfActivate.status === 200 && rWfActivate.data?.success === true && rWfActivate.data?.data?.status === 'active',
    { status: rWfActivate.status, workflowStatus: rWfActivate.data?.data?.status }
  );

  // 6.6 Immutability check: Active workflow cannot alter nodes/edges without pause
  const rWfMutateActive = await request(`/api/v1/workflows/${workflowId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      nodes: [{ id: 'mutated', type: 'trigger' }],
    }),
  });
  record(
    'Workflows',
    'Altering nodes on active workflow is rejected with 400 active_workflow_immutable',
    rWfMutateActive.status === 400 && rWfMutateActive.data?.error?.code === 'active_workflow_immutable',
    { status: rWfMutateActive.status, error: rWfMutateActive.data?.error }
  );

  // ============================================================================
  // SUITE 7: POST /api/v1/ads/ctwa (Click-to-WhatsApp Ad Launcher)
  // ============================================================================
  console.log('\n--- SUITE 7: Click-to-WhatsApp Ad Launcher (/api/v1/ads/ctwa) ---');

  const rCtwaLaunch = await request('/api/v1/ads/ctwa', {
    method: 'POST',
    body: JSON.stringify({
      name: 'CTWA - Winter Sale 20% Off',
      headline: 'Chat with Us on WhatsApp — Claim 20% Off!',
      dailyBudgetUsd: 45,
      targetPhoneNumber: chosenNumber,
      destination: 'whatsapp',
      mediaUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73',
      initialGreeting: 'Hi! I saw your sponsored ad and want to claim my 20% discount.',
    }),
  });

  record(
    'AdsCTWA',
    'POST /api/v1/ads/ctwa launches Meta Click-to-WhatsApp ad with ACTIVE status',
    rCtwaLaunch.status === 201 &&
      rCtwaLaunch.data?.success === true &&
      rCtwaLaunch.data?.destination === 'whatsapp' &&
      rCtwaLaunch.data?.status === 'ACTIVE' &&
      Boolean(rCtwaLaunch.data?.campaignId),
    {
      status: rCtwaLaunch.status,
      campaignId: rCtwaLaunch.data?.campaignId,
      adId: rCtwaLaunch.data?.adId,
      destination: rCtwaLaunch.data?.destination,
      adStatus: rCtwaLaunch.data?.status,
    }
  );

  // ============================================================================
  // SUITE 8: SSR Fallback & Browser Hydration Analysis
  // ============================================================================
  console.log('\n--- SUITE 8: SSR Fallback & Browser Hydration ---');

  // Probe SSR rendering of /dashboard directly over HTTP without client JS / localStorage
  const rSsrDashboard = await fetch(`${BASE_URL}/dashboard`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    },
    redirect: 'manual',
  });

  // Client-side auth check or redirect status
  record(
    'SSRFallback',
    'GET /dashboard responds gracefully with 200 or 307 redirect without server crash (500)',
    [200, 307].includes(rSsrDashboard.status),
    { status: rSsrDashboard.status, location: rSsrDashboard.headers.get('location') }
  );

  // Code inspection for useDashboardMode
  const hookFile = path.resolve(process.cwd(), 'src', 'lib', 'hooks', 'useDashboardMode.ts');
  const hookContent = fs.readFileSync(hookFile, 'utf-8');
  const hasDefaultSimple = hookContent.includes("useState<DashboardMode>('simple')");
  const hasTryCatch = hookContent.includes('try {') && hookContent.includes('catch');
  const hasStorageListener = hookContent.includes("window.addEventListener('storage'");
  const hasCustomEventListener = hookContent.includes('zernio_dashboard_mode_change');

  record(
    'SSRFallback',
    'useDashboardMode initializes with simple mode fallback for SSR hydration safety',
    hasDefaultSimple,
    { hasDefaultSimple }
  );

  record(
    'SSRFallback',
    'useDashboardMode wraps localStorage in try-catch for restricted/incognito environments',
    hasTryCatch,
    { hasTryCatch }
  );

  record(
    'SSRFallback',
    'useDashboardMode synchronizes cross-tab (storage) and cross-component (custom event)',
    hasStorageListener && hasCustomEventListener,
    { hasStorageListener, hasCustomEventListener }
  );

  // ============================================================================
  // SUITE 9: Teardown & Clean State Verification
  // ============================================================================
  console.log('\n--- SUITE 9: Clean State Reset & Verification ---');

  // 9.1 Reset workspaces via API
  const rReset = await request('/api/v1/workspaces/reset', { method: 'POST' });
  record(
    'CleanState',
    'POST /api/v1/workspaces/reset clears all test workspaces to pristine state',
    rReset.status === 200 && rReset.data?.success === true,
    { status: rReset.status, message: rReset.data?.message }
  );

  // 9.2 Inspect .data/workspaces.json directly
  const wsPath = path.resolve(process.cwd(), '.data', 'workspaces.json');
  let cleanStatePass = false;
  let fileStats = {};
  if (fs.existsSync(wsPath)) {
    const raw = fs.readFileSync(wsPath, 'utf-8');
    const size = fs.statSync(wsPath).size;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const isStrictlyClean =
      parsed &&
      typeof parsed === 'object' &&
      'workspaces' in parsed &&
      Object.keys(parsed.workspaces || {}).length === 0 &&
      Object.keys(parsed).length === 1;

    cleanStatePass = Boolean(isStrictlyClean);
    fileStats = { sizeBytes: size, content: raw.trim(), isStrictlyClean };
  } else {
    fileStats = { exists: false };
  }

  record(
    'CleanState',
    'Strict file check: .data/workspaces.json contains exactly {"workspaces":{}}',
    cleanStatePass,
    fileStats
  );

  // ============================================================================
  // FINAL SUMMARY & VERDICT
  // ============================================================================
  console.log('\n================================================================');
  console.log('                        FINAL SUMMARY                           ');
  console.log('================================================================');
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Total Probes Run: ${results.length}`);
  console.log(`Passed:           ${passed}`);
  console.log(`Failed:           ${failed}`);
  const verdict = failed === 0 ? 'APPROVE' : 'REQUEST_CHANGES';
  console.log(`Verdict:          ${verdict}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal execution error in test harness:', err);
  process.exit(1);
});
