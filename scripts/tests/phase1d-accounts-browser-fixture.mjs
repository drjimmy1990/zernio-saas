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
sources.component = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/dashboard/ProviderAccountsPanel.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
sources.wizard = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/dashboard/ConnectionWizardModal.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const page = `<!doctype html><html><head><meta charset="utf-8"><title>Isolated WhatsApp onboarding browser fixture</title></head><body><div id="root"></div><script>
const sources=${JSON.stringify(sources).replace(/</g, '\u003c')};
const modules={};
function require(name){
  if(name==='@/i18n/ThemeAndLocaleProvider')return {useThemeAndLocale:()=>({locale:'en'})};
  if(name==='@/i18n/dictionaries')return {getLocalizedText:(locale,value)=>value.en};
  if(name==='@/types/platform')return {ALL_SOCIAL_PLATFORMS:['facebook']};
  if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});
  if(modules[name])return modules[name].exports;
  if(!sources[name])throw new Error('Unexpected browser dependency '+name);
  const module={exports:{}};modules[name]=module;
  new Function('require','module','exports',sources[name])(require,module,module.exports);return module.exports;
}
window.renderFixture=()=>require('react-dom/client').createRoot(document.getElementById('root')).render(require('react').createElement(location.search.includes('wizard')?require('wizard').ConnectionWizardModal:require('component').ProviderAccountsPanel,location.search.includes('wizard')?{isOpen:true,initialPlatform:'facebook',initialStep:location.search.includes('complete')?4:2,initialAccount:{id:'a',accountId:'a',platform:'facebook',displayName:'Original Page',username:'page'},onClose:()=>{},onAccountConnected:()=>{}}:{onOpenConnectionWizard:(platform,account)=>window.selectedReconnect={platform,account}}));
window.renderFixture();
</script></body></html>`;
let state = { failHealth: false, failDisconnect: true, empty: false, deletes: [] };
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (req.url === '/' || req.url === '/?wizard' || req.url === '/?wizard-complete') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(page); }
  if (req.url === '/__fixture/state') return send(200, state);
  if (req.url === '/__fixture/scenario') { Object.assign(state, body); return send(200, state); }
  if(req.url === '/api/connect'){state.oauth=body;return send(503,{error:'Authorization unavailable'});}
  if (req.url === '/api/accounts' && req.method === 'GET') return state.failHealth ? send(503,{error:'Provider unavailable'}) : send(200,{success:true,accounts:state.empty?[]:[{id:'a',accountId:'a',platform:'facebook',displayName:'Original Page',username:'page',status:'unknown',isActive:true}]});
  if (req.url === '/api/accounts' && req.method === 'POST') {state.deletes.push(body);if(state.failDisconnect)return send(503,{success:false,error:'Disconnection unconfirmed'});state.empty=true;return send(200,{success:true});}
  return send(501,{error:'Unmodeled request'});
});
server.listen(4958,'127.0.0.1',()=>console.log('Browser fixture http://127.0.0.1:4958'));
