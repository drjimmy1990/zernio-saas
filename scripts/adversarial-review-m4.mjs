import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const PORT = 3006;
const BASE_URL = `http://localhost:${PORT}`;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/auth?action=session`);
      if (res.status === 200) return true;
    } catch {
      // not ready yet
    }
    await wait(300);
  }
  throw new Error(`Server at ${url} not ready within ${timeoutMs}ms`);
}

async function runAdversarialAudit() {
  console.log('=== STARTING ADVERSARIAL STRESS TEST & INTEGRITY AUDIT ===\n');

  // Test 1: Unauthenticated Route Protection
  console.log('[Probe 1] Testing unauthenticated redirects to /dashboard and /admin...');
  const resDash = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
  const locDash = resDash.headers.get('location');
  if (resDash.status !== 307 || !locDash?.includes('/login?redirect=%2Fdashboard')) {
    throw new Error(`Probe 1 Failed: /dashboard unauthenticated returned ${resDash.status} -> ${locDash}`);
  }
  console.log('✓ Probe 1 Passed: /dashboard redirects unauthenticated (307) -> /login?redirect=%2Fdashboard');

  const resAdmin = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
  const locAdmin = resAdmin.headers.get('location');
  if (resAdmin.status !== 307 || !locAdmin?.includes('/login?redirect=%2Fadmin')) {
    throw new Error(`Probe 1 Failed: /admin unauthenticated returned ${resAdmin.status} -> ${locAdmin}`);
  }
  console.log('✓ Probe 1 Passed: /admin redirects unauthenticated (307) -> /login?redirect=%2Fadmin');

  // Test 2: Expired Session Cookie
  console.log('\n[Probe 2] Testing expired session cookie rejection...');
  const expiredSession = {
    user: { id: 'usr_expired', fullName: 'Expired', email: 'expired@test.com', role: 'owner' },
    tenant: { organizationId: 'org_expired', organizationName: 'Expired Org', slug: 'expired', planKey: 'starter' },
    createdAt: Date.now() - 100000,
    expiresAt: Date.now() - 5000, // expired 5 seconds ago
  };
  const expiredCookie = Buffer.from(JSON.stringify(expiredSession)).toString('base64');
  const resExpired = await fetch(`${BASE_URL}/dashboard`, {
    redirect: 'manual',
    headers: { Cookie: `asra3_session=${expiredCookie}` },
  });
  if (resExpired.status !== 307) {
    throw new Error(`Probe 2 Failed: Expired session was not redirected, got ${resExpired.status}`);
  }
  console.log('✓ Probe 2 Passed: Expired session immediately rejected (307 redirect)');

  // Test 3: Corrupt/Malformed Cookie
  console.log('\n[Probe 3] Testing malformed/garbage cookie rejection...');
  const resCorrupt = await fetch(`${BASE_URL}/dashboard`, {
    redirect: 'manual',
    headers: { Cookie: `asra3_session=NOT_A_VALID_BASE64_OR_JSON!@#$%^&*()` },
  });
  if (resCorrupt.status !== 307) {
    throw new Error(`Probe 3 Failed: Corrupt session was not redirected, got ${resCorrupt.status}`);
  }
  console.log('✓ Probe 3 Passed: Malformed cookie safely treated as unauthenticated (307 redirect)');

  // Test 4: Role-Based Access Control - Normal Customer Accessing /admin
  console.log('\n[Probe 4] Testing normal customer role trying to access /admin...');
  const customerSession = {
    user: { id: 'usr_normal_customer', fullName: 'Normal Customer', email: 'customer@test.com', role: 'owner' },
    tenant: { organizationId: 'org_customer_test', organizationName: 'Customer Org', slug: 'customer', planKey: 'agency' },
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };
  const customerCookie = Buffer.from(JSON.stringify(customerSession)).toString('base64');
  const resCustomerAdmin = await fetch(`${BASE_URL}/admin`, {
    redirect: 'manual',
    headers: { Cookie: `asra3_session=${customerCookie}` },
  });
  const locCustomerAdmin = resCustomerAdmin.headers.get('location');
  if (resCustomerAdmin.status !== 307 || !locCustomerAdmin?.includes('/dashboard')) {
    throw new Error(`Probe 4 Failed: Regular customer not redirected to /dashboard from /admin. Got ${resCustomerAdmin.status} -> ${locCustomerAdmin}`);
  }
  console.log('✓ Probe 4 Passed: Regular customer visiting /admin redirected (307) -> /dashboard');

  const resCustomerAdminApi = await fetch(`${BASE_URL}/api/admin`, {
    headers: { Cookie: `asra3_session=${customerCookie}` },
  });
  if (resCustomerAdminApi.status !== 401) {
    throw new Error(`Probe 4 Failed: /api/admin did not return 401 to customer. Got ${resCustomerAdminApi.status}`);
  }
  console.log('✓ Probe 4 Passed: /api/admin rejected customer with 401 Unauthorized');

  // Test 5: Super Admin Access
  console.log('\n[Probe 5] Testing Super Admin access to /admin and /api/admin...');
  const adminSession = {
    user: { id: 'usr_super_admin', fullName: 'Admin', email: 'admin@asra3.com', role: 'super_admin' },
    tenant: { organizationId: 'org_admin_platform', organizationName: 'Admin Org', slug: 'admin', planKey: 'enterprise' },
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };
  const adminCookie = Buffer.from(JSON.stringify(adminSession)).toString('base64');
  const resAdminPage = await fetch(`${BASE_URL}/admin`, {
    redirect: 'manual',
    headers: { Cookie: `asra3_session=${adminCookie}` },
  });
  if (resAdminPage.status !== 200) {
    throw new Error(`Probe 5 Failed: Super Admin received status ${resAdminPage.status} on /admin`);
  }
  console.log('✓ Probe 5 Passed: Super Admin permitted to access /admin (HTTP 200)');

  const resAdminApi = await fetch(`${BASE_URL}/api/admin`, {
    headers: { Cookie: `asra3_session=${adminCookie}` },
  });
  if (resAdminApi.status !== 200) {
    throw new Error(`Probe 5 Failed: /api/admin did not return 200 to Super Admin. Got ${resAdminApi.status}`);
  }
  console.log('✓ Probe 5 Passed: Super Admin successfully retrieved control plane data from /api/admin');

  // Test 6: Verify Login Page Content (Zero Demo Personas)
  console.log('\n[Probe 6] Inspecting /login rendered page for absence of dummy persona buttons...');
  const resLogin = await fetch(`${BASE_URL}/login`);
  const loginHtml = await resLogin.text();
  const lowerLogin = loginHtml.toLowerCase();
  if (lowerLogin.includes('demo persona') || lowerLogin.includes('quick persona') || lowerLogin.includes('demo as alex')) {
    throw new Error('Probe 6 Failed: Login page still contains fake demo persona triggers!');
  }
  console.log('✓ Probe 6 Passed: Login page is 100% clean of fake persona buttons');

  // Test 7: Zero Data Isolation Across Multiple Fresh Tenants
  console.log('\n[Probe 7] Testing multi-tenant data isolation and clean initial state...');
  const tenantA = `org_probe_tenant_a_${Date.now()}`;
  const tenantB = `org_probe_tenant_b_${Date.now()}`;

  // Fetch clean state for Tenant A
  const resA1 = await (await fetch(`${BASE_URL}/api/services?organizationId=${tenantA}`, {
    headers: { Cookie: `asra3_session=${customerCookie}` },
  })).json();

  if (resA1.subServicesData.core_connect.accounts.length !== 0 ||
      resA1.subServicesData.publishing.posts.length !== 0 ||
      (resA1.subServicesData.telephony.numbers || []).length !== 0) {
    throw new Error('Probe 7 Failed: Tenant A did not start with 0 data');
  }

  // Mutate Tenant A by provisioning a number
  await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `asra3_session=${customerCookie}` },
    body: JSON.stringify({
      organizationId: tenantA,
      subService: 'telephony',
      action: 'buy_number',
      number: '+14155559988',
      country: 'US',
    }),
  });

  // Verify Tenant A now has 1 number
  const resA2 = await (await fetch(`${BASE_URL}/api/services?organizationId=${tenantA}`, {
    headers: { Cookie: `asra3_session=${customerCookie}` },
  })).json();
  if (resA2.subServicesData.telephony.numbers.length !== 1) {
    throw new Error('Probe 7 Failed: Tenant A number mutation was not persisted');
  }

  // Now inspect Tenant B: MUST still have 0 numbers!
  const resB = await (await fetch(`${BASE_URL}/api/services?organizationId=${tenantB}`, {
    headers: { Cookie: `asra3_session=${customerCookie}` },
  })).json();
  if ((resB.subServicesData.telephony.numbers || []).length !== 0) {
    throw new Error('Probe 7 Failed: Cross-tenant data leak! Tenant B inherited numbers from Tenant A');
  }
  console.log('✓ Probe 7 Passed: Perfect multi-tenant isolation. Tenant B unaffected by mutations in Tenant A');

  console.log('\n======================================================');
  console.log('🛡️ ALL ADVERSARIAL PROBES PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
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
    await runAdversarialAudit();
  } catch (err) {
    console.error('\n❌ Adversarial Audit Error:', err);
    process.exitCode = 1;
  } finally {
    console.log('Terminating test server...');
    server.kill();
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
    } catch {
      // ignore
    }
  }
}

main();
