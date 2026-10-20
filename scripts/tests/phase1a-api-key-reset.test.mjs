import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

// Run the real TypeScript modules, but permit only in-memory workspace I/O.
// Neither the app's .data nor provider/Supabase clients are loaded.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sources = new Map([
  ['store', 'src/lib/storage/workspace-store.ts'],
  ['keys', 'src/lib/saas/api-keys.ts'],
  ['launch', 'src/lib/launch/public-actions.ts'],
  ['availability', 'src/lib/launch/availability.ts'],
  ['route', 'src/app/api/v1/[...path]/route.ts'],
  ['session', 'src/lib/auth/session.ts'],
  ['access', 'src/lib/auth/tenant-access.ts'],
  ['spec', 'src/lib/zernio/openapi-spec.ts'],
  ['client', 'src/lib/zernio/client.ts'],
  ['whatsappActions', 'src/lib/whatsapp/actions.ts'],
  ['inboxActions', 'src/lib/inbox/actions.ts'],
  ['inboxRoute', 'src/app/api/inbox/route.ts'],
  ['commentsActions', 'src/lib/meta-comments/actions.ts'],
  ['commentsRoute', 'src/app/api/comments/route.ts'],
  ['settingsActions', 'src/lib/meta-settings/actions.ts'],
  ['settingsRoute', 'src/app/api/messaging-settings/route.ts'],
  ['publishingActions', 'src/lib/publishing/actions.ts'],
  ['publishingRoute', 'src/app/api/publishing/route.ts'],
  ['accountsRoute', 'src/app/api/accounts/route.ts'],
  ['whatsappRoute', 'src/app/api/whatsapp/route.ts'],
].map(([name, file]) => [name, ts.transpileModule(
  fs.readFileSync(path.join(root, file), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } },
).outputText]));

function sandbox(options = {}) {
  const security = { role: 'owner', workspaceStatus: 'active', databaseConfigured: true, ...options };
  const databaseCalls = [];
  const telephonyCalls = [];
  const whatsappCalls = [];
  const metaInboxCalls = [];
  const commentsCalls = [];
  const settingsCalls = [];
  const publishingCalls = [];
  const accountCalls = [];
  const database = { from(table) {
    const filters = {};
    const query = {
      select: () => query,
      eq: (field, value) => { filters[field] = value; return query; },
      maybeSingle: async () => {
        databaseCalls.push({ table, filters: { ...filters } });
        if (security.databaseThrows) throw new Error('Isolated database outage');
        if (security.databaseError) return { data: null, error: { message: 'Isolated lookup failure' } };
        if (table === 'org_members') return {
          data: security.removed ? null : { user_id: filters.user_id, organization_id: filters.organization_id, role: security.role, ...security.membershipOverride }, error: null,
        };
        if (table === 'organizations') return { data: { id: filters.id, status: security.workspaceStatus }, error: null };
        throw new Error(`Unexpected database table: ${table}`);
      },
    };
    return query;
  } };
  const files = new Map();
  const directories = new Set();
  let mtime = 0;
  let writes = 0;
  let resets = 0;
  let networkAttempts = 0;
  const workspaceFile = path.join('/isolated-phase1a', '.data', 'workspaces.json');
  const memoryFs = new Proxy({
    existsSync: (file) => files.has(file) || directories.has(file),
    mkdirSync: (directory) => directories.add(directory),
    readFileSync: (file) => {
      assert.equal(file, workspaceFile);
      assert.ok(files.has(file));
      return files.get(file).content;
    },
    writeFileSync: (file, content) => {
      assert.equal(file, workspaceFile);
      files.set(file, { content: String(content), mtimeMs: ++mtime });
      writes++;
    },
    statSync: (file) => {
      assert.equal(file, workspaceFile);
      assert.ok(files.has(file));
      return { mtimeMs: files.get(file).mtimeMs };
    },
  }, {
    get: (target, name) => {
      if (name === '__esModule') return false;
      assert.ok(name in target, `Filesystem operation denied: ${String(name)}`);
      return target[name];
    },
  });
  const deniedNetwork = () => {
    networkAttempts++;
    throw new Error('Network denied in Phase 1A tests');
  };
  const modules = {};
  const keyRecords = new Map();
  const issueKey = (organizationId, input = {}) => { const token = 'asra3_' + crypto.randomBytes(32).toString('hex'); const key = { id: crypto.randomUUID(), organizationId, scopes: input.scopes || ['read','write'], token, role: input.role }; keyRecords.set(crypto.createHash('sha256').update(token).digest('hex'), key); return key; };
  const context = vm.createContext({
    Buffer, URL, Headers, Request, Response, TextEncoder, TextDecoder,
    Date, console, AbortController, setTimeout, clearTimeout,
    process: { cwd: () => '/isolated-phase1a', env: { NODE_ENV: 'test', SESSION_SECRET: 'isolated-session-secret' } },
    fetch: deniedNetwork,
  });
  function load(name) {
    if (modules[name]) return modules[name];
    const module = { exports: {} };
    const require = (specifier) => {
      if (specifier === 'fs') return memoryFs;
      if (specifier === 'path') return path;
      if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
      if (specifier === '@/lib/launch/availability') return load('availability');
      if (specifier === '@/lib/launch/public-actions') return load('launch');
      if (specifier === '@/lib/saas/api-keys') return load('keys');
      if (specifier === '@/lib/saas/auth') return { verifyCurrentSession: async () => {} }; // Durable session RPC is tested in launch-saas; membership is real here.
      if (specifier === './storage' && name === 'keys') return {
        saasDatabase: () => ({ auth: { admin: { getUserById: async () => ({data:{user:{email_confirmed_at:'2026-10-01'}},error:null}) } } }),
        saasRpc: async (rpc,input) => {
          assert.equal(rpc, 'saas_resolve_api_key');
          const record = keyRecords.get(input.p_hash); const ErrorType=load('access').TenantAccessError;
          if (!record || record.revoked) throw new ErrorType(401,'Invalid key');
          if (!security.databaseConfigured) throw new ErrorType(503,'Unavailable');
          if (security.removed || security.workspaceStatus !== 'active') throw new ErrorType(403,'Unavailable workspace');
          if (!record.scopes.includes(input.p_scope)) throw new ErrorType(403,'Insufficient scope');
          return { organizationId:record.organizationId,userId:'user-a',role:record.role || security.role,scopes:record.scopes,keyId:record.id };
        }
      };
      if (specifier === '@/lib/crm/service') return { ManualCrmService: {} };
      if (specifier === '@/lib/reports/service') return { CustomerReportsService: {} };
      if (specifier === '@/lib/phone-lifecycle/actions') return { PHONE_READ_ACTIONS:['numbers','number','offers'], runPhoneLifecycleAction: async (organizationId,action,input) => {telephonyCalls.push({organizationId,action,...input});if(security.telephonyResult)return security.telephonyResult;throw new (load('access').TenantAccessError)(400,'A reviewed phone operation is required');} };

      if (specifier === 'next/server') return {
        NextResponse: { json: (value, init) => Response.json(value, init) },
      };
      if (specifier === '@/lib/storage/workspace-store') return load('store');
      if (specifier === '@/lib/auth/session') return load('session');
      if (specifier === '@/lib/auth/tenant-access') return load('access');
      if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => security.databaseConfigured ? database : null };
      if (specifier === '@/lib/zernio/openapi-spec') return load('spec');
      if (specifier === '@/lib/zernio/client') return load('client');
      if (specifier === '@/lib/publishing/actions') return load('publishingActions');
      if (specifier === '@/lib/accounts/lifecycle') return { disconnectAccount: async (organizationId, accountId) => {
        accountCalls.push({ organizationId, accountId });
        if (security.accountError) throw new (load('client').ZernioApiException)(security.accountError);
        const account = store.getWorkspace(organizationId).connectedAccounts.find((item) => item.accountId === accountId || item.id === accountId);
        if (!account) throw new (load('access').TenantAccessError)(403, 'Foreign account');
        store.removeConnectedAccount(organizationId, accountId);
        return { success: true, accountId, simulated: false };
      } };
      if (specifier === '@/lib/services/core-connect.service') return { CoreConnectService: { listTenantAccountsWithHealth: async (organizationId) => {
        accountCalls.push({ organizationId, action: 'health' });
        if (security.accountError) throw new (load('client').ZernioApiException)(security.accountError);
        const accounts = store.getWorkspace(organizationId).connectedAccounts.map((account) => ({ ...account, isActive: account.status !== 'error', needsReconnection: !!account.needsReconnect }));
        return { simulated: false, accounts, summary: { total: accounts.length }, profileId: organizationId + '-profile' };
      } } };
      if (specifier === '@/lib/services/publishing.service') return { PublishingService: new Proxy({}, { get: (_, method) => async (...input) => {
        publishingCalls.push({ method, input });
        if (security.publishingError) throw new (load('client').ZernioApiException)(security.publishingError);
        return security.publishingResult || { success: true, httpStatus: 200, posts: [] };
      } }) };
      if (specifier === '@/lib/whatsapp/actions') return load('whatsappActions');
      if (specifier === '@/lib/inbox/actions') return load('inboxActions');
      if (specifier === '@/lib/meta-comments/actions') return load('commentsActions');
      if (specifier === '@/lib/meta-settings/actions') return load('settingsActions');
      if ((name === 'commentsActions' && specifier === './service') || specifier === '@/lib/meta-comments/service') return { MetaCommentsService: new Proxy({}, { get: (_, method) => async (input) => {
        commentsCalls.push({ method, input });
        if (security.commentsError) throw new (load('client').ZernioApiException)(security.commentsError);
        return security.commentsResult || { success: true, httpStatus: 200, data: [] };
      } }) };
      if ((name === 'settingsActions' && specifier === './service') || specifier === '@/lib/meta-settings/service') return { MetaSettingsService: new Proxy({}, { get: (_, method) => async (input) => {
        settingsCalls.push({ method, input });
        if (security.settingsError) throw new (load('client').ZernioApiException)(security.settingsError);
        return security.settingsResult || { success: true, httpStatus: 200, data: [] };
      } }) };
      if (specifier === '@/lib/auth/tenant-provider') return { requireTenantAccounts: async (organizationId, ids) => {
        assert.equal(organizationId, 'tenant-a');
        const accounts = security.providerAccounts || [{ _id: 'wa-a', platform: 'whatsapp' }, { _id: 'fb-a', platform: 'facebook' }, { _id: 'ig-a', platform: 'instagram' }];
        return ids.map(id => {
          const account = accounts.find(account => account._id === id);
          if (!account) throw new (load('access').TenantAccessError)(403, 'Foreign account');
          return account;
        });
      } };
      if (specifier === '@/lib/meta-inbox/service') return { MetaInboxService: new Proxy({}, { get: (_, method) => async (input) => {
        metaInboxCalls.push({ method, input });
        if (security.metaInboxError) throw new (load('client').ZernioApiException)(security.metaInboxError);
        return security.metaInboxResult || { data: [], httpStatus: 200 };
      } }) };
      if (specifier === '@/lib/whatsapp/broadcasts') return { WhatsAppBroadcastService: new Proxy({}, { get: (_, method) => async (input) => {
        whatsappCalls.push({ method: `broadcast:${method}`, input });
        if (security.whatsappResult) return security.whatsappResult;
        return deniedNetwork();
      } }) };
      if (specifier === '@/lib/whatsapp/service') return { WhatsAppService: new Proxy({}, { get: (_, method) => async (input) => {
        whatsappCalls.push({ method, input });
        if (security.whatsappError) throw new (load('client').ZernioApiException)(security.whatsappError);
        if (security.whatsappResult) return security.whatsappResult;
        return deniedNetwork();
      } }) };
      if (specifier === '@/lib/services/telephony.service' && security.telephonyResult) return { TelephonyService: {
        buyPhoneNumber: async (input) => { telephonyCalls.push(input); return security.telephonyResult; },
        listNumbersAndCapabilities: async () => security.telephonyResult,
      } };
      if (specifier === '@/lib/zernio/policy-engine') return {
        resolveEffectiveTenantPolicy: async () => ({
          planKey: 'starter', organizationName: 'Isolated workspace', status: security.workspaceStatus,
          quotas: { maxConnectedAccounts: 10, maxMonthlyPosts: 10, maxPhoneNumbers: 10 },
        }),
      };
      if (specifier.startsWith('@/lib/services/')) return new Proxy({}, {
        get: (_, key) => key === '__esModule' ? false : new Proxy({}, { get: () => deniedNetwork }),
      });
      throw new Error(`Module denied in Phase 1A tests: ${specifier}`);
    };
    const wrapper = vm.runInContext(`(function (require, module, exports) {\n${sources.get(name)}\n})`, context);
    wrapper(require, module, module.exports);
    modules[name] = module.exports;
    return module.exports;
  }
  const store = load('store').WorkspaceStore;
  const actualReset = store.resetMemoryAndDisk.bind(store);
  store.resetMemoryAndDisk = () => { resets++; actualReset(); };
  const route = load('route');
  const session = load('session');
  const whatsappRoute = load('whatsappRoute');
  const whatsappRequest = async (method, { cookie, query = '', body, headers = {} } = {}) => {
    const requestHeaders = new Headers(headers);
    if (cookie) requestHeaders.set('cookie', cookie);
    const req = new Request(`https://isolated.invalid/api/whatsapp${query}`, { method, headers: requestHeaders, body });
    const response = await whatsappRoute[method](req);
    return { status: response.status, body: await response.json() };
  };
  const dashboardRequest = async (target, method, { cookie, query = '', body, headers = {} } = {}) => {
    const requestHeaders = new Headers(headers);
    if (cookie) requestHeaders.set('cookie', cookie);
    const response = await load(target + 'Route')[method](new Request(`https://isolated.invalid/api/${target}${query}`, { method, headers: requestHeaders, body }));
    return { status: response.status, headers: response.headers, body: await response.json() };
  };
  const request = async (method, endpoint, { token, cookie, headers = {}, body } = {}) => {
    const requestHeaders = new Headers(headers);
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
    if (cookie) requestHeaders.set('cookie', cookie);
    const url = new URL(`https://isolated.invalid/api/v1${endpoint}`);
    const req = new Request(url, { method, headers: requestHeaders, body });
    req.nextUrl = url;
    const response = await route[method](req, { params: Promise.resolve({ path: url.pathname.slice('/api/v1/'.length).split('/') }) });
    return { status: response.status, headers: response.headers, body: await response.json() };
  };
  return {
    store, issueKey, request, session, security, databaseCalls, telephonyCalls, whatsappCalls, whatsappRequest, metaInboxCalls, commentsCalls, settingsCalls, publishingCalls, accountCalls, dashboardRequest,
    counts: () => ({ writes, resets, networkAttempts }),
    disk: () => JSON.parse(files.get(workspaceFile)?.content || '{}'),
  };
}

test('unknown live/test keys cannot select or create a workspace', () => {
  const s = sandbox();
  s.store.createApiKey('victim-tenant', { name: 'Stored victim key', scopes: ['accounts:read'] });
  const before = JSON.stringify(s.disk());
  const beforeCounts = s.counts();
  for (const token of ['tk_live_victimtenant', 'tk_test_victim-tenant', 'tk_live_new_workspace_123', 'tk_test_new-workspace', 'YOUR_API_KEY', '']) {
    assert.equal(s.store.resolveApiKey(token), null);
  }
  assert.equal(JSON.stringify(s.disk()), before);
  assert.deepEqual(s.counts(), beforeCounts);
});

test('issued exact keys preserve owner/scopes and revoked/deleted/rolled credentials fail', () => {
  const s = sandbox();
  for (const environment of ['live', 'test']) {
    const key = s.store.createApiKey(`org-${environment}`, { name: 'Issued key', environment, scopes: ['accounts:read'] });
    const oldToken = key.token;
    assert.equal(s.store.resolveApiKey(`${oldToken}x`), null);
    const resolved = s.store.resolveApiKey(` ${oldToken} `);
    assert.equal(resolved.tenantId, `org-${environment}`);
    assert.equal(JSON.stringify(resolved.keyItem.scopes), '["accounts:read"]');
    assert.equal(resolved.keyItem.requestCount, 1);
    assert.ok(resolved.keyItem.lastUsedAt);
    s.store.revokeApiKey(`org-${environment}`, key.id);
    assert.equal(s.store.resolveApiKey(oldToken), null);
    const rolled = s.store.rollApiKey(`org-${environment}`, key.id);
    assert.equal(s.store.resolveApiKey(oldToken), null);
    assert.equal(s.store.resolveApiKey(rolled.token).tenantId, `org-${environment}`);
    s.store.deleteApiKey(`org-${environment}`, key.id);
    assert.equal(s.store.resolveApiKey(rolled.token), null);
  }
  assert.equal(s.counts().networkAttempts, 0);
});

test('anonymous and forged-key reset requests are denied without storage mutations', async () => {
  const s = sandbox();
  s.issueKey('victim', { name: 'Victim key' });
  const before = JSON.stringify(s.disk());
  const beforeCounts = s.counts();
  for (const endpoint of ['/workspaces/reset', '/admin/reset']) {
    for (const token of [undefined, 'tk_live_victim']) {
      const result = await s.request('POST', endpoint, { token, headers: { 'x-reset-workspace': 'true' }, body: '{}' });
      assert.equal(result.status, 401);
    }
  }
  assert.equal(JSON.stringify(s.disk()), before);
  assert.deepEqual(s.counts(), beforeCounts);
});

test('reset routes return authenticated 404 for all exported methods', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Tenant A key' });
  const victimKey = s.issueKey('tenant-b', { name: 'Tenant B key' });
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const endpoint of ['/workspaces/reset', '/admin/reset']) {
      const result = await s.request(method, endpoint, { token: key.token, headers: { 'x-reset-workspace': 'true' } });
      assert.equal(result.status, 404);
      assert.equal(result.body.error.code, 'endpoint_not_found');
    }
  }
  assert.equal(victimKey.organizationId, 'tenant-b');
  assert.equal(s.counts().resets, 0);
  assert.equal(s.counts().networkAttempts, 0);
});

test('reset header on normal requests cannot clear tenant data', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Tenant A key', scopes: ['read'] });
  s.store.addConnectedAccount('tenant-a', { id: 'account-a', accountId: 'account-a', platform: 'facebook', username: 'page-a', displayName: 'Page A', status: 'healthy' });
  const anonymous = await s.request('GET', '/accounts', { headers: { 'x-reset-workspace': 'true' } });
  assert.equal(anonymous.status, 401);
  const result = await s.request('GET', '/accounts', { token: key.token, headers: { 'x-reset-workspace': 'true' } });
  assert.equal(result.status, 200);
  assert.equal(result.body.data[0].accountId, 'account-a');
  assert.equal(s.counts().resets, 0);
  assert.equal(s.counts().networkAttempts, 0);
});

test('Postman download exposes only an inert placeholder and cannot authenticate', async () => {
  const s = sandbox();
  const now = Date.now();
  const cookie = `asra3_session=${s.session.encodeSession({
    user: { id: 'user-a', fullName: 'Isolated user', email: 'isolated@example.invalid', role: 'owner' },
    tenant: { organizationId: 'tenant-secret', organizationName: 'Tenant', slug: 'tenant', planKey: 'starter' },
    createdAt: now, expiresAt: now + 60_000,
  })}`;
  for (const sessionCookie of [undefined, cookie]) {
    const result = await s.request('GET', '/postman.json', { cookie: sessionCookie });
    assert.equal(result.status, 200);
    const apiKey = result.body.variable.find((v) => v.key === 'apiKey').value;
    assert.equal(apiKey, 'YOUR_API_KEY');
    assert.equal(s.store.resolveApiKey(apiKey), null);
    assert.ok(!JSON.stringify(result.body).includes('tenant-secret'));
  }
  assert.equal(s.counts().writes, 0);
  assert.equal(s.counts().networkAttempts, 0);
});

test('public mutations check the current key scope and revocation before every dispatch',async()=>{
 const s=sandbox({publishingResult:{httpStatus:201,post:{id:'provider-post'}}});const writer=s.issueKey('tenant-a',{scopes:['write']}),reader=s.issueKey('tenant-a',{scopes:['read']});
 const options={headers:{'idempotency-key':'shared-intent'},body:'{}'};
 for(let i=0;i<2;i++)assert.equal((await s.request('POST','/posts',{...options,token:writer.token})).status,201);
 assert.equal(s.publishingCalls.length,2);
 assert.equal((await s.request('POST','/posts',{...options,token:reader.token})).status,403);
 writer.scopes=['read'];assert.equal((await s.request('POST','/posts',{...options,token:writer.token})).status,403);
 writer.revoked=true;assert.equal((await s.request('POST','/posts',{...options,token:writer.token})).status,401);assert.equal(s.publishingCalls.length,2);
});

test('retired profiles and unknown routes never replay legacy cached success for another body or tenant',async()=>{
 const s=sandbox();const key=s.issueKey('tenant-a'),other=s.issueKey('tenant-b');
 s.store.setIdempotencyRecord('tenant-a','same-intent',{status:201,path:'/profiles',body:{success:true,data:{secret:'cached-secret'}}});
 for(const token of [key.token,other.token])for(const body of ['{"name":"First"}','{"name":"Changed"}']){
  const r=await s.request('POST','/profiles',{token,body,headers:{'idempotency-key':'same-intent'}});assert.equal(r.status,501);assert.equal(JSON.stringify(r.body).includes('cached-secret'),false);
 }
 for(const endpoint of ['/workspaces/reset','/admin/reset'])assert.equal((await s.request('POST',endpoint,{token:key.token,body:'{}'})).status,404);
 assert.equal(s.counts().resets,0);assert.equal(s.counts().networkAttempts,0);
});

test('legacy unbound idempotency records cannot bypass scopes or restore reset routes', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Reader', scopes: ['read'] });
  s.store.setIdempotencyRecord('tenant-a', 'legacy-intent', { status: 200, path: '/profiles', body: { success: true, data: { secret: 'cached-authorized-result' } } });
  const options = { token: key.token, headers: { 'idempotency-key': 'legacy-intent' }, body: '{}' };
  assert.equal((await s.request('POST', '/profiles', options)).status, 403);
  assert.equal((await s.request('POST', '/workspaces/reset', options)).status, 403);
  assert.equal((await s.request('POST', '/admin/reset', options)).status, 403);
  assert.equal(s.counts().resets, 0);
  assert.equal(s.counts().networkAttempts, 0);
});

test('session and query-key authentication also preserve the reset boundary', async () => {
  const s = sandbox();
  const now = Date.now();
  const cookie = `asra3_session=${s.session.encodeSession({
    user: { id: 'session-user', fullName: 'Isolated user', email: 'isolated@example.invalid', role: 'owner' },
    tenant: { organizationId: 'session-tenant', organizationName: 'Tenant', slug: 'tenant', planKey: 'starter' },
    createdAt: now, expiresAt: now + 60_000,
  })}`;
  const key = s.issueKey('query-tenant', { name: 'Query key' });
  for (const endpoint of ['/workspaces/reset', '/admin/reset']) {
    assert.equal((await s.request('POST', endpoint, { cookie, headers: { 'x-reset-workspace': 'true' } })).status, 404);
    assert.equal((await s.request('POST', `${endpoint}?api_key=${key.token}`)).status, 404);
    assert.equal((await s.request('POST', `${endpoint}?api_key=tk_live_sessiontenant`, { cookie })).status, 401);
  }
  const options = { cookie, headers: { 'idempotency-key': 'session-intent' }, body: '{"name":"Session profile"}' };
  assert.equal((await s.request('POST', '/profiles', options)).status, 501);
  const replay = await s.request('POST', '/profiles', options);
  assert.equal(replay.status, 501); assert.equal(replay.body.meta.idempotent_replayed, undefined);
  assert.equal(replay.body.meta.organization_id, 'session-tenant');
  assert.equal((await s.request('POST', '/admin/reset', options)).status, 404);
  assert.equal(s.counts().resets, 0);
  assert.equal(s.counts().networkAttempts, 0);
});

function tenantCookie(s) {
  const now = Date.now();
  return `asra3_session=${s.session.encodeSession({
    user: { id: 'user-a', fullName: 'Isolated owner', email: 'a@example.invalid', role: 'owner' },
    tenant: { organizationId: 'tenant-a', organizationName: 'Tenant A', slug: 'a', planKey: 'starter' },
    createdAt: now, expiresAt: now + 60_000,
  })}`;
}

test('Meta inbox dashboard enforces membership, role, tenant, origin and JSON boundaries', async () => {
  const s = sandbox({ role: 'viewer' });
  const query = '?action=accounts';
  assert.equal((await s.dashboardRequest('inbox', 'GET', { query })).status, 401);
  assert.equal((await s.dashboardRequest('inbox', 'GET', { cookie: tenantCookie(s), query: query + '&organizationId=tenant-b' })).status, 403);
  assert.equal((await s.dashboardRequest('inbox', 'POST', { cookie: tenantCookie(s), body: '{"action":"send"}' })).status, 403);
  assert.equal(s.metaInboxCalls.length, 0);
  assert.equal((await s.dashboardRequest('inbox', 'GET', { cookie: tenantCookie(s), query })).status, 200);
  s.security.role = 'editor';
  for (const body of ['[1]', 'null', '{']) assert.equal((await s.dashboardRequest('inbox', 'POST', { cookie: tenantCookie(s), body })).status, 400);
  assert.equal((await s.dashboardRequest('inbox', 'POST', { cookie: tenantCookie(s), headers: { origin: 'https://other.invalid' }, body: '{"action":"send"}' })).status, 403);
  assert.equal((await s.dashboardRequest('inbox', 'POST', { cookie: tenantCookie(s), body: '{"action":"messages"}' })).status, 400);
  s.security.removed = true;
  assert.equal((await s.dashboardRequest('inbox', 'GET', { cookie: tenantCookie(s), query })).status, 403);
  assert.equal(s.metaInboxCalls.length, 1);
});

test('Meta inbox preserves acceptance status, caller intent, partial sync and provider errors', async () => {
  const s = sandbox({ role: 'editor', metaInboxResult: { httpStatus: 202, data: { messageId: 'provider-message' }, status: 'pending' } });
  const response = await s.dashboardRequest('inbox', 'POST', { cookie: tenantCookie(s), headers: { 'idempotency-key': 'header-intent' },
    body: JSON.stringify({ action: 'accept', accountId: 'ig-a', conversationId: 'request-a', text: 'Reviewed reply', idempotencyKey: 'body-intent', profileId: 'foreign' }) });
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.body.status, 'pending');
  const call = s.metaInboxCalls[0];
  assert.equal(call.method, 'acceptRequest');
  assert.equal(call.input.organizationId, 'tenant-a');
  assert.equal(call.input.idempotencyKey, 'header-intent');
  assert.equal(call.input.profileId, undefined);
  s.security.metaInboxResult = { httpStatus: 200, data: [], meta: { failedAccounts: [{ accountId: 'ig-a', reason: 'expired' }] }, pagination: { nextCursor: 'next' } };
  const key = s.issueKey('tenant-a', { name: 'Inbox reader', scopes: ['read'] });
  const read = await s.request('GET', '/inbox/conversations?accountId=ig-a&folder=requests&cursor=cursor-a&limit=25', { token: key.token });
  assert.equal(read.body.meta.failedAccounts[0].reason, 'expired');
  assert.equal(read.body.pagination.nextCursor, 'next');
  assert.equal(s.metaInboxCalls.at(-1).input.folder, 'requests');
  assert.equal(s.metaInboxCalls.at(-1).input.limit, 25);
  s.security.metaInboxError = { status: 409, code: 'not_thread_owner', error: 'Another app owns this thread', details: { threadOwner: 'other' }, requestId: 'provider-request' };
  const failed = await s.dashboardRequest('inbox', 'POST', { cookie: tenantCookie(s), body: '{"action":"send","accountId":"ig-a","conversationId":"request-a","text":"hello"}' });
  assert.equal(failed.status, 409);
  assert.equal(failed.body.error.code, 'not_thread_owner');
  assert.equal(failed.body.error.details.threadOwner, 'other');
  assert.equal(failed.body.error.requestId, 'provider-request');
});

test('public inbox selects the verified account platform and denies spoofed, foreign and missing Meta accounts', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Inbox', scopes: ['read','write'] });
  for (const accountId of ['fb-a', 'ig-a']) {
    assert.equal((await s.request('POST', '/inbox/conversations/thread-a/messages', { token: key.token, body: JSON.stringify({ accountId, text: 'hello', idempotencyKey: 'intent', conversationId: 'spoofed-body' }) })).status, 200);
    assert.equal(s.metaInboxCalls.at(-1).input.conversationId, 'thread-a');
  }
  assert.equal(s.whatsappCalls.length, 0);
  for (const [query, status] of [['accountId=fb-a&platform=whatsapp', 400], ['accountId=foreign', 403], ['platform=instagram', 400]]) {
    assert.equal((await s.request('GET', '/inbox/conversations?' + query, { token: key.token })).status, status);
  }
  assert.equal(s.metaInboxCalls.length, 2);
});

test('Meta aliases enforce scopes and do not replay cached mutation success after a provider outage', async () => {
  const s = sandbox({ metaInboxResult: { httpStatus: 200, data: { messageId: 'real-message' } } });
  const reader = s.issueKey('tenant-a', { name: 'Reader', scopes: ['read'] });
  const writer = s.issueKey('tenant-a', { name: 'Writer', scopes: ['read','write'] });
  const payload = { body: '{"accountId":"fb-a","conversationId":"thread-a","text":"hello"}', headers: { 'idempotency-key': 'stable-intent' } };
  assert.equal((await s.request('POST', '/inbox/messages', { token: reader.token, ...payload })).status, 403);
  assert.equal(s.metaInboxCalls.length, 0);
  for (const endpoint of ['/inbox/messages', '/messages/send', '/messages', '/messages/conversations/thread-a/messages']) {
    assert.equal((await s.request('POST', endpoint, { token: writer.token, ...payload })).status, 200);
    assert.equal(s.metaInboxCalls.at(-1).input.idempotencyKey, 'stable-intent');
  }
  s.security.metaInboxError = { status: 503, error: 'Outcome unknown', code: 'send_outcome_unknown' };
  const replay = await s.request('POST', '/inbox/messages', { token: writer.token, ...payload });
  assert.equal(replay.status, 503);
  assert.equal(replay.body.meta.idempotent_replayed, undefined);
});

test('Meta cold starts, unimplemented thread operations and legacy comments cannot fabricate effects', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Inbox', scopes: ['read','write'] });
  for (const endpoint of ['/inbox/conversations', '/inbox/conversations/thread-a/typing', '/inbox/comments', '/inbox/comments/missing/reply', '/inbox/comments/missing/hide', '/inbox/comments/missing/like']) {
    const result = await s.request('POST', endpoint, { token: key.token, headers: { 'idempotency-key': 'legacy' }, body: '{"accountId":"fb-a","text":"hello"}' });
    assert.equal(result.status, 501, endpoint);
    assert.equal(result.body.success, false);
  }
  assert.equal(s.metaInboxCalls.length, 0);
  assert.equal(s.whatsappCalls.length, 0);
});

test('read scope covers owned channel reads and browser clients may supply idempotency headers', async () => {
  const s = sandbox({ whatsappResult: { httpStatus: 200, data: [] } });
  const key = s.issueKey('tenant-a', { name: 'Telephony only', scopes: ['read'] });
  assert.equal((await s.request('GET', '/inbox/conversations?accountId=ig-a', { token: key.token })).status, 200);
  assert.equal((await s.request('GET', '/inbox/conversations?accountId=fb-a', { token: key.token })).status, 200);
  const allowed = await s.request('GET', '/inbox/conversations?accountId=wa-a', { token: key.token });
  assert.equal(allowed.status, 200);
  assert.match(allowed.headers.get('access-control-allow-headers'), /Idempotency-Key/);
  assert.equal(s.metaInboxCalls.length, 2);
});

test('WhatsApp dashboard API verifies membership, tenant and viewer mutation permissions', async () => {
  const s = sandbox({ role: 'viewer', whatsappResult: { accounts: [], httpStatus: 200 } });
  assert.equal((await s.whatsappRequest('GET', { query: '?action=accounts' })).status, 401);
  assert.equal((await s.whatsappRequest('GET', { cookie: tenantCookie(s), query: '?action=accounts&organizationId=tenant-b' })).status, 403);
  assert.equal((await s.whatsappRequest('POST', { cookie: tenantCookie(s), body: JSON.stringify({ action: 'send', accountId: 'wa-a', text: 'hello' }) })).status, 403);
  assert.equal(s.whatsappCalls.length, 0);
  assert.equal((await s.whatsappRequest('GET', { cookie: tenantCookie(s), query: '?action=accounts' })).status, 200);
  assert.equal(s.whatsappCalls[0].input, 'tenant-a');
});

test('WhatsApp dashboard API passes editor content and preserves provider pending status', async () => {
  const s = sandbox({ role: 'editor', whatsappResult: { success: true, status: 'queued', httpStatus: 202 } });
  const response = await s.whatsappRequest('POST', { cookie: tenantCookie(s), headers: { 'idempotency-key': 'stable-message-intent' },
    body: JSON.stringify({ action: 'send', accountId: 'wa-a', conversationId: 'conv-a', text: 'hello' }) });
  assert.equal(response.status, 202);
  assert.equal(response.body.status, 'queued');
  assert.equal(response.body.readReceipt, undefined);
  assert.equal(s.whatsappCalls[0].input.organizationId, 'tenant-a');
  assert.equal(s.whatsappCalls[0].input.idempotencyKey, 'stable-message-intent');
});

test('WhatsApp API rejects malformed JSON, read actions used as mutations and cross-origin mutations', async () => {
  const s = sandbox();
  assert.equal((await s.whatsappRequest('POST', { cookie: tenantCookie(s), body: '{' })).status, 400);
  assert.equal((await s.whatsappRequest('POST', { cookie: tenantCookie(s), body: '{"action":"messages"}' })).status, 400);
  assert.equal((await s.whatsappRequest('POST', { cookie: tenantCookie(s), headers: { Origin: 'https://other.invalid' }, body: '{"action":"send"}' })).status, 403);
  assert.equal(s.whatsappCalls.length, 0);
});

test('public WhatsApp API checks write scopes and never replays simulated or stale message successes', async () => {
  const s = sandbox({ whatsappResult: { success: true, data: { id: 'real-message', status: 'sent' }, httpStatus: 200 } });
  const readKey = s.issueKey('tenant-a', { name: 'Reader', scopes: ['read'] });
  const key = s.issueKey('tenant-a', { name: 'Writer', scopes: ['read','write'] });
  const request = { body: '{"accountId":"wa-a","conversationId":"conv-a","text":"hello"}', headers: { 'idempotency-key': 'stable' } };
  assert.equal((await s.request('POST', '/whatsapp/messages', { ...request, token: readKey.token })).status, 403);
  assert.equal(s.whatsappCalls.length, 0);
  assert.equal((await s.request('POST', '/whatsapp/messages', { ...request, token: key.token })).status, 200);
  s.security.whatsappError = { status: 429, code: 'RATE_LIMITED', error: 'Slow down', retryAfterSeconds: 30 };
  const retry = await s.request('POST', '/whatsapp/messages', { ...request, token: key.token });
  assert.equal(retry.status, 429);
  assert.equal(retry.body.error.code, 'RATE_LIMITED');
  assert.equal(retry.body.error.retryAfterSeconds, 30);
  assert.equal(retry.body.meta.idempotent_replayed, undefined);
});

test('public inbox aliases use the provider dispatcher and preserve failed-account metadata', async () => {
  const s = sandbox({ whatsappResult: { data: [], meta: { failedAccounts: [{ accountId: 'wa-a' }] }, httpStatus: 200 } });
  const key = s.issueKey('tenant-a', { name: 'Inbox', scopes: ['read','write'] });
  const read = await s.request('GET', '/inbox/conversations?accountId=wa-a', { token: key.token });
  assert.equal(read.body.meta.failedAccounts[0].accountId, 'wa-a');
  for (const endpoint of ['/inbox/messages', '/messages/send', '/inbox/conversations/conv-a/messages']) {
    assert.equal((await s.request('POST', endpoint, { token: key.token, body: '{"accountId":"wa-a","conversationId":"conv-a","text":"hello","idempotencyKey":"alias"}' })).status, 200);
    assert.equal(s.whatsappCalls.at(-1).method, 'sendMessage');
  }
});

test('unsupported inbox operations and WhatsApp flows cannot invent uploads or delivered states', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Inbox', scopes: ['read','write'] });
  for (const endpoint of ['/inbox/media', '/inbox/conversations/unknown/typing']) {
    assert.equal((await s.request('POST', endpoint, { token: key.token, body: '{}' })).status, 501);
  }
  assert.equal((await s.request('POST','/whatsapp/flows',{token:key.token,body:'{}'})).status,400);
  assert.equal(s.telephonyCalls.at(-1).action,'flow_create');
  assert.equal(s.whatsappCalls.length, 0);
});

test('removed memberships and unavailable membership verification deny cookie requests before storage', async () => {
  for (const [options, expected] of [
    [{ removed: true }, 403], [{ membershipOverride: { organization_id: 'tenant-b' } }, 403],
    [{ membershipOverride: { user_id: 'user-b' } }, 403], [{ workspaceStatus: 'suspended' }, 403],
    [{ databaseConfigured: false }, 503], [{ databaseError: true }, 503], [{ databaseThrows: true }, 503],
  ]) {
    const s = sandbox(options);
    const response = await s.request('GET', '/accounts', { cookie: tenantCookie(s) });
    assert.equal(response.status, expected);
    assert.equal(s.counts().writes, 0);
    assert.equal(s.counts().networkAttempts, 0);
  }
  const s = sandbox();
  assert.equal((await s.request('GET', '/accounts', { cookie: tenantCookie(s) })).status, 200);
  assert.deepEqual(s.databaseCalls[0], { table: 'org_members', filters: { user_id: 'user-a', organization_id: 'tenant-a' } });
});

test('current viewer/editor roles cannot retrieve secrets, mutate management data, or replay an owner result', async () => {
  const s = sandbox();
  const cookie = tenantCookie(s);
  const request = { cookie, headers: { 'idempotency-key': 'owner-webhook-intent' }, body: '{"url":"https://listener.example.invalid/inbox","events":["account.connected"]}' };
  assert.equal((await s.request('POST', '/webhooks', request)).status, 501);
  assert.equal((await s.request('POST', '/webhooks', request)).body.meta.idempotent_replayed, undefined);
  for (const role of ['viewer', 'editor']) {
    s.security.role = role;
    const before = JSON.stringify(s.disk());
    for (const [method, endpoint] of [
      ['GET', '/webhooks'], ['POST', '/webhooks'], ['GET', '/wallet'],
      ['POST', '/wallet/topup'], ['POST', '/connect/facebook'], ['POST', '/api-keys'],
    ]) assert.equal((await s.request(method, endpoint, { ...request, body: method === 'GET' ? undefined : request.body })).status, 403);
    assert.equal(JSON.stringify(s.disk()), before);
    const me = await s.request('GET', '/me', { cookie });
    assert.equal(me.status, 200);
    assert.equal(Object.hasOwn(me.body.data, 'wallet'), false);
    if (role === 'viewer') assert.equal((await s.request('POST', '/posts', { cookie, body: '{}' })).status, 403);
  }
  s.security.removed = true;
  assert.equal((await s.request('POST', '/webhooks', request)).status, 403);
  assert.equal(s.store.getWorkspace('tenant-a').webhooks.length, 0);
  assert.equal(s.counts().networkAttempts, 0);
});

test('inactive workspaces cannot use an issued API key or replay a prior mutation', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Active workspace key' });
  const request = { token: key.token, headers: { 'idempotency-key': 'active-intent' }, body: '{"name":"Profile"}' };
  assert.equal((await s.request('POST', '/profiles', request)).status, 501);
  for (const status of ['suspended', 'past_due', 'Archived']) {
    s.security.workspaceStatus = status;
    assert.equal((await s.request('POST', '/profiles', request)).status, 403);
    assert.equal((await s.request('GET', '/accounts', { token: key.token })).status, 403);
  }
  assert.equal(s.counts().networkAttempts, 0);
});

test('both account health endpoints require account read permission', async () => {
  for (const [scopes, expected] of [[['write'], 403], [['write'], 403], [['read'], 200], [['read','write'], 200]]) {
    const s = sandbox();
    const key = s.issueKey('tenant-a', { name: 'Scoped key', scopes });
    s.store.addConnectedAccount('tenant-a', { id: 'account-a', accountId: 'account-a', platform: 'facebook', username: 'page-a', displayName: 'Page A', status: 'active' });
    for (const endpoint of ['/accounts/health', '/accounts/account-a/health']) {
      assert.equal((await s.request('GET', endpoint, { token: key.token })).status, expected);
    }
    assert.equal(s.counts().networkAttempts, 0);
  }
});

test('phone purchases preserve provider status and stable intent without local wallet charges or cached success', async () => {
  const s = sandbox({ telephonyResult: { success: true, httpStatus: 202, status: 'kyc_required', purchaseIntentId: 'saved-intent', message: 'Verify identity', kycUrl: 'https://provider.invalid/kyc' } });
  const key = s.issueKey('tenant-a', { name: 'Buyer', scopes: ['read','write'] });
  const balance = s.store.getWorkspace('tenant-a').wallet.balanceUsd;
  const options = { token: key.token, headers: { 'idempotency-key': 'saved-intent' }, body: JSON.stringify({ country: 'DE', numberType: 'local', monthlyPriceUsd: 0.01 }) };
  const pending = await s.request('POST', '/phone-numbers/buy', options);
  assert.equal(pending.status, 202);
  assert.equal(pending.body.phoneNumber, undefined);
  assert.equal(pending.body.status, 'kyc_required');
  assert.equal(s.telephonyCalls[0].intent, 'saved-intent');
  assert.equal(s.telephonyCalls[0].organizationId, 'tenant-a');
  assert.equal(s.telephonyCalls[0].action, 'purchase'); // The canonical service fetches and validates the quote; caller prices never authorize spending.
  s.security.telephonyResult = { success: true, httpStatus: 200, status: 'already_purchased', phoneNumber: { id: 'real-provider-id', status: 'pending' }, message: 'Provider allocation pending' };
  const allocated = await s.request('POST', '/phone-numbers/buy', options);
  const retry = await s.request('POST', '/phone-numbers/buy', options);
  assert.equal(allocated.status, 200);
  assert.equal(retry.body.phoneNumber.status, 'pending');
  assert.equal(retry.body.meta.idempotent_replayed, undefined);
  assert.equal(s.telephonyCalls.length, 3);
  assert.equal(s.store.getWorkspace('tenant-a').wallet.balanceUsd, balance);
  assert.equal(s.store.getWorkspace('tenant-a').ownedNumbers.length, 0);
});

test('phone number reads refresh from provider and exclude fabricated wallet data', async () => {
  const s = sandbox({ telephonyResult: { numbers: [{ id: 'verified-number', status: 'pending' }], quota: { used: 1, max: 1 } } });
  const key = s.issueKey('tenant-a', { name: 'Reader', scopes: ['read'] });
  const result = await s.request('GET', '/phone-numbers', { token: key.token });
  assert.equal(result.status, 200);
  assert.equal(result.body.numbers[0].id, 'verified-number');
  assert.equal(result.body.walletBalanceUsd, undefined);
});

test('retired OTP and unreviewed release endpoints cannot claim success or mutate numbers', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Manager', scopes: ['read','write'] });
  for (const endpoint of ['/whatsapp/link', '/whatsapp/verify-otp']) {
    const result = await s.request('POST', endpoint, { token: key.token, body: '{"otp":"123456"}' });
    assert.equal(result.status, 501);
    assert.equal(result.body.error.code, 'feature_unavailable');
  }
  const release = await s.request('DELETE', '/phone-numbers/number-123', { token: key.token });
  assert.equal(release.status, 400);
  assert.equal(s.counts().networkAttempts, 0);
  assert.equal(s.store.getWorkspace('tenant-a').threads.length, 0);
});
test('legacy connect and selection cannot fabricate accounts or replay old placeholder success', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Manager', scopes: ['read','write'] });
  let cacheReads = 0;
  s.store.getIdempotencyRecord = () => { cacheReads++; throw new Error('Retired endpoints must bypass old cached success'); };
  for (const endpoint of ['/connect/whatsapp', '/connect/facebook/select']) {
    for (const method of ['GET', 'POST']) {
      const result = await s.request(method, endpoint, { token: key.token, headers: { 'idempotency-key': 'legacy-connection' }, ...(method === 'POST' ? { body: '{"username":"invented","entityId":"invented-page"}' } : {}) });
      assert.equal(result.status, 501);
      assert.equal(result.body.error.code, 'feature_unavailable');
    }
  }
  assert.equal(cacheReads, 0);
  assert.equal(s.counts().networkAttempts, 0);
  assert.equal(s.store.getWorkspace('tenant-a').connectedAccounts.length, 0);
});

test('verification cannot manufacture WhatsApp OTPs or replay an old successful verification', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Manager', scopes: ['read','write'] });
  s.store.getIdempotencyRecord = () => { throw new Error('Verification must bypass cached success'); };
  s.store.addVerification = () => { throw new Error('Local OTP generation is forbidden'); };
  s.store.checkVerification = () => { throw new Error('Local OTP approval is forbidden'); };
  for (const endpoint of ['/verify', '/verify/check']) {
    const result = await s.request('POST', endpoint, { token: key.token, headers: { 'idempotency-key': 'old-otp' }, body: '{"to":"+14155550101","channel":"whatsapp","code":"123456"}' });
    assert.equal(result.status, 501);
    assert.equal(result.body.error.code, 'feature_unavailable');
    assert.equal(result.body.code, undefined);
    assert.equal(result.body.verified, undefined);
  }
  assert.equal(s.counts().networkAttempts, 0);
});

test('dashboard publishing and accounts require fresh membership, matching tenant and allowed roles', async () => {
  for (const target of ['publishing','accounts']) {
    const s = sandbox({role:'viewer'});
    const readQuery=target==='publishing'?'?action=posts':'';
    assert.equal((await s.dashboardRequest(target,'GET',{query:readQuery})).status,401);
    assert.equal((await s.dashboardRequest(target,'GET',{cookie:tenantCookie(s),query:readQuery+(readQuery?'&':'?')+'organizationId=tenant-b'})).status,403);
    assert.equal((await s.dashboardRequest(target,'GET',{cookie:tenantCookie(s),query:readQuery})).status,200);
    const body=JSON.stringify(target==='publishing'?{action:'create',content:'hello'}:{action:'disconnect',accountId:'account-a'});
    assert.equal((await s.dashboardRequest(target,'POST',{cookie:tenantCookie(s),body})).status,403);
    s.security.role='editor';
    const response=await s.dashboardRequest(target,'POST',{cookie:tenantCookie(s),body});
    assert.equal(response.status,target==='publishing'?200:403);
    s.security.removed=true;
    assert.equal((await s.dashboardRequest(target,'GET',{cookie:tenantCookie(s),query:readQuery})).status,403);
    assert.equal(s.counts().networkAttempts,0);
  }
});
test('dashboard publishing forwards idempotency and 207 with provider error details; accounts reject foreign IDs', async()=>{
 const s=sandbox({role:'editor',publishingResult:{success:true,httpStatus:207,post:{id:'post-a',status:'partial',platforms:[{platform:'facebook',status:'failed'}]}}});
 const response=await s.dashboardRequest('publishing','POST',{cookie:tenantCookie(s),headers:{'idempotency-key':'real-intent'},body:JSON.stringify({action:'create',content:'hello',idempotencyKey:'body-intent'})});
 assert.equal(response.status,207);assert.equal(response.body.post.status,'partial');assert.equal(s.publishingCalls[0].input[0].organizationId,'tenant-a');assert.equal(s.publishingCalls[0].input[0].idempotencyKey,'real-intent');
 s.security.publishingError={status:429,error:'Provider rate limit',code:'rate_limited',requestId:'request-a',retryAfterSeconds:30,details:{accountId:'account-a'}};
 const failed=await s.dashboardRequest('publishing','POST',{cookie:tenantCookie(s),body:'{"action":"retry","postId":"post-a"}'});
 assert.equal(failed.status,429);assert.equal(failed.body.error.requestId,'request-a');assert.equal(failed.body.error.retryAfterSeconds,30);
 s.security.role='owner';
 assert.equal((await s.dashboardRequest('accounts','POST',{cookie:tenantCookie(s),body:'{"action":"disconnect","accountId":"foreign"}'})).status,403);
 s.store.addConnectedAccount('tenant-a',{id:'account-a',accountId:'account-a',platform:'facebook',status:'healthy'});
 s.security.accountError={status:503,error:'Disconnect uncertain',code:'disconnect_unconfirmed'};
 assert.equal((await s.dashboardRequest('accounts','POST',{cookie:tenantCookie(s),body:'{"action":"disconnect","accountId":"account-a"}'})).status,503);
 assert.equal(s.store.getWorkspace('tenant-a').connectedAccounts.length,1);
 assert.equal(s.counts().networkAttempts,0);
});
test('public publishing uses actual dispatcher, enforces scopes, preserves 207 and forwards stable intent on retries',async()=>{
 const s=sandbox({publishingResult:{success:true,httpStatus:207,post:{id:'post-a',status:'partial'}}});
 const reader=s.issueKey('tenant-a',{name:'Reader',scopes:['read']});
 const writer=s.issueKey('tenant-a',{name:'Writer',scopes:['write']});
 const input={body:'{"content":"hello","platforms":[{"platform":"facebook","accountId":"account-a"}]}',headers:{'idempotency-key':'publish-intent'}};
 assert.equal((await s.request('POST','/posts',{token:reader.token,...input})).status,403);assert.equal(s.publishingCalls.length,0);
 for(let i=0;i<2;i++){const result=await s.request('POST','/posts',{token:writer.token,...input});assert.equal(result.status,207);assert.equal(result.body.post.status,'partial');assert.equal(result.body.meta.idempotent_replayed,undefined);}
 assert.equal(s.publishingCalls.length,2);assert.equal(s.publishingCalls.every(call=>call.input[0].idempotencyKey==='publish-intent'),true);
 s.security.publishingError={status:502,error:'Platform rejected request',code:'platform_error',requestId:'provider-request',platformError:{platform:'facebook',code:'190'}};
 const failure=await s.request('POST','/posts',{token:writer.token,...input});assert.equal(failure.status,502);assert.equal(failure.body.error.requestId,'provider-request');assert.equal(failure.body.error.platformError.code,'190');
 assert.equal((await s.request('GET','/posts',{token:reader.token})).status,502);
 assert.equal(s.counts().networkAttempts,0);
});
test('public account mutations require management scope and preserve unconfirmed provider disconnect',async()=>{
 const s=sandbox();const reader=s.issueKey('tenant-a',{name:'Reader',scopes:['read']});const writer=s.issueKey('tenant-a',{name:'Manager',scopes:['read','write']});
 s.store.addConnectedAccount('tenant-a',{id:'account-a',accountId:'account-a',platform:'facebook',status:'healthy'});
 assert.equal((await s.request('DELETE','/accounts/account-a',{token:reader.token})).status,403);assert.equal(s.accountCalls.length,0);
 s.security.accountError={status:503,error:'Disconnect uncertain',code:'disconnect_unconfirmed'};
 const failed=await s.request('DELETE','/accounts/account-a',{token:writer.token});assert.equal(failed.status,503);assert.equal(failed.body.error.code,'disconnect_unconfirmed');assert.equal(s.store.getWorkspace('tenant-a').connectedAccounts.length,1);
 s.security.accountError=null;assert.equal((await s.request('DELETE','/accounts/account-a',{token:writer.token})).status,200);assert.equal(s.store.getWorkspace('tenant-a').connectedAccounts.length,0);assert.equal(s.counts().networkAttempts,0);
});

test('unsupported account settings and publishing validation cannot replay or manufacture success', async () => {
  const s = sandbox();
  const key = s.issueKey('tenant-a', { name: 'Manager', scopes: ['read','write'] });
  s.store.addConnectedAccount('tenant-a', { id: 'account-a', accountId: 'account-a', platform: 'facebook', status: 'healthy' });
  s.store.getIdempotencyRecord = () => { throw new Error('Unsupported operations must bypass old cached success'); };
  for (const [method, endpoint] of [
    ['DELETE', '/accounts/account-a/unsupported-setting'], ['GET', '/accounts/account-a/unsupported-setting'],
    ['POST', '/validate/post/unsupported'], ['POST', '/validate/media/unsupported'], ['GET', '/queue/preview'],
  ]) {
    const result = await s.request(method, endpoint, { token: key.token, headers: { 'idempotency-key': 'old-success' }, ...(method === 'POST' ? { body: '{}' } : {}) });
    assert.equal(result.status, 501);
    assert.equal(result.body.success, false);
  }
  assert.equal(s.store.getWorkspace('tenant-a').connectedAccounts.length, 1);
  assert.equal(s.publishingCalls.length, 0);
  assert.equal(s.accountCalls.length, 0);
  assert.equal(s.counts().networkAttempts, 0);
});

test('Phase 2B current roles separate comment replies and thread control from account settings', async () => {
  for (const role of ['viewer', 'editor', 'admin', 'owner']) {
    const s = sandbox({ role }); const cookie = tenantCookie(s);
    const comment = await s.dashboardRequest('comments', 'POST', { cookie, body: JSON.stringify({ action:'reply', accountId:'fb-a',postId:'post-a',commentId:'comment-a',text:'Reviewed',idempotencyKey:'intent' }) });
    assert.equal(comment.status, role === 'viewer' ? 403 : 200);
    const control = await s.dashboardRequest('settings','POST',{ cookie, body:JSON.stringify({ action:'thread_control', accountId:'fb-a', conversationId:'thread-a', controlAction:'request' }) });
    assert.equal(control.status,role === 'viewer' ? 403 : 200);
    for (const action of ['save','reset']) {
      const result = await s.dashboardRequest('settings','POST',{ cookie, body:JSON.stringify({ action,accountId:'fb-a',setting:'messenger-greeting',value:{ greeting:[{ locale:'default',text:'Welcome' }] } }) });
      assert.equal(result.status,['admin','owner'].includes(role) ? 200 : 403);
    }
    assert.equal((await s.dashboardRequest('settings','GET',{cookie,query:'?action=settings&accountId=fb-a&setting=messenger-greeting'})).status,200);
  }
});

test('Phase 2B dashboard APIs reject anonymous, foreign, cross-origin, malformed and revoked membership requests', async () => {
  for (const target of ['comments','settings']) {
    const s=sandbox(), cookie=tenantCookie(s), action=target==='comments'?'reply':'save';
    assert.equal((await s.dashboardRequest(target,'GET',{query:'?action=accounts'})).status,401);
    assert.equal((await s.dashboardRequest(target,'POST',{cookie,body:JSON.stringify({action,organizationId:'tenant-b'})})).status,403);
    assert.equal((await s.dashboardRequest(target,'POST',{cookie,body:JSON.stringify({action}),headers:{origin:'https://other.invalid'}})).status,403);
    for(const body of ['null','[1]','{']) assert.equal((await s.dashboardRequest(target,'POST',{cookie,body})).status,400);
    assert.equal((await s.dashboardRequest(target,'POST',{cookie,body:'{"action":"accounts"}'})).status,400);
    s.security.removed=true; assert.equal((await s.dashboardRequest(target,'GET',{cookie,query:'?action=accounts'})).status,403);
    assert.equal(s.commentsCalls.length+s.settingsCalls.length+s.metaInboxCalls.length,0);
  }
});

test('Phase 2B comments public routes enforce scopes, path identity and uncached provider outcomes', async () => {
  const s=sandbox(), reader=s.issueKey('tenant-a',{name:'Reader',scopes:['read']}), writer=s.issueKey('tenant-a',{name:'Inbox writer',scopes:['read','write']});
  const body=JSON.stringify({ accountId:'fb-a',postId:'spoof-post',commentId:'comment-a',message:'Reviewed',profileId:'foreign',idempotencyKey:'body-key' });
  assert.equal((await s.request('POST','/inbox/comments/post-a',{token:reader.token,body})).status,403); assert.equal(s.commentsCalls.length,0);
  s.store.getIdempotencyRecord=()=>{throw Error('Provider comments must bypass old response cache');};
  const sent=await s.request('POST','/inbox/comments/post-a',{token:writer.token,body,headers:{'idempotency-key':'header-key'}}); assert.equal(sent.status,200);
  assert.deepEqual(JSON.parse(JSON.stringify(s.commentsCalls.at(-1))),{method:'reply',input:{organizationId:'tenant-a',accountId:'fb-a',postId:'post-a',commentId:'comment-a',text:'Reviewed',idempotencyKey:'header-key'}});
  s.security.commentsResult={httpStatus:207,data:[],meta:{failedAccounts:[{accountId:'fb-a',reason:'expired'}]},pagination:{hasMore:true,nextCursor:'opaque'}};
  const read=await s.request('GET','/inbox/comments?accountId=fb-a&cursor=cursor&limit=12',{token:reader.token});assert.equal(read.status,207);assert.equal(read.body.meta.failedAccounts[0].reason,'expired');assert.equal(s.commentsCalls.at(-1).input.limit,12);
  for(const[method,endpoint,expected]of[['POST','/inbox/comments/post-a/comment-b/private-reply','privateReply'],['POST','/inbox/comments/post-a/comment-b/hide','hide'],['DELETE','/inbox/comments/post-a/comment-b/hide','hide']]) {
    assert.equal((await s.request(method,endpoint,{token:writer.token,body})).status,207);const call=s.commentsCalls.at(-1);assert.equal(call.method,expected);assert.equal(call.input.postId,'post-a');assert.equal(call.input.commentId,'comment-b');if(expected==='hide')assert.equal(call.input.hidden,method==='POST');
  }
  s.security.commentsError={status:429,error:'Private reply consumed',details:{privateReplyConsumed:true,retryAllowed:false},platformError:{code:10},retryAfterSeconds:20};
  const failed=await s.request('POST','/inbox/comments/post-a/comment-b/private-reply',{token:writer.token,body});assert.equal(failed.status,429);assert.equal(failed.body.error.details.retryAllowed,false);assert.equal(failed.body.error.platformError.code,10);assert.equal(failed.body.meta.idempotent_replayed,undefined);
});

test('Phase 2B settings public paths require management scopes and never use legacy local settings',async()=>{
  const s=sandbox(), reader=s.issueKey('tenant-a',{name:'Read',scopes:['read']}), inbox=s.issueKey('tenant-a',{name:'Inbox editor',scopes:['read','write'],role:'editor'}), writer=s.issueKey('tenant-a',{name:'Manage',scopes:['read','write']});
  const endpoint='/accounts/fb-a/messenger-greeting', value={greeting:[{locale:'default',text:'Hello'}]};
  assert.equal((await s.request('PUT',endpoint,{token:reader.token,body:JSON.stringify(value)})).status,403);
  assert.equal((await s.request('PUT',endpoint,{token:inbox.token,body:JSON.stringify(value)})).status,403);
  s.store.getIdempotencyRecord=()=>{throw Error('Messaging settings must not replay local responses');};
  assert.equal((await s.request('PUT',endpoint+'?accountId=foreign&setting=wrong',{token:writer.token,body:JSON.stringify(value),headers:{'idempotency-key':'same'}})).status,200);
  const call=s.settingsCalls.at(-1);assert.equal(call.input.accountId,'fb-a');assert.equal(call.input.setting,'messenger-greeting');assert.deepEqual(JSON.parse(JSON.stringify(call.input.value)),value);
  assert.equal((await s.request('GET',endpoint,{token:reader.token})).status,200);assert.equal((await s.request('DELETE',endpoint,{token:writer.token})).status,200);
  for(const setting of ['messenger-menu','messenger-greeting','messenger-ice-breakers','instagram-ice-breakers']) assert.equal((await s.request('POST','/account-settings/'+setting,{token:writer.token,body:'{}',headers:{'idempotency-key':'old'}})).status,501);
  s.security.settingsError={status:503,error:'Refresh required',details:{outcome:'unknown',reconcileBeforeRetry:true}};
  assert.equal((await s.request('PUT',endpoint,{token:writer.token,body:JSON.stringify(value),headers:{'idempotency-key':'same'}})).status,503);
});

test('Phase 2B thread-control canonical route and handover alias preserve pending state and current role gates',async()=>{
  const s=sandbox({role:'editor',settingsResult:{success:true,httpStatus:202,confirmed:false,pending:true}}), reader=s.issueKey('tenant-a',{name:'Read',scopes:['read']}), writer=s.issueKey('tenant-a',{name:'Reply',scopes:['read','write']});
  const body=JSON.stringify({accountId:'ig-a',conversationId:'spoof-thread',action:'request',targetAppId:undefined});
  assert.equal((await s.request('POST','/inbox/conversations/thread-a/thread-control',{token:reader.token,body})).status,403);
  for(const action of ['thread-control','handover']) {const result=await s.request('POST','/inbox/conversations/thread-a/'+action,{token:writer.token,body});assert.equal(result.status,202);assert.equal(result.body.pending,true);assert.equal(result.body.confirmed,false);assert.equal(s.settingsCalls.at(-1).input.conversationId,'thread-a');assert.equal(s.settingsCalls.at(-1).input.action,'request');}
  assert.equal((await s.request('POST','/inbox/conversations/thread-a/handover',{cookie:tenantCookie(s),body})).status,202);
  s.security.role='viewer';assert.equal((await s.request('POST','/inbox/conversations/thread-a/handover',{cookie:tenantCookie(s),body})).status,403);
});

test('Phase 2B private reply adapters reject unsupported interactive payloads rather than silently dropping them',async()=>{
  const s=sandbox(), key=s.issueKey('tenant-a',{name:'Reply',scopes:['read','write']});
  for(const field of ['attachments','attachmentUrl','buttons','quickReplies']) {
    const body=JSON.stringify({action:'private_reply',accountId:'fb-a',postId:'post-a',commentId:'comment-a',text:'Hello',idempotencyKey:'intent',[field]:[]});
    assert.equal((await s.dashboardRequest('comments','POST',{cookie:tenantCookie(s),body})).status,400);
    assert.equal((await s.request('POST','/inbox/comments/post-a/comment-a/private-reply',{token:key.token,body})).status,400);
  }
  assert.equal(s.commentsCalls.length,0);
});

test('Phase 2C quota reads preserve provider values and path identity with read or publish scope',async()=>{
  const s=sandbox({publishingResult:{httpStatus:200,quotaUsage:12,quotaTotal:50,quotaDurationSeconds:86400}});
  for(const scopes of [['read'],['read','write']]) {
    const key=s.issueKey('tenant-a',{name:'Quota reader',scopes});
    const result=await s.request('GET','/accounts/ig-a/instagram/publishing-limit?accountId=foreign',{token:key.token});
    assert.equal(result.status,200);assert.equal(result.body.quotaUsage,12);assert.equal(result.body.quotaTotal,50);
    assert.deepEqual(JSON.parse(JSON.stringify(s.publishingCalls.at(-1))),{method:'getInstagramPublishingLimit',input:[{organizationId:'tenant-a',accountId:'ig-a'}]});
  }
  const denied=s.issueKey('tenant-a',{name:'Write only',scopes:['write']});
  assert.equal((await s.request('GET','/accounts/ig-a/instagram/publishing-limit',{token:denied.token})).status,403);
  s.security.role='viewer';const cookie=tenantCookie(s);
  const result=await s.dashboardRequest('publishing','GET',{cookie,query:'?action=instagram_limit&accountId=ig-a'});assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal((await s.dashboardRequest('publishing','GET',{cookie,query:'?action=instagram_limit&accountId=ig-a&organizationId=foreign'})).status,403);
});

test('Phase 2C preflight validates with current editor roles and rejects read-only API keys',async()=>{
  const s=sandbox({role:'viewer',publishingResult:{httpStatus:200,valid:false,errors:[{field:'mediaItems',message:'Media required'}],warnings:['Provider check']}});
  const value={action:'validate_post',content:'Caption',mediaItems:[],platforms:[{platform:'instagram',accountId:'ig-a'}]};
  assert.equal((await s.dashboardRequest('publishing','POST',{cookie:tenantCookie(s),body:JSON.stringify(value)})).status,403);
  const reader=s.issueKey('tenant-a',{name:'Reader',scopes:['read']});
  assert.equal((await s.request('POST','/validate/post',{token:reader.token,body:JSON.stringify(value)})).status,403);assert.equal(s.publishingCalls.length,0);
  s.security.role='editor';
  const checked=await s.dashboardRequest('publishing','POST',{cookie:tenantCookie(s),body:JSON.stringify({...value,profileId:'foreign'})});
  assert.equal(checked.status,200);assert.equal(checked.body.valid,false);assert.equal(checked.body.errors[0].field,'mediaItems');
  assert.equal(s.publishingCalls.at(-1).input[0].organizationId,'tenant-a');assert.equal(s.publishingCalls.at(-1).input[0].profileId,undefined);
  s.security.removed=true;assert.equal((await s.dashboardRequest('publishing','POST',{cookie:tenantCookie(s),body:JSON.stringify(value)})).status,403);
});

test('Phase 2C preflight and quota use fresh provider results without cached success or fabricated media properties',async()=>{
  const s=sandbox({publishingResult:{httpStatus:200,valid:false,url:'https://example.invalid/media',error:'Media unavailable',size:null,type:'unknown'}}), writer=s.issueKey('tenant-a',{name:'Publisher',scopes:['read','write']});
  s.store.getIdempotencyRecord=()=>{throw Error('Preflight cannot replay cached results');};
  const params={token:writer.token,headers:{'idempotency-key':'validation-key'},body:JSON.stringify({accountId:'ig-a',url:'https://example.invalid/media',profileId:'foreign'})};
  const media=await s.request('POST','/validate/media',params);assert.equal(media.status,200);assert.equal(media.body.valid,false);assert.equal(media.body.size,null);
  assert.deepEqual(JSON.parse(JSON.stringify(s.publishingCalls.at(-1))),{method:'validateMedia',input:[{organizationId:'tenant-a',accountId:'ig-a',url:'https://example.invalid/media'}]});
  s.security.publishingError={status:503,error:'Provider unavailable',details:{retryable:true},requestId:'provider-id'};
  const failed=await s.request('POST','/validate/media',params);assert.equal(failed.status,503);assert.equal(failed.body.error.requestId,'provider-id');assert.equal(failed.body.meta.idempotent_replayed,undefined);
  assert.equal((await s.request('GET','/accounts/ig-a/instagram/publishing-limit',{token:writer.token})).status,503);
});
