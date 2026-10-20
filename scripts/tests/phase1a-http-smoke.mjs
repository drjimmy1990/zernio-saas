import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

// Run after npm run build. Uses the production server, loopback only, a fresh
// signing secret, and webhook.test payloads that never create customer events.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverPath = path.join(root, '.next/standalone/server.js');
assert.ok(fs.existsSync(serverPath), 'Run npm run build before this smoke check.');
const reservation = net.createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const secret = crypto.randomBytes(32).toString('hex');
const server = spawn(process.execPath, [serverPath], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', NODE_ENV: 'production',
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    WEBHOOK_DRAIN_SECRET: crypto.randomBytes(32).toString('hex'),
    ZERNIO_WEBHOOK_SECRET: secret, ZERNIO_API_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '',
    NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  },
});
server.stdout.resume();
server.stderr.resume();
const serverExit = once(server, 'exit');
const base = `http://127.0.0.1:${port}`;
let checks = 0;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100 && !ready; attempt++) {
    if (server.exitCode !== null) throw new Error('Production smoke server exited before readiness.');
    try {
      const response = await fetch(`${base}/api/auth?action=session`);
      ready = response.ok && (await response.json()).authenticated === false;
    }
    catch { /* The server is still binding its port. */ }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Production server did not become ready.');
  const raw = JSON.stringify({ id: 'phase1a-http-test', event: 'webhook.test', timestamp: new Date().toISOString() });
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  for (const receiver of ['/webhooks/zernio', '/api/webhooks/zernio']) {
    assert.equal((await fetch(`${base}${receiver}`)).status, 405); checks++;
    for (const headers of [{}, { 'X-Zernio-Signature': '0'.repeat(64) }]) {
      assert.equal((await fetch(`${base}${receiver}`, { method: 'POST', headers, body: raw })).status, 400); checks++;
    }
    const accepted = await fetch(`${base}${receiver}`, { method: 'POST', headers: { 'X-Zernio-Signature': signature }, body: raw });
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { ok: true, test: true, event: 'webhook.test' }); checks++;
    const malformed = '{}';
    assert.equal((await fetch(`${base}${receiver}`, { method: 'POST', body: malformed, headers: {
      'X-Zernio-Signature': crypto.createHmac('sha256', secret).update(malformed).digest('hex'),
    } })).status, 400); checks++;
  }
  for (const [endpoint, method] of [
    ['/api/connect', 'POST'], ['/api/services', 'GET'], ['/api/services', 'POST'],
    ['/api/whatsapp?action=accounts', 'GET'], ['/api/whatsapp', 'POST'], ['/api/internal/webhooks/drain', 'POST'],
    ['/api/inbox?action=accounts', 'GET'], ['/api/inbox', 'POST'],
    ['/api/comments?action=accounts', 'GET'], ['/api/comments', 'POST'],
    ['/api/messaging-settings?action=accounts', 'GET'], ['/api/messaging-settings', 'POST'],
    ['/api/whatsapp/media', 'GET'],
    ['/api/accounts', 'GET'], ['/api/accounts', 'POST'],
    ['/api/publishing?action=accounts', 'GET'], ['/api/publishing', 'POST'],
    ['/api/v1/posts', 'GET'], ['/api/v1/workspaces/reset', 'POST'], ['/api/v1/admin/reset', 'POST'],
    ['/api/crm', 'GET'], ['/api/crm', 'POST'], ['/api/saas', 'GET'], ['/api/saas', 'POST'],
    ['/api/phone-lifecycle?action=numbers', 'GET'], ['/api/phone-lifecycle', 'POST'],
    ['/api/reports', 'GET'], ['/api/campaigns', 'GET'], ['/api/campaigns', 'POST'],
    ['/api/internal/campaigns/drain', 'POST'], ['/api/admin', 'GET'], ['/api/admin', 'POST'],
  ]) {
    const response = await fetch(`${base}${endpoint}`, { method, ...(method === 'POST' ? { body: '{}' } : {}) });
    assert.equal(response.status, 401, `${method} ${endpoint} must reject an anonymous request`); checks++;
  }
  console.log(`Production HTTP smoke passed: ${checks} checks. Both webhook paths and anonymous API boundaries verified locally.`);
} finally {
  server.kill();
  await serverExit;
}
