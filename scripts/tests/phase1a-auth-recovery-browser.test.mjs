import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import test, { before, after } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let server, browser, origin;
before(async () => {
  const absolute = file => path.resolve(file).replaceAll('\\', '/');
  const entry = `import React from 'react';import{createRoot}from'react-dom/client';import Signup from '${absolute('src/components/auth/SignUpForm.tsx')}';import Recovery from '${absolute('src/app/recovery/page.tsx')}';import ComingSoon from '${absolute('src/components/auth/RegistrationComingSoon.tsx')}';import{ThemeAndLocaleProvider}from'${absolute('src/i18n/ThemeAndLocaleProvider.tsx')}';createRoot(document.getElementById('root')).render(<ThemeAndLocaleProvider fixedLocale={new URLSearchParams(location.search).get('locale')||'en'}>{location.pathname==='/signup'?<Signup/>:location.pathname==='/closed-signup'?<ComingSoon/>:<Recovery/>}</ThemeAndLocaleProvider>);`;
  const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'local-link', setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, a => ({ path: a.path, namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'jsx', resolveDir: process.cwd(), contents: `import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}` }));
  } }] });
  server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : 'text/html');
    res.end(req.url === '/app.js' ? bundle.outputFiles[0].contents : '<!doctype html><div id="root"></div><script src="/app.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });

async function fixture(run) {
  const context = await browser.newContext(), page = await context.newPage();
  // Reject any unexpected remote request; all account requests are mocked locally.
  await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  try { await run(page, context); } finally { await context.close(); }
}
async function fillSignup(page) {
  await page.locator('#signup-name').fill('Local test user');
  await page.locator('#signup-email').fill('dummy@example.invalid');
  await page.locator('#signup-password').fill('Dummy-local-password-123');
}

test('signup pending verification remains on signup; failure clears notice; malformed success never redirects', async () => fixture(async (page, context) => {
  let reply = { status: 200, json: { ok: true, verificationRequired: true } };
  const writes = [];
  await context.route('**/api/auth', route => { writes.push(route.request().postDataJSON()); return route.fulfill(reply); });
  await page.goto(origin + '/signup'); await fillSignup(page);
  assert.equal(await page.getByRole('button').filter({ hasText: /\$29|\$79|\$199|\$499/ }).count(), 0);
  assert.match(await page.locator('body').innerText(), /New workspaces start on the Starter plan/);
  await page.locator('button[type="submit"]').click();
  await page.getByRole('status').waitFor(); assert.equal(new URL(page.url()).pathname, '/signup');
  assert.equal(Object.hasOwn(writes[0], 'planKey'), false);
  reply = { status: 503, json: { code: 'email_delivery_unavailable', error: 'provider detail' } };
  await page.locator('button[type="submit"]').click();
  await page.getByRole('alert').waitFor(); assert.equal(await page.getByRole('status').count(), 0);
  assert.match(await page.getByRole('alert').innerText(), /email delivery is unavailable/);
  reply = { status: 200, json: { redirectTo: '/dashboard', tenant: { organizationId: 'dummy' } } };
  await page.locator('button[type="submit"]').click();
  await page.getByText(/Registration could not be confirmed/).waitFor(); assert.equal(new URL(page.url()).pathname, '/signup');
}));

test('stable signup failure codes are localized by the real provider', async () => {
  for (const [locale, expected] of [['en', 'Too many requests. Wait a few minutes before trying again.'], ['ar', 'تم إرسال طلبات كثيرة. انتظر بضع دقائق قبل المحاولة مرة أخرى.']]) {
    await fixture(async (page, context) => {
      await context.route('**/api/auth', route => route.fulfill({ status: 429, json: { code: 'auth_rate_limited', error: 'private provider message' } }));
      await page.goto(origin + '/signup?locale=' + locale); await fillSignup(page); await page.locator('button[type="submit"]').click();
      await page.getByRole('alert').waitFor(); assert.equal(await page.getByRole('alert').innerText(), expected);
      assert.equal(await page.locator('html').getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr');
    });
  }
});

test('resend requires confirmed success and uses a generic eligibility notice', async () => fixture(async (page, context) => {
  let reply = { status: 503, json: { code: 'email_delivery_unavailable' } };
  await context.route('**/api/auth', route => route.fulfill(reply));
  await page.goto(origin + '/recovery?locale=ar'); await page.locator('input[type="email"]').fill('dummy@example.invalid');
  const resend = page.getByRole('button', { name: 'إعادة إرسال التأكيد' }); await resend.click();
  await page.getByRole('alert').waitFor(); assert.equal(await page.getByRole('status').count(), 0);
  reply = { status: 200, json: { ok: true } }; await resend.click(); await page.getByRole('status').waitFor();
  assert.match(await page.getByRole('status').innerText(), /إذا كان الحساب مؤهلاً/); assert.equal(await page.getByRole('alert').count(), 0);
}));

test('verification fragment is removed before click and only its access token is submitted', async () => fixture(async (page, context) => {
  const writes = [];
  await context.route('**/api/auth', route => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true, redirectTo: '/dashboard' } }); });
  await page.goto(origin + '/recovery#access_token=dummy-access-token&refresh_token=do-not-send&type=signup');
  await page.getByRole('button', { name: 'Verify account and open workspace' }).waitFor();
  assert.equal(new URL(page.url()).hash, ''); assert.equal(writes.length, 0);
  await page.getByRole('button', { name: 'Verify account and open workspace' }).click();
  await page.waitForURL(origin + '/dashboard');
  assert.deepEqual(writes, [{ action: 'verify_email', email: '', password: '', accessToken: 'dummy-access-token' }]);
}));

test('neutral resend success retains signup-only guidance and offers sign-in without promising delivery', async () => {
  for (const locale of ['en', 'ar']) await fixture(async (page, context) => {
    const writes = [];
    await context.route('**/api/auth', route => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true, message: 'If the account is eligible, check your email for the requested link.' } }); });
    await page.goto(`${origin}/recovery?locale=${locale}`);
    await page.locator('input[type="email"]').fill('dummy@example.invalid');
    await page.getByRole('button', { name: locale === 'ar' ? 'إعادة إرسال التأكيد' : 'Resend verification', exact: true }).click();
    await page.getByRole('status').waitFor();
    const content = await page.locator('body').innerText();
    assert.match(content, locale === 'ar' ? /لم تؤكّد بريدها بعد/ : /email is not yet confirmed/);
    assert.match(content, locale === 'ar' ? /سجّل الدخول أو أعد تعيين كلمة المرور/ : /sign in or reset your password/);
    assert.doesNotMatch(await page.getByRole('status').innerText(), /has been sent|تم إرسال رسالة/);
    assert.equal(await page.getByRole('link').getAttribute('href'), '/login');
    assert.deepEqual(writes, [{ action: 'resend', email: 'dummy@example.invalid', password: '', accessToken: '' }]);
  });
});

test('expired error fragments show fixed safe text and never submit embedded tokens', async () => fixture(async (page, context) => {
  const writes = [];
  await context.route('**/api/auth', route => { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true } }); });
  await page.goto(origin + '/recovery#error=access_denied&error_description=PRIVATE_PROVIDER_DETAIL&access_token=discard-me&type=signup');
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('alert').innerText(), 'This email link is invalid or expired. Request a new link.');
  assert.equal(new URL(page.url()).hash, ''); assert.equal(await page.getByRole('button', { name: 'Verify account and open workspace' }).count(), 0); assert.deepEqual(writes, []);
}));

test('closed registration shows bilingual coming-soon without a form or authentication requests', async () => {
  for (const locale of ['en', 'ar']) await fixture(async (page, context) => {
    const requests = [];
    await context.route('**/api/**', route => { requests.push(route.request().url()); return route.abort(); });
    await page.goto(`${origin}/closed-signup?locale=${locale}`);
    await page.getByRole('heading', { name: locale === 'ar' ? 'التسجيل قريباً' : 'Registration coming soon' }).waitFor();
    assert.equal(await page.locator('form,input').count(), 0);
    assert.equal(await page.getByRole('link', { name: locale === 'ar' ? 'تسجيل الدخول' : 'Sign in', exact: true }).getAttribute('href'), '/login');
    assert.equal(await page.getByRole('link', { name: locale === 'ar' ? 'استعادة الحساب' : 'Recover account', exact: true }).getAttribute('href'), '/recovery');
    assert.deepEqual(requests, []);
  });
});
