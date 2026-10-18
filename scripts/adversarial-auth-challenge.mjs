import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3006;
const BASE_URL = `http://localhost:${PORT}`;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/auth?action=session`);
      if (res.status === 200) return true;
    } catch {
      // wait
    }
    await wait(350);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

const results = [];

function recordTest(suite, name, passed, details) {
  results.push({ suite, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${suite}] ${status} - ${name}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

async function runAdversarialSuite() {
  console.log('\n======================================================');
  console.log('⚡ STARTING ADVERSARIAL AUTH & SECURITY CHALLENGE SUITE');
  console.log('======================================================\n');

  // =========================================================================
  // TEST SUITE 1: UNAUTHENTICATED ACCESS TO PROTECTED ROUTES
  // =========================================================================
  console.log('--- Suite 1: Unauthenticated Route Protection ---');
  
  // 1.1 /dashboard
  try {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    const pass = (res.status === 307 || res.status === 308) && loc.includes('/login?redirect=%2Fdashboard');
    recordTest('Unauthenticated', 'GET /dashboard -> 307 redirect to /login?redirect=%2Fdashboard', pass, `status=${res.status}, loc=${loc}`);
  } catch (err) {
    recordTest('Unauthenticated', 'GET /dashboard', false, err.message);
  }

  // 1.2 /dashboard?tab=telephony
  try {
    const res = await fetch(`${BASE_URL}/dashboard?tab=telephony`, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    const pass = (res.status === 307 || res.status === 308) && loc.includes('/login?redirect=%2Fdashboard%3Ftab%3Dtelephony');
    recordTest('Unauthenticated', 'GET /dashboard?tab=telephony -> 307 redirect preserving query', pass, `status=${res.status}, loc=${loc}`);
  } catch (err) {
    recordTest('Unauthenticated', 'GET /dashboard?tab=telephony', false, err.message);
  }

  // 1.3 /admin
  try {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    const pass = (res.status === 307 || res.status === 308) && loc.includes('/login?redirect=%2Fadmin');
    recordTest('Unauthenticated', 'GET /admin -> 307 redirect to /login?redirect=%2Fadmin', pass, `status=${res.status}, loc=${loc}`);
  } catch (err) {
    recordTest('Unauthenticated', 'GET /admin', false, err.message);
  }

  // 1.4 /api/admin
  try {
    const res = await fetch(`${BASE_URL}/api/admin`);
    const data = await res.json().catch(() => ({}));
    const pass = res.status === 401 && (data.error || '').toLowerCase().includes('unauthorized');
    recordTest('Unauthenticated', 'GET /api/admin -> 401 Unauthorized', pass, `status=${res.status}, body=${JSON.stringify(data)}`);
  } catch (err) {
    recordTest('Unauthenticated', 'GET /api/admin', false, err.message);
  }

  // 1.5 /api/auth?action=session when unauthenticated
  try {
    const res = await fetch(`${BASE_URL}/api/auth?action=session`);
    const data = await res.json().catch(() => ({}));
    const pass = res.status === 200 && data.authenticated === false && data.session === null;
    recordTest('Unauthenticated', 'GET /api/auth?action=session -> { authenticated: false, session: null }', pass, `status=${res.status}, body=${JSON.stringify(data)}`);
  } catch (err) {
    recordTest('Unauthenticated', 'GET /api/auth?action=session', false, err.message);
  }

  // =========================================================================
  // TEST SUITE 2: TAMPERED & MALFORMED COOKIE ATTACKS
  // =========================================================================
  console.log('\n--- Suite 2: Tampered & Malformed Cookie Attacks ---');

  // 2.1 Garbage text cookie
  try {
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: 'techurity_session=TOTAL_GARBAGE_NOT_BASE64!@#$%' },
      redirect: 'manual',
    });
    const loc = res.headers.get('location') || '';
    const pass = (res.status === 307 || res.status === 308) && loc.includes('/login');
    recordTest('Cookie Tampering', 'Garbage non-base64 cookie on /dashboard -> rejected with 307 redirect', pass, `status=${res.status}, loc=${loc}`);
  } catch (err) {
    recordTest('Cookie Tampering', 'Garbage non-base64 cookie', false, err.message);
  }

  // 2.2 Valid base64 but invalid JSON string
  try {
    const invalidJsonBase64 = Buffer.from('this is definitely not json', 'utf-8').toString('base64');
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: `techurity_session=${invalidJsonBase64}` },
      redirect: 'manual',
    });
    const loc = res.headers.get('location') || '';
    const pass = (res.status === 307 || res.status === 308) && loc.includes('/login');
    recordTest('Cookie Tampering', 'Valid base64 but invalid JSON -> rejected cleanly with 307 redirect', pass, `status=${res.status}, loc=${loc}`);
  } catch (err) {
    recordTest('Cookie Tampering', 'Invalid JSON base64', false, err.message);
  }

  // 2.3 Valid JSON base64 but missing mandatory fields (missing user and expiresAt)
  try {
    const missingFieldsBase64 = Buffer.from(JSON.stringify({ someKey: 'no_user_here' }), 'utf-8').toString('base64');
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: `techurity_session=${missingFieldsBase64}` },
      redirect: 'manual',
    });
    const loc = res.headers.get('location') || '';
    const pass = (res.status === 307 || res.status === 308) && loc.includes('/login');
    recordTest('Cookie Tampering', 'Valid JSON missing user/expiresAt -> rejected cleanly with 307 redirect', pass, `status=${res.status}, loc=${loc}`);
  } catch (err) {
    recordTest('Cookie Tampering', 'Missing fields in cookie', false, err.message);
  }

  // 2.4 Expired session cookie (expiresAt in the past)
  try {
    const expiredPayload = {
      user: { id: 'usr_expired', email: 'expired@example.com', fullName: 'Expired', role: 'owner' },
      tenant: { organizationId: 'org_1', organizationName: 'Org', slug: 'org', planKey: 'agency' },
      createdAt: Date.now() - 1000000,
      expiresAt: Date.now() - 1000, // expired 1s ago
    };
    const expiredBase64 = Buffer.from(JSON.stringify(expiredPayload), 'utf-8').toString('base64');
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: `techurity_session=${expiredBase64}` },
      redirect: 'manual',
    });
    const loc = res.headers.get('location') || '';
    const pass = (res.status === 307 || res.status === 308) && loc.includes('/login');
    recordTest('Cookie Tampering', 'Expired cookie (expiresAt < Date.now()) -> rejected with 307 redirect', pass, `status=${res.status}, loc=${loc}`);
  } catch (err) {
    recordTest('Cookie Tampering', 'Expired cookie', false, err.message);
  }

  // 2.5 API route resilience against garbage cookie
  try {
    const res = await fetch(`${BASE_URL}/api/admin`, {
      headers: { Cookie: 'techurity_session=invalid-json-base64-test' },
    });
    const pass = res.status === 401;
    recordTest('Cookie Tampering', 'Garbage cookie on /api/admin -> 401 without server crash', pass, `status=${res.status}`);
  } catch (err) {
    recordTest('Cookie Tampering', 'Garbage cookie on /api/admin', false, err.message);
  }

  // =========================================================================
  // TEST SUITE 3: FORGED COOKIE ATTACK (CRITICAL CRYPTOGRAPHIC AUDIT)
  // =========================================================================
  console.log('\n--- Suite 3: Forged Cookie & Signature Audit ---');
  let forgedAttackSucceeded = false;
  try {
    const forgedAdminPayload = {
      user: {
        id: 'usr_attacker_forged',
        fullName: 'Adversarial Attacker',
        email: 'attacker@blackhat.security',
        role: 'super_admin',
      },
      tenant: {
        organizationId: 'org_admin_platform',
        organizationName: 'Techurity Super Admin Control Plane',
        slug: 'admin',
        planKey: 'enterprise',
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400 * 1000,
    };
    const forgedCookieBase64 = Buffer.from(JSON.stringify(forgedAdminPayload), 'utf-8').toString('base64');
    
    // Attempt 1: Forged cookie to access /admin
    const adminPageRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: `techurity_session=${forgedCookieBase64}` },
      redirect: 'manual',
    });

    // Attempt 2: Forged cookie to access /api/admin
    const adminApiRes = await fetch(`${BASE_URL}/api/admin`, {
      headers: { Cookie: `techurity_session=${forgedCookieBase64}` },
    });
    const adminApiJson = await adminApiRes.json().catch(() => ({}));

    if (adminPageRes.status === 200 || adminApiRes.status === 200) {
      forgedAttackSucceeded = true;
      recordTest(
        'Vulnerability Audit',
        'CRITICAL: Cookie Signature Check (Does server reject forged, unsigned super_admin base64 cookie?)',
        false,
        `VULNERABILITY CONFIRMED! Server accepted unsigned client-forged cookie! /admin status=${adminPageRes.status}, /api/admin status=${adminApiRes.status}, data keys=${Object.keys(adminApiJson).join(',')}`
      );
    } else {
      recordTest(
        'Vulnerability Audit',
        'Cookie Signature Check',
        true,
        'Server rejected forged cookie.'
      );
    }
  } catch (err) {
    recordTest('Vulnerability Audit', 'Cookie Signature Check', false, err.message);
  }

  // =========================================================================
  // TEST SUITE 4: LEGITIMATE CUSTOMER SIGNUP & RBAC BOUNDARIES
  // =========================================================================
  console.log('\n--- Suite 4: Customer RBAC & Privilege Escalation ---');
  let customerCookie = '';
  let customerOrgId = '';

  try {
    const signupRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signup',
        fullName: 'Alice Customer',
        email: `alice_${Date.now()}@acmecorp.com`,
        password: 'ValidPassword2026!',
        companyName: 'Acme Corporation',
      }),
    });
    const setCookie = signupRes.headers.get('set-cookie') || '';
    const match = setCookie.match(/techurity_session=([^;]+)/);
    customerCookie = match ? match[1] : '';
    const signupData = await signupRes.json();
    customerOrgId = signupData.tenant?.organizationId;

    recordTest('RBAC', 'Customer Signup sets valid techurity_session cookie', Boolean(customerCookie), `cookieLen=${customerCookie.length}`);
  } catch (err) {
    recordTest('RBAC', 'Customer Signup', false, err.message);
  }

  // 4.1 Customer can access /dashboard
  try {
    const res = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: `techurity_session=${customerCookie}` },
      redirect: 'manual',
    });
    const pass = res.status === 200;
    recordTest('RBAC', 'Customer access to /dashboard -> HTTP 200 OK', pass, `status=${res.status}`);
  } catch (err) {
    recordTest('RBAC', 'Customer /dashboard access', false, err.message);
  }

  // 4.2 Customer CANNOT access /admin (middleware redirect to /dashboard)
  try {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: `techurity_session=${customerCookie}` },
      redirect: 'manual',
    });
    const loc = res.headers.get('location') || '';
    const pass = (res.status === 307 || res.status === 308) && loc.endsWith('/dashboard');
    recordTest('RBAC', 'Customer privilege escalation to /admin -> redirected to /dashboard', pass, `status=${res.status}, loc=${loc}`);
  } catch (err) {
    recordTest('RBAC', 'Customer access to /admin', false, err.message);
  }

  // 4.3 Customer CANNOT access /api/admin (API 401 Unauthorized)
  try {
    const res = await fetch(`${BASE_URL}/api/admin`, {
      headers: { Cookie: `techurity_session=${customerCookie}` },
    });
    const data = await res.json().catch(() => ({}));
    const pass = res.status === 401;
    recordTest('RBAC', 'Customer privilege escalation to /api/admin -> 401 Unauthorized', pass, `status=${res.status}, body=${JSON.stringify(data)}`);
  } catch (err) {
    recordTest('RBAC', 'Customer access to /api/admin', false, err.message);
  }

  // =========================================================================
  // TEST SUITE 5: LOGIN CREDENTIALS & ERROR HANDLING
  // =========================================================================
  console.log('\n--- Suite 5: Login Credentials & Authentication Verification ---');

  // 5.1 Empty email request
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: '', password: '' }),
    });
    const data = await res.json().catch(() => ({}));
    const pass = res.status === 400 || res.status === 401;
    recordTest('Login Validation', 'Empty email and password rejected with 400/401', pass, `status=${res.status}, body=${JSON.stringify(data)}`);
  } catch (err) {
    recordTest('Login Validation', 'Empty login credentials', false, err.message);
  }

  // 5.2 Invalid password with existing/admin email
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: 'admin@techurity.si',
        password: 'THIS_IS_A_WRONG_PASSWORD_123',
      }),
    });
    const data = await res.json().catch(() => ({}));

    // The dispatch requirement states:
    // "Invalid login credentials. Verify HTTP 401 and clean error message."
    if (res.status === 401) {
      recordTest('Login Validation', 'Invalid password for admin@techurity.si -> HTTP 401 Unauthorized', true, `status=401, error=${data.error}`);
    } else {
      recordTest(
        'Login Validation',
        'Invalid password for admin@techurity.si -> HTTP 401 Unauthorized',
        false,
        `VULNERABILITY / SPEC VIOLATION: Expected 401 for wrong password, but got HTTP ${res.status}! User was logged in as ${data.user?.role}!`
      );
    }
  } catch (err) {
    recordTest('Login Validation', 'Invalid password login', false, err.message);
  }

  // 5.3 Missing password when email provided
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: 'attacker@evil.com',
        password: '',
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 400 || res.status === 401) {
      recordTest('Login Validation', 'Missing password rejected with 400/401', true, `status=${res.status}`);
    } else {
      recordTest(
        'Login Validation',
        'Missing password rejected with 400/401',
        false,
        `VULNERABILITY: Empty password was accepted! Status=${res.status}, user=${data.user?.email}`
      );
    }
  } catch (err) {
    recordTest('Login Validation', 'Missing password', false, err.message);
  }

  // =========================================================================
  // TEST SUITE 6: LOGOUT & COOKIE REVOCATION
  // =========================================================================
  console.log('\n--- Suite 6: Logout & Session Invalidation ---');

  // 6.1 POST /api/auth action: logout
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `techurity_session=${customerCookie}`,
      },
      body: JSON.stringify({ action: 'logout' }),
    });
    const setCookie = res.headers.get('set-cookie') || '';
    const pass = res.status === 200 && setCookie.includes('Max-Age=0') && setCookie.includes('techurity_session=');
    recordTest('Logout', 'POST /api/auth { action: "logout" } sets Max-Age=0', pass, `status=${res.status}, setCookie=${setCookie}`);
  } catch (err) {
    recordTest('Logout', 'POST /api/auth logout', false, err.message);
  }

  // 6.2 GET /api/auth?action=logout
  try {
    const res = await fetch(`${BASE_URL}/api/auth?action=logout`);
    const setCookie = res.headers.get('set-cookie') || '';
    const pass = res.status === 200 && setCookie.includes('Max-Age=0') && setCookie.includes('techurity_session=');
    recordTest('Logout', 'GET /api/auth?action=logout sets Max-Age=0', pass, `status=${res.status}, setCookie=${setCookie}`);
  } catch (err) {
    recordTest('Logout', 'GET /api/auth?action=logout', false, err.message);
  }

  console.log('\n======================================================');
  console.log('📊 TEST SUMMARY & SCORECARD');
  console.log('======================================================');
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;
  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log('\nFAILED TESTS BREAKDOWN:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`❌ [${r.suite}] ${r.name}`);
      console.log(`   ${r.details}`);
    });
  }

  return { total, passedCount, failedCount, results };
}

async function main() {
  console.log(`Spawning Next.js production server on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
  });

  try {
    await waitForServer(BASE_URL);
    const summary = await runAdversarialSuite();
    if (summary.failedCount > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
    process.exitCode = 1;
  } finally {
    console.log('\nTerminating test Next.js server...');
    server.kill();
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
    } catch {
      // ignore
    }
  }
}

main();
