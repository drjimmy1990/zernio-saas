import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import test, { before, after } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';

let server, browser, origin;
before(async () => {
  const absolute = file => path.resolve(file).replaceAll('\\', '/');
  const entry = `import React from 'react';import{createRoot}from'react-dom/client';import Login from '${absolute('src/app/login/page.tsx')}';import Admin from '${absolute('src/app/admin/page.tsx')}';import Dashboard from '${absolute('src/app/dashboard/page.tsx')}';import{ThemeAndLocaleProvider}from'${absolute('src/i18n/ThemeAndLocaleProvider.tsx')}';localStorage.setItem('asra3_locale','en');createRoot(document.getElementById('root')).render(<ThemeAndLocaleProvider>{location.pathname==='/login'?<Login/>:location.pathname==='/admin'?<Admin/>:<Dashboard/>}</ThemeAndLocaleProvider>);`;
  const bundle = await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'local-navigation',setup(b){
    b.onResolve({filter:/^next\/(navigation|link)$/},a=>({path:a.path,namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',resolveDir:process.cwd(),contents:a.path.endsWith('navigation')?`const router={push:url=>window.__redirect=url,replace:url=>window.__redirect=url};export function useRouter(){return router}export function useSearchParams(){return new URLSearchParams(location.search)}`:`import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`}));
  }}]});
  server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:'<!doctype html><main id="root"></main><script src="/app.js"></script>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:'chrome',headless:true});
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});

test('actual login sends administrators to admin and preserves safe customer redirects', async()=>{
  for(const [role,redirect,target] of [['super_admin','/dashboard','/admin'],['owner','/dashboard?tab=publishing','/dashboard?tab=publishing'],['owner','https://foreign.invalid','/dashboard']]){
    const context=await browser.newContext(),page=await context.newPage();
    try{
      await context.route('**/api/auth',route=>route.fulfill({json:{user:{role}}}));
      await page.goto(`${origin}/login?redirect=${encodeURIComponent(redirect)}`);
      await page.locator('input[type="email"]').fill('dummy@example.invalid');
      await page.locator('input[type="password"]').fill('dummy-local-password');
      await page.locator('button[type="submit"]').click();
      await page.waitForFunction(()=>window.__redirect);
      assert.equal(await page.evaluate(()=>window.__redirect),target);
    }finally{await context.close();}
  }
});

test('actual dashboard redirects administrator before any customer API calls or workspace rendering',async()=>{
  const context=await browser.newContext(),page=await context.newPage(),calls=[];
  try{
    await context.route('**/api/**',async route=>{
      const url=new URL(route.request().url());calls.push(url.pathname+url.search);
      assert.equal(url.pathname,'/api/auth','Customer API must not be fetched');
      await route.fulfill({json:{authenticated:true,session:{user:{id:'usr_super_admin',role:'super_admin'},tenant:{organizationId:'org_admin_platform'}}}});
    });
    await page.goto(`${origin}/dashboard?org=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`);
    await page.waitForFunction(()=>window.__redirect==='/admin');
    await page.waitForTimeout(100);
    assert.deepEqual(calls,['/api/auth?action=session']);
    assert.equal(await page.locator('body').innerText(),'Verifying session...');
  }finally{await context.close();}
});


test('administrator assigns one existing workspace plan only after confirmed save; failures retain current plan', async()=>{
  const context=await browser.newContext(),page=await context.newPage(),writes=[];
  const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let fail=true;
  const snapshot={globalConfig:{enabledPlatforms:[],enabledAdPlatforms:[],enabledOAuthScopes:[],enabledSubServices:[],brandName:'Asra3'},plans:[{planKey:'starter',displayName:'Starter',monthlyPriceUsd:29},{planKey:'agency',displayName:'Agency',monthlyPriceUsd:199}],tenants:[{organizationId:org,organizationName:'Dummy business',planKey:'starter',status:'active'}]};
  try{
    await context.route('**/api/**',async route=>{
      const req=route.request(),url=new URL(req.url());
      if(url.pathname==='/api/auth')return route.fulfill({json:{authenticated:true,session:{user:{role:'super_admin'}}}});
      assert.equal(url.pathname,'/api/admin');
      if(req.method()==='GET')return route.fulfill({json:snapshot});
      writes.push(req.postDataJSON());
      if(fail)return route.fulfill({status:503,json:{error:'Dummy policy unavailable'}});
      snapshot.tenants[0].planKey='agency';return route.fulfill({json:{snapshot}});
    });
    await page.goto(`${origin}/admin`);
    await page.getByRole('button',{name:'3. Accounts & API Keys',exact:true}).click();
    const select=page.getByLabel('Plan for Dummy business'),save=page.getByRole('button',{name:'Save plan',exact:true});
    assert.equal(await page.getByRole('link',{name:'Business sign-in',exact:true}).getAttribute('href'),`/login?redirect=${encodeURIComponent(`/dashboard?org=${org}`)}`);
    assert.equal(await select.inputValue(),'starter');assert.equal(await save.isDisabled(),true);
    await select.selectOption('agency');assert.equal(writes.length,0);
    await save.click();await page.getByText('Dummy policy unavailable',{exact:true}).waitFor();
    assert.equal(snapshot.tenants[0].planKey,'starter');
    assert.equal(await page.getByText('starter',{exact:true}).count(),1);
    fail=false;await save.click();await page.getByText('agency',{exact:true}).waitFor();
    assert.equal(await save.isDisabled(),true);
    assert.deepEqual(writes,[{action:'update_tenant_override',organizationId:org,patch:{planKey:'agency'}},{action:'update_tenant_override',organizationId:org,patch:{planKey:'agency'}}]);
  }finally{await context.close();}
});
