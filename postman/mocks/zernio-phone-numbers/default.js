// Contract-derived local fixture: ../../contracts/zernio-phone-numbers.openapi.json.
// /__fixture/* control routes are test infrastructure, never provider APIs.
const http = require('http');
const PROFILE = '66a1f0c2a4b9d3e8f1a2b3c4';
const FOREIGN = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const NUMBER = '66d4e5f6a7b8c9d0e1f2a3b4';
const stateKey = 'zernio-phone-numbers:state';
const type = (numberType, monthlyCents, needsKyc = false) => ({ numberType, monthlyCents, needsKyc,
  whatsappAvailable: numberType !== 'toll_free', smsAvailable: true, callsAvailable: true, inStock: true, fulfilment: 'instant' });
const countries = [
  { code: 'US', monthlyCents: 300, needsKyc: false, callsAvailable: true, whatsappAvailable: true, smsAvailable: true, inStock: true, types: [type('local', 300), type('mobile', 600), type('toll_free', 500)] },
  { code: 'GB', monthlyCents: 300, needsKyc: true, callsAvailable: true, whatsappAvailable: true, smsAvailable: true, inStock: true, types: [type('local', 300, true)] },
];
const seed = () => ({ scenario: 'success', requests: [], numbers: [], intents: {} });
const owned = (body, scenario) => ({ _id: NUMBER, phoneNumber: body.phoneNumber || '+14155550100',
  country: body.country || 'US', numberType: body.numberType || 'local',
  profileId: scenario === 'foreign-profile' ? FOREIGN : PROFILE,
  status: scenario === 'verifying' ? 'verifying' : 'active', monthlyCents: 300,
  hostedByZernio: true, metaVerificationStatus: 'verified', socialAccountId: null,
  features: { calls: true, whatsapp: false, smsPending: false }, provisionedAt: '2026-10-19T10:00:00Z' });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const pathname = url.pathname;
  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-Id': 'isolated-provider-request', 'X-RateLimit-Remaining': '119' });
    res.end(JSON.stringify(body));
  };
  try {
    let state = (await pm.state.get(stateKey)) || seed();
    if (pathname === '/__fixture/reset' && req.method === 'POST') {
      state = { ...seed(), scenario: req.body?.scenario || 'success' };
      await pm.state.set(stateKey, state);
      return send(200, { ok: true });
    }
    if (pathname === '/__fixture/requests' && req.method === 'GET') return send(200, state);
    if (pathname === '/__fixture/scenario' && req.method === 'POST') {
      state.scenario = req.body.scenario;
      if (req.body.activateKyc) state.numbers = [owned({ country: 'GB', numberType: 'local', phoneNumber: '+447400123456' }, 'success')];
      await pm.state.set(stateKey, state);
      return send(200, { ok: true });
    }
    const body = req.body || {};
    state.requests.push({ method: req.method, pathname, query: Object.fromEntries(url.searchParams), body,
      idempotencyKey: req.headers['idempotency-key'], contentType: req.headers['content-type'] });
    await pm.state.set(stateKey, state);
    if (req.method === 'GET' && pathname === '/api/v1/phone-numbers/countries') return send(200, { countries });
    if (req.method === 'GET' && pathname === '/api/v1/phone-numbers/availability') return send(200, {
      country: url.searchParams.get('country') || 'US', numberType: url.searchParams.get('numberType') || 'local',
      available: true, addressConstraint: url.searchParams.get('country') === 'GB' ? 'country' : 'none',
      areaOptions: [{ ndc: '415', name: 'San Francisco, CA', count: 2 }] });
    if (req.method === 'GET' && pathname === '/api/v1/phone-numbers/available') return send(200, {
      country: url.searchParams.get('country') || 'US', numberType: url.searchParams.get('numberType') || 'local', requireSms: url.searchParams.get('requireSms') === 'true',
      numbers: state.scenario === 'empty-inventory' ? [] : [{ phoneNumber: '+14155550100', features: ['voice', 'sms', 'mms'], locality: 'SAN FRANCISCO', bestEffort: false }] });
    if (req.method === 'GET' && pathname === '/api/v1/phone-numbers') return send(200, {
      numbers: state.numbers.map((number) => ({ ...number, profileId: { _id: number.profileId, name: 'Isolated profile' } })), connected: [] });
    if (req.method === 'GET' && pathname === `/api/v1/phone-numbers/${NUMBER}`) {
      const number = state.numbers.find((item) => item._id === NUMBER);
      // The real detail endpoint omits profileId and numberType; ownership comes from the list.
      return number ? send(200, { phoneNumber: { id: number._id, phoneNumber: number.phoneNumber, country: number.country, status: number.status, provisionedAt: number.provisionedAt } }) : send(404, { error: 'Phone number not found', type: 'not_found' });
    }
    if (req.method === 'POST' && pathname === '/api/v1/phone-numbers/purchase') {
      const accepted = ['profileId', 'country', 'numberType', 'phoneNumber', 'areaCode', 'connectWhatsapp', 'wantsSms', 'wantsWhatsapp', 'purchaseIntentId', 'allowMultiple'];
      if (Object.keys(body).some((key) => !accepted.includes(key)) || body.profileId !== PROFILE || !body.purchaseIntentId) {
        return send(400, { error: 'Invalid purchase fields', type: 'invalid_request_error', code: 'invalid_field_value' });
      }
      if (state.scenario === 'payment-required') return send(402, { error: 'A payment method is required to purchase a phone number.', type: 'invalid_request_error', code: 'PAYMENT_REQUIRED' });
      if (state.scenario === 'unavailable') return send(409, { error: 'The selected number is unavailable.', type: 'invalid_request_error', code: 'PHONE_NUMBER_UNAVAILABLE' });
      if (state.scenario === 'carrier-unavailable') return send(503, { error: 'Carrier unavailable', type: 'api_error', code: 'CARRIER_UNAVAILABLE' });
      if (state.scenario === 'kyc-required') return send(202, { status: 'kyc_required', country: 'GB', numberType: 'local', kycUrl: 'https://zernio.com/kyc/isolated' });
      if (state.intents[body.purchaseIntentId]) {
        const number = state.intents[body.purchaseIntentId];
        return send(200, { status: 'already_purchased', numberId: number._id, phoneNumber: number.phoneNumber, profileId: number.profileId });
      }
      const number = owned(body, state.scenario);
      state.numbers.push(number);
      state.intents[body.purchaseIntentId] = number;
      await pm.state.set(stateKey, state);
      return send(200, { message: 'Phone number provisioned', phoneNumber: { id: number._id, phoneNumber: number.phoneNumber,
        country: number.country, status: number.status, profileId: number.profileId, provisionedAt: number.provisionedAt } });
    }
    return send(501, { error: 'This contract fixture does not model this call.' });
  } catch (error) {
    send(500, { error: `Fixture failure: ${error.message}` });
  }
});
server.listen(process.env.PORT || 4948);
