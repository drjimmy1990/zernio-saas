// scripts/test-telephony-adversarial.mjs
// Adversarial Stress Harness for Milestone 3 Backend Telephony & Messaging Pipeline
// Tests all 11 API actions + boundary conditions, edge cases, concurrent requests, and JSON/status integrity.

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const DEFAULT_ORG = 'org_demo_acme';

let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    failedTests++;
    failures.push(message);
    console.error(`  ❌ FAILED: ${message}`);
  } else {
    passedTests++;
    console.log(`  ✓ PASSED: ${message}`);
  }
}

async function postServices(payload, customUrl = `${BASE_URL}/api/services`) {
  const res = await fetch(customUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
  let data = null;
  const rawText = await res.text();
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    // Malformed JSON returned
    return { ok: res.ok, status: res.status, rawText, jsonError: err.message, data: null };
  }
  return { ok: res.ok, status: res.status, rawText, data, jsonError: null };
}

async function getServices(orgId = DEFAULT_ORG) {
  const res = await fetch(`${BASE_URL}/api/services?organizationId=${encodeURIComponent(orgId)}`);
  let data = null;
  const rawText = await res.text();
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    return { ok: res.ok, status: res.status, rawText, jsonError: err.message, data: null };
  }
  return { ok: res.ok, status: res.status, rawText, data, jsonError: null };
}

async function runAdversarialSuite() {
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS HARNESS: TELEPHONY & MESSAGING PIPELINE (M3)');
  console.log(`Target: ${BASE_URL}/api/services`);
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Baseline Verification of All 11 Actions
  // -------------------------------------------------------------
  console.log('>>> [SUITE 1] Baseline Verification of All 11 Telephony Actions');

  // 1. search_numbers
  const s1 = await postServices({
    subService: 'telephony',
    action: 'search_numbers',
    organizationId: DEFAULT_ORG,
    country: 'US',
    numberType: 'local',
    limit: 5,
  });
  assert(s1.status === 200 && !s1.jsonError, 'Action 1: search_numbers returns 200 with valid JSON');
  assert(Array.isArray(s1.data?.results) && s1.data.results.length > 0, 'Action 1: search_numbers returns array of numbers');
  assert(s1.data?.totalCountries >= 55, `Action 1: totalCountries is 55+ (got ${s1.data?.totalCountries})`);

  // 2. buy_number (Use a distinct test tenant so we have clean quota)
  const testOrg = `org_stress_${Date.now()}`;
  const s2 = await postServices({
    subService: 'telephony',
    action: 'buy_number',
    organizationId: testOrg,
    country: 'US',
    numberType: 'local',
  });
  assert(s2.status === 200 && !s2.jsonError, 'Action 2: buy_number returns 200 with valid JSON');
  assert(s2.data?.success === true && s2.data?.phoneNumber?.id, 'Action 2: buy_number provisions number with ID');
  const provisionedId = s2.data?.phoneNumber?.id;
  const provisionedNumber = s2.data?.phoneNumber?.phoneNumber;

  // 3. link_whatsapp
  const s3 = await postServices({
    subService: 'telephony',
    action: 'link_whatsapp',
    organizationId: testOrg,
    phoneNumberId: provisionedId,
    displayName: 'Test Enterprise',
    category: 'CUSTOMER_SERVICE',
    verificationMethod: 'sms_otp',
  });
  assert(s3.status === 200 && !s3.jsonError, 'Action 3: link_whatsapp returns 200 with valid JSON');
  assert(s3.data?.status === 'linked' && s3.data?.verificationOtp === '481-923', 'Action 3: link_whatsapp generates OTP and links');

  // 4. send_test_whatsapp
  const s4 = await postServices({
    subService: 'telephony',
    action: 'send_test_whatsapp',
    organizationId: testOrg,
    phoneNumberId: provisionedId,
    recipientPhone: '+1 (415) 890-4412',
    templateName: 'order_update',
    parameters: ['John Doe', '99100'],
  });
  assert(s4.status === 200 && !s4.jsonError, 'Action 4: send_test_whatsapp returns 200 with valid JSON');
  assert(s4.data?.status === 'delivered' && s4.data?.readReceipt === true, 'Action 4: send_test_whatsapp status is delivered with read receipt');

  // 5. configure_ai_voice
  const s5 = await postServices({
    subService: 'telephony',
    action: 'configure_ai_voice',
    organizationId: testOrg,
    phoneNumberId: provisionedId,
    agentName: 'Lina AI',
    language: 'ar-SA',
    voicePersona: 'Lina (Warm)',
  });
  assert(s5.status === 200 && !s5.jsonError, 'Action 5: configure_ai_voice returns 200 with valid JSON');
  assert(s5.data?.voiceAgent?.agentName === 'Lina AI', 'Action 5: configure_ai_voice configures agent name');

  // 6. initiate_call
  const s6 = await postServices({
    subService: 'telephony',
    action: 'initiate_call',
    organizationId: testOrg,
    fromNumber: provisionedNumber,
    toNumber: '+1 (415) 890-4412',
    mode: 'ai_voice_agent',
    language: 'ar-SA',
  });
  assert(s6.status === 200 && !s6.jsonError, 'Action 6: initiate_call returns 200 with valid JSON');
  assert(s6.data?.callSession?.callId && Array.isArray(s6.data?.callSession?.transcripts), 'Action 6: initiate_call returns session with transcripts');

  // 7. list_call_history
  const s7 = await postServices({
    subService: 'telephony',
    action: 'list_call_history',
    organizationId: testOrg,
  });
  assert(s7.status === 200 && !s7.jsonError, 'Action 7: list_call_history returns 200 with valid JSON');
  assert(Array.isArray(s7.data?.calls) && s7.data.calls.length >= 1, 'Action 7: list_call_history returns calls array');

  // 8. send_sms
  const s8 = await postServices({
    subService: 'telephony',
    action: 'send_sms',
    organizationId: testOrg,
    fromNumber: provisionedNumber,
    toNumber: '+1 (415) 890-4412',
    text: 'Baseline test SMS',
  });
  assert(s8.status === 200 && !s8.jsonError, 'Action 8: send_sms returns 200 with valid JSON');
  assert(s8.data?.deliveryStatus === 'delivered', 'Action 8: send_sms status is delivered');

  // 9. simulate_incoming_sms
  const s9 = await postServices({
    subService: 'telephony',
    action: 'simulate_incoming_sms',
    organizationId: testOrg,
    fromNumber: '+1 (415) 890-4412',
    toNumber: provisionedNumber,
    type: 'otp',
  });
  assert(s9.status === 200 && !s9.jsonError, 'Action 9: simulate_incoming_sms returns 200 with valid JSON');
  assert(s9.data?.message?.direction === 'inbound', 'Action 9: simulate_incoming_sms generates inbound message');

  // 10. list_messages
  const s10 = await postServices({
    subService: 'telephony',
    action: 'list_messages',
    organizationId: testOrg,
    channel: 'all',
  });
  assert(s10.status === 200 && !s10.jsonError, 'Action 10: list_messages returns 200 with valid JSON');
  assert(Array.isArray(s10.data?.threads) && s10.data.threads.length >= 1, 'Action 10: list_messages returns threads');

  // 11. list_numbers
  const s11 = await postServices({
    subService: 'telephony',
    action: 'list_numbers',
    organizationId: testOrg,
  });
  assert(s11.status === 200 && !s11.jsonError, 'Action 11: list_numbers returns 200 with valid JSON');
  assert(Array.isArray(s11.data?.numbers) && s11.data.quota, 'Action 11: list_numbers returns owned numbers and quota');

  // -------------------------------------------------------------
  // SUITE 2: Boundary Conditions — search_numbers
  // -------------------------------------------------------------
  console.log('\n>>> [SUITE 2] Stress Testing: search_numbers Boundary Conditions');

  // 2.1 Unknown country code 'XX'
  const b1 = await postServices({
    subService: 'telephony',
    action: 'search_numbers',
    organizationId: DEFAULT_ORG,
    country: 'XX',
  });
  assert(b1.status === 200 && !b1.jsonError, 'search_numbers with country="XX" returns 200 JSON');
  assert(b1.data?.results?.length === 0, 'search_numbers with country="XX" returns empty results without crashing');

  // 2.2 Empty country code ''
  const b2 = await postServices({
    subService: 'telephony',
    action: 'search_numbers',
    organizationId: DEFAULT_ORG,
    country: '',
  });
  assert(b2.status === 200 && !b2.jsonError, 'search_numbers with country="" returns 200 JSON');
  assert(b2.data?.results?.length > 0, 'search_numbers with country="" defaults gracefully to available catalog');

  // 2.3 Lowercase country code 'gb'
  const b3 = await postServices({
    subService: 'telephony',
    action: 'search_numbers',
    organizationId: DEFAULT_ORG,
    country: 'gb',
  });
  assert(b3.status === 200 && !b3.jsonError, 'search_numbers with lowercase country="gb" returns 200 JSON');
  assert(b3.data?.results?.every(r => r.country === 'GB'), 'search_numbers handles lowercase country correctly');

  // 2.4 Negative limit (-10)
  const b4 = await postServices({
    subService: 'telephony',
    action: 'search_numbers',
    organizationId: DEFAULT_ORG,
    country: 'US',
    limit: -10,
  });
  assert(b4.status === 200 && !b4.jsonError, 'search_numbers with negative limit (-10) returns 200 JSON without crash');
  assert(Array.isArray(b4.data?.results), 'search_numbers with negative limit returns valid array');

  // 2.5 Zero limit (0)
  const b5 = await postServices({
    subService: 'telephony',
    action: 'search_numbers',
    organizationId: DEFAULT_ORG,
    country: 'US',
    limit: 0,
  });
  assert(b5.status === 200 && !b5.jsonError, 'search_numbers with limit=0 returns 200 JSON');

  // 2.6 Enormous limit (100000)
  const b6 = await postServices({
    subService: 'telephony',
    action: 'search_numbers',
    organizationId: DEFAULT_ORG,
    country: 'all',
    limit: 100000,
  });
  assert(b6.status === 200 && !b6.jsonError, 'search_numbers with enormous limit returns 200 JSON without OOM');
  assert(b6.data?.results?.length > 50, 'search_numbers with enormous limit returns all available numbers');

  // 2.7 Search with hostile query characters
  const b7 = await postServices({
    subService: 'telephony',
    action: 'search_numbers',
    organizationId: DEFAULT_ORG,
    search: "'; DROP TABLE phone_numbers; <script>alert(1)</script>",
  });
  assert(b7.status === 200 && !b7.jsonError, 'search_numbers with SQLi/XSS input string returns 200 JSON without throwing');
  assert(b7.data?.results?.length === 0, 'search_numbers with hostile query safely returns 0 matches');

  // -------------------------------------------------------------
  // SUITE 3: Boundary Conditions — buy_number
  // -------------------------------------------------------------
  console.log('\n>>> [SUITE 3] Stress Testing: buy_number Boundary Conditions');

  // 3.1 Empty buy payload (no country)
  const b8 = await postServices({
    subService: 'telephony',
    action: 'buy_number',
    organizationId: DEFAULT_ORG,
  });
  assert(b8.status === 400 && !b8.jsonError, 'buy_number with empty payload (no country) returns status 400 with valid JSON error');
  assert(typeof b8.data?.error === 'string', `buy_number returned error message: "${b8.data?.error}"`);

  // 3.2 Unknown country code 'ZZ' (Strictly rejected with 400)
  const b9 = await postServices({
    subService: 'telephony',
    action: 'buy_number',
    organizationId: `org_temp_${Date.now()}`,
    country: 'ZZ',
  });
  assert(b9.status === 400 && !b9.jsonError, 'buy_number with unknown country="ZZ" returns 400 JSON error');
  assert(b9.data?.error?.includes('Unsupported or unknown country code'), `buy_number rejected with error: "${b9.data?.error}"`);

  // 3.3 Empty string country '' (Strictly rejected with 400)
  const b10 = await postServices({
    subService: 'telephony',
    action: 'buy_number',
    organizationId: `org_temp2_${Date.now()}`,
    country: '',
  });
  assert(b10.status === 400 && !b10.jsonError, 'buy_number with country="" returns 400 JSON error');
  assert(b10.data?.error?.includes('Unsupported or unknown country code'), `buy_number rejected with error: "${b10.data?.error}"`);

  // -------------------------------------------------------------
  // SUITE 4: Boundary Conditions — initiate_call
  // -------------------------------------------------------------
  console.log('\n>>> [SUITE 4] Stress Testing: initiate_call Boundary Conditions');

  // 4.1 Empty / invalid phone numbers
  const b11 = await postServices({
    subService: 'telephony',
    action: 'initiate_call',
    organizationId: DEFAULT_ORG,
    fromNumber: '',
    toNumber: 'INVALID_NUMBER_XYZ!@#',
    mode: 'direct_voice',
  });
  assert(b11.status === 200 && !b11.jsonError, 'initiate_call with invalid/empty phone numbers returns 200 with valid JSON');
  assert(b11.data?.callSession?.status === 'connected', 'initiate_call establishes mock session without crashing');

  // 4.2 Empty payload (missing all fields, strictly rejected with 400)
  const b12 = await postServices({
    subService: 'telephony',
    action: 'initiate_call',
    organizationId: DEFAULT_ORG,
  });
  assert(b12.status === 400 && !b12.jsonError, 'initiate_call with empty body (missing toNumber) returns 400 with valid JSON error');
  assert(b12.data?.error?.includes('Destination phone number (toNumber) is required'), `initiate_call rejected with error: "${b12.data?.error}"`);

  // 4.2b Empty toNumber string (Strictly rejected with 400)
  const b12b = await postServices({
    subService: 'telephony',
    action: 'initiate_call',
    organizationId: DEFAULT_ORG,
    fromNumber: '+14155550100',
    toNumber: '   ',
    mode: 'direct_voice',
  });
  assert(b12b.status === 400 && !b12b.jsonError, 'initiate_call with whitespace toNumber returns 400 with valid JSON error');
  assert(b12b.data?.error?.includes('Destination phone number (toNumber) is required'), `initiate_call rejected with error: "${b12b.data?.error}"`);

  // 4.3 Unsupported call mode
  const b13 = await postServices({
    subService: 'telephony',
    action: 'initiate_call',
    organizationId: DEFAULT_ORG,
    fromNumber: '+14155550100',
    toNumber: '+14158904412',
    mode: 'telepathic_hologram_v2',
  });
  assert(b13.status === 200 && !b13.jsonError, 'initiate_call with unknown mode returns 200 with valid JSON');

  // -------------------------------------------------------------
  // SUITE 5: Boundary Conditions — send_sms & simulate_incoming_sms
  // -------------------------------------------------------------
  console.log('\n>>> [SUITE 5] Stress Testing: send_sms & simulate_incoming_sms');

  // 5.1 Empty SMS text (Strictly rejected with 400)
  const b14 = await postServices({
    subService: 'telephony',
    action: 'send_sms',
    organizationId: DEFAULT_ORG,
    fromNumber: '+14155550100',
    toNumber: '+14158904412',
    text: '',
  });
  assert(b14.status === 400 && !b14.jsonError, 'send_sms with empty text returns 400 with valid JSON error');
  assert(b14.data?.error?.includes('Message text or mediaUrls is required'), `send_sms rejected with error: "${b14.data?.error}"`);

  // 5.1b Empty toNumber (Strictly rejected with 400)
  const b14b = await postServices({
    subService: 'telephony',
    action: 'send_sms',
    organizationId: DEFAULT_ORG,
    fromNumber: '+14155550100',
    toNumber: '',
    text: 'Valid text',
  });
  assert(b14b.status === 400 && !b14b.jsonError, 'send_sms with empty toNumber returns 400 with valid JSON error');
  assert(b14b.data?.error?.includes('Recipient phone number (toNumber) is required'), `send_sms rejected with error: "${b14b.data?.error}"`);

  // 5.2 Very large SMS text (15,000 characters)
  const largeText = 'A'.repeat(15000);
  const b15 = await postServices({
    subService: 'telephony',
    action: 'send_sms',
    organizationId: DEFAULT_ORG,
    fromNumber: '+14155550100',
    toNumber: '+14158904412',
    text: largeText,
  });
  assert(b15.status === 200 && !b15.jsonError, 'send_sms with 15KB text payload returns 200 with valid JSON');

  // 5.3 High-Unicode / RTL / Emojis
  const unicodeText = '🔥🚀 رسالة اختبار التحقق من رقم الهاتف 🌟 Asra3! 100% Arabic text with special characters: &<>"\'' ;
  const b16 = await postServices({
    subService: 'telephony',
    action: 'simulate_incoming_sms',
    organizationId: DEFAULT_ORG,
    fromNumber: '+966501234567',
    toNumber: '+14155550100',
    text: unicodeText,
  });
  assert(b16.status === 200 && !b16.jsonError, 'simulate_incoming_sms with Arabic & Unicode returns 200 JSON');
  assert(b16.data?.message?.text === unicodeText, 'simulate_incoming_sms preserves unicode characters verbatim');

  // -------------------------------------------------------------
  // SUITE 6: Stress Testing — Non-Existent Entities
  // -------------------------------------------------------------
  console.log('\n>>> [SUITE 6] Stress Testing: Non-Existent Entity IDs');

  // 6.1 link_whatsapp with non-existent phone ID
  const b17 = await postServices({
    subService: 'telephony',
    action: 'link_whatsapp',
    organizationId: DEFAULT_ORG,
    phoneNumberId: 'num_ghost_id_does_not_exist',
    displayName: 'Ghost',
    category: 'TECH',
    verificationMethod: 'sms_otp',
  });
  assert(b17.status === 400 && !b17.jsonError, 'link_whatsapp with non-existent phone ID returns 400 JSON');
  assert(b17.data?.error?.includes('not found'), `link_whatsapp error mentions not found: "${b17.data?.error}"`);

  // 6.2 send_test_whatsapp with non-existent phone ID
  const b18 = await postServices({
    subService: 'telephony',
    action: 'send_test_whatsapp',
    organizationId: DEFAULT_ORG,
    phoneNumberId: 'num_ghost_id_does_not_exist',
    recipientPhone: '+14158904412',
  });
  assert(b18.status === 400 && !b18.jsonError, 'send_test_whatsapp with non-existent phone ID returns 400 JSON');

  // 6.3 configure_ai_voice with non-existent phone ID
  const b19 = await postServices({
    subService: 'telephony',
    action: 'configure_ai_voice',
    organizationId: DEFAULT_ORG,
    phoneNumberId: 'num_ghost_id_does_not_exist',
  });
  assert(b19.status === 400 && !b19.jsonError, 'configure_ai_voice with non-existent phone ID returns 400 JSON');

  // -------------------------------------------------------------
  // SUITE 7: Stress Testing — Concurrent Buy Requests & Quota Enforcement
  // -------------------------------------------------------------
  console.log('\n>>> [SUITE 7] Stress Testing: Concurrent Buy Requests & Quota Enforcement');

  const concurrentOrg = `org_concurrent_${Date.now()}`;
  console.log(`  Spawning 10 simultaneous buy requests for new tenant "${concurrentOrg}" (Plan quota: 5)...`);

  const buyPromises = Array.from({ length: 10 }).map((_, idx) =>
    postServices({
      subService: 'telephony',
      action: 'buy_number',
      organizationId: concurrentOrg,
      country: idx % 2 === 0 ? 'US' : 'GB',
      numberType: 'local',
      locality: `City_${idx}`,
    })
  );

  const buyResults = await Promise.all(buyPromises);

  // Every response must be valid JSON with either status 200 (bought) or 400 (quota reached)
  const allValidJson = buyResults.every((r) => !r.jsonError);
  const statusCodes = buyResults.map((r) => r.status);
  const successfulBuys = buyResults.filter((r) => r.status === 200);
  const quotaBlockedBuys = buyResults.filter((r) => r.status === 400);

  assert(allValidJson, 'All 10 concurrent buy requests returned parseable JSON (zero malformed responses)');
  assert(
    statusCodes.every((s) => s === 200 || s === 400),
    `All responses returned expected HTTP status (200 or 400): ${JSON.stringify(statusCodes)}`
  );
  assert(
    successfulBuys.length <= 5,
    `Tenant owned numbers did not exceed quota limit of 5 (Actual successful buys: ${successfulBuys.length})`
  );
  assert(
    quotaBlockedBuys.length >= 5,
    `Excess requests were cleanly blocked by quota enforcement (Blocked: ${quotaBlockedBuys.length})`
  );
  assert(
    quotaBlockedBuys.every((b) => b.data?.error?.includes('quota exceeded') || b.data?.error?.includes('Max: 5')),
    'All blocked requests contain explicit quota exceeded error explanation'
  );

  // Verify final owned numbers count for this tenant
  const finalNumbersCheck = await postServices({
    subService: 'telephony',
    action: 'list_numbers',
    organizationId: concurrentOrg,
  });
  assert(
    finalNumbersCheck.data?.quota?.used <= finalNumbersCheck.data?.quota?.max,
    `Final tenant quota state consistent: used ${finalNumbersCheck.data?.quota?.used} <= max ${finalNumbersCheck.data?.quota?.max}`
  );

  // -------------------------------------------------------------
  // SUITE 8: Generic Gateway Robustness (Malformed & Invalid Actions)
  // -------------------------------------------------------------
  console.log('\n>>> [SUITE 8] Gateway Integrity: Malformed & Invalid Actions');

  // 8.1 Completely empty object
  const g1 = await postServices({});
  assert(g1.status === 400 && !g1.jsonError, 'POST with empty object returns 400 JSON');

  // 8.2 Unsupported action
  const g2 = await postServices({
    subService: 'telephony',
    action: 'explode_system_now',
    organizationId: DEFAULT_ORG,
  });
  assert(g2.status === 400 && !g2.jsonError, 'POST with unsupported action returns 400 JSON');
  assert(g2.data?.error?.includes('Unsupported subService/action'), 'Error message identifies unsupported action');

  // 8.3 Unsupported subservice
  const g3 = await postServices({
    subService: 'hyperspace_teleport',
    action: 'jump',
    organizationId: DEFAULT_ORG,
  });
  assert(g3.status === 400 && !g3.jsonError, 'POST with unsupported subservice returns 400 JSON');

  // 8.4 Malformed JSON payload string
  const g4 = await postServices('{ "unclosed_json": true, ');
  assert(g4.status === 400 && !g4.jsonError, 'POST with malformed JSON body caught by Next.js and returns 400 JSON error');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL ADVERSARIAL TESTS RUN: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('================================================================');

  if (failedTests > 0) {
    console.error('\nFAILURES SUMMARY:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('\n🌟 ALL ADVERSARIAL STRESS TESTS COMPLETED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal crash in test harness runner:', err);
  process.exit(1);
});
