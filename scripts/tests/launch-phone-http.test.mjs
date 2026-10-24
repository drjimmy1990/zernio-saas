import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test,{before,after} from 'node:test';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'launch-phone-http-')),logFile=path.join(temp,'simulation.ndjson');
let simulation,origin,output='',errors='';
before(async()=>{const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));origin=`http://127.0.0.1:${port}/zernio`;simulation=spawn('postman',['simulation','run','postman/simulations/launch-phone.sim.yaml','--port',String(port),'--output','ndjson','--no-history'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(errors||'Simulation startup timed out')),30000);simulation.on('error',e=>{clearTimeout(timer);reject(e);});simulation.on('exit',code=>{if(!output.includes('"event":"listening"')){clearTimeout(timer);reject(new Error(`Simulation exited ${code}: ${errors}`));}});simulation.stdout.on('data',chunk=>{output+=chunk;fs.writeFileSync(logFile,output);if(output.includes('"event":"listening"')){clearTimeout(timer);resolve();}});simulation.stderr.on('data',chunk=>{errors+=chunk;});});});
after(()=>{if(simulation?.pid){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(simulation.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else simulation.kill('SIGINT');}fs.writeFileSync(logFile,output);const requests=output.split(/\r?\n/).flatMap(line=>{try{const v=JSON.parse(line);return v.event==='request'&&v.path.startsWith('/api/v1/')?[v]:[];}catch{return[];}});console.log(`Phone Postman HTTP evidence: ${requests.length} provider requests; ${logFile}`);});
async function fixture(scenario='success'){assert.equal((await fetch(`${origin}/__fixture/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario})})).status,200);}
async function scenario(scenario){await fetch(`${origin}/__fixture/scenario`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario})});}
async function state(){return(await fetch(`${origin}/__fixture/state`)).json();}
test('regulated offers retain the reviewed catalog and skip the unusable exact-number search',async()=>{
 await fixture('kyc');
 const result=await runtime().numbers.offers('tenant-a','US','local');
 assert.equal(result.availabilityMode,'assigned_after_verification');
 assert.deepEqual(Array.from(result.numbers),[]);
 assert.equal(result.countries[0].types[0].monthlyCents,300);
 assert.match(result.notice,/identity verification/);
 const requests=(await state()).requests;
 assert.ok(requests.some(r=>r.path==='/phone-numbers/countries'));
 assert.equal(requests.some(r=>r.path==='/phone-numbers/available'),false);
 assert.equal(writes(await state()).length,0);
 await assert.rejects(runtime().numbers.offers('tenant-a','US','mobile'),e=>e.status===400);
});
test('instant offers still expose exact-number inventory and the current catalog price',async()=>{
 await fixture();
 const result=await runtime().numbers.offers('tenant-a','US','local');
 assert.equal(result.numbers[0].phoneNumber,'+14155550102');
 assert.equal(result.countries[0].types[0].monthlyCents,300);
 const requests=(await state()).requests;
 assert.equal(requests.filter(r=>r.path==='/phone-numbers/available').length,1);
 assert.equal(writes(await state()).length,0);
});
function runtime({disabled=false,withdrawn=false,storageUnavailable=false,telephonyDisabled=false,incomingSupported=false,connectionFull=false,walletBalance=10000,verifiedTariff=true,allowedPlatforms=['facebook','instagram','whatsapp']}={}){
 const files={'call-settings':'src/lib/phone-lifecycle/call-settings.ts','sms-segments':'src/lib/phone-lifecycle/sms-segments.ts',crmAudience:'src/lib/crm/audience.ts',provider:'src/lib/phone-lifecycle/provider.ts',numbers:'src/lib/phone-lifecycle/numbers.ts',messages:'src/lib/phone-lifecycle/messages.ts',calls:'src/lib/phone-lifecycle/calls.ts',flows:'src/lib/phone-lifecycle/flows.ts',templates:'src/lib/phone-lifecycle/templates.ts',whatsapp:'src/lib/whatsapp/service.ts',saasSend:'src/lib/saas/send.ts',paid:'src/lib/phone-lifecycle/paid.ts',client:'src/lib/zernio/client.ts',accounts:'src/lib/auth/tenant-provider.ts',instagram:'src/lib/publishing/instagram.ts',pricing:'src/lib/billing/pricing.ts',facebook:'src/lib/publishing/facebook.ts'};
 const sources=Object.fromEntries(Object.entries(files).map(([name,file])=>[name,ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText]));
 class TenantAccessError extends Error{constructor(status,message){super(message);this.status=status;}}
 const context=vm.createContext({Buffer,URL,Headers,Request,Response,TextEncoder,TextDecoder,AbortController,setTimeout,clearTimeout,console,process:{env:{ZERNIO_BASE_URL:`${origin}/api/v1`,ZERNIO_API_KEY:'launch_phone_mock_key'}},fetch:(url,options)=>{assert.equal(new URL(url).origin,new URL(origin).origin,'Live network forbidden');if(options?.method==='POST'&&['/api/v1/phone-numbers/purchase','/api/v1/sms/messages'].includes(new URL(url).pathname.replace('/zernio','')))assert.ok(walletHolds.some(h=>h.state==='held'),'Customer balance must be reserved before paid provider dispatch');return fetch(url,options);}});
 const operations=new Map(),reservations=[],settlements=[],releases=[],rentals=[];
 const store={async acquire(org,profile,kind,intent,input){if(storageUnavailable)throw new TenantAccessError(503,'No durable storage');const key=`${kind}:${intent}`,lookup=`${org}:${key}`,old=operations.get(lookup);if(old)return {...old,replayed:true};if(kind==='purchase'&&[...operations.values()].some(o=>o.organization_id===org&&o.profile_id===profile&&o.kind==='purchase'&&['prepared','dispatched','unknown'].includes(o.state)))throw new TenantAccessError(409,'Original purchase unresolved');const o={organization_id:org,operation_key:key,profile_id:profile,kind,input,state:'prepared',reservations:[]};operations.set(lookup,o);return o;},async save(o,patch){Object.assign(o,patch);operations.set(`${o.organization_id}:${o.operation_key}`,o);},async get(org,key){const o=operations.get(`${org}:${key}`);if(!o)throw new TenantAccessError(404,'Not found');return o;},async rental(org,n,state,evidence){rentals.push({org,n,state,evidence});}};
 const allowance={operationKey:parts=>crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex'),async assertCapability(){return{enabled:!disabled};},async reserve(input){if(disabled)throw new TenantAccessError(403,'Spending disabled');const r={...input,reservationId:`reservation-${reservations.length}`,state:'reserved',replayed:false};reservations.push(r);return r;},async reserveUnits(input){return this.reserve({...input,amountMinor:input.units*10,quoteSource:'admin spending allocation, not provider quote'});},async settle(input){settlements.push(input);},async release(input){releases.push(input);}};
 const quotes=new Map(),walletHolds=[],walletSettlements=[],walletReleases=[],customerRentals=[],releasedRentals=[],tariff={id:'route-a',version:'verified-v1',expiresAt:'2099-01-01T00:00:00.000Z',perSegmentUpperBoundProviderMinor:3};
 const binding=value=>JSON.stringify(value),retail=cost=>Math.ceil(cost/0.6);
 const billing={
  async createQuote(p){const q={...p,id:`quote-${quotes.size}`,amountMinor:retail(p.providerCostMinor),currency:'USD',expiresAt:new Date(Date.now()+300000).toISOString(),pricingVersion:'retail-v1'};quotes.set(q.id,q);return q;},
  async verifyQuote(p){const q=quotes.get(p.quoteId);if(!q||q.organizationId!==p.organizationId)throw new TenantAccessError(404,'Unknown quote');if(q.operationKey!==p.operationKey||binding(q.input)!==binding(p.input)||q.providerCostMinor!==p.providerCostMinor||Date.parse(q.expiresAt)<=Date.now()||q.pricingVersion!=='retail-v1')throw new TenantAccessError(409,'Quote changed');return q;},
  async reserveQuote(p){const q=quotes.get(p.quoteId);await this.verifyQuote({...p,providerCostMinor:q?.providerCostMinor});const old=walletHolds.find(h=>h.quoteId===p.quoteId);if(old)return{...old,replayed:true};if(walletBalance<q.amountMinor)throw new TenantAccessError(409,'Insufficient customer balance');walletBalance-=q.amountMinor;const h={...p,reservationId:`wallet-${walletHolds.length}`,amountMinor:q.amountMinor,state:'held',replayed:false};walletHolds.push(h);return h;},
  async settle(p){const h=walletHolds.find(h=>h.reservationId===p.reservationId&&h.organizationId===p.organizationId);assert.ok(h);const amount=Math.min(h.amountMinor,p.retailAmountMinor??retail(p.actualProviderCostMinor));if(h.state==='held'){h.state='settled';h.actualRetailMinor=amount;walletBalance+=h.amountMinor-amount;walletSettlements.push({...p,actualRetailMinor:amount});}return {state:'settled',amountMinor:amount,approvedAmountMinor:h.amountMinor};},
  async release(p){const h=walletHolds.find(h=>h.reservationId===p.reservationId);assert.ok(h);if(h.state==='held'){h.state='released';walletBalance+=h.amountMinor;walletReleases.push(p);}},
  async bindRental(p){if(p.activationStatus!=='active')return;await this.settle({...p,actualProviderCostMinor:p.providerCostMinor,retailAmountMinor:p.monthlyRetailMinor});if(!customerRentals.some(r=>r.numberId===p.numberId))customerRentals.push(p);},
  async releaseRental(p){releasedRentals.push(p);},
  async verifiedSmsTariff(){if(!verifiedTariff)throw new TenantAccessError(503,'No verified route ceiling');return {...tariff};},
  assertIncomingSupported(){if(!incomingSupported)throw new TenantAccessError(501,'Prepaid incoming call cutoff unavailable');}
 };
 const cache={};function load(name){if(cache[name])return cache[name];const module={exports:{}};cache[name]=module.exports;const require=specifier=>{if(specifier==='node:crypto'||specifier==='crypto')return crypto;const alias={'@/lib/zernio/client':'client','@/lib/auth/tenant-provider':'accounts','@/lib/publishing/instagram':'instagram','@/lib/billing/pricing':'pricing','@/lib/publishing/facebook':'facebook','@/lib/whatsapp/service':'whatsapp','@/lib/saas/send':'saasSend','@/lib/crm/audience':'crmAudience'}[specifier];if(alias)return load(alias);if(specifier.startsWith('./')){const next=specifier.slice(2);if(next==='allowance')return{SaasAllowanceService:allowance};if(next==='store')return{PhoneOperationStore:store};return load(next);}if(specifier==='@/lib/supabase/admin')return{createSupabaseAdminClient:()=>null};if(specifier==='@/lib/auth/tenant-access')return{TenantAccessError};if(specifier==='@/lib/services/core-connect.service')return{CoreConnectService:{ensureTenantProfile:async org=>org==='tenant-a'?'profile-a':'profile-b'}};if(specifier==='@/lib/zernio/policy-engine')return{getFallbackStore:()=>({globalConfig:{},tenants:{}}),assertSubServiceAllowed:async(org,service)=>{if(service==='telephony'&&telephonyDisabled)throw new TenantAccessError(403,'Telephony disabled');return{allowedPlatforms,quotas:{maxPhoneNumbers:5}}}};if(specifier==='@/lib/billing/connections')return{reserveConnectionCapacity:async()=>{assert.ok(walletHolds.some(h=>h.state==='held'));assert.ok(reservations.length);if(connectionFull)throw new TenantAccessError(409,'Connection capacity full');}};if(specifier==='@/lib/billing/service')return{CustomerBillingService:billing};if(specifier==='@/lib/saas/allowance')return{SaasAllowanceService:allowance};if(specifier==='@/lib/crm/consent')return{assertDestinationConsent:async()=>{if(withdrawn)throw new TenantAccessError(403,'Consent withdrawn');return{crmChecked:true};}};throw new Error(`Unexpected dependency ${specifier}`);};vm.runInContext(`(function(require,module,exports){${sources[name]}\n})`,context)(require,module,module.exports);return module.exports;}
 return{settings:load('call-settings').PhoneCallSettings,numbers:load('numbers').PhoneNumbersLifecycle,messages:load('messages').PhoneMessages,calls:load('calls').PhoneCalls,flows:load('flows').WhatsAppFlowsLifecycle,templates:load('templates').PhoneTemplates,whatsapp:load('whatsapp').WhatsAppService,operations,reservations,settlements,releases,rentals,quotes,walletHolds,walletSettlements,walletReleases,customerRentals,releasedRentals,tariff,billing};
}
const purchase=(patch={})=>({country:'US',numberType:'local',connectWhatsapp:false,wantsSms:true,allowMultiple:true,expectedMonthlyCents:300,intent:'purchase-intent-a',...patch});
const sms=(patch={})=>({numberId:'number-a',to:'+14155550999',text:'Reviewed message',consentReviewed:true,intent:'sms-intent-a',...patch});
const call=(patch={})=>({channel:'whatsapp',accountId:'wa-a',numberId:'number-a',to:'+14155550999',consentReviewed:true,expectedAmountMinor:12,intent:'call-intent-a',...patch});
test('owned SMS inbox works with social-only platform policy while tenant and service denials remain enforced',async()=>{
 await fixture();
 const r=runtime();
 const accounts=await r.messages.accounts('tenant-a');
 assert.ok(accounts.accounts.some(a=>a._id==='sms-a'));
 const messages=await r.messages.messages('tenant-a','sms-a','conversation-a');
 assert.equal(messages.messages[0].deliveryStatus,'delivered');
 await assert.rejects(r.messages.messages('tenant-b','sms-a','conversation-a'),e=>e.status===403);
 await assert.rejects(runtime({telephonyDisabled:true}).messages.messages('tenant-a','sms-a','conversation-a'),e=>e.status===403);
 await assert.rejects(runtime({allowedPlatforms:['facebook']}).calls.permission('tenant-a','wa-a','+14155550999'),e=>e.status===403);
 assert.equal(writes(await state()).length,0);
});
async function quotedPurchase(r,input=purchase()){const result=await r.numbers.quote('tenant-a',input);return {...input,quoteId:result.quote.id};}
async function quotedSms(r,input=sms()){const result=await r.messages.quoteSms('tenant-a',input);return {...input,quoteId:result.quote.id};}
const writes=s=>s.requests.filter(r=>['POST','PUT','PATCH','DELETE'].includes(r.method));
test('additional numbers debit reviewed retail once and bind their full monthly rental',async()=>{
 await fixture();const r=runtime(),input=await quotedPurchase(r),result=await r.numbers.purchase('tenant-a',input);
 assert.equal(result.confirmed,true);assert.equal(result.phoneNumber.profileId,'profile-a');
 assert.equal(r.reservations[0].capability,'phone_rental');assert.equal(r.reservations[0].amountMinor,300);
 assert.equal(r.walletHolds[0].amountMinor,500);assert.equal(r.walletSettlements[0].actualRetailMinor,500);assert.equal(r.walletSettlements[0].actualProviderCostMinor,300);
 assert.equal(r.customerRentals[0].monthlyRetailMinor,500);assert.equal(r.customerRentals[0].activatedAt,'2026-10-31T23:59:00.000Z');
 await r.numbers.purchase('tenant-a',input);assert.equal(r.walletHolds.length,1);assert.equal(r.walletSettlements.length,1);
 const requests=writes(await state());assert.equal(requests.length,1);assert.equal(requests[0].path,'/phone-numbers/purchase');assert.equal(requests[0].body.profileId,'profile-a');assert.equal(requests[0].body.allowMultiple,true);assert.equal(requests[0].body.connectWhatsapp,false);
 await assert.rejects(r.numbers.purchase('tenant-a',{...input,wantsSms:false}),e=>e.status===409);
});

test('allocation uncertainty holds both balances and reconciles unique inventory; KYC stays held',async()=>{
 for(const name of ['purchase-unknown','wrong-profile']){
  await fixture(name);const r=runtime(),input=await quotedPurchase(r);await assert.rejects(r.numbers.purchase('tenant-a',input));
  assert.equal(r.walletHolds[0].state,'held');await assert.rejects(r.numbers.purchase('tenant-a',input),e=>e.status===409);
  const result=await r.numbers.reconcile('tenant-a','purchase:purchase-intent-a');assert.equal(result.confirmed,true);assert.equal(r.walletHolds[0].state,'settled');assert.equal(writes(await state()).length,1);assert.equal(r.releases.length,0);assert.equal(r.walletReleases.length,0);
 }
 await fixture('kyc');const r=runtime(),input=await quotedPurchase(r),result=await r.numbers.purchase('tenant-a',input);assert.equal(result.httpStatus,202);assert.equal(result.confirmed,false);assert.equal(r.walletHolds[0].state,'held');assert.equal(r.customerRentals.length,0);
 const next=await quotedPurchase(r,purchase({intent:'second-kyc-intent'}));await assert.rejects(r.numbers.purchase('tenant-a',next),e=>e.status===409);
});

test('ownership, current quotes, explicit purchase consent, funds and durable storage block paid writes',async()=>{
 for(const[options,patch,status]of [[{}, {allowMultiple:false},409],[{disabled:true},{},403],[{walletBalance:499},{},409],[{storageUnavailable:true},{},503]]){
  await fixture();const r=runtime(options),input=await quotedPurchase(r,purchase(patch));await assert.rejects(r.numbers.purchase('tenant-a',input),e=>e.status===status);assert.equal(writes(await state()).length,0);
 }
 await fixture();const r=runtime(),input=await quotedPurchase(r);await scenario('price-changed');await assert.rejects(r.numbers.purchase('tenant-a',input),e=>e.status===409);assert.equal(r.walletHolds.length,0);
 await scenario('success');await assert.rejects(r.numbers.purchase('tenant-a',purchase()),e=>e.status===400);
 await assert.rejects(r.numbers.purchase('tenant-b',input),e=>e.status===404);assert.equal(writes(await state()).length,0);
 await assert.rejects(r.numbers.detail('tenant-a','foreign-number'),e=>e.status===404);assert.equal((await state()).requests.some(r=>r.path==='/phone-numbers/foreign-number'),false);
});

test('explicit release stops customer renewal only after canonical provider release',async()=>{
 await fixture();const r=runtime(),result=await r.numbers.release('tenant-a',{numberId:'number-a',confirmRelease:true,intent:'release-intent-a'});assert.equal(result.confirmed,true);assert.equal(r.rentals[0].state,'released');assert.equal(r.releasedRentals[0].numberId,'number-a');
 await fixture('release-unconfirmed');const uncertain=runtime();await assert.rejects(uncertain.numbers.release('tenant-a',{numberId:'number-a',confirmRelease:true,intent:'release-intent-a'}));assert.equal(uncertain.operations.get('tenant-a:release:release-intent-a').state,'unknown');assert.equal(uncertain.rentals.length,0);assert.equal(uncertain.releasedRentals.length,0);
});

test('SMS requires reviewed route price and rechecks provider approval, STOP and CRM consent',async()=>{
 for(const[name,options,status]of [['sms-unapproved',{},409],['opt-out',{},403],['opt-out-incomplete',{},503],['success',{withdrawn:true},403],['success',{disabled:true},403]]){
  await fixture();const r=runtime(options),input=await quotedSms(r);await scenario(name);await assert.rejects(r.messages.sendSms('tenant-a',input),e=>e.status===status);assert.equal(writes(await state()).length,0);
  if(options.disabled){assert.equal(r.walletReleases.length,1);assert.equal(r.walletHolds[0].state,'released');}
 }
 await fixture();await assert.rejects(runtime().messages.quoteSms('tenant-a',sms({text:'😀'.repeat(336)})),e=>e.status===400);assert.equal(writes(await state()).length,0);
 const r=runtime(),input=await quotedSms(r),result=await r.messages.sendSms('tenant-a',input);assert.equal(result.status,'sent');assert.equal(result.deliveryStatus,undefined);assert.equal(result.providerActualCostAvailable,false);
 assert.equal(r.walletSettlements[0].actualProviderCostMinor,null);assert.equal(r.walletSettlements[0].actualRetailMinor,5);assert.equal(r.settlements.length,0);assert.equal(r.reservations[0].amountMinor,3);
 await r.messages.sendSms('tenant-a',input);assert.equal(writes(await state()).length,1);assert.equal(r.walletSettlements.length,1);
 const messages=await r.messages.messages('tenant-a','sms-a','conversation-a');assert.equal(messages.messages[0].deliveryStatus,'delivered');await scenario('foreign-conversation');await assert.rejects(r.messages.messages('tenant-a','sms-a','conversation-a'),e=>e.status===404);
});

test('unknown SMS outcome retains customer and provider holds and never retries automatically',async()=>{
 await fixture('sms-unknown');const r=runtime(),input=await quotedSms(r);await assert.rejects(r.messages.sendSms('tenant-a',input));await assert.rejects(r.messages.sendSms('tenant-a',input),e=>e.status===409);assert.equal(writes(await state()).length,1);assert.equal(r.releases.length,0);assert.equal(r.walletReleases.length,0);assert.equal(r.walletHolds[0].state,'held');assert.equal(r.walletSettlements.length,0);
});

test('outbound calls remain unavailable without a proven hard cap and estimates stay informational',async()=>{
 for(const name of ['success','no-duration','no-call-permission','outbound-blocked']){
  await fixture(name);const r=runtime();await assert.rejects(r.calls.quote('tenant-a',call()),e=>e.status===501);await assert.rejects(r.calls.start('tenant-a',call()),e=>e.status===501);assert.equal(r.walletHolds.length,0);assert.equal(writes(await state()).length,0);
 }
 await fixture();const r=runtime(),estimate=await r.calls.estimate('tenant-a',call({minutes:3}));assert.equal(estimate.canStart,false);assert.equal(estimate.informationalOnly,true);assert.equal(estimate.maxDurationSeconds,null);assert.equal(estimate.breakdown.billableCostUSD,0.12);assert.equal(r.quotes.size,0);
 const request=(await state()).requests.find(r=>r.path==='/whatsapp/calls/estimate');assert.equal(request.query.minutes,'3');assert.equal(request.query.recording,'false');
});

test('existing calls settle supplier evidence separately and never exceed the customer-approved retail hold',async()=>{
 await fixture('legacy-call');const r=runtime(),quote=await r.billing.createQuote({organizationId:'tenant-a',operationKey:'call:old-intent',kind:'voice_call',input:{},providerCostMinor:1}),held=await r.billing.reserveQuote({organizationId:'tenant-a',operationKey:'call:old-intent',quoteId:quote.id,input:{}});
 r.operations.set('tenant-a:call:old-intent',{organization_id:'tenant-a',operation_key:'call:old-intent',profile_id:'profile-a',kind:'call',state:'confirmed',provider_id:'call-a',input:{channel:'whatsapp',accountId:'wa-a',body:{to:'+14155550999'}},reservations:[{reservationId:'provider-old'},{kind:'customer_wallet',...held}]});
 const result=await r.calls.reconcile('tenant-a','call:old-intent');assert.equal(result.settled,true);assert.equal(r.settlements[0].actualAmountMinor,2);assert.equal(r.walletSettlements[0].actualProviderCostMinor,2);assert.equal(r.walletSettlements[0].actualRetailMinor,2);assert.equal(r.walletHolds[0].amountMinor,2);assert.equal((await r.calls.history('tenant-a',{channel:'whatsapp',accountId:'wa-a'})).calls[0].durationSeconds,12);assert.equal(writes(await state()).length,0);
});

test('manual Flow lifecycle uses canonical status and explicit irreversible review',async()=>{await fixture();const r=runtime();const create=await r.flows.create('tenant-a',{accountId:'wa-a',name:'Support',categories:['CONTACT_US'],intent:'flow-intent-a'});assert.equal(create.flow.status,'DRAFT');await assert.rejects(r.flows.change('tenant-a','flow_upload',{accountId:'wa-a',flowId:'flow-a',flow_json:{data_api_version:'3.0',screens:[{}]}}),e=>e.status===501);await scenario('invalid-flow');const invalid=await r.flows.change('tenant-a','flow_upload',{accountId:'wa-a',flowId:'flow-a',flow_json:{version:'7.3',screens:[{id:'WELCOME'}]}});assert.equal(invalid.valid,false);await scenario('success');assert.equal((await r.flows.change('tenant-a','flow_publish',{accountId:'wa-a',flowId:'flow-a',confirm:true})).confirmed,true);assert.equal((await r.flows.change('tenant-a','flow_deprecate',{accountId:'wa-a',flowId:'flow-a',confirm:true})).confirmed,true);await assert.rejects(r.flows.send('tenant-a',{accountId:'wa-a',flowId:'flow-a'}),e=>e.status===409);assert.equal((await r.flows.change('tenant-a','flow_delete',{accountId:'wa-a',flowId:'flow-new',confirm:true})).confirmed,true);});
test('published navigation Flow sending reserves allowance and never retries unknown acceptance',async()=>{await fixture();const r=runtime();await r.flows.change('tenant-a','flow_publish',{accountId:'wa-a',flowId:'flow-a',confirm:true});await scenario('flow-send-unknown');const input={accountId:'wa-a',flowId:'flow-a',to:'+14155550999',body:'Reviewed form',flow_cta:'Open form',screen:'WELCOME',consentReviewed:true,intent:'flow-send-intent'};await assert.rejects(r.flows.send('tenant-a',input));await assert.rejects(r.flows.send('tenant-a',input),e=>e.status===409);const sent=writes(await state()).filter(r=>r.path==='/whatsapp/flows/send');assert.equal(sent.length,1);assert.equal(sent[0].body.flow_action,'navigate');assert.equal(sent[0].body.flow_token,'flow-a:flow-send-intent');assert.equal(r.releases.length,0);});

test('approved media templates check status/header/CRM consent and use actual canonical send once',async()=>{await fixture();const r=runtime(),input={accountId:'wa-a',recipient:'+14155550999',consentReviewed:true,intent:'template-intent-a',template:{name:'order_update',language:'en_US',parameters:['Customer'],headerMedia:{type:'image',link:'https://cdn.example.invalid/order.jpg'}}};await assert.rejects(r.templates.send('tenant-a',{...input,template:{...input.template,headerMedia:undefined}}),e=>e.status===400);const result=await r.templates.send('tenant-a',input);assert.equal(result.data.messageId,'template-message-a');assert.equal(r.reservations.length,1);assert.equal(result.allowance.reservationId,r.reservations[0].reservationId);assert.equal(r.operations.get('tenant-a:template_send:template-intent-a').result.allowance.reservationId,r.reservations[0].reservationId);assert.equal(result.allowanceStatus,'reserved_pending_provider_billing');await r.templates.send('tenant-a',input);const sent=writes(await state()).filter(r=>r.path==='/inbox/conversations');assert.equal(sent.length,1);assert.equal(sent[0].body.headerMedia.type,'image');assert.equal(sent[0].body.templateParams[0],'Customer');await assert.rejects(runtime({withdrawn:true}).templates.send('tenant-a',{...input,intent:'another-template-intent'}),e=>e.status===403);});

test('unknown canonical template acceptance keeps its single reservation in the durable phone journal',async()=>{await fixture('template-unknown');const r=runtime(),input={accountId:'wa-a',recipient:'+14155550999',consentReviewed:true,intent:'unknown-template-intent',template:{name:'order_update',language:'en_US',parameters:['Customer'],headerMedia:{type:'image',link:'https://cdn.example.invalid/order.jpg'}}};await assert.rejects(r.templates.send('tenant-a',input));assert.equal(r.reservations.length,1);const op=r.operations.get('tenant-a:template_send:unknown-template-intent');assert.equal(op.state,'unknown');assert.equal(op.result.details.reservationId,r.reservations[0].reservationId);await assert.rejects(r.templates.send('tenant-a',input),e=>e.status===409);assert.equal(r.reservations.length,1);assert.equal(writes(await state()).filter(r=>r.path==='/inbox/conversations').length,1);assert.equal(r.releases.length,0);});

test('canonical WhatsApp direct recipient and owned-conversation sends enforce CRM veto and current template category',async()=>{for(const params of [{recipient:'+14155550999'},{conversationId:'wa-conversation-a'}]){await fixture();const r=runtime({withdrawn:true});await assert.rejects(r.whatsapp.sendMessage({organizationId:'tenant-a',accountId:'wa-a',text:'Reviewed text',idempotencyKey:'canonical-intent',...params}),e=>e.status===403);assert.equal(r.reservations.length,0);assert.equal(writes(await state()).length,0);}await fixture('marketing-template');const r=runtime({withdrawn:true});await assert.rejects(r.whatsapp.sendMessage({organizationId:'tenant-a',accountId:'wa-a',recipient:'+14155550999',template:{name:'order_update',language:'en_US',parameters:['Customer']},idempotencyKey:'marketing-intent'}),e=>e.status===403);assert.equal(r.reservations.length,0);assert.equal(writes(await state()).length,0);await fixture('invalid-participant');await assert.rejects(runtime().whatsapp.sendMessage({organizationId:'tenant-a',accountId:'wa-a',conversationId:'wa-conversation-a',text:'Reviewed text',idempotencyKey:'invalid-participant-intent'}),e=>e.envelope?.status===400);});


const setup=(patch={})=>({channel:'whatsapp',accountId:'wa-a',enabled:true,forwardTo:'tel:+14155550777',maxCallDurationSeconds:180,chargesReviewed:true,intent:'settings-intent-a',...patch});
const permissionRequest=(patch={})=>({accountId:'wa-a',to:'+14155550999',consentReviewed:true,intent:'permission-intent-a',...patch});

test('canonical call settings resolve the owned account and preserve unknown PSTN duration as unavailable',async()=>{
 await fixture();const r=runtime();
 const wa=await r.settings.read('tenant-a',{channel:'whatsapp',accountId:'wa-a',numberId:'foreign-number'});
 assert.equal(wa.settings.numberId,'number-a');assert.equal(wa.settings.enabled,true);assert.equal(wa.settings.recordingEnabled,true);
 assert.equal(wa.settings.outboundSupported,false);assert.equal(wa.settings.incomingEnableSupported,false);assert.equal(wa.settings.sipAuthPassword,undefined);
 const pstn=await r.settings.read('tenant-a',{channel:'pstn',numberId:'number-a'});
 assert.equal(pstn.settings.maxCallDurationSeconds,null);assert.equal(pstn.settings.outboundSupported,false);
 await assert.rejects(r.calls.start('tenant-a',call({channel:'pstn'})),e=>e.status===501);
 await assert.rejects(r.settings.read('tenant-b',{channel:'whatsapp',accountId:'wa-a'}),e=>e.status===403);
 assert.equal(writes(await state()).length,0);
 await fixture('settings-null');await assert.rejects(runtime().settings.read('tenant-a',{channel:'whatsapp',accountId:'wa-a'}),e=>e.envelope?.status===502);
});

test('WhatsApp routing saves PATCH only reviewed fields, verifies readback, and replays one durable intent',async()=>{
 await fixture();const r=runtime({incomingSupported:true}),saved=await r.settings.save('tenant-a',setup({numberId:'foreign-number'}));
 assert.equal(saved.confirmed,true);assert.equal(saved.settings.forwardTo,'tel:+14155550777');assert.equal(saved.settings.recordingEnabled,true);
 await r.settings.save('tenant-a',setup({numberId:'foreign-number'}));
 const sent=writes(await state());assert.equal(sent.length,1);assert.equal(sent[0].method,'PATCH');assert.equal(sent[0].path,'/phone-numbers/number-a/whatsapp/calling');
 assert.deepEqual(sent[0].body,{accountId:'wa-a',forwardTo:'tel:+14155550777',maxCallDurationSeconds:180});
 assert.equal(r.operations.get('tenant-a:call_settings:settings-intent-a').state,'confirmed');
});

test('WhatsApp disable uses query account and permits incomplete settings, then enable uses POST',async()=>{
 await fixture('no-duration');const r=runtime({incomingSupported:true});
 const off=await r.settings.save('tenant-a',setup({enabled:false,forwardTo:'',maxCallDurationSeconds:null,chargesReviewed:false}));
 assert.equal(off.settings.enabled,false);
 let sent=writes(await state());assert.equal(sent[0].method,'DELETE');assert.equal(sent[0].query.accountId,'wa-a');assert.deepEqual(sent[0].body,{});
 await scenario('success');await r.settings.save('tenant-a',setup({intent:'settings-enable-a'}));
 sent=writes(await state());assert.equal(sent[1].method,'POST');assert.equal(sent[1].body.accountId,'wa-a');
});

test('PSTN routing sets only the destination and never invents a supported duration-cap field',async()=>{
 await fixture();const r=runtime({incomingSupported:true});
 const saved=await r.settings.save('tenant-a',setup({channel:'pstn',numberId:'number-a',maxCallDurationSeconds:999}));
 assert.equal(saved.confirmed,true);assert.equal(saved.settings.forwardTo,'tel:+14155550777');assert.equal(saved.settings.outboundSupported,false);
 let sent=writes(await state());assert.deepEqual(sent[0].body,{forwardTo:'tel:+14155550777'});assert.equal(sent[0].path,'/phone-numbers/number-a/voice');
 await r.settings.save('tenant-a',setup({channel:'pstn',numberId:'number-a',enabled:false,intent:'disable-pstn-a'}));
 sent=writes(await state());assert.equal(sent[1].method,'DELETE');
});

test('configuration ownership, review, destination, cap and spending failures never dispatch a write',async()=>{
 for(const [options,input,status]of [
  [{},setup({chargesReviewed:false}),400],[{},setup({maxCallDurationSeconds:null}),400],[{},setup({maxCallDurationSeconds:1.5}),400],
  [{},setup({forwardTo:'tel:+14155550101'}),400],[{},setup({forwardTo:'https://example.invalid'}),400],
  [{},setup({forwardTo:'sip:new@example.invalid'}),400],[{disabled:true},setup(),403],
  [{},setup({channel:'pstn',numberId:'foreign-number'}),404],[{storageUnavailable:true},setup(),503],
 ]){await fixture();await assert.rejects(runtime({...options,incomingSupported:true}).settings.save('tenant-a',input),e=>e.status===status);assert.equal(writes(await state()).length,0);}
 await fixture('inactive');await assert.rejects(runtime().settings.save('tenant-a',setup()),e=>e.status===409);assert.equal(writes(await state()).length,0);
});

test('uncertain or mismatched settings retain their durable intent and cannot write twice',async()=>{
 for(const name of ['settings-unknown','settings-mismatch']){
  await fixture(name);const r=runtime({incomingSupported:true});await assert.rejects(r.settings.save('tenant-a',setup()));
  assert.equal(r.operations.get('tenant-a:call_settings:settings-intent-a').state,'unknown');
  await assert.rejects(r.settings.save('tenant-a',setup()),e=>e.status===409);assert.equal(writes(await state()).length,1);
  assert.equal(r.reservations.length,0);
 }
 await fixture('outbound-blocked');const r=runtime({incomingSupported:true}),saved=await r.settings.save('tenant-a',setup());
 assert.equal(saved.settings.enabled,true);assert.equal(saved.settings.outboundSupported,false);
 await assert.rejects(r.calls.start('tenant-a',call()),e=>e.status===501);assert.equal(writes(await state()).length,1);
});

test('permission requests use the prompt action and replay acceptance after provider limits change',async()=>{
 await fixture('permission-required');const r=runtime(),result=await r.settings.requestPermission('tenant-a',permissionRequest());
 assert.equal(result.accepted,true);assert.equal(result.permissionGranted,false);assert.equal(result.callId,undefined);
 assert.equal(r.reservations[0].capability,'whatsapp_send');
 assert.equal((await r.settings.requestPermission('tenant-a',permissionRequest())).accepted,true);
 const sent=writes(await state());assert.equal(sent.length,1);assert.equal(sent[0].path,'/whatsapp/calls');
 assert.equal(sent[0].idempotencyKey,'permission-intent-a');assert.deepEqual(sent[0].body,{accountId:'wa-a',to:'+14155550999',action:'send_call_permission_request'});
 await assert.rejects(r.settings.requestPermission('tenant-a',permissionRequest({to:'+14155550888'})),e=>e.status===409);
 await assert.rejects(r.settings.requestPermission('tenant-b',permissionRequest()),e=>e.status===403);
});

test('permission eligibility, consent and ambiguous delivery cannot cause a repeated prompt',async()=>{
 for(const[name,options,status]of [['permission-denied',{},409],['outbound-blocked',{},409],['permission-required',{withdrawn:true},403],['permission-required',{disabled:true},403]]){
  await fixture(name);await assert.rejects(runtime(options).settings.requestPermission('tenant-a',permissionRequest()),e=>e.status===status);assert.equal(writes(await state()).length,0);
 }
 await fixture('permission-unknown');const r=runtime();await assert.rejects(r.settings.requestPermission('tenant-a',permissionRequest()));
 await assert.rejects(r.settings.requestPermission('tenant-a',permissionRequest()),e=>e.status===409);
 assert.equal(r.operations.get('tenant-a:call_permission:permission-intent-a').state,'unknown');assert.equal(writes(await state()).length,1);assert.equal(r.releases.length,0);
});

 test('country default uses its first offered type and SMS search verifies actual number capability',async()=>{
 await fixture('mobile-only');const mobile=await runtime().numbers.offers('tenant-a','GB');assert.equal(mobile.numberType,'mobile');assert.equal((await state()).requests.find(r=>r.path==='/phone-numbers/available').query.numberType,'mobile');
 await fixture();const sms=await runtime().numbers.offers('tenant-a','US','local','true');assert.equal(sms.requireSms,true);assert.equal((await state()).requests.find(r=>r.path==='/phone-numbers/available').query.sms,'true');
 for(const [name,status] of [['sms-unavailable',400],['sms-feature-mismatch',502],['wrong-country',502],['wrong-type',502]]){await fixture(name);await assert.rejects(runtime().numbers.offers('tenant-a','US','local',true),e=>(e.status??e.envelope?.status)===status);assert.equal(writes(await state()).length,0);}
 });
 test('instant stock refresh ignores stale advisory catalog while request fulfilment allows only assigned KYC orders',async()=>{
 await fixture('out-of-stock');assert.equal((await runtime().numbers.offers('tenant-a','US','local')).availabilityMode,'out_of_stock');assert.equal((await state()).requests.some(r=>r.path==='/phone-numbers/available'),true);assert.equal(writes(await state()).length,0);
 await fixture('stock-replenished');const fresh=await runtime().numbers.offers('tenant-a','US','local');assert.equal(fresh.numbers.length,1);assert.notEqual(fresh.availabilityMode,'out_of_stock');const r=runtime();assert.equal((await r.numbers.purchase('tenant-a',await quotedPurchase(r))).confirmed,true);
 await fixture('request-preorder');assert.equal((await runtime().numbers.offers('tenant-a','US','local')).availabilityMode,'assigned_after_verification');await assert.rejects(runtime().numbers.quote('tenant-a',purchase({phoneNumber:'+14155550102'})),e=>e.status===400);assert.equal(writes(await state()).length,0);const k=runtime(),result=await k.numbers.purchase('tenant-a',await quotedPurchase(k));assert.equal(result.status,'kyc_required');assert.equal(result.confirmed,false);assert.equal(writes(await state()).length,1);
 });


test('missing, expired, changed and cross-workspace quotes never dispatch paid requests',async()=>{
 for(const change of ['expired','price-version','input','quote-id']){
  await fixture();const r=runtime(),input=await quotedPurchase(r);
  if(change==='expired')r.quotes.get(input.quoteId).expiresAt='2000-01-01T00:00:00Z';
  if(change==='price-version')r.quotes.get(input.quoteId).pricingVersion='old-v0';
  if(change==='input')input.connectWhatsapp=true;
  if(change==='quote-id')input.quoteId='unknown-quote';
  await assert.rejects(r.numbers.purchase('tenant-a',input),e=>[404,409].includes(e.status));assert.equal(r.walletHolds.length,0);assert.equal(writes(await state()).length,0);
 }
});

test('explicit provider rejection before acceptance releases both independent reservations',async()=>{
 for(const name of ['purchase-rejected','sms-rejected']){
  await fixture(name);const r=runtime(),input=name.startsWith('purchase')?await quotedPurchase(r):await quotedSms(r);
  await assert.rejects(name.startsWith('purchase')?r.numbers.purchase('tenant-a',input):r.messages.sendSms('tenant-a',input));
  assert.equal(writes(await state()).length,1);assert.equal(r.walletHolds[0].state,'released');assert.equal(r.walletReleases.length,1);assert.equal(r.releases.length,1);assert.equal(r.walletSettlements.length,0);
 }
});

test('SMS uses real encoded segments and cannot substitute an administrator allowance for a verified tariff',async()=>{
 await fixture();await assert.rejects(runtime({verifiedTariff:false}).messages.quoteSms('tenant-a',sms()),e=>e.status===503);assert.equal(writes(await state()).length,0);
 const r=runtime(),unicode=await r.messages.quoteSms('tenant-a',sms({text:'ع'.repeat(71)})),gsm=await r.messages.quoteSms('tenant-a',sms({text:'^'.repeat(81),intent:'gsm-message-intent'}));
 assert.equal(unicode.encoding,'UCS-2');assert.equal(unicode.segments,2);assert.equal(unicode.quote.amountMinor,10);assert.equal(gsm.encoding,'GSM-7');assert.equal(gsm.segments,2);assert.equal(gsm.quote.amountMinor,10);
 for(const change of ['version','expired','price','text','to']){
  const r=runtime(),input=await quotedSms(r);
  if(change==='version')r.tariff.version='new-tariff';if(change==='expired')r.tariff.expiresAt='2000-01-01T00:00:00Z';if(change==='price')r.tariff.perSegmentUpperBoundProviderMinor=4;if(change==='text')input.text+=' changed';if(change==='to')input.to='+14155550888';
  await assert.rejects(r.messages.sendSms('tenant-a',input),e=>[409,503].includes(e.status));assert.equal(r.walletHolds.length,0);
 }
 assert.equal(writes(await state()).length,0);
});

test('incoming enabling fails closed while an existing incoming route can still be disabled',async()=>{
 for(const channel of ['whatsapp','pstn']){
  await fixture();const r=runtime();await assert.rejects(r.settings.save('tenant-a',setup({channel,numberId:'number-a'})),e=>e.status===501);assert.equal(writes(await state()).length,0);
  const off=await r.settings.save('tenant-a',setup({channel,numberId:'number-a',enabled:false,forwardTo:'',maxCallDurationSeconds:null,chargesReviewed:false}));assert.equal(off.settings.enabled,false);assert.equal(writes(await state()).length,1);
 }
});


test('automatic WhatsApp purchase checks connection capacity after holds and releases both on a full plan',async()=>{
 await fixture();const r=runtime({connectionFull:true}),input=await quotedPurchase(r,purchase({connectWhatsapp:true}));
 await assert.rejects(r.numbers.purchase('tenant-a',input),e=>e.status===409);assert.equal(writes(await state()).length,0);assert.equal(r.walletHolds[0].state,'released');assert.equal(r.walletReleases.length,1);assert.equal(r.releases.length,1);assert.equal(r.operations.get('tenant-a:purchase:purchase-intent-a').state,'failed');
});
