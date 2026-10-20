import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Serve the actual onboarding component and React in an isolated browser.
// This API fixture models dashboard responses only; provider HTTP is separately
// exercised by phase1b-provider-http.test.mjs and Postman simulation.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sources = Object.fromEntries(Object.entries({
  react: 'node_modules/react/cjs/react.production.js',
  'react/jsx-runtime': 'node_modules/react/cjs/react-jsx-runtime.production.js',
  scheduler: 'node_modules/scheduler/cjs/scheduler.production.js',
  'react-dom': 'node_modules/react-dom/cjs/react-dom.production.js',
  'react-dom/client': 'node_modules/react-dom/cjs/react-dom-client.production.js',
}).map(([key, file]) => [key, fs.readFileSync(path.join(root, file), 'utf8')]));
sources.component = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/dashboard/WhatsAppNumberOnboarding.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const page = `<!doctype html><html><head><meta charset="utf-8"><title>Isolated WhatsApp onboarding browser fixture</title></head><body><div id="root"></div><script>
const sources=${JSON.stringify(sources).replace(/</g, '\u003c')};
const modules={};
function require(name){
  if(name==='@/i18n/ThemeAndLocaleProvider')return {useThemeAndLocale:()=>({locale:'en'})};
  if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});
  if(modules[name])return modules[name].exports;
  if(!sources[name])throw new Error('Unexpected browser dependency '+name);
  const module={exports:{}};modules[name]=module;
  new Function('require','module','exports',sources[name])(require,module,module.exports);return module.exports;
}
window.renderFixture=()=>require('react-dom/client').createRoot(document.getElementById('root')).render(require('react').createElement(require('component').WhatsAppNumberOnboarding,{organizationId:'tenant-a'}));
window.renderFixture();
</script></body></html>`;
let state = { scenario: 'payment', purchases: [], numbers: [] };
const countries = [
  { country: 'US', countryName: 'United States', types: [{ numberType: 'local', monthlyCents: 300, needsKyc: false, whatsappAvailable: true, smsAvailable: true, inStock: true }] },
  { country: 'DE', countryName: 'Germany', types: [{ numberType: 'local', monthlyCents: 300, needsKyc: true, whatsappAvailable: true, smsAvailable: false, inStock: false, fulfilment: 'request' }] },
];
const available = { id: 'available-number', phoneNumber: '+14155550100', country: 'US', type: 'local', monthlyPriceUsd: 3, needsKyc: false, capabilities: { sms: true, voice: true, whatsapp: true } };
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(page); }
  if (req.url === '/__fixture/reset') { state = { scenario: body.scenario || 'payment', purchases: [], numbers: [] }; return send(200, state); }
  if (req.url === '/__fixture/scenario') { state.scenario = body.scenario; return send(200, state); }
  if (req.url === '/__fixture/state') return send(200, state);
  if (req.url === '/api/services') {
    if (body.action === 'search_numbers') return send(200, { countries, results: body.country === 'DE' ? [] : [available] });
    if (body.action === 'list_numbers') return send(200, { numbers: state.numbers });
    if (body.action === 'buy_number') {
      state.purchases.push(body);
      if (state.scenario === 'payment') return send(402, { error: 'Payment method required', code: 'PAYMENT_REQUIRED' });
      if (state.scenario === 'unavailable') return send(409, { error: 'Selected number unavailable', code: 'PHONE_NUMBER_UNAVAILABLE' });
      if (state.scenario === 'price-changed') return send(409, { error: 'Price changed', code: 'PRICE_CHANGED', details: { monthlyCents: 400 } });
      if (state.scenario === 'kyc') return send(202, { status: 'kyc_required', message: 'Complete identity verification', kycUrl: 'https://zernio.com/kyc/isolated' });
      const number = { id: 'owned-number', phoneNumber: available.phoneNumber, country: 'US', type: 'local', status: 'active', whatsappLinked: false };
      state.numbers = [number];
      return send(200, { success: true, status: 'active', message: 'Number active. Continue with Meta.', phoneNumber: number });
    }
  }
  return send(501, { error: 'Fixture does not model this call' });
});
server.listen(Number(process.env.PHASE1B_BROWSER_PORT || 4954), '127.0.0.1', () => console.log(`Browser fixture http://127.0.0.1:${server.address().port}`));
