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
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase1d-http-')), logFile = path.join(temp, 'simulation.ndjson');
let simulation, origin, output = '', errors = '';
before(async () => {
 const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve)); const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
 origin = `http://127.0.0.1:${port}/zernio`;
 simulation = spawn('postman', ['simulation', 'run', 'postman/simulations/phase1d-zernio-facebook.sim.yaml', '--port', String(port), '--output', 'ndjson', '--no-history'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
 await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(errors || 'Simulation startup timed out')), 30000);
 simulation.on('error', error => { clearTimeout(timer); reject(error); }); simulation.on('exit', code => { if (!output.includes('"event":"listening"')) { clearTimeout(timer); reject(new Error(`Simulation exited ${code}: ${errors}`)); } });
 simulation.stdout.on('data', chunk => { output += chunk; fs.writeFileSync(logFile, output); if (output.includes('"event":"listening"')) { clearTimeout(timer); resolve(); } }); simulation.stderr.on('data', chunk => { errors += chunk; }); });
});
after(() => { if (simulation?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(simulation.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else simulation.kill('SIGINT'); }
 fs.writeFileSync(logFile, output); const requests = output.split(/\r?\n/).flatMap(line => { try { const item = JSON.parse(line); return item.event === 'request' && item.path.startsWith('/api/v1/') ? [item] : []; } catch { return []; } }); assert.ok(requests.length); console.log(`Postman HTTP evidence: ${requests.length} provider requests; log ${logFile}`); });
async function fixture(scenario = 'success') { assert.equal((await fetch(`${origin}/__fixture/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) })).status, 200); }
async function state() { return (await fetch(`${origin}/__fixture/state`)).json(); }
function runtime() {
 const files = { facebook: 'src/lib/publishing/facebook.ts', instagram: 'src/lib/publishing/instagram.ts', client: 'src/lib/zernio/client.ts', publishing: 'src/lib/services/publishing.service.ts', core: 'src/lib/services/core-connect.service.ts', accounts: 'src/lib/auth/tenant-provider.ts', lifecycle: 'src/lib/accounts/lifecycle.ts' };
 const sources = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText]));
 const context = vm.createContext({ Buffer, URL, Request, Response, Headers, TextEncoder, TextDecoder, Date, Intl, Set, console, AbortController, setTimeout, clearTimeout,
 process: { env: { ZERNIO_BASE_URL: `${origin}/api/v1`, ZERNIO_API_KEY: 'phase1d_mock_key' } },
 fetch: (url, options) => { assert.equal(new URL(url).origin, new URL(origin).origin, 'Live network forbidden'); return fetch(url, options); } });
 const cache = {}, removed = [];
 function load(name) {
  if (cache[name]) return cache[name];
  const module = { exports: {} }; cache[name] = module.exports; // cycles Core -> lifecycle -> ownership -> Core
  const require = specifier => {
    if (specifier === '@/lib/billing/connections') return { reserveConnectionCapacity: async () => {} }; // Existing private-beta fixture; commercial capacity has separate SQL/HTTP coverage.
   if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
   const alias = { '@/lib/publishing/facebook': 'facebook', '@/lib/publishing/instagram': 'instagram', '@/lib/zernio/client': 'client', '@/lib/services/publishing.service': 'publishing', '@/lib/services/core-connect.service': 'core', '@/lib/auth/tenant-provider': 'accounts', '@/lib/accounts/lifecycle': 'lifecycle' }[specifier]; if (alias) return load(alias);
   if (specifier === '@/lib/auth/tenant-access') return { TenantAccessError: class extends Error { constructor(status, message) { super(message); this.status = status; } } };
   if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => null };
   if (specifier === '@/lib/storage/workspace-store') return { WorkspaceStore: { getWorkspace: () => ({ connectedAccounts: [] }), removeConnectedAccount: (...args) => removed.push(args) } };
   if (specifier === '@/lib/zernio/policy-engine') return { getFallbackStore: () => ({ globalConfig: {}, tenants: {} }), assertSubServiceAllowed: async org => ({ organizationId: org, organizationName: org, zernioProfileId: org === 'tenant-b' ? '77a1f0c2a4b9d3e8f1a2b3c4' : profileId, allowedPlatforms: ['facebook'], quotas: { maxConnectedAccounts: 10 } }), resolveConnectScopesParam: () => '' };
   throw new Error(`Unexpected dependency ${specifier}`);
  };
  vm.runInContext(`(function(require,module,exports){${sources[name]}\n})`, context)(require, module, module.exports); return module.exports;
 }
 return { service: load('publishing').PublishingService, core: load('core').CoreConnectService, lifecycle: load('lifecycle'), removed };
}
const input = () => ({ organizationId: 'tenant-a', content: 'HTTP draft', platforms: [{ platform: 'facebook', accountId, platformSpecificData: { facebookSettings: { draft: false } } }], idempotencyKey: 'draft-one' });
test('stateful real HTTP draft/list/get/update/delete and exact tenant idempotency', async () => {
 await fixture(); const { service } = runtime(); const first = await service.createPost(input()); const repeated = await service.createPost({ ...input(), content: 'different ignored body' }); assert.equal(first.post._id, repeated.post._id); assert.equal(repeated.post.content, 'HTTP draft'); assert.equal(repeated.httpStatus, 200);
 const listed = await service.listTenantPosts('tenant-a'); assert.equal(listed.posts.length, 1); const detail = await service.getPost('tenant-a', first.post._id); assert.equal(detail.post.status, 'draft');
 const updated = await service.updatePost('tenant-a', first.post._id, { content: 'Updated', idempotencyKey: 'update-one' }); assert.equal(updated.post.content, 'Updated');
 const deleted = await service.deletePost('tenant-a', first.post._id); assert.equal(deleted.httpStatus, 200); assert.equal((await service.listPosts('tenant-a')).length, 0);
 const calls = (await state()).requests; assert.equal(calls.find(c => c.path === '/posts' && c.method === 'GET').query.profileId, profileId); assert.equal(calls.find(c => c.path === '/posts' && c.method === 'POST').body.isDraft, true);
});
test('immediate207 preserves pending/partial and failed; retry reads actual published URL', async () => {
 for (const scenario of ['success', 'failed']) { await fixture(scenario); const { service } = runtime(); const created = await service.createPost({ ...input(), publishNow: true }); assert.equal(created.httpStatus, 207); assert.equal(created.post.status, scenario === 'failed' ? 'failed' : 'partial'); assert.equal(created.post.platforms[0].platformPostUrl, undefined);
 if (scenario === 'success') { await assert.rejects(service.retryPost('tenant-a', created.post._id, { idempotencyKey: 'retry-pending' }), error => error.status === 409); continue; }
 const retried = await service.retryPost('tenant-a', created.post._id, { idempotencyKey: 'retry-one' }); assert.equal(retried.post.status, 'published'); assert.equal((await service.getPost('tenant-a', created.post._id)).post.platforms[0].platformPostUrl, 'https://facebook.com/page/posts/provider-123'); }
});
test('future schedule offset/timezone and queue scheduling use real provider body', async () => {
 await fixture(); const { service } = runtime(); const scheduledFor = '2099-01-01T10:00:00+02:00'; const scheduled = await service.createPost({ ...input(), scheduledFor, timezone: 'Africa/Cairo' }); assert.equal(scheduled.post.status, 'scheduled'); assert.equal(scheduled.post.scheduledFor, scheduledFor);
 const queue = await service.upsertProfileQueue({ organizationId: 'tenant-a', name: 'Morning', timezone: 'Africa/Cairo', slots: [{ dayOfWeek: 1, time: '09:00' }] }); const queued = await service.createPost({ ...input(), idempotencyKey: 'queued', useProfileQueue: true, queueId: queue.schedule._id }); assert.equal(queued.post.queuedFromProfile, profileId);
});
test('foreign post/account cannot mutate, second tenant cannot read first tenant posts', async () => {
 await fixture(); const { service } = runtime(); const created = await service.createPost(input()); assert.equal((await service.listTenantPosts('tenant-b')).posts.length, 0);
 await assert.rejects(service.createPost({ ...input(), idempotencyKey: 'foreign-account', platforms: [{ platform: 'facebook', accountId: '77b1f0c2a4b9d3e8f1a2b3c4' }] }), error => error.status === 403);
 await fetch(`${origin}/__fixture/scenario`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: 'foreign-post' }) });
 await assert.rejects(service.deletePost('tenant-a', created.post._id), error => error.status === 403); assert.equal((await state()).requests.filter(c => c.method === 'DELETE').length, 0);
});
test('real HTTP presign, canonical Core health and confirmed disconnect', async () => {
 await fixture(); const s = runtime(); const upload = await s.service.createMediaPresignedUpload({ organizationId: 'tenant-a', filename: 'image.png', contentType: 'image/png', size: 42 }); assert.equal(upload.uploadUrl, 'https://storage.example.invalid/put');
 const health = await s.core.listTenantAccountsWithHealth('tenant-a'); assert.equal(health.simulated, false); assert.equal(health.accounts[0]._id, accountId);
 const result = await s.lifecycle.disconnectAccount('tenant-a', accountId); assert.equal(result.success, true); assert.equal(s.removed.length, 1); assert.ok((await state()).disconnected.includes(accountId));
});
test('malformed and unavailable provider responses fail with no local success', async () => {
 for (const [scenario, status] of [['malformed', 502], ['provider-unavailable', 503]]) { await fixture(scenario); const { service } = runtime(); await assert.rejects(service.createPost(input()), error => error.envelope?.status === status); assert.equal((await state()).posts.length, 0); }
});
test('Page routing overrides are rejected before any HTTP mutation', async () => {
 await fixture(); const { service } = runtime();
 for (const platformSpecificData of [{ pageId: 'foreign-page' }, { facebookSettings: { pageId: 'foreign-page' } }]) await assert.rejects(service.createPost({ ...input(), platforms: [{ platform: 'facebook', accountId, platformSpecificData }] }), error => error.status === 400);
 assert.equal((await state()).requests.filter(c => c.method === 'POST').length, 0);
});
test('disconnect history is omitted without blocking verified posts or exposing identities', async () => {
 await fixture(); const s = runtime(); await s.service.createPost(input());
 await s.lifecycle.disconnectAccount('tenant-a', accountId);
 const history = await s.service.listTenantPosts('tenant-a'); assert.equal(history.posts.length, 0); assert.equal(history.omittedCount, 1); assert.equal(history.pagination.total, 1); assert.equal(JSON.stringify(history.warnings).includes(accountId), false);
});
test('foreign provider rows are omitted and detail remains denied', async () => {
 await fixture(); const { service } = runtime(); const created = await service.createPost(input());
 await fetch(`${origin}/__fixture/scenario`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: 'foreign-post' }) });
 const listed = await service.listTenantPosts('tenant-a'); assert.equal(listed.posts.length, 0); assert.equal(listed.omittedCount, 1); assert.equal(JSON.stringify(listed).includes('77b1f0c2a4b9d3e8f1a2b3c4'), false);
 await assert.rejects(service.getPost('tenant-a', created.post._id), error => error.status === 403);
});
test('content-only update preserves writable platform overrides without resending provider state', async () => {
 await fixture(); const { service } = runtime();
 const target = { platform: 'facebook', accountId, customContent: 'Page caption', customMedia: [{ type: 'image', url: 'https://example.invalid/custom.png' }], scheduledFor: '2099-01-01T10:00:00Z', platformSpecificData: { firstComment: 'First comment', facebookSettings: { draft: true } } };
 const created = await service.createPost({ ...input(), platforms: [target] });
 const updated = await service.updatePost('tenant-a', created.post._id, { content: 'Global updated', idempotencyKey: 'preserve-overrides' });
 assert.equal(updated.post.platforms[0].customContent, target.customContent); assert.deepEqual(JSON.parse(JSON.stringify(updated.post.platforms[0].customMedia)), target.customMedia); assert.deepEqual(JSON.parse(JSON.stringify(updated.post.platforms[0].platformSpecificData)), target.platformSpecificData); assert.equal(updated.post.platforms[0].scheduledFor, target.scheduledFor);
 const sent = (await state()).requests.find(c => c.method === 'PUT').body; assert.equal(sent.platforms, undefined);
});

test('Facebook rejects unsupported effective media before provider create and keeps valid feed/story/reel shapes', async () => {
 const image = { type: 'image', url: 'https://example.invalid/photo.jpg' }, video = { type: 'video', url: 'https://example.invalid/video.mp4' };
 const invalid = [
  { mediaItems: [image, video] }, { mediaItems: [video, video] },
  { mediaItems: Array.from({ length: 11 }, () => image) },
  { mediaItems: [{ type: 'document', url: 'https://example.invalid/report.pdf' }] },
  { mediaItems: [], platformSpecificData: { contentType: 'story' } },
  { mediaItems: [image, image], platformSpecificData: { contentType: 'story' } },
  { mediaItems: [image], platformSpecificData: { contentType: 'reel' } },
  { mediaItems: [image], customMedia: [image, video] },
 ];
 for (const { platformSpecificData, customMedia, ...patch } of invalid) {
  await fixture(); const { service } = runtime();
  await assert.rejects(service.createPost({ ...input(), ...patch, platforms: [{ platform: 'facebook', accountId, customMedia, platformSpecificData }] }), error => error.status === 400);
  assert.equal((await state()).requests.filter(call => call.method === 'POST').length, 0);
 }
 for (const { platformSpecificData, customMedia, ...patch } of [
  {}, { mediaItems: Array.from({ length: 10 }, () => image) }, { mediaItems: [video] },
  { mediaItems: [image], platformSpecificData: { contentType: 'story' } },
  { mediaItems: [video], platformSpecificData: { contentType: 'reel' } },
  { mediaItems: [image, video], customMedia: [] },
 ]) {
  await fixture(); const { service } = runtime();
  const created = await service.createPost({ ...input(), ...patch, platforms: [{ platform: 'facebook', accountId, customMedia, platformSpecificData }] });
  assert.equal(created.post.status, 'draft');
  assert.equal((await state()).requests.filter(call => call.method === 'POST' && call.path === '/posts').length, 1);
 }
});

test('Facebook update validates saved target media overrides and newly supplied global media', async () => {
 const image = { type: 'image', url: 'https://example.invalid/photo.jpg' }, video = { type: 'video', url: 'https://example.invalid/video.mp4' };
 await fixture(); const { service } = runtime();
 const created = await service.createPost({ ...input(), mediaItems: [image] });
 await assert.rejects(service.updatePost('tenant-a', created.post._id, { mediaItems: [image, video], idempotencyKey: 'bad-update' }), error => error.status === 400);
 assert.equal((await state()).requests.filter(call => call.method === 'PUT').length, 0);
 await fixture(); const overridden = await service.createPost({ ...input(), mediaItems: [image], platforms: [{ platform: 'facebook', accountId, customMedia: [] }] });
 const updated = await service.updatePost('tenant-a', overridden.post._id, { mediaItems: [image, video], idempotencyKey: 'empty-override' });
 assert.equal(updated.post.status, 'draft');
 assert.deepEqual(JSON.parse(JSON.stringify(updated.post.platforms[0].customMedia)), []);
});
