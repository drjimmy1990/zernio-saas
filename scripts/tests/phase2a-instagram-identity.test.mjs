import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function fixture({ foreign = false, failure = false, absent = false, inventoryFailure = false, identity = 'ig-a', platform = 'instagram', metadata = {}, acknowledgment = { message: 'Account disconnected successfully' } } = {}) {
  const calls = []; let removed = false;
  class ProviderError extends Error { constructor(envelope) { super(envelope.error); this.envelope = envelope; } }
  const account = { _id: 'account-a', profileId: 'profile-a', platform, metadata, platformUserId: identity };
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

test('provider identity selects canonical Instagram method and scoped identity',async()=>{
 const linked=fixture({metadata:{loginMethod:'facebook_login',instagramScopedId:'ig-global'}});
 const identity=await linked.verifyReconnectIdentity('org-a','account-a','instagram');assert.equal(identity.loginMethod,'facebook_login');assert.equal(identity.expectedPlatformUserId,'ig-global');
 const direct=fixture();assert.equal((await direct.verifyReconnectIdentity('org-a','account-a','instagram')).loginMethod,'instagram_login');
 await assert.rejects(fixture({identity:''}).verifyReconnectIdentity('org-a','account-a','instagram'),/professional account identity/);
});
