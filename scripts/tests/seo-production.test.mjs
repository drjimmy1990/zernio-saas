import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';

// Run against an already built local server. No provider actions or live submissions.
const origin = process.env.ASRA3_SEO_BASE_URL || 'http://127.0.0.1:5662';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'SEO regression checks require a local build');
const production = 'https://asra3.com';
const topics = ['', 'crm', 'whatsapp', 'facebook-instagram', 'reports'];
const paths = ['/', '/docs', ...['ar', 'en'].flatMap(locale => topics.map(topic => `/${locale}${topic ? `/${topic}` : ''}`))];
const pageCache = new Map();
async function page(path, init) {
  if (!init && pageCache.has(path)) return pageCache.get(path);
  const response = await fetch(origin + path, { redirect: 'manual', ...init });
  const html = await response.text();
  const result = { response, html, head: html.split('</head>')[0] };
  if (!init) pageCache.set(path, result);
  return result;
}
const meta = (head, name) => [...head.matchAll(/<meta\b[^>]*>/g)].find(([tag]) => tag.includes(`name="${name}"`))?.[0] ?? '';
const links = (head, rel) => [...head.matchAll(/<link\b[^>]*>/g)].filter(([tag]) => tag.includes(`rel="${rel}"`)).map(([tag]) => tag);
const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, json]) => JSON.parse(json));

for (const path of paths) test(`public HTML: ${path}`, async () => {
  const { response, html, head } = await page(path);
  assert.equal(response.status, 200);
  assert.doesNotMatch(response.headers.get('x-robots-tag') ?? '', /noindex/);
  assert.doesNotMatch(meta(head, 'robots'), /noindex|nosnippet/);
  assert.equal(links(head, 'canonical').length, 1);
  const canonical = links(head, 'canonical')[0].match(/href="([^"]+)"/)[1];
  assert.equal(new URL(canonical).href, new URL(production + path).href);
  assert.match(head, /<title>[^<]+<\/title>/);
  assert.match(meta(head, 'description'), /content="[^"]{40,}"/);
  assert.doesNotMatch(head, /AI Voice|55\+|18 social|8 paid|\?lang=/);
  if (/^\/(ar|en)(\/|$)/.test(path)) {
    const locale = path.split('/')[1];
    const suffix = path.slice(3);
    assert.match(html, new RegExp(`<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.ok((html.match(/<h2\b/g) ?? []).length >= 5);
    for (const language of ['ar', 'en']) {
      assert.ok(links(head, 'alternate').some(tag => tag.includes(`hrefLang="${language}"`) && tag.includes(`href="${production}/${language}${suffix}"`)));
      assert.ok(html.includes(`href="/${language}${suffix}"`), 'Human-visible language links');
    }
    assert.ok(schemas(html).some(schema => schema['@type'] === 'WebPage' && schema.inLanguage === locale));
  }
  for (const schema of schemas(html)) {
    const text = JSON.stringify(schema);
    assert.doesNotMatch(text, /AggregateOffer|aggregateRating|ratingValue|logo\.png|SearchAction|FAQPage/);
  }
});

test('sitemap lists exactly the canonical public inventory and no invented lastmod', async () => {
  const { response, html } = await page('/sitemap.xml');
  assert.equal(response.status, 200);
  const locations = [...html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
  assert.deepEqual(locations.sort(), paths.map(path => production + path).sort());
  assert.doesNotMatch(html, /dashboard|signup|login|admin|recovery|<lastmod>|<priority>|\?lang=/);
  assert.equal((html.match(/hreflang="ar"/g) ?? []).length, 10);
  assert.equal((html.match(/hreflang="en"/g) ?? []).length, 10);
});

test('robots applies one consistent public policy to search and AI search crawlers', async () => {
  const { response, html } = await page('/robots.txt');
  assert.equal(response.status, 200);
  assert.equal((html.match(/User-Agent:/gi) ?? []).length, 1);
  assert.match(html, /User-Agent: \*/i);
  assert.match(html, /Allow: \/\r?\n/i);
  assert.match(html, /Disallow: \/api\//i);
  assert.match(html, /Sitemap: https:\/\/asra3.com\/sitemap.xml/i);
  assert.doesNotMatch(html, /Disallow: \/(?:ar|en|login|signup)/i);
});

for (const path of ['/login', '/signup', '/recovery']) test(`private metadata: ${path}`, async () => {
  const { response, head } = await page(path);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
  assert.match(meta(head, 'robots'), /noindex/);
  assert.equal(links(head, 'canonical').length, 0);
});

for (const path of ['/dashboard', '/admin']) test(`protected workspace stays protected: ${path}`, async () => {
  const { response } = await page(path);
  assert.equal(response.status, 307);
  assert.match(response.headers.get('location'), /^\/login\?/);
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
});

test('API responses carry noindex', async () => {
  const { response } = await page('/api/auth?action=session');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
});

for (const path of ['/en/missing-page', '/ar/crm/extra', '/fr', '/old-site-missing-page', '/blog', '/blog/tri-lingual-restaurant-os-kds']) test(`removed or unavailable URLs return actual 404: ${path}`, async () => {
  const { response, head } = await page(path);
  assert.equal(response.status, 404);
  assert.match(head, /name="robots" content="noindex"/);
  assert.equal(links(head, 'canonical').length, 0);
});

test('www permanently redirects and preserves the path and query', async () => {
  // Node fetch rewrites Host; use a real HTTP request to model the reverse proxy.
  const response = await new Promise((resolve, reject) => {
    http.get(`${origin}/en/whatsapp?source=check`, { headers: { host: 'www.asra3.com' } }, res => {
      res.resume(); resolve(res);
    }).on('error', reject);
  });
  assert.equal(response.statusCode, 308);
  assert.equal(response.headers.location, `${production}/en/whatsapp?source=check`);
});

test('optional machine-readable summary links to real guides and labels future work', async () => {
  const { response, html } = await page('/llms.txt');
  assert.equal(response.status, 200);
  assert.match(html, /## Coming soon/);
  assert.doesNotMatch(html, /Official.*Standard|sub.?15ms|\$29|18 social/);
  for (const path of paths.filter(path => path.startsWith('/ar') || path.startsWith('/en'))) assert.ok(html.includes(production + path));
});

test('prepared IndexNow proof matches the public file and only the public URL inventory', async () => {
  const payload = JSON.parse(await fs.readFile('scripts/seo/indexnow-submission.json', 'utf8'));
  assert.equal(payload.host, 'asra3.com');
  assert.match(payload.key, /^[a-f0-9]{32}$/);
  assert.equal(payload.keyLocation, `${production}/${payload.key}.txt`);
  assert.deepEqual([...payload.urlList].sort(), paths.map(path => production + path).sort());
  const { response, html } = await page(`/${payload.key}.txt`);
  assert.equal(response.status, 200);
  assert.equal(html.trim(), payload.key);
});

test('public pages hydrate in their URL language, switch equivalent pages, and fit mobile RTL', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await context.addInitScript(() => localStorage.setItem('asra3_locale', 'ar'));
    const tab = await context.newPage();
    const errors = [];
    tab.on('pageerror', error => errors.push(error.message));
    await tab.goto(`${origin}/en/whatsapp`, { waitUntil: 'networkidle' });
    assert.equal(await tab.locator('html').getAttribute('lang'), 'en');
    assert.equal(await tab.locator('html').getAttribute('dir'), 'ltr');
    assert.match(await tab.locator('h1').innerText(), /WhatsApp Business/);
    await fs.mkdir('docs/reviews/screenshots', { recursive: true });
    await tab.screenshot({ path: 'docs/reviews/screenshots/seo-guide-english.png', fullPage: true });
    await tab.getByRole('link', { name: 'اقرأ بالعربية', exact: true }).click();
    await tab.waitForURL(`${origin}/ar/whatsapp`);
    await tab.setViewportSize({ width: 390, height: 844 });
    assert.equal(await tab.locator('html').getAttribute('lang'), 'ar');
    assert.equal(await tab.locator('html').getAttribute('dir'), 'rtl');
    await tab.screenshot({ path: 'docs/reviews/screenshots/seo-guide-arabic-mobile.png', fullPage: true });
    assert.ok(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow at 390px');
    await tab.getByRole('button', { name: 'Select Language', exact: true }).click();
    await tab.getByRole('button', { name: /English/ }).click();
    await tab.waitForURL(`${origin}/en/whatsapp`);
    assert.equal(await tab.locator('html').getAttribute('lang'), 'en');
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); }
});
