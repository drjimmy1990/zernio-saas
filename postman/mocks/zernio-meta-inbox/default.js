// SDK ListInboxConversations/GetInboxConversation/GetInboxConversationMessages/SendInboxMessage/AcceptConversationRequest contracts.
const http = require('http');
const PROFILE = '66a1f0c2a4b9d3e8f1a2b3c4', ACCOUNT = '66b1f0c2a4b9d3e8f1a2b3c4', IG = '66b1f0c2a4b9d3e8f1a2b3c5';
const key = 'zernio-meta-inbox:state';
const seed = () => ({ scenario: 'success', requests: [], messages: [{ id: 'customer-1', message: 'Hello', direction: 'incoming', createdAt: '2026-10-19T10:00:00Z' }], intents: {} });
http.createServer(async (req, res) => {
 const url = new URL(req.url, 'http://localhost'), body = req.body || {}, send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
 let state = await pm.state.get(key) || seed();
 if (url.pathname === '/__fixture/reset') { state = { ...seed(), scenario: body.scenario || 'success' }; await pm.state.set(key, state); return send(200, { ok: true }); }
 if (url.pathname === '/__fixture/state') return send(200, state);
 const route = url.pathname.replace(/^\/api\/v1/, ''); state.requests.push({ method: req.method, path: route, query: Object.fromEntries(url.searchParams), body, idempotencyKey: req.headers['idempotency-key'] }); await pm.state.set(key, state);
 if (req.headers.authorization !== 'Bearer phase2a_mock_key') return send(401, { error: 'Test key required' });
 if (route === '/profiles/' + PROFILE) return send(200, { profile: { _id: PROFILE, externalId: 'tenant-a' } });
 if (route === '/accounts') return send(200, { accounts: [{ _id: ACCOUNT, platform: 'facebook', profileId: PROFILE, isActive: state.scenario !== 'inactive' }, { _id: IG, platform: 'instagram', profileId: PROFILE, isActive: true }, { _id: 'foreign', platform: 'facebook', profileId: 'foreign-profile', isActive: true }] });
 const accountId = url.searchParams.get('accountId') || body.accountId, platform = accountId === IG ? 'instagram' : 'facebook';
 const conversation = { id: 'opaque-thread-1', accountId: state.scenario === 'foreign-thread' ? 'foreign' : accountId, platform, participantName: 'Customer', folder: 'inbox', threadControl: state.scenario === 'other-owner' ? 'other' : 'app', updatedTime: '2000-01-01T00:00:00Z' };
 if (route === '/inbox/conversations') {
  if (platform === 'instagram' && url.searchParams.get('folder') === 'requests') return send(400, { error: 'Instagram Login does not expose message requests', code: 'PLATFORM_LIMITATION' });
  return send(200, { data: [conversation], pagination: { hasMore: false, nextCursor: null }, meta: { accountsFailed: 0, failedAccounts: [] } });
 }
 if (route === '/inbox/conversations/opaque-thread-1' && req.method === 'GET') return send(200, { data: conversation });
 if (route.endsWith('/messages') && req.method === 'GET') return send(200, { messages: state.messages, pagination: { hasMore: false, nextCursor: null }, sortOrderApplied: 'desc' });
 if (route.endsWith('/read')) return send(200, { success: true, markedCount: 1 });
 if (req.method === 'POST') {
  if (state.scenario === 'permission-denied') return send(403, { error: 'Missing Meta permission', code: 'permission_error' });
  if (state.scenario === 'rate-limit' && state.requests.filter(r => r.method === 'POST').length < 3) {
   res.setHeader('Retry-After', '1'); return send(429, { error: 'Rate limited', code: 'rate_limit_error' });
  }
  if (state.scenario === 'window-closed') return send(400, { error: '24-hour messaging window closed', code: 'MESSAGING_WINDOW_CLOSED' });
  if (state.scenario === 'unavailable') return send(503, { error: 'Upstream failed', code: 'UPSTREAM_FAILED' });
  if (state.scenario === 'malformed') return send(200, { success: true });
  const intent = req.headers['idempotency-key']; if (state.intents[intent]) return send(200, state.intents[intent]);
  const message = { id: 'meta-' + state.messages.length, message: body.message, direction: 'outgoing', createdAt: '2026-10-19T10:01:00Z' }; state.messages.push(message);
  const result = { success: true, data: { messageId: message.id, conversationId: 'stored-different-id',
   ...(state.scenario === 'partial-media' ? { messageIds: [message.id], partialFailure: { part: 'text', error: 'Meta rejected follow-up text', platformError: { code: 10, message: 'Permission denied' } } } : {}) } }; state.intents[intent] = result; await pm.state.set(key, state); return send(200, result);
 }
 send(501, { error: 'Fixture endpoint not defined' });
}).listen(process.env.PORT);
