import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test, { before, after } from 'node:test';
import ts from 'typescript';

// Phase 3A — TikTok connection through Zernio's real OAuth flow (GET /v1/connect/tiktok), bound to the
// server-side oauth_sessions record exactly like Facebook/Instagram.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const transpile = file => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const profileId = '66a1f0c2a4b9d3e8f1a2b3c4', tiktokId = '66b1f0c2a4b9d3e8f1a2b3d1';
let server, origin, calls = [], accountPatch = {};

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1'), p = url.pathname.replace(/^\/api\/v1/, '');
    calls.push({ method: req.method, path: p, query: Object.fromEntries(url.searchParams) });
    res.setHeader('Content-Type', 'application/json');
    if (p.startsWith('/profiles/')) return res.end(JSON.stringify({ profile: { _id: profileId, externalId: 'tenant-a' } }));
    if (p === '/accounts') return res.end(JSON.stringify({ accounts: [{ _id: tiktokId, platform: 'tiktok', profileId, username: 'asra3brand', platformUserId: 'open-id-developer-app', isActive: true, ...accountPatch }] }));
    if (p === '/connect/tiktok') return res.end(JSON.stringify({ authUrl: 'https://www.tiktok.com/v2/auth/authorize?client_key=phase3a', state: 'provider-state' }));
    res.statusCode = 404; res.end(JSON.stringify({ error: `Unexpected ${p}` }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

function coreRuntime({ allowedPlatforms = ['facebook', 'instagram', 'tiktok'] } = {}) {
  const sources = { core: transpile('src/lib/services/core-connect.service.ts'), client: transpile('src/lib/zernio/client.ts'), lifecycle: transpile('src/lib/accounts/lifecycle.ts'), accounts: transpile('src/lib/auth/tenant-provider.ts') };
  const reserved = [], cache = {};
  class TenantAccessError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const context = vm.createContext({ Buffer, URL, Date, console, AbortController, setTimeout, clearTimeout, Headers, Response, Request,
    process: { env: { ZERNIO_BASE_URL: `${origin}/api/v1`, ZERNIO_API_KEY: 'phase3a_oauth_provider_key' } },
    fetch: (url, options) => { assert.equal(new URL(url).origin, origin, 'Live network forbidden'); return fetch(url, options); } });
  function load(name) {
    if (cache[name]) return cache[name];
    const module = { exports: {} }; cache[name] = module.exports;
    const require = specifier => {
      const alias = { '@/lib/services/core-connect.service': 'core', '@/lib/zernio/client': 'client', '@/lib/accounts/lifecycle': 'lifecycle', '@/lib/auth/tenant-provider': 'accounts' }[specifier];
      if (alias) return load(alias);
      if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
      if (specifier === '@/lib/billing/connections') return { reserveConnectionCapacity: async (...args) => { reserved.push(args); } };
      if (specifier === '@/lib/auth/tenant-access') return { TenantAccessError };
      if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => null };
      if (specifier === '@/lib/storage/workspace-store') return { WorkspaceStore: { removeConnectedAccount: () => {} } };
      if (specifier === '@/lib/zernio/policy-engine') return { getFallbackStore: () => ({ globalConfig: {}, tenants: {} }),
        assertSubServiceAllowed: async org => ({ organizationId: org, organizationName: 'Tenant A', status: 'active', planKey: 'starter', zernioProfileId: profileId, allowedPlatforms, allowedOAuthScopes: ['posting', 'analytics'], enforceHeadlessOAuth: true, quotas: { maxConnectedAccounts: 3 } }),
        resolveConnectScopesParam: (_policy, _platform, scopes) => (scopes || ['posting', 'analytics']).filter(s => ['posting', 'analytics'].includes(s)).join(',') };
      throw new Error(`Unexpected dependency ${specifier}`);
    };
    vm.runInContext(`(function(require,module,exports){${sources[name]}\n})`, context)(require, module, module.exports); return module.exports;
  }
  return { core: load('core').CoreConnectService, lifecycle: load('lifecycle'), reserved };
}

test('TikTok OAuth start uses the tenant Zernio profile, policy scopes and connection capacity', async () => {
  calls = []; accountPatch = {};
  const { core, reserved } = coreRuntime();
  const redirectUrl = 'https://asra3.com/dashboard?asra3_oauth_state=' + 'a'.repeat(64) + '&platform=tiktok';
  const result = await core.startHeadlessOAuth({ organizationId: 'tenant-a', platform: 'tiktok', redirectUrl, requestedScopes: ['posting', 'analytics', 'comments', 'messaging'] });
  const connect = calls.find(call => call.path === '/connect/tiktok');
  assert.equal(connect.query.profileId, profileId); assert.equal(connect.query.redirect_url, redirectUrl);
  assert.equal(connect.query.headless, 'true'); assert.equal(connect.query.scopes, 'posting,analytics');
  assert.equal(connect.query.loginMethod, undefined);
  assert.deepEqual(reserved, [['tenant-a', profileId, 'tiktok']]);
  assert.equal(result.simulated, false); assert.match(result.authUrl, /^https:\/\/www\.tiktok\.com\//);
});

test('TikTok OAuth is refused when the plan or administrator disables TikTok', async () => {
  calls = [];
  const { core, reserved } = coreRuntime({ allowedPlatforms: ['facebook', 'instagram'] });
  await assert.rejects(core.startHeadlessOAuth({ organizationId: 'tenant-a', platform: 'tiktok', redirectUrl: 'https://asra3.com/dashboard' }), /disabled/);
  assert.equal(calls.some(call => call.path === '/connect/tiktok'), false); assert.equal(reserved.length, 0);
});

test('TikTok reconnect skips new capacity and matches by @handle, not the per-app open_id', async () => {
  calls = []; accountPatch = {};
  const { core, lifecycle, reserved } = coreRuntime();
  const identity = await lifecycle.verifyReconnectIdentity('tenant-a', tiktokId, 'tiktok');
  assert.equal(identity.reconnectAccountId, tiktokId); assert.equal(identity.expectedPlatformUserId, undefined);
  await core.startHeadlessOAuth({ organizationId: 'tenant-a', platform: 'tiktok', redirectUrl: 'https://asra3.com/dashboard', reconnectAccountId: tiktokId });
  assert.equal(reserved.length, 0);
  accountPatch = { username: '' };
  await assert.rejects(lifecycle.verifyReconnectIdentity('tenant-a', tiktokId, 'tiktok'), e => e.status === 409 && /@handle/.test(e.message));
  accountPatch = { platform: 'instagram' };
  await assert.rejects(lifecycle.verifyReconnectIdentity('tenant-a', tiktokId, 'tiktok'), e => e.status === 400);
  accountPatch = {};
});

// --- oauth_sessions binding (same sandbox approach as phase1d-accounts-oauth) ---
const sessionSource = transpile('src/lib/auth/oauth-session.ts');
const session = () => ({ user: { id: 'user-a' }, tenant: { organizationId: 'tenant-a' }, expiresAt: Date.now() + 60_000 });
const request = (cookie = 'asra3_session=private-signature-a') => new Request('https://asra3.com/api/connect', { method: 'POST', headers: { cookie } });
function sandbox(options = {}) {
  const rows = new Map(), calls = [], persisted = [], usernames = [...(options.usernames || ['asra3brand'])];
  class TenantAccessError extends Error { constructor(status, message) { super(message); this.status = status; } }
  class ZernioApiException extends Error { constructor(envelope) { super(envelope.error); this.envelope = envelope; } }
  const db = { from: (table) => {
    assert.equal(table, 'oauth_sessions');
    let patch; const filters = {}; let expiry;
    const query = { insert: async (row) => { rows.set(row.id, { ...row }); return { error: null }; },
      select: () => query, eq: (key, value) => { filters[key] = value; return query; }, gt: (_, value) => { expiry = value; return query; }, update: (value) => { patch = value; return query; },
      maybeSingle: async () => { const row = rows.get(filters.id);
        if (!row || Object.entries(filters).some(([key, value]) => row[key] !== value) || expiry && row.expires_at <= expiry) return { data: null, error: null };
        if (patch) Object.assign(row, patch); return { data: { ...row }, error: null }; } };
    return query; } };
  const modules = {
    'node:crypto': crypto,
    '@/lib/accounts/lifecycle': { verifyReconnectIdentity: async (_org, id, platform) => { calls.push({ action: 'verify-reconnect', platform }); return { reconnectAccountId: id, expectedPlatformUserId: undefined }; } },
    '@/lib/auth/session': { SESSION_SECRET: 'private-isolated-oauth-signing-secret', SESSION_COOKIE_NAME: 'asra3_session' },
    '@/lib/auth/tenant-access': { TenantAccessError }, '@/lib/zernio/client': { ZernioApiException },
    '@/lib/telephony/phone-numbers': { getOwnedPhoneNumberForWhatsApp: async () => { throw new Error('not used'); } },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => db },
    '@/lib/services/core-connect.service': { CoreConnectService: {
      ensureTenantProfile: async () => profileId,
      startHeadlessOAuth: async (params) => { calls.push({ action: 'start', params }); return { authUrl: 'https://www.tiktok.com/v2/auth/authorize?client_key=phase3a', simulated: false }; } } },
    '@/lib/storage/workspace-store': { WorkspaceStore: { addConnectedAccount: (...args) => persisted.push(args) } },
    '@/lib/auth/tenant-provider': { requireTenantAccounts: async (_org, ids) => { calls.push({ action: 'verify', ids });
      const username = usernames.length > 1 ? usernames.shift() : usernames[0];
      return [{ _id: tiktokId, platform: 'tiktok', profileId, platformUserId: 'open-id-business-app', username, displayName: 'Asra3 Brand', isActive: true }]; } },
  };
  const exports = {};
  vm.runInNewContext(`(function(require,exports) {\n${sessionSource}\n})`, { Date, Buffer, URL, process: { env: { NEXT_PUBLIC_APP_URL: 'https://asra3.com' } } })((name) => { assert.ok(modules[name], `Denied module: ${name}`); return modules[name]; }, exports);
  return { ...exports, rows, calls, persisted };
}

test('TikTok OAuth session is bound to tenant, user, sign-in cookie and profile, then consumed once', async () => {
  const s = sandbox();
  const started = await s.startOAuthSession(request(), session(), { platform: 'tiktok', requestedScopes: ['posting'] });
  const row = s.rows.get(started.oauthSessionId);
  assert.equal(row.platform, 'tiktok'); assert.equal(row.profile_id, profileId); assert.equal(row.organization_id, 'tenant-a'); assert.equal(row.user_id, 'user-a');
  assert.equal(row.session_hash, crypto.createHash('sha256').update('asra3_session=private-signature-a').digest('hex'));
  const redirect = new URL(row.redirect_url);
  assert.equal(redirect.searchParams.get('asra3_oauth_state'), started.oauthSessionId); assert.equal(redirect.searchParams.get('platform'), 'tiktok');
  const start = s.calls.find(call => call.action === 'start');
  assert.equal(start.params.organizationId, 'tenant-a'); assert.equal(start.params.redirectUrl, row.redirect_url); assert.equal(start.params.platform, 'tiktok');
  assert.match(started.authUrl, /^https:\/\/www\.tiktok\.com\//);
  await assert.rejects(s.acceptOAuthCallback(request('asra3_session=other-sign-in'), session(), { oauthSessionId: started.oauthSessionId, platform: 'tiktok', profileId, connected: 'tiktok', accountId: tiktokId }), e => e.status === 403);
  await assert.rejects(s.acceptOAuthCallback(request(), session(), { oauthSessionId: started.oauthSessionId, platform: 'tiktok', profileId: '77a1f0c2a4b9d3e8f1a2b3c4', accountId: tiktokId }), e => e.status === 403);
  const done = await s.acceptOAuthCallback(request(), session(), { oauthSessionId: started.oauthSessionId, platform: 'tiktok', profileId, connected: 'tiktok', accountId: tiktokId, username: 'asra3brand' });
  assert.equal(done.success, true); assert.equal(done.account.platform, 'tiktok'); assert.equal(done.account.accountId, tiktokId);
  assert.equal(s.rows.get(started.oauthSessionId).status, 'consumed'); assert.equal(s.persisted.length, 1);
  await assert.rejects(s.acceptOAuthCallback(request(), session(), { oauthSessionId: started.oauthSessionId, platform: 'tiktok', profileId, accountId: tiktokId }), e => e.status === 409);
});

test('missing TikTok permissions are reported in TikTok terms and fail the session', async () => {
  const s = sandbox();
  const started = await s.startOAuthSession(request(), session(), { platform: 'tiktok' });
  await assert.rejects(s.acceptOAuthCallback(request(), session(), { oauthSessionId: started.oauthSessionId, platform: 'tiktok', error: 'missing_tiktok_permissions' }), e => e.status === 400 && /accept all permissions on TikTok/.test(e.message) && !/Meta/.test(e.message));
  assert.equal(s.rows.get(started.oauthSessionId).status, 'failed'); assert.equal(s.persisted.length, 0);
});

test('TikTok reconnect accepts the same @handle across lanes and refuses a different account', async () => {
  const same = sandbox({ usernames: ['asra3brand', '@Asra3Brand'] });
  const started = await same.startOAuthSession(request(), session(), { platform: 'tiktok', reconnectAccountId: tiktokId });
  const ok = await same.acceptOAuthCallback(request(), session(), { oauthSessionId: started.oauthSessionId, platform: 'tiktok', profileId, accountId: tiktokId });
  assert.equal(ok.success, true);
  const other = sandbox({ usernames: ['asra3brand', 'someoneelse'] });
  const second = await other.startOAuthSession(request(), session(), { platform: 'tiktok', reconnectAccountId: tiktokId });
  await assert.rejects(other.acceptOAuthCallback(request(), session(), { oauthSessionId: second.oauthSessionId, platform: 'tiktok', profileId, accountId: tiktokId }), e => e.status === 409 && /@someoneelse/.test(e.message) && /@asra3brand/.test(e.message));
  assert.equal(other.rows.get(second.oauthSessionId).status, 'failed'); assert.equal(other.persisted.length, 0);
});
