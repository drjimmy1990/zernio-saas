import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/app/api/webhooks/zernio/route.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const secret = 'whsec_isolated_test_signature_secret';
const sign = (raw, key = secret) => crypto.createHmac('sha256', key).update(raw).digest('hex');
const envelope = (event, extra = {}) => ({
  id: `event-${event}`, event, timestamp: '2026-10-19T12:00:00Z',
  profiles: [{ id: 'profile-a', externalId: 'tenant-a' }], ...extra,
});
const account = { accountId: 'account-a', profileId: 'profile-a', platform: 'whatsapp', username: 'Account A' };

function sandbox(configuredSecret = secret, options = {}) {
  const workspaces = new Map();
  const databaseCalls = [];
  const counts = { reads: 0, saves: 0, database: 0, fanout: 0, network: 0 };
  const getWorkspace = (tenantId) => {
    counts.reads++;
    if (!workspaces.has(tenantId)) workspaces.set(tenantId, {
      idempotencyStore: {}, connectedAccounts: [], posts: [], inboxConversations: [],
      inboxComments: [], inboxReviews: [], contacts: [], callHistory: [], campaigns: [],
      adLeads: [], whatsappTemplates: [], verifyRequests: [], commerceProducts: [], apiLogs: [],
    });
    return workspaces.get(tenantId);
  };
  const exports = {};
  const accepted = new Set();
  const supabase = { rpc: (name, args) => ({ abortSignal: async () => {
    databaseCalls.push({ table: name, operation: 'rpc', value: args });
    if (options.persistenceError) return { data: null, error: { message: 'Failed' } };
    const key = args.p_organization_id + ':' + args.p_payload.id;
    const deduplicated = accepted.has(key); accepted.add(key);
    return { data: { deduplicated }, error: null };
  } }), from: (table) => {
    const filters = {};
    const call = { table, filters };
    databaseCalls.push(call);
    const chain = {
      select: () => chain,
      abortSignal: () => chain,
      eq: (key, value) => { filters[key] = value; return chain; },
      insert: (value) => { call.operation = 'insert'; call.value = value; return chain; },
      upsert: (value) => { call.operation = 'upsert'; call.value = value; return chain; },
      update: (value) => { call.operation = 'update'; call.value = value; return chain; },
      maybeSingle: async () => {
        if (table !== 'organizations') return { data: null, error: null };
        if (options.throwDatabaseError) throw new Error('Isolated database failure');
        const organization = Object.hasOwn(options, 'organization') ? options.organization : { id: 'tenant-a', zernio_profile_id: 'profile-a' };
        return { data: organization, error: options.databaseError ? { message: 'Isolated database failure' } : null };
      },
      single: async () => ({ data: { id: 'conversation-row-a' }, error: null }),
      then: (resolve) => Promise.resolve({ data: null, error: null }).then(resolve),
    };
    return chain;
  } };
  const denied = () => { counts.network++; throw new Error('Network denied in webhook tests'); };
  const context = vm.createContext({
    Buffer, Date, console, AbortSignal, fetch: denied,
    process: { env: { NODE_ENV: 'production', ZERNIO_WEBHOOK_SECRET: configuredSecret, SUPABASE_SERVICE_ROLE_KEY: options.noServiceKey ? undefined : 'isolated-fixture' } },
  });
  const require = (name) => {
    if (name === 'crypto') return crypto;
    if (name === 'next/server') return { NextResponse: { json: (value, init) => Response.json(value, init) } };
    if (name === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => { counts.database++; return options.noSupabase ? null : supabase; } };
    if (name === '@/lib/storage/workspace-store') return { WorkspaceStore: {
      getWorkspace,
      saveWorkspace: (id, ws) => { counts.saves++; workspaces.set(id, ws); },
      dispatchCustomerWebhook: async () => { counts.fanout++; return []; },
    } };
    throw new Error(`Module denied in webhook tests: ${name}`);
  };
  vm.runInContext(`(function(require, exports) {\n${source}\n})`, context)(require, exports);
  const send = async (payload, signature) => {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const headers = signature === null ? {} : { 'X-Zernio-Signature': signature ?? sign(raw) };
    const response = await exports.POST(new Request('https://isolated.invalid/webhooks/zernio', { method: 'POST', headers, body: raw }));
    return { status: response.status, body: await response.json() };
  };
  return { counts, databaseCalls, workspaces, getWorkspace, send };
}

test('missing, empty and placeholder signing configuration fails closed', async () => {
  for (const configuration of [null, '', '   ', 'whsec_your_zernio_hmac_sha256_secret', ' whsec_your_placeholder ']) {
    const s = sandbox(configuration);
    assert.equal((await s.send(envelope('account.connected', { account }))).status, 503);
    assert.deepEqual(s.counts, { reads: 0, saves: 0, database: 0, fanout: 0, network: 0 });
  }
});

test('signature must match the exact raw body and strict hex format', async () => {
  const s = sandbox();
  const payload = envelope('account.connected', { account });
  const raw = JSON.stringify(payload, null, 2);
  const signature = sign(raw);
  for (const invalid of [null, '', '0'.repeat(64), signature.slice(1), `${signature}0`, `sha256=${signature}`, signature.toUpperCase(), sign(raw, 'wrong-secret')]) {
    assert.equal((await s.send(raw, invalid)).status, 400);
  }
  assert.equal((await s.send(JSON.stringify(payload), signature)).status, 400);
  assert.deepEqual(s.counts, { reads: 0, saves: 0, database: 0, fanout: 0, network: 0 });
  assert.equal((await s.send(raw, signature)).status, 200);
  assert.equal(s.workspaces.get('tenant-a').connectedAccounts[0].accountId, 'account-a');
});

test('signed invalid JSON and malformed envelopes fail without effects', async () => {
  const s = sandbox();
  const malformed = ['{', 'null', '[]', '1', '"string"', '{}',
    { id: '', event: 'account.connected' }, { id: 'event', event: 42 },
    envelope('account.connected', { profiles: null }), envelope('account.connected', { profiles: {} }),
    envelope('account.connected', { profiles: [null] }), envelope('account.connected', { profiles: [{ id: 'profile', externalId: {} }] }),
    envelope('account.connected', { profiles: [{ id: 42, externalId: 'tenant' }] }),
    envelope('account.connected', { profiles: [{ id: 'profile' }] }), envelope('account.connected', { timestamp: 'invalid' }),
    envelope('account.connected', { test: 'true' }), envelope('account.connected', { account: {} }),
    envelope('message.received', { message: {} }), envelope('message.received', { message: null }),
  ];
  for (const payload of malformed) assert.equal((await s.send(payload)).status, 400);
  assert.deepEqual(s.counts, { reads: 0, saves: 0, database: 0, fanout: 0, network: 0 });
});

test('signed webhook.test and sample events acknowledge without state, dedup or fanout', async () => {
  const s = sandbox();
  const samples = [
    { id: 'test-event', event: 'webhook.test', message: 'This is a test webhook from Zernio' },
    envelope('account.connected', { test: true, account }),
    envelope('message.received', { test: true, account, message: { id: 'sample-message', conversationId: 'sample-conversation', platform: 'whatsapp' } }),
    envelope('whatsapp.template.status_updated', { test: true, account, template: { templateId: 'sample-template', name: 'sample', language: 'en_US', status: 'APPROVED' } }),
  ];
  for (const payload of samples) {
    const response = await s.send(payload);
    assert.equal(response.status, 200);
    assert.equal(response.body.test, true);
  }
  assert.deepEqual(s.counts, { reads: 0, saves: 0, database: 0, fanout: 0, network: 0 });
  assert.equal((await s.send(samples[0], null)).status, 400);
});

test('legitimate account and message deliveries route once and preserve event deduplication', async () => {
  const s = sandbox();
  const connected = envelope('account.connected', { account });
  assert.equal((await s.send(connected)).status, 200);
  assert.equal((await s.send(connected)).body.deduplicated, true);
  const received = envelope('message.received', { account, conversation: { id: 'conversation-a' }, message: { id: 'message-a', conversationId: 'conversation-a', platform: 'whatsapp', text: 'Incoming message', sender: { id: 'customer-a', name: 'Customer A' } } });
  assert.equal((await s.send(received)).status, 200);
  assert.equal((await s.send(received)).body.deduplicated, true);
  const ws = s.workspaces.get('tenant-a');
  assert.equal(ws.connectedAccounts.length, 1);
  assert.equal(ws.inboxConversations.length, 0);
  assert.equal(s.counts.saves, 1);
  assert.equal(s.counts.fanout, 0);
  assert.equal(s.counts.network, 0);
  const mapping = s.databaseCalls.find((call) => call.table === 'organizations');
  assert.deepEqual(mapping.filters, { id: 'tenant-a', zernio_profile_id: 'profile-a' });
  assert.ok(s.databaseCalls.some((call) => call.table === 'accept_zernio_webhook' && call.operation === 'rpc'));
});

test('signed foreign, missing and inconsistent tenant mappings cannot create workspace state', async () => {
  for (const [extra, options] of [
    [{ profiles: [{ id: 'profile-b', externalId: 'tenant-a' }], account: { ...account, profileId: 'profile-b' } }, {}],
    [{ profiles: [{ id: 'profile-a', externalId: 'tenant-b' }] }, {}],
    [{}, { organization: null }],
    [{}, { organization: { id: 'tenant-b', zernio_profile_id: 'profile-a' } }],
    [{}, { organization: { id: 'tenant-a', zernio_profile_id: 'profile-b' } }],
    [{ profiles: [{ id: 'profile-a', externalId: null }] }, {}],
    [{ account: { ...account, profileId: 'profile-b' } }, {}],
    [{ account: { ...account, profileId: null } }, {}],
    [{ account: { ...account, id: 'another-account' } }, {}],
  ]) {
    const s = sandbox(secret, options);
    const response = await s.send(envelope('account.connected', { account, ...extra }));
    assert.equal(response.status, 409);
    assert.equal(s.workspaces.size, 0);
    assert.equal(s.counts.reads + s.counts.saves + s.counts.fanout + s.counts.network, 0);
    assert.ok(s.databaseCalls.every((call) => call.table === 'organizations' && !call.operation));
  }
});

test('unavailable database and mapping lookup errors fail closed before dedup and mutations', async () => {
  for (const options of [{ noSupabase: true }, { databaseError: true }, { throwDatabaseError: true }]) {
    const s = sandbox(secret, options);
    assert.equal((await s.send(envelope('account.connected', { account }))).status, 503);
    assert.equal(s.workspaces.size, 0);
    assert.equal(s.counts.reads + s.counts.saves + s.counts.fanout + s.counts.network, 0);
    assert.ok(s.databaseCalls.every((call) => call.table === 'organizations' && !call.operation));
  }
});

test('signed global events are ignored and multi-profile events never leak into a tenant', async () => {
  const s = sandbox();
  for (const profiles of [undefined, []]) {
    const response = await s.send({ id: 'global-event', event: 'api.changelog.published', profiles });
    assert.equal(response.status, 200);
    assert.equal(response.body.ignored, true);
  }
  for (const profiles of [
    [{ id: 'profile-a', externalId: 'tenant-a' }, { id: 'profile-b', externalId: 'tenant-b' }],
    [{ id: 'profile-a', externalId: 'tenant-a' }, { id: 'another-profile', externalId: 'tenant-a' }],
  ]) assert.equal((await s.send(envelope('post.published', { profiles, post: { id: 'post-a' } }))).status, 409);
  assert.equal((await s.send(envelope('account.connected', { profiles: undefined, account }))).status, 409);
  assert.deepEqual(s.counts, { reads: 0, saves: 0, database: 0, fanout: 0, network: 0 });
  assert.deepEqual(s.databaseCalls, []);
});

test('documented template payload updates only its account and template identity', async () => {
  const s = sandbox();
  const ws = s.getWorkspace('tenant-a');
  ws.whatsappTemplates = [
    { id: 'template-a', accountId: 'account-b', name: 'same_name', language: 'en_US', status: 'PENDING', category: 'UTILITY' },
    { id: 'local-a', accountId: 'account-a', name: 'same_name', language: 'ar', status: 'PENDING', category: 'UTILITY' },
    { id: 'local-b', accountId: 'account-a', name: 'same_name', language: 'en_US', status: 'PENDING', category: 'UTILITY' },
  ];
  const template = { templateId: 'template-a', name: 'same_name', language: 'en_US', status: 'REJECTED', reason: 'Invalid template' };
  assert.equal((await s.send(envelope('whatsapp.template.status_updated', { account, template }))).status, 200);
  assert.deepEqual(ws.whatsappTemplates.map((t) => t.status), ['PENDING', 'PENDING', 'PENDING']);
  assert.equal((await s.send(envelope('whatsapp.template.category_updated', { account, template: { ...template, status: undefined, category: 'MARKETING', changeType: 'applied' } }))).status, 200);
  assert.deepEqual(ws.whatsappTemplates.map((t) => t.category), ['UTILITY', 'UTILITY', 'UTILITY']);
  const before = JSON.stringify(ws.whatsappTemplates);
  assert.equal((await s.send(envelope('whatsapp.template.status_updated', { account: { ...account, accountId: 'unknown-account' }, template, id: 'unknown-account-event' }))).status, 200);
  assert.equal(JSON.stringify(ws.whatsappTemplates), before);
  assert.equal((await s.send(envelope('whatsapp.template.status_updated', { account, whatsapp: { templateId: 'template-a', templateName: 'same_name', status: 'APPROVED' } }))).status, 400);
  assert.equal(JSON.stringify(ws.whatsappTemplates), before);
  assert.equal(s.counts.network, 0);
});

test('database persistence failure does not poison event retry or dispatch customers', async () => {
  const options = { persistenceError: true };
  const s = sandbox(secret, options);
  const payload = envelope('message.sent', { account, conversation: { id: 'conversation-a' }, message: {
    id: 'message-a', conversationId: 'conversation-a', platform: 'whatsapp', direction: 'outgoing',
    sentAt: '2026-10-19T12:00:00Z', text: 'outgoing',
  } });
  assert.equal((await s.send(payload)).status, 503);
  options.persistenceError = false;
  assert.equal((await s.send(payload)).body.deduplicated, undefined);
  assert.equal((await s.send(payload)).body.deduplicated, true);
  assert.equal(s.counts.fanout, 0);
  assert.equal(s.counts.saves, 0);
});

test('missing service role fails closed before tenant database lookup', async () => {
 const s = sandbox(secret, { noServiceKey: true });
 assert.equal((await s.send(envelope('account.connected', { account }))).status, 503);
 assert.equal(s.counts.database, 0);
});

test('Meta handover uses documented control fields and preserves them in the durable transaction', async () => {
  const s = sandbox();
  const payload = envelope('conversation.control_changed', { account: { ...account, platform: 'instagram' }, conversation: { id: 'thread-a' },
    control: { owner: 'other', previousOwner: 'app', ownerAppId: '263902037430900', metadata: 'Free-form provider note' }, changedAt: '2026-10-19T11:59:00Z' });
  for (const fields of [{ control: null }, { control: { owner: 'invented' } }, { changedAt: 'invalid' }, { conversation: {} }, { account: {} }]) {
    assert.equal((await s.send({ ...payload, ...fields })).status, 400);
  }
  assert.equal(s.databaseCalls.length, 0);
  assert.equal((await s.send(payload)).status, 200);
  const accepted = s.databaseCalls.find(call => call.operation === 'rpc').value.p_payload;
  assert.equal(accepted.control.ownerAppId, '263902037430900');
  assert.equal(accepted.changedAt, '2026-10-19T11:59:00Z');
  assert.equal((await s.send(payload)).body.deduplicated, true);
  assert.equal(s.counts.saves, 0);
});
