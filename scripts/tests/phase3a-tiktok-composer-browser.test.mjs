import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import test, { before, after } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

// Phase 3A — the real ProviderPublishingWorkspace bundle with TikTok selected, driven in Chrome
// against fixture routes (no provider calls), in English desktop and Arabic RTL mobile.
let server, browser, origin;
const screenshots = path.resolve('docs/reviews/screenshots');
const capacity = 'TikTok direct posting is at capacity right now. Use tiktokSettings.draft: true to deliver via Creator Inbox, or try again in a few hours as capacity frees up.';
before(async () => {
  const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {ProviderPublishingWorkspace} from '${path.resolve('src/components/dashboard/ProviderPublishingWorkspace.tsx').replaceAll('\\', '/')}';const rtl=location.search.includes('rtl');document.documentElement.lang=rtl?'ar':'en';document.documentElement.dir=rtl?'rtl':'ltr';createRoot(document.getElementById('root')).render(<ProviderPublishingWorkspace isRTL={rtl}/>);`;
  const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } });
  const css = (await postcss([tailwind()]).process(fs.readFileSync('src/app/globals.css', 'utf8'), { from: path.resolve('src/app/globals.css') })).css;
  server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : req.url === '/app.css' ? 'text/css' : 'text/html');
    res.end(req.url === '/app.js' ? bundle.outputFiles[0].contents : req.url === '/app.css' ? css : '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><main style="padding:16px;max-width:1160px;margin:auto" id="root"></main><script src="/app.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true }); fs.mkdirSync(screenshots, { recursive: true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server.close(resolve)); });

function creatorInfo(mediaType) {
  return { mediaType, accountId: 'tt', simulated: false, httpStatus: 200, creator: { nickname: 'asra3brand', canPostMore: true }, maxVideoDurationSec: 600,
    privacyLevels: [{ value: 'PUBLIC_TO_EVERYONE', label: 'Public To Everyone' }, { value: 'SELF_ONLY', label: 'Self Only' }],
    interactions: { allow_comment: { enabled: true }, allow_duet: mediaType === 'photo' ? null : { enabled: true }, allow_stitch: mediaType === 'photo' ? null : { enabled: false } },
    commercialContentTypes: [{ value: 'none', label: 'No Commercial Content' }, { value: 'brand_organic', label: 'Your Brand' }] };
}
async function fixture({ viewport = { width: 1280, height: 1000 }, rtl = false } = {}) {
  const context = await browser.newContext({ viewport }), page = await context.newPage(), writes = [], reads = [];
  const state = { createStatus: 201 };
  const accounts = [{ _id: 'fb', platform: 'facebook', displayName: 'Asra3 Store Page', isActive: true },
    { _id: 'tt', platform: 'tiktok', displayName: 'Asra3 TikTok', username: 'asra3brand', isActive: true },
    { _id: 'tt-reconnect', platform: 'tiktok', displayName: 'Old TikTok', isActive: true, needsReconnection: true }];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === 'media.example') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 640"><rect width="360" height="640" fill="#111"/><text x="180" y="320" text-anchor="middle" fill="#fff" font-size="32">Asra3</text></svg>' });
    assert.equal(url.origin, origin, 'All browser traffic must use fixtures; no provider live calls.');
    if (url.pathname !== '/api/publishing') return route.continue();
    if (request.method() === 'GET') {
      const action = url.searchParams.get('action'); reads.push({ action, accountId: url.searchParams.get('accountId'), mediaType: url.searchParams.get('mediaType') });
      if (action === 'accounts') return route.fulfill({ json: { profileId: 'owned-profile', accounts } });
      if (action === 'tiktok_creator_info') return route.fulfill({ json: creatorInfo(url.searchParams.get('mediaType')) });
      return route.fulfill({ json: { posts: [], pagination: { pages: 1 } } });
    }
    const body = request.postDataJSON(); writes.push(body);
    if (body.action === 'validate_tiktok') return route.fulfill({ json: { valid: true, kind: body.mediaItems.some(m => m.type === 'video') ? 'video' : 'photo', httpStatus: 200, media: [] } });
    const failed = state.createStatus === 207;
    return route.fulfill({ status: state.createStatus, json: { httpStatus: state.createStatus, ...(failed ? { message: 'Post created but publishing failed', error: 'All platforms failed' } : {}),
      post: { _id: 'tiktok-post', content: body.content, status: failed ? 'failed' : body.publishNow ? 'published' : 'draft', mediaItems: body.mediaItems,
        platforms: body.platforms.map(target => ({ ...target, status: failed ? 'failed' : 'published', ...(failed ? { errorMessage: capacity } : {}), ...(body.tiktokSettings?.draft && !failed ? { platformSpecificData: { isDraft: true } } : {}) })) } } });
  });
  await page.goto(rtl ? `${origin}/?rtl` : origin);
  await page.getByLabel(rtl ? 'حساب النشر' : 'Publishing account').selectOption('tt');
  return { context, page, state, writes, reads };
}
async function addMedia(page, url, type, rtl = false) {
  await page.locator('details').evaluate(node => { node.open = true; });
  await page.getByLabel('Media type', { exact: true }).selectOption(type); await page.getByLabel('Media URL', { exact: true }).fill(url);
  await page.getByRole('button', { name: rtl ? 'إضافة' : 'Add', exact: true }).click();
}
const mutations = writes => writes.filter(body => ['create', 'update', 'retry'].includes(body.action));

test('TikTok composer (EN desktop) loads creator-info, requires a privacy choice and consents, blocks text-only, and sends tiktokSettings with an idempotency key', async () => {
  const { context, page, writes, reads } = await fixture();
  try {
    assert.equal(await page.getByRole('option', { name: 'Old TikTok · TikTok — reconnect required' }).getAttribute('disabled'), '');
    await page.getByTestId('tiktok-settings').waitFor();
    await page.getByLabel('Post text').fill('Launch day #asra3');
    await page.getByRole('radio', { name: 'Publish now' }).check();
    await page.getByRole('button', { name: 'Review post', exact: true }).click();
    await page.getByText('TikTok requires a video or photos. Text-only posts are not supported.', { exact: true }).waitFor();
    assert.equal(writes.length, 0);
    await addMedia(page, 'https://media.example/launch.mp4', 'video');
    await page.getByText('Posting as', { exact: false }).waitFor();
    assert.ok(reads.some(read => read.action === 'tiktok_creator_info' && read.accountId === 'tt' && read.mediaType === 'video'));
    const privacy = page.getByLabel('Who can view this TikTok post');
    assert.equal(await privacy.inputValue(), '');
    assert.deepEqual(await privacy.locator('option:not([disabled])').allTextContents(), ['Everyone', 'Only me']);
    await page.getByRole('checkbox', { name: 'Comment', exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Duet', exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: 'Stitch', exact: true }).count(), 0);
    await page.getByText('Stitches are turned off for this account in the TikTok app.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: 'Comment', exact: true }).isChecked(), false);
    await page.getByRole('button', { name: 'Review post', exact: true }).click();
    await page.getByText('Choose who can view this TikTok post.', { exact: true }).waitFor();
    await privacy.selectOption('PUBLIC_TO_EVERYONE');
    await page.getByRole('button', { name: 'Review post', exact: true }).click();
    await page.getByText('Confirm the content preview and your agreement to TikTok\'s terms before continuing.', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'This post promotes a brand, product or service' }).check();
    await page.getByRole('radio', { name: /Your brand/ }).check();
    await page.getByRole('checkbox', { name: 'Comment', exact: true }).check();
    await page.getByRole('checkbox', { name: 'I have previewed this content and it is ready to share on TikTok.' }).check();
    await page.getByRole('checkbox', { name: /Music Usage Confirmation/ }).check();
    assert.equal(writes.length, 0);
    await page.getByRole('button', { name: 'Review post', exact: true }).click();
    await page.getByRole('button', { name: 'Publish now', exact: true }).click();
    await page.getByLabel('Publishing result').waitFor();
    const check = writes.find(body => body.action === 'validate_tiktok');
    assert.equal(check.accountId, 'tt'); assert.equal(check.tiktokSettings.privacy_level, 'PUBLIC_TO_EVERYONE');
    const [create] = mutations(writes);
    assert.equal(create.action, 'create'); assert.equal(create.publishNow, true); assert.ok(create.idempotencyKey);
    assert.deepEqual(create.platforms, [{ platform: 'tiktok', accountId: 'tt' }]);
    assert.deepEqual(create.tiktokSettings, { privacy_level: 'PUBLIC_TO_EVERYONE', allow_comment: true, allow_duet: false, allow_stitch: false, content_preview_confirmed: true, express_consent_given: true, commercialContentType: 'brand_organic' });
    // Consent is per post: the next post starts unconfirmed with no privacy chosen.
    await addMedia(page, 'https://media.example/second.mp4', 'video');
    assert.equal(await page.getByLabel('Who can view this TikTok post').inputValue(), '');
    assert.equal(await page.getByRole('checkbox', { name: 'I have previewed this content and it is ready to share on TikTok.' }).isChecked(), false);
    await page.screenshot({ path: path.join(screenshots, 'phase3a-tiktok-composer-desktop.png'), fullPage: true });
  } finally { await context.close(); }
});

test('TikTok inbox draft is sent as tiktokSettings.draft and a capacity failure is explained in plain language', async () => {
  const { context, page, state, writes } = await fixture();
  try {
    await addMedia(page, 'https://media.example/launch.mp4', 'video');
    await page.getByLabel('Who can view this TikTok post').selectOption('SELF_ONLY');
    await page.getByRole('checkbox', { name: 'I have previewed this content and it is ready to share on TikTok.' }).check();
    await page.getByRole('checkbox', { name: /Music Usage Confirmation/ }).check();
    state.createStatus = 207;
    await page.getByRole('radio', { name: 'Publish now' }).check();
    await page.getByRole('button', { name: 'Review post', exact: true }).click();
    await page.getByRole('button', { name: 'Publish now', exact: true }).click();
    await page.getByText(/Send it as a draft to your TikTok inbox now/).first().waitFor();
    await page.getByText(capacity, { exact: false }).first().waitFor();
    state.createStatus = 201;
    await addMedia(page, 'https://media.example/launch.mp4', 'video');
    await page.getByLabel('Who can view this TikTok post').selectOption('PUBLIC_TO_EVERYONE');
    await page.getByRole('checkbox', { name: /Send as draft to TikTok inbox/ }).check();
    await page.getByRole('checkbox', { name: 'I have previewed this content and it is ready to share on TikTok.' }).check();
    await page.getByRole('checkbox', { name: /Music Usage Confirmation/ }).check();
    await page.getByRole('button', { name: 'Review post', exact: true }).click();
    await page.getByRole('button', { name: 'Publish now', exact: true }).click();
    await page.getByText('Delivered to your TikTok inbox. Finish and post it in the TikTok app.', { exact: false }).first().waitFor();
    const last = mutations(writes).at(-1);
    assert.equal(last.tiktokSettings.draft, true); assert.equal(last.tiktokSettings.privacy_level, 'PUBLIC_TO_EVERYONE');
  } finally { await context.close(); }
});

test('TikTok composer (AR RTL mobile) shows Arabic photo-carousel settings without horizontal overflow', async () => {
  const { context, page, writes, reads } = await fixture({ viewport: { width: 390, height: 844 }, rtl: true });
  try {
    assert.equal(await page.locator('[data-testid="publishing-workspace"]').getAttribute('dir'), 'rtl');
    await page.getByLabel('نص المنشور').fill('مجموعة جديدة');
    await addMedia(page, 'https://media.example/one.jpg', 'image', true);
    await addMedia(page, 'https://media.example/two.webp', 'image', true);
    await page.getByText('من يمكنه مشاهدة هذا المنشور؟', { exact: true }).waitFor();
    assert.ok(reads.some(read => read.action === 'tiktok_creator_info' && read.mediaType === 'photo'));
    const privacy = page.getByLabel('من يمكنه مشاهدة منشور تيك توك');
    assert.equal(await privacy.inputValue(), '');
    assert.deepEqual(await privacy.locator('option:not([disabled])').allTextContents(), ['الجميع', 'أنا فقط']);
    assert.equal(await page.getByRole('checkbox', { name: 'عمل دويتو (Duet)' }).count(), 0);
    await page.getByLabel('وصف صور تيك توك').fill('وصف كامل للمجموعة');
    await page.getByText('إرسال كمسودة إلى صندوق تيك توك', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'حفظ المسودة', exact: true }).click();
    await page.getByText('اختر من يمكنه مشاهدة منشور تيك توك.', { exact: true }).waitFor();
    assert.equal(mutations(writes).length, 0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `Horizontal overflow ${overflow}px`);
    await privacy.selectOption('PUBLIC_TO_EVERYONE');
    await page.getByRole('checkbox', { name: 'راجعت معاينة هذا المحتوى وهو جاهز للمشاركة على تيك توك.' }).check();
    await page.getByRole('checkbox', { name: /تأكيد استخدام الموسيقى/ }).check();
    await page.screenshot({ path: path.join(screenshots, 'phase3a-tiktok-composer-mobile-rtl.png'), fullPage: true });
    await page.getByRole('button', { name: 'حفظ المسودة', exact: true }).click();
    await page.getByLabel('Publishing result').waitFor();
    const [create] = mutations(writes);
    assert.equal(create.isDraft, true); assert.equal(create.tiktokSettings.description, 'وصف كامل للمجموعة');
    assert.equal(create.tiktokSettings.allow_duet, undefined); assert.equal(create.mediaItems.length, 2);
  } finally { await context.close(); }
});
