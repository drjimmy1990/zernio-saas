import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { build } from 'esbuild';

test('Conversation control requires review, preserves uncertainty and respects the Instagram connection method', async () => {
 const source = `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{MetaConversationControl}from'${path.resolve('src/components/dashboard/MetaConversationControl.tsx').replaceAll('\\','/')}';function App(){const[c,setC]=useState({id:'thread-one',threadControl:'other'});const[b,setB]=useState(false);return <MetaConversationControl profileId="profile-one" accountId="account-one" conversation={c} platform={location.search?'instagram':'facebook'} loginMethod={location.search.includes('linked')?'facebook_login':undefined} isRTL={false} disabled={b} onBusyChange={setB} onChange={setC}/>;}createRoot(document.getElementById('root')).render(<App/>);`;
 const result = await build({ stdin: { contents: source, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } });
 const server = http.createServer((req,res) => { res.setHeader('Content-Type',req.url === '/app.js' ? 'application/javascript' : 'text/html'); res.end(req.url === '/app.js' ? result.outputFiles[0].contents : '<div id="root"></div><script src="/app.js"></script>'); });
 await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 try {
  const page = await browser.newPage(); const writes = []; let unknown = true;
  await page.route('**/api/messaging-settings', route => { writes.push(route.request().postDataJSON()); return route.fulfill(unknown ? { status: 503, json: { error: { message: 'Provider response interrupted' } } } : { json: { success: true, confirmed: false, pending: true, conversation: { id:'thread-one', threadControl:'other' } } }); });
  await page.route('**/api/inbox?**', route => route.fulfill({ json: { data: { id:'thread-one', threadControl:'other' } } }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const open = () => page.locator('summary').filter({ hasText: 'Who replies to the customer?' }).click();
  await page.goto(origin); await open();
  await page.getByRole('button',{ name:'Reply from Asra3', exact:true }).click(); assert.equal(writes.length,0);
  await page.getByRole('button',{ name:'Confirm control change' }).click(); await page.getByRole('alert').waitFor();
  assert.deepEqual(writes[0],{ action:'thread_control',accountId:'account-one',conversationId:'thread-one',controlAction:'take' });
  await page.reload(); await open(); await page.getByLabel('Pending control request').waitFor(); assert.equal(writes.length,1);
  assert.equal(await page.getByRole('button',{ name:'Reply from Asra3',exact:true }).isDisabled(),true);
  assert.equal(await page.getByRole('button',{ name:'I reviewed the state, finish review' }).isDisabled(),true);
  await page.getByRole('button',{ name:'Refresh reply control' }).click();
  await page.getByRole('button',{ name:'I reviewed the state, finish review' }).click();
  unknown = false; await page.getByRole('button',{ name:'Request reply control',exact:true }).click(); await page.getByRole('button',{ name:'Confirm control change' }).click();
  await page.getByText(/service accepted the request/).waitFor(); assert.equal(writes.length,2); assert.equal(writes[1].controlAction,'request');
  assert.equal(await page.getByLabel('Pending control request').count(),1); assert.equal(await page.getByText('The new reply control is confirmed.').count(),0);
  await page.goto(origin+'/?direct'); await open(); assert.equal(await page.getByRole('button',{ name:'Reply from Asra3',exact:true }).count(),0); assert.equal(await page.getByRole('button',{ name:'Request reply control',exact:true }).count(),0);
  await page.goto(origin+'/?linked'); await open(); assert.equal(await page.getByRole('button',{ name:'Reply from Asra3',exact:true }).count(),1);
 } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
