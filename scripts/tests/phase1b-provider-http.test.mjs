import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test, { before, after } from 'node:test';
import ts from 'typescript';

// Real ZernioClient and TelephonyService use real HTTP to Postman's local mock.
// Only the unavailable database/policy/profile mapping and workspace disk are isolated.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profileId = '66a1f0c2a4b9d3e8f1a2b3c4';
const numberId = '66d4e5f6a7b8c9d0e1f2a3b4';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase1b-zernio-http-'));
const logFile = path.join(temp, 'simulation.ndjson');
let simulation, simulationOrigin, simulationOutput = '', simulationErrors = '';

before(async () => {
  const reserve = net.createServer();
  await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
  const port = reserve.address().port;
  await new Promise((resolve) => reserve.close(resolve));
  simulationOrigin = `http://127.0.0.1:${port}/zernio`;
  simulation = spawn('postman', ['simulation', 'run', 'postman/simulations/phase1b-zernio-phone-numbers.sim.yaml',
    '--port', String(port), '--output', 'ndjson', '--no-history'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Postman did not start: ${simulationErrors}`)), 30_000);
    simulation.on('error', (error) => { clearTimeout(timer); reject(error); });
    simulation.on('exit', (code) => { if (!simulationOutput.includes('"event":"listening"')) { clearTimeout(timer); reject(new Error(`Postman exited ${code}: ${simulationErrors}`)); } });
    simulation.stdout.on('data', (chunk) => {
      simulationOutput += chunk;
      fs.writeFileSync(logFile, simulationOutput);
      if (simulationOutput.includes('"event":"listening"')) { clearTimeout(timer); resolve(); }
    });
    simulation.stderr.on('data', (chunk) => { simulationErrors += chunk; });
  });
});

after(async () => {
  if (simulation?.pid) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(simulation.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else simulation.kill('SIGINT');
  }
  fs.writeFileSync(logFile, simulationOutput);
  const requests = simulationOutput.split(/\r?\n/).flatMap((line) => { try { return JSON.parse(line).event === 'request' ? [JSON.parse(line)] : []; } catch { return []; } });
  const providerRequests = requests.filter((entry) => entry.path.startsWith('/api/v1/'));
  assert.ok(providerRequests.length > 0, 'No provider calls reached Postman simulation');
  console.log(`Postman HTTP evidence: ${providerRequests.length} provider requests; log ${logFile}`);
});

async function fixture(scenario = 'success') {
  const response = await fetch(`${simulationOrigin}/__fixture/reset`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }),
  });
  assert.equal(response.status, 200);
}
async function fixtureState() {
  const response = await fetch(`${simulationOrigin}/__fixture/requests`);
  assert.equal(response.status, 200);
  return response.json();
}

function runtime() {
  let writes = 0;
  const intents = new Map();
  const ws = { ownedNumbers: [], callHistory: [], threads: [], connectedAccounts: [], wallet: { balanceUsd: 50 } };
  const policy = { organizationId: 'tenant-a', organizationName: 'Isolated tenant', status: 'active',
    planKey: 'starter', zernioProfileId: profileId, quotas: { maxPhoneNumbers: 10 }, enabledSubServices: ['telephony', 'core_connect'], allowedPlatforms: ['whatsapp'] };
  const sources = Object.fromEntries(Object.entries({ client: 'src/lib/zernio/client.ts',
    telephony: 'src/lib/services/telephony.service.ts', phones: 'src/lib/telephony/phone-numbers.ts', types: 'src/types/telephony.ts' }).map(([key, file]) => [key,
    ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText]));
  const modules = {};
  const context = vm.createContext({ Buffer, URL, Headers, Request, Response, TextEncoder, TextDecoder, Date, console,
    setTimeout, clearTimeout, AbortController, crypto,
    process: { env: { ZERNIO_API_KEY: 'isolated_local_http_token', ZERNIO_BASE_URL: `${simulationOrigin}/api/v1` } },
    fetch: (url, options) => {
      assert.equal(new URL(url).origin, new URL(simulationOrigin).origin, 'Only the local simulation is reachable');
      return fetch(url, options);
    },
  });
  function load(key) {
    if (modules[key]) return modules[key];
    const module = { exports: {} };
    const require = (specifier) => {
      if (specifier === 'crypto') return crypto;
      if (specifier === '@/lib/zernio/client') return load('client');
      if (specifier === '@/types/telephony') return load('types');
      if (specifier === '@/lib/telephony/phone-numbers') return load('phones');
      if (specifier === '@/lib/whatsapp/service') return { WhatsAppService: new Proxy({}, { get: () => () => { throw new Error('Messaging is outside the purchased-number fixture.'); } }) };
      if (specifier === '@/lib/telephony/purchase-intents') return { PurchaseIntentStore: {
        acquire: async (input) => {
          const Exception = load('client').ZernioApiException;
          let row = intents.get(input.intentId);
          if (row && row.fingerprint !== input.fingerprint) throw new Exception({ status: 409, code: 'PURCHASE_INTENT_MISMATCH', error: 'Changed intent' });
          if (row?.locked) throw new Exception({ status: 503, code: 'PURCHASE_IN_PROGRESS', error: 'Concurrent purchase' });
          if (!row && [...intents.values()].some(value => value.state !== 'terminal')) throw new Exception({ status: 409, code: 'PROFILE_PURCHASE_EXISTS', error: 'Resume original intent' });
          if (!row) { row = { state: 'pending', attempted: false, fingerprint: input.fingerprint }; intents.set(input.intentId, row); }
          row.lockToken = input.lockToken; row.locked = true;
          return { ...row };
        },
        update: async (input) => {
          const row = intents.get(input.intentId);
          assert.equal(row.lockToken, input.lockToken);
          Object.assign(row, { state: input.state, attempted: input.attempted, number_id: input.numberId, kyc_url: input.kycUrl, terminal_code: input.terminalCode });
          if (input.release) row.locked = false;
        },
      } };
      if (specifier === '@/lib/zernio/policy-engine') return {
        getFallbackStore: () => ({ globalConfig: {} }), assertSubServiceAllowed: async () => policy,
        resolveEffectiveTenantPolicy: async () => policy,
      };
      if (specifier === '@/lib/services/core-connect.service') return { CoreConnectService: {
        ensureTenantProfile: async (organizationId) => { assert.equal(organizationId, 'tenant-a'); return profileId; },
      } };
      if (specifier === '@/lib/storage/workspace-store') return { WorkspaceStore: {
        getWorkspace: (organizationId) => { assert.equal(organizationId, 'tenant-a'); return ws; },
        saveWorkspace: (organizationId, value) => { assert.equal(organizationId, 'tenant-a'); assert.equal(value, ws); writes++; },
      } };
      throw new Error(`Unexpected dependency in HTTP test: ${specifier}`);
    };
    vm.runInContext(`(function(require,module,exports){\n${sources[key]}\n})`, context)(require, module, module.exports);
    modules[key] = module.exports;
    return module.exports;
  }
  return { client: load('client').zernioClient, Client: load('client').ZernioClient,
    Exception: load('client').ZernioApiException, service: load('telephony').TelephonyService, ws, writes: () => writes };
}

test('real client preserves provider 200 metadata and 202 KYC without inventing a resource', async () => {
  await fixture();
  const s = runtime();
  const success = await s.client.request({ method: 'POST', path: '/phone-numbers/purchase',
    body: { profileId, country: 'US', connectWhatsapp: true, purchaseIntentId: 'client-success' }, idempotencyKey: 'client-success' });
  assert.equal(success.status, 200);
  assert.equal(success.requestId, 'isolated-provider-request');
  assert.equal(success.rateLimitRemaining, 119);
  assert.equal(success.data.phoneNumber.id, numberId);
  const calls = await fixtureState();
  assert.equal(calls.requests[0].body.purchaseIntentId, 'client-success');
  assert.equal(calls.requests[0].idempotencyKey, 'client-success');
  assert.equal(calls.requests[0].contentType, 'application/json');
  await fixture('kyc-required');
  const pending = await s.client.request({ method: 'POST', path: '/phone-numbers/purchase', body: { profileId, country: 'GB', purchaseIntentId: 'client-kyc' } });
  assert.equal(pending.status, 202);
  assert.equal(pending.data.status, 'kyc_required');
  assert.equal(pending.data.phoneNumber, undefined);
  assert.deepEqual(s.ws.ownedNumbers, []);
});

test('real client parses PAYMENT_REQUIRED and PHONE_NUMBER_UNAVAILABLE and never retries purchases automatically', async () => {
  for (const [scenario, status, code] of [['payment-required', 402, 'PAYMENT_REQUIRED'], ['unavailable', 409, 'PHONE_NUMBER_UNAVAILABLE'], ['carrier-unavailable', 503, 'CARRIER_UNAVAILABLE']]) {
    await fixture(scenario);
    const s = runtime();
    await assert.rejects(s.client.request({ method: 'POST', path: '/phone-numbers/purchase', body: { profileId, country: 'US', purchaseIntentId: `client-${scenario}` } }),
      (error) => error instanceof s.Exception && error.envelope.status === status && error.envelope.code === code && error.envelope.requestId === 'isolated-provider-request');
    const state = await fixtureState();
    assert.equal(state.requests.filter((call) => call.method === 'POST').length, 1);
    assert.deepEqual(state.numbers, []);
    assert.equal(s.writes(), 0);
  }
});

test('provider purchaseIntentId retries return the existing number over real HTTP', async () => {
  await fixture();
  const s = runtime();
  const options = { method: 'POST', path: '/phone-numbers/purchase', body: { profileId, country: 'US', purchaseIntentId: 'client-retry' } };
  assert.equal((await s.client.request(options)).data.phoneNumber.id, numberId);
  const retried = await s.client.request(options);
  assert.equal(retried.data.status, 'already_purchased');
  assert.equal(retried.data.numberId, numberId);
  assert.equal(retried.data.phoneNumber, '+14155550100');
  assert.equal(retried.data.profileId, profileId);
  assert.equal((await fixtureState()).numbers.length, 1);
});

const servicePurchase = { organizationId: 'tenant-a', country: 'US', numberType: 'local', phoneNumber: '+14155550100', purchaseIntentId: 'service-intent-0001', wantsSms: true, expectedMonthlyCents: 300 };
async function changeScenario(scenario, activateKyc = false) {
  const response = await fetch(`${simulationOrigin}/__fixture/scenario`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, activateKyc }) });
  assert.equal(response.status, 200);
}

test('legacy telephony keeps real read-only inventory available while purchases require the retail workspace', async () => {
 await fixture('verifying');const s=runtime();const stock=await s.service.searchAvailableNumbers({organizationId:'tenant-a',country:'US',numberType:'local',capabilities:{sms:true,whatsapp:true}});
 assert.equal(stock.results[0].phoneNumber,'+14155550100');assert.equal(stock.results[0].monthlyPriceUsd,3);
 await assert.rejects(s.service.buyPhoneNumber(servicePurchase),error=>error.envelope?.status===501&&error.envelope.code==='RETAIL_QUOTE_REQUIRED');
 const calls=(await fixtureState()).requests;assert.equal(calls.filter(call=>call.pathname.endsWith('/purchase')).length,0);assert.equal(calls.find(call=>call.pathname.endsWith('/available')).query.requireSms,'true');assert.equal(s.ws.wallet.balanceUsd,50);
});

test('legacy purchase cannot bypass customer reservation for any supplier scenario or submitted pricing claim',async()=>{
 for(const scenario of ['success','kyc-required','payment-required','unavailable','carrier-unavailable','foreign-profile']){
  await fixture(scenario);const s=runtime();await assert.rejects(s.service.buyPhoneNumber({...servicePurchase,quoteId:'invented',expectedMonthlyCents:0}),error=>error.envelope?.status===501&&error.envelope.code==='RETAIL_QUOTE_REQUIRED');
  assert.equal((await fixtureState()).requests.length,0);assert.equal(s.ws.ownedNumbers.length,0);assert.equal(s.ws.wallet.balanceUsd,50);
 }
});
