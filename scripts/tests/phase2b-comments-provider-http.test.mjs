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
const profileId = '66a1f0c2a4b9d3e8f1a2b3c4', accountId = '66b1f0c2a4b9d3e8f1a2b3c4', instagramId = '66b1f0c2a4b9d3e8f1a2b3c5';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase2b-comments-http-')), logFile = path.join(temp, 'simulation.ndjson');
let simulation, origin, output = '', errors = '';
before(async () => {
 const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve)); const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
 origin = `http://127.0.0.1:${port}/zernio`;
 simulation = spawn('postman', ['simulation', 'run', 'postman/simulations/phase2b-comments.sim.yaml', '--port', String(port), '--output', 'ndjson', '--no-history'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
 await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(errors || 'Simulation startup timed out')), 30000);
  simulation.on('error', error => { clearTimeout(timer); reject(error); }); simulation.on('exit', code => { if (!output.includes('"event":"listening"')) { clearTimeout(timer); reject(new Error(`Simulation exited ${code}: ${errors}`)); } });
  simulation.stdout.on('data', chunk => { output += chunk; fs.writeFileSync(logFile, output); if (output.includes('"event":"listening"')) { clearTimeout(timer); resolve(); } }); simulation.stderr.on('data', chunk => { errors += chunk; }); });
});
after(() => { if (simulation?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(simulation.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else simulation.kill('SIGINT'); }
 fs.writeFileSync(logFile, output); const requests = output.split(/\r?\n/).flatMap(line => { try { const item = JSON.parse(line); return item.event === 'request' && item.path.startsWith('/api/v1/') ? [item] : []; } catch { return []; } }); assert.ok(requests.length); console.log(`Postman HTTP evidence: ${requests.length} provider requests; log ${logFile}`); });
async function fixture(scenario = 'success') { assert.equal((await fetch(`${origin}/__fixture/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) })).status, 200); }
async function state() { return (await fetch(`${origin}/__fixture/state`)).json(); }
function runtime() {
 const files = { client: 'src/lib/zernio/client.ts', comments: 'src/lib/meta-comments/service.ts', core: 'src/lib/services/core-connect.service.ts', accounts: 'src/lib/auth/tenant-provider.ts', lifecycle: 'src/lib/accounts/lifecycle.ts' };
 const sources = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText]));
 const context = vm.createContext({ Buffer, URL, Request, Response, Headers, TextEncoder, TextDecoder, Date, Intl, Set, console, AbortController, setTimeout, clearTimeout,
 process: { env: { ZERNIO_BASE_URL: `${origin}/api/v1`, ZERNIO_API_KEY: 'phase2b_mock_key' } },
 fetch: (url, options) => { assert.equal(new URL(url).origin, new URL(origin).origin, 'Live network forbidden'); return fetch(url, options); } });
 const cache = {};
 function load(name) {
  if (cache[name]) return cache[name];
  const module = { exports: {} }; cache[name] = module.exports;
  const require = specifier => {
   if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
   const alias = { '@/lib/zernio/client': 'client', '@/lib/meta-comments/service': 'comments', '@/lib/services/core-connect.service': 'core', '@/lib/auth/tenant-provider': 'accounts', '@/lib/accounts/lifecycle': 'lifecycle' }[specifier]; if (alias) return load(alias);
   if (specifier === '@/lib/auth/tenant-access') return { TenantAccessError: class extends Error { constructor(status, message) { super(message); this.status = status; } } };
   if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => null };
   if (specifier === '@/lib/storage/workspace-store') return { WorkspaceStore: { getWorkspace: () => ({ connectedAccounts: [] }), removeConnectedAccount() {} } };
   if (specifier === '@/lib/zernio/policy-engine') return { getFallbackStore: () => ({ globalConfig: {}, tenants: {} }), assertSubServiceAllowed: async org => ({ organizationId: org, organizationName: org, zernioProfileId: org === 'tenant-b' ? '77a1f0c2a4b9d3e8f1a2b3c4' : profileId, allowedPlatforms: ['facebook', 'instagram'], quotas: { maxConnectedAccounts: 10 } }), resolveConnectScopesParam: () => '' };
   throw new Error(`Unexpected dependency ${specifier}`);
  };
  vm.runInContext(`(function(require,module,exports){${sources[name]}\n})`, context)(require, module, module.exports); return module.exports;
 }
 return load('comments').MetaCommentsService;
}
const params = (patch = {}) => ({ organizationId: 'tenant-a', accountId, postId: 'owned-post', commentId: 'customer-comment', text: 'Reviewed response', idempotencyKey: 'reviewed-intent', ...patch });
const writes = data => data.requests.filter(row => row.method !== 'GET');

test('Instagram comments connection method comes from canonical account metadata', async () => {
 await fixture(); const result = await runtime().listAccounts('tenant-a');
 assert.equal(result.accounts.find(account => account.accountId === instagramId).loginMethod, 'facebook_login');
});

test('accounts and owned posts preserve native shape,207 and failed-account metadata', async () => {
 await fixture('partial'); const service = runtime(); const accounts = await service.listAccounts('tenant-a'); assert.equal(accounts.accounts.length, 2); assert.equal(accounts.profileId, profileId);
 const result = await service.listPosts(params({ profileId: 'foreign-profile', platform: 'twitter' })); assert.equal(result.httpStatus, 207); assert.equal(result.data[0].id, 'owned-post'); assert.equal(result.meta.failedAccounts[0].code, 'TOKEN_EXPIRED');
 const request = (await state()).requests.find(row => row.path === '/inbox/comments'); assert.equal(request.query.profileId, profileId); assert.equal(request.query.platform, 'facebook'); assert.equal(request.query.accountId, accountId);
});
test('public reply uses documented successful-response replay with unchanged namespaced intent/body', async () => {
 await fixture(); const service = runtime(), first = await service.reply(params()), replay = await service.reply(params()); assert.equal(first.data.commentId, replay.data.commentId); assert.equal(first.data.isReply, true); assert.equal((await state()).mutations.length, 1);
 const requests = writes(await state()); assert.equal(requests[0].body.commentId, 'customer-comment'); assert.equal(requests[0].body.message, 'Reviewed response'); assert.match(requests[0].idempotencyKey, /^asra3-comments-[a-f0-9]{64}$/); assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey);
 await assert.rejects(service.reply(params({ text: 'Changed content' })), error => error.envelope.status === 422);
});
test('missing/foreign posts and comments never reach mutation; readable foreign focus is insufficient', async () => {
 for (const [scenario, patch, expected] of [['success',{postId:'foreign-post'},404], ['missing-comment',{},404], ['foreign-post-list',{},404], ['foreign-comment-meta',{},404], ['wrong-post-meta',{},404], ['success',{commentId:'foreign-comment'},404], ['inactive',{},409], ['success',{accountId:'foreign'},403]]) {
  await fixture(scenario); await assert.rejects(runtime().reply(params(patch)), error => (error.envelope?.status || error.status) === expected); assert.equal(writes(await state()).length, 0, scenario);
 }
});
test('own-post pagination follows empty page; reply pagination verifies actual parent membership', async () => {
 await fixture('empty-first-page'); const result = await runtime().listComments(params({commentId:undefined})); assert.equal(result.comments[0].id, 'customer-comment'); assert.ok((await state()).requests.some(row => row.query.cursor === 'page-2'));
 await fixture('reply-pages'); const reply = await runtime().reply(params({commentId:'paged-reply'})); assert.ok(reply.data.commentId); assert.ok((await state()).requests.some(row => row.method === 'GET' && row.query.commentId === 'customer-comment'));
 await fixture('pages-forever'); await assert.rejects(runtime().reply(params()), error => error.envelope.status === 503 && error.envelope.code === 'ownership_verification_incomplete'); assert.equal(writes(await state()).length,0);
});
test('hide/unhide/delete keep canonical confirmed state and account-scoped provider parameters', async () => {
 await fixture(); const service = runtime(); const hidden = await service.hide(params({hidden:true})); assert.equal(hidden.hidden,true); assert.equal(hidden.status,'success'); const unhidden = await service.hide(params({hidden:false})); assert.equal(unhidden.hidden,false);
 const deleted = await service.deleteComment(params()); assert.equal(deleted.success,true); const calls=writes(await state()); assert.equal(calls[0].body.accountId,accountId); assert.equal(calls[1].query.accountId,accountId); assert.equal(calls[2].query.commentId,'customer-comment');
 await fixture(); await service.hide(params({accountId:instagramId,hidden:true})); await assert.rejects(service.hide(params({accountId:instagramId,hidden:false})),error=>error.envelope.status===404); assert.equal(writes(await state()).length,1);
});
test('private reply is separate plain text,known7day window and stable intent required', async () => {
 await fixture(); const service=runtime(); const result=await service.privateReply(params()); assert.equal(result.messageId,'private-provider-1'); assert.equal(result.commentId,'customer-comment'); assert.equal(result.platform,'facebook');
 const request=writes(await state())[0]; assert.equal(request.path,'/inbox/comments/owned-post/customer-comment/private-reply'); assert.equal(request.body.message,'Reviewed response'); assert.match(request.idempotencyKey,/^asra3-comments-/);
 for(const patch of [{idempotencyKey:undefined},{text:' '},{buttons:[]},{quickReplies:[]}]) { await fixture(); await assert.rejects(runtime().privateReply(params(patch)),error=>error.envelope.status===400); assert.equal(writes(await state()).length,0); }
 await fixture('expired'); await assert.rejects(runtime().privateReply(params()),error=>error.envelope.code==='private_reply_window_closed'); assert.equal(writes(await state()).length,0);
});
test('consumed private reply never auto-retries including429; details/platformError survive', async () => {
 for(const [scenario,status] of [['consumed',400],['consumed429',429]]) { await fixture(scenario); await assert.rejects(runtime().privateReply(params()),error=>error.envelope.status===status && error.envelope.details.privateReplyConsumed===true && error.envelope.details.retryAllowed===false); assert.equal(writes(await state()).length,1); }
 await fixture('consumed'); await assert.rejects(runtime().privateReply(params()),error=>error.envelope.platformError.error_subcode===1545133 && error.envelope.code==='PRIVATE_REPLY_CONSUMED');
});
test('unknown502/HTML and malformed private outcomes require reconciliation without fabricated IDs', async () => {
 for(const scenario of ['unknown','unknown-html','malformed']) { await fixture(scenario); await assert.rejects(runtime().privateReply(params()),error=>error.envelope.status===502 && error.envelope.details.privateReplyOutcome==='unknown' && error.envelope.details.retryAllowed===false && error.envelope.details.reconcileBeforeRetry===true); assert.equal(writes(await state()).length,1); assert.equal((await state()).mutations.length,0); }
 await fixture('unknown'); await assert.rejects(runtime().reply(params()),error=>error.envelope.details.reconcileBeforeRetry===true && error.envelope.platformError.code===2);
});
test('permission403 preserved; public short429 retry retains body/key; private429 fails once', async () => {
 await fixture('permission-denied'); await assert.rejects(runtime().reply(params()),error=>error.envelope.status===403 && error.envelope.platformError.code===10 && error.envelope.details.needed==='manage_comments' && error.envelope.requestId==='fixture-comments-request'); assert.equal(writes(await state()).length,1);
 await fixture('rate-limit'); const sent=await runtime().reply(params()); assert.ok(sent.data.commentId); const calls=writes(await state()); assert.equal(calls.length,3); assert.equal(new Set(calls.map(row=>row.idempotencyKey)).size,1); assert.equal(new Set(calls.map(row=>JSON.stringify(row.body))).size,1); assert.equal((await state()).mutations.length,1);
 await fixture('rate-limit'); await assert.rejects(runtime().privateReply(params()),error=>error.envelope.status===429); assert.equal(writes(await state()).length,1);
});
test('routing IDs cannot inject a provider destination or another operation', async () => {
 for(const patch of [{postId:'../accounts'},{postId:'owned-post?accountId=foreign'},{commentId:'customer-comment/../../private-reply'},{postId:'..'}]) { await fixture(); await assert.rejects(runtime().reply(params(patch)),error=>[400,404].includes(error.envelope.status)); assert.equal(writes(await state()).length,0); }
});
test('incomplete failed listing preserves provider partial metadata and never claims missing ownership', async () => {
 await fixture('failed-post-list'); await assert.rejects(runtime().reply(params()),error=>error.envelope.status===503 && error.envelope.code==='ownership_verification_incomplete' && error.envelope.details.providerHttpStatus===207 && error.envelope.details.meta.failedAccounts[0].code==='TOKEN_EXPIRED'); assert.equal(writes(await state()).length,0);
});
test('foreign nested parent or wrong focused comment blocks mutation despite readable provider response', async () => {
 await fixture('foreign-nested-parent'); await assert.rejects(runtime().reply(params({commentId:'foreign-nested-reply'})),error=>error.envelope.status===404); assert.equal(writes(await state()).length,0);
 await fixture('wrong-focus'); await assert.rejects(runtime().listComments(params()),error=>error.envelope.status===404); assert.equal(writes(await state()).length,0);
});
test('private/public/account operation intent namespaces cannot collide; caller tenant remains verified', async () => {
 await fixture(); const service=runtime(); await service.reply(params()); await service.privateReply(params()); await service.reply(params({accountId:instagramId})); const calls=writes(await state()); assert.equal(new Set(calls.map(row=>row.idempotencyKey)).size,3);
 await fixture(); await assert.rejects(runtime().reply(params({organizationId:'tenant-b'})),error=>[403,502].includes(error.envelope?.status||error.status)); assert.equal(writes(await state()).length,0);
});
