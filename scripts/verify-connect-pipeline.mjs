import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load compiled Next.js server route module
const routeMod = require('../.next/server/app/api/connect/route.js');
const handler = routeMod.routeModule._getUserland
  ? routeMod.routeModule._getUserland().POST
  : routeMod.routeModule.userland.POST;

if (typeof handler !== 'function') {
  console.error('FATAL: Could not locate POST handler in compiled route module');
  process.exit(1);
}

// Helper to invoke route handler via standard Request/Response
async function invokeApi(bodyOrRaw, isRaw = false) {
  const req = new Request('http://localhost:3000/api/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: isRaw ? bodyOrRaw : JSON.stringify(bodyOrRaw),
  });

  const res = await handler(req);
  const status = res.status;
  const contentType = res.headers.get('content-type') || '';
  let data;
  try {
    data = await res.json();
  } catch (err) {
    data = { _rawText: await res.text(), _parseError: err.message };
  }

  return { status, contentType, data };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    failedTests++;
  }
}

const ALL_18_PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'twitter',
  'youtube',
  'threads',
  'pinterest',
  'reddit',
  'bluesky',
  'snapchat',
  'googlebusiness',
  'telegram',
  'discord',
  'slack',
  'whatsapp',
  'shopify',
  'wordpress',
];

async function runTests() {
  console.log('=================================================================');
  console.log('EMPIRICAL CHALLENGER: EXHAUSTIVE 18-PLATFORM CONNECTION HARNESS');
  console.log('=================================================================\n');

  // ---------------------------------------------------------------------------
  // SUITE 1: start_oauth (Required: Instagram, TikTok, LinkedIn, Google Business)
  // ---------------------------------------------------------------------------
  console.log('--- Suite 1: start_oauth ---');
  const oauthPlatforms = ['instagram', 'tiktok', 'linkedin', 'googlebusiness', 'twitter', 'youtube', 'threads', 'pinterest', 'reddit', 'snapchat', 'slack'];
  for (const plat of oauthPlatforms) {
    const res = await invokeApi({
      action: 'start_oauth',
      platform: plat,
      organizationId: 'org_demo_acme',
    });
    assert(res.status === 200, `start_oauth HTTP status 200 [${plat}]`, `Got ${res.status}`);
    assert(res.contentType.includes('application/json'), `start_oauth returns JSON [${plat}]`);
    assert(res.data.handshakeState === 'ready', `start_oauth handshakeState is ready [${plat}]`);
    assert(Array.isArray(res.data.permissions) && res.data.permissions.length > 0, `start_oauth permissions array [${plat}]`);
    assert(typeof res.data.authUrl === 'string' && res.data.authUrl.length > 0, `start_oauth authUrl generated [${plat}]`);
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: list_entities (Required: Facebook, Instagram, LinkedIn, Discord + others)
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 2: list_entities ---');
  const entityPlatforms = [
    { platform: 'facebook', minItems: 2, expectedName: 'Techurity Official Brand' },
    { platform: 'instagram', minItems: 2, expectedName: 'Techurity Global' },
    { platform: 'linkedin', minItems: 2, expectedName: 'Techurity International Corp' },
    { platform: 'discord', minItems: 2, expectedName: '#announcements' },
    { platform: 'googlebusiness', minItems: 2, expectedName: 'Techurity Headquarters — Ljubljana' },
    { platform: 'pinterest', minItems: 2, expectedName: 'Brand Identity & Visual Campaigns' },
    { platform: 'snapchat', minItems: 1, expectedName: 'Techurity Official Public Profile' },
    { platform: 'whatsapp', minItems: 2, expectedName: 'Techurity VIP Customer Support' },
  ];
  for (const testCase of entityPlatforms) {
    const res = await invokeApi({
      action: 'list_entities',
      platform: testCase.platform,
      organizationId: 'org_demo_acme',
    });
    assert(res.status === 200, `list_entities HTTP 200 [${testCase.platform}]`, `Got ${res.status}`);
    assert(res.contentType.includes('application/json'), `list_entities returns JSON [${testCase.platform}]`);
    assert(Array.isArray(res.data.items), `list_entities items is array [${testCase.platform}]`);
    assert(res.data.items.length >= testCase.minItems, `list_entities has >= ${testCase.minItems} items [${testCase.platform}]`, `Count: ${res.data.items.length}`);
    const found = res.data.items.some(i => i.name.includes(testCase.expectedName));
    assert(found, `list_entities contains expected entity [${testCase.platform}]`, `Expected substring: "${testCase.expectedName}"`);
    for (const item of res.data.items) {
      assert(Boolean(item.id && item.name && item.username), `entity item has id, name, username [${testCase.platform}:${item.id}]`);
    }
  }

  // ---------------------------------------------------------------------------
  // SUITE 3: select_entity
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 3: select_entity ---');
  for (const plat of ['facebook', 'instagram', 'linkedin', 'googlebusiness', 'discord', 'pinterest']) {
    const selectRes = await invokeApi({
      action: 'select_entity',
      platform: plat,
      organizationId: 'org_demo_acme',
      entityId: `ent_${plat}_01`,
      entityName: `Techurity ${plat} Primary`,
      entityUsername: `@techurity_${plat}_official`,
    });
    assert(selectRes.status === 200, `select_entity HTTP 200 [${plat}]`, `Got ${selectRes.status}`);
    assert(selectRes.contentType.includes('application/json'), `select_entity returns JSON [${plat}]`);
    assert(selectRes.data.success === true, `select_entity success is true [${plat}]`);
    assert(Boolean(selectRes.data.account), `select_entity returns account object [${plat}]`);
    const acc = selectRes.data.account || {};
    assert(acc.platform === plat, `select_entity account platform is ${plat}`);
    assert(acc.displayName === `Techurity ${plat} Primary`, `select_entity displayName matches [${plat}]`);
    assert(acc.status === 'healthy', `select_entity account status healthy [${plat}]`);
    assert(acc.tokenHealth?.status === 'healthy', `select_entity tokenHealth status healthy [${plat}]`);
    assert(acc.selectedEntity?.id === `ent_${plat}_01`, `select_entity selectedEntity ID matches [${plat}]`);
  }

  // ---------------------------------------------------------------------------
  // SUITE 4: connect_credentials
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 4: connect_credentials ---');
  // Telegram
  const tgRes = await invokeApi({
    action: 'connect_credentials',
    platform: 'telegram',
    credentials: {
      botToken: '123456789:ABC_defGhIJKLMNOPrstuvwxyz_987654',
      displayName: 'Techurity Main Alerts Bot',
      username: '@TechurityAlertsBot',
    },
  });
  assert(tgRes.status === 200, 'connect_credentials Telegram HTTP 200', `Got ${tgRes.status}`);
  assert(tgRes.data.success === true, 'connect_credentials Telegram success');
  assert(tgRes.data.account.platform === 'telegram', 'Telegram account platform is telegram');
  assert(tgRes.data.account.tokenHealth.expiresInDays === 365, 'Telegram tokenHealth is 365 days');
  assert(tgRes.data.account.displayName === 'Techurity Main Alerts Bot', 'Telegram custom displayName applied');

  // Shopify
  const shopifyRes = await invokeApi({
    action: 'connect_credentials',
    platform: 'shopify',
    credentials: {
      shopDomain: 'techurity-store.myshopify.com',
      token: 'shpat_test_placeholder_token',
    },
  });
  assert(shopifyRes.status === 200, 'connect_credentials Shopify HTTP 200', `Got ${shopifyRes.status}`);
  assert(shopifyRes.data.success === true, 'connect_credentials Shopify success');
  assert(shopifyRes.data.account.platform === 'shopify', 'Shopify account platform is shopify');
  assert(shopifyRes.data.account.username === 'techurity-store.myshopify.com', 'Shopify account username is shopDomain');
  assert(shopifyRes.data.account.displayName === 'Shopify Storefront', 'Shopify displayName is Shopify Storefront');

  // WordPress
  const wpRes = await invokeApi({
    action: 'connect_credentials',
    platform: 'wordpress',
    credentials: {
      siteUrl: 'https://techurity.si/security-blog',
      username: 'techurity_admin',
      appPassword: 'xxxx xxxx xxxx xxxx',
    },
  });
  assert(wpRes.status === 200, 'connect_credentials WordPress HTTP 200', `Got ${wpRes.status}`);
  assert(wpRes.data.success === true, 'connect_credentials WordPress success');
  assert(wpRes.data.account.platform === 'wordpress', 'WordPress account platform is wordpress');
  assert(wpRes.data.account.username === 'https://techurity.si/security-blog', 'WordPress username is siteUrl');
  assert(wpRes.data.account.displayName === 'WordPress Blog Hub', 'WordPress displayName is WordPress Blog Hub');

  // Bluesky
  const bskyRes = await invokeApi({
    action: 'connect_credentials',
    platform: 'bluesky',
    credentials: {
      handle: 'techurity.bsky.social',
      password: 'app-password-xyz',
    },
  });
  assert(bskyRes.status === 200, 'connect_credentials Bluesky HTTP 200', `Got ${bskyRes.status}`);
  assert(bskyRes.data.success === true, 'connect_credentials Bluesky success');
  assert(bskyRes.data.account.platform === 'bluesky', 'Bluesky account platform is bluesky');
  assert(bskyRes.data.account.username === 'techurity.bsky.social', 'Bluesky username is handle');
  assert(bskyRes.data.account.displayName === 'Bluesky Official', 'Bluesky displayName is Bluesky Official');

  // WhatsApp via Credentials
  const waCredRes = await invokeApi({
    action: 'connect_credentials',
    platform: 'whatsapp',
    credentials: {
      phoneNumber: '+971 4 812 9900',
    },
  });
  assert(waCredRes.status === 200, 'connect_credentials WhatsApp HTTP 200', `Got ${waCredRes.status}`);
  assert(waCredRes.data.success === true, 'connect_credentials WhatsApp success');
  assert(waCredRes.data.account.platform === 'whatsapp', 'WhatsApp platform is whatsapp');
  assert(waCredRes.data.account.username === '+971 4 812 9900', 'WhatsApp username is phone number');

  // ---------------------------------------------------------------------------
  // SUITE 5: test_post for ALL 18 PLATFORMS
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 5: test_post across all 18 platforms ---');
  const messagingPlatforms = ['telegram', 'whatsapp', 'discord', 'slack'];
  for (const plat of ALL_18_PLATFORMS) {
    const isMsg = messagingPlatforms.includes(plat);
    const postRes = await invokeApi({
      action: 'test_post',
      platform: plat,
      handle: `techurity_${plat}`,
      content: `Automated broadcast verification on ${plat}`,
    });
    assert(postRes.status === 200, `test_post HTTP 200 [${plat}]`, `Got ${postRes.status}`);
    assert(postRes.data.success === true, `test_post success [${plat}]`);
    const receipt = postRes.data.deliveryReceipt || {};
    assert(receipt.status === 'delivered', `deliveryReceipt status delivered [${plat}]`);
    assert(receipt.deliveryCode === 200, `deliveryReceipt deliveryCode 200 [${plat}]`);
    assert(typeof receipt.latencyMs === 'number' && receipt.latencyMs > 0, `latencyMs is positive [${plat}]`);
    assert(typeof receipt.receiptId === 'string' && receipt.receiptId.startsWith('rec_'), `receiptId starts with rec_ [${plat}]`);
    if (isMsg) {
      assert(receipt.platformPostUrl.includes('/messages/msg_'), `messaging platformPostUrl has /messages/msg_ [${plat}]`);
      assert(receipt.message.includes('received via webhook'), `messaging message mentions webhook [${plat}]`);
    } else {
      assert(receipt.platformPostUrl.includes('/p/test_'), `social platformPostUrl has /p/test_ [${plat}]`);
      assert(receipt.message.includes('rendered live'), `social message mentions rendered live [${plat}]`);
    }
  }

  // ---------------------------------------------------------------------------
  // SUITE 6: check_health
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 6: check_health ---');
  const healthRes = await invokeApi({
    action: 'check_health',
    organizationId: 'org_demo_acme',
  });
  assert(healthRes.status === 200, 'check_health HTTP 200', `Got ${healthRes.status}`);
  assert(healthRes.contentType.includes('application/json'), 'check_health returns JSON');
  assert(Boolean(healthRes.data.quota), 'check_health contains quota object');
  assert(typeof healthRes.data.quota?.used === 'number', 'check_health quota.used is number');
  assert(Boolean(healthRes.data.summary), 'check_health contains summary object');
  assert(Array.isArray(healthRes.data.accounts), 'check_health contains accounts array');
  assert(healthRes.data.accounts.length > 0, 'check_health returns at least one account');
  for (const ac of healthRes.data.accounts) {
    assert(Boolean(ac.platform && ac.status && ac.displayName), `health account has platform, status, displayName [${ac.platform}]`);
  }

  // ---------------------------------------------------------------------------
  // SUITE 7: ADVERSARIAL CHALLENGES & STRESS TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- Suite 7: Adversarial Challenges & Stress Tests ---');

  // 7.1 Malformed Raw JSON
  console.log('Testing 7.1: Malformed Raw JSON body...');
  const malformedRes = await invokeApi('{"action": "start_oauth", "platform": ', true);
  assert(malformedRes.status === 400, 'Malformed JSON returns HTTP 400', `Got ${malformedRes.status}`);
  assert(malformedRes.contentType.includes('application/json'), 'Malformed JSON returns valid JSON error response');
  assert(Boolean(malformedRes.data.error), 'Malformed JSON has error field in JSON');

  // 7.2 Missing Action
  console.log('Testing 7.2: Missing Action in body...');
  const emptyActionRes = await invokeApi({});
  assert(emptyActionRes.status === 400, 'Empty action returns HTTP 400', `Got ${emptyActionRes.status}`);
  assert(emptyActionRes.data.error.includes('Unknown connect action'), 'Empty action returns descriptive error');

  // 7.3 Unknown Action
  console.log('Testing 7.3: Unknown Action in body...');
  const unknownActionRes = await invokeApi({ action: 'exploit_vulnerability' });
  assert(unknownActionRes.status === 400, 'Unknown action returns HTTP 400', `Got ${unknownActionRes.status}`);
  assert(unknownActionRes.data.error.includes('exploit_vulnerability'), 'Unknown action echoes action in error');

  // 7.4 Unsupported Platform in start_oauth
  console.log('Testing 7.4: Unsupported platform in start_oauth...');
  const unsupportedPlatRes = await invokeApi({
    action: 'start_oauth',
    platform: 'myspace_legacy',
  });
  assert(unsupportedPlatRes.status === 400, 'Unsupported platform returns HTTP 400', `Got ${unsupportedPlatRes.status}`);
  assert(unsupportedPlatRes.data.error.includes('disabled') || unsupportedPlatRes.data.error.includes('plan'), 'Unsupported platform error mentions disabled or plan');

  // 7.5 Telegram Bot Token Validation Edge Cases
  console.log('Testing 7.5: Telegram Bot Token Edge Cases...');
  const emptyTgTokenRes = await invokeApi({
    action: 'connect_credentials',
    platform: 'telegram',
    credentials: { botToken: '' },
  });
  assert(emptyTgTokenRes.status === 400, 'Empty Telegram token returns HTTP 400', `Got ${emptyTgTokenRes.status}`);
  assert(emptyTgTokenRes.data.error.includes('Telegram Bot Token is required'), 'Empty Telegram token error description');

  const shortTgTokenRes = await invokeApi({
    action: 'connect_credentials',
    platform: 'telegram',
    credentials: { botToken: 'abc:123' },
  });
  assert(shortTgTokenRes.status === 400, 'Short Telegram token (< 8 chars) returns HTTP 400', `Got ${shortTgTokenRes.status}`);

  // 7.6 Disconnect Action
  console.log('Testing 7.6: Disconnect action...');
  const disconnectRes = await invokeApi({
    action: 'disconnect',
    accountId: 'acc_instagram_9918',
    platform: 'instagram',
  });
  assert(disconnectRes.status === 200, 'disconnect returns HTTP 200', `Got ${disconnectRes.status}`);
  assert(disconnectRes.data.success === true, 'disconnect returns success: true');
  assert(Boolean(disconnectRes.data.disconnectedAt), 'disconnect returns disconnectedAt timestamp');

  // 7.7 Concurrency Stress Test: 50 simultaneous mixed requests
  console.log('Testing 7.7: Concurrency Stress Test (50 simultaneous requests)...');
  const concurrentActions = [
    { action: 'start_oauth', platform: 'instagram' },
    { action: 'list_entities', platform: 'linkedin' },
    { action: 'select_entity', platform: 'facebook', entityId: 'fb_1', entityName: 'Conc FB' },
    { action: 'connect_credentials', platform: 'bluesky', credentials: { handle: 'conc.bsky.social' } },
    { action: 'test_post', platform: 'tiktok', handle: 'conc_tok' },
  ];
  const promises = [];
  for (let i = 0; i < 50; i++) {
    const payload = concurrentActions[i % concurrentActions.length];
    promises.push(invokeApi(payload));
  }
  const results = await Promise.all(promises);
  const allSucceeded = results.every(r => r.status === 200 && !r.data.error);
  assert(allSucceeded, 'All 50 concurrent requests returned HTTP 200 without error', `Success count: ${results.filter(r => r.status === 200).length} / 50`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n=================================================================');
  console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test suite crashed with unhandled error:', err);
  process.exit(1);
});
