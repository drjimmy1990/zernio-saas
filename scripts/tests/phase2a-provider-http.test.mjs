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
const profileId = '66a1f0c2a4b9d3e8f1a2b3c4', accountId = '66b1f0c2a4b9d3e8f1a2b3c4';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase2a-http-')), logFile = path.join(temp, 'simulation.ndjson');
let simulation, origin, output = '', errors = '';
before(async () => {
 const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve)); const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
 origin = `http://127.0.0.1:${port}/zernio`;
 simulation = spawn('postman', ['simulation', 'run', 'postman/simulations/phase2a-zernio-meta-inbox.sim.yaml', '--port', String(port), '--output', 'ndjson', '--no-history'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
 await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(errors || 'Simulation startup timed out')), 30000);
 simulation.on('error', error => { clearTimeout(timer); reject(error); }); simulation.on('exit', code => { if (!output.includes('"event":"listening"')) { clearTimeout(timer); reject(new Error(`Simulation exited ${code}: ${errors}`)); } });
 simulation.stdout.on('data', chunk => { output += chunk; fs.writeFileSync(logFile, output); if (output.includes('"event":"listening"')) { clearTimeout(timer); resolve(); } }); simulation.stderr.on('data', chunk => { errors += chunk; }); });
});
after(() => { if (simulation?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(simulation.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else simulation.kill('SIGINT'); }
 fs.writeFileSync(logFile, output); const requests = output.split(/\r?\n/).flatMap(line => { try { const item = JSON.parse(line); return item.event === 'request' && item.path.startsWith('/api/v1/') ? [item] : []; } catch { return []; } }); assert.ok(requests.length); console.log(`Postman HTTP evidence: ${requests.length} provider requests; log ${logFile}`); });
async function fixture(scenario = 'success') { assert.equal((await fetch(`${origin}/__fixture/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) })).status, 200); }
async function state() { return (await fetch(`${origin}/__fixture/state`)).json(); }
function runtime() {
 const files = { client: 'src/lib/zernio/client.ts', publishing: 'src/lib/meta-inbox/service.ts', core: 'src/lib/services/core-connect.service.ts', accounts: 'src/lib/auth/tenant-provider.ts', lifecycle: 'src/lib/accounts/lifecycle.ts' };
 const sources = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText]));
 const context = vm.createContext({ Buffer, URL, Request, Response, Headers, TextEncoder, TextDecoder, Date, Intl, Set, console, AbortController, setTimeout, clearTimeout,
 process: { env: { ZERNIO_BASE_URL: `${origin}/api/v1`, ZERNIO_API_KEY: 'phase2a_mock_key' } },
 fetch: (url, options) => { assert.equal(new URL(url).origin, new URL(origin).origin, 'Live network forbidden'); return fetch(url, options); } });
 const cache = {}, removed = [];
 function load(name) {
  if (cache[name]) return cache[name];
  const module = { exports: {} }; cache[name] = module.exports; // cycles Core -> lifecycle -> ownership -> Core
  const require = specifier => {
   if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
   const alias = { '@/lib/zernio/client': 'client', '@/lib/meta-inbox/service': 'publishing', '@/lib/services/core-connect.service': 'core', '@/lib/auth/tenant-provider': 'accounts', '@/lib/accounts/lifecycle': 'lifecycle' }[specifier]; if (alias) return load(alias);
   if (specifier === '@/lib/auth/tenant-access') return { TenantAccessError: class extends Error { constructor(status, message) { super(message); this.status = status; } } };
   if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => null };
   if (specifier === '@/lib/storage/workspace-store') return { WorkspaceStore: { getWorkspace: () => ({ connectedAccounts: [] }), removeConnectedAccount: (...args) => removed.push(args) } };
   if (specifier === '@/lib/zernio/policy-engine') return { getFallbackStore: () => ({ globalConfig: {}, tenants: {} }), assertSubServiceAllowed: async org => ({ organizationId: org, organizationName: org, zernioProfileId: org === 'tenant-b' ? '77a1f0c2a4b9d3e8f1a2b3c4' : profileId, allowedPlatforms: ['facebook', 'instagram'], quotas: { maxConnectedAccounts: 10 } }), resolveConnectScopesParam: () => '' };
   throw new Error(`Unexpected dependency ${specifier}`);
  };
  vm.runInContext(`(function(require,module,exports){${sources[name]}\n})`, context)(require, module, module.exports); return module.exports;
 }
 return { service: load('publishing').MetaInboxService, core: load('core').CoreConnectService, lifecycle: load('lifecycle'), removed };
}
const input = () => ({ organizationId: 'tenant-a', content: 'HTTP draft', platforms: [{ platform: 'facebook', accountId, platformSpecificData: { facebookSettings: { draft: false } } }], idempotencyKey: 'draft-one' });

test('Facebook and Instagram Page selectors send OAuth tokens in headers over real HTTP', async () => {
 for (const [step, path] of [['select_page', '/connect/facebook/select-page'], ['select_account', '/connect/instagram/select-account']]) {
  await fixture();
  const result = await runtime().core.listHeadlessSelectableEntities({ organizationId: 'tenant-a', step, tempToken: 'isolated-meta-token', connectToken: 'isolated-connect-token' });
  assert.equal(result.raw.pages[0].id, 'page-a');
  assert.equal(result.raw.truncated, true);
  const calls = (await state()).requests, call = calls.find(c => c.path === path);
  assert.deepEqual(call.query, { profileId });
  assert.equal(call.tempToken, 'isolated-meta-token');
  assert.equal(call.connectToken, 'isolated-connect-token');
  assert.equal(calls.some(c => c.method !== 'GET'), false);
 }
});

test('Meta canonical conversations/messages use verified account/profile and opaque ID', async () => {
 await fixture(); const { service } = runtime(); const params = { organizationId: 'tenant-a', accountId, conversationId: 'opaque-thread-1' };
 const list = await service.listConversations(params); assert.equal(list.data[0].platform, 'facebook'); assert.deepEqual(JSON.parse(JSON.stringify(list.meta.failedAccounts)), []);
 const messages = await service.listMessages(params); assert.equal(messages.messages[0].direction, 'incoming'); const calls = (await state()).requests; assert.equal(calls.find(c => c.path === '/inbox/conversations').query.profileId, profileId);
});
test('Facebook and Instagram text/media send use explicit intent and actual provider message identity', async () => {
 for (const target of [accountId, '66b1f0c2a4b9d3e8f1a2b3c5']) { await fixture(); const { service } = runtime(); const params = { organizationId: 'tenant-a', accountId: target, conversationId: 'opaque-thread-1', text: 'Reply', idempotencyKey: 'intent-one' };
 const first = await service.sendMessage(params), replay = await service.sendMessage(params); assert.equal(first.data.messageId, replay.data.messageId); assert.equal(first.data.conversationId, 'stored-different-id'); assert.equal((await state()).messages.length, 2);
 await service.sendMessage({ ...params, text: undefined, idempotencyKey: 'media', attachments: [{ type: 'image', url: 'https://example.invalid/image.png' }] }); assert.equal((await state()).requests.filter(c => c.method === 'POST').at(-1).body.attachmentType, 'image'); }
});
test('foreign account/thread, inactive account and other thread owner cannot send', async () => {
 for (const [scenario, expected] of [['foreign-thread',404],['inactive',409],['other-owner',409]]) { await fixture(scenario); const { service } = runtime(); await assert.rejects(service.sendMessage({ organizationId:'tenant-a',accountId,conversationId:'opaque-thread-1',text:'Reply',idempotencyKey:'key' }), e => e.envelope?.status === expected); assert.equal((await state()).requests.filter(c => c.method === 'POST').length,0); }
});
test('provider window denial and ambiguous failure preserve uncertainty without fake local success', async () => {
 for (const [scenario,status] of [['window-closed',400],['unavailable',503],['malformed',502]]) { await fixture(scenario); const { service } = runtime(); await assert.rejects(service.sendMessage({organizationId:'tenant-a',accountId,conversationId:'opaque-thread-1',text:'Reply',idempotencyKey:'key'}), e => e.envelope?.status === status && (status < 500 || e.envelope.details.reconcileBeforeRetry === true)); assert.equal((await state()).messages.length,1); }
});
test('mark read is separate; request acceptance requires reviewed text', async () => {
 await fixture(); const { service } = runtime(), params = { organizationId:'tenant-a',accountId,conversationId:'opaque-thread-1' };
 const read = await service.markRead(params); assert.equal(read.markedCount,1); await assert.rejects(service.acceptRequest({...params,idempotencyKey:'accept'}),e=>e.envelope?.status===400);
 const accepted = await service.acceptRequest({...params,text:'Reviewed reply',idempotencyKey:'accept'}); assert.equal(accepted.data.messageId,'meta-1');
});
test('tags are explicit and Instagram rejects non HUMAN_AGENT', async () => {
 await fixture(); const {service}=runtime(); const params={organizationId:'tenant-a',accountId:'66b1f0c2a4b9d3e8f1a2b3c5',conversationId:'opaque-thread-1',text:'Reply',idempotencyKey:'key'};
 for(const patch of [{messageTag:'HUMAN_AGENT'},{messageTag:'ACCOUNT_UPDATE',messagingType:'MESSAGE_TAG'}]) await assert.rejects(service.sendMessage({...params,...patch}),e=>e.envelope?.status===400);
 assert.equal((await state()).requests.filter(c=>c.method==='POST').length,0);
});
test('200 media partialFailure stays canonical and successful intent replay does not resend attachment', async () => {
 await fixture('partial-media'); const { service } = runtime(); const params = { organizationId:'tenant-a',accountId,conversationId:'opaque-thread-1',text:'Follow-up',attachments:[{type:'image',url:'https://example.invalid/image.png'}],idempotencyKey:'partial-key' };
 const result = await service.sendMessage(params); assert.equal(result.httpStatus,200); assert.equal(result.data.partialFailure.part,'text'); assert.equal(result.data.partialFailure.platformError.code,10); assert.equal(result.data.messageIds[0],result.data.messageId);
 const replay=await service.sendMessage(params); assert.equal(replay.data.messageId,result.data.messageId); assert.equal((await state()).messages.length,2);
});
test('actual client 403 fails once and short429 retries retain exact key/body', async () => {
 const params={organizationId:'tenant-a',accountId,conversationId:'opaque-thread-1',text:'Reply',idempotencyKey:'rate-key'};
 await fixture('permission-denied'); await assert.rejects(runtime().service.sendMessage(params),e=>e.envelope?.status===403); assert.equal((await state()).requests.filter(c=>c.method==='POST').length,1);
 await fixture('rate-limit'); const sent=await runtime().service.sendMessage(params); assert.ok(sent.data.messageId); const calls=(await state()).requests.filter(c=>c.method==='POST'); assert.equal(calls.length,3); assert.equal(new Set(calls.map(c=>c.idempotencyKey)).size,1); assert.equal(new Set(calls.map(c=>JSON.stringify(c.body))).size,1); assert.equal((await state()).messages.length,2);
});
test('direct Instagram request folder refusal and foreign profile account fail without mutation', async () => {
 await fixture(); const {service}=runtime(); await assert.rejects(service.listConversations({organizationId:'tenant-a',accountId:'66b1f0c2a4b9d3e8f1a2b3c5',folder:'requests'}),e=>e.envelope?.status===400&&e.envelope.code==='PLATFORM_LIMITATION');
 await fixture(); await assert.rejects(service.sendMessage({organizationId:'tenant-a',accountId:'foreign',conversationId:'opaque-thread-1',text:'Reply',idempotencyKey:'foreign'}),e=>e.status===403);
 assert.equal((await state()).requests.some(c=>c.path.startsWith('/inbox/')),false);
});
