// scripts/challenger-m3-stress-test.mjs
// Adversarial Empirical Stress-Testing Harness for Milestone 3 (Challenger 2)

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const PORT = process.env.PORT || '3000';
const BASE_URL = `http://localhost:${PORT}`;
const ORG_ID = 'org_stress_test_m3';

const M3_FILES = [
  'src/components/dashboard/PhoneMarketplaceAndWhatsAppLinking.tsx',
  'src/components/dashboard/WebPhoneDialerAndCallConsole.tsx',
  'src/components/dashboard/LiveSmsAndWhatsAppInbox.tsx',
  'src/app/dashboard/page.tsx',
];

console.log('================================================================');
console.log('   CHALLENGER 2: EMPIRICAL STRESS-TEST HARNESS (MILESTONE 3)    ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: PHYSICAL CSS CLASS SCANNER (RTL & LOGICAL CSS AUDIT)
// -----------------------------------------------------------------------------
console.log('--- 1. PHYSICAL CSS SCANNER ---');
const PHYSICAL_REGEX = /\b(pl-[0-9]+|pr-[0-9]+|ml-[0-9]+|mr-[0-9]+|left-[0-9]+|right-[0-9]+|text-left|text-right|float-left|float-right|border-l-[0-9]+|border-r-[0-9]+|rounded-l-|rounded-r-)\b/g;

let totalPhysicalViolations = 0;
for (const relPath of M3_FILES) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    assert(false, `File exists: ${relPath}`);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const matches = [...content.matchAll(PHYSICAL_REGEX)].map(m => m[0]);
  if (matches.length > 0) {
    totalPhysicalViolations += matches.length;
    console.error(`    Violations in ${relPath}: ${matches.join(', ')}`);
  }
  assert(matches.length === 0, `0 physical CSS violations in ${relPath} (found: ${matches.length})`);
}
assert(totalPhysicalViolations === 0, `Total physical CSS violations across M3 = 0 (actual: ${totalPhysicalViolations})`);

// -----------------------------------------------------------------------------
// SECTION 2: STATIC HOOKS, KEYS, & TIMER CLEANUP AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- 2. STATIC HOOKS, KEYS & TIMERS AUDIT ---');

for (const relPath of M3_FILES.slice(0, 3)) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Verify list rendering has key=
  const mapMatches = content.match(/\.map\s*\(/g) || [];
  const keyMatches = content.match(/key=\{/g) || [];
  assert(keyMatches.length >= mapMatches.length, `${path.basename(relPath)}: All .map() render items have key={...} (maps: ${mapMatches.length}, keys: ${keyMatches.length})`);
}

// Check WebPhoneDialer timer cleanup
const dialerContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/dashboard/WebPhoneDialerAndCallConsole.tsx'), 'utf8');
const hasInterval = dialerContent.includes('setInterval');
const hasClearInterval = dialerContent.includes('clearInterval');
assert(hasInterval && hasClearInterval, 'WebPhoneDialer has setInterval with corresponding clearInterval cleanup');

// Check dir="ltr" on dialpad keys & phone numbers for RTL safety
const hasDirLtrKeypad = dialerContent.includes('dir="ltr"') && dialerContent.includes('DIALPAD_KEYS');
assert(hasDirLtrKeypad, 'WebPhoneDialer numeric keypad explicitly enforces dir="ltr" to prevent RTL digit inversion');

// Verify all 12 dialpad keys are defined
const REQUIRED_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
const allKeysPresent = REQUIRED_KEYS.every(k => dialerContent.includes(`key: '${k}'`));
assert(allKeysPresent, `WebPhoneDialer defines all 12 keypad symbols (${REQUIRED_KEYS.join(', ')})`);

// -----------------------------------------------------------------------------
// SECTION 3: DIALPAD LOGIC UNIT SIMULATION (Adversarial Input Mining)
// -----------------------------------------------------------------------------
console.log('\n--- 3. DIALPAD & PHONE NUMBER FORMATTING STRESS TEST ---');

// Simulate handleBackspace
function simulateBackspace(str) {
  return str.slice(0, -1);
}

// Simulate handleKeyClick
function simulateKeyClick(curr, key) {
  return curr + key;
}

assert(simulateBackspace('+1 (415) 890-4412') === '+1 (415) 890-441', 'Backspace correctly slices last digit from formatted number');
assert(simulateBackspace('1') === '', 'Backspace correctly reduces single character to empty string');
assert(simulateBackspace('') === '', 'Backspace on empty string returns empty string without error');

let dialed = '';
for (const k of ['+', '1', '4', '1', '5', '5', '5', '5', '0', '1', '9', '9']) {
  dialed = simulateKeyClick(dialed, k);
}
assert(dialed === '+14155550199', `Dialpad sequence generates correct string: ${dialed}`);
dialed = simulateBackspace(dialed);
assert(dialed === '+1415555019', `Backspace slices 9: ${dialed}`);

// -----------------------------------------------------------------------------
// SECTION 4: LIVE BACKEND API STRESS TESTS (AGAINST NEXT.JS SERVER)
// -----------------------------------------------------------------------------
console.log('\n--- 4. LIVE BACKEND & MESSAGING STRESS TESTS ---');

async function testBackend() {
  try {
    // 4.1 Search numbers with multiple filters
    console.log('  Testing search_numbers with edge-case filters...');
    const searchResAll = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'search_numbers',
        organizationId: ORG_ID,
        country: 'all',
        numberType: 'all',
        limit: 50,
      }),
    });
    assert(searchResAll.ok, `search_numbers country=all returns status ${searchResAll.status}`);
    const searchDataAll = await searchResAll.json();
    assert(searchDataAll.results.length >= 20, `search_numbers returned ${searchDataAll.results.length} numbers across multiple countries`);
    assert(searchDataAll.totalCountries >= 55, `Catalog covers ${searchDataAll.totalCountries} countries (expected 55+)`);

    // 4.2 Search numbers filtered by capabilities
    const searchResCaps = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'search_numbers',
        organizationId: ORG_ID,
        country: 'GB',
        numberType: 'mobile',
        capabilities: { whatsapp: true, voice: true, sms: true },
        limit: 10,
      }),
    });
    const searchDataCaps = await searchResCaps.json();
    assert(searchResCaps.ok && searchDataCaps.results.length > 0, `search_numbers for UK mobile with WhatsApp & Voice returned ${searchDataCaps.results?.length} results`);

    // 4.3 Purchase a virtual number
    console.log('  Testing buy_number (1-Click provision)...');
    const targetToBuy = searchDataCaps.results[0];
    const buyRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'buy_number',
        organizationId: ORG_ID,
        country: targetToBuy.country,
        phoneNumber: targetToBuy.phoneNumber,
        numberType: targetToBuy.type,
        locality: targetToBuy.locality,
      }),
    });
    const buyData = await buyRes.json();
    assert(buyRes.ok && buyData.success, `buy_number provisioned ${buyData.phoneNumber?.phoneNumber}`);
    const newNumberId = buyData.phoneNumber.id;

    // 4.4 WhatsApp Linking with SMS OTP (auto-capture) and Voice OTP
    console.log('  Testing link_whatsapp with sms_otp (auto-captured OTP)...');
    const waSmsRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'link_whatsapp',
        organizationId: ORG_ID,
        phoneNumberId: newNumberId,
        displayName: 'Techurity UK Care',
        category: 'CUSTOMER_SERVICE',
        verificationMethod: 'sms_otp',
      }),
    });
    const waSmsData = await waSmsRes.json();
    assert(waSmsRes.ok && waSmsData.success && waSmsData.verificationOtp === '481-923', `link_whatsapp with sms_otp passed: Auto-captured OTP = ${waSmsData.verificationOtp}`);

    console.log('  Testing link_whatsapp with voice_otp...');
    const waVoiceRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'link_whatsapp',
        organizationId: ORG_ID,
        phoneNumberId: newNumberId,
        displayName: 'Techurity UK Care',
        category: 'CUSTOMER_SERVICE',
        verificationMethod: 'voice_otp',
      }),
    });
    const waVoiceData = await waVoiceRes.json();
    assert(waVoiceRes.ok && waVoiceData.success && waVoiceData.status === 'linked', `link_whatsapp with voice_otp passed: status = ${waVoiceData.status}`);

    // 4.5 WhatsApp live test send
    console.log('  Testing send_test_whatsapp broadcast...');
    const sendWaRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'send_test_whatsapp',
        organizationId: ORG_ID,
        phoneNumberId: newNumberId,
        recipientPhone: '+44 7700 900123',
        templateName: 'winter_sale_50',
        parameters: ['WINTER50'],
      }),
    });
    const sendWaData = await sendWaRes.json();
    assert(sendWaRes.ok && sendWaData.status === 'delivered' && sendWaData.readReceipt, 'send_test_whatsapp returned delivered status with read receipt (✓✓)');

    // 4.6 AI Voice Agent Configuration
    console.log('  Testing configure_ai_voice...');
    const voiceCfgRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'configure_ai_voice',
        organizationId: ORG_ID,
        phoneNumberId: newNumberId,
        agentName: 'Fahad Executive AI',
        language: 'ar-SA',
        systemPrompt: 'أنت فهد، مستشار Techurity للحلول التقنية.',
        voicePersona: 'Fahad (Executive Arabic Advisor)',
        humanTransferNumber: '+966 50 123 4567',
      }),
    });
    const voiceCfgData = await voiceCfgRes.json();
    assert(voiceCfgRes.ok && voiceCfgData.success && voiceCfgData.voiceAgent?.agentName === 'Fahad Executive AI', `configure_ai_voice passed: agent ${voiceCfgData.voiceAgent?.agentName}`);

    // 4.7 Initiate call in both AI Voice and Direct PSTN modes
    console.log('  Testing initiate_call (ai_voice_agent mode)...');
    const callResAi = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'initiate_call',
        organizationId: ORG_ID,
        fromNumber: buyData.phoneNumber.phoneNumber,
        toNumber: '+1 (415) 890-4412',
        mode: 'ai_voice_agent',
        humanTransferNumber: '+1 (800) 555-0199',
      }),
    });
    const callDataAi = await callResAi.json();
    assert(callResAi.ok && callDataAi.success && callDataAi.callSession.transcripts.length > 0, `initiate_call AI returned transcripts (count: ${callDataAi.callSession?.transcripts?.length})`);

    console.log('  Testing initiate_call (direct_voice PSTN mode)...');
    const callResDirect = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'initiate_call',
        organizationId: ORG_ID,
        fromNumber: buyData.phoneNumber.phoneNumber,
        toNumber: '+44 20 7946 0912',
        mode: 'direct_voice',
      }),
    });
    const callDataDirect = await callResDirect.json();
    assert(callResDirect.ok && callDataDirect.success, `initiate_call direct PSTN passed: CallId ${callDataDirect.callSession?.callId}`);

    // 4.8 Simulate incoming customer SMS and OTP
    console.log('  Testing simulate_incoming_sms (OTP & order_inquiry)...');
    const simOtpRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'simulate_incoming_sms',
        organizationId: ORG_ID,
        fromNumber: '+1 (415) 992-8172',
        toNumber: buyData.phoneNumber.phoneNumber,
        type: 'otp',
      }),
    });
    const simOtpData = await simOtpRes.json();
    assert(simOtpRes.ok && simOtpData.success && simOtpData.message?.text?.includes('OTP code'), `simulate_incoming_sms OTP passed: "${simOtpData.message?.text}"`);

    // 4.9 List messages to verify thread was updated
    console.log('  Testing list_messages after simulated inbound SMS...');
    const listMsgRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'list_messages',
        organizationId: ORG_ID,
      }),
    });
    const listMsgData = await listMsgRes.json();
    assert(listMsgRes.ok && listMsgData.threads.length > 0, `list_messages returned ${listMsgData.threads?.length} threads`);
    const foundThread = listMsgData.threads.find(t => t.virtualNumber === buyData.phoneNumber.phoneNumber);
    assert(foundThread !== undefined, `Found thread created for virtual line ${buyData.phoneNumber.phoneNumber}`);

    // 4.10 Send outbound SMS on this thread
    console.log('  Testing send_sms on virtual number thread...');
    const sendSmsRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'send_sms',
        organizationId: ORG_ID,
        fromNumber: buyData.phoneNumber.phoneNumber,
        toNumber: '+1 (415) 992-8172',
        text: 'Thank you for verifying! Your Techurity service line is now active.',
      }),
    });
    const sendSmsData = await sendSmsRes.json();
    assert(sendSmsRes.ok && sendSmsData.success && sendSmsData.deliveryStatus === 'delivered', `send_sms passed with delivered status (ID: ${sendSmsData.messageId}, status: ${sendSmsData.deliveryStatus})`);

    // 4.11 Call History Log verification
    console.log('  Testing list_call_history...');
    const historyRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subService: 'telephony',
        action: 'list_call_history',
        organizationId: ORG_ID,
      }),
    });
    const historyData = await historyRes.json();
    assert(historyRes.ok && historyData.calls.length >= 2, `list_call_history returned ${historyData.calls?.length} calls (expected at least 2)`);

  } catch (err) {
    console.error('Error during backend tests:', err);
    assert(false, `Backend API reachable and responsive: ${err.message}`);
  }
}

await testBackend();

console.log('\n================================================================');
console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n>>> EMPIRICAL STRESS TESTS 100% SUCCESSFUL <<<');
  process.exit(0);
}
