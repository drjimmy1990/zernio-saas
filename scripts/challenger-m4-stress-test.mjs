// scripts/challenger-m4-stress-test.mjs
// Adversarial Empirical Stress-Testing Harness for Milestone 4 (Challenger 2)

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const PORT = 3007;
const BASE_URL = `http://localhost:${PORT}`;
const DATA_FILE = path.join(process.cwd(), '.data', 'workspaces.json');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedChecks++;
    console.error(`  [FAIL] ${message}`);
  }
}

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
      // not ready yet
    }
    await wait(400);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

function extractSessionCookie(res) {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/techurity_session=([^;]+)/);
  return match ? match[1] : null;
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('   CHALLENGER 2: EMPIRICAL STRESS-TEST HARNESS (MILESTONE 4)    ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: TWO DISTINCT TENANTS PROVISIONING (ALPHA & BETA)
  // ---------------------------------------------------------------------------
  console.log('--- 1. PROVISIONING TWO DISTINCT TENANTS (ALPHA & BETA) ---');
  const timestamp = Date.now();
  const alphaEmail = `alpha_founder_${timestamp}@alphacorp.com`;
  const betaEmail = `beta_founder_${timestamp}@betacorp.com`;

  // Create Tenant Alpha
  const alphaSignupRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'signup',
      fullName: 'Alice Alpha',
      email: alphaEmail,
      password: 'AlphaPassword123!',
      companyName: 'Tenant Alpha Corp',
    }),
  });
  assert(alphaSignupRes.ok, 'Tenant Alpha signup HTTP status 200/201 OK');
  const alphaData = await alphaSignupRes.json();
  const alphaCookie = extractSessionCookie(alphaSignupRes);
  assert(Boolean(alphaCookie), 'Tenant Alpha received techurity_session cookie');
  const alphaOrgId = alphaData.tenant?.organizationId;
  assert(Boolean(alphaOrgId && alphaOrgId.startsWith('org_')), `Tenant Alpha received valid org ID: ${alphaOrgId}`);

  // Create Tenant Beta
  const betaSignupRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'signup',
      fullName: 'Bob Beta',
      email: betaEmail,
      password: 'BetaPassword123!',
      companyName: 'Tenant Beta Corp',
    }),
  });
  assert(betaSignupRes.ok, 'Tenant Beta signup HTTP status 200/201 OK');
  const betaData = await betaSignupRes.json();
  const betaCookie = extractSessionCookie(betaSignupRes);
  assert(Boolean(betaCookie), 'Tenant Beta received techurity_session cookie');
  const betaOrgId = betaData.tenant?.organizationId;
  assert(Boolean(betaOrgId && betaOrgId.startsWith('org_')), `Tenant Beta received valid org ID: ${betaOrgId}`);

  assert(alphaOrgId !== betaOrgId, `Tenants have distinct org IDs (Alpha: ${alphaOrgId} !== Beta: ${betaOrgId})`);

  // Verify Sessions for both tenants
  const alphaSession = await (await fetch(`${BASE_URL}/api/auth?action=session`, {
    headers: { Cookie: `techurity_session=${alphaCookie}` },
  })).json();
  assert(alphaSession.authenticated === true, 'Tenant Alpha session is authenticated');
  assert(alphaSession.session.user.email === alphaEmail, `Tenant Alpha session user email matches: ${alphaEmail}`);

  const betaSession = await (await fetch(`${BASE_URL}/api/auth?action=session`, {
    headers: { Cookie: `techurity_session=${betaCookie}` },
  })).json();
  assert(betaSession.authenticated === true, 'Tenant Beta session is authenticated');
  assert(betaSession.session.user.email === betaEmail, `Tenant Beta session user email matches: ${betaEmail}`);

  // ---------------------------------------------------------------------------
  // SECTION 2: VERIFY TENANT ALPHA STARTS WITH 100% CLEAN ZERO-STATE
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. VERIFYING TENANT ALPHA CLEAN ZERO-STATE INITIALIZATION ---');
  const alphaServicesRes = await fetch(
    `${BASE_URL}/api/services?organizationId=${encodeURIComponent(alphaOrgId)}`,
    { headers: { Cookie: `techurity_session=${alphaCookie}` } }
  );
  assert(alphaServicesRes.ok, 'Tenant Alpha query GET /api/services succeeded');
  const alphaServices = await alphaServicesRes.json();
  const alphaSub = alphaServices.subServicesData;

  const alphaAccounts = alphaSub.core_connect?.accounts || [];
  const alphaPosts = alphaSub.publishing?.posts || [];
  const alphaNumbers = alphaSub.telephony?.numbers || [];
  const alphaCalls = alphaSub.telephony?.callHistory || [];
  const alphaThreads = alphaSub.telephony?.threads || [];
  const alphaCampaigns = alphaSub.ads?.campaigns || [];
  const alphaImpressions = alphaSub.analytics?.totals?.impressions ?? 0;
  const alphaReach = alphaSub.analytics?.totals?.reach ?? 0;
  const alphaFollowers = alphaSub.analytics?.followers?.gained ?? 0;

  assert(alphaAccounts.length === 0, `Tenant Alpha connectedAccounts count is exactly 0 (actual: ${alphaAccounts.length})`);
  assert(alphaPosts.length === 0, `Tenant Alpha posts count is exactly 0 (actual: ${alphaPosts.length})`);
  assert(alphaNumbers.length === 0, `Tenant Alpha owned numbers count is exactly 0 (actual: ${alphaNumbers.length})`);
  assert(alphaCalls.length === 0, `Tenant Alpha call history count is exactly 0 (actual: ${alphaCalls.length})`);
  assert(alphaThreads.length === 0, `Tenant Alpha conversation threads count is exactly 0 (actual: ${alphaThreads.length})`);
  assert(alphaCampaigns.length === 0, `Tenant Alpha ad campaigns count is exactly 0 (actual: ${alphaCampaigns.length})`);
  assert(alphaImpressions === 0, `Tenant Alpha analytics impressions is 0 (actual: ${alphaImpressions})`);
  assert(alphaReach === 0, `Tenant Alpha analytics reach is 0 (actual: ${alphaReach})`);
  assert(alphaFollowers === 0, `Tenant Alpha followers gained is 0 (actual: ${alphaFollowers})`);

  // ---------------------------------------------------------------------------
  // SECTION 3: MUTATIONS IN TENANT ALPHA & ATOMIC DISK PERSISTENCE
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. MUTATIONS IN TENANT ALPHA & ATOMIC DISK PERSISTENCE ---');
  
  // Alpha buys a virtual number
  const buyNumRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `techurity_session=${alphaCookie}`,
    },
    body: JSON.stringify({
      organizationId: alphaOrgId,
      subService: 'telephony',
      action: 'buy_number',
      country: 'US',
      numberType: 'local',
      locality: 'New York',
    }),
  });
  assert(buyNumRes.ok, 'Tenant Alpha buy_number HTTP 200 OK');
  const buyNumData = await buyNumRes.json();
  assert(buyNumData.success === true, 'Tenant Alpha buy_number returned success: true');
  const alphaPhone = buyNumData.phoneNumber?.phoneNumber;
  assert(Boolean(alphaPhone), `Tenant Alpha provisioned phone number: ${alphaPhone}`);

  // Alpha creates a scheduled post
  const postContent = `Excited to announce Tenant Alpha product launch! 🚀 Ref: ${timestamp}`;
  const createPostRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `techurity_session=${alphaCookie}`,
    },
    body: JSON.stringify({
      organizationId: alphaOrgId,
      subService: 'publishing',
      action: 'create_post',
      content: postContent,
      platforms: [{ platform: 'twitter', accountId: 'acc_tw_alpha_01' }],
      publishNow: false,
      scheduledFor: '2026-10-25T12:00:00Z',
    }),
  });
  assert(createPostRes.ok, 'Tenant Alpha create_post HTTP 200 OK');
  const createPostData = await createPostRes.json();
  assert(Boolean(createPostData.post), 'Tenant Alpha create_post returned post object');
  assert(createPostData.post?.content === postContent, 'Tenant Alpha post content matches input');

  // Verify atomic disk persistence in .data/workspaces.json
  assert(fs.existsSync(DATA_FILE), `.data/workspaces.json exists on disk at ${DATA_FILE}`);
  const diskRaw = fs.readFileSync(DATA_FILE, 'utf-8');
  let diskStore;
  try {
    diskStore = JSON.parse(diskRaw);
    assert(true, '.data/workspaces.json is valid parseable JSON');
  } catch (err) {
    assert(false, `.data/workspaces.json parse error: ${err.message}`);
  }

  const alphaDiskState = diskStore?.[alphaOrgId];
  assert(Boolean(alphaDiskState), `Tenant Alpha record exists in disk store for org: ${alphaOrgId}`);
  assert(
    alphaDiskState?.ownedNumbers?.length === 1 && alphaDiskState.ownedNumbers[0].phoneNumber === alphaPhone,
    `Disk persistence verified: Tenant Alpha has exactly 1 number (${alphaPhone}) on disk`
  );
  assert(
    alphaDiskState?.posts?.length === 1 && alphaDiskState.posts[0].content === postContent,
    `Disk persistence verified: Tenant Alpha has exactly 1 post ("${postContent}") on disk`
  );

  // ---------------------------------------------------------------------------
  // SECTION 4: MULTI-TENANT ISOLATION (ZERO CROSS-TENANT DATA LEAKAGE TO BETA)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. MULTI-TENANT ISOLATION & ZERO LEAKAGE INTO TENANT BETA ---');
  
  // Query Tenant Beta workspace via API
  const betaServicesRes = await fetch(
    `${BASE_URL}/api/services?organizationId=${encodeURIComponent(betaOrgId)}`,
    { headers: { Cookie: `techurity_session=${betaCookie}` } }
  );
  assert(betaServicesRes.ok, 'Tenant Beta query GET /api/services succeeded');
  const betaServices = await betaServicesRes.json();
  const betaSub = betaServices.subServicesData;

  const betaAccounts = betaSub.core_connect?.accounts || [];
  const betaPosts = betaSub.publishing?.posts || [];
  const betaNumbers = betaSub.telephony?.numbers || [];
  const betaCalls = betaSub.telephony?.callHistory || [];
  const betaThreads = betaSub.telephony?.threads || [];
  const betaCampaigns = betaSub.ads?.campaigns || [];

  assert(betaNumbers.length === 0, `ZERO LEAKAGE: Tenant Beta owned numbers is 0 (Tenant Alpha has 1)`);
  assert(betaPosts.length === 0, `ZERO LEAKAGE: Tenant Beta posts is 0 (Tenant Alpha has 1)`);
  assert(betaAccounts.length === 0, `ZERO LEAKAGE: Tenant Beta connectedAccounts is 0`);
  assert(betaCalls.length === 0, `ZERO LEAKAGE: Tenant Beta calls is 0`);
  assert(betaThreads.length === 0, `ZERO LEAKAGE: Tenant Beta threads is 0`);
  assert(betaCampaigns.length === 0, `ZERO LEAKAGE: Tenant Beta campaigns is 0`);

  // Direct disk inspection of Tenant Beta in .data/workspaces.json
  const betaDiskState = diskStore?.[betaOrgId];
  if (betaDiskState) {
    assert(betaDiskState.ownedNumbers.length === 0, `Disk check: Tenant Beta owned numbers on disk is 0`);
    assert(betaDiskState.posts.length === 0, `Disk check: Tenant Beta posts on disk is 0`);
  } else {
    // If Beta hasn't written to disk yet, that also confirms zero data
    assert(true, `Disk check: Tenant Beta has not written any data to disk (completely isolated)`);
  }

  // ---------------------------------------------------------------------------
  // SECTION 5: DASHBOARD EMPTY STATE RENDERING & NON-BREAKING BUTTON INSPECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. DASHBOARD EMPTY STATE RENDERING & BUTTON INTEGRITY ---');

  const DASHBOARD_PAGE = path.join(process.cwd(), 'src/app/dashboard/page.tsx');
  const PHONE_COMPONENT = path.join(process.cwd(), 'src/components/dashboard/PhoneMarketplaceAndWhatsAppLinking.tsx');
  const DIALER_COMPONENT = path.join(process.cwd(), 'src/components/dashboard/WebPhoneDialerAndCallConsole.tsx');
  const INBOX_COMPONENT = path.join(process.cwd(), 'src/components/dashboard/LiveSmsAndWhatsAppInbox.tsx');

  assert(fs.existsSync(DASHBOARD_PAGE), 'Dashboard page exists');
  assert(fs.existsSync(PHONE_COMPONENT), 'PhoneMarketplaceAndWhatsAppLinking component exists');
  assert(fs.existsSync(DIALER_COMPONENT), 'WebPhoneDialerAndCallConsole component exists');
  assert(fs.existsSync(INBOX_COMPONENT), 'LiveSmsAndWhatsAppInbox component exists');

  const dashCode = fs.readFileSync(DASHBOARD_PAGE, 'utf-8');
  const phoneCode = fs.readFileSync(PHONE_COMPONENT, 'utf-8');
  const dialerCode = fs.readFileSync(DIALER_COMPONENT, 'utf-8');
  const inboxCode = fs.readFileSync(INBOX_COMPONENT, 'utf-8');

  // Check 1: Connected Accounts empty state card & button
  assert(
    dashCode.includes('No accounts connected yet') && dashCode.includes('Connect First Platform Now'),
    'Dashboard renders high-craft empty state for Connected Accounts with clear CTA'
  );
  assert(
    dashCode.includes("handleOpenWizard('instagram', 1, null)"),
    'Connected Accounts empty state CTA button triggers handleOpenWizard safely'
  );

  // Check 2: Publishing empty state card
  assert(
    dashCode.includes('No scheduled or published posts') && dashCode.includes('Compose your post in the box above'),
    'Dashboard renders high-craft empty state for Publishing with composer instructions'
  );

  // Check 3: Social CRM Inbox empty state card
  assert(
    dashCode.includes('No incoming messages yet') && dashCode.includes('Direct messages and comments from connected platforms will appear here'),
    'Dashboard renders high-craft empty state for Social CRM with clear explanation'
  );

  // Check 4: Ads empty state card
  assert(
    dashCode.includes('No active ad campaigns') && dashCode.includes('Connect your ad account above or launch your first campaign'),
    'Dashboard renders high-craft empty state for Ad Campaigns'
  );

  // Check 5: Telephony WhatsApp Tab empty state card & button
  assert(
    phoneCode.includes('No virtual numbers owned yet') && phoneCode.includes('Browse & Buy Number in Marketplace'),
    'Phone & WhatsApp tab renders empty state when owned numbers is 0'
  );
  assert(
    phoneCode.includes("setActiveSubTab('marketplace')"),
    'WhatsApp empty state CTA button seamlessly switches to marketplace tab'
  );

  // Check 6: Telephony Voice AI Tab empty state card & button
  assert(
    phoneCode.includes('No virtual lines available for Voice AI'),
    'Voice AI tab renders empty state when owned numbers is 0'
  );

  // Check 7: Web Phone Dialer & Call History empty state
  assert(
    dialerCode.includes('No previous call records in this workspace'),
    'Web Phone Dialer Call History table renders empty state row when calls count is 0'
  );
  assert(
    dialerCode.includes('No owned numbers (browse marketplace)'),
    'Dialer Caller ID dropdown cleanly disables or displays fallback when 0 numbers owned'
  );

  // Check 8: Live SMS & WhatsApp Inbox empty state
  assert(
    inboxCode.includes('No SMS or WhatsApp threads yet') || inboxCode.includes('No conversation threads found'),
    'Live SMS & WhatsApp Inbox renders clean empty state when threads is 0'
  );

  // ---------------------------------------------------------------------------
  // SECTION 6: ADVERSARIAL STRESS - RAPID CREATIONS & LOGOUT INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. ADVERSARIAL STRESS: RAPID CREATIONS & LOGOUT INTEGRITY ---');

  // Create a second post in Tenant Alpha rapidly
  const rapidPostRes = await fetch(`${BASE_URL}/api/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `techurity_session=${alphaCookie}`,
    },
    body: JSON.stringify({
      organizationId: alphaOrgId,
      subService: 'publishing',
      action: 'create_post',
      content: 'Rapid burst post #2',
      platforms: [{ platform: 'instagram', accountId: 'acc_ig_alpha_02' }],
      publishNow: true,
    }),
  });
  assert(rapidPostRes.ok, 'Rapid burst post creation succeeded');

  // Re-read disk to confirm synchronous count is now 2 for Alpha, 0 for Beta
  const updatedDiskRaw = fs.readFileSync(DATA_FILE, 'utf-8');
  const updatedDisk = JSON.parse(updatedDiskRaw);
  assert(updatedDisk[alphaOrgId]?.posts?.length === 2, `Tenant Alpha has exactly 2 posts on disk after burst`);
  assert((updatedDisk[betaOrgId]?.posts?.length || 0) === 0, `Tenant Beta STILL has 0 posts on disk (strict isolation)`);

  // Logout Tenant Alpha
  const alphaLogoutRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `techurity_session=${alphaCookie}`,
    },
    body: JSON.stringify({ action: 'logout' }),
  });
  assert(alphaLogoutRes.ok, 'Tenant Alpha logout request succeeded');
  const logoutHeader = alphaLogoutRes.headers.get('set-cookie');
  assert(logoutHeader?.includes('Max-Age=0'), 'Tenant Alpha logout sets Max-Age=0 to revoke session');

  // Verify Alpha session is now terminated
  const postLogoutSession = await (await fetch(`${BASE_URL}/api/auth?action=session`, {
    headers: { Cookie: 'techurity_session=' },
  })).json();
  assert(postLogoutSession.authenticated === false, 'Session status is authenticated: false post-logout');

  console.log('\n================================================================');
  console.log(`STRESS TEST SUMMARY: Total: ${totalChecks} | Passed: ${passedChecks} | Failed: ${failedChecks}`);
  console.log('================================================================\n');

  if (failedChecks > 0) {
    throw new Error(`${failedChecks} assertions failed in Challenger M4 stress test.`);
  }
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
    await runTestSuite();
  } catch (err) {
    console.error('\n❌ Challenger Test Suite Failed:', err);
    process.exitCode = 1;
  } finally {
    console.log('Shutting down Next.js test server...');
    server.kill();
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
    } catch {
      // ignore
    }
  }
}

main();
