/**
 * Challenger M6 Adversarial Verification Suite
 * Tests Bearer auth, boundary/negative cases, and persistence clean state.
 */

const BASE_URL = 'http://localhost:3000';

async function runAdversarialTests() {
  console.log('=== RUNNING ADVERSARIAL M6 CHALLENGE SUITE ===\n');
  const results = [];

  function record(title, pass, details) {
    results.push({ title, pass, details });
    console.log(`${pass ? '✓ PASS' : '✗ FAIL'}: ${title}`);
    if (details) console.log(`   Details: ${JSON.stringify(details)}`);
  }

  // 1. Bearer Auth: Valid tokens
  try {
    const rLiveHealth = await fetch(`${BASE_URL}/api/v1/accounts/health`, {
      headers: { Authorization: 'Bearer tk_live_test_user_123' },
    });
    record(
      'Bearer auth: valid tk_live_test_user_123 on /api/v1/accounts/health returns 200',
      rLiveHealth.status === 200,
      { status: rLiveHealth.status }
    );

    const rTestHealth = await fetch(`${BASE_URL}/api/v1/accounts/health`, {
      headers: { Authorization: 'Bearer tk_test_xyz' },
    });
    record(
      'Bearer auth: valid tk_test_xyz on /api/v1/accounts/health returns 200',
      rTestHealth.status === 200,
      { status: rTestHealth.status }
    );

    const rLiveContacts = await fetch(`${BASE_URL}/api/v1/contacts`, {
      headers: { Authorization: 'Bearer tk_live_test_user_123' },
    });
    record(
      'Bearer auth: valid tk_live_test_user_123 on /api/v1/contacts returns 200',
      rLiveContacts.status === 200,
      { status: rLiveContacts.status }
    );

    const rTestContacts = await fetch(`${BASE_URL}/api/v1/contacts`, {
      headers: { Authorization: 'Bearer tk_test_xyz' },
    });
    record(
      'Bearer auth: valid tk_test_xyz on /api/v1/contacts returns 200',
      rTestContacts.status === 200,
      { status: rTestContacts.status }
    );
  } catch (err) {
    record('Bearer auth valid tokens suite threw exception', false, { error: err.message });
  }

  // 2. Bearer Auth: Invalid tokens
  try {
    const rInvalid = await fetch(`${BASE_URL}/api/v1/accounts/health`, {
      headers: { Authorization: 'Bearer tk_invalid' },
    });
    const dInvalid = await rInvalid.json().catch(() => ({}));
    record(
      'Bearer auth: invalid tk_invalid returns 401 invalid_api_key',
      rInvalid.status === 401 && dInvalid.error?.code === 'invalid_api_key',
      { status: rInvalid.status, code: dInvalid.error?.code }
    );

    const rMalformed = await fetch(`${BASE_URL}/api/v1/accounts/health`, {
      headers: { Authorization: 'Bearer malformed' },
    });
    const dMalformed = await rMalformed.json().catch(() => ({}));
    record(
      'Bearer auth: malformed Bearer malformed returns 401 invalid_api_key',
      rMalformed.status === 401 && dMalformed.error?.code === 'invalid_api_key',
      { status: rMalformed.status, code: dMalformed.error?.code }
    );

    const rMissing = await fetch(`${BASE_URL}/api/v1/accounts/health`);
    const dMissing = await rMissing.json().catch(() => ({}));
    record(
      'Bearer auth: missing header returns 401 unauthorized',
      rMissing.status === 401 && dMissing.error?.code === 'unauthorized',
      { status: rMissing.status, code: dMissing.error?.code }
    );
  } catch (err) {
    record('Bearer auth invalid tokens suite threw exception', false, { error: err.message });
  }

  // 3. Boundary & Negative: Validate post char limit
  try {
    const rValidatePost = await fetch(`${BASE_URL}/api/v1/validate/post`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer tk_live_test_user_123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'X'.repeat(300),
        platforms: ['x'],
      }),
    });
    const dValidatePost = await rValidatePost.json().catch(() => ({}));
    record(
      'Boundary: /api/v1/validate/post content exceeding limit returns valid: false with errors',
      rValidatePost.status === 200 && dValidatePost.valid === false && Array.isArray(dValidatePost.errors) && dValidatePost.errors.length > 0,
      { status: rValidatePost.status, valid: dValidatePost.valid, errors: dValidatePost.errors }
    );
  } catch (err) {
    record('/api/v1/validate/post test threw exception', false, { error: err.message });
  }

  // 4. Boundary & Negative: Verify non-E.164 phone
  try {
    const rVerifyInvalidPhone = await fetch(`${BASE_URL}/api/v1/verify`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer tk_live_test_user_123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'invalid_phone_number_123',
      }),
    });
    const dVerify = await rVerifyInvalidPhone.json().catch(() => ({}));
    record(
      'Boundary: /api/v1/verify with invalid non-E.164 phone number MUST return 400',
      rVerifyInvalidPhone.status === 400,
      { status: rVerifyInvalidPhone.status, body: dVerify }
    );
  } catch (err) {
    record('/api/v1/verify test threw exception', false, { error: err.message });
  }

  // 5. Boundary & Negative: Non-existent account ID health
  try {
    const rAccountNotFound = await fetch(`${BASE_URL}/api/v1/accounts/acc_non_existent/health`, {
      headers: { Authorization: 'Bearer tk_live_test_user_123' },
    });
    const dAccountNotFound = await rAccountNotFound.json().catch(() => ({}));
    record(
      'Boundary: /api/v1/accounts/acc_non_existent/health MUST return 404',
      rAccountNotFound.status === 404,
      { status: rAccountNotFound.status, body: dAccountNotFound }
    );
  } catch (err) {
    record('/api/v1/accounts/acc_non_existent/health test threw exception', false, { error: err.message });
  }

  // 6. Clean state verification: .data/workspaces.json
  const fs = await import('fs');
  const path = await import('path');
  const wsPath = path.resolve(process.cwd(), '.data', 'workspaces.json');
  let cleanStatePass = false;
  let fileStats = {};
  if (fs.existsSync(wsPath)) {
    const raw = fs.readFileSync(wsPath, 'utf-8');
    const size = fs.statSync(wsPath).size;
    const lines = raw.split('\n').length;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;
    }
    const isClean =
      parsed &&
      typeof parsed === 'object' &&
      (('workspaces' in parsed && Object.keys(parsed.workspaces || {}).length === 0 && Object.keys(parsed).length === 1) ||
        (Object.keys(parsed).length === 0));
    cleanStatePass = Boolean(isClean);
    fileStats = { sizeBytes: size, totalLines: lines, topKeys: Object.keys(parsed || {}) };
  } else {
    fileStats = { exists: false };
  }
  record(
    'Clean state: .data/workspaces.json remains clean {"workspaces":{}}',
    cleanStatePass,
    fileStats
  );

  console.log('\n=== SUMMARY ===');
  const passedCount = results.filter((r) => r.pass).length;
  const failedCount = results.filter((r) => !r.pass).length;
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Verdict: ${failedCount === 0 ? 'APPROVE' : 'REQUEST_CHANGES'}`);
}

runAdversarialTests();
