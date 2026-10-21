import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import test, { before, after } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let server, browser, origin;
before(async () => {
  const absolute = file => path.resolve(file).replaceAll('\\', '/');
  const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{ThemeAndLocaleProvider}from'${absolute('src/i18n/ThemeAndLocaleProvider.tsx')}';import{ConnectionWizardModal}from'${absolute('src/components/dashboard/ConnectionWizardModal.tsx')}';const p=new URLSearchParams(location.search);createRoot(document.getElementById('root')).render(<ThemeAndLocaleProvider fixedLocale={p.get('locale')||'en'}><ConnectionWizardModal isOpen onClose={()=>{}} initialPlatform={p.get('platform')||'facebook'} initialOAuthSessionId="isolated-session" initialSelectionStep={p.get('platform')==='instagram'?'select_account':'select_page'} onAccountConnected={()=>{}}/></ThemeAndLocaleProvider>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } });
  server = http.createServer((req, res) => { res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : 'text/html'); res.end(req.url === '/app.js' ? bundle.outputFiles[0].contents : '<!doctype html><div id="root"></div><script src="/app.js"></script>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });

test('Facebook truncated lists stay selectable and failed reload clears the old selection', async () => {
  const context = await browser.newContext(), page = await context.newPage();
  let reads = 0;
  await context.route('**/api/connect', route => {
    const input = route.request().postDataJSON();
    assert.equal(input.action, 'list_entities');
    assert.equal(input.oauthSessionId, 'isolated-session');
    reads++;
    return route.fulfill(reads <= 2 ? { json: { items: [{ id: 'page-a', name: 'Our Page', username: 'our_page' }, { id: 'page-b', name: 'Page B' }, { id: 'page-c', name: 'Page C' }], truncated: true } } : { status: 502, json: { error: { message: 'Meta list unavailable' } } });
  });
  try {
    await page.goto(origin);
    await page.getByText('Our Page', { exact: true }).waitFor();
    assert.match(await page.locator('body').innerText(), /incomplete Page list/);
    assert.equal(await page.getByRole('button', { name: 'Bind Selected Entity' }).isDisabled(), false);
    await page.getByPlaceholder('Search available entities...').fill('Page B');
    assert.equal(await page.getByRole('button', { name: 'Bind Selected Entity' }).isDisabled(), true);
    await page.getByText('Page B', { exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Bind Selected Entity' }).isDisabled(), false);
    await page.getByRole('button', { name: 'Reload accounts', exact: true }).click();
    await page.getByText('Our Page', { exact: true }).waitFor();
    assert.equal(await page.getByPlaceholder('Search available entities...').inputValue(), '');
    await page.getByRole('button', { name: 'Reload accounts', exact: true }).click();
    await page.getByText('Meta list unavailable', { exact: true }).waitFor();
    assert.equal(await page.getByText('Our Page', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Bind Selected Entity' }).isDisabled(), true);
    assert.equal(reads, 3);
  } finally { await context.close(); }
});

test('empty Instagram Page selection explains eligibility in Arabic without a false connection', async () => {
  const context = await browser.newContext(), page = await context.newPage();
  await context.route('**/api/connect', route => route.fulfill({ json: { items: [] } }));
  try {
    await page.goto(origin + '/?platform=instagram&locale=ar');
    await page.getByText(/لم تُرجع Meta صفحة مرتبطة/).waitFor();
    assert.equal(await page.getByRole('button', { name: 'ربط الحساب المحدد', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  } finally { await context.close(); }
});
