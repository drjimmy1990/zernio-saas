import assert from 'node:assert/strict';

const baseUrl = 'http://localhost:3000';

async function runLiveProbes() {
  console.log(`[CHALLENGER-1] Starting Live HTTP Stress Probes against ${baseUrl}...`);

  // Probe 1: Direct POST /api/auth with action: 'signup'
  console.log('-> Probe 1: Direct POST /api/auth action: "signup"...');
  const res1 = await fetch(`${baseUrl}/api/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'signup',
      email: 'hacker@adversarial.invalid',
      password: 'HackerPassword123!',
      fullName: 'Hacker User',
    }),
  });
  const body1 = await res1.json();
  assert.equal(res1.status, 403, `Expected status 403, got ${res1.status}`);
  assert.equal(body1.code, 'registration_closed');
  assert.equal(body1.error, 'Registration is coming soon. Existing accounts can still sign in.');
  console.log('   ✓ Probe 1 PASSED: 403 registration_closed returned.');

  // Probe 2: Action casing mutations (SIGNUP, SignUp, etc.)
  console.log('-> Probe 2: Action casing & whitespace mutations...');
  for (const mutated of ['SIGNUP', 'SignUp', ' signup ', 'register']) {
    const res = await fetch(`${baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: mutated,
        email: 'hacker@adversarial.invalid',
        password: 'HackerPassword123!',
        fullName: 'Hacker User',
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 400, `Mutated action "${mutated}" expected 400, got ${res.status}`);
    assert.equal(body.error, 'Unsupported authentication action.');
  }
  console.log('   ✓ Probe 2 PASSED: all mutated actions returned 400.');

  // Probe 3: Origin spoofing attacks
  console.log('-> Probe 3: Origin header spoofing...');
  const origins = ['https://evil.com', 'https://attacker.org', 'null', 'http://malicious.local'];
  for (const origin of origins) {
    const res = await fetch(`${baseUrl}/api/auth`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: origin,
      },
      body: JSON.stringify({
        action: 'signup',
        email: 'hacker@adversarial.invalid',
        password: 'HackerPassword123!',
      }),
    });
    const body = await res.json();
    // In local dev, NEXT_PUBLIC_APP_URL may default to request URL if unset, but foreign evil.com origin must be blocked
    assert.equal(res.status, 403, `Origin "${origin}" expected 403, got ${res.status}`);
    assert.equal(body.error, 'Cross-origin authentication requests are not allowed.');
  }
  console.log('   ✓ Probe 3 PASSED: foreign origins rejected with 403 cross-origin.');

  // Probe 4: Spoofed Forwarded headers
  console.log('-> Probe 4: Forwarded header spoofing...');
  const res4 = await fetch(`${baseUrl}/api/auth`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://evil.com',
      'x-forwarded-host': 'localhost:3000',
      'x-forwarded-proto': 'https',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify({
      action: 'signup',
      email: 'hacker@adversarial.invalid',
      password: 'HackerPassword123!',
    }),
  });
  const body4 = await res4.json();
  assert.equal(res4.status, 403, `Spoofed forwarded headers must still be 403, got ${res4.status}`);
  assert.equal(body4.error, 'Cross-origin authentication requests are not allowed.');
  console.log('   ✓ Probe 4 PASSED: spoofed forwarded headers ignored.');

  // Probe 5: Browser /signup Page View
  console.log('-> Probe 5: Inspecting /signup page HTML...');
  const res5 = await fetch(`${baseUrl}/signup`);
  assert.equal(res5.status, 200);
  const html = await res5.text();
  assert.ok(
    html.includes('Registration coming soon') || html.includes('التسجيل قريباً'),
    'Expected Registration Coming Soon message in HTML'
  );
  assert.ok(!html.includes('<form'), 'Expected zero <form> elements in closed signup page');
  assert.ok(!html.includes('type="password"'), 'Expected zero password input fields');
  assert.ok(!html.includes('type="email"'), 'Expected zero email input fields');
  console.log('   ✓ Probe 5 PASSED: /signup page renders pure coming-soon card with zero input forms.');

  console.log('[CHALLENGER-1] ALL LIVE HTTP PROBES PASSED EMPIRICALLY WITH 100% SUCCESS!');
}

runLiveProbes().catch((err) => {
  console.error('[CHALLENGER-1] LIVE PROBE FAILED:', err);
  process.exit(1);
});
