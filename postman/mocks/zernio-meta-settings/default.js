// Installed SDK setting/thread-control contracts; Graph profile wrappers from the supplied provider docs and Orbit's public Meta contract.
const http = require('http');
const PROFILE = '66a1f0c2a4b9d3e8f1a2b3c4', FB = '66b1f0c2a4b9d3e8f1a2b3c4', IG = '66b1f0c2a4b9d3e8f1a2b3c5', IG_PAGE = '66b1f0c2a4b9d3e8f1a2b3c6';
const key = 'zernio-meta-settings:state';
const seed = () => ({ scenario: 'success', requests: [], settings: {}, owner: 'other', ownerAppId: 'old-app' });
const fields = { 'messenger-greeting': 'greeting', 'messenger-menu': 'persistent_menu', 'messenger-ice-breakers': 'ice_breakers', 'instagram-ice-breakers': 'ice_breakers' };
http.createServer(async (req, res) => {
 const url = new URL(req.url, 'http://localhost'), body = req.body || {}, send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
 let state = await pm.state.get(key) || seed();
 if (url.pathname === '/__fixture/reset') { state = { ...seed(), scenario: body.scenario || 'success', ...body.seed }; await pm.state.set(key, state); return send(200, { ok: true }); }
 if (url.pathname === '/__fixture/state') return send(200, state);
 const route = url.pathname.replace(/^\/api\/v1/, ''); state.requests.push({ method: req.method, path: route, query: Object.fromEntries(url.searchParams), body }); await pm.state.set(key, state);
 if (req.headers.authorization !== 'Bearer phase2b_mock_key') return send(401, { error: 'Test key required' });
 if (route === '/profiles/' + PROFILE) return send(200, { profile: { _id: PROFILE, externalId: 'tenant-a' } });
 if (route === '/profiles/77a1f0c2a4b9d3e8f1a2b3c4') return send(200, { profile: { _id: '77a1f0c2a4b9d3e8f1a2b3c4', externalId: 'tenant-b' } });
 if (route === '/accounts') return send(200, { accounts: [
  { _id: FB, platform: 'facebook', profileId: PROFILE, isActive: state.scenario !== 'inactive', needsReconnection: state.scenario === 'reconnect' },
  { _id: IG, platform: 'instagram', profileId: PROFILE, isActive: true, ...(state.scenario === 'spoof-login' ? { loginMethod: 'facebook_login' } : {}) },
  { _id: IG_PAGE, platform: 'instagram', profileId: PROFILE, isActive: true, metadata: { loginMethod: 'facebook_login' } },
  { _id: 'whatsapp', platform: 'whatsapp', profileId: PROFILE, isActive: true },
  { _id: 'foreign', platform: 'facebook', profileId: 'foreign-profile', isActive: true },
 ] });
 const accountId = url.searchParams.get('accountId') || body.accountId;
 if (route === '/inbox/conversations/thread-1' && req.method === 'GET') {
  if (state.scenario === 'post-read-error' && state.requests.some(call => call.path.endsWith('/thread-control'))) return send(503, { error: 'Canonical read unavailable', code: 'UPSTREAM_FAILED' });
  return send(200, { data: { id: state.scenario === 'wrong-thread-id' ? 'other-thread' : 'thread-1', accountId: state.scenario === 'foreign-thread' ? 'foreign' : accountId, platform: accountId === FB ? 'facebook' : 'instagram', threadControl: state.scenario === 'unknown-owner' ? undefined : state.owner } });
 }
 const match = route.match(/^\/accounts\/([^/]+)\/(messenger-greeting|messenger-menu|messenger-ice-breakers|instagram-ice-breakers)$/), control = route === '/inbox/conversations/thread-1/thread-control';
 if (!match && !control) return send(501, { error: 'Fixture endpoint not defined' });
 if (match && req.method === 'GET') {
  if (state.scenario === 'malformed-read') return send(200, { data: [{ unexpected: true }] });
  const setting = match[2], entries = state.settings[match[1] + ':' + setting] || [];
  if (state.scenario === 'graph-wrapper') return send(200, { data: [{ [fields[setting]]: entries }] });
  if (state.scenario === 'ig-locale') return send(200, { data: [{ locale: 'default', call_to_actions: [{ question: 'Hours?', payload: 'HOURS' }] }] });
  return send(200, { data: entries });
 }
 if (!['PUT', 'DELETE', 'POST'].includes(req.method)) return send(501, { error: 'Fixture method not defined' });
 if (state.scenario === 'permission-denied') return send(403, { error: 'Missing Meta permission', code: 'permission_error', platform: 'facebook', platformError: { code: 10, message: 'Permission denied' }, details: { requiredPermission: 'pages_messaging' } });
 if (state.scenario === 'rate-limit') { res.setHeader('Retry-After', '60'); return send(429, { error: 'Rate limited', code: 'rate_limit_error' }); }
 if (state.scenario === 'unavailable') return send(503, { error: 'Provider failed', code: 'UPSTREAM_FAILED' });
 if (state.scenario === 'malformed') return send(200, { accepted: true });
 if (state.scenario === 'html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>broken proxy</html>'); }
 if (match) {
  const field = fields[match[2]];
  if (req.method === 'PUT' && (Object.keys(body).join(',') !== field || !Array.isArray(body[field]))) return send(400, { error: 'SDK body required', code: 'invalid_request' });
  if (state.scenario === 'get-started-missing' && match[2] === 'messenger-menu') return send(400, { error: 'Set the Get Started button before a persistent menu', code: 'get_started_required' });
  state.settings[match[1] + ':' + match[2]] = req.method === 'DELETE' ? [] : body[field]; await pm.state.set(key, state);
  return send(200, state.scenario === 'graph-ack' ? { result: 'success' } : { success: true });
 }
 if (body.targetAppId && body.action !== 'pass' || !['pass', 'take', 'release', 'request'].includes(body.action) || body.action === 'pass' && !body.targetAppId) return send(400, { error: 'SDK thread control body required', code: 'invalid_request' });
 if (state.scenario === 'not-primary') return send(403, { error: 'Only the primary receiver may take control', code: 'not_primary_receiver', details: { primaryReceiverAppId: 'another-app' } });
 if (state.scenario === 'malformed-control') return send(200, { success: true, control: { owner: 'ai_agent' } });
 if (body.action === 'pass') { state.owner = 'other'; state.ownerAppId = body.targetAppId; }
 else if (body.action === 'take') { state.owner = state.scenario === 'unchanged-owner' ? 'other' : 'app'; state.ownerAppId = undefined; }
 else if (body.action === 'release') { state.owner = 'other'; state.ownerAppId = undefined; }
 await pm.state.set(key, state);
 return send(200, state.scenario === 'ack-no-control' ? { success: true } : { success: true, control: { owner: state.owner, ...(state.ownerAppId ? { ownerAppId: state.ownerAppId } : {}) } });
}).listen(process.env.PORT);
