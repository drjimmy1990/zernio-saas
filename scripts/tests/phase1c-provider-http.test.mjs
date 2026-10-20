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

// Actual WhatsApp dispatcher, service, ownership checks and HTTP client run against contract-derived Postman fixtures.
// Policy/profile and the allocation RPC are isolated; the actual paid-send guard runs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profileId = '66a1f0c2a4b9d3e8f1a2b3c4';
const accountId = '66b1f0c2a4b9d3e8f1a2b3c4';
const conversationId = '66c1f0c2a4b9d3e8f1a2b3c4';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase1c-zernio-http-'));
const logFile = path.join(temp, 'simulation.ndjson');
let simulation, simulationOrigin, simulationOutput = '', simulationErrors = '';

before(async () => {
  const reserve = net.createServer();
  await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
  const port = reserve.address().port;
  await new Promise((resolve) => reserve.close(resolve));
  simulationOrigin = `http://127.0.0.1:${port}/zernio`;
  simulation = spawn('postman', ['simulation', 'run', 'postman/simulations/phase1c-zernio-whatsapp.sim.yaml',
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
  const response = await fetch(`${simulationOrigin}/__fixture/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) });
  assert.equal(response.status, 200);
}
async function fixtureState() { return (await fetch(`${simulationOrigin}/__fixture/state`)).json(); }

function runtime() {
  const reservations = new Map();
  const sources = Object.fromEntries(Object.entries({ client: 'src/lib/zernio/client.ts', service: 'src/lib/whatsapp/service.ts',
    paidSend: 'src/lib/saas/send.ts', inboxActions: 'src/lib/inbox/actions.ts', metaService: 'src/lib/meta-inbox/service.ts',
    accounts: 'src/lib/auth/tenant-provider.ts', actions: 'src/lib/whatsapp/actions.ts', broadcasts: 'src/lib/whatsapp/broadcasts.ts', inbox: 'src/lib/services/inbox-crm.service.ts' }).map(([key, file]) => [key,
    ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText]));
  const context = vm.createContext({ Buffer, URL, Request, Response, Headers, TextEncoder, TextDecoder, Date, console, AbortController,
    setTimeout, clearTimeout, process: { env: { ZERNIO_BASE_URL: `${simulationOrigin}/api/v1`, ZERNIO_API_KEY: 'phase1c_mock_key' } },
    fetch: (url, options) => { assert.equal(new URL(url).origin, new URL(simulationOrigin).origin, 'Live provider requests are forbidden'); return fetch(url, options); } });
  const modules = {};
  function load(key) {
    if (modules[key]) return modules[key];
    const module = { exports: {} };
    const require = specifier => {
      if (['crypto', 'node:crypto'].includes(specifier)) return crypto;
      if (specifier === '@/lib/crm/consent') return { assertDestinationConsent: async () => {} }; // Actual consent queries and vetoes are covered in launch CRM/phone tests.
      if (specifier === '@/lib/crm/audience') return { normalizeCrmPhone: value => value };
      if (specifier === '@/lib/saas/send') return load('paidSend');
      if (specifier === './allowance') return { SaasAllowanceService: {
        operationKey: value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'),
        reserveUnits: async input => { const replayed = reservations.has(input.operationKey); reservations.set(input.operationKey, input); return { reservationId: input.operationKey, state: 'reserved', replayed, amountMinor: 10, currency: 'USD' }; },
      } };
      const alias = { '@/lib/inbox/actions': 'inboxActions', '@/lib/meta-inbox/service': 'metaService', '@/lib/zernio/client': 'client', '@/lib/whatsapp/service': 'service', '@/lib/auth/tenant-provider': 'accounts', '@/lib/whatsapp/actions': 'actions', '@/lib/whatsapp/broadcasts': 'broadcasts' }[specifier];
      if (alias) return load(alias);
      if (specifier === '@/lib/auth/tenant-access') return { TenantAccessError: class extends Error { constructor(status, message) { super(message); this.status = status; } } };
      if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => { throw new Error('Unexpected legacy broadcast database effect'); } };
      if (specifier === '@/lib/services/core-connect.service') return { CoreConnectService: { ensureTenantProfile: async org => { assert.equal(org, 'tenant-a'); return profileId; } } };
      if (specifier === '@/lib/zernio/policy-engine') return { getFallbackStore: () => ({ globalConfig: {} }), assertSubServiceAllowed: async org => { assert.equal(org, 'tenant-a'); return { organizationId: org, zernioProfileId: profileId, status: 'active' }; } };
      throw new Error(`Unexpected HTTP test dependency: ${specifier}`);
    };
    vm.runInContext(`(function(require,module,exports){\n${sources[key]}\n})`, context)(require, module, module.exports);
    modules[key] = module.exports; return module.exports;
  }
  return { service: load('service').WhatsAppService, broadcasts: load('broadcasts').WhatsAppBroadcastService, inbox: load('inbox').InboxCrmService, client: load('client').zernioClient, Exception: load('client').ZernioApiException,
    action: (action, input = {}) => load('actions').runWhatsAppAction('tenant-a', action, input) };
}

test('actual WhatsApp reads use verified profile and account over HTTP', async () => {
  await fixture(); const s = runtime();
  const accounts = await s.action('accounts'); assert.equal(accounts.accounts.length, 1); assert.equal(accounts.accounts[0].accountId, accountId);
  const conversations = await s.action('conversations', { accountId }); assert.equal(conversations.data[0].id, conversationId);
  const state = await fixtureState(); const call = state.requests.find(item => item.path === '/inbox/conversations');
  assert.equal(call.query.profileId, profileId); assert.equal(call.query.accountId, accountId); assert.equal(call.query.platform, 'whatsapp');
});

test('text send reserves once and repeat intent is blocked, with sent status from subsequent read', async () => {
  await fixture(); const s = runtime(); const input = { accountId, conversationId, text: 'Order ready', idempotencyKey: 'same-message' };
  const first = await s.action('send', input);
  await assert.rejects(s.action('send', input), error => error.envelope?.status === 409 && Boolean(error.envelope.details.reservationId));
  assert.ok(first.data.messageId); assert.equal(first.status, undefined); assert.equal(first.readReceipt, undefined);
  const messages = await s.action('messages', { accountId, conversationId }); assert.equal(messages.messages.length, 2);
  assert.equal(messages.messages[1].deliveryStatus, 'sent'); assert.equal(messages.messages[1].message, 'Order ready');
  assert.equal((await fixtureState()).messages.length, 2);
});

test('media and new-recipient templates use their distinct provider request contracts', async () => {
  await fixture(); const s = runtime();
  await s.action('send', { accountId, conversationId, attachmentUrl: 'https://example.invalid/order.png', attachmentType: 'image', idempotencyKey: 'media' });
  await s.action('send', { accountId, recipient: '+14155550102', templateName: 'order_update', templateLanguage: 'en_US', templateParams: ['123'], idempotencyKey: 'template' });
  const calls = (await fixtureState()).requests.filter(item => item.method === 'POST');
  assert.equal(calls[0].body.attachmentUrl, 'https://example.invalid/order.png'); assert.equal(calls[0].body.attachmentType, 'image');
  assert.equal(calls[1].path, '/inbox/conversations'); assert.equal(calls[1].body.participantId, '14155550102');
  assert.equal(calls[1].body.templateName, 'order_update'); assert.deepEqual(calls[1].body.templateParams, ['123']);
});

test('provider window, template and outage errors never create successful local messages', async () => {
  for (const [scenario, status, code] of [['window-closed', 400, 'TEMPLATE_REQUIRED'], ['template-rejected', 400, 'TEMPLATE_NOT_APPROVED'], ['provider-unavailable', 503, 'UPSTREAM_FAILED']]) {
    await fixture(scenario); const s = runtime();
    await assert.rejects(s.action('send', { accountId, conversationId, text: 'hello', idempotencyKey: scenario }), error => error.envelope?.status === status && error.envelope?.code === code);
    assert.equal((await fixtureState()).messages.length, 1);
  }
});

test('foreign conversation identity is rejected before any send', async () => {
  await fixture('foreign-conversation'); const s = runtime();
  await assert.rejects(s.action('send', { accountId, conversationId, text: 'hello', idempotencyKey: 'foreign' }), error => error.envelope?.status === 404);
  assert.equal((await fixtureState()).requests.filter(item => item.method === 'POST').length, 0);
});

test('custom template creation remains pending and lists actual provider state', async () => {
  await fixture(); const s = runtime();
  const created = await s.action('create_template', { accountId, name: 'new_update', language: 'en_US', category: 'UTILITY', components: [{ type: 'BODY', text: 'Update' }], idempotencyKey: 'template-create' });
  assert.equal(created.template.status, 'PENDING');
  const listed = await s.action('templates', { accountId }); assert.equal(listed.templates.find(item => item.name === 'new_update').status, 'PENDING');
});

test('a successful HTTP response without a message identity is not accepted as a send', async () => {
  await fixture('malformed-send'); const s = runtime();
  await assert.rejects(s.action('send', { accountId, conversationId, text: 'hello', idempotencyKey: 'malformed' }), error => error.envelope?.status === 502);
});

test('HTTP timeout is an explicit error with no automatic send retry', async () => {
  await fixture('timeout'); const s = runtime();
  await assert.rejects(s.client.request({ method: 'POST', path: `/inbox/conversations/${conversationId}/messages`, body: { accountId, message: 'timeout' }, idempotencyKey: 'timeout', timeoutMs: 15 }), error => error.envelope?.status === 504 && error.envelope.code === 'PROVIDER_TIMEOUT');
  assert.equal((await fixtureState()).requests.filter(item => item.method === 'POST').length, 1);
});

test('invalid message inputs and missing retry keys never reach provider mutations', async () => {
  await fixture(); const s = runtime();
  for (const input of [
    { conversationId, text: 'hello' },
    { recipient: 14155550101, text: 'hello', idempotencyKey: 'invalid-recipient' },
    { recipient: '+14155550101', templateName: 'order_update', templateLanguage: 'en_US', templateParams: [123], idempotencyKey: 'invalid-params' },
  ]) await assert.rejects(s.action('send', { accountId, ...input }), error => error.envelope?.status === 400);
  await assert.rejects(s.action('create_broadcast', { accountId, name: 'Missing retry key', template: { name: 'order_update', language: 'en_US' } }), error => error.envelope?.status === 400);
  assert.equal((await fixtureState()).requests.filter(item => item.method === 'POST').length, 0);
});

test('actual HTTP broadcast draft, recipients and dispatch use provider state and stable retry keys', async () => {
  await fixture(); const s = runtime();
  const input = { accountId, name: 'Order update', template: { name: 'order_update', language: 'en_US' }, idempotencyKey: 'draft-1', profileId: 'foreign-profile' };
  const first = await s.action('create_broadcast', input);
  const repeated = await s.action('create_broadcast', input);
  assert.equal(first.broadcast.id, repeated.broadcast.id); assert.equal(first.broadcast.status, 'draft');
  const draft = { accountId, broadcastId: first.broadcast.id };
  const recipients = { ...draft, phones: ['+14155550101', '14155550101', '+14155550102'] };
  const added = await s.action('add_broadcast_recipients', recipients);
  const retry = await s.action('add_broadcast_recipients', recipients);
  assert.equal(added.added, 2); assert.equal(retry.added, 2);
  await assert.rejects(s.action('send_broadcast', draft), error => error.status === 409);
  // Low-level provider contract still works; public dispatch must use reviewed campaigns.
  const sent = await s.broadcasts.send({ organizationId: 'tenant-a', ...draft });
  assert.equal(sent.status, 'sending'); assert.equal(sent.sent, 0); assert.equal(sent.recipientCount, 2);
  const current = await s.action('get_broadcast', draft); assert.equal(current.broadcast.status, 'sending');
  await assert.rejects(s.broadcasts.send({ organizationId: 'tenant-a', ...draft }), error => error.envelope?.status === 400);
  const listed = await s.action('broadcasts', { accountId }); assert.equal(listed.broadcasts.length, 1);
  const state = await fixtureState(); assert.equal(state.dispatches, 1);
  const mutations = state.requests.filter(item => item.method === 'POST');
  assert.equal(mutations[0].body.profileId, profileId);
  assert.match(mutations[0].idempotencyKey, /^asra3-bc-[a-f0-9]{64}$/);
  assert.equal(mutations[0].idempotencyKey, mutations[1].idempotencyKey);
  assert.equal(mutations[2].idempotencyKey, mutations[3].idempotencyKey);
  assert.deepEqual(mutations[2].body, { phones: ['14155550101', '14155550102'], useSegment: false });
});

test('foreign broadcast is rejected before recipient addition or dispatch over HTTP', async () => {
  await fixture(); const s = runtime();
  const created = await s.action('create_broadcast', { accountId, name: 'Order update', template: { name: 'order_update', language: 'en_US' }, idempotencyKey: 'draft-foreign' });
  await fetch(`${simulationOrigin}/__fixture/scenario`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: 'foreign-broadcast' }) });
  await assert.rejects(s.action('add_broadcast_recipients', { accountId, broadcastId: created.broadcast.id, phones: ['+14155550101'] }), error => error.envelope?.status === 404);
  await assert.rejects(s.broadcasts.send({ organizationId: 'tenant-a', accountId, broadcastId: created.broadcast.id }), error => error.envelope?.status === 404);
  assert.equal((await fixtureState()).requests.filter(item => item.method === 'POST').length, 1);
});

test('legacy automation broadcast cannot simulate success or bypass the reviewed draft flow', async () => {
  await fixture(); const s = runtime();
  await assert.rejects(s.inbox.createGrowthAutomation({ organizationId: 'tenant-a', type: 'broadcast', name: 'Legacy', config: { profileId: 'foreign-profile' } }), error => error.envelope?.status === 410);
  assert.equal((await fixtureState()).requests.length, 0);
});
