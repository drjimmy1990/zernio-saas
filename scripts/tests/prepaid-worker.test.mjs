import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

const paths = ['/api/internal/webhooks/drain', '/api/internal/campaigns/drain', '/api/internal/billing/drain'];
const worker = fileURLToPath(new URL('../webhook-worker.mjs', import.meta.url));
const privateMarker = 'private-customer-receipt-must-not-be-logged';

async function runWorker({ billing = {}, webhook = {}, campaign = {}, failedPath } = {}) {
  const secret = randomBytes(32).toString('hex');
  const requests = [];
  const responses = {
    [paths[0]]: { delivered: 0, failed: 0, ...webhook },
    [paths[1]]: { submitted: 0, stopped: 0, ...campaign },
    [paths[2]]: { processed: 0, paymentDue: 0, failed: 0, ...billing, receipt: privateMarker, secret },
  };
  const server = http.createServer((request, response) => {
    requests.push({ path: request.url, method: request.method, authorized: request.headers.authorization === `Bearer ${secret}` });
    response.writeHead(request.url === failedPath ? 503 : responses[request.url] ? 200 : 404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(request.url === failedPath ? { error: privateMarker, secret } : responses[request.url]));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let result;
  try {
    const options = {
      windowsHide: true,
      timeout: 10_000,
      env: { ...process.env, WEBHOOK_DRAIN_SECRET: secret, WEBHOOK_DRAIN_URL: `http://127.0.0.1:${server.address().port}${paths[0]}` },
    };
    try {
      result = { code: 0, ...await promisify(execFile)(process.execPath, [worker, '--once'], options) };
    } catch (error) {
      result = { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  assert.deepEqual(requests, paths.map(path => ({ path, method: 'POST', authorized: true })));
  const output = `${result.stdout}\n${result.stderr}`;
  assert.ok(!output.includes(secret), 'Worker output must not expose its private bearer secret.');
  assert.ok(!output.includes(privateMarker), 'Worker output must contain aggregate counts, not customer evidence.');
  return result;
}

test('unpaid-only renewal results require administrator review without claiming a charge or failing the worker', async () => {
  const result = await runWorker({ billing: { paymentDue: 2 } });
  assert.equal(result.code, 0);
  assert.match(result.stderr, /2 renewals are unpaid\. Administrator review required: check wallet funding and any continuing supplier rental charges\./);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /charged from prepaid funds|workspaces require renewal review/);
  assert.equal(result.stdout, '');
});

test('charged, unpaid and review-required counts remain separate while all three jobs report successful HTTP results', async () => {
  const result = await runWorker({
    webhook: { delivered: 1, failed: 2 },
    campaign: { submitted: 3, stopped: 1 },
    billing: { processed: 4, paymentDue: 2, failed: 1 },
  });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /1 delivered, 2 queued for retry/);
  assert.match(result.stdout, /3 submitted, 1 stopped for review/);
  assert.match(result.stdout, /4 renewals charged from prepaid funds/);
  assert.match(result.stderr, /2 renewals are unpaid/);
  assert.match(result.stderr, /1 workspaces require renewal review/);
});

test('zero renewal counts do not create a false unpaid or charged notice', async () => {
  const result = await runWorker();
  assert.equal(result.code, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('an HTTP failure preserves --once failure status and still attempts the other drain jobs', async () => {
  for (const [index, failedPath] of paths.entries()) {
    const result = await runWorker({ failedPath, billing: { paymentDue: 2 } });
    assert.equal(result.code, 1);
    assert.match(result.stderr, new RegExp(`${['Webhook', 'Campaign', 'Billing'][index]} worker returned HTTP 503`));
    assert.doesNotMatch(result.stdout, /charged from prepaid funds/);
    if (failedPath === paths[2]) assert.doesNotMatch(result.stderr, /renewals are unpaid/);
    else assert.match(result.stderr, /2 renewals are unpaid/);
  }
});
