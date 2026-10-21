import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { build } from 'esbuild';

test('Meta history prepends older pages, honors page order and explains unavailable content and temporary media', async () => {
 const component = path.resolve('src/components/dashboard/ProviderMetaInbox.tsx').replaceAll('\\', '/');
 const result = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ProviderMetaInbox} from '${component}';createRoot(document.getElementById('root')).render(<ProviderMetaInbox isRTL={location.search.includes('rtl')}/>);`, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } });
 const server = http.createServer((req, res) => { res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : 'text/html'); res.end(req.url === '/app.js' ? result.outputFiles[0].contents : '<html><body><div id="root"></div><script src="/app.js"></script></body></html>'); });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 try {
  const page = await browser.newPage(); const messageQueries = [], writes = [], providerRequests = [];
  await page.route('https://zernio.com/**', route => { providerRequests.push(route.request().url()); return route.abort(); });
  await page.route('**/api/inbox**', async route => {
   const req = route.request(); if (req.method() !== 'GET') { writes.push(req.url()); return route.fulfill({ status: 501, json: { error: 'No writes expected' } }); }
   const query = new URL(req.url()).searchParams, action = query.get('action'), account = query.get('accountId');
   if (action === 'accounts') return route.fulfill({ json: { profileId: 'profile-one', accounts: [{ accountId: 'fb', platform: 'facebook', displayName: 'Facebook Page', isActive: true }, { accountId: 'ig', platform: 'instagram', displayName: 'Instagram Page', isActive: true }] } });
   if (action === 'conversations') return route.fulfill({ json: { data: [{ id: `${account}-thread`, participantName: `${account} customer`, threadControl: 'app' }], pagination: { nextCursor: null } } });
   if (action === 'conversation') return route.fulfill({ json: { data: { id: `${account}-thread`, participantName: `${account} customer`, threadControl: 'app' } } });
   if (action === 'thread_control') return route.fulfill({ json: { control: { ownerAppId: null } } });
   messageQueries.push(Object.fromEntries(query));
   const message = n => ({ id: `message-${n}`, message: `History ${n}`, direction: 'incoming', createdAt: `2026-10-19T12:0${n}:00Z` });
   let messages = query.get('cursor') ? [message(2), message(1)] : [message(4), message(3), message(2)];
   if (account === 'ig') messages.reverse();
   if (!query.get('cursor')) messages.push(
    { id: 'hidden', message: '', noRenderableContent: true, attachments: [] },
    { id: 'media', attachments: [{ type: 'file', filename: 'Report.pdf', url: 'https://cdn.example.invalid/signed-snapshot.pdf', refreshUrl: `https://zernio.com/api/v1/inbox/conversations/${account}-thread/messages/media/attachments/0?accountId=${account}` }] },
    { id: 'shared', attachments: [{ type: 'image', originalType: 'unsupported_type', url: 'https://cdn.example.invalid/shared.jpg' }] },
    { id: 'missing', attachments: [{ type: 'file', refreshUrl: 'https://zernio.com/api/v1/inbox/conversations/foreign/messages/file/attachments/0?accountId=foreign' }] }
   );
   return route.fulfill({ json: { messages, sortOrderApplied: account === 'ig' ? 'asc' : 'desc', pagination: { nextCursor: query.get('cursor') ? null : 'opaque-older-cursor' } } });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin);
  for (const account of ['fb', 'ig']) {
   await page.getByLabel('Connected account').selectOption(account); await page.getByRole('button', { name: new RegExp(`^${account} customer`) }).click();
   await page.getByLabel('Message history').getByText('History 4', { exact: true }).waitFor();
   const history = page.getByLabel('Message history');
   assert.deepEqual(await history.locator('article p').filter({ hasText: /^History \d$/ }).allTextContents(), ['History 2', 'History 3', 'History 4']);
   await page.getByRole('button', { name: 'More messages', exact: true }).click();
   await history.getByText('History 1', { exact: true }).waitFor();
   assert.deepEqual(await history.locator('article p').filter({ hasText: /^History \d$/ }).allTextContents(), ['History 1', 'History 2', 'History 3', 'History 4']);
   assert.equal(await history.getByText('History 2', { exact: true }).count(), 1);
   const native = account === 'fb' ? 'Messenger' : 'Instagram';
   await history.getByText(`Meta does not make this message's content available here. Open the conversation in ${native}.`, { exact: true }).waitFor();
   await history.getByText(`Meta cannot renew this shared file link after it expires. Open the conversation in ${native} if it stops working.`, { exact: true }).waitFor();
   assert.equal(await history.getByRole('link', { name: 'Report.pdf', exact: true }).getAttribute('href'), 'https://cdn.example.invalid/signed-snapshot.pdf');
   assert.equal(await history.getByRole('link').count(), 2); await history.getByText('The attachment link is unavailable here.', { exact: true }).waitFor();
   assert.equal(await history.locator('a[href*="zernio.com"]').count(), 0);
  }
  assert.ok(messageQueries.every(query => query.sortOrder === 'desc'));
  assert.equal(messageQueries.filter(query => query.cursor === 'opaque-older-cursor').length, 2);
  assert.equal(writes.length, 0); assert.equal(providerRequests.length, 0);
  await page.goto(origin + '/?rtl'); await page.getByLabel('Connected account').selectOption('fb'); await page.getByRole('button', { name: /^fb customer/ }).click();
  await page.getByText('لا تتيح Meta محتوى هذه الرسالة هنا. افتح المحادثة في Messenger.', { exact: true }).waitFor();
  assert.equal(await page.getByTestId('meta-inbox').getAttribute('dir'), 'rtl');
 } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
