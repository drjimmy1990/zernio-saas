import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync('src/app/api/internal/webhooks/drain/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function runtime(secret, failure = false) {
  let calls = 0;
  const module = { exports: {} };
  const context = vm.createContext({ Buffer, process: { env: { WEBHOOK_DRAIN_SECRET: secret } } });
  const require = name => name === 'crypto' ? crypto : name === 'next/server' ? { NextResponse: { json: Response.json } } :
    { drainZernioWebhookOutbox: async limit => { assert.equal(limit, 25); calls++; if (failure) throw new Error('Database unavailable'); return { delivered: 1, failed: 2 }; } };
  vm.runInContext(`(function(require,module,exports){${source}})`, context)(require, module, module.exports);
  return { post: module.exports.POST, calls: () => calls };
}

test('worker route requires a configured private bearer secret before draining', async () => {
  for (const secret of [undefined, 'short']) {
    const s = runtime(secret); assert.equal((await s.post(new Request('https://asra3.test/api/internal/webhooks/drain', { method: 'POST' }))).status, 503); assert.equal(s.calls(), 0);
  }
  const s = runtime('isolated-worker-secret-32-characters');
  for (const token of ['', 'Bearer wrong', 'bearer isolated-worker-secret-32-characters']) {
    assert.equal((await s.post(new Request('https://asra3.test/api/internal/webhooks/drain', { method: 'POST', headers: { authorization: token } }))).status, 401);
  }
  assert.equal(s.calls(), 0);
});

test('worker route returns confirmed counts and preserves retry failure status', async () => {
  for (const failure of [false, true]) {
    const secret = 'isolated-worker-secret-32-characters'; const s = runtime(secret, failure);
    const response = await s.post(new Request('https://asra3.test/api/internal/webhooks/drain', { method: 'POST', headers: { authorization: `Bearer ${secret}` } }));
    assert.equal(response.status, failure ? 503 : 200); assert.equal(s.calls(), 1);
    if (!failure) assert.deepEqual(await response.json(), { delivered: 1, failed: 2 });
  }
});

test('Docker worker entrypoint invokes the authenticated route over local HTTP', async () => {
  const secret = 'isolated-worker-secret-32-characters'; const s = runtime(secret);
  let campaigns = 0;
  const server = http.createServer(async (req, res) => {
    if (req.url === '/api/internal/campaigns/drain') {
      assert.equal(req.headers.authorization, `Bearer ${secret}`); assert.equal(req.method, 'POST'); campaigns++;
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ submitted: 1, stopped: 0 })); return;
    }
    const response = await s.post(new Request('http://local.test/api/internal/webhooks/drain', { method: req.method, headers: req.headers }));
    res.writeHead(response.status, { 'Content-Type': 'application/json' }); res.end(await response.text());
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { stdout } = await promisify(execFile)(process.execPath, ['scripts/webhook-worker.mjs', '--once'], {
      windowsHide: true, env: { ...process.env, WEBHOOK_DRAIN_SECRET: secret, WEBHOOK_DRAIN_URL: `http://127.0.0.1:${server.address().port}/api/internal/webhooks/drain` },
    });
    assert.match(stdout, /1 delivered, 2 queued for retry/); assert.equal(s.calls(), 1);
    assert.equal(campaigns, 1); assert.match(stdout, /1 submitted/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
