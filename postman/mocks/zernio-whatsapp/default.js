// Response contracts: installed @zernio/node generated types, ListInboxConversationsResponse,
// GetInboxConversationResponse, GetInboxConversationMessagesResponse, SendInboxMessageResponse,
// CreateInboxConversationResponse, GetWhatsAppTemplatesResponse, CreateWhatsAppTemplateResponse.
// Control routes are local test infrastructure. No provider credentials are used.
const http = require('http');
const PROFILE = '66a1f0c2a4b9d3e8f1a2b3c4';
const ACCOUNT = '66b1f0c2a4b9d3e8f1a2b3c4';
const CONVERSATION = '66c1f0c2a4b9d3e8f1a2b3c4';
const BROADCAST = '66d1f0c2a4b9d3e8f1a2b3c4';
const stateKey = 'zernio-whatsapp:state';
const seed = () => ({ scenario: 'success', requests: [], intents: {}, broadcast: null, recipients: [], dispatches: 0, messages: [
  { id: 'wamid.inbound', message: 'Customer reply', direction: 'incoming', createdAt: '2026-10-19T10:00:00Z', deliveryStatus: null },
], templates: [
  { id: 'template-approved', name: 'order_update', status: 'APPROVED', language: 'en_US', category: 'UTILITY', components: [{ type: 'BODY', text: 'Order {{1}} updated.' }] },
  { id: 'template-header-link', name: 'order_tracking', status: 'APPROVED', language: 'en', category: 'UTILITY', components: [
    { type: 'HEADER', format: 'TEXT', text: 'Hello {{1}}' },
    { type: 'BODY', text: 'Order {{1}} for {{2}} is ready. Order {{1}}.' },
    { type: 'BUTTONS', buttons: [{ type: 'PHONE_NUMBER', text: 'Call', phone_number: '+14155550100' }, { type: 'URL', text: 'Track', url: 'https://example.invalid/track/{{1}}' }] },
  ] },
  { id: 'template-named', name: 'named_order', status: 'APPROVED', language: 'ar', category: 'UTILITY', components: [{ type: 'BODY', text: 'Hello {{customer_name}}, order {{order_id}} is ready.' }] },
] });
const conversation = () => ({ id: CONVERSATION, platform: 'whatsapp', accountId: ACCOUNT, participantId: '14155550101', participantName: 'Test customer', lastMessage: 'Customer reply', unreadCount: 1, status: 'active', updatedTime: '2026-10-19T10:00:00Z' });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-Id': 'phase1c-provider-request' }); res.end(JSON.stringify(body)); };
  let state = await pm.state.get(stateKey) || seed();
  if (url.pathname === '/__fixture/reset') { state = { ...seed(), scenario: req.body?.scenario || 'success' }; await pm.state.set(stateKey, state); return send(200, { ok: true }); }
  if (url.pathname === '/__fixture/state') return send(200, state);
  if (url.pathname === '/__fixture/scenario') { state.scenario = req.body.scenario; await pm.state.set(stateKey, state); return send(200, { ok: true }); }
  const route = url.pathname.replace(/^\/api\/v1/, '');
  const body = req.body || {};
  state.requests.push({ method: req.method, path: route, query: Object.fromEntries(url.searchParams), body, idempotencyKey: req.headers['idempotency-key'] });
  await pm.state.set(stateKey, state);
  if (req.headers.authorization !== 'Bearer phase1c_mock_key') return send(401, { error: 'Fixture requires test token' });
  if (route === '/accounts' && req.method === 'GET') return send(200, { accounts: [
    { _id: ACCOUNT, profileId: { _id: PROFILE }, platform: 'whatsapp', displayName: 'Test WhatsApp', username: '14155550100', isActive: true },
    { _id: 'foreign-account', profileId: 'foreign-profile', platform: 'whatsapp', isActive: true },
  ] });
  if (route === '/inbox/conversations' && req.method === 'GET') return send(200, { data: [conversation()], pagination: { hasMore: false, nextCursor: null }, meta: { accountsFailed: 0, failedAccounts: [] } });
  if (route === `/inbox/conversations/${CONVERSATION}` && req.method === 'GET') return send(200, { data: { ...conversation(), ...(state.scenario === 'foreign-conversation' ? { accountId: 'foreign-account' } : {}) } });
  if (route === `/inbox/conversations/${CONVERSATION}/messages` && req.method === 'GET') return send(200, { messages: state.messages, pagination: { hasMore: false, nextCursor: null }, sortOrderApplied: 'desc' });
  if (route === '/whatsapp/templates' && req.method === 'GET') return send(200, { success: true, templates: state.templates });
  if (route === '/broadcasts' && req.method === 'GET') return send(200, { broadcasts: state.broadcast ? [state.broadcast] : [] });
  if (route === `/broadcasts/${BROADCAST}` && req.method === 'GET') return send(200, { broadcast: { ...state.broadcast, ...(state.scenario === 'foreign-broadcast' ? { accountId: 'foreign-account' } : {}) } });
  if (req.method === 'POST') {
    if (state.scenario === 'provider-unavailable') return send(503, { error: 'Provider unavailable', code: 'UPSTREAM_FAILED' });
    if (state.scenario === 'window-closed') return send(400, { error: 'An approved template is required outside the service window.', code: 'TEMPLATE_REQUIRED' });
    if (state.scenario === 'template-rejected') return send(400, { error: 'Template is not approved.', code: 'TEMPLATE_NOT_APPROVED' });
    if (state.scenario === 'malformed-send') return send(200, { success: true });
    if (state.scenario === 'timeout') {
      await new Promise(resolve => setTimeout(resolve, 200));
      return send(504, { error: 'Delayed response for client timeout test', code: 'TIMEOUT' });
    }
    if (route.startsWith('/broadcasts')) {
      const key = req.headers['idempotency-key'];
      const signature = JSON.stringify({ route, body });
      if (key && state.intents[key]) {
        if (state.intents[key].body !== signature) return send(409, { error: 'Idempotency conflict', code: 'IDEMPOTENCY_CONFLICT' });
        return send(200, state.intents[key].result);
      }
      let result;
      if (route === '/broadcasts') {
        if (body.profileId !== PROFILE || body.accountId !== ACCOUNT || body.platform !== 'whatsapp') return send(403, { error: 'Wrong broadcast owner' });
        state.broadcast = { id: BROADCAST, profileId: PROFILE, accountId: ACCOUNT, platform: 'whatsapp', name: body.name, status: 'draft', template: body.template, recipientCount: 0 };
        result = { success: true, broadcast: state.broadcast };
      } else if (route === `/broadcasts/${BROADCAST}/recipients`) {
        if (body.useSegment !== false || !Array.isArray(body.phones)) return send(400, { error: 'Expected explicit recipients' });
        const added = body.phones.filter(phone => !state.recipients.includes(phone));
        state.recipients.push(...added); state.broadcast.recipientCount = state.recipients.length;
        result = { added: added.length, skipped: body.phones.length - added.length };
      } else if (route === `/broadcasts/${BROADCAST}/send`) {
        if (!state.recipients.length || state.broadcast.status !== 'draft') return send(400, { error: 'Broadcast cannot be dispatched' });
        state.broadcast.status = 'sending'; state.dispatches++;
        result = { status: 'sending', sent: 0, failed: 0, recipientCount: state.recipients.length };
      }
      if (result) {
        if (key) state.intents[key] = { body: signature, result };
        await pm.state.set(stateKey, state); return send(200, result);
      }
    }
    if (route === '/whatsapp/templates') {
      const template = { id: 'template-created', name: body.name, language: body.language, category: body.category, status: 'PENDING', components: body.components };
      state.templates.push(template); await pm.state.set(stateKey, state); return send(200, { success: true, template });
    }
    if (route === `/inbox/conversations/${CONVERSATION}/read`) return send(200, { success: true });
    if (route === '/inbox/conversations' || route === `/inbox/conversations/${CONVERSATION}/messages`) {
      if (body.accountId !== ACCOUNT) return send(403, { error: 'Wrong account', code: 'account_not_found' });
      if (route.endsWith('/messages') && !body.message && !body.attachmentUrl && !body.template?.elements?.length) return send(400, { error: 'Invalid inbox send body', code: 'invalid_content' });
      const key = req.headers['idempotency-key'];
      if (key && state.intents[key]) {
        if (state.intents[key].body !== JSON.stringify(body)) return send(409, { error: 'Idempotency conflict', code: 'IDEMPOTENCY_CONFLICT' });
        return send(200, state.intents[key].result);
      }
      const messageId = `wamid.sent-${state.messages.length}`;
      const result = { success: true, data: { messageId, conversationId: CONVERSATION } };
      state.messages.push({ id: messageId, message: body.message || '[Template]', direction: 'outgoing', createdAt: '2026-10-19T10:01:00Z', deliveryStatus: 'sent', ...(body.attachmentUrl ? { attachments: [{ url: body.attachmentUrl, type: body.attachmentType }] } : {}) });
      if (key) state.intents[key] = { result, body: JSON.stringify(body) };
      await pm.state.set(stateKey, state); return send(200, result);
    }
  }
  return send(501, { error: 'Operation is outside this contract fixture.' });
}).listen(process.env.PORT);
