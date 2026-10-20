import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { authSandbox } from './helpers/current-auth.mjs';

const publicOrigin = 'https://asra3.com';
const internalUrl = 'http://asra3-saas:3008/api/auth';
const login = { action: 'login', email: 'member@example.invalid', password: 'isolated-test-password' };
const env = { NEXT_PUBLIC_APP_URL: publicOrigin };
const browserHeaders = { origin: publicOrigin, 'sec-fetch-site': 'same-origin' };

// Exercise the real signed-cookie workspace guard; its database checks are separate.
const files = {
  '@/lib/auth/session': 'src/lib/auth/session.ts',
  '@/lib/auth/tenant-access': 'src/lib/auth/tenant-access.ts',
  '@/lib/auth/request-origin': 'src/lib/auth/request-origin.ts',
};
const sources = Object.fromEntries(Object.entries(files).map(([key, file]) => [key,
  ts.transpileModule(fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
]));

function workspaceSandbox(environment = env) {
  const context = vm.createContext({ URL, Buffer, TextEncoder, TextDecoder, process: { env: {
    SESSION_SECRET: 'isolated-proxy-origin-signing-key', ...environment,
  } } });
  const modules = new Map();
  function load(name) {
    if (modules.has(name)) return modules.get(name);
    if (name === 'node:crypto') return crypto;
    if (name === '@/lib/supabase/admin' || name === '@/lib/saas/auth') return {};
    assert.ok(sources[name], `Unexpected dependency: ${name}`);
    const exports = {};
    modules.set(name, exports);
    vm.runInContext(`(function(require,exports){${sources[name]}\n})`, context)(load, exports);
    return exports;
  }
  const { encodeSession, SESSION_COOKIE_NAME } = load('@/lib/auth/session');
  const cookie = `${SESSION_COOKIE_NAME}=${encodeSession({
    user: { id: 'test-member', role: 'member', email: 'member@example.invalid', fullName: 'Test member' },
    tenant: { organizationId: 'tenant-a', organizationName: 'A', slug: 'a', planKey: 'starter' },
    createdAt: Date.now(), expiresAt: Date.now() + 60000,
  })}`;
  const { requireTenantSession } = load('@/lib/auth/tenant-access');
  return (headers = browserHeaders, method = 'POST', organizationId = 'tenant-a') =>
    requireTenantSession(new Request(internalUrl, { method, headers: { cookie, ...headers } }), organizationId);
}

test('HTTPS browser logins work through an internal HTTP reverse proxy', async () => {
  const s = authSandbox({ requestUrl: internalUrl, env });
  const result = await s.send(login, browserHeaders);
  assert.equal(result.status, 200);
  assert.equal(result.session.sessionId, 'durable-session');
  assert.match(result.cookie, /HttpOnly/);
  assert.equal(s.calls.filter(call => call.type === 'signin').length, 1);
});

test('administrator login through the proxy still requires the configured password', async () => {
  const adminEnv = { ...env, ADMIN_EMAIL: 'control@example.invalid', ADMIN_PASSWORD: 'IsolatedAdminPassword' };
  for (const [password, status] of [['wrong-password', 401], [adminEnv.ADMIN_PASSWORD, 200]]) {
    const s = authSandbox({ requestUrl: internalUrl, env: adminEnv });
    const result = await s.send({ ...login, email: adminEnv.ADMIN_EMAIL, password }, browserHeaders);
    assert.equal(result.status, status);
    assert.equal(result.session?.user.role ?? null, status === 200 ? 'super_admin' : null);
    assert.equal(s.calls.some(call => call.type === 'signin'), false);
  }
});

const rejectedOrigins = [
  'https://foreign.invalid', 'https://asra3.com.evil.invalid', 'https://www.asra3.com',
  'http://asra3.com', 'https://asra3.com:444', 'http://asra3-saas:3008',
  'null', '', 'https://asra3.com/', 'https://asra3.com/path',
  'https://asra3.com?query=1', 'https://asra3.com#fragment',
  'https://user@asra3.com', 'https://asra3.com https://foreign.invalid',
];
test('foreign and malformed origins are blocked before login I/O and workspace writes', async () => {
  const workspace = workspaceSandbox();
  for (const origin of rejectedOrigins) {
    const headers = { ...browserHeaders, origin };
    const s = authSandbox({ requestUrl: internalUrl, env });
    const result = await s.send(login, headers);
    assert.equal(result.status, 403, origin);
    assert.equal(result.cookie, null, origin);
    assert.deepEqual(s.calls, [], origin);
    assert.throws(() => workspace(headers), error => error.status === 403, origin);
  }
});

test('cross-site fetch metadata blocks writes even with a matching or absent Origin', async () => {
  for (const headers of [{ ...browserHeaders, 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'cross-site' }]) {
    const s = authSandbox({ requestUrl: internalUrl, env });
    assert.equal((await s.send(login, headers)).status, 403);
    assert.deepEqual(s.calls, []);
    assert.throws(() => workspaceSandbox()(headers), error => error.status === 403);
  }
});

test('Host and forwarded headers cannot override the configured public origin', async () => {
  const spoofedHeaders = {
    origin: 'https://foreign.invalid', host: 'foreign.invalid',
    'x-forwarded-host': 'foreign.invalid', 'x-forwarded-proto': 'https',
    forwarded: 'host=foreign.invalid;proto=https',
  };
  const s = authSandbox({ requestUrl: 'https://foreign.invalid/api/auth', env });
  assert.equal((await s.send(login, spoofedHeaders)).status, 403);
  assert.deepEqual(s.calls, []);
  assert.throws(() => workspaceSandbox()(spoofedHeaders), error => error.status === 403);
});

test('public URL normalization, APP_URL fallback and direct local development are supported', async () => {
  for (const [environment, requestUrl, origin] of [
    [{ NEXT_PUBLIC_APP_URL: 'https://ASRA3.com:443/' }, internalUrl, publicOrigin],
    [{ APP_URL: publicOrigin }, internalUrl, publicOrigin],
    [{ NEXT_PUBLIC_APP_URL: '', APP_URL: publicOrigin }, internalUrl, publicOrigin],
    [{ ...env, APP_URL: 'https://other.invalid' }, internalUrl, publicOrigin],
    [{}, 'http://localhost:3008/api/auth', 'http://localhost:3008'],
  ]) {
    const s = authSandbox({ env: environment, requestUrl });
    assert.equal((await s.send(login, { origin })).status, 200);
  }
});

test('invalid public URL configuration fails closed without authenticating', async () => {
  for (const configuredUrl of ['asra3.com', '/relative', '   ', 'ftp://asra3.com', 'file:///tmp/app', 'https://user:password@asra3.com']) {
    const invalidEnv = { NEXT_PUBLIC_APP_URL: configuredUrl, APP_URL: publicOrigin };
    for (const headers of [browserHeaders, {}]) {
      const s = authSandbox({ env: invalidEnv, requestUrl: internalUrl });
      const result = await s.send(login, headers);
      assert.equal(result.status, 503, configuredUrl);
      assert.equal(result.cookie, null);
      assert.deepEqual(s.calls, []);
      assert.throws(() => workspaceSandbox(invalidEnv)(headers), error => error.status === 503);
    }
  }
});

test('proxy workspace writes still require a signed session belonging to the requested workspace', () => {
  const workspace = workspaceSandbox();
  assert.equal(workspace().tenant.organizationId, 'tenant-a');
  assert.throws(() => workspace(browserHeaders, 'POST', 'tenant-b'), error => error.status === 403);
  assert.throws(() => workspace({ ...browserHeaders, cookie: '' }), error => error.status === 401);
  assert.throws(() => workspace({ ...browserHeaders, cookie: 'asra3_session=forged' }), error => error.status === 401);
});

test('requests without browser Origin retain authentication and safe methods remain readable', async () => {
  const s = authSandbox({ env, requestUrl: internalUrl });
  assert.equal((await s.send(login)).status, 200);
  const workspace = workspaceSandbox();
  assert.equal(workspace({}).tenant.organizationId, 'tenant-a');
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    assert.equal(workspace({ origin: 'https://foreign.invalid' }, method).tenant.organizationId, 'tenant-a');
  }
});
