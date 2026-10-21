import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { authSandbox } from './helpers/current-auth.mjs';

const signup = { action: 'signup', fullName: 'Local test user', email: 'dummy@example.invalid', password: 'Private-test-password-123', companyName: 'Local company' };
const login = { action: 'login', email: 'dummy@example.invalid', password: 'Private-test-password-123' };
test('registration helper defaults closed and accepts only exact true', () => {
  const source = ts.transpileModule(fs.readFileSync('src/lib/auth/registration.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const value of [undefined, '', 'false', 'TRUE', '1', ' true ', 'true']) {
    const context = vm.createContext({ exports: {}, process: { env: { PUBLIC_REGISTRATION_ENABLED: value } } });
    vm.runInContext(source, context); assert.equal(context.exports.isPublicRegistrationEnabled(), value === 'true');
  }
});
test('closed registration rejects signup before any provider or database calls', async () => {
  for (const value of [undefined, 'false', 'TRUE']) {
    const sandbox = authSandbox({ env: { PUBLIC_REGISTRATION_ENABLED: value }, noSupabase: true });
    const response = await sandbox.send(signup);
    assert.equal(response.status, 403); assert.equal(response.body.code, 'registration_closed'); assert.equal(response.cookie, null); assert.deepEqual(sandbox.calls, []);
  }
});
test('closed registration stops direct-provider identities from auto-provisioning workspaces', async () => {
  const sandbox = authSandbox({ noMembership: true, env: { PUBLIC_REGISTRATION_ENABLED: 'false' } });
  const response = await sandbox.send(login);
  assert.equal(response.status, 403); assert.equal(response.body.code, 'registration_closed'); assert.equal(response.cookie, null);
  assert.equal(sandbox.calls.filter(c => c.name === 'saas_provision_signup' || c.name === 'saas_issue_session').length, 0);
});
test('closed registration retains existing membership login and rejects inactive or unverified membership', async () => {
  for (const [options, expected] of [[{}, 200], [{ inactive: true }, 403], [{ unverified: true }, 403]]) {
    const sandbox = authSandbox({ ...options, env: { PUBLIC_REGISTRATION_ENABLED: 'false' } });
    const response = await sandbox.send(login); assert.equal(response.status, expected);
    assert.equal(Boolean(response.cookie), expected === 200);
    assert.equal(sandbox.calls.filter(c => c.name === 'saas_provision_signup').length, 0);
  }
});
test('explicit true reopens provider signup and confirmed-user workspace provisioning', async () => {
  const signupSandbox = authSandbox({ env: { PUBLIC_REGISTRATION_ENABLED: 'true' } });
  assert.equal((await signupSandbox.send(signup)).status, 200); assert.equal(signupSandbox.calls.filter(c => c.type === 'signup').length, 1);
  const loginSandbox = authSandbox({ noMembership: true, env: { PUBLIC_REGISTRATION_ENABLED: 'true' } });
  assert.equal((await loginSandbox.send(login)).status, 200); assert.equal(loginSandbox.calls.filter(c => c.name === 'saas_provision_signup').length, 1);
});
