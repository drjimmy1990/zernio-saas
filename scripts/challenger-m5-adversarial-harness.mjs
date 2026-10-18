// scripts/challenger-m5-adversarial-harness.mjs
// ==============================================================================
// CHALLENGER M5: ADVERSARIAL STRESS TEST & ATTACK HARNESS
// Empirically tests concurrency, cookie forgery, rapid auth transitions,
// and edge-case inputs against live Next.js production server.
// ==============================================================================

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PORT = process.env.PORT || 3015;
const BASE_URL = `http://localhost:${PORT}`;
const REAL_SECRET = process.env.SESSION_SECRET || 'techurity_secure_session_secret_2026';

let passedChecks = 0;
let failedChecks = 0;
const testResults = [];

function assert(condition, message, details = '') {
  if (condition) {
    passedChecks++;
    console.log(`    ✓ PASS: ${message} ${details ? `(${details})` : ''}`);
    testResults.push({ message, passed: true, details });
  } else {
    failedChecks++;
    console.error(`    ✗ FAIL: ${message} ${details ? `[Details: ${details}]` : ''}`);
    testResults.push({ message, passed: false, details });
    throw new Error(`Assertion failed: ${message} ${details}`);
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
      // Waiting for server
    }
    await wait(300);
  }
  throw new Error(`Server at ${url} failed to become responsive within ${timeoutMs}ms`);
}

function extractCookie(res, cookieName = 'techurity_session') {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  const match = raw.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

function craftCookie(payloadObj, secret = REAL_SECRET) {
  const jsonStr = JSON.stringify(payloadObj);
  const base64Payload = Buffer.from(jsonStr, 'utf-8').toString('base64');
  const sig = crypto.createHmac('sha256', secret).update(base64Payload).digest('base64url');
  return `${base64Payload}.${sig}`;
}

async function runAdversarialSuite() {
  console.log('\n==============================================================================');
  console.log('⚔️  CHALLENGER M5 — LIVE ADVERSARIAL STRESS TEST HARNESS');
  console.log('==============================================================================\n');

  // ----------------------------------------------------------------------------
  // SECTION 1: COOKIE FORGERY & CRYPTOGRAPHIC HMAC STRESS
  // ----------------------------------------------------------------------------
  console.log('▶ [Suite 1/4] Cookie Forgery & Cryptographic HMAC Verification');
  {
    const validSessionTemplate = {
      user: {
        id: 'usr_hacker_001',
        fullName: 'Evil Hacker',
        email: 'hacker@darkweb.io',
        role: 'super_admin',
      },
      tenant: {
        organizationId: 'org_hacker_corp',
        organizationName: 'Hacker Corp',
        slug: 'hacker-corp',
        planKey: 'enterprise',
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };

    // Attack 1: Forged cookie with invalid random signature
    {
      const fakeCookie = `${Buffer.from(JSON.stringify(validSessionTemplate)).toString('base64')}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
      const res = await fetch(`${BASE_URL}/dashboard`, {
        headers: { Cookie: `techurity_session=${fakeCookie}` },
        redirect: 'manual',
      });
      assert(res.status === 307 || res.status === 308, 'Attack 1: Forged random signature rejected on /dashboard', `Status: ${res.status}`);
      const loc = res.headers.get('location') || '';
      assert(loc.includes('/login'), 'Attack 1: Redirected to /login');

      const adminApiRes = await fetch(`${BASE_URL}/api/admin`, {
        headers: { Cookie: `techurity_session=${fakeCookie}` },
      });
      assert(adminApiRes.status === 401, 'Attack 1: Forged random signature rejected on /api/admin with 401', `Status: ${adminApiRes.status}`);
    }

    // Attack 2: Forged super_admin session signed with WRONG secret key
    {
      const forgedWithWrongSecret = craftCookie(validSessionTemplate, 'wrong_attacker_secret_key_123');
      const res = await fetch(`${BASE_URL}/admin`, {
        headers: { Cookie: `techurity_session=${forgedWithWrongSecret}` },
        redirect: 'manual',
      });
      assert(res.status === 307 || res.status === 308, 'Attack 2: Wrong secret signed cookie rejected on /admin', `Status: ${res.status}`);

      const adminApiRes = await fetch(`${BASE_URL}/api/admin`, {
        headers: { Cookie: `techurity_session=${forgedWithWrongSecret}` },
      });
      assert(adminApiRes.status === 401, 'Attack 2: Wrong secret rejected on /api/admin with 401', `Status: ${adminApiRes.status}`);
    }

    // Attack 3: Validly signed customer session tampered to super_admin without updating signature
    {
      const legitimateCustomerSession = {
        user: {
          id: 'usr_legit_1',
          fullName: 'Legit User',
          email: 'legit@example.com',
          role: 'member',
        },
        tenant: {
          organizationId: 'org_legit',
          organizationName: 'Legit Org',
          slug: 'legit-org',
          planKey: 'starter',
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      };
      const legitimateCookie = craftCookie(legitimateCustomerSession, REAL_SECRET);
      const [, legitimateSig] = legitimateCookie.split('.');

      // Attacker changes role to super_admin in payload but reuses signature
      const tamperedSession = { ...legitimateCustomerSession, user: { ...legitimateCustomerSession.user, role: 'super_admin' } };
      const tamperedPayloadB64 = Buffer.from(JSON.stringify(tamperedSession)).toString('base64');
      const splicedCookie = `${tamperedPayloadB64}.${legitimateSig}`;

      const res = await fetch(`${BASE_URL}/admin`, {
        headers: { Cookie: `techurity_session=${splicedCookie}` },
        redirect: 'manual',
      });
      assert(res.status === 307 || res.status === 308, 'Attack 3: Payload tampering with signature reuse rejected on /admin', `Status: ${res.status}`);
    }

    // Attack 4: Truncated signature (e.g. 20 chars instead of 43)
    {
      const validCookie = craftCookie(validSessionTemplate, REAL_SECRET);
      const [payload, sig] = validCookie.split('.');
      const truncatedCookie = `${payload}.${sig.slice(0, 20)}`;

      const res = await fetch(`${BASE_URL}/dashboard`, {
        headers: { Cookie: `techurity_session=${truncatedCookie}` },
        redirect: 'manual',
      });
      assert(res.status === 307 || res.status === 308, 'Attack 4: Truncated signature rejected', `Status: ${res.status}`);
    }

    // Attack 5: Expired session cookie (expiresAt in the past)
    {
      const expiredSession = {
        ...validSessionTemplate,
        createdAt: Date.now() - 1000000,
        expiresAt: Date.now() - 5000, // Expired 5 seconds ago
      };
      const expiredCookie = craftCookie(expiredSession, REAL_SECRET);
      const res = await fetch(`${BASE_URL}/dashboard`, {
        headers: { Cookie: `techurity_session=${expiredCookie}` },
        redirect: 'manual',
      });
      assert(res.status === 307 || res.status === 308, 'Attack 5: Expired cookie strictly rejected', `Status: ${res.status}`);
    }

    // Attack 6: Corrupted and non-standard cookie formats
    const malformedVariants = [
      'no_dot_at_all',
      'too.many.dots.in.the.cookie.structure',
      'invalid_base64_payload==!!??.valid_looking_signature',
      '..',
      '',
      '%00nullbyte.%00nullbyte',
    ];

    for (let i = 0; i < malformedVariants.length; i++) {
      const variant = malformedVariants[i];
      const res = await fetch(`${BASE_URL}/dashboard`, {
        headers: { Cookie: `techurity_session=${encodeURIComponent(variant)}` },
        redirect: 'manual',
      });
      assert(res.status === 307 || res.status === 308, `Attack 6.${i + 1}: Malformed cookie format "${variant.slice(0, 15)}" rejected safely without 500 crash`, `Status: ${res.status}`);
    }
  }

  // ----------------------------------------------------------------------------
  // SECTION 2: RAPID SEQUENTIAL AUTH TRANSITIONS & NO-LEAK STATE
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Suite 2/4] Rapid Sequential Auth Transitions & Privilege Isolation');
  {
    // Step A: Register customer
    const customerEmail = `challenger_${Date.now()}@stress.io`;
    const signupRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signup',
        fullName: 'Challenger Customer',
        email: customerEmail,
        password: 'Password123!',
        companyName: 'Challenger Corp',
      }),
    });
    assert(signupRes.status === 200, 'Customer registration successful');
    const customerCookie = extractCookie(signupRes);
    assert(Boolean(customerCookie), 'Customer received session cookie');

    // Test: Invalid admin password rejected
    const badAdminRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: 'admin@techurity.si',
        password: 'wrong_password_123',
      }),
    });
    assert(badAdminRes.status === 401, 'Invalid admin password rejected with 401');

    // Step B: Super admin login with valid credentials
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: 'admin@techurity.si',
        password: process.env.ADMIN_PASSWORD || 'AdminPassword2026!',
      }),
    });
    assert(adminLoginRes.status === 200, 'Super admin login successful');
    const adminCookie = extractCookie(adminLoginRes);
    assert(Boolean(adminCookie), 'Super admin received session cookie');

    // Step C: Rapid interleaving (12 rapid cycles switching headers)
    console.log('    Executing 12 rapid interleaved requests across unauthenticated, customer, and admin states...');
    for (let i = 0; i < 12; i++) {
      // 1. Unauthenticated request to /dashboard
      const unauthRes = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
      assert(unauthRes.status === 307 || unauthRes.status === 308, `Cycle ${i + 1}: Unauth /dashboard -> 307 redirect`);

      // 2. Customer request to /dashboard
      const custDashRes = await fetch(`${BASE_URL}/dashboard`, {
        headers: { Cookie: `techurity_session=${customerCookie}` },
        redirect: 'manual',
      });
      assert(custDashRes.status === 200, `Cycle ${i + 1}: Customer /dashboard -> 200 OK`);

      // 3. Customer privilege escalation attempt to /admin
      const custAdminRes = await fetch(`${BASE_URL}/admin`, {
        headers: { Cookie: `techurity_session=${customerCookie}` },
        redirect: 'manual',
      });
      assert(custAdminRes.status === 307 || custAdminRes.status === 308, `Cycle ${i + 1}: Customer /admin -> 307 redirect (privilege blocked)`);
      const custAdminLoc = custAdminRes.headers.get('location') || '';
      assert(custAdminLoc.includes('/dashboard'), `Cycle ${i + 1}: Escalation redirected to /dashboard`);

      // 4. Customer attempt on /api/admin
      const custApiAdminRes = await fetch(`${BASE_URL}/api/admin`, {
        headers: { Cookie: `techurity_session=${customerCookie}` },
      });
      assert(custApiAdminRes.status === 401, `Cycle ${i + 1}: Customer /api/admin -> 401 Unauthorized`);

      // 5. Super admin request to /admin
      const adminRes = await fetch(`${BASE_URL}/admin`, {
        headers: { Cookie: `techurity_session=${adminCookie}` },
        redirect: 'manual',
      });
      assert(adminRes.status === 200, `Cycle ${i + 1}: Admin /admin -> 200 OK`);

      // 6. Super admin request to /api/admin
      const adminApiRes = await fetch(`${BASE_URL}/api/admin`, {
        headers: { Cookie: `techurity_session=${adminCookie}` },
      });
      assert(adminApiRes.status === 200, `Cycle ${i + 1}: Admin /api/admin -> 200 OK`);
    }

    // Step D: Logout Customer and verify immediate invalidation
    const logoutRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `techurity_session=${customerCookie}`,
      },
      body: JSON.stringify({ action: 'logout' }),
    });
    assert(logoutRes.status === 200, 'Logout successful');
    const setCookieHeader = logoutRes.headers.get('set-cookie') || '';
    assert(setCookieHeader.includes('Max-Age=0'), 'Logout sets Max-Age=0 to immediately invalidate session cookie');

    // Verify post-logout unauthenticated state
    const postLogoutDash = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    assert(postLogoutDash.status === 307 || postLogoutDash.status === 308, 'Post-logout request to /dashboard redirected to /login');
    const postLogoutLoc = postLogoutDash.headers.get('location') || '';
    assert(postLogoutLoc.includes('/login'), 'Post-logout redirect targets /login');
  }

  // ----------------------------------------------------------------------------
  // SECTION 3: CONCURRENCY STRESS ON TELEPHONY & MESSAGING
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Suite 3/4] Concurrency Stress on Telephony & Messaging');
  {
    // Create dedicated tenant for concurrency
    const concEmail = `conc_${Date.now()}@stress.io`;
    const concSignup = await (
      await fetch(`${BASE_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          fullName: 'Concurrency Test User',
          email: concEmail,
          password: 'Password123!',
          companyName: 'Concurrency Global Ltd',
        }),
      })
    ).json();
    const concOrgId = concSignup.tenant.organizationId;
    const concLoginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: concEmail,
        password: 'Password123!',
      }),
    });
    const concCookie = extractCookie(concLoginRes);
    const concHeaders = {
      'Content-Type': 'application/json',
      Cookie: `techurity_session=${concCookie}`,
    };

    // Sub-test A: 15 concurrent number searches across different country codes
    console.log('    Spawning 15 concurrent search_numbers requests...');
    const searchCountries = ['US', 'GB', 'AE', 'SA', 'EG', 'FR', 'DE', 'IT', 'ES', 'BR', 'TR', 'JP', 'IN', 'AU', 'CA'];
    const searchPromises = searchCountries.map((c) =>
      fetch(`${BASE_URL}/api/services`, {
        method: 'POST',
        headers: concHeaders,
        body: JSON.stringify({
          subService: 'telephony',
          action: 'search_numbers',
          organizationId: concOrgId,
          country: c,
        }),
      }).then((r) => r.json())
    );

    const searchResults = await Promise.all(searchPromises);
    assert(searchResults.length === 15, 'All 15 search queries finished');
    for (let i = 0; i < searchResults.length; i++) {
      const res = searchResults[i];
      assert(Array.isArray(res.results) && res.results.length > 0, `Search for ${searchCountries[i]} returned available numbers`, `Found: ${res.results?.length}`);
    }

    // Sub-test B: 5 concurrent number purchases (US, GB, AE, SA, DE)
    console.log('    Spawning 5 concurrent buy_number requests...');
    const buyCountries = ['US', 'GB', 'AE', 'SA', 'DE'];
    const buyPromises = buyCountries.map((country) =>
      fetch(`${BASE_URL}/api/services`, {
        method: 'POST',
        headers: concHeaders,
        body: JSON.stringify({
          subService: 'telephony',
          action: 'buy_number',
          organizationId: concOrgId,
          country,
        }),
      }).then((r) => r.json())
    );

    const buyResults = await Promise.all(buyPromises);
    assert(buyResults.length === 5, 'All 5 concurrent purchases returned');
    const purchasedNumbers = [];
    for (let i = 0; i < buyResults.length; i++) {
      const br = buyResults[i];
      assert(br.success === true, `Concurrent buy for ${buyCountries[i]} succeeded`);
      assert(Boolean(br.phoneNumber?.phoneNumber), `Purchased number assigned (${br.phoneNumber?.phoneNumber})`);
      purchasedNumbers.push(br.phoneNumber);
    }

    // Check disk storage consistency after concurrent writes
    const storePath = path.join(process.cwd(), '.data', 'workspaces.json');
    assert(fs.existsSync(storePath), '.data/workspaces.json exists after concurrent writes');
    const storeContent = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    const tenantWorkspace = storeContent[concOrgId];
    assert(Boolean(tenantWorkspace), 'Tenant workspace present in persistent disk store');
    assert(tenantWorkspace.ownedNumbers.length === 5, 'Tenant workspace contains exactly 5 purchased numbers after concurrent buys', `Count: ${tenantWorkspace.ownedNumbers.length}`);

    // Sub-test C: 10 concurrent SMS operations (5 outbound + 5 simulated inbound)
    console.log('    Spawning 10 concurrent SMS operations...');
    const primaryVirtualNumber = purchasedNumbers[0].phoneNumber;
    const smsPromises = [];

    // 5 Outbound SMS
    for (let i = 0; i < 5; i++) {
      smsPromises.push(
        fetch(`${BASE_URL}/api/services`, {
          method: 'POST',
          headers: concHeaders,
          body: JSON.stringify({
            subService: 'telephony',
            action: 'send_sms',
            organizationId: concOrgId,
            fromNumber: primaryVirtualNumber,
            toNumber: `+1 (555) 000-000${i}`,
            text: `Concurrent outbound test message #${i + 1}`,
          }),
        }).then((r) => r.json())
      );
    }

    // 5 Inbound SMS
    for (let i = 0; i < 5; i++) {
      smsPromises.push(
        fetch(`${BASE_URL}/api/services`, {
          method: 'POST',
          headers: concHeaders,
          body: JSON.stringify({
            subService: 'telephony',
            action: 'simulate_incoming_sms',
            organizationId: concOrgId,
            fromNumber: `+1 (555) 111-000${i}`,
            toNumber: primaryVirtualNumber,
            type: 'otp',
          }),
        }).then((r) => r.json())
      );
    }

    const smsResults = await Promise.all(smsPromises);
    assert(smsResults.length === 10, 'All 10 concurrent SMS operations resolved');
    for (const r of smsResults) {
      assert(r.success === true, 'SMS operation reported success: true');
    }

    // Re-verify workspace integrity after concurrent messaging
    const postSmsStore = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    const postSmsWorkspace = postSmsStore[concOrgId];
    assert(postSmsWorkspace.threads.length >= 10, 'All 10 messaging threads recorded without data race loss', `Threads: ${postSmsWorkspace.threads.length}`);
  }

  // ----------------------------------------------------------------------------
  // SECTION 4: EDGE CASE INPUTS & ADVERSARIAL FUZZING
  // ----------------------------------------------------------------------------
  console.log('\n▶ [Suite 4/4] Edge Case Inputs & Robust Error Handling');
  {
    // Register test user for edge case validation
    const edgeEmail = `edge_${Date.now()}@stress.io`;
    const edgeSignup = await (
      await fetch(`${BASE_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          fullName: 'Edge Tester',
          email: edgeEmail,
          password: 'Password123!',
          companyName: 'Edge Test Ltd',
        }),
      })
    ).json();
    const edgeOrgId = edgeSignup.tenant.organizationId;
    const edgeLoginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: edgeEmail,
        password: 'Password123!',
      }),
    });
    const edgeCookie = extractCookie(edgeLoginRes);
    const edgeHeaders = {
      'Content-Type': 'application/json',
      Cookie: `techurity_session=${edgeCookie}`,
    };

    // Edge 1: buy_number with invalid/malicious country code
    const invalidCountries = ['ZZ', '1234', 'NONE', "'; DROP TABLE phone_numbers; --", '<script>alert(1)</script>'];
    for (const badCountry of invalidCountries) {
      const res = await fetch(`${BASE_URL}/api/services`, {
        method: 'POST',
        headers: edgeHeaders,
        body: JSON.stringify({
          subService: 'telephony',
          action: 'buy_number',
          organizationId: edgeOrgId,
          country: badCountry,
        }),
      });
      assert(res.status === 400, `Edge 1: Invalid country "${badCountry.slice(0, 15)}" rejected with HTTP 400`, `Status: ${res.status}`);
      const data = await res.json();
      assert(Boolean(data.error), `Edge 1: Clean error message returned for "${badCountry.slice(0, 15)}"`);
    }

    // Edge 2: initiate_call with missing or empty destination number
    {
      const emptyNumbers = ['', '   ', '\t\n'];
      for (const badNum of emptyNumbers) {
        const res = await fetch(`${BASE_URL}/api/services`, {
          method: 'POST',
          headers: edgeHeaders,
          body: JSON.stringify({
            subService: 'telephony',
            action: 'initiate_call',
            organizationId: edgeOrgId,
            fromNumber: '+1 (415) 555-0100',
            toNumber: badNum,
            mode: 'direct_voice',
          }),
        });
        assert(res.status === 400, `Edge 2: Empty destination number "${badNum}" rejected with HTTP 400`, `Status: ${res.status}`);
        const data = await res.json();
        assert(data.error.includes('Destination phone number'), 'Edge 2: Helpful error message returned for empty toNumber');
      }
    }

    // Edge 3: send_sms with empty body and empty mediaUrls
    {
      const res = await fetch(`${BASE_URL}/api/services`, {
        method: 'POST',
        headers: edgeHeaders,
        body: JSON.stringify({
          subService: 'telephony',
          action: 'send_sms',
          organizationId: edgeOrgId,
          fromNumber: '+1 (415) 555-0100',
          toNumber: '+1 (415) 555-0200',
          text: '',
          mediaUrls: [],
        }),
      });
      assert(res.status === 400, 'Edge 3: Empty SMS message body rejected with HTTP 400', `Status: ${res.status}`);
      const data = await res.json();
      assert(data.error.includes('Message text or mediaUrls is required'), 'Edge 3: Clean error message returned');
    }

    // Edge 4: send_sms with huge payload (10,000 characters)
    {
      const hugeText = 'Techurity '.repeat(1000);
      const res = await fetch(`${BASE_URL}/api/services`, {
        method: 'POST',
        headers: edgeHeaders,
        body: JSON.stringify({
          subService: 'telephony',
          action: 'send_sms',
          organizationId: edgeOrgId,
          fromNumber: '+1 (415) 555-0100',
          toNumber: '+1 (415) 555-0300',
          text: hugeText,
        }),
      });
      assert(res.status === 200, 'Edge 4: 10,000-char SMS body handled cleanly without server crash (HTTP 200)');
      const data = await res.json();
      assert(data.success === true && Boolean(data.messageId), 'Edge 4: Message ID returned');
    }

    // Edge 5: link_whatsapp on non-existent phone number ID
    {
      const res = await fetch(`${BASE_URL}/api/services`, {
        method: 'POST',
        headers: edgeHeaders,
        body: JSON.stringify({
          subService: 'telephony',
          action: 'link_whatsapp',
          organizationId: edgeOrgId,
          phoneNumberId: 'num_non_existent_99999',
          displayName: 'Ghost Business',
          category: 'ENTERPRISE',
          verificationMethod: 'sms_otp',
        }),
      });
      assert(res.status === 400, 'Edge 5: Non-existent phone number ID rejected with HTTP 400', `Status: ${res.status}`);
      const data = await res.json();
      assert(data.error.includes('not found'), 'Edge 5: Informative not found error returned');
    }

    // Edge 6: Authentication with empty / missing parameters
    {
      const emptyAuthRes = await fetch(`${BASE_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', email: '', password: '' }),
      });
      assert(emptyAuthRes.status === 400, 'Edge 6: Empty signup rejected with HTTP 400', `Status: ${emptyAuthRes.status}`);

      const badLoginRes = await fetch(`${BASE_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: 'nonexistent@user.com', password: 'randompassword' }),
      });
      assert(badLoginRes.status === 401, 'Edge 6: Non-existent login rejected with HTTP 401', `Status: ${badLoginRes.status}`);
    }
  }

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log('🏆 CHALLENGER M5 ADVERSARIAL SCORECARD');
  console.log('==============================================================================');
  console.log(`Total Adversarial Checks Passed: ${passedChecks}`);
  console.log(`Total Adversarial Checks Failed: ${failedChecks}`);
  console.log('==============================================================================');
  if (failedChecks === 0) {
    console.log('🛡️  VERDICT: ALL ADVERSARIAL STRESS CHALLENGES PASSED WITH ZERO VULNERABILITIES!');
  } else {
    console.log('⚠️  VERDICT: VULNERABILITIES DETECTED — REQUEST CHANGES!');
  }
  console.log('==============================================================================\n');
}

async function main() {
  console.log(`[Adversarial Runner] Spawning Next.js production server on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
  });

  let runnerError = null;

  try {
    await waitForServer(BASE_URL);
    console.log(`[Adversarial Runner] Server confirmed ready at ${BASE_URL}`);
    await runAdversarialSuite();
  } catch (err) {
    console.error('\n❌ [Adversarial Runner] Adversarial Challenge Failed:', err);
    runnerError = err;
    process.exitCode = 1;
  } finally {
    console.log('[Adversarial Runner] Cleaning up server process...');
    server.kill();
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
    } catch {
      // Ignore
    }
    if (runnerError) {
      process.exit(1);
    }
  }
}

main();
