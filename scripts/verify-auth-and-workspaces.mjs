import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3005;
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
    await wait(400);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

function parseCookies(res) {
  const raw = res.headers.get('set-cookie');
  if (!raw) return {};
  const cookies = {};
  raw.split(',').forEach((part) => {
    const pair = part.split(';')[0].trim();
    const [k, v] = pair.split('=');
    if (k && v) cookies[k] = v;
  });
  return cookies;
}

async function runTests() {
  console.log('--- Starting Asra3 Verification Suite ---');

  // 1. Verify Unauthenticated Route Protection
  console.log('\n[1] Testing Route Protection on /dashboard & /admin...');
  
  // Dashboard redirect
  const dashRes = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
  const dashLoc = dashRes.headers.get('location');
  console.log(`- GET /dashboard status: ${dashRes.status}, location: ${dashLoc}`);
  if (dashRes.status !== 307 && dashRes.status !== 308 && dashRes.status !== 302) {
    throw new Error(`Expected redirect from /dashboard, got ${dashRes.status}`);
  }
  if (!dashLoc || !dashLoc.includes('/login?redirect=%2Fdashboard')) {
    throw new Error(`Expected redirect to /login?redirect=%2Fdashboard, got ${dashLoc}`);
  }
  console.log('✓ /dashboard successfully redirects unauthenticated traffic to /login');

  // Admin redirect
  const adminRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
  const adminLoc = adminRes.headers.get('location');
  console.log(`- GET /admin status: ${adminRes.status}, location: ${adminLoc}`);
  if (adminRes.status !== 307 && adminRes.status !== 308 && adminRes.status !== 302) {
    throw new Error(`Expected redirect from /admin, got ${adminRes.status}`);
  }
  if (!adminLoc || !adminLoc.includes('/login?redirect=%2Fadmin')) {
    throw new Error(`Expected redirect to /login?redirect=%2Fadmin, got ${adminLoc}`);
  }
  console.log('✓ /admin successfully redirects unauthenticated traffic to /login');

  // Admin API 401
  const adminApiRes = await fetch(`${BASE_URL}/api/admin`);
  console.log(`- GET /api/admin status: ${adminApiRes.status}`);
  if (adminApiRes.status !== 401) {
    throw new Error(`Expected 401 from /api/admin, got ${adminApiRes.status}`);
  }
  console.log('✓ /api/admin returns 401 Unauthorized for unauthenticated requests');

  // Session status when logged out
  const sessionLoggedOut = await (await fetch(`${BASE_URL}/api/auth?action=session`)).json();
  if (sessionLoggedOut.authenticated !== false || sessionLoggedOut.session !== null) {
    throw new Error('Expected authenticated: false when no session exists');
  }
  console.log('✓ /api/auth?action=session returns { authenticated: false, session: null }');

  // 2. Customer Authentication & Session Creation
  console.log('\n[2] Testing Customer Authentication & Clean Workspace Provisioning...');
  const testEmail = `founder_${Date.now()}@nexustech.io`;
  const signupRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'signup',
      fullName: 'Sarah Jenkins',
      email: testEmail,
      password: 'SecurePassword2026!',
      companyName: 'NexusTech Global',
    }),
  });
  
  if (!signupRes.ok) {
    const errText = await signupRes.text();
    throw new Error(`Customer signup failed: ${errText}`);
  }

  const signupData = await signupRes.json();
  const setCookie = signupRes.headers.get('set-cookie');
  console.log(`- Created customer tenant: ${signupData.tenant.organizationName} (${signupData.tenant.organizationId})`);
  if (!setCookie || !setCookie.includes('asra3_session=')) {
    throw new Error('Expected asra3_session cookie in signup response');
  }

  // Extract session cookie value
  const cookieMatch = setCookie.match(/asra3_session=([^;]+)/);
  const sessionCookieVal = cookieMatch ? cookieMatch[1] : '';
  const customerCookieHeader = `asra3_session=${sessionCookieVal}`;

  // Verify session check with cookie
  const sessionCheck = await (await fetch(`${BASE_URL}/api/auth?action=session`, {
    headers: { Cookie: customerCookieHeader },
  })).json();

  if (!sessionCheck.authenticated || sessionCheck.session.user.email !== testEmail) {
    throw new Error('Session verification failed with active cookie');
  }
  console.log(`✓ Active session verified for user: ${sessionCheck.session.user.email} (Role: ${sessionCheck.session.user.role})`);

  // Verify customer CANNOT access /api/admin (RBAC)
  const customerAdminApiRes = await fetch(`${BASE_URL}/api/admin`, {
    headers: { Cookie: customerCookieHeader },
  });
  if (customerAdminApiRes.status !== 401) {
    throw new Error(`Customer should not have access to /api/admin, got status ${customerAdminApiRes.status}`);
  }
  console.log('✓ Role-based access control: Regular customer cannot access /api/admin (401)');

  // 3. Zero Pre-Filled Dummy Data Guarantee
  console.log('\n[3] Testing Zero Pre-Filled Dummy Data in Fresh Workspace...');
  const tenantOrgId = signupData.tenant.organizationId;
  const servicesRes = await (await fetch(`${BASE_URL}/api/services?organizationId=${encodeURIComponent(tenantOrgId)}`, {
    headers: { Cookie: customerCookieHeader },
  })).json();

  const sub = servicesRes.subServicesData;
  console.log(`- Connected Accounts count: ${sub.core_connect.accounts.length}`);
  console.log(`- Scheduled / Published Posts count: ${sub.publishing.posts.length}`);
  const ownedNums = sub.telephony?.numbers || [];
  console.log(`- Owned Phone Numbers count: ${ownedNums.length}`);
  console.log(`- Call History count: ${sub.telephony?.callHistory?.length || 0}`);
  console.log(`- Conversation Threads count: ${sub.telephony?.threads?.length || 0}`);
  console.log(`- Ad Campaigns count: ${sub.ads?.campaigns?.length || 0}`);
  console.log(`- Impressions: ${sub.analytics?.totals?.impressions ?? 0}, Reach: ${sub.analytics?.totals?.reach ?? 0}, Followers Gained: ${sub.analytics?.followers?.gained ?? 0}`);

  if (sub.core_connect.accounts.length !== 0) throw new Error('Connected accounts must be 0 for fresh tenant');
  if (sub.publishing.posts.length !== 0) throw new Error('Posts must be 0 for fresh tenant');
  if (ownedNums.length !== 0) throw new Error('Owned numbers must be 0 for fresh tenant');
  if ((sub.telephony?.callHistory?.length || 0) !== 0) throw new Error('Call history must be 0 for fresh tenant');
  if ((sub.telephony?.threads?.length || 0) !== 0) throw new Error('Conversation threads must be 0 for fresh tenant');
  if ((sub.ads?.campaigns?.length || 0) !== 0) throw new Error('Ad campaigns must be 0 for fresh tenant');
  if ((sub.analytics?.totals?.impressions ?? 0) !== 0) throw new Error('Analytics impressions must be 0 for fresh tenant');
  console.log('✓ All sub-services start completely clean with ZERO pre-filled dummy data!');

  // 4. Genuine Mutations & File Persistence
  console.log('\n[4] Testing Genuine Operations & File Persistence to .data/workspaces.json...');

  // Provision a phone number
  const buyNumRes = await (await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: customerCookieHeader,
    },
    body: JSON.stringify({
      organizationId: tenantOrgId,
      subService: 'telephony',
      action: 'buy_number',
      number: '+14155550199',
      country: 'US',
      locality: 'San Francisco',
    }),
  })).json();

  if (!buyNumRes.success || !buyNumRes.phoneNumber) {
    throw new Error(`Failed to provision number: ${JSON.stringify(buyNumRes)}`);
  }
  console.log(`- Provisioned real number: ${buyNumRes.phoneNumber.phoneNumber}`);

  // Create a post
  const publishRes = await (await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: customerCookieHeader,
    },
    body: JSON.stringify({
      organizationId: tenantOrgId,
      subService: 'publishing',
      action: 'create_post',
      content: 'Launching our brand on Asra3 platform today! 🚀',
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_01' }],
    }),
  })).json();

  if (!publishRes.post) {
    throw new Error(`Failed to publish post: ${JSON.stringify(publishRes)}`);
  }
  console.log(`- Created post successfully: "${publishRes.post.content}"`);

  // Verify file on disk
  const dataFilePath = path.join(process.cwd(), '.data', 'workspaces.json');
  if (!fs.existsSync(dataFilePath)) {
    throw new Error(`.data/workspaces.json does not exist on disk at ${dataFilePath}`);
  }
  const diskContent = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
  const savedWs = diskContent[tenantOrgId];
  if (!savedWs) {
    throw new Error(`Tenant ${tenantOrgId} not found in .data/workspaces.json`);
  }
  if (savedWs.ownedNumbers.length !== 1 || savedWs.ownedNumbers[0].phoneNumber !== buyNumRes.phoneNumber.phoneNumber) {
    throw new Error('Provisioned number not persisted in file store');
  }
  if (savedWs.posts.length !== 1) {
    throw new Error('Created post not persisted in file store');
  }
  console.log('✓ Verified atomic disk persistence in .data/workspaces.json: number and post saved!');

  // 5. Super Admin Login & Control Plane Access
  console.log('\n[5] Testing Super Admin Login & Control Plane Access...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      email: 'admin@asra3.com',
      password: 'AnyPasswordForAdmin!',
    }),
  });
  if (!adminLoginRes.ok) throw new Error('Super Admin login failed');
  const adminLoginData = await adminLoginRes.json();
  if (adminLoginData.user.role !== 'super_admin') {
    throw new Error('Expected user role to be super_admin');
  }
  const adminSetCookie = adminLoginRes.headers.get('set-cookie');
  const adminCookieMatch = adminSetCookie.match(/asra3_session=([^;]+)/);
  const adminCookieHeader = `asra3_session=${adminCookieMatch[1]}`;

  const adminApiOk = await fetch(`${BASE_URL}/api/admin`, {
    headers: { Cookie: adminCookieHeader },
  });
  if (!adminApiOk.ok) throw new Error(`Super Admin access to /api/admin failed with ${adminApiOk.status}`);
  const adminJson = await adminApiOk.json();
  console.log(`✓ Super Admin accessed control plane. Total managed tenants: ${adminJson.tenants?.length || 0}`);

  // 6. Logout
  console.log('\n[6] Testing Logout & Cookie Revocation...');
  const logoutRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: customerCookieHeader },
    body: JSON.stringify({ action: 'logout' }),
  });
  const logoutCookie = logoutRes.headers.get('set-cookie');
  console.log(`- Logout set-cookie header: ${logoutCookie}`);
  if (!logoutCookie || !logoutCookie.includes('Max-Age=0')) {
    throw new Error('Logout did not set Max-Age=0 to clear session cookie');
  }
  console.log('✓ Logout successfully invalidates and clears session cookie');

  console.log('\n======================================================');
  console.log('🎉 ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

async function main() {
  console.log('Starting Next.js production server on port ' + PORT + '...');
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
  });

  try {
    await waitForServer(BASE_URL);
    await runTests();
  } catch (err) {
    console.error('\n❌ Verification Suite Failed:', err);
    process.exitCode = 1;
  } finally {
    console.log('Shutting down Next.js test server...');
    server.kill();
    // On windows spawn shell, also taskkill if necessary
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
    } catch {
      // ignore
    }
  }
}

main();
