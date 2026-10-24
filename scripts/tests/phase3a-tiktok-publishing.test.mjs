import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test, { before, after, beforeEach } from 'node:test';
import ts from 'typescript';

// Phase 3A — TikTok publishing through Zernio (zernio.txt "# TikTok"). An in-process provider double
// records every call; no live network is reachable from the sandboxed modules.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profileId = '66a1f0c2a4b9d3e8f1a2b3c4', foreignProfile = '77a1f0c2a4b9d3e8f1a2b3c4';
const tiktokId = '66b1f0c2a4b9d3e8f1a2b3d1', facebookId = '66b1f0c2a4b9d3e8f1a2b3c4', foreignTikTok = '77b1f0c2a4b9d3e8f1a2b3d1', postId = '66c1f0c2a4b9d3e8f1a2b3c4';
const capacityMessage = 'TikTok direct posting is at capacity right now. Use tiktokSettings.draft: true to deliver via Creator Inbox, or try again in a few hours as capacity frees up.';
let server, origin, state;

function creatorInfo(mediaType, patch = {}) {
  return { creator: { nickname: 'asra3brand', isVerified: false, canPostMore: patch.canPostMore ?? true },
    privacyLevels: patch.privacyLevels ?? [{ value: 'PUBLIC_TO_EVERYONE', label: 'Public To Everyone' }, { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Mutual Follow Friends' }, { value: 'SELF_ONLY', label: 'Self Only' }],
    postingLimits: { maxVideoDurationSec: 600, interactionSettings: {
      allow_comment: { enabled: true, required: true, default: false, label: 'Allow Comment' },
      allow_duet: mediaType === 'photo' ? null : { enabled: true, required: true, default: false, label: 'Allow Duet' },
      allow_stitch: mediaType === 'photo' ? null : { enabled: patch.stitch ?? false, required: true, default: false, label: 'Allow Stitch' } } },
    commercialContentTypes: patch.commercial ?? [{ value: 'none', label: 'No Commercial Content' }, { value: 'brand_organic', label: 'Your Brand', requires: ['is_brand_organic_post'] }] };
}
function reset(patch = {}) { state = { requests: [], creator: {}, malformedCreator: false, post: 'success', ...patch }; }
function json(res, status, body, headers = {}) { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(body)); }

before(async () => {
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    const p = url.pathname.replace(/^\/api\/v1/, '');
    state.requests.push({ method: req.method, path: p, query: Object.fromEntries(url.searchParams), body, idempotencyKey: req.headers['idempotency-key'], auth: req.headers.authorization });
    if (p.startsWith('/profiles/')) { const id = p.split('/')[2]; return json(res, 200, { profile: { _id: id, externalId: id === profileId ? 'tenant-a' : 'tenant-b' } }); }
    if (p === '/accounts' && req.method === 'GET') {
      const all = [{ _id: tiktokId, platform: 'tiktok', profileId, username: 'asra3brand', displayName: 'Asra3 Brand', isActive: true },
        { _id: facebookId, platform: 'facebook', profileId, username: 'asra3', displayName: 'Asra3 Page', isActive: true },
        { _id: foreignTikTok, platform: 'tiktok', profileId: { _id: foreignProfile }, username: 'otherbrand', isActive: true }];
      return json(res, 200, { accounts: all.filter(a => (typeof a.profileId === 'string' ? a.profileId : a.profileId._id) === url.searchParams.get('profileId')) });
    }
    const creator = p.match(/^\/accounts\/([^/]+)\/tiktok\/creator-info$/);
    if (creator) {
      if (state.malformedCreator) return json(res, 200, { creator: {}, privacyLevels: [{ value: 'EVERYONE_INVENTED' }], postingLimits: {} });
      return json(res, 200, creatorInfo(url.searchParams.get('mediaType'), state.creator));
    }
    if (p === '/tools/validate/media') {
      const video = body.url.endsWith('.mp4');
      return json(res, 200, { valid: true, url: body.url, type: video ? 'video' : 'image', contentType: video ? 'video/mp4' : body.url.endsWith('.webp') ? 'image/webp' : 'image/jpeg', size: 1024 });
    }
    if (p === '/posts' && req.method === 'POST') {
      if (state.post === 'rate-limit') return json(res, 429, { error: 'Rate limit exceeded: 25 posts per hour per account. Retry after 120 seconds.', code: 'rate_limited' }, { 'Retry-After': '120' });
      const failed = state.post === 'capacity';
      return json(res, failed ? 207 : 201, { ...(failed ? { message: 'Post created but publishing failed', error: 'All platforms failed' } : {}),
        post: { _id: postId, content: body.content, status: failed ? 'failed' : body.isDraft ? 'draft' : body.publishNow ? 'published' : 'scheduled', mediaItems: body.mediaItems,
          platforms: body.platforms.map(target => ({ ...target, status: failed ? 'failed' : body.publishNow ? 'published' : 'pending', ...(failed ? { errorMessage: capacityMessage } : {}),
            ...(body.tiktokSettings?.draft ? { platformSpecificData: { isDraft: true } } : {}) })) } });
    }
    json(res, 404, { error: `Unexpected provider call ${req.method} ${p}` });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
beforeEach(() => reset());

function runtime(allowedPlatforms = ['facebook', 'instagram', 'tiktok']) {
  const files = { tiktok: 'src/lib/publishing/tiktok.ts', tiktokErrors: 'src/lib/publishing/tiktok-errors.ts', instagram: 'src/lib/publishing/instagram.ts', facebook: 'src/lib/publishing/facebook.ts', client: 'src/lib/zernio/client.ts', publishing: 'src/lib/services/publishing.service.ts', actions: 'src/lib/publishing/actions.ts', core: 'src/lib/services/core-connect.service.ts', accounts: 'src/lib/auth/tenant-provider.ts', lifecycle: 'src/lib/accounts/lifecycle.ts' };
  const sources = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText]));
  const context = vm.createContext({ Buffer, URL, Request, Response, Headers, TextEncoder, TextDecoder, Date, Intl, Set, Map, console, AbortController, setTimeout, clearTimeout,
    process: { env: { ZERNIO_BASE_URL: `${origin}/api/v1`, ZERNIO_API_KEY: 'phase3a_mock_provider_key' } },
    fetch: (url, options) => { assert.equal(new URL(url).origin, origin, 'Live network forbidden'); return fetch(url, options); } });
  const cache = {};
  class TenantAccessError extends Error { constructor(status, message) { super(message); this.status = status; } }
  function load(name) {
    if (cache[name]) return cache[name];
    const module = { exports: {} }; cache[name] = module.exports;
    const require = specifier => {
      if (specifier === '@/lib/billing/connections') return { reserveConnectionCapacity: async () => {} };
      if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
      const alias = { '@/lib/publishing/tiktok': 'tiktok', './tiktok': 'tiktok', '@/lib/publishing/tiktok-errors': 'tiktokErrors', '@/lib/publishing/instagram': 'instagram', './instagram': 'instagram', '@/lib/publishing/facebook': 'facebook', '@/lib/zernio/client': 'client', '@/lib/services/publishing.service': 'publishing', '@/lib/services/core-connect.service': 'core', '@/lib/auth/tenant-provider': 'accounts', '@/lib/accounts/lifecycle': 'lifecycle' }[specifier];
      if (alias) return load(alias);
      if (specifier === '@/lib/auth/tenant-access') return { TenantAccessError };
      if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => null };
      if (specifier === '@/lib/storage/workspace-store') return { WorkspaceStore: { removeConnectedAccount: () => {} } };
      if (specifier === '@/lib/zernio/policy-engine') return { getFallbackStore: () => ({ globalConfig: {}, tenants: {} }), resolveConnectScopesParam: () => '',
        assertSubServiceAllowed: async org => ({ organizationId: org, organizationName: org, status: 'active', zernioProfileId: org === 'tenant-b' ? foreignProfile : profileId, allowedPlatforms, quotas: { maxConnectedAccounts: 10 } }) };
      throw new Error(`Unexpected dependency ${specifier}`);
    };
    vm.runInContext(`(function(require,module,exports){${sources[name]}\n})`, context)(require, module, module.exports); return module.exports;
  }
  return { service: load('publishing').PublishingService, actions: load('actions'), tiktok: load('tiktok'), errors: load('tiktokErrors'), TenantAccessError };
}

const video = () => ({ type: 'video', url: 'https://cdn.example.invalid/launch.mp4' });
const photo = (n = 1) => ({ type: 'image', url: `https://cdn.example.invalid/photo${n}.jpg` });
const settings = (patch = {}) => ({ privacy_level: 'PUBLIC_TO_EVERYONE', allow_comment: true, allow_duet: false, allow_stitch: false, content_preview_confirmed: true, express_consent_given: true, commercialContentType: 'none', ...patch });
const input = (patch = {}) => ({ organizationId: 'tenant-a', content: 'New collection #asra3', platforms: [{ platform: 'tiktok', accountId: tiktokId }], mediaItems: [video()], publishNow: true, idempotencyKey: 'tiktok-intent-1', tiktokSettings: settings(), ...patch });
const writes = () => state.requests.filter(r => r.path === '/posts' && r.method === 'POST');
const creatorReads = () => state.requests.filter(r => r.path.endsWith('/tiktok/creator-info'));

test('creator-info is read live for the tenant-owned TikTok account and normalized strictly', async () => {
  const { service } = runtime();
  const info = await service.getTikTokCreatorInfo({ organizationId: 'tenant-a', accountId: tiktokId, mediaType: 'video' });
  assert.deepEqual(Array.from(info.privacyLevels, level => level.value), ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY']);
  assert.equal(info.interactions.allow_stitch.enabled, false);
  assert.equal(info.creator.nickname, 'asra3brand');
  assert.equal(creatorReads()[0].query.mediaType, 'video');
  assert.equal(creatorReads()[0].path, `/accounts/${tiktokId}/tiktok/creator-info`);
  const photoInfo = await service.getTikTokCreatorInfo({ organizationId: 'tenant-a', accountId: tiktokId, mediaType: 'photo' });
  assert.equal(photoInfo.interactions.allow_duet, null);
  await assert.rejects(service.getTikTokCreatorInfo({ organizationId: 'tenant-a', accountId: tiktokId, mediaType: 'reel' }), e => e.status === 400);
  await assert.rejects(service.getTikTokCreatorInfo({ organizationId: 'tenant-a', accountId: facebookId, mediaType: 'video' }), e => e.status === 400);
  reset({ malformedCreator: true });
  await assert.rejects(service.getTikTokCreatorInfo({ organizationId: 'tenant-a', accountId: tiktokId, mediaType: 'video' }), e => e.envelope?.status === 502);
});

test('cross-tenant TikTok accountId is rejected before any creator-info read or post write', async () => {
  const { service } = runtime();
  await assert.rejects(service.getTikTokCreatorInfo({ organizationId: 'tenant-a', accountId: foreignTikTok, mediaType: 'video' }), e => e.status === 403);
  await assert.rejects(service.createPost(input({ platforms: [{ platform: 'tiktok', accountId: foreignTikTok }] })), e => e.status === 403);
  await assert.rejects(service.validateTikTokPost({ organizationId: 'tenant-a', accountId: foreignTikTok, mediaItems: [video()], tiktokSettings: settings() }), e => e.status === 403);
  assert.equal(creatorReads().length, 0); assert.equal(writes().length, 0);
});

test('a valid video post is validated against creator-info and sent with tiktokSettings and an Idempotency-Key', async () => {
  const { service } = runtime();
  const result = await service.createPost(input());
  assert.equal(result.post.status, 'published'); assert.equal(result.simulated, false);
  const [write] = writes();
  assert.match(write.idempotencyKey, /^asra3-post-[a-f0-9]{64}$/);
  assert.equal(write.body.platforms[0].platform, 'tiktok'); assert.equal(write.body.platforms[0].accountId, tiktokId);
  assert.deepEqual(write.body.tiktokSettings, { ...settings(), media_type: 'video' });
  assert.deepEqual(write.body.platforms[0].platformSpecificData, { tiktokSettings: { ...settings(), media_type: 'video' } });
  assert.equal(creatorReads().length, 1); assert.equal(creatorReads()[0].query.mediaType, 'video');
  assert.equal(state.requests.filter(r => r.path === '/tools/validate/media').length, 1);
  // The same intent key maps to the same provider key (replay-safe), a different intent to a different key.
  reset(); await service.createPost(input()); const replay = writes()[0].idempotencyKey;
  reset(); await service.createPost(input({ idempotencyKey: 'tiktok-intent-2' }));
  assert.equal(replay, write.idempotencyKey); assert.notEqual(writes()[0].idempotencyKey, write.idempotencyKey);
  await assert.rejects(service.createPost(input({ idempotencyKey: '' })), e => e.status === 400);
});

test('a privacy level that creator-info does not return is rejected before the write', async () => {
  reset({ creator: { privacyLevels: [{ value: 'PUBLIC_TO_EVERYONE', label: 'Public To Everyone' }] } });
  const { service } = runtime();
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ privacy_level: 'SELF_ONLY' }) })), e => e.status === 400 && /does not offer/.test(e.message));
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ privacy_level: 'EVERYONE' }) })), e => e.status === 400);
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ privacy_level: undefined }) })), e => e.status === 400 && /default privacy/.test(e.message));
  assert.equal(writes().length, 0);
});

test('missing or false TikTok consents are rejected, as are missing settings', async () => {
  const { service } = runtime();
  for (const patch of [{ content_preview_confirmed: false }, { express_consent_given: undefined }, { content_preview_confirmed: 'true' }]) {
    await assert.rejects(service.createPost(input({ tiktokSettings: settings(patch) })), e => e.status === 400 && /consent|previewed/i.test(e.message));
  }
  await assert.rejects(service.createPost(input({ tiktokSettings: undefined })), e => e.status === 400 && /settings are required/.test(e.message));
  assert.equal(creatorReads().length, 0); assert.equal(writes().length, 0);
});

test('text-only, mixed, document and oversized TikTok media are rejected', async () => {
  const { service } = runtime();
  for (const mediaItems of [[], undefined, [video(), photo()], [video(), video()], [{ type: 'document', url: 'https://cdn.example.invalid/a.pdf' }], Array.from({ length: 36 }, (_, i) => photo(i))]) {
    await assert.rejects(service.createPost(input({ mediaItems })), e => e.status === 400);
  }
  await assert.rejects(service.createPost(input({ mediaItems: [], content: 'Only words' })), e => /Text-only posts are not supported/.test(e.message));
  await assert.rejects(service.createPost(input({ content: 'a'.repeat(2201) })), e => e.status === 400 && /2,200/.test(e.message));
  assert.equal(writes().length, 0);
});

test('photo carousels set media_type photo, keep description and reject video-only toggles', async () => {
  const { service } = runtime();
  const photoSettings = { privacy_level: 'MUTUAL_FOLLOW_FRIENDS', allow_comment: false, content_preview_confirmed: true, express_consent_given: true, description: 'Full recap', auto_add_music: true, photo_cover_index: 1 };
  await service.createPost(input({ mediaItems: [photo(1), photo(2)], tiktokSettings: photoSettings }));
  assert.equal(writes()[0].body.tiktokSettings.media_type, 'photo'); assert.equal(writes()[0].body.tiktokSettings.description, 'Full recap');
  assert.equal(creatorReads()[0].query.mediaType, 'photo');
  for (const patch of [{ allow_duet: false }, { video_cover_timestamp_ms: 1000 }, { photo_cover_index: 2 }, { media_type: 'video' }, { video_made_with_ai: true }]) {
    reset(); await assert.rejects(service.createPost(input({ mediaItems: [photo(1), photo(2)], tiktokSettings: { ...photoSettings, ...patch } })), e => e.status === 400); assert.equal(writes().length, 0);
  }
});

test('interaction toggles turned off in TikTok, unsupported commercial types and branded private posts are rejected', async () => {
  const { service } = runtime();
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ allow_stitch: true }) })), e => e.status === 400 && /stitches turned off/.test(e.message));
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ allow_duet: undefined }) })), e => e.status === 400 && /allow_duet/.test(e.message));
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ commercialContentType: 'brand_content' }) })), e => e.status === 400 && /commercial/.test(e.message));
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ commercialContentType: 'brand_organic', privacy_level: 'SELF_ONLY' }) })), e => e.status === 400 && /Only me/.test(e.message));
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ locationId: '123', locationName: 'Cairo' }) })), e => e.status === 400 && /not supported/.test(e.message));
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ privacyLevel: 'SELF_ONLY' }) })), e => e.status === 400 && /twice/.test(e.message));
  await assert.rejects(service.createPost(input({ platforms: [{ platform: 'tiktok', accountId: tiktokId, platformSpecificData: { pageId: 'x' } }] })), e => e.status === 400);
  await service.createPost(input({ tiktokSettings: settings({ commercialContentType: 'brand_organic', allowComment: true, allow_comment: undefined }) }));
  assert.equal(writes().length, 1); assert.equal(writes()[0].body.tiktokSettings.allow_comment, true);
});

test('draft mode sends tiktokSettings.draft and is allowed when TikTok blocks direct posting', async () => {
  reset({ creator: { canPostMore: false } });
  const { service } = runtime();
  await assert.rejects(service.createPost(input()), e => e.status === 429 && /draft/.test(e.message));
  assert.equal(writes().length, 0);
  const result = await service.createPost(input({ tiktokSettings: settings({ draft: true }) }));
  assert.equal(writes()[0].body.tiktokSettings.draft, true); assert.equal(result.post.platforms[0].platformSpecificData.isDraft, true);
  await assert.rejects(service.createPost(input({ tiktokSettings: settings({ draft: 'yes' }) })), e => e.status === 400);
});

test('provider 429 velocity limits and direct-posting capacity failures are surfaced, never faked', async () => {
  const { service, errors, actions } = runtime();
  reset({ post: 'rate-limit' });
  const limited = await service.createPost(input()).then(() => null, error => error);
  assert.equal(limited.envelope.status, 429); assert.equal(limited.envelope.retryAfterSeconds, 120);
  const payload = actions.publishingError(limited);
  assert.equal(payload.status, 429); assert.equal(payload.payload.error.retryAfterSeconds, 120); assert.match(payload.payload.error.message, /25 posts per hour/);
  assert.equal(errors.explainTikTokError(payload.payload.error.message, 429).code, 'tiktok_velocity_limit');
  reset({ post: 'capacity' });
  const failed = await service.createPost(input());
  assert.equal(failed.httpStatus, 207); assert.equal(failed.post.status, 'failed'); assert.equal(failed.post.platforms[0].platformPostUrl, undefined);
  const explained = errors.explainTikTokError(failed.post.platforms[0].errorMessage);
  assert.equal(explained.code, 'tiktok_direct_post_capacity'); assert.equal(explained.suggestDraft, true); assert.match(explained.ar, /مسودة/);
  for (const [message, code] of [['You have created too many posts in the last 24 hours via the API.', 'tiktok_api_daily_limit'], ['TikTok allows only 5 pending drafts per account in any 24-hour period.', 'tiktok_pending_drafts'], ['Missing required TikTok permissions. Please reconnect with all required scopes.', 'tiktok_missing_permissions'], ['Daily active user quota reached', 'tiktok_direct_post_capacity']]) assert.equal(errors.explainTikTokError(message).code, code);
  assert.equal(errors.explainTikTokError('Unrelated failure'), null);
});

test('plan policy without TikTok blocks reads and writes; composer validation performs the create checks without writing', async () => {
  const blocked = runtime(['facebook', 'instagram']).service;
  await assert.rejects(blocked.createPost(input()), e => e.status === 403);
  await assert.rejects(blocked.getTikTokCreatorInfo({ organizationId: 'tenant-a', accountId: tiktokId, mediaType: 'video' }), e => e.status === 403);
  assert.equal(writes().length, 0);
  const { service } = runtime();
  const verdict = await service.validateTikTokPost({ organizationId: 'tenant-a', accountId: tiktokId, content: 'Caption', mediaItems: [video()], tiktokSettings: settings() });
  assert.equal(verdict.valid, true); assert.equal(verdict.kind, 'video'); assert.equal(verdict.media[0].contentType, 'video/mp4');
  await assert.rejects(service.validateTikTokPost({ organizationId: 'tenant-a', accountId: tiktokId, content: 'Caption', mediaItems: [video()], tiktokSettings: settings({ privacy_level: 'FOLLOWER_OF_CREATOR' }) }), e => e.status === 400);
  assert.equal(writes().length, 0);
});

test('dashboard and public API actions route TikTok creator-info and settings through the tenant service', async () => {
  const { actions } = runtime();
  const info = await actions.runPublishingAction('tenant-a', 'tiktok_creator_info', { accountId: tiktokId, mediaType: 'photo' });
  assert.equal(info.mediaType, 'photo');
  assert.equal(actions.isPublishingPath(['accounts', tiktokId, 'tiktok', 'creator-info']), true);
  const viaPublic = await actions.runPublishingPublicApi('tenant-a', 'GET', ['accounts', tiktokId, 'tiktok', 'creator-info'], { mediaType: 'video' });
  assert.equal(viaPublic.mediaType, 'video');
  await actions.runPublishingAction('tenant-a', 'create', input());
  assert.equal(writes()[0].body.tiktokSettings.privacy_level, 'PUBLIC_TO_EVERYONE');
  const checked = await actions.runPublishingAction('tenant-a', 'validate_tiktok', { accountId: tiktokId, content: 'x', mediaItems: [photo()], tiktokSettings: { privacy_level: 'SELF_ONLY', allow_comment: false, content_preview_confirmed: true, express_consent_given: true } });
  assert.equal(checked.kind, 'photo');
});
