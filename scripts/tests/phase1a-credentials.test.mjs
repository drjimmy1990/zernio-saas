import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/services/core-connect.service.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const profileId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

function sandbox(options = {}) {
  const calls = [];
  const exports = {};
  class ZernioApiException extends Error { constructor(envelope) { super(envelope.error); this.envelope = envelope; } }
  const context = vm.createContext({ Date, URL, Buffer, process: { env: {} },
    fetch: () => { throw new Error('Network denied in credential tests'); },
  });
  const require = (name) => {
    if (name === '@/lib/accounts/lifecycle') return { verifyReconnectIdentity: async () => { throw new Error('Reconnect is outside this credential fixture'); } };
    if (name === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => { throw new Error('DB denied in credential tests'); } };
    if (name === '@/lib/storage/workspace-store') return { WorkspaceStore: {} };
    if (name === '@/lib/zernio/policy-engine') return {
      assertSubServiceAllowed: async (organizationId) => {
        calls.push({ type: 'policy', organizationId });
        return { allowedPlatforms: options.allowedPlatforms ?? ['bluesky', 'wordpress', 'shopify', 'whatsapp'], enforceHeadlessOAuth: false };
      },
      resolveConnectScopesParam: () => '',
    };
    if (name === '@/lib/zernio/client') return {
      ZernioApiException, ZernioClient: {},
      zernioClient: { isConfigured: () => true, request: async (request) => {
        calls.push({ type: 'provider', request });
        return { data: { account: { _id: 'verified-account', profileId }, authUrl: 'https://provider.invalid/auth' } };
      } },
    };
    throw new Error(`Forbidden module in credential tests: ${name}`);
  };
  vm.runInContext(`(function(require,exports) {\n${source}\n})`, context)(require, exports);
  exports.CoreConnectService.ensureTenantProfile = async (organizationId) => {
    calls.push({ type: 'verified-profile', organizationId });
    return profileId;
  };
  return { calls,
    connect: (platform, credentials) => exports.CoreConnectService.connectWithCredentials({ organizationId: 'tenant-a', platform, credentials }),
    select: (params) => exports.CoreConnectService.completeHeadlessSelection({ organizationId: 'tenant-a', ...params }),
    start: (params) => exports.CoreConnectService.startHeadlessOAuth({ organizationId: 'tenant-a', platform: 'whatsapp', redirectUrl: 'https://asra3.com/dashboard', ...params }),
  };
}

const controlClaims = {
  profileId: 'bbbbbbbbbbbbbbbbbbbbbbbb', state: 'foreign-user-foreign-profile',
  redirect_url: 'https://foreign.invalid', redirectUri: 'https://foreign.invalid',
  redirectUrl: 'https://foreign.invalid', externalId: 'tenant-b', organizationId: 'tenant-b',
  accountId: 'foreign-account', apiKeyOverride: 'foreign-key', path: '/profiles', method: 'DELETE',
  extraHeaders: { Authorization: 'Bearer foreign-key' }, query: { profileId: 'foreign-profile' },
};

test('WhatsApp credentials cannot override tenant profile or provider request controls', async () => {
  const s = sandbox();
  await s.connect('whatsapp', { ...controlClaims, accessToken: 'isolated-token', wabaId: 'waba-a', phoneNumberId: 'phone-a', pin: '123456', displayName: 'Browser name' });
  const request = s.calls.find((call) => call.type === 'provider').request;
  assert.deepEqual(JSON.parse(JSON.stringify(request)), {
    method: 'POST', path: '/connect/whatsapp/credentials',
    body: { accessToken: 'isolated-token', wabaId: 'waba-a', phoneNumberId: 'phone-a', pin: '123456', profileId },
  });
  assert.deepEqual(s.calls.map((call) => call.type), ['policy', 'verified-profile', 'provider']);
});

test('other platform credential payloads preserve UI fields while excluding routing claims', async () => {
  for (const [platform, credentials, expected] of [
    ['wordpress', { siteUrl: 'https://wordpress.invalid', username: 'writer', applicationPassword: 'isolated-app-password' }, { siteUrl: 'https://wordpress.invalid', username: 'writer', applicationPassword: 'isolated-app-password' }],
    ['shopify', { shopDomain: 'isolated.myshopify.com', adminToken: 'isolated-admin-token' }, { shop: 'isolated.myshopify.com', accessToken: 'isolated-admin-token' }],
    ['bluesky', { identifier: 'isolated.bsky.social', appPassword: 'isolated-app-password', password: 'unused-alias' }, { identifier: 'isolated.bsky.social', appPassword: 'isolated-app-password' }],
  ]) {
    const s = sandbox();
    await s.connect(platform, { ...controlClaims, ...credentials, secretOrToken: 'unused-ui-field' });
    const request = s.calls.find((call) => call.type === 'provider').request;
    assert.deepEqual(JSON.parse(JSON.stringify(request.body)), { ...expected, profileId });
    assert.equal(request.method, 'POST');
    assert.equal(Object.hasOwn(request, 'apiKeyOverride'), false);
    assert.equal(Object.hasOwn(request, 'extraHeaders'), false);
    assert.equal(Object.hasOwn(request.body, 'state'), false);
    assert.equal(s.calls.filter((call) => call.type === 'provider').length, 1);
  }
});

test('legacy credential aliases and optional WhatsApp PIN preserve supported inputs', async () => {
  for (const [platform, credentials, expected] of [
    ['whatsapp', { systemUserToken: 'isolated-token', wabaId: 'waba-a', phoneNumberId: 'phone-a' }, { accessToken: 'isolated-token', wabaId: 'waba-a', phoneNumberId: 'phone-a' }],
    ['bluesky', { handle: 'isolated.bsky.social', password: 'isolated-app-password' }, { identifier: 'isolated.bsky.social', appPassword: 'isolated-app-password' }],
    ['shopify', { shop: 'isolated', accessToken: 'isolated-token', shopDomain: 'unused', adminToken: 'unused' }, { shop: 'isolated', accessToken: 'isolated-token' }],
  ]) {
    const s = sandbox();
    await s.connect(platform, credentials);
    assert.deepEqual(JSON.parse(JSON.stringify(s.calls.find((call) => call.type === 'provider').request.body)), { ...expected, profileId });
  }
});

test('tenant platform restrictions stop before profile resolution and provider mutation', async () => {
  const s = sandbox({ allowedPlatforms: ['facebook'] });
  await assert.rejects(s.connect('whatsapp', { ...controlClaims, accessToken: 'isolated-token' }), /disabled/);
  assert.deepEqual(s.calls.map((call) => call.type), ['policy']);
});

test('unsupported or simulated selection cannot change any provider profile', async () => {
  for (const [params, expected] of [
    [{ step: 'select_public_profile', entityId: 'foreign-profile', tempToken: 'authorization-token' }, 501],
    [{ step: 'select_page', entityId: 'page-a', tempToken: 'sim_forged' }, 400],
    [{ step: 'select_page', entityId: 'page-a', tempToken: '' }, 400],
    [{ step: 'select_page', entityId: '', tempToken: 'authorization-token' }, 400],
    [{ step: 'unknown', entityId: 'page-a', tempToken: 'authorization-token' }, 400],
  ]) {
    const s = sandbox();
    await assert.rejects(s.select(params), (error) => error.envelope.status === expected);
    assert.deepEqual(s.calls, []);
  }
});

test('WhatsApp selection retains the chosen WABA and the server verified profile', async () => {
  const s = sandbox();
  await s.select({ step: 'select_phone_number', entityId: 'phone-a', wabaId: 'waba-a', tempToken: 'authorization-token' });
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls.find((call) => call.type === 'provider').request)), {
    method: 'POST', path: '/connect/whatsapp/select-phone-number',
    body: { phoneNumberId: 'phone-a', profileId, tempToken: 'authorization-token', wabaId: 'waba-a' },
  });
});

test('WhatsApp selection refuses a number without its WABA before provider mutation', async () => {
  const s = sandbox();
  await assert.rejects(s.select({ step: 'select_phone_number', entityId: 'phone-a', tempToken: 'authorization-token' }), (error) => error.envelope.status === 400);
  assert.equal(s.calls.filter((call) => call.type === 'provider').length, 0);
});

test('Facebook selection forwards preserved connect token as the provider header', async () => {
  const s = sandbox();
  await s.select({ step: 'select_page', entityId: 'page-a', tempToken: 'authorization-token', connectToken: 'preserved-token', userProfile: { id: 'meta-user' } });
  const request = s.calls.find((call) => call.type === 'provider').request;
  assert.equal(request.extraHeaders['X-Connect-Token'], 'preserved-token');
  assert.equal(request.body.userProfile.id, 'meta-user');
  assert.equal(Object.hasOwn(request.body, 'connect_token'), false);
});

test('WhatsApp onboarding preserves Cloud API and coexistence choices for hosted and headless signup', async () => {
  for (const whatsappOnboarding of ['api', 'business_app']) {
    for (const whatsappSignupMode of ['hosted', 'headless']) {
      const s = sandbox(); await s.start({ whatsappOnboarding, whatsappSignupMode });
      const query = s.calls.find((call) => call.type === 'provider').request.query;
      assert.equal(query.profileId, profileId);
      assert.equal(query.onboarding, whatsappOnboarding);
      if (whatsappSignupMode === 'hosted') {
        assert.equal(query.signup, 'hosted'); assert.equal(Object.hasOwn(query, 'headless'), false);
      } else {
        assert.equal(query.headless, true); assert.equal(Object.hasOwn(query, 'signup'), false);
      }
    }
  }
});
