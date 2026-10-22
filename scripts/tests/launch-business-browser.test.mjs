import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import test, { before, after } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

let server, browser, origin;
const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',contactId='99999999-9999-4999-8999-999999999999';
before(async()=>{
 const absolute=file=>path.resolve(file).replaceAll('\\','/');
 const entry=`import React from 'react';import{createRoot}from'react-dom/client';import Admin from '${absolute('src/app/admin/page.tsx')}';import Landing from '${absolute('src/app/page.tsx')}';import Docs from '${absolute('src/app/docs/page.tsx')}';import Dashboard from '${absolute('src/app/dashboard/page.tsx')}';import{ThemeAndLocaleProvider,useThemeAndLocale}from'${absolute('src/i18n/ThemeAndLocaleProvider.tsx')}';localStorage.setItem('asra3_locale',location.search.includes('rtl')?'ar':'en');function Fixture(){const{setLocale}=useThemeAndLocale();return <><button onClick={()=>setLocale('ar')}>Use Arabic</button><button onClick={()=>setLocale('en')}>Use English</button>{location.pathname==='/admin'?<Admin/>:location.pathname==='/docs'?<Docs/>:location.pathname==='/landing'?<Landing/>:<Dashboard/>}</>};createRoot(document.getElementById('root')).render(<ThemeAndLocaleProvider><Fixture/></ThemeAndLocaleProvider>);`;
 const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'local-next-navigation',setup(b){b.onResolve({filter:/^next\/(navigation|link)$/},a=>({path:a.path,namespace:'fixture-next'}));b.onLoad({filter:/.*/,namespace:'fixture-next'},a=>({loader:'jsx',resolveDir:process.cwd(),contents:a.path.endsWith('navigation')?`const router={push:(url)=>window.__redirect=url,replace:(url)=>history.replaceState(null,'',url)};export function useRouter(){return router}export function useSearchParams(){return new URLSearchParams(location.search)}`:`import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`}));}}]});
 const css=(await postcss([tailwind()]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.resolve('src/app/globals.css')})).css;
 server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':req.url==='/app.css'?'text/css':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:req.url==='/app.css'?css:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><main id="root" style="padding:20px;max-width:1200px;margin:auto"></main><script src="/app.js"></script></body></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;browser=await chromium.launch({channel:'chrome',headless:true});fs.mkdirSync('docs/reviews/screenshots',{recursive:true});
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});

async function fixture({rtl=false,role='owner',authenticated=true,surface='dashboard'}={}){
 const context=await browser.newContext({viewport:{width:rtl?390:1280,height:rtl?844:1000}}),page=await context.newPage(),writes=[],reads=[],errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const customer={id:contactId,organization_id:org,display_name:'Mariam Hassan',company:'Hassan Boutique',phones:['+201234567890'],phone:'+201234567890',emails:[],tags:['VIP'],identities:[{platform:'instagram',handle:'@mariam'}],notes:[],custom_fields:{},consents:[],inbox_links:[],revision:1,status:'customer'};
 const state={role,contacts:[customer],campaigns:[],failure:false};
 const accounts=[{_id:'ig-one',id:'ig-one',accountId:'ig-one',platform:'instagram',username:'Boutique Instagram',displayName:'Boutique Instagram',isActive:true,enabled:true,metadata:{loginMethod:'fb_login'}},{_id:'wa-one',accountId:'wa-one',platform:'whatsapp',username:'Business WhatsApp',displayName:'Business WhatsApp',isActive:true}];
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());assert.equal(url.origin,origin,'All browser traffic remains in local fixtures');
  if(!url.pathname.startsWith('/api/'))return route.continue();
  reads.push(url.pathname+url.search);
  const body=req.method()==='POST'?req.postDataJSON():null;if(body)writes.push({path:url.pathname,...body});
  const fulfill=(json,status=200)=>route.fulfill({status,json});
  if(url.pathname==='/api/auth')return fulfill({authenticated,session:authenticated?{user:{id:role==='super_admin'?'usr_super_admin':'owner',role},tenant:{organizationId:org}}:null});
  if(url.pathname==='/api/admin')return fulfill({globalConfig:{brandName:'Asra3',enabledPlatforms:['facebook','instagram','whatsapp'],enabledAdPlatforms:[],enabledOAuthScopes:[],enabledSubServices:['core_connect','publishing','inbox_crm','analytics','telephony'],enforceHeadlessOAuth:true},plans:[],tenants:[{organizationId:org,organizationName:'Hassan Boutique',status:'active',planKey:'starter',zernioProfileId:'profile-a'}],billingReport:{live:false,zernioTeamTotals:{},tenantRows:[{organizationId:org,organizationName:'Hassan Boutique',zernioProfileId:'profile-a',planKey:'starter',retailRevenueUsd:null,zernioWholesaleUsd:null,grossMarginUsd:null,marginPercent:null}]}});
  if(url.pathname==='/api/services')return fulfill({policy:{organizationId:org,organizationName:'Hassan Boutique',allowedPlatforms:['facebook','instagram','whatsapp'],enabledSubServices:['core_connect','publishing','inbox_crm','analytics','telephony'],quotas:{maxConnectedAccounts:10}},subServicesData:{core_connect:{accounts},inbox_crm:{data:[]},analytics:null,telephony:{numbers:[]}}});
  if(url.pathname==='/api/crm'){
   if(state.failure)return fulfill({error:{message:'CRM verification unavailable'}},503);
   const resource=url.searchParams.get('resource');
   if(body)return fulfill({organizationId:org,role:state.role});
   const base={organizationId:org,role:state.role};
   if(resource==='fields')return fulfill({...base,fields:[]});
   if(resource==='audiences')return fulfill({...base,audiences:[{id:'saved-audience',name:'VIP customers',contact_ids:[contactId]}]});
   if(resource==='contact')return fulfill({...base,contact:customer});
   return fulfill({...base,contacts:state.contacts.filter(c=>!url.searchParams.get('search')||c.display_name.toLowerCase().includes(url.searchParams.get('search').toLowerCase())),pagination:{page:1,pages:1,total:1}});
  }
  if(url.pathname==='/api/accounts')return fulfill({success:true,accounts});
  if(url.pathname==='/api/inbox'||url.pathname==='/api/comments'||url.pathname==='/api/meta-settings')return fulfill({profileId:'profile-a',accounts:accounts.filter(a=>a.platform==='instagram'),data:[],comments:[]});
  if(url.pathname==='/api/whatsapp')return fulfill({profileId:'profile-a',accounts:accounts.filter(a=>a.platform==='whatsapp'),data:[],templates:[]});
  if(url.pathname==='/api/phone-lifecycle')return fulfill({organizationId:org,numbers:[],accounts:[]});
  if(url.pathname==='/api/publishing')return fulfill({profileId:'profile-a',posts:[],accounts,pagination:{hasMore:false}});
  if(url.pathname==='/api/reports')return fulfill({role:state.role,report:{platform:url.searchParams.get('platform'),source:'fixture provider',totals:{impressions:10,reach:null},previousTotals:{impressions:5,reach:null},unavailable:false,dataAsOf:null,fetchedAt:'2026-10-20T00:00:00Z',daily:[]}});
  if(url.pathname==='/api/campaigns'){
   if(body?.action==='preview')return fulfill({hash:'stable-reviewed-hash',snapshot:{phones:['+201234567890'],contactIds:[contactId]},excluded:[{contactId:'excluded-contact',reason:'No current WhatsApp marketing consent for a saved phone.'}]});
   if(body?.action==='save'){state.campaigns.push({id:body.id,name:body.name,account_id:body.accountId,contact_ids:body.contactIds,template:body.template,audience_snapshot:{phones:['+201234567890']},audience_hash:body.audienceHash,revision:1,status:'draft',scheduled_at:null,error:null,provider_id:null});return fulfill({ok:true});}
   assert.equal(body,null,'This journey never dispatches or schedules a campaign');return fulfill({campaigns:state.campaigns,role:state.role});
  }
  if(url.pathname==='/api/saas')return fulfill({organizationId:org,role:state.role,tenants:[{organizationId:org,name:'Hassan Boutique'}],workspaces:[{role:state.role,organizations:{id:org,name:'Hassan Boutique',status:'active'}}],members:[],invitations:[],keys:[],allowance:{available_minor:10000,reserved_minor:0,spent_minor:0},capabilities:[],reservations:[],sessions:[]});
  return fulfill({error:'Unmodeled fixture path'},501);
 });
 await page.goto(`${origin}/${surface}${rtl?'?rtl':''}`);if(authenticated&&surface==='dashboard')await page.getByRole('heading',{name:rtl?'مساحة عملك':'Your workspace',exact:true}).waitFor();
 return {context,page,writes,reads,errors,state};
}

test('authenticated customer navigation joins durable CRM, reviewed campaign draft, honest reports and inbox tools',async()=>{
 const{context,page,writes,reads,errors}=await fixture();try{
 const nav=page.getByRole('navigation',{name:'Business tasks'});await page.getByRole('button',{name:'Mariam Hassan',exact:false}).click();await page.getByRole('heading',{name:'Mariam Hassan',exact:true}).waitFor();
 await page.screenshot({path:'docs/reviews/screenshots/launch-business-desktop.png',fullPage:true});
 await nav.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByLabel('Campaign name').fill('VIP update');await page.getByLabel('Approved template name').fill('order_update');await page.getByLabel('Saved audience (optional)').selectOption('saved-audience');await page.getByLabel('Find a contact').fill('Mariam');await page.getByRole('button',{name:'Search',exact:true}).click();assert.ok(reads.some(url=>url.includes('search=Mariam')));
 await page.getByRole('button',{name:'Review audience',exact:true}).click();await page.getByText('Excluded: No current WhatsApp marketing consent for a saved phone.').waitFor();const review=page.getByLabel('I reviewed the recipients, template and customer consent.');await review.check();await page.getByLabel('Approved template name').fill('updated_template');assert.equal(await review.isChecked(),false);assert.equal(await page.getByRole('button',{name:'Save draft',exact:true}).isDisabled(),true);await review.check();await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('heading',{name:'VIP update',exact:true}).waitFor();assert.equal(writes.filter(write=>write.path==='/api/campaigns'&&write.action==='save').length,1);assert.equal(writes.some(write=>['send','schedule'].includes(write.action)),false);
 await nav.getByRole('button',{name:'Reports',exact:true}).click();await page.getByRole('button',{name:'View report',exact:true}).click();await page.getByRole('cell',{name:'Unavailable',exact:true}).first().waitFor();assert.ok(await page.getByText('The platform does not provide a last-sync timestamp.').isVisible());assert.ok((await page.getByRole('link',{name:'Download CSV'}).getAttribute('href')).includes('format=csv'));
 await nav.getByRole('button',{name:'Inbox',exact:true}).click();const inbox=page.getByRole('navigation',{name:'Inbox and contacts'});await page.getByRole('heading',{name:'Customer messages'}).waitFor();await inbox.getByRole('button',{name:'Comments',exact:true}).click();await page.getByRole('heading',{name:'Customer comments'}).waitFor();await inbox.getByRole('button',{name:'Contacts',exact:true}).click();await page.getByRole('button',{name:'Mariam Hassan',exact:false}).waitFor();await inbox.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('heading',{name:'VIP update',exact:true}).waitFor();await inbox.getByRole('button',{name:'Automations — Coming soon',exact:true}).click();await page.getByRole('heading',{name:'Automations are coming soon'}).waitFor();
 await nav.getByRole('button',{name:'Team and settings',exact:true}).click();await page.getByRole('heading',{name:'Workspace and security'}).waitFor();await page.getByText('Payments, top-ups and paid upgrades: Coming soon',{exact:true}).waitFor();await page.getByRole('radio',{name:'Advanced Pro',exact:true}).click();await page.getByRole('button',{name:'Inbox and contacts',exact:true}).click();await page.getByRole('navigation',{name:'Inbox and contacts'}).getByRole('button',{name:'Contacts',exact:true}).click();await page.getByRole('button',{name:'Mariam Hassan',exact:false}).waitFor();assert.deepEqual(errors,[]);
 }finally{await context.close();}
});

test('Arabic390 dashboard tasks and mounted CRM follow locale changes without page overflow',async()=>{
 const{context,page,errors}=await fixture({rtl:true});try{
 const nav=page.getByRole('navigation',{name:'مهام العمل'});await page.getByRole('button',{name:'عميل جديد',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'docs/reviews/screenshots/launch-business-mobile-rtl.png',fullPage:true});await page.getByRole('button',{name:'Use English',exact:true}).click();await page.getByRole('button',{name:'New customer',exact:true}).waitFor();await page.getByRole('button',{name:'Use Arabic',exact:true}).click();await page.getByRole('button',{name:'عميل جديد',exact:true}).waitFor();
 await nav.getByRole('button',{name:'الرسائل',exact:true}).click();const inbox=page.getByRole('navigation',{name:'المحادثات والعملاء'});await inbox.getByRole('button',{name:'العملاء',exact:true}).click();await page.getByRole('button',{name:'عميل جديد',exact:true}).waitFor();await inbox.getByRole('button',{name:'الحملات',exact:true}).click();await page.getByRole('heading',{name:'حملات واتساب'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await nav.getByRole('button',{name:'التقارير',exact:true}).click();await page.getByRole('button',{name:'عرض التقرير',exact:true}).click();await page.getByRole('cell',{name:'غير متاح',exact:true}).first().waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'docs/reviews/screenshots/launch-business-reports-mobile-rtl.png',fullPage:true});assert.deepEqual(errors,[]);
 }finally{await context.close();}
});

test('verified viewer cannot create CRM/campaigns; missing session redirects before business data loads',async()=>{
 const viewer=await fixture({role:'viewer'});try{assert.equal(await viewer.page.getByRole('button',{name:'New customer',exact:true}).count(),0);await viewer.page.getByRole('navigation',{name:'Business tasks'}).getByRole('button',{name:'Campaigns',exact:true}).click();await viewer.page.getByText('You can view campaigns.',{exact:false}).waitFor();assert.equal(await viewer.page.getByRole('button',{name:'New campaign',exact:true}).isDisabled(),true);assert.equal(viewer.writes.length,0);}finally{await viewer.context.close();}
 const anonymous=await fixture({authenticated:false});try{await anonymous.page.waitForFunction(()=>window.__redirect==='/login?redirect=/dashboard');assert.equal(anonymous.reads.some(url=>url.startsWith('/api/crm')||url.startsWith('/api/services')),false);}finally{await anonymous.context.close();}
});
test('administrator mounts spending allocations and unobserved cost stays unavailable; legacy mint is disabled',async()=>{
 const{context,page,writes,errors}=await fixture({surface:'admin',role:'super_admin'});try{await page.getByRole('button',{name:'Spending allocations',exact:true}).click();await page.getByRole('heading',{name:'Administrator provider allowances',exact:true}).waitFor();await page.getByLabel('Customer workspace').selectOption(org);await page.getByText('Message ceilings are administrator allocations, not provider quotes. Unknown costs remain reserved.').waitFor();await page.getByRole('button',{name:'4. Revenue & Costs',exact:true}).click();await page.getByRole('cell',{name:'Unavailable',exact:true}).first().waitFor();await page.getByRole('button',{name:'3. Accounts & API Keys',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Generate API Key',exact:true}).isDisabled(),true);assert.equal(writes.length,0);assert.deepEqual(errors,[]);await page.screenshot({path:'docs/reviews/screenshots/launch-admin-tenant-readonly.png',fullPage:true});}finally{await context.close();}
});
test('public EN and Arabic390 copy shows Starter pricing while payment collection and registration remain coming soon',async()=>{
 for(const rtl of[false,true]){const{context,page,errors,writes}=await fixture({surface:'landing',rtl});try{await page.getByRole('heading',{name:rtl?'Starter: ‏20 دولاراً شهرياً':'Starter: $20 per month',exact:true}).waitFor();assert.equal(await page.locator('a[href*="signup?plan="]').count(),0);assert.ok(await page.getByText(rtl?'الإعلانات والتجارة والأتمتة — قريباً':'Advertising, commerce and automation — Coming soon',{exact:true}).isVisible());const text=await page.locator('body').innerText();assert.ok(text.includes(rtl?'جمع المدفوعات والتسجيل العام — قريباً':'Payment collection and public registration are coming soon.'));assert.equal(text.includes('published_synced'),false);assert.equal(text.includes('@asra3/node'),false);assert.equal(writes.length,0);assert.deepEqual(errors,[]);await page.screenshot({path:`docs/reviews/screenshots/launch-landing-${rtl?'mobile-rtl':'desktop'}.png`,fullPage:true});}finally{await context.close();}}
 const{context,page,writes}=await fixture({surface:'docs'});try{await page.getByText('Resource catalog — launch availability varies',{exact:true}).waitFor();await page.getByText('Durable manual contacts use /api/crm',{exact:false}).waitFor();await page.getByRole('button',{name:'Click-to-WhatsApp (CTWA)',exact:false}).click();await page.getByText('Unavailable — this is a catalog description. Live execution is not available in this launch.').waitFor();assert.equal(writes.length,0);}finally{await context.close();}
});
