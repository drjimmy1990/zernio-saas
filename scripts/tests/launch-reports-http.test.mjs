import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawn, spawnSync } from 'node:child_process';
import test, { before, after } from 'node:test';
import ts from 'typescript';

const root = process.cwd(), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'asra3-reports-'));
let processHandle, origin, output = '', errors = '';
before(async () => {
  const portServer = net.createServer(); await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve));
  const port = portServer.address().port; await new Promise(resolve => portServer.close(resolve)); origin = `http://127.0.0.1:${port}/zernio`;
  processHandle = spawn('postman', ['simulation', 'run', 'postman/simulations/launch-reports.sim.yaml', '--port', String(port), '--output', 'ndjson', '--no-history'], { cwd: root, windowsHide: true });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(errors || 'Reporting fixture failed to start')), 30000);
    processHandle.on('error', e => { clearTimeout(timer); reject(e); });
    processHandle.stdout.on('data', chunk => { output += chunk; if (output.includes('"event":"listening"')) { clearTimeout(timer); resolve(); } });
    processHandle.stderr.on('data', chunk => { errors += chunk; });
  });
});
after(() => {
  if (processHandle?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(processHandle.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else processHandle.kill('SIGINT'); }
  fs.writeFileSync(path.join(temp, 'simulation.ndjson'), output); assert.match(output, /"event":"request"/); console.log(`Reporting HTTP evidence: ${temp}`);
});
async function reset(scenario = 'success') { assert.equal((await fetch(`${origin}/__fixture/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) })).status, 200); }
async function calls() { return (await (await fetch(`${origin}/__fixture/state`)).json()).requests; }
function runtime() {
  const modules = {}, context = vm.createContext({ URL, Request, Response, Headers, Buffer, Date, Intl, AbortController, setTimeout, clearTimeout, console,
    process: { env: { ZERNIO_BASE_URL: `${origin}/api/v1`, ZERNIO_API_KEY: 'launch_reports_mock_key' } },
    fetch: (url, options) => { assert.equal(new URL(url).origin, new URL(origin).origin, 'Live requests forbidden'); return fetch(url, options); } });
  function load(file) {
    if (modules[file]) return modules[file].exports;
    const module = { exports: {} }; modules[file] = module;
    const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = name => {
      if (name === 'crypto') return crypto;
      if (name === '@/lib/zernio/policy-engine') return { getFallbackStore: () => ({ globalConfig: {} }), assertSubServiceAllowed: async org => assert.equal(org, 'org-a') };
      if (name === '@/lib/services/core-connect.service') return { CoreConnectService: { ensureTenantProfile: async org => { assert.equal(org, 'org-a'); return 'profile-a'; } } };
      if (name === '@/lib/auth/tenant-access') return { TenantAccessError: class extends Error { constructor(status, message) { super(message); this.status = status; } } };
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
      throw new Error(`Unexpected dependency ${name}`);
    };
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(require, module, module.exports); return module.exports;
  }
  return load('src/lib/reports/service.ts');
}
const input = { organizationId: 'org-a', fromDate: '2026-10-01', toDate: '2026-10-15', timezone: 'Africa/Cairo' };
test('social reporting preserves genuine zeros, leaves missing metrics null, and scopes provider query', async () => {
  await reset(); const report = await runtime().ReportsService.social({ ...input, platform: 'instagram' });
  assert.equal(report.totals.impressions, 12); assert.equal(report.totals.likes, 0); assert.equal(report.totals.reach, null); assert.equal(report.previousTotals.likes, null);
  const request = (await calls()).find(call => call.path === '/analytics/dashboard'); assert.equal(request.query.profileId, 'profile-a'); assert.equal(request.query.platform, 'instagram'); assert.equal(request.query.compare, 'previous_period');
});
test('unsynced provider data never becomes invented zero totals or a current sync timestamp', async () => {
  await reset('unsynced'); const report = await runtime().ReportsService.social(input); assert.equal(report.unavailable, true); assert.equal(report.dataAsOf, null); assert.equal(report.totals.impressions, null);
});
test('messaging exposes partial availability and correct previous-period boundaries', async () => {
  await reset('partial'); const report = await runtime().ReportsService.messaging({ ...input, platform: 'whatsapp', accountId: 'owned' });
  assert.equal(report.summary.sent, 4); assert.equal(report.summary.read, null); assert.equal(report.previousSummary.sent, null); assert.equal(report.responseTime.medianSeconds, null); assert.equal(report.previousUnavailable, true);
  const reports = (await calls()).filter(c => c.path.startsWith('/analytics/')); assert.ok(reports.every(c => c.query.profileId === 'profile-a' && c.query.accountId === 'owned'));
  assert.ok(reports.some(c => c.query.fromDate === '2026-09-16' && c.query.toDate === '2026-09-30'));
});
test('foreign account, invalid calendar dates and unavailable channel filters cannot request reports', async () => {
  await reset(); const api = runtime().ReportsService;
  await assert.rejects(api.messaging({ ...input, accountId: 'foreign' }), /not connected/);
  await assert.rejects(api.social({ ...input, fromDate: '2026-02-30' }), /valid/);
  await assert.rejects(api.social({ ...input, platform: 'linkedin' }), /Facebook and Instagram/);
  await assert.rejects(api.social({ ...input, timezone: 'Invalid\/Zone' }), /timezone/);
  assert.equal((await calls()).filter(c => c.path.startsWith('/analytics/')).length, 0);
});
test('upstream errors and malformed responses remain errors; CSV protects formula cells', async () => {
  await reset('outage'); await assert.rejects(runtime().ReportsService.social(input), /unavailable/);
  await reset('malformed'); await assert.rejects(runtime().ReportsService.social(input), /unavailable/);
  const csv = runtime().reportCsv([['=HYPERLINK("test")', null, 0]]); assert.match(csv, /'=HYPERLINK/); assert.match(csv, /Unavailable/); assert.match(csv, /"0"/);
});
