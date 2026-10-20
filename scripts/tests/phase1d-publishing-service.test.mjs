import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('src/lib/services/publishing.service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const account = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', profileId: 'aaaaaaaaaaaaaaaaaaaaaaaa', platform: 'facebook', isActive: true };
const post = (status = 'draft') => ({ _id: 'cccccccccccccccccccccccc', content: 'hello', status, platforms: [{ accountId: account._id, platform: 'facebook', status: status === 'published' ? 'published' : status === 'failed' ? 'failed' : 'pending' }] });
function sandbox(options = {}) {
  const calls = [];
  class TenantAccessError extends Error { constructor(status, message) { super(message); this.status = status; } }
  class ZernioApiException extends Error { constructor(envelope) { super(envelope.error); this.envelope = envelope; } }
  const modules = {
    'node:crypto': crypto,
    '@/lib/zernio/client': { ZernioApiException, zernioClient: { isConfigured: () => !options.unconfigured, request: async input => {
      calls.push(input);
      if (options.failure && input.method === 'POST') throw new ZernioApiException({ status: 504, code: 'PROVIDER_TIMEOUT', error: 'outcome unknown' });
      if (input.path === '/accounts') return { data: { accounts: [account] }, status: 200 };
      if (input.path === '/media/presign') return { data: options.malformed ? {} : { uploadUrl: 'https://storage.example/upload', publicUrl: 'https://storage.example/file.png', expiresIn: 3600 }, status: 200 };
      if (input.path === '/queue/slots') return { data: { schedule: { _id: 'dddddddddddddddddddddddd', profileId: account.profileId }, queues: [{ _id: 'dddddddddddddddddddddddd' }] }, status: 201 };
      if (input.method === 'DELETE') return { data: { message: 'Deleted' }, status: 200 };
      if (input.path === '/posts' && !input.method) return { data: { posts: [options.foreignPost ? { ...post(), platforms: [{ platform: 'facebook', accountId: 'foreign', status: 'pending' }] } : post()], pagination: { page: 1, total: 1 } }, status: 200 };
      return { data: options.malformed ? {} : { post: options.foreignPost ? { ...post(), platforms: [{ platform: 'facebook', accountId: 'foreign', status: 'pending' }] } : post(options.status || 'draft'), warnings: ['actual warning'], platformResults: [{ platform: 'facebook', status: 'pending', error: null }] }, status: options.httpStatus || 201 };
    } } },
    '@/lib/zernio/policy-engine': { assertSubServiceAllowed: async () => ({ allowedPlatforms: options.disabled ? [] : ['facebook'] }) },
    '@/lib/services/core-connect.service': { CoreConnectService: { ensureTenantProfile: async () => account.profileId } },
    '@/lib/auth/tenant-provider': { requireTenantAccounts: async (_, ids) => { if (ids.some(id => id !== account._id)) throw new TenantAccessError(403, 'foreign'); return ids.map(() => ({ ...account, isActive: !options.inactive })); } },
    '@/lib/auth/tenant-access': { TenantAccessError },
  };
  const instagramSource = ts.transpileModule(fs.readFileSync('src/lib/publishing/instagram.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const instagramExports = {}; vm.runInNewContext(`(function(require,exports){${instagramSource}\n})`,{URL}).call(null,name=>modules[name],instagramExports); modules['@/lib/publishing/instagram']=instagramExports;
  const exports = {};
  vm.runInNewContext(`(function(require,exports){${source}\n})`, { URL, Intl, Date, Set }).call(null, name => { assert.ok(modules[name], name); return modules[name]; }, exports);
  return { service: exports.PublishingService, calls };
}
const input = () => ({ organizationId: 'tenant-a', content: 'hello', platforms: [{ platform: 'facebook', accountId: account._id, platformSpecificData: { facebookSettings: { draft: false } } }], idempotencyKey: 'intent-1' });
test('draft is explicit, per-platform settings preserved, retries use tenant-scoped stable key', async () => {
  const { service, calls } = sandbox();
  const one = await service.createPost(input()); const two = await service.createPost(input());
  assert.equal(one.idempotencyKey, two.idempotencyKey); assert.equal(one.post.status, 'draft');
  assert.equal(calls.find(call => call.method === 'POST').body.isDraft, true);
  assert.equal(calls.find(call => call.method === 'POST').body.platforms[0].platformSpecificData.facebookSettings.draft, false);
  const three = await service.createPost({ ...input(), organizationId: 'tenant-b' }); assert.notEqual(one.idempotencyKey, three.idempotencyKey);
});
test('207 pending/partial are returned verbatim without fabricated URLs', async () => {
  const { service } = sandbox({ httpStatus: 207, status: 'partial' }); const result = await service.createPost({ ...input(), publishNow: true });
  assert.equal(result.httpStatus, 207); assert.equal(result.post.status, 'partial'); assert.equal(result.post.platforms[0].status, 'pending'); assert.equal(result.post.platforms[0].platformPostUrl, undefined); assert.equal(result.warnings[0], 'actual warning');
});
test('missing key, unavailable provider, account policy and malformed response fail closed', async () => {
  for (const [options, patch, expected] of [[{}, { idempotencyKey: undefined }, 400], [{ unconfigured: true }, {}, 503], [{ disabled: true }, {}, 403], [{ inactive: true }, {}, 409], [{ malformed: true }, {}, 502], [{ failure: true }, {}, 504], [{}, { platforms: [{ platform: 'facebook', accountId: 'foreign', status: 'pending' }] }, 403]]) {
    await assert.rejects(sandbox(options).service.createPost({ ...input(), ...patch }), error => (error.status || error.envelope?.status) === expected);
  }
});
test('schedule/mode and insecure media validation cannot accidentally publish', async () => {
  for (const patch of [{ publishNow: true, scheduledFor: '2099-01-01T00:00:00Z' }, { scheduledFor: '2000-01-01T00:00:00Z' }, { scheduledFor: '2099-01-01T00:00:00' }, { mediaItems: [{ type: 'image', url: 'http://example.test/file.png' }] }]) {
    const { service, calls } = sandbox(); await assert.rejects(service.createPost({ ...input(), ...patch }), error => error.status === 400); assert.equal(calls.some(call => call.method === 'POST'), false);
  }
});
test('canonical reads send verified profile and reject foreign post before delete', async () => {
  const good = sandbox(); const result = await good.service.listTenantPosts('tenant-a'); assert.equal(result.posts[0]._id, post()._id); assert.equal(good.calls.find(call => call.path === '/posts').query.profileId, account.profileId);
  const foreign = sandbox({ foreignPost: true }); await assert.rejects(foreign.service.deletePost('tenant-a', post()._id), error => error.status === 403); assert.equal(foreign.calls.some(call => call.method === 'DELETE'), false);
});
test('draft promotion, retry lifecycle and real upload/queue responses', async () => {
  const draft = sandbox(); await draft.service.updatePost('tenant-a', post()._id, { scheduledFor: '2099-01-01T00:00:00Z', idempotencyKey: 'promote' }); assert.equal(draft.calls.find(call => call.method === 'PUT').body.isDraft, false);
  const failed = sandbox({ status: 'failed' }); await failed.service.retryPost('tenant-a', post()._id, { idempotencyKey: 'retry' }); assert.ok(failed.calls.find(call => call.path.endsWith('/retry')));
  const uploaded = await draft.service.createMediaPresignedUpload({ organizationId: 'tenant-a', filename: 'file.png', contentType: 'image/png', size: 123 }); assert.equal(uploaded.provider, 'zernio-presign'); assert.equal(uploaded.uploadUrl, 'https://storage.example/upload');
  const queue = await draft.service.upsertProfileQueue({ organizationId: 'tenant-a', name: 'Morning', timezone: 'Africa/Cairo', slots: [{ dayOfWeek: 1, time: '09:00' }] }); assert.equal(queue.schedule.profileId, account.profileId);
});
