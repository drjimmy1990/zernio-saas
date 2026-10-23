import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { authSandbox } from './helpers/current-auth.mjs';

const publicOrigin = 'https://asra3.com';
const internalUrl = 'http://asra3-saas:3008/api/auth';
const validBrowserHeaders = { origin: publicOrigin, 'sec-fetch-site': 'same-origin' };

const baseSignupPayload = {
  action: 'signup',
  fullName: 'Adversarial Attacker',
  email: 'attacker@evil-domain.invalid',
  password: 'AdversarialPassword123!',
  companyName: 'Evil Corp',
};

const baseLoginPayload = {
  action: 'login',
  email: 'confirmed-orphan@example.invalid',
  password: 'ValidPassword123!',
};

// -----------------------------------------------------------------------------
// Test Suite 1: Strict Fail-Closed Environment Variable Evaluation
// -----------------------------------------------------------------------------
test('Suite 1: isPublicRegistrationEnabled strictly rejects all non-exact "true" values', () => {
  const source = ts.transpileModule(
    fs.readFileSync('src/lib/auth/registration.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText;

  const adversarialValues = [
    undefined,
    '',
    ' ',
    '   ',
    'false',
    'FALSE',
    'False',
    '0',
    '1',
    '-1',
    'TRUE',
    'True',
    't',
    'T',
    'yes',
    'YES',
    'on',
    'ON',
    'enabled',
    'ENABLED',
    ' true ',
    ' true',
    'true ',
    'true\0',
    'true\n',
    'true\r\n',
    'null',
    'undefined',
    '{"enabled":true}',
  ];

  for (const val of adversarialValues) {
    const context = vm.createContext({ exports: {}, process: { env: { PUBLIC_REGISTRATION_ENABLED: val } } });
    vm.runInContext(source, context);
    assert.equal(
      context.exports.isPublicRegistrationEnabled(),
      false,
      `Value "${val}" should evaluate strictly to false`
    );
  }

  // Exact lowercase 'true' MUST evaluate to true
  const contextTrue = vm.createContext({ exports: {}, process: { env: { PUBLIC_REGISTRATION_ENABLED: 'true' } } });
  vm.runInContext(source, contextTrue);
  assert.equal(contextTrue.exports.isPublicRegistrationEnabled(), true);
});

// -----------------------------------------------------------------------------
// Test Suite 2: Action Parameter Mutations & Case Tampering in POST /api/auth
// -----------------------------------------------------------------------------
test('Suite 2: Mutated action strings cannot bypass gate or invoke provider signUp', async () => {
  const mutatedActions = [
    'SIGNUP',
    'SignUp',
    'sIgNuP',
    ' signup ',
    'signup ',
    ' signup',
    'signup\0',
    'signup\n',
    'signup\r\n',
    'register',
    'REGISTER',
    'create_account',
    'onboard',
    'join',
    'new_user',
    '',
    null,
    undefined,
    123,
    true,
    false,
    ['signup'],
    { action: 'signup' },
    '__proto__',
    'constructor',
  ];

  for (const mutatedAction of mutatedActions) {
    const sandbox = authSandbox({
      env: { PUBLIC_REGISTRATION_ENABLED: 'false', NEXT_PUBLIC_APP_URL: publicOrigin },
      noSupabase: true, // If any provider call is attempted, this will throw
    });

    const response = await sandbox.send(
      { ...baseSignupPayload, action: mutatedAction },
      validBrowserHeaders
    );

    assert.equal(
      response.status,
      400,
      `Action ${JSON.stringify(mutatedAction)} should be rejected with 400 Unsupported authentication action`
    );
    assert.equal(response.body.error, 'Unsupported authentication action.');
    assert.equal(response.cookie, null);
    assert.deepEqual(sandbox.calls, [], `Zero database or provider calls allowed for action ${JSON.stringify(mutatedAction)}`);
  }
});

// -----------------------------------------------------------------------------
// Test Suite 3: Standard 'signup' action under diverse closed-env settings
// -----------------------------------------------------------------------------
test('Suite 3: Canonical action "signup" is strictly rejected across all non-true env states with zero side-effects', async () => {
  const closedEnvStates = [undefined, '', 'false', 'FALSE', 'TRUE', '1', 'yes', ' true '];

  for (const envVal of closedEnvStates) {
    const sandbox = authSandbox({
      env: { PUBLIC_REGISTRATION_ENABLED: envVal, NEXT_PUBLIC_APP_URL: publicOrigin },
      noSupabase: true,
    });

    const response = await sandbox.send(baseSignupPayload, validBrowserHeaders);

    assert.equal(response.status, 403, `Env "${envVal}" must return 403`);
    assert.equal(response.body.code, 'registration_closed');
    assert.equal(response.body.error, 'Registration is coming soon. Existing accounts can still sign in.');
    assert.equal(response.cookie, null);
    assert.deepEqual(sandbox.calls, [], `Zero provider/db calls for env "${envVal}"`);
  }
});

// -----------------------------------------------------------------------------
// Test Suite 4: Origin Header Spoofing & Cross-Site Tampering
// -----------------------------------------------------------------------------
test('Suite 4: Origin header spoofing attempts are blocked by originGuard', async () => {
  const hostileOrigins = [
    'https://evil.com',
    'http://evil.com',
    'http://asra3.com', // plain http spoofing
    'https://asra3.com.evil.com', // subdomain prefix trick
    'https://evil-asra3.com',
    'https://asra3.com:8443', // port mutation
    'http://localhost:3000',
    'null', // string "null" from sandboxed iframes
  ];

  for (const origin of hostileOrigins) {
    const sandbox = authSandbox({
      env: { PUBLIC_REGISTRATION_ENABLED: 'false', NEXT_PUBLIC_APP_URL: publicOrigin },
    });

    const response = await sandbox.send(baseSignupPayload, { origin });

    assert.equal(response.status, 403, `Hostile origin "${origin}" must be rejected with 403`);
    assert.equal(response.body.error, 'Cross-origin authentication requests are not allowed.');
    assert.equal(response.cookie, null);
    assert.deepEqual(sandbox.calls, [], `No database calls allowed for hostile origin "${origin}"`);
  }

  // Also test sec-fetch-site: cross-site even with valid Origin
  const crossSiteSandbox = authSandbox({
    env: { PUBLIC_REGISTRATION_ENABLED: 'false', NEXT_PUBLIC_APP_URL: publicOrigin },
  });
  const crossSiteResponse = await crossSiteSandbox.send(baseSignupPayload, {
    origin: publicOrigin,
    'sec-fetch-site': 'cross-site',
  });
  assert.equal(crossSiteResponse.status, 403);
  assert.equal(crossSiteResponse.body.error, 'Cross-origin authentication requests are not allowed.');
  assert.deepEqual(crossSiteSandbox.calls, []);
});

// -----------------------------------------------------------------------------
// Test Suite 5: Untrusted Forwarded Headers (X-Forwarded-Host, Proto, For)
// -----------------------------------------------------------------------------
test('Suite 5: Forwarded headers cannot spoof origin or bypass the registration gate', async () => {
  // Scenario 5a: Hostile Origin with spoofed X-Forwarded-* headers trying to impersonate asra3.com
  const sandboxHostile = authSandbox({
    env: { PUBLIC_REGISTRATION_ENABLED: 'false', NEXT_PUBLIC_APP_URL: publicOrigin },
  });
  const spoofedHeaders = {
    origin: 'https://evil.com',
    'x-forwarded-host': 'asra3.com',
    'x-forwarded-proto': 'https',
    'x-forwarded-for': '127.0.0.1',
    'x-real-ip': '127.0.0.1',
    forwarded: 'for=127.0.0.1;proto=https;host=asra3.com',
  };
  const respHostile = await sandboxHostile.send(baseSignupPayload, spoofedHeaders);
  assert.equal(respHostile.status, 403);
  assert.equal(respHostile.body.error, 'Cross-origin authentication requests are not allowed.');
  assert.deepEqual(sandboxHostile.calls, []);

  // Scenario 5b: Direct non-browser caller (no Origin header) with spoofed X-Forwarded headers
  const sandboxDirect = authSandbox({
    env: { PUBLIC_REGISTRATION_ENABLED: 'false', NEXT_PUBLIC_APP_URL: publicOrigin },
  });
  const respDirect = await sandboxDirect.send(baseSignupPayload, {
    'x-forwarded-host': 'asra3.com',
    'x-forwarded-proto': 'https',
    'x-forwarded-for': '127.0.0.1',
  });
  // Without browser origin, originGuard passes, BUT gate blocks signup immediately!
  assert.equal(respDirect.status, 403);
  assert.equal(respDirect.body.code, 'registration_closed');
  assert.deepEqual(sandboxDirect.calls, []);
});

// -----------------------------------------------------------------------------
// Test Suite 6: Confirmed Users Lacking Workspaces (Auto-Provisioning RPC Gate)
// -----------------------------------------------------------------------------
test('Suite 6: Confirmed users lacking existing workspace memberships are blocked from auto-provisioning', async () => {
  // Scenario 6a: User confirmed in Supabase, but 0 workspace memberships. Attempts login while gate closed.
  const sandboxLogin = authSandbox({
    noMembership: true,
    env: { PUBLIC_REGISTRATION_ENABLED: 'false', NEXT_PUBLIC_APP_URL: publicOrigin },
  });
  const respLogin = await sandboxLogin.send(baseLoginPayload, validBrowserHeaders);

  assert.equal(respLogin.status, 403);
  assert.equal(respLogin.body.code, 'registration_closed');
  assert.equal(respLogin.cookie, null);

  // Critical assertion: saas_provision_signup and saas_issue_session were NEVER invoked!
  const provisioningCalls = sandboxLogin.calls.filter(
    (c) => c.name === 'saas_provision_signup' || c.name === 'saas_issue_session'
  );
  assert.equal(provisioningCalls.length, 0, 'No workspace auto-provisioning RPC calls allowed');

  // Scenario 6b: User attempts to pass an arbitrary organizationId to force tenancy
  const respLoginTamperedOrg = await sandboxLogin.send(
    { ...baseLoginPayload, organizationId: 'org_admin_platform' },
    validBrowserHeaders
  );
  assert.equal(respLoginTamperedOrg.status, 403);
  assert.equal(respLoginTamperedOrg.cookie, null);
  const tamperedCalls = sandboxLogin.calls.filter(
    (c) => c.name === 'saas_provision_signup' || c.name === 'saas_issue_session'
  );
  assert.equal(tamperedCalls.length, 0);

  // Scenario 6c: User attempts action: 'verify_email' with valid access token but 0 workspaces
  const respVerify = await sandboxLogin.send(
    { action: 'verify_email', accessToken: 'valid.mocked.jwt' },
    validBrowserHeaders
  );
  assert.equal(respVerify.status, 403);
  assert.equal(respVerify.body.code, 'registration_closed');
  assert.equal(respVerify.cookie, null);
});

// -----------------------------------------------------------------------------
// Test Suite 7: Legitimate Existing Customer & Admin Workflows Unaffected
// -----------------------------------------------------------------------------
test('Suite 7: Existing active workspace members and platform admin log in successfully while gate is closed', async () => {
  // Existing customer with active membership
  const sandboxCustomer = authSandbox({
    env: { PUBLIC_REGISTRATION_ENABLED: 'false', NEXT_PUBLIC_APP_URL: publicOrigin },
  });
  const respCustomer = await sandboxCustomer.send(baseLoginPayload, validBrowserHeaders);
  assert.equal(respCustomer.status, 200);
  assert.ok(respCustomer.cookie);
  assert.equal(respCustomer.session?.user?.id, 'real-user');
  assert.equal(respCustomer.session?.tenant?.organizationId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  // Confirm NO saas_provision_signup was called (user already has workspace)
  assert.equal(sandboxCustomer.calls.filter((c) => c.name === 'saas_provision_signup').length, 0);

  // Super Admin login
  const adminSandbox = authSandbox({
    env: {
      PUBLIC_REGISTRATION_ENABLED: 'false',
      NEXT_PUBLIC_APP_URL: publicOrigin,
      ADMIN_EMAIL: 'admin@asra3.com',
      ADMIN_PASSWORD: 'ComplexAdminSecretPassword2026!#',
    },
  });
  const respAdmin = await adminSandbox.send(
    { action: 'login', email: 'admin@asra3.com', password: 'ComplexAdminSecretPassword2026!#' },
    validBrowserHeaders
  );
  assert.equal(respAdmin.status, 200);
  assert.ok(respAdmin.cookie);
  assert.equal(respAdmin.session?.user?.role, 'super_admin');
});
