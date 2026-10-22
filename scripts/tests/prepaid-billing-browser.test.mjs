import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import test,{before,after} from 'node:test';
import {build} from 'esbuild';
import {chromium} from 'playwright';
let server,browser,origin;
before(async()=>{const abs=f=>path.resolve(f).replaceAll('\\','/');const entry=`import React from 'react';import{createRoot}from'react-dom/client';import{PrepaidBillingWorkspace}from'${abs('src/components/dashboard/PrepaidBillingWorkspace.tsx')}';import{ThemeAndLocaleProvider}from'${abs('src/i18n/ThemeAndLocaleProvider.tsx')}';createRoot(document.getElementById('root')).render(<ThemeAndLocaleProvider fixedLocale={location.search.includes('ar')?'ar':'en'}><PrepaidBillingWorkspace/></ThemeAndLocaleProvider>);`;const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic'});server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:'<!doctype html><div id="root"></div><script src="/app.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;browser=await chromium.launch({channel:'chrome',headless:true});});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
test('prepaid subscription previews exact extras and requires reviewed recurring terms in EN and AR',async()=>{
for(const locale of ['en','ar']){const context=await browser.newContext(),page=await context.newPage(),writes=[];try{await context.route('**/*',route=>{const url=new URL(route.request().url());assert.equal(url.origin,origin);if(url.pathname!=='/api/billing')return route.continue();if(route.request().method()==='POST'){writes.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}});}return route.fulfill({json:{organizationId:'org-a',role:'owner',wallet:{availableMinor:10000,heldMinor:0,spentMinor:0},subscription:null,ledger:[],pricing:{starterMonthlyMinor:2000,extraAccountMonthlyMinor:800},paymentsAvailable:false}});});await page.goto(origin+'/?'+locale);await page.getByLabel('Extra connections').fill('2');await page.getByText(locale==='en'?'Monthly total: $36.00':'الإجمالي الشهري: $36.00',{exact:true}).waitFor();const activate=page.getByRole('button',{name:locale==='en'?'Activate reviewed subscription':'تفعيل الاشتراك بعد المراجعة'});assert.equal(await activate.isDisabled(),true);await page.getByRole('checkbox').check();await activate.click();assert.deepEqual(writes,[{action:'subscribe',extraAccounts:2,termsAccepted:true,organizationId:'org-a'}]);assert.equal(await page.locator('pre').count(),0);assert.equal(await page.getByRole('button',{name:/card|بطاقة/}).count(),0);}finally{await context.close();}}
});

test('refund retries keep their confirmation and workspace binding when browser storage is broken',async()=>{
 const context=await browser.newContext(),page=await context.newPage(),writes=[];
 const refundA={action:'refund',organizationId:'org-a',reservationId:'hold-a',amountMinor:100,reference:'refund-a',confirmed:true,reason:'Reviewed charge'};
 await context.addInitScript(({refund})=>{localStorage.setItem('asra3:wallet-refund:org-a',JSON.stringify(refund));localStorage.setItem('asra3:wallet-credit:org-b','broken-json');},{refund:refundA});
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());assert.equal(url.origin,origin);
  if(url.pathname!=='/api/billing')return route.continue();
  if(request.method()==='POST'){writes.push(request.postDataJSON());return route.fulfill({json:{ok:true}});}
  return route.fulfill({json:{organizationId:url.searchParams.get('organizationId')||'org-a',role:'super_admin',tenants:[{organizationId:'org-a',organizationName:'Workspace A'},{organizationId:'org-b',organizationName:'Workspace B'}],wallet:{availableMinor:1000,heldMinor:0,spentMinor:0},subscription:null,ledger:[],pricing:{starterMonthlyMinor:2000,extraAccountMonthlyMinor:800}}});
 });
 try{
  await page.goto(origin);await page.getByLabel('Billing workspace').selectOption('org-a');
  const refundButton=page.getByRole('button',{name:'Return reviewed amount to wallet'});
  await refundButton.click();await page.getByRole('alert').filter({hasText:'was not confirmed'}).waitFor();
  assert.deepEqual(writes,[refundA]);assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('asra3:wallet-refund:org-a'))),refundA);
  await page.getByLabel('Billing workspace').selectOption('org-b');await page.getByRole('alert').filter({hasText:'Credits and refunds are blocked'}).waitFor();
  assert.equal(await refundButton.isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Replay original confirmed credit'}).isDisabled(),true);assert.equal(writes.length,1);
  await page.evaluate(({refund})=>{localStorage.removeItem('asra3:wallet-credit:org-b');localStorage.setItem('asra3:wallet-refund:org-b',JSON.stringify(refund));},{refund:refundA});
  await page.getByRole('button',{name:'Refresh billing'}).click();await refundButton.click();await page.getByRole('alert').filter({hasText:'does not belong to this workspace'}).waitFor();assert.equal(writes.length,1);
 }finally{await context.close();}
});

test('super-admin actions follow the loaded workspace and uncertain credits retain the original scoped reference',async()=>{
 const context=await browser.newContext(),page=await context.newPage(),writes=[];
 const tenants=[{organizationId:'org-a',organizationName:'Workspace A'},{organizationId:'org-b',organizationName:'Workspace B'}];
 let subscriptionB=null,releaseB,delayB=false,bCreditAttempts=0;
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());assert.equal(url.origin,origin,'No external traffic');
  if(url.pathname!=='/api/billing')return route.continue();
  if(req.method()==='POST'){
   const body=req.postDataJSON();writes.push(body);
   if(body.action==='credit'&&(body.organizationId==='org-a'||++bCreditAttempts===1))return route.fulfill({status:503,json:{error:'Credit outcome unknown. Keep the original reference.'}});
   if(body.action==='subscribe')subscriptionB={status:'payment_due',monthlyMinor:2800,extraAccounts:1,cancelAtPeriodEnd:false};
   return route.fulfill({json:body.action==='credit'?{credited:true}:{ok:true}});
  }
  const organizationId=url.searchParams.get('organizationId')||'org-a';
  if(organizationId==='org-b'&&delayB){delayB=false;await new Promise(resolve=>{releaseB=resolve;});}
  return route.fulfill({json:{organizationId,role:'super_admin',tenants,wallet:{availableMinor:organizationId==='org-a'?1000:7000,heldMinor:0,spentMinor:0},subscription:organizationId==='org-b'?subscriptionB:null,ledger:[],pricing:{starterMonthlyMinor:2000,extraAccountMonthlyMinor:800},paymentsAvailable:false}});
 });
 try{
  await page.goto(origin);await page.getByLabel('Billing workspace').selectOption('org-a');await page.getByLabel('Credit dollars').fill('10');await page.getByLabel('Payment reference').fill('receipt-a');await page.getByLabel('Receipt note').fill('Verified A receipt');await page.getByRole('checkbox',{name:'I verified that this payment was received'}).check();await page.getByRole('button',{name:'Record confirmed credit',exact:true}).click();await page.getByRole('alert').filter({hasText:'Credit outcome unknown'}).waitFor();
  const creditA=writes[0];assert.equal(creditA.organizationId,'org-a');assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('asra3:wallet-credit:org-a'))).paymentReference,'receipt-a');
  delayB=true;await page.getByLabel('Billing workspace').selectOption('org-b');await page.waitForFunction(()=>!document.querySelector('[aria-label="Credit dollars"]'));
  assert.equal(await page.getByRole('button',{name:'Activate reviewed subscription'}).count(),0);assert.equal(await page.getByRole('button',{name:'Replay original confirmed credit'}).count(),0);assert.equal(writes.length,1);
  while(!releaseB)await new Promise(resolve=>setTimeout(resolve,5));releaseB();await page.getByLabel('Credit dollars').waitFor();assert.equal(await page.getByRole('button',{name:'Replay original confirmed credit'}).count(),0);
  await page.getByLabel('Extra connections').fill('1');await page.getByRole('checkbox',{name:'I agree to this recurring monthly price charged in advance from my balance'}).check();await page.getByRole('button',{name:'Activate reviewed subscription'}).click();await page.getByRole('button',{name:'Retry due renewal'}).waitFor();assert.equal(writes.at(-1).action,'subscribe');assert.equal(writes.at(-1).organizationId,'org-b');
  await page.getByRole('button',{name:'Retry due renewal'}).click();await page.getByRole('button',{name:'Record confirmed credit',exact:true}).waitFor();assert.equal(writes.at(-1).action,'renew');assert.equal(writes.at(-1).organizationId,'org-b');
  await page.getByLabel('Credit dollars').fill('25');await page.getByLabel('Payment reference').fill('receipt-b-original');await page.getByLabel('Receipt note').fill('Verified B receipt');await page.getByRole('checkbox',{name:'I verified that this payment was received'}).check();await page.getByRole('button',{name:'Record confirmed credit',exact:true}).click();await page.getByRole('alert').filter({hasText:'Credit outcome unknown'}).waitFor();
  const originalB=writes.at(-1);assert.equal(originalB.organizationId,'org-b');assert.equal(originalB.amountMinor,2500);assert.equal(originalB.paymentReference,'receipt-b-original');
  await page.getByLabel('Credit dollars').fill('99');await page.getByLabel('Payment reference').fill('replacement-must-not-send');await page.getByLabel('Receipt note').fill('Changed form');await page.getByRole('button',{name:'Refresh billing'}).click();await page.getByRole('button',{name:'Replay original confirmed credit'}).waitFor();await page.getByRole('button',{name:'Replay original confirmed credit'}).click();await page.getByRole('button',{name:'Record confirmed credit',exact:true}).waitFor();
  assert.deepEqual(writes.at(-1),originalB);assert.equal(writes.filter(w=>w.action==='credit'&&w.organizationId==='org-b').length,2);assert.ok(writes.slice(1).every(w=>w.organizationId==='org-b'));assert.equal(await page.evaluate(()=>localStorage.getItem('asra3:wallet-credit:org-b')),null);assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('asra3:wallet-credit:org-a'))).paymentReference,'receipt-a');
 }finally{releaseB?.();await context.close();}
});
