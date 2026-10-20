// Local contracts derived from @zernio/node generated SDK comments endpoints.
// Only public replies model documented 24h successful-response replay.
const http = require('http');
const PROFILE = '66a1f0c2a4b9d3e8f1a2b3c4', ACCOUNT = '66b1f0c2a4b9d3e8f1a2b3c4', IG = '66b1f0c2a4b9d3e8f1a2b3c5';
const key = 'phase2b-comments:state';
const seed = () => ({ scenario: 'success', requests: [], intents: {}, mutations: [], hidden: false });
http.createServer(async (req, res) => {
 const url = new URL(req.url, 'http://localhost'), body = req.body || {}, send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-Id': 'fixture-comments-request' }); res.end(JSON.stringify(data)); };
 let state = await pm.state.get(key) || seed();
 if (url.pathname === '/__fixture/reset') { state = { ...seed(), scenario: body.scenario || 'success' }; await pm.state.set(key, state); return send(200, { ok: true }); }
 if (url.pathname === '/__fixture/state') return send(200, state);
 const route = url.pathname.replace(/^\/api\/v1/, ''); state.requests.push({ method: req.method, path: route, query: Object.fromEntries(url.searchParams), body, idempotencyKey: req.headers['idempotency-key'] }); await pm.state.set(key, state);
 if (req.headers.authorization !== 'Bearer phase2b_mock_key') return send(401, { error: 'Test key required' });
 if (route === '/profiles/' + PROFILE) return send(200, { profile: { _id: PROFILE, externalId: 'tenant-a' } });
 if (route === '/profiles/77a1f0c2a4b9d3e8f1a2b3c4') return send(200, { profile: { _id: '77a1f0c2a4b9d3e8f1a2b3c4', externalId: 'tenant-b' } });
 if (route === '/accounts') return send(200, { accounts: [{ _id: ACCOUNT, platform: 'facebook', profileId: PROFILE, isActive: state.scenario !== 'inactive', username: 'owned-page' }, { _id: IG, platform: 'instagram', profileId: PROFILE, isActive: true, metadata: { loginMethod: 'facebook_login' } }, { _id: 'foreign', platform: 'facebook', profileId: 'foreign-profile', isActive: true }] });
 const accountId = url.searchParams.get('accountId') || body.accountId, platform = accountId === IG ? 'instagram' : 'facebook';
 const post = { id: 'owned-post', accountId, platform, content: 'Owned business post', picture: null, permalink: 'https://example.invalid/post', commentCount: 1, createdTime: '2026-10-18T12:00:00Z' };
 const comment = { id: 'customer-comment', message: 'Customer question', platform, createdTime: state.scenario === 'expired' ? '2000-01-01T00:00:00Z' : new Date().toISOString(), from: { id: 'customer', name: 'Customer', isOwner: false }, canReply: state.scenario !== 'cannot-reply', canHide: true, canDelete: true, isHidden: state.hidden, replies: [], replyCount: 0 };
 if (route === '/inbox/comments') {
  if (state.scenario === 'foreign-post-list') post.accountId = 'foreign';
  if (state.scenario === 'failed-post-list') return send(207, { data: [], pagination: { hasMore: false, nextCursor: null }, meta: { accountsFailed: 1, failedAccounts: [{ accountId, platform, code: 'TOKEN_EXPIRED', error: 'Reconnect' }] } });
  if (state.scenario === 'pages-forever') return send(200, { data: [], pagination: { hasMore: true, nextCursor: String(Number(url.searchParams.get('cursor') || 0) + 1) } });
  if (state.scenario === 'empty-first-page' && !url.searchParams.get('cursor')) return send(200, { data: [], pagination: { hasMore: true, nextCursor: 'page-2' } });
  return send(207, { data: [post], pagination: { hasMore: false, nextCursor: null }, meta: { accountsQueried: 1, accountsFailed: state.scenario === 'partial' ? 1 : 0, failedAccounts: state.scenario === 'partial' ? [{ accountId, platform, code: 'TOKEN_EXPIRED', error: 'Reconnect', retryAfter: null }] : [], accountsSkipped: [] } });
 }
 const target = route.match(/^\/inbox\/comments\/([^/]+)(?:\/([^/]+)\/(hide|private-reply))?$/);
 if (!target) return send(501, { error: 'Fixture endpoint not defined' });
 const postId = decodeURIComponent(target[1]), focused = url.searchParams.get('commentId');
 if (req.method === 'GET') {
  const result = { status: 'success', comments: state.scenario === 'missing-comment' || (state.hidden && platform === 'instagram') ? [] : [comment], post: { id: postId, text: 'Post preview', permalink: null, thumbnailUrl: null, mediaUrl: null, mediaType: null, productType: null, createdAt: null }, pagination: { hasMore: false }, meta: { platform, accountId, postId } };
  if (state.scenario === 'foreign-comment-meta') result.meta.accountId = 'foreign';
  if (state.scenario === 'wrong-post-meta') result.meta.postId = 'foreign-post';
  if (state.scenario === 'foreign-nested-parent') comment.replies = [{ id: 'foreign-nested-reply', parentId: 'foreign-comment', platform }];
  if (state.scenario === 'reply-pages') { comment.replyCount = 12; comment.repliesHasMore = true; comment.replies = [{ id: 'inline-reply', parentId: comment.id, platform }]; }
  if (focused) { result.comment = { id: focused, message: 'Focus may read foreign comment', platform }; result.comments = focused === 'customer-comment' ? [{ id: 'paged-reply', parentId: focused, platform, createdTime: comment.createdTime, canReply: true }] : []; }
  if (state.scenario === 'wrong-focus' && focused) result.comment.id = 'foreign-comment';
  return send(200, result);
 }
 const isPrivate = target[3] === 'private-reply';
 if (state.scenario === 'permission-denied') return send(403, { error: 'Missing permission', type: 'permission_error', code: 'META_PERMISSION', platform, platformError: { code: 10 }, details: { needed: 'manage_comments' } });
 if (state.scenario === 'rate-limit' && (isPrivate || state.requests.filter(r => r.method === 'POST').length < 3)) { res.setHeader('Retry-After', '1'); return send(429, { error: 'Rate limited', code: 'rate_limit_error', platform }); }
 if (state.scenario === 'consumed') return send(400, { error: 'Private reply already spent', code: 'PRIVATE_REPLY_CONSUMED', details: { privateReplyConsumed: true }, platformError: { code: 2, error_subcode: 1545133 }, platform });
 if (state.scenario === 'consumed429') { res.setHeader('Retry-After', '1'); return send(429, { error: 'Private reply consumed', details: { privateReplyConsumed: true }, platform }); }
 if (state.scenario === 'unknown') return send(502, { error: 'Meta answered server error', code: 'META_UNKNOWN', details: { privateReplyOutcome: 'unknown' }, platform, platformError: { code: 2 } });
 if (state.scenario === 'unknown-html') { res.writeHead(502, { 'Content-Type': 'text/html' }); return res.end('<html>Upstream interrupted</html>'); }
 if (state.scenario === 'malformed') return send(200, { success: true });
 if (isPrivate) { state.mutations.push({ operation: 'private', accountId, postId, commentId: decodeURIComponent(target[2]), message: body.message }); await pm.state.set(key, state); return send(200, { status: 'success', messageId: 'private-provider-1', commentId: decodeURIComponent(target[2]), platform }); }
 if (target[3] === 'hide') { state.hidden = req.method === 'POST'; state.mutations.push({ operation: state.hidden ? 'hide' : 'unhide' }); await pm.state.set(key, state); return send(200, { status: 'success', commentId: decodeURIComponent(target[2]), hidden: state.hidden, platform }); }
 if (req.method === 'DELETE') { state.mutations.push({ operation: 'delete', postId, commentId: focused }); await pm.state.set(key, state); return send(200, { success: true, data: { message: 'Comment deleted' } }); }
 if (req.method === 'POST') {
  const intent = req.headers['idempotency-key'], encodedBody = JSON.stringify(body), previous = state.intents[intent];
  if (previous) return previous.body === encodedBody ? send(200, previous.result) : send(422, { error: 'Same key different body', code: 'idempotency_mismatch' });
  state.mutations.push({ operation: 'reply', message: body.message, postId, commentId: body.commentId });
  const result = { success: true, data: { commentId: 'provider-reply-' + state.mutations.length, isReply: true } }; state.intents[intent] = { body: encodedBody, result }; await pm.state.set(key, state); return send(200, result);
 }
 send(501, { error: 'Fixture endpoint not defined' });
}).listen(process.env.PORT);
