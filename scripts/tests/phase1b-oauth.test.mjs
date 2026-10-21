import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/auth/oauth-session.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const profileId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const session = () => ({ user: { id: 'user-a' }, tenant: { organizationId: 'tenant-a' }, expiresAt: Date.now() + 60_000 });
const request = (cookie = 'asra3_session=private-signature-a') => new Request('https://asra3.com/api/connect', { method: 'POST', headers: { cookie } });

function sandbox(options = {}) {
  const rows = new Map(); const calls = []; const persisted = [];
  class TenantAccessError extends Error { constructor(status, message) { super(message); this.status = status; } }
  class ZernioApiException extends Error { constructor(envelope) { super(envelope.error); this.envelope = envelope; } }
  const db = { from: (table) => {
    assert.equal(table, 'oauth_sessions');
    let patch; const filters = {}; let expiry;
    const query = {
      insert: async (row) => { rows.set(row.id, { ...row }); return { error: options.databaseError || null }; },
      select: () => query, eq: (key, value) => { filters[key] = value; return query; },
      gt: (_, value) => { expiry = value; return query; }, update: (value) => { patch = value; return query; },
      maybeSingle: async () => {
        if (options.databaseError) return { data: null, error: options.databaseError };
        const row = rows.get(filters.id);
        if (!row || Object.entries(filters).some(([key, value]) => row[key] !== value) || expiry && row.expires_at <= expiry) return { data: null, error: null };
        if (patch) Object.assign(row, patch);
        return { data: { ...row }, error: null };
      },
    }; return query;
  } };
  const core = {
    ensureTenantProfile: async () => options.profileId || profileId,
    startHeadlessOAuth: async (params) => { calls.push({ action: 'start', params }); return { authUrl: options.authUrl || 'https://provider.invalid/auth', simulated: false }; },
    listHeadlessSelectableEntities: async (params) => {
      calls.push({ action: 'list', params });
      return { raw: options.resources || { phoneNumbers: [{ phone_number_id: 'phone-a', wabaId: 'waba-a', display_phone_number: '+1 (310) 555-1234', verified_name: 'Brand' }] } };
    },
    completeHeadlessSelection: async (params) => { calls.push({ action: 'complete', params }); return { account: { accountId: 'account-a' } }; },
  };
  const modules = {
    'node:crypto': crypto,
    '@/lib/accounts/lifecycle': { verifyReconnectIdentity: async () => { throw new Error('Unexpected reconnect in Phase1B fixture'); } },
    '@/lib/auth/session': { SESSION_SECRET: options.missingSecret ? '' : 'private-isolated-oauth-signing-secret', SESSION_COOKIE_NAME: 'asra3_session' },
    '@/lib/auth/tenant-access': { TenantAccessError }, '@/lib/zernio/client': { ZernioApiException },
    '@/lib/telephony/phone-numbers': { getOwnedPhoneNumberForWhatsApp: async () => {
      calls.push({ action: 'verify-number' });
      if (options.releasedNumber) throw new TenantAccessError(409, 'number released');
      return { phoneNumber: '+13105551234', socialAccountId: options.linkedAccountId };
    } },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => options.missingDatabase ? null : db },
    '@/lib/services/core-connect.service': { CoreConnectService: core },
    '@/lib/storage/workspace-store': { WorkspaceStore: { addConnectedAccount: (...args) => {
      if (options.cacheError) throw new Error('cache write failed');
      persisted.push(args);
    } } },
    '@/lib/auth/tenant-provider': { requireTenantAccounts: async () => {
      calls.push({ action: 'verify' });
      if (options.foreignAccount) throw new TenantAccessError(403, 'foreign account');
      return [{ _id: 'account-a', platform: options.accountPlatform || 'whatsapp', profileId,
        username: options.accountPhone || '+13105551234', displayName: 'Canonical Brand', isActive: options.inactive !== true }];
    } },
  };
  const exports = {};
  vm.runInNewContext(`(function(require,exports) {\n${source}\n})`, {
    Date, Buffer, URL, process: { env: { NEXT_PUBLIC_APP_URL: 'https://asra3.com' } },
  })((name) => { assert.ok(modules[name], `Denied module: ${name}`); return modules[name]; }, exports);
  const start = async (platform = 'whatsapp', expected, purchasedId) => exports.startOAuthSession(request(), session(), { platform, whatsappOnboarding: 'api', whatsappSignupMode: 'headless' }, expected, purchasedId);
  const accept = (nonce, extra = {}, req = request(), user = session()) => exports.acceptOAuthCallback(req, user, { oauthSessionId: nonce, platform: 'whatsapp', profileId, step: 'select_phone_number', tempToken: 'temporary-private-provider-token', ...extra });
  const list = (nonce) => exports.listOAuthResources(request(), session(), nonce, 'whatsapp');
  const complete = (nonce, extra = {}) => exports.completeOAuthSelection(request(), session(), { oauthSessionId: nonce, platform: 'whatsapp', entityId: 'phone-a', wabaId: 'waba-a', ...extra });
  return { ...exports, rows, calls, persisted, start, accept, list, complete };
}

test('start generates session state before provider request and only returns an HTTPS authorization URL', async () => {
  const s = sandbox(); const result = await s.start();
  assert.match(result.oauthSessionId, /^[a-f0-9]{64}$/);
  assert.equal(new URL(s.calls[0].params.redirectUrl).searchParams.get('asra3_oauth_state'), result.oauthSessionId);
  assert.equal(s.rows.get(result.oauthSessionId).platform, 'whatsapp');
  assert.equal(Object.hasOwn(result, 'profileId'), false);
  for (const authUrl of ['http://provider.invalid/auth', 'https://user:secret@provider.invalid/auth']) {
    const invalid = sandbox({ authUrl }); await assert.rejects(invalid.start(), /secure authorization URL/);
    assert.equal([...invalid.rows.values()][0].status, 'failed');
  }
});

test('missing durable store, secret and schema fail closed before OAuth launch', async () => {
  for (const options of [{ missingDatabase: true }, { missingSecret: true }, { databaseError: 'missing relation' }]) {
    const s = sandbox(options); await assert.rejects(s.start(), (error) => error.status === 503);
    assert.equal(s.calls.length, 0);
  }
});

test('callback rejects absent, forged, wrong sign-in, user, tenant, platform, profile and expired nonce', async () => {
  const s = sandbox(); const { oauthSessionId: nonce } = await s.start();
  for (const [value, extra, req, user, status] of [
    ['', {}, request(), session(), 400], ['b'.repeat(64), {}, request(), session(), 403],
    [nonce, {}, request('asra3_session=another-signature'), session(), 403],
    [nonce, {}, request(), { ...session(), user: { id: 'user-b' } }, 403],
    [nonce, {}, request(), { ...session(), tenant: { organizationId: 'tenant-b' } }, 403],
    [nonce, { platform: 'facebook' }, request(), session(), 403],
    [nonce, { profileId: 'foreign-profile' }, request(), session(), 403],
  ]) await assert.rejects(s.accept(value, extra, req, user), (error) => error.status === status);
  s.rows.get(nonce).expires_at = new Date(Date.now() - 1).toISOString();
  await assert.rejects(s.accept(nonce), (error) => error.status === 410);
  assert.equal(s.persisted.length, 0);
});

test('callback context is encrypted and bound to nonce, preserves Facebook context, and never returns tokens', async () => {
  const s = sandbox({ resources: { pages: [{ id: 'page-a', name: 'Brand Page' }] }, accountPlatform: 'facebook' });
  const { oauthSessionId: nonce } = await s.start('facebook');
  const result = await s.accept(nonce, { platform: 'facebook', step: 'select_page', userProfile: encodeURIComponent(JSON.stringify({ id: 'meta-user' })), connect_token: 'temporary-connect-token' });
  const encrypted = s.rows.get(nonce).encrypted_context;
  assert.ok(!encrypted.includes('temporary-private-provider-token'));
  assert.ok(!JSON.stringify(result).includes('tempToken'));
  assert.equal(s.decryptOAuthContext(encrypted, nonce).connectToken, 'temporary-connect-token');
  assert.throws(() => s.decryptOAuthContext(encrypted, 'b'.repeat(64)), /could not be read/);
  await s.listOAuthResources(request(), session(), nonce, 'facebook');
  await s.completeOAuthSelection(request(), session(), { oauthSessionId: nonce, platform: 'facebook', entityId: 'page-a', tempToken: 'forged', userProfile: { id: 'forged' } });
  const params = s.calls.find((call) => call.action === 'complete').params;
  assert.equal(params.tempToken, 'temporary-private-provider-token');
  assert.equal(params.userProfile.id, 'meta-user');
  assert.equal(params.connectToken, 'temporary-connect-token');
});

test('WhatsApp picker retains snake-case number details and requires its matching WABA', async () => {
  const s = sandbox(); const { oauthSessionId: nonce } = await s.start(); await s.accept(nonce);
  const result = await s.list(nonce);
  assert.equal(result.items[0].id, 'phone-a'); assert.equal(result.items[0].wabaId, 'waba-a');
  assert.equal(result.items[0].username, '+1 (310) 555-1234'); assert.equal(result.items[0].name, 'Brand');
  await assert.rejects(s.complete(nonce, { wabaId: '' }), (error) => error.status === 400);
  await assert.rejects(s.complete(nonce, { entityId: 'foreign-phone' }), (error) => error.status === 400);
  await s.complete(nonce); assert.equal(s.persisted[0][1].username, '+13105551234');
  assert.equal(s.rows.get(nonce).encrypted_context, null);
});

test('one-time callback and completion reject replay and concurrent selection', async () => {
  const s = sandbox(); const { oauthSessionId: nonce } = await s.start();
  await s.accept(nonce); await assert.rejects(s.accept(nonce), (error) => error.status === 409);
  await s.list(nonce);
  const results = await Promise.allSettled([s.complete(nonce), s.complete(nonce)]);
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal(s.calls.filter((item) => item.action === 'complete').length, 1);
  assert.equal(s.persisted.length, 1);
  await assert.rejects(s.complete(nonce), (error) => error.status === 409);
});

test('cancel and provider errors consume authorization with recoverable messages and no connected claim', async () => {
  for (const error of ['connection_cancelled', 'access_denied', 'whatsapp_number_pinned_to_profile']) {
    const s = sandbox(); const { oauthSessionId: nonce } = await s.start();
    await assert.rejects(s.accept(nonce, { error }), (failure) => failure.status === 400);
    assert.equal(s.rows.get(nonce).status, 'failed'); assert.equal(s.persisted.length, 0);
  }
});

test('hosted callback requires canonical active provider identity and purchased number match', async () => {
  for (const options of [{ foreignAccount: true }, { accountPlatform: 'facebook' }, { inactive: true }, { accountPhone: '+19995555555' }]) {
    const s = sandbox(options); const { oauthSessionId: nonce } = await s.start('whatsapp', '+13105551234');
    await assert.rejects(s.accept(nonce, { step: '', accountId: 'account-a' }));
    assert.equal(s.rows.get(nonce).status, 'failed'); assert.equal(s.persisted.length, 0);
  }
  const s = sandbox(); const { oauthSessionId: nonce } = await s.start('whatsapp', '+13105551234');
  const result = await s.accept(nonce, { step: '', accountId: 'account-a', username: 'fake', displayName: 'fake' });
  assert.equal(result.account.displayName, 'Canonical Brand'); assert.equal(result.account.status, 'active');
});

test('purchased number selection only lists the bound E164 and cannot substitute another number', async () => {
  const s = sandbox({ resources: { phoneNumbers: [
    { id: 'phone-a', wabaId: 'waba-a', display_phone_number: '+1 (310) 555-1234' },
    { id: 'phone-b', wabaId: 'waba-b', display_phone_number: '+19995555555' },
  ] } });
  const { oauthSessionId: nonce } = await s.start('whatsapp', '+13105551234'); await s.accept(nonce);
  assert.equal((await s.list(nonce)).items.length, 1);
  await assert.rejects(s.complete(nonce, { entityId: 'phone-b', wabaId: 'waba-b' }), (error) => error.status === 400);
});

test('purchased number ownership and active status are refreshed at completion', async () => {
  const s = sandbox({ releasedNumber: true });
  const { oauthSessionId: nonce } = await s.start('whatsapp', '+13105551234', 'owned-number-a');
  await assert.rejects(s.accept(nonce, { step: '', accountId: 'account-a' }), (error) => error.status === 409);
  assert.equal(s.calls.filter((call) => call.action === 'verify-number').length, 1);
  assert.equal(s.persisted.length, 0);
});

test('already decoded callback profiles preserve literal percent names', async () => {
  for (const name of ['100% Sales', '%20 Marketing']) {
    const s = sandbox(); const { oauthSessionId: nonce } = await s.start();
    await s.accept(nonce, { userProfile: JSON.stringify({ name }) });
    assert.equal(s.decryptOAuthContext(s.rows.get(nonce).encrypted_context, nonce).userProfile.name, name);
  }
});

test('canonical phone matches formatted E164 with or without leading plus', async () => {
  const s = sandbox({ accountPhone: '13105551234' }); const { oauthSessionId: nonce } = await s.start('whatsapp', '+13105551234');
  const result = await s.accept(nonce, { step: '', accountId: 'account-a' });
  assert.equal(result.success, true);
});

test('dashboard cache failure preserves consumed state and reports provider connection truthfully', async () => {
  const s = sandbox({ cacheError: true }); const { oauthSessionId: nonce } = await s.start();
  await assert.rejects(s.accept(nonce, { step: '', accountId: 'account-a' }), (error) => error.status === 503 && /provider confirmed/.test(error.message));
  assert.equal(s.rows.get(nonce).status, 'consumed');
});

test('purchased number linked account identity must match the canonical callback account', async () => {
  const s = sandbox({ linkedAccountId: 'different-account' });
  const { oauthSessionId: nonce } = await s.start('whatsapp', '+13105551234', 'owned-number-a');
  await assert.rejects(s.accept(nonce, { step: '', accountId: 'account-a' }), (error) => error.status === 409);
  assert.equal(s.persisted.length, 0);
});

test('Facebook incomplete Page lists retain their flag without leaking provider tokens', async () => {
  const s = sandbox({ resources: { truncated: true, pages: [{ id: 'page-a', name: 'Our Page', access_token: 'private-page-token' }] } });
  const { oauthSessionId: nonce } = await s.start('facebook');
  await s.accept(nonce, { platform: 'facebook', step: 'select_page' });
  const result = await s.listOAuthResources(request(), session(), nonce, 'facebook');
  assert.equal(result.truncated, true);
  assert.equal(result.items[0].id, 'page-a');
  assert.equal(JSON.stringify(result).includes('private-page-token'), false);
  assert.equal(result.items[0].access_token, undefined);
});

test('Instagram selector shows the Instagram handle while preserving the Page ID and hiding its token', () => {
  const s = sandbox();
  const items = s.normalizeOAuthResources({ pages: [{ id: 'page-a', name: 'Our Page', username: 'page_handle', access_token: 'private-page-token', instagram_business_account: { id: 'instagram-a', username: 'instagram_handle' } }, { id: 'page-without-instagram' }] }, 'instagram');
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'page-a');
  assert.equal(items[0].instagramAccountId, 'instagram-a');
  assert.equal(items[0].username, 'instagram_handle');
  assert.equal(JSON.stringify(items).includes('private-page-token'), false);
});
