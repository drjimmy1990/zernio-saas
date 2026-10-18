const PORT = process.env.PORT || '3000';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const orgId = 'org_demo_acme';

async function runTests() {
  console.log('--- STARTING MILESTONE 3 TELEPHONY & MESSAGING E2E TESTS ---');

  // Test 0: GET /api/services (workspace check)
  console.log('\n[TEST 0] Testing GET /api/services...');
  const getRes = await fetch(`${BASE_URL}/api/services?organizationId=${orgId}`);
  if (!getRes.ok) throw new Error(`GET /api/services failed with status ${getRes.status}`);
  const getData = await getRes.json();
  if (!getData.subServicesData?.telephony) throw new Error('Telephony data missing in workspace');
  console.log('✓ GET /api/services successful! Owned numbers:', getData.subServicesData.telephony.numbers.length);

  // Test 1: POST search_numbers (across 55+ countries)
  console.log('\n[TEST 1] Testing search_numbers...');
  const searchRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'search_numbers',
      organizationId: orgId,
      country: 'US',
      numberType: 'local',
      capabilities: { voice: true, sms: true, whatsapp: true },
      limit: 10,
    }),
  });
  if (!searchRes.ok) throw new Error(`search_numbers failed: ${searchRes.status}`);
  const searchData = await searchRes.json();
  if (!searchData.results || searchData.results.length === 0) throw new Error('No search results');
  if (searchData.totalCountries < 50) throw new Error(`Expected 50+ countries, got ${searchData.totalCountries}`);
  console.log(`✓ search_numbers passed! Total countries cataloged: ${searchData.totalCountries}, Sample: ${searchData.results[0].phoneNumber} (${searchData.results[0].locality})`);

  // Test 2: POST buy_number
  console.log('\n[TEST 2] Testing buy_number (1-Click Purchase)...');
  const buyRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'buy_number',
      organizationId: orgId,
      country: 'US',
      numberType: 'local',
      locality: 'San Francisco',
    }),
  });
  if (!buyRes.ok) throw new Error(`buy_number failed: ${buyRes.status}`);
  const buyData = await buyRes.json();
  if (!buyData.success || !buyData.phoneNumber) throw new Error('buy_number did not return success');
  const provisionedNumber = buyData.phoneNumber;
  console.log(`✓ buy_number passed! Provisioned: ${provisionedNumber.phoneNumber} (ID: ${provisionedNumber.id}, Status: ${provisionedNumber.status})`);

  // Test 3: POST link_whatsapp (Wizard Linking)
  console.log('\n[TEST 3] Testing link_whatsapp (WhatsApp Business Linking Wizard)...');
  const waRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'link_whatsapp',
      organizationId: orgId,
      phoneNumberId: provisionedNumber.id,
      displayName: 'Techurity Enterprise Solutions',
      category: 'CUSTOMER_SERVICE',
      verificationMethod: 'sms_otp',
    }),
  });
  if (!waRes.ok) throw new Error(`link_whatsapp failed: ${waRes.status}`);
  const waData = await waRes.json();
  if (!waData.success || waData.templatesSynced !== 3 || !waData.verificationOtp) {
    throw new Error('link_whatsapp did not return expected status and templates');
  }
  console.log(`✓ link_whatsapp passed! Status: ${waData.status}, OTP: ${waData.verificationOtp}, Templates synced: ${waData.templatesSynced}`);

  // Test 4: POST send_test_whatsapp (Live Broadcast with Template)
  console.log('\n[TEST 4] Testing send_test_whatsapp (Live WhatsApp Broadcast)...');
  const waSendRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'send_test_whatsapp',
      organizationId: orgId,
      phoneNumberId: provisionedNumber.id,
      recipientPhone: '+1 (415) 890-4412',
      templateName: 'order_update',
      parameters: ['Alex Mercer', '88102'],
    }),
  });
  if (!waSendRes.ok) throw new Error(`send_test_whatsapp failed: ${waSendRes.status}`);
  const waSendData = await waSendRes.json();
  if (!waSendData.success || waSendData.status !== 'delivered' || !waSendData.readReceipt) {
    throw new Error('send_test_whatsapp delivery failed');
  }
  console.log(`✓ send_test_whatsapp passed! MessageId: ${waSendData.messageId}, Status: ${waSendData.status}, ReadReceipt: ${waSendData.readReceipt}`);

  // Test 5: POST configure_ai_voice
  console.log('\n[TEST 5] Testing configure_ai_voice (AI Voice Agent Parameters)...');
  const voiceRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'configure_ai_voice',
      organizationId: orgId,
      phoneNumberId: provisionedNumber.id,
      agentName: 'Sarah AI Concierge',
      language: 'ar-SA',
      systemPrompt: 'You are Sarah, expert advisor.',
      voicePersona: 'Sarah (Warm & Empathetic)',
      humanTransferNumber: '+1 (800) 555-0199',
    }),
  });
  if (!voiceRes.ok) throw new Error(`configure_ai_voice failed: ${voiceRes.status}`);
  const voiceData = await voiceRes.json();
  if (!voiceData.success || !voiceData.voiceAgent) throw new Error('configure_ai_voice failed');
  console.log(`✓ configure_ai_voice passed! Agent: ${voiceData.voiceAgent.agentName}, Persona: ${voiceData.voiceAgent.voicePersona}`);

  // Test 6: POST initiate_call (Interactive Web Phone Call)
  console.log('\n[TEST 6] Testing initiate_call (Interactive Softphone AI Call)...');
  const callRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'initiate_call',
      organizationId: orgId,
      fromNumber: provisionedNumber.phoneNumber,
      toNumber: '+1 (415) 890-4412',
      mode: 'ai_voice_agent',
      humanTransferNumber: '+1 (800) 555-0199',
      language: 'ar-SA',
    }),
  });
  if (!callRes.ok) throw new Error(`initiate_call failed: ${callRes.status}`);
  const callData = await callRes.json();
  if (!callData.success || !callData.callSession || callData.callSession.transcripts.length === 0) {
    throw new Error('initiate_call failed');
  }
  console.log(`✓ initiate_call passed! CallId: ${callData.callSession.callId}, Duration: ${callData.callSession.durationSeconds}s, Transcripts count: ${callData.callSession.transcripts.length}`);

  // Test 7: POST list_call_history
  console.log('\n[TEST 7] Testing list_call_history...');
  const historyRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'list_call_history',
      organizationId: orgId,
    }),
  });
  if (!historyRes.ok) throw new Error(`list_call_history failed: ${historyRes.status}`);
  const historyData = await historyRes.json();
  if (!historyData.calls || historyData.calls.length === 0) throw new Error('No calls in history');
  console.log(`✓ list_call_history passed! Total calls logged: ${historyData.totalCalls}`);

  // Test 8: POST send_sms (Live Outbound SMS)
  console.log('\n[TEST 8] Testing send_sms (Outbound SMS with Delivery Receipt)...');
  const smsRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'send_sms',
      organizationId: orgId,
      fromNumber: provisionedNumber.phoneNumber,
      toNumber: '+1 (415) 890-9900',
      text: 'Order dispatched via Techurity Logistics. Tracking: https://techurity.si/t/88',
    }),
  });
  if (!smsRes.ok) throw new Error(`send_sms failed: ${smsRes.status}`);
  const smsData = await smsRes.json();
  if (!smsData.success || smsData.deliveryStatus !== 'delivered') throw new Error('send_sms delivery failed');
  console.log(`✓ send_sms passed! MessageId: ${smsData.messageId}, Status: ${smsData.deliveryStatus}`);

  // Test 9: POST simulate_incoming_sms (Simulating Incoming Customer SMS & OTP)
  console.log('\n[TEST 9] Testing simulate_incoming_sms...');
  const simRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'simulate_incoming_sms',
      organizationId: orgId,
      fromNumber: '+1 (415) 890-9900',
      toNumber: provisionedNumber.phoneNumber,
      type: 'otp',
    }),
  });
  if (!simRes.ok) throw new Error(`simulate_incoming_sms failed: ${simRes.status}`);
  const simData = await simRes.json();
  if (!simData.success || !simData.message) throw new Error('simulate_incoming_sms failed');
  console.log(`✓ simulate_incoming_sms passed! Inbound message text: "${simData.message.text}"`);

  // Test 10: POST list_messages (Multi-channel inbox threads)
  console.log('\n[TEST 10] Testing list_messages (Multi-channel threads)...');
  const msgRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'list_messages',
      organizationId: orgId,
    }),
  });
  if (!msgRes.ok) throw new Error(`list_messages failed: ${msgRes.status}`);
  const msgData = await msgRes.json();
  if (!msgData.threads || msgData.threads.length === 0) throw new Error('No threads found');
  console.log(`✓ list_messages passed! Total conversation threads: ${msgData.threads.length}`);

  // Test 11: POST list_numbers
  console.log('\n[TEST 11] Testing list_numbers (Owned Numbers & Quota)...');
  const numbersRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subService: 'telephony',
      action: 'list_numbers',
      organizationId: orgId,
    }),
  });
  if (!numbersRes.ok) throw new Error(`list_numbers failed: ${numbersRes.status}`);
  const numbersData = await numbersRes.json();
  if (!numbersData.numbers || numbersData.numbers.length === 0) throw new Error('No numbers found');
  console.log(`✓ list_numbers passed! Owned numbers: ${numbersData.numbers.length}, Quota used: ${numbersData.quota?.used}/${numbersData.quota?.max}`);

  console.log('\n================================================================');
  console.log('>>> ALL 11 TELEPHONY & MESSAGING SUITE API ACTIONS PASSED 100%! <<<');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
