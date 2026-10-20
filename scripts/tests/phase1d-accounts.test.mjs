import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function fixture({ foreign = false, failure = false, absent = false, inventoryFailure = false, identity = 'page-a', acknowledgment = { message: 'Account disconnected successfully' } } = {}) {
  const calls = []; let removed = false;
  class ProviderError extends Error { constructor(envelope) { super(envelope.error); this.envelope = envelope; } }
  const account = { _id: 'account-a', profileId: 'profile-a', platform: 'facebook', platformUserId: identity };
  const modules = {
    '@/lib/auth/tenant-provider': { requireTenantAccounts: async () => { calls.push('ownership'); if (foreign) throw new Error('foreign'); return [account]; } },
    '@/lib/auth/tenant-access': { TenantAccessError: class extends Error { constructor(status, message) { super(message); this.status = status; } } },
    '@/lib/services/core-connect.service': { CoreConnectService: { ensureTenantProfile: async () => 'profile-a' } },
    '@/lib/storage/workspace-store': { WorkspaceStore: { removeConnectedAccount: () => { removed = true; } } },
    '@/lib/zernio/client': { ZernioApiException: ProviderError, zernioClient: { request: async (request) => {
      calls.push(request);
      if (request.method === 'DELETE') { if (failure) throw new ProviderError({ status: 504, error: 'timeout' }); return { data: acknowledgment }; }
      if (inventoryFailure) throw new Error('offline');
      return { data: { accounts: absent ? [] : [account] } };
    } } },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/lib/accounts/lifecycle.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(`(function(require,exports){${source}\n})`) ((name) => modules[name], exports);
  return { ...exports, calls, removed: () => removed };
}

test('ownership is proved before provider DELETE and local removal', async () => {
  const f = fixture({ absent: true }); const result = await f.disconnectAccount('org-a', 'account-a');
  assert.equal(f.calls[0], 'ownership'); assert.equal(f.calls[1].method, 'DELETE');
  assert.equal(f.calls[1].path, '/accounts/account-a'); assert.equal(f.removed(), true); assert.equal(result.simulated, false);
  const foreign = fixture({ foreign: true }); await assert.rejects(foreign.disconnectAccount('org-a', 'account-a'), /foreign/);
  assert.equal(foreign.calls.length, 1); assert.equal(foreign.removed(), false);
});
test('failed or unknown disconnect retains local account until provider absence is confirmed', async () => {
  for (const options of [{ failure: true }, { failure: true, inventoryFailure: true }]) {
    const f = fixture(options); await assert.rejects(f.disconnectAccount('org-a', 'account-a'), /not confirmed/); assert.equal(f.removed(), false);
  }
  const recovered = fixture({ failure: true, absent: true });
  assert.equal((await recovered.disconnectAccount('org-a', 'account-a')).alreadyDisconnected, true);
  assert.equal(recovered.calls[2].query.profileId, 'profile-a'); assert.equal(recovered.removed(), true);
});
test('Facebook reconnect captures only provider identity and rejects missing or wrong platform', async () => {
  const f = fixture(); assert.equal((await f.verifyReconnectIdentity('org-a', 'account-a', 'facebook')).expectedPlatformUserId, 'page-a');
  await assert.rejects(f.verifyReconnectIdentity('org-a', 'account-a', 'instagram'), /original platform/);
  const missing = fixture({ identity: '' });
  await assert.rejects(missing.verifyReconnectIdentity('org-a', 'account-a', 'facebook'), /Page identity/);
  const source = fs.readFileSync('src/lib/auth/oauth-session.ts', 'utf8');
  assert.match(source, /chosen.id !== context.expectedPlatformUserId/);
  assert.match(source, /accountId !== reconnect.reconnectAccountId/);
});

function healthFixture(failure = false) {
  const calls = [];
  const exports = {};
  class ProviderError extends Error { constructor(envelope) { super(envelope.error); } }
  const modules = {
    '@/lib/supabase/admin': {}, '@/lib/accounts/lifecycle': {},
    '@/lib/zernio/policy-engine': { assertSubServiceAllowed: async () => ({ quotas: { maxConnectedAccounts: 5 } }) },
    '@/lib/zernio/client': { ZernioApiException: ProviderError, zernioClient: { request: async (request) => {
      calls.push(request);
      if (failure) throw new Error('provider offline');
      return { data: request.path === '/accounts' ? { accounts: [
        { _id: 'a', profileId: 'profile-a', platform: 'facebook', isActive: false, needsReconnection: true },
        { _id: 'b', profileId: 'profile-a', platform: 'facebook', isActive: true, enabled: false },
        { _id: 'foreign', profileId: 'profile-b', platform: 'facebook', isActive: true },
      ] } : { accounts: [{ accountId: 'a', profileId: 'profile-a', status: 'error', needsReconnect: true, canPost: false }] } };
    } } },
  };
  const source = ts.transpileModule(fs.readFileSync('src/lib/services/core-connect.service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(`(function(require,exports){${source}\n})`)((name) => modules[name], exports);
  exports.CoreConnectService.ensureTenantProfile = async () => 'profile-a';
  return { service: exports.CoreConnectService, calls };
}
test('fresh health excludes foreign accounts, preserves disconnected flags and never fills missing health as healthy', async () => {
  const f = healthFixture(); const result = await f.service.listTenantAccountsWithHealth('org-a');
  assert.equal(result.accounts.length, 2); assert.equal(result.accounts[0].isActive, false);
  assert.equal(result.accounts[0].needsReconnection, true); assert.equal(result.accounts[1].status, 'unknown');
  assert.equal(result.accounts[1].canPost, false); assert.equal(result.summary.healthy, 0);
  assert.equal(result.simulated, false); assert.equal(f.calls.length, 2);
  assert.equal(f.calls.every((request) => request.query.profileId === 'profile-a'), true);
});
test('provider outage cannot fall back to retained healthy local accounts', async () => {
  await assert.rejects(healthFixture(true).service.listTenantAccountsWithHealth('org-a'), /provider offline/);
});

test('connected but disabled publishing accounts retain the canonical enabled flag', async () => {
  const result = await healthFixture().service.listTenantAccountsWithHealth('org-a');
  assert.equal(result.accounts[1].isActive, true);
  assert.equal(result.accounts[1].enabled, false);
  assert.equal(result.accounts[0].enabled, undefined);
});

test('2xx malformed or negative disconnect acknowledgments never clear a still-present account', async () => {
  for (const acknowledgment of [{ success: false, error: 'refused' }, '<html>proxy</html>', {}]) {
    const f = fixture({ acknowledgment });
    await assert.rejects(f.disconnectAccount('org-a', 'account-a'), /not confirmed/);
    assert.equal(f.removed(), false);
  }
  const unavailable = fixture({ inventoryFailure: true });
  await assert.rejects(unavailable.disconnectAccount('org-a', 'account-a'), /not confirmed/);
  assert.equal(unavailable.removed(), false);
});
