import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const compile = (file) => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const source = compile('src/lib/telephony/phone-numbers.ts');
const storeSource = compile('src/lib/telephony/purchase-intents.ts');
class ZernioApiException extends Error { constructor(envelope) { super(envelope.error); this.envelope = envelope; } }
const profileId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const numberId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const purchase = { organizationId: 'tenant-a', country: 'US', numberType: 'local', phoneNumber: '+14155550100', purchaseIntentId: 'intent-one-0001', expectedMonthlyCents: 300 };
const providerNumber = () => ({ _id: numberId, profileId: { _id: profileId }, country: 'US', numberType: 'local', phoneNumber: '+14155550100', status: 'active', monthlyCents: 300, features: { calls: true, whatsapp: false }, smsCapable: true, smsSendApproved: false, socialAccountId: null });

function fixture(options = {}) {
  const intents = new Map(), requests = [], workspace = { ownedNumbers: [], callHistory: [], threads: [] };
  let numbers = options.numbers || [], writes = 0, monthlyCents = 300, calls = 0, gate;
  const intentStore = {
    acquire: async (params) => {
      if (options.storageUnavailable) throw new ZernioApiException({ status: 503, code: 'PURCHASE_STORAGE_UNAVAILABLE', error: 'storage unavailable' });
      let row = intents.get(params.intentId);
      if (row && row.fingerprint !== params.fingerprint) throw new ZernioApiException({ status: 409, code: 'PURCHASE_INTENT_MISMATCH', error: 'intent mismatch' });
      if (row?.locked) throw new ZernioApiException({ status: 503, code: 'PURCHASE_IN_PROGRESS', error: 'processing' });
      if (!row && [...intents.values()].some((value) => value.state !== 'terminal')) throw new ZernioApiException({ status: 409, code: 'PROFILE_PURCHASE_EXISTS', error: 'resume original' });
      if (!row) { row = { state: 'pending', attempted: false, number_id: null, kyc_url: null, fingerprint: params.fingerprint }; intents.set(params.intentId, row); }
      row.locked = true; row.lockToken = params.lockToken;
      return { ...row };
    },
    update: async (params) => {
      const row = intents.get(params.intentId);
      assert.equal(row.lockToken, params.lockToken, 'only the acquired lock token may update');
      Object.assign(row, { state: params.state, attempted: params.attempted, number_id: params.numberId || row.number_id, kyc_url: params.kycUrl || row.kyc_url, terminal_code: params.terminalCode });
      if (params.release) row.locked = false;
    },
  };
  const request = async (request) => {
    requests.push(request);
    if (request.path === '/phone-numbers/countries') return { status: 200, data: { countries: ['US', 'GB'].map((code) => ({ code, types: [{ numberType: 'local', monthlyCents, needsKyc: code === 'GB', whatsappAvailable: true, smsAvailable: true, callsAvailable: true, inStock: true }] })) } };
    if (request.path === '/phone-numbers/available') return { status: 200, data: { country: 'US', numberType: 'local', numbers: [{ phoneNumber: '+14155550100', features: ['voice', 'sms'] }] } };
    if (request.path === '/phone-numbers') return { status: 200, data: { numbers } };
    if (request.path.startsWith('/phone-numbers/') && request.method === 'GET') return { status: 200, data: { phoneNumber: options.detail || numbers.find((number) => number._id === request.path.split('/').at(-1)) } };
    if (request.path === '/phone-numbers/purchase') {
      calls++;
      if (options.concurrent && calls === 1) await new Promise((resolve) => { gate = resolve; });
      if (options.paymentFirst && calls === 1) throw new ZernioApiException({ status: 402, code: 'PAYMENT_REQUIRED', error: 'payment required' });
      if (options.ambiguousFirst && calls === 1) { numbers = [providerNumber()]; throw new TypeError('connection lost'); }
      if (options.transportFailure) throw new TypeError('connection lost');
      if (options.unavailable) throw new ZernioApiException({ status: 409, code: 'PHONE_NUMBER_UNAVAILABLE', error: 'unavailable' });
      if (request.body.country === 'GB') return { status: 202, data: { status: 'kyc_required', country: 'GB', numberType: 'local', kycUrl: 'https://provider.invalid/verify/real' } };
      numbers = [providerNumber()];
      return { status: 200, data: { phoneNumber: { id: numberId, profileId: options.wrongPurchaseProfile ? 'other-profile' : profileId, phoneNumber: '+14155550100', status: 'active' } } };
    }
    throw new Error(`unexpected provider call ${request.path}`);
  };
  const modules = {
    crypto, '@/lib/zernio/client': { ZernioApiException, zernioClient: { request, isConfigured: () => true } },
    '@/lib/services/core-connect.service': { CoreConnectService: { ensureTenantProfile: async () => profileId } },
    '@/lib/zernio/policy-engine': { assertSubServiceAllowed: async () => ({ quotas: { maxPhoneNumbers: 10 } }) },
    '@/lib/telephony/purchase-intents': { PurchaseIntentStore: intentStore },
    '@/lib/storage/workspace-store': { WorkspaceStore: { getWorkspace: () => workspace, saveWorkspace: () => { writes++; } } },
  };
  const context = vm.createContext({ URL, Intl, console });
  const module = { exports: {} };
  vm.runInContext(`(function(require,module,exports){${source}\n})`, context)((key) => { assert.ok(modules[key], key); return modules[key]; }, module, module.exports);
  return { service: module.exports, requests, workspace, intents, writes: () => writes, setPrice: (price) => { monthlyCents = price; }, setNumbers: (value) => { numbers = value; }, release: () => gate?.() };
}

const rejectCode = (code, status) => (error) => error instanceof ZernioApiException && error.envelope.code === code && (!status || error.envelope.status === status);
const mutations = (f) => f.requests.filter((request) => request.method === 'POST');

test('retired purchase entry point rejects all purchases before provider or durable intent side effects',async()=>{
 for(const options of [{},{paymentFirst:true},{ambiguousFirst:true},{transportFailure:true},{unavailable:true},{concurrent:true},{storageUnavailable:true}]){
  const f=fixture(options);for(const input of [purchase,{...purchase,country:'GB',phoneNumber:undefined},{...purchase,quoteId:'invented',expectedMonthlyCents:0}])await assert.rejects(f.service.purchasePhoneNumber(input),rejectCode('RETAIL_QUOTE_REQUIRED',501));
  assert.equal(f.requests.length,0);assert.equal(f.intents.size,0);assert.equal(f.writes(),0);
 }
});



















test('owned listing filters other profiles and preserves provider status and stamped price', async () => {
  const f = fixture({ numbers: [{ ...providerNumber(), status: 'verifying', monthlyCents: 775, socialAccountId: 'actual-whatsapp-account' }, { ...providerNumber(), _id: 'foreign', profileId: 'foreign' }] });
  const result = await f.service.listOwnedPhoneNumbers('tenant-a');
  assert.equal(result.numbers.length, 1); assert.equal(result.numbers[0].status, 'verifying');
  assert.equal(result.numbers[0].monthlyPriceUsd, 7.75); assert.equal(result.numbers[0].whatsappLinked, true);
  assert.equal(result.quota.max, 1);
});

test('provider refresh retains only the saved voice agent for the exact canonical number ID', async () => {
  const f = fixture({ numbers: [providerNumber()] });
  const voiceAgent = { enabled: true, agentName: 'Support agent', language: 'en', systemPrompt: 'Answer support calls', voicePersona: 'clear', recordingEnabled: false, transcriptionEnabled: true };
  f.workspace.ownedNumbers = [{ ...providerNumber(), id: numberId, status: 'suspended', phoneNumber: '+19995550123', profileId: 'stale-profile', monthlyPriceUsd: 999, whatsappLinked: true, socialAccountId: 'stale-account', voiceAgent }, { id: 'old-number', voiceAgent: { ...voiceAgent, agentName: 'Old number agent' } }];
  await f.service.listOwnedPhoneNumbers('tenant-a');
  assert.equal(f.workspace.ownedNumbers.length, 1);
  const refreshed = f.workspace.ownedNumbers[0];
  assert.equal(refreshed.voiceAgent, voiceAgent);
  assert.equal(refreshed.id, numberId); assert.equal(refreshed.profileId, profileId);
  assert.equal(refreshed.phoneNumber, '+14155550100'); assert.equal(refreshed.status, 'active');
  assert.equal(refreshed.monthlyPriceUsd, 3); assert.equal(refreshed.whatsappLinked, false);
  assert.equal(refreshed.socialAccountId, undefined);
  f.setNumbers([{ ...providerNumber(), _id: 'different-canonical-number' }]);
  await f.service.listOwnedPhoneNumbers('tenant-a');
  assert.equal(f.workspace.ownedNumbers[0].voiceAgent, undefined);
});

test('WhatsApp helper requires fresh active ownership and supports linkage after OAuth', async () => {
  const f = fixture({ numbers: [{ ...providerNumber(), socialAccountId: 'real-account' }] });
  assert.equal((await f.service.getOwnedPhoneNumberForWhatsApp('tenant-a', numberId)).phoneNumber, '+14155550100');
  f.setNumbers([{ ...providerNumber(), status: 'suspended' }]);
  await assert.rejects(f.service.getOwnedPhoneNumberForWhatsApp('tenant-a', numberId), rejectCode('PHONE_NUMBER_NOT_ACTIVE'));
  f.setNumbers([{ ...providerNumber(), profileId: 'other-profile' }]);
  await assert.rejects(f.service.getOwnedPhoneNumberForWhatsApp('tenant-a', numberId), rejectCode('PHONE_NUMBER_NOT_FOUND'));
});

test('documented number details omit profile/type while fresh listing proves ownership', async () => {
  const f = fixture({ numbers: [providerNumber()], detail: { id: numberId, phoneNumber: '+14155550100', status: 'active', country: 'US' } });
  const number = await f.service.getOwnedPhoneNumberForWhatsApp('tenant-a', numberId);
  assert.equal(number.id, numberId); assert.equal(number.profileId, profileId); assert.equal(number.type, 'local');
});

test('pending regulatory IDs without an allocated phone remain visible and prevent a second purchase', async () => {
  const f = fixture({ numbers: [{ ...providerNumber(), phoneNumber: undefined, status: 'pending_regulatory' }] });
  const result = await f.service.listOwnedPhoneNumbers('tenant-a');
  assert.equal(result.numbers[0].id, numberId); assert.equal(result.numbers[0].phoneNumber, '');
  assert.equal(result.quota.used, 1);
  await assert.rejects(f.service.purchasePhoneNumber(purchase), rejectCode('RETAIL_QUOTE_REQUIRED',501));
  assert.equal(mutations(f).length, 0);
});

test('real inventory joins current catalog prices; regulated entries are requests without fake E164', async () => {
  const f = fixture();
  const us = await f.service.searchPhoneNumbers({ organizationId: 'tenant-a', country: 'US', capabilities: { sms: true, whatsapp: true } });
  assert.equal(us.results[0].phoneNumber, '+14155550100'); assert.equal(us.results[0].monthlyCents, 300);
  assert.equal(f.requests.find((request) => request.path === '/phone-numbers/available').query.requireSms, true);
  const gb = await f.service.searchPhoneNumbers({ organizationId: 'tenant-a', country: 'GB' });
  assert.equal(gb.results[0].requestOnly, true); assert.equal(gb.results[0].phoneNumber, '');
  assert.equal(gb.countries.length, 2);
});





function durableStore(options = {}) {
  const calls = [], module = { exports: {} };
  const context = vm.createContext({ process: { env: { SUPABASE_SERVICE_ROLE_KEY: options.noRole ? '' : 'isolated-test-role' } } });
  const modules = { '@/lib/zernio/client': { ZernioApiException }, '@/lib/supabase/admin': { createSupabaseAdminClient: () => options.noClient ? null : { rpc: async (name, params) => { calls.push({ name, params }); if (options.transportFailure) throw new Error('database transport failed'); return options.response || { data: true, error: null }; } } } };
  vm.runInContext(`(function(require,module,exports){${storeSource}\n})`, context)((key) => modules[key], module, module.exports);
  return { store: module.exports.PurchaseIntentStore, calls };
}

test('durable store never falls back to anon credentials or an absent database', async () => {
  for (const options of [{ noRole: true }, { noClient: true }]) {
    const f = durableStore(options);
    await assert.rejects(f.store.acquire({}), rejectCode('PURCHASE_STORAGE_UNAVAILABLE', 503));
    assert.equal(f.calls.length, 0);
  }
});

test('durable update requires a successful compare-and-swap and carries the acquired lock token', async () => {
  const f = durableStore({ response: { data: false, error: null } });
  await assert.rejects(f.store.update({ organizationId: 'tenant-a', intentId: 'intent-a', lockToken: 'token-a', state: 'pending', attempted: true, release: true }), rejectCode('PURCHASE_STORAGE_UNAVAILABLE'));
  assert.equal(f.calls[0].params.p_lock_token, 'token-a'); assert.equal(f.calls[0].params.p_release, true);
});

test('durable acquire preserves lock contention and changed-intent errors from the database', async () => {
  for (const [code, status] of [['PURCHASE_IN_PROGRESS', 503], ['PURCHASE_INTENT_MISMATCH', 409], ['PROFILE_PURCHASE_EXISTS', 409]]) {
    const f = durableStore({ response: { data: { error_code: code }, error: null } });
    await assert.rejects(f.store.acquire({}), rejectCode(code, status));
  }
});

test('durable RPC transport failures and malformed states fail closed as retryable storage errors', async () => {
  for (const options of [{ transportFailure: true }, { response: { data: { state: 'invented', attempted: false }, error: null } }, { response: { data: null, error: { message: 'missing migration' } } }]) {
    const f = durableStore(options);
    await assert.rejects(f.store.acquire({}), rejectCode('PURCHASE_STORAGE_UNAVAILABLE', 503));
  }
});
