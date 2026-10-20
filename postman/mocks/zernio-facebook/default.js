// Grounded in installed @zernio/node PostCreate/Get/Update/Delete/RetryResponse,
// AccountsListResponse, QueueSlotsResponse and GetMediaPresignedUrlResponse;
// Desktop zernio.txt publishing, queue and core-connect guides. No live credentials.
const http = require('http');
const PROFILE = '66a1f0c2a4b9d3e8f1a2b3c4', ACCOUNT = '66b1f0c2a4b9d3e8f1a2b3c4';
const OTHER_PROFILE = '77a1f0c2a4b9d3e8f1a2b3c4', OTHER_ACCOUNT = '77b1f0c2a4b9d3e8f1a2b3c4';
const stateKey = 'zernio-facebook:state';
const seed = () => ({ scenario: 'success', requests: [], posts: [], intents: {}, disconnected: [], queues: [] });
http.createServer(async (req, res) => {
 const url = new URL(req.url, 'http://localhost'), body = req.body || {};
 const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-Id': 'phase1d-provider-request' }); res.end(JSON.stringify(data)); };
 let state = await pm.state.get(stateKey) || seed();
 if (url.pathname === '/__fixture/reset') { state = { ...seed(), scenario: body.scenario || 'success' }; await pm.state.set(stateKey, state); return send(200, { ok: true }); }
 if (url.pathname === '/__fixture/state') return send(200, state);
 if (url.pathname === '/__fixture/scenario') { state.scenario = body.scenario; await pm.state.set(stateKey, state); return send(200, { ok: true }); }
 const route = url.pathname.replace(/^\/api\/v1/, ''), key = req.headers['idempotency-key'];
 state.requests.push({ method: req.method, path: route, query: Object.fromEntries(url.searchParams), body, idempotencyKey: key });
 await pm.state.set(stateKey, state);
 if (req.headers.authorization !== 'Bearer phase1d_mock_key') return send(401, { error: 'Fixture test token required' });
 const accounts = [{ _id: ACCOUNT, profileId: { _id: PROFILE }, platform: 'facebook', platformUserId: 'page-123', username: 'TestPage', displayName: 'Test Facebook Page', isActive: true }, { _id: OTHER_ACCOUNT, profileId: OTHER_PROFILE, platform: 'facebook', isActive: true }].filter(a => !state.disconnected.includes(a._id));
 if (route.startsWith('/profiles/') && req.method === 'GET') { const other = route.endsWith(OTHER_PROFILE); return send(200, { profile: { _id: other ? OTHER_PROFILE : PROFILE, externalId: other ? 'tenant-b' : 'tenant-a' } }); }
 if (route === '/accounts' && req.method === 'GET') return send(200, { accounts });
 if (route === '/accounts/health') return send(200, { accounts: accounts.filter(a => (typeof a.profileId === 'string' ? a.profileId : a.profileId._id) === url.searchParams.get('profileId')).map(a => ({ ...a, status: 'healthy' })), summary: { total: 1, healthy: 1, error: 0 } });
 if (route.startsWith('/accounts/') && req.method === 'DELETE') { state.disconnected.push(route.split('/')[2]); await pm.state.set(stateKey, state); return send(200, { message: 'Disconnected' }); }
 if (route === '/media/presign') return send(200, { uploadUrl: 'https://storage.example.invalid/put', publicUrl: 'https://storage.example.invalid/image.png', key: 'fixture-media', expiresIn: 3600 });
 if (route === '/queue/slots') {
  if (req.method === 'GET') return send(200, { queues: state.queues });
  const schedule = { ...body, _id: '66d1f0c2a4b9d3e8f1a2b3c4', active: true, isDefault: true }; state.queues.push(schedule); await pm.state.set(stateKey, state); return send(201, { success: true, schedule, nextSlots: ['2099-01-01T09:00:00Z'] });
 }
 const postId = route.split('/')[2], existing = state.posts.find(post => post._id === postId);
 const exposed = post => state.scenario === 'foreign-post' ? { ...post, platforms: [{ platform: 'facebook', accountId: OTHER_ACCOUNT, status: 'pending' }] } : post;
 if (route === '/posts' && req.method === 'GET') {
  const owned = state.posts.filter(post => post.platforms.every(p => p.accountId === (url.searchParams.get('profileId') === OTHER_PROFILE ? OTHER_ACCOUNT : ACCOUNT)));
  return send(200, { posts: owned.map(exposed), pagination: { page: 1, limit: 50, total: owned.length, pages: 1 } });
 }
 if (route.startsWith('/posts/') && !existing) return send(404, { error: 'Post not found', type: 'not_found' });
 if (req.method === 'GET' && existing) return send(200, { post: exposed(existing) });
 if (req.method === 'DELETE' && existing) { state.posts = state.posts.filter(post => post._id !== postId); await pm.state.set(stateKey, state); return send(200, { message: 'Post deleted from Zernio' }); }
 if (['POST', 'PUT'].includes(req.method)) {
  if (state.scenario === 'provider-unavailable') return send(503, { error: 'Upstream unavailable', code: 'UPSTREAM_FAILED' });
  if (state.scenario === 'malformed') return send(201, { message: 'No post identity' });
  if (route === '/posts' && key && state.intents[key]) return send(200, state.intents[key]); // create idempotency returns original even if body differs
  let post;
  if (route === '/posts') post = { ...body, _id: (state.posts.length + 1).toString(16).padStart(24, '0'), createdAt: '2026-10-19T10:00:00Z' };
  else if (existing) post = { ...existing, ...body };
  else return send(501, { error: 'Fixture endpoint not defined' });
  const retry = route.endsWith('/retry');
  post.status = retry ? 'published' : post.isDraft ? 'draft' : body.publishNow ? (state.scenario === 'failed' ? 'failed' : 'partial') : post.scheduledFor || post.queuedFromProfile ? 'scheduled' : 'draft';
  post.platforms = post.platforms.map(p => ({ ...p, status: post.status === 'published' ? 'published' : post.status === 'failed' ? 'failed' : 'pending', ...(retry ? { platformPostUrl: 'https://facebook.com/page/posts/provider-123' } : {}) }));
  state.posts = state.posts.filter(p => p._id !== post._id); state.posts.push(post);
  const result = { message: 'Provider post saved', post, ...(post.status === 'partial' || post.status === 'failed' ? { platformResults: post.platforms.map(p => ({ platform: p.platform, status: p.status, error: p.status === 'failed' ? 'Meta rejected' : null })) } : {}) };
  if (route === '/posts' && key) state.intents[key] = result;
  await pm.state.set(stateKey, state); return send(post.status === 'partial' || post.status === 'failed' ? 207 : req.method === 'PUT' || retry ? 200 : 201, result);
 }
 return send(501, { error: 'Fixture endpoint not defined' });
}).listen(process.env.PORT);
