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
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profileId = '66a1f0c2a4b9d3e8f1a2b3c4', FB = '66b1f0c2a4b9d3e8f1a2b3c4', IG = '66b1f0c2a4b9d3e8f1a2b3c5', IG_PAGE = '66b1f0c2a4b9d3e8f1a2b3c6';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase2b-settings-')), logFile = path.join(temp, 'simulation.ndjson');
let simulation, origin, output = '', errors = '';
before(async () => {
 const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve)); const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve)); origin = `http://127.0.0.1:${port}/zernio`;
 simulation = spawn('postman', ['simulation', 'run', 'postman/simulations/phase2b-zernio-meta-settings.sim.yaml', '--port', String(port), '--output', 'ndjson', '--no-history'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
 await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(errors || 'Simulation startup timed out')), 30000);
 simulation.on('error', error => { clearTimeout(timer); reject(error); }); simulation.on('exit', code => { if (!output.includes('"event":"listening"')) { clearTimeout(timer); reject(new Error(`Simulation exited ${code}: ${errors}`)); } });
 simulation.stdout.on('data', chunk => { output += chunk; fs.writeFileSync(logFile, output); if (output.includes('"event":"listening"')) { clearTimeout(timer); resolve(); } }); simulation.stderr.on('data', chunk => { errors += chunk; }); });
});
after(() => {
 if (simulation?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(simulation.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else simulation.kill('SIGINT'); }
 fs.writeFileSync(logFile, output); const requests = output.split(/\r?\n/).flatMap(line => { try { const item = JSON.parse(line); return item.event === 'request' && item.path.startsWith('/api/v1/') ? [item] : []; } catch { return []; } }); assert.ok(requests.length); console.log(`Postman settings HTTP evidence: ${requests.length} provider requests; log ${logFile}`);
});
async function fixture(scenario = 'success', seed = {}) { assert.equal((await fetch(`${origin}/__fixture/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, seed }) })).status, 200); }
async function state() { return (await fetch(`${origin}/__fixture/state`)).json(); }
function runtime(platforms = ['facebook', 'instagram'], inbox = false) {
 const files = { client: 'src/lib/zernio/client.ts', service: 'src/lib/meta-settings/service.ts', inbox: 'src/lib/meta-inbox/service.ts', core: 'src/lib/services/core-connect.service.ts', accounts: 'src/lib/auth/tenant-provider.ts', lifecycle: 'src/lib/accounts/lifecycle.ts' };
 const sources = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText]));
 const context = vm.createContext({ Buffer, URL, Request, Response, Headers, TextEncoder, TextDecoder, Date, Intl, Set, console, AbortController, setTimeout, clearTimeout,
 process: { env: { ZERNIO_BASE_URL: `${origin}/api/v1`, ZERNIO_API_KEY: 'phase2b_mock_key' } }, fetch: (url, options) => { assert.equal(new URL(url).origin, new URL(origin).origin, 'Live network forbidden'); return fetch(url, options); } });
 const cache = {};
 function load(name) {
  if (cache[name]) return cache[name]; const module = { exports: {} }; cache[name] = module.exports;
  const require = specifier => {
   if (specifier === '@/lib/billing/connections') return { reserveConnectionCapacity: async () => {} }; // Private-beta fixture; commercial capacity has dedicated SQL/HTTP coverage.
   if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
   const alias = { '@/lib/zernio/client': 'client', '@/lib/meta-settings/service': 'service', '@/lib/meta-inbox/service': 'inbox', '@/lib/services/core-connect.service': 'core', '@/lib/auth/tenant-provider': 'accounts', '@/lib/accounts/lifecycle': 'lifecycle' }[specifier]; if (alias) return load(alias);
   if (specifier === '@/lib/auth/tenant-access') return { TenantAccessError: class extends Error { constructor(status, message) { super(message); this.status = status; } } };
   if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => null };
   if (specifier === '@/lib/storage/workspace-store') return { WorkspaceStore: { getWorkspace: () => ({ connectedAccounts: [] }), removeConnectedAccount: () => {} } };
   if (specifier === '@/lib/zernio/policy-engine') return { getFallbackStore: () => ({ globalConfig: {}, tenants: {} }), assertSubServiceAllowed: async org => ({ organizationId: org, organizationName: org, zernioProfileId: org === 'tenant-b' ? '77a1f0c2a4b9d3e8f1a2b3c4' : profileId, allowedPlatforms: platforms, quotas: { maxConnectedAccounts: 10 } }), resolveConnectScopesParam: () => '' };
   throw new Error(`Unexpected dependency ${specifier}`);
  };
  vm.runInContext(`(function(require,module,exports){${sources[name]}\n})`, context)(require, module, module.exports); return module.exports;
 }
 return inbox ? load('inbox').MetaInboxService : load('service').MetaSettingsService;
}
const params = (setting = 'messenger-greeting', accountId = FB) => ({ organizationId: 'tenant-a', accountId, setting });
const value = { greeting: [{ locale: 'default', text: 'Welcome {{user_first_name}}' }, { locale: 'ar_AR', text: 'مرحباً' }] };
const menu = { persistent_menu: [{ locale: 'default', composer_input_disabled: false, call_to_actions: [{ type: 'postback', title: 'Help', payload: 'HELP' }, { type: 'web_url', title: 'Website', url: 'https://example.invalid/help' }, { type: 'nested', title: 'More', call_to_actions: [{ type: 'postback', title: 'Hours', payload: 'HOURS' }] }] }] };
const control = (accountId = FB) => ({ organizationId: 'tenant-a', accountId, conversationId: 'thread-1', action: 'take' });
const status = expected => error => (error.envelope?.status || error.status) === expected;

test('canonical metadata determines Instagram control capabilities and top-level lookalikes are ignored', async () => {
 await fixture('spoof-login');
 const accounts = await runtime(undefined, true).listAccounts('tenant-a');
 assert.equal(accounts.accounts.find(account => account.accountId === IG_PAGE).loginMethod, 'facebook_login');
 assert.equal(accounts.accounts.find(account => account.accountId === IG).loginMethod, 'instagram_login');
 await assert.rejects(runtime().threadControl(control(IG)), status(400));
 assert.equal((await state()).requests.some(call => call.method === 'POST'), false);
 assert.equal((await runtime().threadControl(control(IG_PAGE))).confirmed, true);
});
test('SDK settings save/read/delete preserve exact locale and menu shapes over actual client HTTP', async () => {
 await fixture(); const service = runtime();
 for (const [setting, accountId, body] of [['messenger-greeting', FB, value], ['messenger-menu', FB, menu], ['messenger-ice-breakers', FB, { ice_breakers: [{ locale: 'default', call_to_actions: [{ question: 'Hours?', payload: 'HOURS' }] }] }], ['instagram-ice-breakers', IG, { ice_breakers: [{ question: 'Hours?', payload: 'HOURS' }] }]]) {
  const input = params(setting, accountId); assert.equal((await service.setSetting({ ...input, value: body })).httpStatus, 200);
  const read = await service.getSetting(input); assert.deepEqual(JSON.parse(JSON.stringify(read.data)), Object.values(body)[0]);
  assert.equal((await service.deleteSetting(input)).success, true); assert.equal((await service.getSetting(input)).data.length, 0);
 }
 const calls = (await state()).requests.filter(call => call.method === 'PUT'); assert.equal(calls.length, 4); assert.ok(calls.every(call => !call.body.accountId && !call.body.profileId)); assert.deepEqual(calls[0].body, value);
});
test('SDK/Graph reads and explicit Graph mutation acknowledgement preserve provider fields', async () => {
 for (const scenario of ['graph-wrapper', 'graph-ack']) { await fixture(scenario); const service = runtime(); await service.setSetting({ ...params(), value }); const result = await service.getSetting(params()); assert.ok(Array.isArray(result.data)); if (scenario === 'graph-wrapper') { assert.deepEqual(JSON.parse(JSON.stringify(result.data[0].greeting)), value.greeting); await service.deleteSetting(params()); assert.equal((await service.getSetting(params())).data[0].greeting.length, 0); } }
 await fixture('ig-locale'); assert.equal((await runtime().getSetting(params('instagram-ice-breakers', IG))).data[0].call_to_actions[0].question, 'Hours?');
});
test('foreign/cross-tenant/inactive/reconnect/wrong-platform/disabled-plan cannot mutate', async () => {
 for (const [scenario, patch, expected, platforms] of [['success', { accountId: 'foreign' }, 403], ['success', { organizationId: 'tenant-b' }, 403], ['inactive', {}, 409], ['reconnect', {}, 409], ['success', { accountId: IG }, 400], ['success', { accountId: 'whatsapp' }, 400], ['success', {}, 403, ['instagram']]]) {
  await fixture(scenario); await assert.rejects(runtime(platforms).setSetting({ ...params(), ...patch, value }), status(expected)); assert.equal((await state()).requests.some(call => call.method !== 'GET'), false);
 }
 await fixture('inactive'); await assert.rejects(runtime().getSetting(params()), status(409));
});
test('invalid menu/locale/questions/body fields are rejected before provider mutations', async () => {
 await fixture(); const service = runtime();
 for (const body of [{ greeting: [{ locale: 'en_US', text: 'Hi' }] }, { greeting: [{ locale: 'default', text: 'a'.repeat(161) }] }, { greeting: [{ locale: 'default', text: 'Hi' }, { locale: 'default', text: 'Hi' }] }, { ...value, profileId: 'foreign' }, { greeting: [{ locale: 'en-US', text: 'Hi' }] }]) await assert.rejects(service.setSetting({ ...params(), value: body }), status(400));
 for (const actions of [Array(4).fill({ type: 'postback', title: 'Help', payload: 'HELP' }), [{ type: 'nested', title: 'More', call_to_actions: Array(6).fill({ type: 'postback', title: 'Help', payload: 'HELP' }) }], [{ type: 'web_url', title: 'Help', url: 'javascript:alert(1)' }], [{ type: 'postback', title: 'Help', payload: 'HELP', accountId: 'foreign' }]]) await assert.rejects(service.setSetting({ ...params('messenger-menu'), value: { persistent_menu: [{ locale: 'default', composer_input_disabled: false, call_to_actions: actions }] } }), status(400));
 for (const questions of [Array(5).fill({ question: 'Hours?', payload: 'HOURS' }), [{ question: 'a'.repeat(81), payload: 'HOURS' }], [{ question: 'Hours?', payload: '' }]]) await assert.rejects(service.setSetting({ ...params('instagram-ice-breakers', IG), value: { ice_breakers: questions } }), status(400));
 await assert.rejects(service.getSetting(params('toString')), status(400));
 assert.equal((await state()).requests.length, 0);
});
test('provider 403/429/503 and malformed settings preserve errors and do not report success', async () => {
 for (const [scenario, expected] of [['permission-denied',403],['rate-limit',429],['unavailable',503],['malformed',502],['html',502]]) {
  await fixture(scenario); await assert.rejects(runtime().setSetting({ ...params(), value }), error => status(expected)(error) && (expected < 500 || error.envelope.details.reconcileBeforeRetry === true));
  const calls = (await state()).requests.filter(call => call.method === 'PUT'); assert.equal(calls.length, 1);
 }
 await fixture('permission-denied'); await assert.rejects(runtime().deleteSetting(params()), error => error.envelope.platformError.code === 10 && error.envelope.details.requiredPermission === 'pages_messaging');
 await fixture('get-started-missing'); await assert.rejects(runtime().setSetting({ ...params('messenger-menu'), value: menu }), error => error.envelope.code === 'get_started_required');
 await fixture('malformed-read'); await assert.rejects(runtime().getSetting(params()), status(502));
});
test('thread controls verify canonical owned conversations; pass requires explicit app and never sends browser profile claims', async () => {
 await fixture(); const service = runtime(); await assert.rejects(service.threadControl({ ...control(), action: 'pass' }), status(400)); assert.equal((await state()).requests.length, 0);
 for (const scenario of ['foreign-thread', 'wrong-thread-id']) { await fixture(scenario); await assert.rejects(service.threadControl(control()), status(404)); assert.equal((await state()).requests.filter(call => call.method === 'POST').length, 0); }
 await fixture(); const result = await service.threadControl({ ...control(), action: 'pass', targetAppId: '263902037430900', metadata: 'Operator review' }); assert.equal(result.confirmed, true); assert.equal(result.control.ownerAppId, '263902037430900'); assert.equal(result.conversation.threadControl, 'other');
 const calls = (await state()).requests; assert.equal(calls.filter(call => call.path.endsWith('/thread-control')).length, 1); assert.equal(calls.filter(call => call.path === '/inbox/conversations/thread-1').length, 2); assert.deepEqual(calls.find(call => call.method === 'POST').body, { accountId: FB, action: 'pass', targetAppId: '263902037430900', metadata: 'Operator review' });
});
test('Instagram Login take/request refuse, Facebook Login works; primary receiver denial remains provider authority', async () => {
 await fixture(); const service = runtime(); for (const action of ['take','request']) await assert.rejects(service.threadControl({ ...control(IG), action }), error => error.envelope.code === 'platform_not_supported'); assert.equal((await state()).requests.filter(call => call.method === 'POST').length, 0);
 await fixture('absent-login'); for (const action of ['take','request']) await assert.rejects(service.threadControl({ ...control(IG), action }), error => error.envelope.code === 'platform_not_supported'); assert.equal((await state()).requests.filter(call => call.method === 'POST').length, 0);
 await fixture(); assert.equal((await service.threadControl(control(IG_PAGE))).confirmed, true);
 await fixture('not-primary'); await assert.rejects(service.threadControl(control()), error => error.envelope.status === 403 && error.envelope.code === 'not_primary_receiver');
});
test('request remains pending, unknown owner/ack without control remain inconclusive, take/release use canonical evidence', async () => {
 await fixture(); let result = await runtime().threadControl({ ...control(), action: 'request' }); assert.equal(result.pending, true); assert.equal(result.confirmed, false); assert.equal(result.conversation.threadControl, 'other');
 for (const scenario of ['unknown-owner', 'ack-no-control', 'unchanged-owner']) { await fixture(scenario); result = await runtime().threadControl(control()); assert.equal(result.pending, true); assert.equal(result.confirmed, false); }
 for (const action of ['take','release']) { await fixture(); result = await runtime().threadControl({ ...control(), action }); assert.equal(result.confirmed, true); assert.equal(result.conversation.threadControl, action === 'take' ? 'app' : 'other'); }
});
test('thread-control 403/429/503/malformed/failed canonical read retain error uncertainty without fake ownership', async () => {
 for (const [scenario, expected] of [['permission-denied',403],['rate-limit',429],['unavailable',503],['malformed',502],['malformed-control',502],['post-read-error',503]]) {
  await fixture(scenario); await assert.rejects(runtime().threadControl(control()), error => status(expected)(error) && (expected < 500 || error.envelope.details.reconcileBeforeRetry === true));
  assert.equal((await state()).requests.filter(call => call.method === 'POST').length, 1);
 }
});
