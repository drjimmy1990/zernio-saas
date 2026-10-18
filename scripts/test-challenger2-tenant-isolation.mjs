import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3012;
const BASE_URL = `http://localhost:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth?action=session',
        method: 'GET',
      });
      if (res.status === 200) return true;
    } catch {}
    await sleep(250);
  }
  return false;
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message} - Details: ${details}`);
  }
}

async function run() {
  console.log(`Starting Next.js server on port ${PORT}...`);
  const server = spawn('npm.cmd', ['run', 'start', '--', '-p', String(PORT)], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'ignore',
  });

  try {
    const ready = await waitForServer();
    if (!ready) {
      throw new Error('Next.js test server failed to start within timeout');
    }
    console.log(`Server ready at ${BASE_URL}\n`);

    console.log('======================================================');
    console.log('🔬 CHALLENGER 2: CONCURRENT MULTI-TENANT ISOLATION & EMPIRICAL AUDIT');
    console.log('======================================================\n');

    // 1. CONCURRENT REGISTRATION OF 5 TENANTS
    console.log('--- 1. Concurrent Registration of 5 Distinct Tenants ---');
    const tenants = ['Tenant-Alpha', 'Tenant-Beta', 'Tenant-Gamma', 'Tenant-Delta', 'Tenant-Epsilon'];
    const sessions = {};

    const registerPromises = tenants.map(async (name) => {
      const email = `${name.toLowerCase()}_${Date.now()}@challenge.com`;
      const res = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          action: 'signup',
          fullName: `${name} Founder`,
          companyName: `${name} Corp`,
          email,
          password: 'ComplexPassword2026!',
        }
      );

      const setCookie = res.headers['set-cookie'];
      let cookie = null;
      if (setCookie) {
        const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
        cookie = raw.split(';')[0];
      }

      return {
        name,
        email,
        status: res.status,
        json: res.json,
        cookie,
        orgId: res.json?.tenant?.organizationId,
      };
    });

    const regResults = await Promise.all(registerPromises);
    for (const r of regResults) {
      assert(r.status === 200, `${r.name} registered with HTTP 200 OK`);
      assert(!!r.cookie, `${r.name} received signed session cookie`);
      assert(!!r.orgId && r.orgId.startsWith('org_'), `${r.name} received valid organizationId: ${r.orgId}`);
      sessions[r.name] = r;
    }

    // Verify all 5 orgIds are unique
    const uniqueOrgIds = new Set(regResults.map((r) => r.orgId));
    assert(uniqueOrgIds.size === 5, 'All 5 provisioned tenants have globally unique organization IDs');

    // 2. CONCURRENT DIVERGENT MUTATIONS ACROSS TENANTS
    console.log('\n--- 2. Concurrent Divergent Mutations Across Tenants ---');
    // Tenant Alpha: buy number + post
    const mutateAlpha = async () => {
      const buyRes = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/services',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessions['Tenant-Alpha'].cookie,
          },
        },
        {
          subService: 'telephony',
          action: 'buy_number',
          country: 'US',
          numberType: 'local',
        }
      );
      const postRes = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/services',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessions['Tenant-Alpha'].cookie,
          },
        },
        {
          subService: 'publishing',
          action: 'create_post',
          content: 'Alpha Exclusive Post #1',
          publishNow: true,
          platforms: [{ platform: 'twitter', accountId: 'acc_alpha_tw' }],
        }
      );
      return { buyRes, postRes };
    };

    // Tenant Beta: 2 posts
    const mutateBeta = async () => {
      const post1 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/services',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessions['Tenant-Beta'].cookie,
          },
        },
        {
          subService: 'publishing',
          action: 'create_post',
          content: 'Beta Post #1',
          publishNow: true,
          platforms: [{ platform: 'linkedin', accountId: 'acc_beta_li' }],
        }
      );
      const post2 = await request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/services',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessions['Tenant-Beta'].cookie,
          },
        },
        {
          subService: 'publishing',
          action: 'create_post',
          content: 'Beta Post #2',
          publishNow: true,
          platforms: [{ platform: 'facebook', accountId: 'acc_beta_fb' }],
        }
      );
      return { post1, post2 };
    };

    // Tenant Gamma: simulate incoming SMS
    const mutateGamma = async () => {
      return request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/services',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessions['Tenant-Gamma'].cookie,
          },
        },
        {
          subService: 'telephony',
          action: 'simulate_incoming_sms',
          fromNumber: '+14159998888',
          toNumber: '+14151112222',
          text: 'Gamma customer OTP: 987654',
        }
      );
    };

    // Tenant Delta: connect social account via /api/connect
    const mutateDelta = async () => {
      return request(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/connect',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessions['Tenant-Delta'].cookie,
          },
        },
        {
          action: 'select_entity',
          organizationId: sessions['Tenant-Delta'].orgId,
          platform: 'instagram',
          selectedEntity: { id: 'delta_ig_page', name: 'Delta Brand IG' },
        }
      );
    };

    // Tenant Epsilon: NO MUTATIONS. Kept pristine 100% clean state.

    // Execute concurrently!
    const [alphaMut, betaMut, gammaMut, deltaMut] = await Promise.all([
      mutateAlpha(),
      mutateBeta(),
      mutateGamma(),
      mutateDelta(),
    ]);

    assert(alphaMut.buyRes.status === 200, 'Tenant Alpha number purchase succeeded (Status 200)');
    assert(alphaMut.postRes.status === 200, 'Tenant Alpha post creation succeeded (Status 200)');
    assert(betaMut.post1.status === 200, 'Tenant Beta post 1 creation succeeded (Status 200)');
    assert(betaMut.post2.status === 200, 'Tenant Beta post 2 creation succeeded (Status 200)');
    assert(gammaMut.status === 200, 'Tenant Gamma simulated SMS succeeded (Status 200)');
    assert(deltaMut.status === 200, 'Tenant Delta select_entity succeeded (Status 200)');

    // 3. ZERO CROSS-TENANT DATA LEAKAGE VERIFICATION
    console.log('\n--- 3. Zero Cross-Tenant Data Leakage Verification ---');
    const getTenantState = async (tenantName) => {
      const orgId = sessions[tenantName].orgId;
      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/services?organizationId=${encodeURIComponent(orgId)}`,
        method: 'GET',
        headers: {
          Cookie: sessions[tenantName].cookie,
        },
      });
      return res.json?.subServicesData;
    };

    const stateAlpha = await getTenantState('Tenant-Alpha');
    const stateBeta = await getTenantState('Tenant-Beta');
    const stateGamma = await getTenantState('Tenant-Gamma');
    const stateDelta = await getTenantState('Tenant-Delta');
    const stateEpsilon = await getTenantState('Tenant-Epsilon');

    // Check Alpha
    const alphaNumbers = stateAlpha?.telephony?.numbers || [];
    const alphaPosts = stateAlpha?.publishing?.posts || [];
    const alphaThreads = stateAlpha?.telephony?.threads || [];
    const alphaAccounts = stateAlpha?.core_connect?.accounts || [];

    assert(alphaNumbers.length === 1, `Tenant Alpha has exactly 1 phone number (actual: ${alphaNumbers.length})`);
    assert(alphaPosts.length === 1, `Tenant Alpha has exactly 1 post (actual: ${alphaPosts.length})`);
    assert(alphaThreads.length === 0, `Tenant Alpha has 0 threads (no Gamma leakage, actual: ${alphaThreads.length})`);
    assert(alphaAccounts.length === 0, `Tenant Alpha has 0 accounts (no Delta leakage, actual: ${alphaAccounts.length})`);

    // Check Beta
    const betaNumbers = stateBeta?.telephony?.numbers || [];
    const betaPosts = stateBeta?.publishing?.posts || [];
    const betaThreads = stateBeta?.telephony?.threads || [];

    assert(betaNumbers.length === 0, `Tenant Beta has 0 phone numbers (no Alpha leakage, actual: ${betaNumbers.length})`);
    assert(betaPosts.length === 2, `Tenant Beta has exactly 2 posts (actual: ${betaPosts.length})`);
    assert(betaThreads.length === 0, `Tenant Beta has 0 threads (no Gamma leakage, actual: ${betaThreads.length})`);

    // Check Gamma
    const gammaNumbers = stateGamma?.telephony?.numbers || [];
    const gammaPosts = stateGamma?.publishing?.posts || [];
    const gammaThreads = stateGamma?.telephony?.threads || [];

    assert(gammaNumbers.length === 0, `Tenant Gamma has 0 phone numbers (actual: ${gammaNumbers.length})`);
    assert(gammaPosts.length === 0, `Tenant Gamma has 0 posts (no Alpha/Beta leakage, actual: ${gammaPosts.length})`);
    assert(gammaThreads.length === 1, `Tenant Gamma has exactly 1 thread (actual: ${gammaThreads.length})`);

    // Check Delta
    const deltaAccounts = stateDelta?.core_connect?.accounts || [];
    const deltaPosts = stateDelta?.publishing?.posts || [];
    const deltaNumbers = stateDelta?.telephony?.numbers || [];

    assert(deltaAccounts.length === 1, `Tenant Delta has exactly 1 connected account (actual: ${deltaAccounts.length})`);
    assert(deltaPosts.length === 0, `Tenant Delta has 0 posts (actual: ${deltaPosts.length})`);
    assert(deltaNumbers.length === 0, `Tenant Delta has 0 phone numbers (actual: ${deltaNumbers.length})`);

    // Check Epsilon (Pristine zero state)
    const epsAccounts = stateEpsilon?.core_connect?.accounts || [];
    const epsPosts = stateEpsilon?.publishing?.posts || [];
    const epsNumbers = stateEpsilon?.telephony?.numbers || [];
    const epsThreads = stateEpsilon?.telephony?.threads || [];
    const epsCalls = stateEpsilon?.telephony?.callHistory || [];
    const epsCampaigns = stateEpsilon?.ads?.campaigns || [];
    const epsImpressions = stateEpsilon?.analytics?.totals?.impressions ?? 0;

    assert(epsAccounts.length === 0, `Tenant Epsilon (clean) has 0 connected accounts (actual: ${epsAccounts.length})`);
    assert(epsPosts.length === 0, `Tenant Epsilon (clean) has 0 posts (actual: ${epsPosts.length})`);
    assert(epsNumbers.length === 0, `Tenant Epsilon (clean) has 0 phone numbers (actual: ${epsNumbers.length})`);
    assert(epsThreads.length === 0, `Tenant Epsilon (clean) has 0 threads (actual: ${epsThreads.length})`);
    assert(epsCalls.length === 0, `Tenant Epsilon (clean) has 0 calls (actual: ${epsCalls.length})`);
    assert(epsCampaigns.length === 0, `Tenant Epsilon (clean) has 0 campaigns (actual: ${epsCampaigns.length})`);
    assert(epsImpressions === 0, `Tenant Epsilon (clean) has 0 impressions (actual: ${epsImpressions})`);

    // 4. ATOMIC DISK PERSISTENCE AUDIT
    console.log('\n--- 4. Atomic Disk Persistence Audit ---');
    const diskPath = path.join(process.cwd(), '.data', 'workspaces.json');
    assert(fs.existsSync(diskPath), '.data/workspaces.json exists on disk');

    const diskData = JSON.parse(fs.readFileSync(diskPath, 'utf-8'));
    assert(!!diskData[sessions['Tenant-Alpha'].orgId], 'Tenant Alpha is written to .data/workspaces.json');
    assert(!!diskData[sessions['Tenant-Beta'].orgId], 'Tenant Beta is written to .data/workspaces.json');
    assert(!!diskData[sessions['Tenant-Gamma'].orgId], 'Tenant Gamma is written to .data/workspaces.json');
    assert(!!diskData[sessions['Tenant-Delta'].orgId], 'Tenant Delta is written to .data/workspaces.json');
    assert(!!diskData[sessions['Tenant-Epsilon'].orgId], 'Tenant Epsilon is written to .data/workspaces.json');

    // Check disk post counts
    assert(diskData[sessions['Tenant-Alpha'].orgId].posts.length === 1, 'Disk has exactly 1 post for Alpha');
    assert(diskData[sessions['Tenant-Beta'].orgId].posts.length === 2, 'Disk has exactly 2 posts for Beta');
    assert(diskData[sessions['Tenant-Gamma'].orgId].threads.length === 1, 'Disk has exactly 1 thread for Gamma');
    assert(diskData[sessions['Tenant-Delta'].orgId].connectedAccounts.length === 1, 'Disk has exactly 1 account for Delta');
    assert(diskData[sessions['Tenant-Epsilon'].orgId].posts.length === 0, 'Disk has 0 posts for Epsilon (zero state)');

    console.log('\n======================================================');
    console.log(`CHALLENGE RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
    console.log('======================================================\n');

    if (failedTests > 0) {
      process.exitCode = 1;
    }
  } finally {
    console.log('Terminating challenge test server...');
    server.kill();
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t']);
    } catch {}
  }
}

run().catch((err) => {
  console.error('Fatal challenge runner error:', err);
  process.exit(1);
});
