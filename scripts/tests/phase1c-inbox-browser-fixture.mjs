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
sources.broadcast = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/dashboard/wizards/ThreeStepBroadcastWizard.tsx'), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
sources.component = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/dashboard/ProviderWhatsAppInbox.tsx'), 'utf8'), {
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
window.renderFixture=()=>require('react-dom/client').createRoot(document.getElementById('root')).render(require('react').createElement(location.search.includes('broadcast')?require('broadcast').ThreeStepBroadcastWizard:require('component').ProviderWhatsAppInbox,location.search.includes('broadcast')?{isOpen:true,onClose:()=>{}}:{}));
window.renderFixture();
</script></body></html>`;
let state = { sends: [], failSend: true, failRefresh: false, creates:0,adds:0,dispatches:0,failAdd:true };
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (req.url === '/' || req.url === '/?broadcast') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(page); }
  if (req.url === '/__fixture/state') return send(200, state);
  if (req.url === '/__fixture/scenario') { Object.assign(state, body); return send(200, state); }
  const url = new URL(req.url, 'http://localhost');
  const action = body.action || url.searchParams.get('action');
  const account = body.accountId || url.searchParams.get('accountId');
  if (action === 'accounts') return send(200, { accounts: [{accountId:'a',displayName:'Existing',isActive:true},{accountId:'b',displayName:'Purchased',isActive:true},{accountId:'c',displayName:'Disconnected',isActive:false}] });
  if (action === 'templates') return send(200, { templates: [{name:'approved',language:'en_US',status:'APPROVED',components:[{type:'BODY',text:'Hello'}]},{name:'pending',language:'en_US',status:'PENDING'}] });
  if (action === 'conversations') { if(account==='a') await new Promise(resolve=>setTimeout(resolve,250)); return send(200,{data:[{id:account+'1',participantName:account==='a'?'Alice':'Bob'}]}); }
  if (action === 'messages') {
    if (state.failRefresh) return send(503,{error:'Refresh unavailable'});
    return send(200,{messages:['sent','delivered','read','failed'].map((deliveryStatus,index)=>({id:'m'+index,message:'Receipt '+deliveryStatus,direction:'outgoing',deliveryStatus,createdAt:'2026-10-19T00:00:00Z'}))});
  }
  if(action==='create_broadcast'){state.creates++;return send(200,{broadcast:{id:'bc_real',status:'draft'}})}
  if(action==='add_broadcast_recipients'){state.adds++;return state.failAdd?send(503,{error:'Add unavailable'}):send(200,{added:1,skipped:0})}
  if(action==='get_broadcast')return send(200,{broadcast:{id:'bc_real',status:'draft',recipientCount:state.failAdd?0:1}});
  if(action==='send_broadcast'){state.dispatches++;return send(200,{status:'sending',sent:0,failed:0,recipientCount:1})}
  if (action === 'send') { state.sends.push(body); if(state.failSend)return send(503,{error:'Outcome uncertain'}); return send(200,{success:true}); }
  if (action === 'mark_read') return send(200,{success:true});
  return send(501,{error:'Fixture does not model this call'});
});
server.listen(Number(process.env.PHASE1C_BROWSER_PORT || 4955), '127.0.0.1', () => console.log(`Browser fixture http://127.0.0.1:${server.address().port}`));
