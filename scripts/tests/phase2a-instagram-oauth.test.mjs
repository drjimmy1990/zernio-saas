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
    completeHeadlessSelection: async (params) => { calls.push({ action: 'complete', params }); return { account: { accountId: options.returnedAccountId || 'account-a' } }; },
  };
  const modules = {
    'node:crypto': crypto,
    '@/lib/accounts/lifecycle': { verifyReconnectIdentity: async () => ({ reconnectAccountId: 'account-a', expectedPlatformUserId: 'ig-a', loginMethod: options.loginMethod || 'instagram_login' }) },
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
      return [{ _id: 'account-a', platform: options.accountPlatform || 'whatsapp', profileId, platformUserId: options.platformUserId || 'ig-a', metadata: { loginMethod: options.loginMethod || 'instagram_login', instagramScopedId: options.scopedId },
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

test('direct Instagram reconnect preserves encrypted method and rejects another professional identity', async()=>{
 const s=sandbox({accountPlatform:'instagram',platformUserId:'ig-other'});
 const started=await s.startOAuthSession(request(),session(),{platform:'instagram',loginMethod:'instagram_login',reconnectAccountId:'account-a'});
 await assert.rejects(s.acceptOAuthCallback(request(),session(),{oauthSessionId:started.oauthSessionId,platform:'instagram',profileId,accountId:'account-a',loginMethod:'facebook_login'}),/different platform identity/);
 assert.equal(s.persisted.length,0);
});
test('Facebook-linked Instagram picker checks linked professional ID before provider selection',async()=>{
 const s=sandbox({accountPlatform:'instagram',loginMethod:'facebook_login',resources:{pages:[{id:'page-a',name:'Original',instagram_business_account:{id:'ig-a'}},{id:'page-b',name:'Wrong',instagram_business_account:{id:'ig-b'}},{id:'no-ig',name:'Unlinked'}]}});
 const started=await s.startOAuthSession(request(),session(),{platform:'instagram',loginMethod:'facebook_login',reconnectAccountId:'account-a'});
 await s.acceptOAuthCallback(request(),session(),{oauthSessionId:started.oauthSessionId,platform:'instagram',profileId,step:'select_account',tempToken:'private-token'});
 const resources=await s.listOAuthResources(request(),session(),started.oauthSessionId,'instagram');assert.equal(resources.items.length,2);
 await assert.rejects(s.completeOAuthSelection(request(),session(),{oauthSessionId:started.oauthSessionId,platform:'instagram',entityId:'page-b'}),/original Instagram account/);assert.equal(s.calls.some(call=>call.action==='complete'),false);
 await s.completeOAuthSelection(request(),session(),{oauthSessionId:started.oauthSessionId,platform:'instagram',entityId:'page-a'});assert.equal(s.persisted.length,1);
});
test('direct Instagram callback rejects forged Page selection and accepts canonical scoped identity',async()=>{
 const s=sandbox({accountPlatform:'instagram',platformUserId:'app-scoped',scopedId:'ig-a'});
 const started=await s.startOAuthSession(request(),session(),{platform:'instagram',reconnectAccountId:'account-a'});
 await assert.rejects(s.acceptOAuthCallback(request(),session(),{oauthSessionId:started.oauthSessionId,platform:'instagram',profileId,step:'select_account',tempToken:'private-token'}),/does not use/);
 await s.acceptOAuthCallback(request(),session(),{oauthSessionId:started.oauthSessionId,platform:'instagram',profileId,accountId:'account-a'});assert.equal(s.persisted.length,1);
});
