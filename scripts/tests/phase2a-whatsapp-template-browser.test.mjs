import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

test('template selection previews real content, explains order and clears values from a previous template in both languages', async () => {
  const source = name => path.resolve(name).replaceAll('\\', '/');
  const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ThemeAndLocaleProvider} from '${source('src/i18n/ThemeAndLocaleProvider.tsx')}';import {ProviderWhatsAppInbox} from '${source('src/components/dashboard/ProviderWhatsAppInbox.tsx')}';createRoot(document.getElementById('root')).render(<ThemeAndLocaleProvider fixedLocale={new URLSearchParams(location.search).get('locale')}><ProviderWhatsAppInbox/></ThemeAndLocaleProvider>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } });
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/fixture.js' ? 'application/javascript' : 'text/html');
    res.end(req.url === '/fixture.js' ? bundle.outputFiles[0].contents : '<html><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const locale of ['en', 'ar']) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const sends = [], errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/whatsapp**', route => {
        const req = route.request(), input = req.method() === 'POST' ? req.postDataJSON() : Object.fromEntries(new URL(req.url()).searchParams);
        let json = {};
        if (input.action === 'accounts') json = { profileId: 'profile-fixture', accounts: [{ accountId: 'account-fixture', displayName: 'Test business', isActive: true }] };
        else if (input.action === 'conversations') json = { data: [{ id: 'conversation-fixture', participantName: 'Test customer' }] };
        else if (input.action === 'messages') json = { messages: [] };
        else if (input.action === 'templates') json = { templates: [
          { name: 'order_tracking', language: 'en', status: 'APPROVED', components: [{ type: 'HEADER', format: 'TEXT', text: 'Hello {{1}}' }, { type: 'BODY', text: 'Your order {{1}} is ready.' }] },
          { name: 'static_notice', language: 'en', status: 'APPROVED', components: [{ type: 'BODY', text: 'Your order has arrived.' }] },
        ] };
        else if (input.action === 'send') { sends.push(input); json = { success: true, data: { messageId: 'fixture-message' } }; }
        return route.fulfill({ json });
      });
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/?locale=${locale}`);
        await page.getByLabel(locale === 'ar' ? 'حساب واتساب المتصل' : 'Connected WhatsApp account').selectOption('account-fixture');
        await page.getByRole('button', { name: 'Test customer', exact: true }).click();
        const selector = page.getByLabel(locale === 'ar' ? 'قالب معتمد اختياري (قوالب النص)' : 'Approved template (text templates)');
        const variables = page.getByLabel(locale === 'ar' ? 'قيم المتغيرات: سطر لكل قيمة بالترتيب' : 'Template variables: one value per line in order');
        await selector.selectOption('order_tracking:en');
        await page.getByText('Hello {{1}}\nYour order {{1}} is ready.', { exact: true }).waitFor();
        await page.getByText(locale === 'ar' ? /ابدأ بمتغيرات العنوان/ : /Enter header values first/).waitFor();
        await variables.fill('Ana\nORDER-42');
        await selector.selectOption('static_notice:en');
        assert.equal(await variables.inputValue(), '');
        await page.getByRole('button', { name: locale === 'ar' ? 'إرسال' : 'Send', exact: true }).click();
        await page.getByText(locale === 'ar' ? /قبل المزود الطلب/ : /Provider accepted the request/).waitFor();
        assert.equal(sends.length, 1);
        assert.equal(sends[0].templateName, 'static_notice');
        assert.deepEqual(sends[0].templateParams, []);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
