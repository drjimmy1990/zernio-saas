import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import test, { before, after } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let server, browser, origin;
const account = { accountId: 'fb-owned', id: 'provider-id', platform: 'facebook', displayName: 'Owned Page', username: 'owned-page', status: 'healthy', isActive: true, needsReconnect: false };
before(async () => {
  const absolute = file => path.resolve(file).replaceAll('\\', '/');
  const entry = `import React from 'react';import{createRoot}from'react-dom/client';import{ConnectAndAccountsHub}from'${absolute('src/components/dashboard/hubs/ConnectAndAccountsHub.tsx')}';import{ThemeAndLocaleProvider}from'${absolute('src/i18n/ThemeAndLocaleProvider.tsx')}';window.__wizard=[];function Fixture(){const[workspace,setWorkspace]=React.useState({revision:0});return <ThemeAndLocaleProvider fixedLocale={new URLSearchParams(location.search).get('locale')||'en'}><button onClick={()=>setWorkspace({revision:1})}>Fixture refresh workspace</button><ConnectAndAccountsHub workspace={workspace} policy={{}} onRefreshWorkspace={()=>setWorkspace({revision:2})} onOpenConnectionWizard={(platform,account)=>window.__wizard.push({platform,account})}/></ThemeAndLocaleProvider>}createRoot(document.getElementById('root')).render(<Fixture/>);`;
  const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
  server = http.createServer((req, res) => { res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : 'text/html'); res.end(req.url === '/app.js' ? bundle.outputFiles[0].contents : '<!doctype html><div id="root"></div><script src="/app.js"></script>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });
async function fixture(run, locale = 'en') {
  const context = await browser.newContext(), page = await context.newPage(), reads = [], writes = [];
  let greeting = [{ locale: 'default', text: 'Welcome to our business' }];
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    assert.equal(url.origin, origin, 'No live requests');
    if (!url.pathname.startsWith('/api/')) return route.continue();
    assert.ok(['/api/accounts', '/api/messaging-settings'].includes(url.pathname), 'Unexpected API: ' + url.pathname);
    if (req.method() === 'POST') {
      const body = req.postDataJSON(); writes.push(body);
      assert.equal(url.pathname, '/api/messaging-settings'); assert.equal(body.action, 'save');
      greeting = body.value.greeting; return route.fulfill({ json: { success: true } });
    }
    reads.push({ path: url.pathname, ...Object.fromEntries(url.searchParams) });
    if (url.pathname === '/api/accounts') return route.fulfill({ json: { success: true, accounts: [account] } });
    if (url.searchParams.get('action') === 'accounts') return route.fulfill({ json: { profileId: 'owned-profile', accounts: [account] } });
    assert.equal(url.searchParams.get('accountId'), account.accountId); assert.equal(url.searchParams.get('setting'), 'messenger-greeting');
    return route.fulfill({ json: { data: [{ greeting }] } });
  });
  try { await page.goto(origin + '/?locale=' + locale); await run({ page, reads, writes }); } finally { await context.close(); }
}

test('mount and workspace refresh use account health only; groups honestly show unavailable', async () => fixture(async ({ page, reads, writes }) => {
  await page.getByText('Owned Page', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Fixture refresh workspace' }).click();
  await page.waitForFunction(() => !document.body.innerText.includes('Checking accounts'));
  assert.equal(reads.filter(r => r.path === '/api/accounts').length, 2);
  await page.getByRole('button', { name: /Account groups/ }).click();
  await page.getByRole('heading', { name: 'Account groups — coming soon' }).waitFor();
  assert.match(await page.locator('body').innerText(), /Grouping accounts is unavailable in this release/);
  assert.equal(await page.getByRole('button', { name: /create|delete/i }).count(), 0);
  assert.equal(await page.getByText(/No groups|No account groups/).count(), 0); assert.deepEqual(writes, []);
}));

test('pages launch the provided wizard and reconnect preserves the complete owned account', async () => fixture(async ({ page, writes }) => {
  await page.getByText('Owned Page', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reconnect', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.__wizard), [{ platform: 'facebook', account }]);
  await page.getByRole('button', { name: 'Pages and profiles', exact: true }).click();
  await page.getByRole('button', { name: 'Start account connection', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__wizard.length), 2);
  assert.deepEqual(await page.evaluate(() => window.__wizard[1]), { platform: undefined, account: undefined }); assert.deepEqual(writes, []);
}));

test('real messaging settings review saves canonical greeting and verifies it by re-reading', async () => fixture(async ({ page, reads, writes }) => {
  await page.getByRole('button', { name: 'Messaging settings', exact: true }).click();
  await page.getByLabel('Settings account').selectOption(account.accountId);
  await page.getByRole('button', { name: 'Greeting', exact: true }).click();
  await page.getByLabel('Greeting text').waitFor(); assert.equal(await page.getByLabel('Greeting text').inputValue(), 'Welcome to our business');
  await page.getByLabel('Greeting text').fill('Welcome to our store'); await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  assert.deepEqual(writes, []); await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.getByText('Settings confirmed after refreshing their current state.', { exact: true }).waitFor();
  assert.equal(writes.length, 1); assert.equal(writes[0].accountId, account.accountId);
  assert.deepEqual(writes[0].value, { greeting: [{ locale: 'default', text: 'Welcome to our store' }] });
  assert.equal(reads.filter(r => r.setting === 'messenger-greeting').length, 2);
}));

test('Arabic account sections and page connection flow use the actual locale provider', async () => fixture(async ({ page, writes }) => {
  await page.getByText('Owned Page', { exact: true }).waitFor(); assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  await page.getByRole('button', { name: /مجموعات الحسابات/ }).click();
  await page.getByRole('heading', { name: 'مجموعات الحسابات — قريباً' }).waitFor();
  await page.getByRole('button', { name: 'الصفحات والملفات الشخصية', exact: true }).click();
  await page.getByRole('button', { name: 'بدء ربط حساب', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__wizard.length), 1);
  await page.getByRole('button', { name: 'إعدادات الرسائل', exact: true }).click(); await page.getByLabel('Settings account').waitFor();
  assert.equal(await page.getByTestId('meta-settings').getAttribute('dir'), 'rtl'); assert.deepEqual(writes, []);
}, 'ar'));
