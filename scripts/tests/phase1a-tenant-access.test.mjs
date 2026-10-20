import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sources = new Map(Object.entries({
  oauth: 'src/lib/auth/oauth-session.ts', session: 'src/lib/auth/session.ts', access: 'src/lib/auth/tenant-access.ts',
  provider: 'src/lib/auth/tenant-provider.ts', connect: 'src/app/api/connect/route.ts',
  services: 'src/app/api/services/route.ts', core: 'src/lib/services/core-connect.service.ts',
  lifecycle: 'src/lib/accounts/lifecycle.ts',
}).map(([name, file]) => [name, ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText]));
const secret = 'isolated-private-session-signing-key';
const profileA = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const profileB = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const sessionA = () => ({
  user: { id: 'user-a', fullName: 'User A', email: 'a@example.invalid', role: 'owner' },
  tenant: { organizationId: 'tenant-a', organizationName: 'Tenant A', slug: 'a', planKey: 'starter' },
  createdAt: Date.now() - 1000, expiresAt: Date.now() + 60_000,
});
const rawSigned = (raw, key = secret) => {
  const payload = Buffer.from(raw).toString('base64');
  return `${payload}.${crypto.createHmac('sha256', key).update(payload).digest('base64url')}`;
};

function sandbox(options = {}) {
  const calls = [];
  const authCalls = [];
  const membershipState = { role: 'owner', removed: false, status: 'active', ...options.membership };
  const workspaces = new Map();
  const policy = { organizationId: 'tenant-a', organizationName: 'Tenant A', enabledSubServices: [], quotas: {}, zernioProfileId: options.savedProfile };
  const tenants = {
    'tenant-a': { organizationId: 'tenant-a', organizationName: 'Tenant A', planKey: 'starter', status: 'active', whiteLabelBranding: { companyName: 'A' }, zernioProfileId: options.savedProfile },
    'tenant-b': { organizationId: 'tenant-b', organizationName: 'Secret tenant B', planKey: 'enterprise', status: 'active', whiteLabelBranding: { companyName: 'Secret B' }, zernioProfileId: profileB },
  };
  class ZernioApiException extends Error { constructor(envelope) { super(envelope.error); this.envelope = envelope; } }
  const client = {
    isConfigured: () => options.configured !== false,
    request: async (request) => {
      calls.push({ type: 'provider', request });
      if (options.providerRequest) return options.providerRequest(request, ZernioApiException);
      return { data: { accounts: options.accounts ?? [{ _id: 'account-a', profileId: profileA, platform: 'facebook', username: 'real-a', displayName: 'Real A', isActive: true }] } };
    },
  };
  const coreStub = new Proxy({
    startHeadlessOAuth: async () => ({ authUrl: 'https://provider.invalid/authorize', simulated: false }),
    ensureTenantProfile: async (organizationId) => { calls.push({ type: 'ensure', organizationId }); return profileA; },
  }, { get: (target, key) => key in target ? target[key] : async (params) => { calls.push({ type: 'service', method: String(key), params }); return { ok: true }; } });
  const store = new Proxy({
    getWorkspace: (organizationId) => {
      calls.push({ type: 'workspace', organizationId });
      if (!workspaces.has(organizationId)) workspaces.set(organizationId, { connectedAccounts: [], posts: [], apiKeys: [], webhooks: [], apiLogs: [] });
      return workspaces.get(organizationId);
    },
    addConnectedAccount: (organizationId, account) => { calls.push({ type: 'persist', organizationId, account }); },
    removeConnectedAccount: (organizationId, accountId) => { calls.push({ type: 'remove', organizationId, accountId }); },
  }, { get: (target, key) => key in target ? target[key] : (...args) => { calls.push({ type: 'store', method: String(key), args }); return {}; } });
  function oauthQuery() {
    let updates; const filters = {};
    const query = {
      insert: async (row) => { oauthRows.set(row.id, { ...row }); return { error: null }; },
      select: () => query, update: (value) => { updates = value; return query; },
      eq: (key, value) => { filters[key] = value; return query; }, gt: () => query,
      maybeSingle: async () => {
        const row = oauthRows.get(filters.id);
        if (!row || Object.entries(filters).some(([key, value]) => row[key] !== value)) return { data: null, error: null };
        if (updates) Object.assign(row, updates);
        return { data: { ...row }, error: null };
      },
    };
    return query;
  }
  const oauthRows = new Map();
  const modules = {};
  const context = vm.createContext({
    Buffer, Date, URL, TextEncoder, TextDecoder, console,
    process: { env: { SESSION_SECRET: Object.hasOwn(options, 'secret') ? options.secret : secret, NEXT_PUBLIC_APP_URL: 'https://isolated.invalid' } },
    fetch: () => { throw new Error('Network denied in tenant tests'); },
  });
  function load(name) {
    if (modules[name]) return modules[name];
    const module = { exports: {} };
    const require = (specifier) => {
      const mapped = { '@/lib/auth/oauth-session': 'oauth', '@/lib/auth/session': 'session', '@/lib/auth/tenant-access': 'access', '@/lib/auth/tenant-provider': 'provider' }[specifier];
      if (mapped) return load(mapped);
      if (specifier === '@/lib/accounts/lifecycle') return load('lifecycle');
      if (specifier === '@/lib/inbox/actions') return { runInboxReply: async (organizationId, params) => {
        calls.push({ type: 'service', method: 'sendConversationReply', params: { organizationId, ...params } });
        return { httpStatus: 200, ok: true };
      } };
      if (specifier === 'node:crypto') return crypto;
      if (specifier === '@/lib/saas/auth') return { verifyCurrentSession: async () => {} }; // Persistence covered in launch-saas, real membership checks below.
      if (specifier === '@/lib/saas/api-keys') return { SaasApiKeyService: {create:async params=>{calls.push({type:'durable-key',params});return{token:'asra3_new_key_once'};}} };
      if (specifier === '@/lib/launch/availability') return { unavailableServiceAction: () => null };
      if (specifier === '@/lib/phone-lifecycle/actions') return { runPhoneLifecycleAction: async (organizationId,action,input) => { calls.push({type:'service',method:action,params:{organizationId,...input}}); return {ok:true}; } };

      if (specifier === '@/lib/telephony/phone-numbers') return { getOwnedPhoneNumberForWhatsApp: async () => { throw new Error('No purchased number fixture'); } };
      if (specifier === 'next/server') return { NextResponse: { json: (value, init) => Response.json(value, init) } };
      if (specifier === '@/lib/services/core-connect.service') return { CoreConnectService: coreStub };
      if (specifier === '@/lib/services/publishing.service') return { PublishingService: {
        createPost: async (params) => {
          calls.push({ type: 'publish', params });
          if (options.publishError) throw new ZernioApiException(options.publishError);
          return options.publishResult ?? { simulated: false, httpStatus: 201, post: { _id: 'post-a', status: 'published', platforms: [{ accountId: 'account-a', status: 'published' }] } };
        },
      } };
      if (specifier === '@/lib/storage/workspace-store') return { WorkspaceStore: store };
      if (specifier === '@/lib/zernio/client') return { zernioClient: client, ZernioApiException, ZernioClient: { newIdempotencyKey: (name) => name } };
      if (specifier === '@/lib/zernio/policy-engine') return {
        getFallbackStore: () => ({ tenants }),
        resolveEffectiveTenantPolicy: async (organizationId) => { calls.push({ type: 'policy', organizationId }); return policy; },
        assertSubServiceAllowed: async (organizationId) => { calls.push({ type: 'policy', organizationId }); return policy; },
        resolveConnectScopesParam: () => '',
      };
      if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => {
        if (Object.hasOwn(options, 'supabase')) return options.supabase;
        return { from: (table) => table === 'oauth_sessions' ? oauthQuery() : ({
          update: () => ({ eq: async () => ({ error: null }) }),
          select: () => {
            const filters = {};
            const query = {
              eq: (key, value) => { filters[key] = value; return query; },
              maybeSingle: async () => {
                authCalls.push({ table, filters });
                if (membershipState.throwDb) throw new Error('Isolated membership database failure');
                if (membershipState.dbError) return { data: null, error: { message: 'Isolated database failure' } };
                assert.ok(['org_members', 'organizations'].includes(table));
                if (table === 'org_members') {
                  assert.deepEqual(filters, { user_id: 'user-a', organization_id: 'tenant-a' });
                  return { data: membershipState.removed ? null : { user_id: 'user-a', organization_id: 'tenant-a', role: membershipState.role }, error: null };
                }
                assert.deepEqual(filters, { id: 'tenant-a' });
                return { data: { id: 'tenant-a', status: membershipState.status }, error: null };
              },
            };
            return query;
          },
        }) };
      } };
      if (specifier.startsWith('@/lib/services/')) return new Proxy({}, {
        get: (_, key) => key === '__esModule' ? false : new Proxy({}, { get: (_, method) => async (params) => { calls.push({ type: 'service', method: String(method), params }); return { ok: true }; } }),
      });
      throw new Error(`Module denied in tenant tests: ${specifier}`);
    };
    vm.runInContext(`(function(require,module,exports) {\n${sources.get(name)}\n})`, context)(require, module, module.exports);
    modules[name] = module.exports;
    return module.exports;
  }
  const session = load('session');
  const cookie = (value = sessionA()) => `asra3_session=${session.encodeSession(value)}`;
  const send = async (route, method, { body, query = '', cookie: sessionCookie, headers = {} } = {}) => {
    const requestHeaders = new Headers(headers);
    if (sessionCookie) requestHeaders.set('cookie', sessionCookie);
    const req = new Request(`https://isolated.invalid/api/${route}${query}`, { method, headers: requestHeaders, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const handler = load(route)[method];
    assert.ok(handler, `${route} does not export ${method}`);
    const response = await handler(req);
    return { status: response.status, body: await response.json() };
  };
  return { session, cookie, send, calls, authCalls, membershipState, workspaces, load, tenants, ZernioApiException };
}

test('anonymous connect POST and services GET/POST stop before any dispatch', async () => {
  const s = sandbox();
  for (const [route, method] of [['connect', 'POST'], ['services', 'POST'], ['services', 'GET']]) {
    assert.equal((await s.send(route, method, { body: method === 'GET' ? undefined : '{invalid' })).status, 401);
  }
  assert.deepEqual(s.calls, []);
});

test('signed tenant A cannot request tenant B through query or body', async () => {
  const s = sandbox();
  const cookie = s.cookie();
  assert.equal((await s.send('services', 'GET', { cookie, query: '?organizationId=tenant-b' })).status, 403);
  for (const route of ['connect', 'services']) assert.equal((await s.send(route, 'POST', { cookie, body: { organizationId: 'tenant-b', action: 'check_health' } })).status, 403);
  assert.deepEqual(s.calls, []);
});

test('own tenant session dispatches and cannot see another tenant directory', async () => {
  const s = sandbox();
  const cookie = s.cookie();
  const response = await s.send('services', 'GET', { cookie });
  assert.equal(response.status, 200);
  assert.equal(response.body.availableTenants.length, 1);
  assert.equal(response.body.availableTenants[0].organizationId, 'tenant-a');
  assert.ok(!JSON.stringify(response.body).includes('Secret tenant B'));
  assert.equal((await s.send('connect', 'POST', { cookie, body: { action: 'check_health' } })).status, 200);
  assert.ok(s.calls.some((call) => call.type === 'service' && call.params === 'tenant-a'));
  assert.ok(s.calls.every((call) => !call.organizationId || call.organizationId === 'tenant-a'));
});

test('malformed signed sessions, nonfinite expiry, unknown role and absent tenant fail', async () => {
  const s = sandbox();
  const now = Date.now();
  const invalid = [null, [], {}, { ...sessionA(), user: {} }, { ...sessionA(), user: { id: 'a', role: 'admin' } },
    { ...sessionA(), tenant: undefined }, { ...sessionA(), tenant: {} }, { ...sessionA(), expiresAt: now - 1 },
    { ...sessionA(), expiresAt: '9999999999999' }, { ...sessionA(), expiresAt: null }];
  for (const value of invalid) assert.equal(s.session.decodeSession(rawSigned(JSON.stringify(value))), null);
  const nonfinite = JSON.stringify(sessionA()).replace(/"expiresAt":\d+/, '"expiresAt":1e999');
  assert.equal(s.session.decodeSession(rawSigned(nonfinite)), null);
  for (const cookie of ['asra3_session=invalid', 'asra3_session=%zz', `asra3_session=${rawSigned(JSON.stringify(sessionA()), 'wrong-key')}`]) {
    assert.equal((await s.send('connect', 'POST', { cookie, body: { action: 'check_health' } })).status, 401);
  }
  assert.deepEqual(s.calls, []);
});

test('missing or old public SESSION_SECRET refuses signing and authentication', async () => {
  for (const key of [undefined, '', '   ', 'asra3_secure_session_secret_2026']) {
    const s = sandbox({ secret: key });
    assert.throws(() => s.session.encodeSession(sessionA()), /SESSION_SECRET/);
    assert.equal(s.session.decodeSession(rawSigned(JSON.stringify(sessionA()), key || secret)), null);
    assert.equal((await s.send('services', 'GET', { cookie: `asra3_session=${rawSigned(JSON.stringify(sessionA()), key || secret)}` })).status, 401);
    assert.deepEqual(s.calls, []);
  }
});

test('cross-origin mutations and external OAuth callbacks are rejected before dispatch', async () => {
  const s = sandbox();
  const cookie = s.cookie();
  for (const route of ['connect', 'services']) {
    assert.equal((await s.send(route, 'POST', { cookie, headers: { origin: 'https://foreign.invalid' }, body: { action: 'check_health' } })).status, 403);
  }
  assert.equal((await s.send('connect', 'POST', { cookie, body: { action: 'start_oauth', platform: 'facebook', redirectUrl: 'https://foreign.invalid/callback' } })).status, 400);
  assert.deepEqual(s.calls, []);
});

test('false callbacks and foreign provider accounts never persist', async () => {
  for (const accounts of [[], [{ _id: 'claimed', profileId: profileB, platform: 'facebook', isActive: true }], [{ _id: 'claimed', profileId: { _id: profileB }, platform: 'facebook', isActive: true }]]) {
    const s = sandbox({ accounts });
    const response = await s.send('connect', 'POST', { cookie: s.cookie(), body: { action: 'complete_oauth_callback', accountId: 'claimed', platform: 'facebook', displayName: 'Forged name' } });
    assert.equal(response.status, 400);
    assert.ok(s.calls.every((call) => call.type !== 'persist'));
  }
  const s = sandbox();
  assert.equal((await s.send('connect', 'POST', { cookie: s.cookie(), body: { action: 'complete_oauth_callback', accountId: 'account-a', platform: 'whatsapp' } })).status, 400);
  assert.ok(s.calls.every((call) => call.type !== 'persist'));
});

test('valid callback uses provider identity and ignores browser success claims', async () => {
  const s = sandbox();
  const callbackCookie = s.cookie();
  const started = await s.send('connect', 'POST', { cookie: callbackCookie, body: { action: 'start_oauth', platform: 'facebook' } });
  const response = await s.send('connect', 'POST', { cookie: callbackCookie, body: { action: 'complete_oauth_callback', oauthSessionId: started.body.oauthSessionId, profileId: profileA, accountId: 'account-a', platform: 'facebook', username: 'forged', displayName: 'forged', status: 'healthy' } });
  assert.equal(response.status, 200);
  const persisted = s.calls.find((call) => call.type === 'persist');
  assert.equal(persisted.organizationId, 'tenant-a');
  assert.equal(persisted.account.username, 'real-a');
  assert.equal(persisted.account.status, 'active');
});

test('connection test reports only the provider post identity and publication evidence', async () => {
  const s = sandbox();
  const response = await s.send('connect', 'POST', { cookie: s.cookie(), headers: { 'idempotency-key': 'stable-test-intent' }, body: { action: 'test_post', accountId: 'account-a', platform: 'facebook', content: 'Test' } });
  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.deliveryReceipt.status, 'published');
  assert.equal(response.body.deliveryReceipt.receiptId, 'post-a');
  for (const invented of ['platformPostUrl', 'deliveredAt', 'latencyMs', 'healthStatus', 'tokenExpiresInDays']) {
    assert.equal(Object.hasOwn(response.body.deliveryReceipt, invented), false);
  }
  assert.equal(s.calls.filter((call) => call.type === 'publish').length, 1);
  assert.equal(s.calls.find((call) => call.type === 'publish').params.idempotencyKey, 'stable-test-intent');
  assert.equal(response.body.post._id, 'post-a');
});

test('pending, failed, partial and invalid provider results cannot claim publication', async () => {
  for (const [result, expected] of [
    [{ simulated: false, httpStatus: 202, post: { _id: 'post-a', status: 'scheduled' } }, 202],
    [{ simulated: false, httpStatus: 201, post: { _id: 'post-a', status: 'failed' } }, 201],
    [{ simulated: false, httpStatus: 207, post: { _id: 'post-a', status: 'partial' } }, 207],
    [{ simulated: false, httpStatus: 201, post: { _id: 'post-a', status: 'published', platforms: [{ accountId: 'account-a', status: 'failed' }] } }, 201],
    [{ simulated: true, post: { _id: 'fake', status: 'published' } }, 502],
    [{ simulated: false, post: {} }, 502],
  ]) {
    const s = sandbox({ publishResult: result });
    const response = await s.send('connect', 'POST', { cookie: s.cookie(), body: { action: 'test_post', accountId: 'account-a', platform: 'facebook' } });
    assert.equal(response.status, expected);
    assert.notEqual(response.body.success, true);
    assert.ok(!JSON.stringify(response.body).includes('confirmed publication'));
  }
  const s = sandbox({ publishError: { status: 429, error: 'Rate limit' } });
  assert.equal((await s.send('connect', 'POST', { cookie: s.cookie(), body: { action: 'test_post', accountId: 'account-a', platform: 'facebook' } })).status, 429);
});

test('messaging tests, inactive accounts and platform mismatches never publish or manufacture receipts', async () => {
  for (const [account, platform, expected] of [
    [{ platform: 'whatsapp', isActive: true }, 'whatsapp', 501],
    [{ platform: 'facebook', isActive: false }, 'facebook', 409],
    [{ platform: 'facebook', isActive: true, needsReconnection: true }, 'facebook', 409],
    [{ platform: 'facebook', isActive: true }, 'whatsapp', 400],
  ]) {
    const s = sandbox({ accounts: [{ _id: 'account-a', profileId: profileA, ...account }] });
    const response = await s.send('connect', 'POST', { cookie: s.cookie(), body: { action: 'test_post', accountId: 'account-a', platform } });
    assert.equal(response.status, expected);
    assert.equal(response.body.deliveryReceipt, undefined);
    assert.equal(s.calls.filter((call) => call.type === 'publish').length, 0);
  }
});

test('service actions reject a foreign provider account before downstream dispatch', async () => {
  const s = sandbox({ accounts: [{ _id: 'foreign', profileId: profileB, platform: 'facebook', isActive: true }] });
  const response = await s.send('services', 'POST', { cookie: s.cookie(), body: { subService: 'publishing', action: 'create_post', content: 'test', platforms: [{ platform: 'facebook', accountId: 'foreign' }] } });
  assert.equal(response.status, 403);
  assert.ok(s.calls.every((call) => call.type !== 'service' && call.type !== 'persist'));
});

test('provider profile failures never persist invented tenant mappings', async () => {
  for (const scenario of ['unconfigured', 'outage', 'invalid-id', 'saved-foreign']) {
    const s = sandbox({
      configured: scenario !== 'unconfigured', savedProfile: scenario === 'saved-foreign' ? profileB : undefined,
      providerRequest: async (_, Exception) => {
        if (scenario === 'outage') throw new Exception({ status: 503, error: 'Provider outage' });
        return { data: { profile: scenario === 'saved-foreign' ? { _id: profileB, externalId: 'tenant-b' } : { _id: 'invented-profile', externalId: 'tenant-a' } } };
      },
    });
    const before = JSON.stringify(s.tenants);
    await assert.rejects(s.load('core').CoreConnectService.ensureTenantProfile('tenant-a'));
    assert.equal(JSON.stringify(s.tenants), before);
  }
});

test('disconnect id alias cannot bypass provider account ownership', async () => {
  const s = sandbox({ accounts: [{ _id: 'foreign', profileId: profileB, platform: 'facebook', isActive: true }] });
  const response = await s.send('services', 'POST', { cookie: s.cookie(), body: { subService: 'core_connect', action: 'disconnect_account', id: 'foreign' } });
  assert.equal(response.status, 403);
  assert.ok(s.calls.every((call) => call.type !== 'remove'));
});

test('newly returned profile must belong to the tenant before mapping is persisted', async () => {
  const s = sandbox({ providerRequest: async () => ({ data: { profile: { _id: profileB, externalId: 'tenant-b' } } }) });
  const before = JSON.stringify(s.tenants);
  await assert.rejects(s.load('core').CoreConnectService.ensureTenantProfile('tenant-a'));
  assert.equal(JSON.stringify(s.tenants), before);
});

test('conflict profile is verified against the intended tenant before reuse', async () => {
  const s = sandbox({ providerRequest: async (request, Exception) => {
    if (request.method === 'POST') throw new Exception({ status: 409, error: 'Conflict', code: 'profile_external_id_conflict', details: { existingProfileId: profileB } });
    return { data: { profile: { _id: profileB, externalId: 'tenant-b' } } };
  } });
  const before = JSON.stringify(s.tenants);
  await assert.rejects(s.load('core').CoreConnectService.ensureTenantProfile('tenant-a'));
  assert.equal(JSON.stringify(s.tenants), before);
});

test('provider-disabled callback and simulated authorization token cannot persist', async () => {
  const disabled = sandbox({ configured: false });
  assert.equal((await disabled.send('connect', 'POST', { cookie: disabled.cookie(), body: { action: 'complete_oauth_callback', accountId: 'account-a', platform: 'facebook' } })).status, 503);
  assert.deepEqual(disabled.calls, []);
  const s = sandbox();
  assert.equal((await s.send('connect', 'POST', { cookie: s.cookie(), body: { action: 'select_entity', platform: 'facebook', tempToken: 'sim_forged' } })).status, 400);
  assert.deepEqual(s.calls, []);
});

test('verified profile creation and conflict recovery persist the exact provider mapping', async () => {
  for (const conflict of [false, true]) {
    const s = sandbox({ providerRequest: async (request, Exception) => {
      if (conflict && request.method === 'POST') throw new Exception({ status: 409, error: 'Conflict', code: 'profile_external_id_conflict', details: { existingProfileId: profileA } });
      return { data: { profile: { _id: profileA, name: 'Tenant A', externalId: 'tenant-a' } } };
    } });
    assert.equal(await s.load('core').CoreConnectService.ensureTenantProfile('tenant-a'), profileA);
    assert.equal(s.tenants['tenant-a'].zernioProfileId, profileA);
    assert.equal(s.tenants['tenant-b'].zernioProfileId, profileB);
  }
});

test('profile mapping database failure prevents fallback persistence', async () => {
  const s = sandbox({
    providerRequest: async () => ({ data: { profile: { _id: profileA, name: 'Tenant A', externalId: 'tenant-a' } } }),
    supabase: { from: () => ({ update: () => ({ eq: async () => ({ error: { message: 'Isolated database failure' } }) }) }) },
  });
  const before = JSON.stringify(s.tenants);
  await assert.rejects(s.load('core').CoreConnectService.ensureTenantProfile('tenant-a'), /save/);
  assert.equal(JSON.stringify(s.tenants), before);
});

test('removed membership, inactive workspaces, and unknown current roles deny all tenant entry points before effects', async () => {
  for (const membership of [{ removed: true }, { status: 'suspended' }, { status: 'Archived' }, { status: 'past_due' }, { role: 'member' }]) {
    const s = sandbox({ membership });
    const cookie = s.cookie();
    for (const [route, method, body] of [
      ['services', 'GET', undefined], ['services', 'POST', { subService: 'support_ai', action: 'create_api_key' }],
      ['connect', 'POST', { action: 'start_oauth', platform: 'facebook' }],
    ]) assert.equal((await s.send(route, method, { cookie, body })).status, 403);
    assert.deepEqual(s.calls, []);
    assert.ok(s.authCalls.some((call) => call.table === 'org_members'));
  }
});

test('missing configuration and failed membership database checks fail closed before tenant effects', async () => {
  for (const options of [{ supabase: null }, { membership: { dbError: true } }, { membership: { throwDb: true } }]) {
    const s = sandbox(options);
    const cookie = s.cookie();
    for (const [route, method, body] of [
      ['services', 'GET', undefined], ['services', 'POST', { subService: 'support_ai', action: 'create_api_key' }],
      ['connect', 'POST', { action: 'start_oauth', platform: 'facebook' }],
    ]) assert.equal((await s.send(route, method, { cookie, body })).status, 503);
    assert.deepEqual(s.calls, []);
  }
});

test('current editor and viewer roles cannot read full credentials or manage keys, webhooks, billing, or connections', async () => {
  for (const role of ['editor', 'viewer']) {
    const s = sandbox({ membership: { role } });
    // Even a cookie issued while this user was an owner must use the current role.
    const cookie = s.cookie();
    s.workspaces.set('tenant-a', {
      connectedAccounts: [], posts: [], apiKeys: [{ token: 'tk_live_private_full_access', scopes: ['full_access'] }],
      webhooks: [{ secret: 'private-webhook-secret' }], apiLogs: [{ requestSummary: 'private-log' }], wallet: { balanceUsd: 999 },
    });
    const loaded = await s.send('services', 'GET', { cookie });
    assert.equal(loaded.status, 200);
    assert.deepEqual(loaded.body.subServicesData.developerHub, { apiKeys: [], webhooks: [], apiLogs: [], wallet: null,legacyTools:'retired',customerPayments:'coming_soon',settingsEndpoint:'/api/saas',canManage:false });
    assert.ok(!JSON.stringify(loaded.body).includes('private'));
    s.calls.length = 0;
    for (const action of ['create_api_key', 'roll_api_key', 'revoke_api_key', 'delete_api_key', 'create_webhook', 'delete_webhook', 'test_webhook', 'topup_wallet']) {
      assert.equal((await s.send('services', 'POST', { cookie, body: { subService: 'support_ai', action, scopes: ['full_access'], keyId: 'key-a' } })).status, 403);
    }
    assert.equal((await s.send('services', 'POST', { cookie, body: { subService: 'core_connect', action: 'disconnect_account', accountId: 'account-a' } })).status, 403);
    for (const action of ['start_oauth', 'connect_credentials', 'select_entity', 'list_entities', 'complete_oauth_callback', 'disconnect']) {
      assert.equal((await s.send('connect', 'POST', { cookie, body: { action, platform: 'facebook', accountId: 'account-a' } })).status, 403);
    }
    assert.deepEqual(s.calls, []);
  }
});

test('editors can publish and reply while viewers cannot mutate even after an owner cookie was issued', async () => {
  const s = sandbox({ membership: { role: 'editor' } });
  const cookie = s.cookie();
  const publish = { subService: 'publishing', action: 'create_post', content: 'test', platforms: [{ accountId: 'account-a', platform: 'facebook' }] };
  const reply = { subService: 'inbox_crm', action: 'send_reply', conversationId: 'conversation-a', accountId: 'account-a', message: 'Hello' };
  assert.equal((await s.send('services', 'POST', { cookie, body: publish })).status, 201);
  assert.equal((await s.send('services', 'POST', { cookie, body: reply })).status, 200);
  assert.ok(s.calls.some((call) => call.type === 'publish'));
  assert.ok(s.calls.some((call) => call.method === 'sendConversationReply'));
  s.membershipState.role = 'viewer';
  s.calls.length = 0;
  for (const body of [publish, reply]) assert.equal((await s.send('services', 'POST', { cookie, body })).status, 403);
  assert.equal((await s.send('connect', 'POST', { cookie, body: { action: 'test_post', accountId: 'account-a', platform: 'facebook' } })).status, 403);
  assert.deepEqual(s.calls, []);
});

test('current owners and admins retain credential management and full developer visibility', async () => {
  for (const role of ['owner', 'admin']) {
    const s = sandbox({ membership: { role } });
    const value = sessionA();
    value.user.role = 'member';
    const cookie = s.cookie(value);
    s.workspaces.set('tenant-a', { connectedAccounts: [], posts: [], apiKeys: [{ token: 'private-owner-key' }], webhooks: [], apiLogs: [] });
    const loaded = await s.send('services', 'GET', { cookie });
    assert.equal(loaded.status, 200);
    assert.deepEqual(loaded.body.subServicesData.developerHub.apiKeys, []);assert.equal(loaded.body.subServicesData.developerHub.canManage,true);assert.ok(!JSON.stringify(loaded.body).includes('private-owner-key'));
    assert.equal((await s.send('services', 'POST', { cookie, body: { subService: 'support_ai', action: 'create_api_key', scopes: ['full_access'] } })).status, 200);
    assert.ok(s.calls.some((call) => call.type === 'durable-key'));
    assert.equal((await s.send('connect', 'POST', { cookie, body: { action: 'start_oauth', platform: 'facebook' } })).status, 200);
  }
});

test('membership removed after a successful request invalidates the same unexpired signed cookie', async () => {
  const s = sandbox();
  const cookie = s.cookie();
  assert.equal((await s.send('services', 'GET', { cookie })).status, 200);
  s.membershipState.removed = true;
  s.calls.length = 0;
  assert.equal((await s.send('services', 'GET', { cookie })).status, 403);
  assert.equal((await s.send('connect', 'POST', { cookie, body: { action: 'check_health' } })).status, 403);
  assert.deepEqual(s.calls, []);
});

test('only the fixed signed platform administrator identity bypasses tenant membership checks', async () => {
  const s = sandbox({ supabase: null });
  const value = sessionA();
  value.user.role = 'super_admin';
  assert.equal((await s.send('services', 'GET', { cookie: s.cookie(value) })).status, 403);
  value.user.id = 'usr_super_admin';
  assert.equal((await s.send('services', 'GET', { cookie: s.cookie(value) })).status, 403);
  value.tenant.organizationId = 'org_admin_platform'; // A fixed identity alone is insufficient: current credential fingerprint is mandatory.
  assert.equal((await s.send('connect', 'POST', { cookie: s.cookie(value), body: { action: 'start_oauth', platform: 'facebook' } })).status, 401);
  assert.deepEqual(s.authCalls, []);
});
