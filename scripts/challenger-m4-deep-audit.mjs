// scripts/challenger-m4-deep-audit.mjs
// Empirical Challenger Deep Cryptographic & Authentication Audit
import { spawn } from 'child_process';
import crypto from 'crypto';

const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}`;
const SECRET = process.env.SESSION_SECRET || 'asra3_secure_session_secret_2026';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/auth?action=session`);
      if (res.status === 200) return true;
    } catch {}
    await wait(350);
  }
  throw new Error(`Server at ${url} not ready within ${timeoutMs}ms`);
}

function makeTokenWithSecret(payloadObj, secretKey) {
  const json = JSON.stringify(payloadObj);
  const base64 = Buffer.from(json, 'utf-8').toString('base64');
  const hmac = crypto.createHmac('sha256', secretKey).update(base64).digest('base64url');
  return `${base64}.${hmac}`;
}

async function runAudit() {
  console.log('\n======================================================');
  console.log('🛡️ RUNNING CHALLENGER 3 DEEP ADVERSARIAL AUDIT');
  console.log('======================================================\n');

  console.log('--- 1. Pure Cryptographic Signature Properties ---');
  const samplePayload = {
    user: { id: 'usr_audit', fullName: 'أليس تجربة', email: 'alice@audit.com', role: 'owner' },
    tenant: { organizationId: 'org_audit', organizationName: 'شركة التدقيق', slug: 'audit', planKey: 'scale' },
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400 * 1000,
  };

  const validToken = makeTokenWithSecret(samplePayload, SECRET);
  assert(validToken.includes('.'), 'Valid token has dot separator');
  const [b64, sig] = validToken.split('.');
  assert(b64.length > 20, 'Base64 payload is non-empty');
  assert(sig.length === 43, `HMAC-SHA256 signature in base64url is exactly 43 chars (actual: ${sig.length})`);

  console.log('\n--- 2. Live HTTP Server Security Probing on Port ' + PORT + ' ---');

  // Test 2.1: Unsigned cookie to /admin
  const forgedUnsigned = Buffer.from(JSON.stringify({
    user: { id: 'usr_hacker', fullName: 'Hacker', email: 'hacker@dark.net', role: 'super_admin' },
    tenant: { organizationId: 'org_admin', organizationName: 'Admin', slug: 'admin', planKey: 'enterprise' },
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400 * 1000,
  })).toString('base64');

  const res1 = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: `asra3_session=${forgedUnsigned}` },
    redirect: 'manual',
  });
  assert(res1.status === 307 && (res1.headers.get('location') || '').includes('/login'),
    'Unsigned cookie accessing /admin -> rejected with HTTP 307 redirect to /login');

  const res1Api = await fetch(`${BASE_URL}/api/admin`, {
    headers: { Cookie: `asra3_session=${forgedUnsigned}` },
  });
  assert(res1Api.status === 401, 'Unsigned cookie accessing /api/admin -> HTTP 401 Unauthorized');

  // Test 2.2: Forged cookie with fake/arbitrary signature
  const res2 = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: `asra3_session=${forgedUnsigned}.FAKE_ARBITRARY_SIGNATURE_43_CHARACTERS_LONG_XYZ` },
    redirect: 'manual',
  });
  assert(res2.status === 307 && (res2.headers.get('location') || '').includes('/login'),
    'Forged cookie with fake signature accessing /admin -> rejected with HTTP 307 redirect');

  const res2Api = await fetch(`${BASE_URL}/api/admin`, {
    headers: { Cookie: `asra3_session=${forgedUnsigned}.FAKE_ARBITRARY_SIGNATURE_43_CHARACTERS_LONG_XYZ` },
  });
  assert(res2Api.status === 401, 'Forged cookie with fake signature accessing /api/admin -> HTTP 401');

  // Test 2.3: Forged cookie signed with wrong secret key
  const tokenWrongSecret = makeTokenWithSecret({
    user: { id: 'usr_hacker', fullName: 'Hacker', email: 'hacker@dark.net', role: 'super_admin' },
    tenant: { organizationId: 'org_admin', organizationName: 'Admin', slug: 'admin', planKey: 'enterprise' },
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400 * 1000,
  }, 'WRONG_UNAUTHORIZED_SECRET_KEY');

  const res3 = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: `asra3_session=${tokenWrongSecret}` },
    redirect: 'manual',
  });
  assert(res3.status === 307 && (res3.headers.get('location') || '').includes('/login'),
    'Token signed with wrong key accessing /admin -> rejected with HTTP 307 redirect');

  const res3Api = await fetch(`${BASE_URL}/api/admin`, {
    headers: { Cookie: `asra3_session=${tokenWrongSecret}` },
  });
  assert(res3Api.status === 401, 'Token signed with wrong key accessing /api/admin -> HTTP 401');

  // Test 2.4: Legitimate customer session tampered to super_admin (keeping original signature)
  // Let's create a real customer session first
  const customerEmail = `audit_customer_${Date.now()}@audittest.com`;
  const signupRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'signup',
      fullName: 'Valid Customer',
      email: customerEmail,
      password: 'ValidPassword2026!',
      companyName: 'Audit Testing Ltd',
    }),
  });
  assert(signupRes.ok, 'Legitimate customer signup succeeds with HTTP 200');
  const setCookie = signupRes.headers.get('set-cookie') || '';
  const match = setCookie.match(/asra3_session=([^;]+)/);
  const rawCookie = match ? match[1] : '';
  const realCustomerToken = decodeURIComponent(rawCookie);
  assert(Boolean(realCustomerToken && realCustomerToken.includes('.')), 'Customer received valid signed token');

  const [realB64, realSig] = realCustomerToken.split('.');
  const realJson = JSON.parse(Buffer.from(realB64, 'base64').toString('utf-8'));
  assert(realJson.user.role === 'owner', 'Legitimate session role is "owner"');

  // Tamper role to 'super_admin' but keep realSig
  realJson.user.role = 'super_admin';
  const tamperedB64 = Buffer.from(JSON.stringify(realJson), 'utf-8').toString('base64');
  const tamperedToken = `${tamperedB64}.${realSig}`;

  const res4 = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: `asra3_session=${tamperedToken}` },
    redirect: 'manual',
  });
  assert(res4.status === 307 && (res4.headers.get('location') || '').includes('/login'),
    'Tampered customer token claiming super_admin -> rejected with HTTP 307 redirect');

  const res4Api = await fetch(`${BASE_URL}/api/admin`, {
    headers: { Cookie: `asra3_session=${tamperedToken}` },
  });
  assert(res4Api.status === 401, 'Tampered customer token claiming super_admin -> HTTP 401');

  // Test 2.5: Legitimate customer token UNTAMPERED access
  const resValidCustDash = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Cookie: `asra3_session=${realCustomerToken}` },
    redirect: 'manual',
  });
  assert(resValidCustDash.status === 200, 'Legitimate customer token accesses /dashboard -> HTTP 200 OK');

  const resValidCustAdmin = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: `asra3_session=${realCustomerToken}` },
    redirect: 'manual',
  });
  assert(resValidCustAdmin.status === 307 && (resValidCustAdmin.headers.get('location') || '').endsWith('/dashboard'),
    'Legitimate customer accessing /admin -> redirected to /dashboard (RBAC enforced)');

  console.log('\n--- 3. Login Action Credential Validation Probing ---');

  // Test 3.1: Super admin login with wrong password
  const badAdminLogin = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: 'admin@asra3.com', password: 'IncorrectAdminPassword!' }),
  });
  assert(badAdminLogin.status === 401, 'Super Admin with wrong password returns HTTP 401');

  // Test 3.2: Super admin login with empty password
  const emptyAdminPass = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: 'admin@asra3.com', password: '' }),
  });
  assert(emptyAdminPass.status === 400, 'Super Admin with empty password returns HTTP 400');

  // Test 3.3: Super admin login with correct password
  const goodAdminLogin = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: 'admin@asra3.com', password: 'AdminPassword2026!' }),
  });
  assert(goodAdminLogin.status === 200, 'Super Admin with correct password returns HTTP 200');
  const adminSetCookie = goodAdminLogin.headers.get('set-cookie') || '';
  const adminTokenMatch = adminSetCookie.match(/asra3_session=([^;]+)/);
  const realAdminToken = adminTokenMatch ? decodeURIComponent(adminTokenMatch[1]) : '';
  assert(Boolean(realAdminToken && realAdminToken.includes('.')), 'Super Admin receives cryptographically signed token');

  // Verify real admin token accesses /admin and /api/admin
  const adminPageRes = await fetch(`${BASE_URL}/admin`, {
    headers: { Cookie: `asra3_session=${realAdminToken}` },
    redirect: 'manual',
  });
  assert(adminPageRes.status === 200, 'Super Admin accesses /admin -> HTTP 200 OK');

  const adminApiRes = await fetch(`${BASE_URL}/api/admin`, {
    headers: { Cookie: `asra3_session=${realAdminToken}` },
  });
  assert(adminApiRes.status === 200, 'Super Admin accesses /api/admin -> HTTP 200 OK');

  // Test 3.4: Customer login with wrong password
  const badCustLogin = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: customerEmail, password: 'WrongCustomerPassword!' }),
  });
  assert(badCustLogin.status === 401, 'Customer with wrong password returns HTTP 401');

  // Test 3.5: Customer login with correct password
  const goodCustLogin = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: customerEmail, password: 'ValidPassword2026!' }),
  });
  assert(goodCustLogin.status === 200, 'Customer with correct password returns HTTP 200');

  // Test 3.6: Missing email & missing password
  const noCredsLogin = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: '', password: '' }),
  });
  assert(noCredsLogin.status === 400, 'Missing email and password returns HTTP 400');

  console.log('\n======================================================');
  console.log(`AUDIT RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================\n');

  return { passed, failed };
}

async function main() {
  console.log(`Starting Next.js server on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
  });

  try {
    await waitForServer(BASE_URL);
    const result = await runAudit();
    if (result.failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Audit fatal error:', err);
    process.exitCode = 1;
  } finally {
    console.log('Terminating audit Next.js server...');
    server.kill();
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
    } catch {}
  }
}

main();
