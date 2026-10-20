// Contract: installed @zernio/node GetAnalyticsDashboard/GetInboxVolume/GetInboxResponseTime.
// Orbit discovery returned unrelated providers; this fixture reuses Zernio's installed contract.
const http = require('http');
const key = 'launch-reports:state';
// Serialize fixture state writes so concurrent report requests cannot lose log rows.
let requests = Promise.resolve();
async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  let state = await pm.state.get(key) || { scenario: 'success', requests: [] };
  if (url.pathname === '/__fixture/reset') { state = { scenario: req.body?.scenario || 'success', requests: [] }; await pm.state.set(key, state); return send(200, { ok: true }); }
  if (url.pathname === '/__fixture/state') return send(200, state);
  const path = url.pathname.replace(/^\/api\/v1/, ''); state.requests.push({ path, query: Object.fromEntries(url.searchParams), method: req.method }); await pm.state.set(key, state);
  if (req.headers.authorization !== 'Bearer launch_reports_mock_key') return send(401, { error: 'Fixture key required' });
  if (path === '/accounts') return send(200, { accounts: [{ _id: 'owned', profileId: 'profile-a', platform: 'whatsapp', isActive: true }, { _id: 'foreign', profileId: 'profile-b', platform: 'whatsapp', isActive: true }] });
  if (state.scenario === 'outage') return send(503, { error: 'Reporting service unavailable' });
  if (path === '/analytics/dashboard') return send(200, state.scenario === 'malformed' ? {} : {
    dateRange: { fromDate: url.searchParams.get('fromDate'), toDate: url.searchParams.get('toDate') }, totals: { impressions: 12, likes: 0 }, previousTotals: { impressions: 8 },
    followers: { current: 5 }, daily: [{ date: url.searchParams.get('fromDate'), impressions: 12 }], topPosts: [], recentPosts: [],
    dataAsOf: state.scenario === 'unsynced' ? null : '2026-10-20T00:00:00Z',
  });
  if (path === '/analytics/inbox/volume') {
    if (state.scenario === 'partial' && url.searchParams.get('fromDate') < '2026-10-01') return send(503, { error: 'Previous window unavailable' });
    return send(200, { success: true, summary: { received: 7, sent: 4, failed: 0 }, timeseries: [{ date: '2026-10-01', sent: 4 }] });
  }
  if (path === '/analytics/inbox/response-time') return state.scenario === 'partial' ? send(403, { error: 'Response-time report unavailable' }) : send(200, { success: true, summary: { sampleSize: 3, medianSeconds: 22 } });
  return send(501, { error: 'Fixture endpoint not defined' });
}
http.createServer((req, res) => { requests = requests.then(() => handle(req, res)); }).listen(process.env.PORT);
