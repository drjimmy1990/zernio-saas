import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';

// Actual application services -> Supabase SDK -> isolated PostgREST -> PostgreSQL.
const suffix=crypto.randomBytes(6).toString('hex'),network=`billing-check-${suffix}`,dbName=`${network}-db`,apiName=`${network}-api`;
const password=crypto.randomBytes(24).toString('hex'),secret=crypto.randomBytes(32).toString('hex');
const docker=(args,input)=>{const r=spawnSync('docker',args,{input,encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error(r.stderr||r.error?.message||'Docker failed');return r.stdout.trim();};
const sql=command=>docker(['exec','-i',dbName,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],command);
const org='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
let databaseStarted=false,apiStarted=false,networkCreated=false;
try{
 docker(['network','create',network]);networkCreated=true;
 docker(['run','--rm','-d','--name',dbName,'--network',network,'-e',`POSTGRES_PASSWORD=${password}`,'postgres:16-alpine']);databaseStarted=true;
 for(let i=0;i<120;i++){if(spawnSync('docker',['exec',dbName,'pg_isready','-U','postgres'],{stdio:'ignore',windowsHide:true}).status===0)break;await new Promise(r=>setTimeout(r,250));}await new Promise(r=>setTimeout(r,700));
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select current_user::text$$;grant usage on schema public,auth to authenticated,anon,service_role;`);
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())sql(fs.readFileSync(`supabase/migrations/${file}`,'utf8'));
 sql(`insert into organizations(id,name,slug,plan_key)values('${org}','Billing test','billing-test','starter'),('${other}','Other workspace','other-test','starter');grant usage on schema public to service_role;grant all on all tables in schema public to service_role;grant all on all sequences in schema public to service_role;`);
 docker(['run','--rm','-d','--name',apiName,'--network',network,'-p','127.0.0.1::3000','-e',`PGRST_DB_URI=postgres://postgres:${password}@${dbName}:5432/postgres`,'-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e',`PGRST_JWT_SECRET=${secret}`,'postgrest/postgrest:v12.2.3']);apiStarted=true;
 const address=docker(['port',apiName,'3000/tcp']),base=`http://${address}`;
 const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),jwtBody=`${encoded({alg:'HS256',typ:'JWT'})}.${encoded({role:'service_role',exp:Math.floor(Date.now()/1000)+3600})}`,jwt=`${jwtBody}.${crypto.createHmac('sha256',secret).update(jwtBody).digest('base64url')}`;
 for(let i=0;i<120;i++){try{if((await fetch(base,{headers:{authorization:`Bearer ${jwt}`}})).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 const originalFetch=globalThis.fetch;
 const transport=async(url,init)=>{const u=new URL(url);assert.equal(u.origin,base,'Only isolated PostgREST is allowed');u.pathname=u.pathname.replace(/^\/rest\/v1/,'');return originalFetch(u,init);};
 const db=createClient(base,jwt,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:transport}});
 const anon=await fetch(`${base}/billing_wallets`);assert.equal(anon.status,401);
 let role='owner';class TenantAccessError extends Error{constructor(status,message){super(message);this.status=status;}}
 const modules={},context=vm.createContext({process:{env:{SUPABASE_SERVICE_ROLE_KEY:'isolated'}},Buffer,URL,Date,console});
 function load(file){if(modules[file])return modules[file];const exports={};modules[file]=exports;const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const require=name=>{if(name==='node:crypto')return crypto;if(name==='@/lib/saas/storage')return{saasDatabase:()=>db};if(name==='@/lib/auth/tenant-access')return{TenantAccessError,requireTenantAccess:async()=>({role,session:{user:{id:role==='super_admin'?'usr_super_admin':'owner-id'},tenant:{organizationId:org}}}),requireWorkspaceRole:r=>{if(!['owner','admin','super_admin'].includes(r))throw new TenantAccessError(403,'Role denied');}};if(name==='next/server')return{NextResponse:{json:Response.json}};if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);if(name.startsWith('.'))return load(path.posix.normalize(`${path.posix.dirname(file)}/${name}.ts`));throw new Error(`Unexpected dependency ${name}`);};
  vm.runInContext(`(function(require,exports){${source}\n})`,context)(require,exports);return exports;
 }
 const {CustomerBillingService:billing}=load('src/lib/billing/service.ts'),{BillingWorkspaceService:workspace,billingPeriod}=load('src/lib/billing/workspace.ts'),route=load('src/app/api/billing/route.ts');
 const post=async body=>{const r=await route.POST(new Request(`${base}/api/billing`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));return{status:r.status,body:await r.json()};};
 assert.equal((await post({action:'credit',organizationId:org,actorId:'usr_super_admin',amountMinor:10000,paymentReference:'forged',confirmed:true,evidence:{note:'forged'}})).status,403);
 assert.equal((await post({action:'renew',organizationId:other})).status,403);
 role='viewer';assert.equal((await post({action:'subscribe',extraAccounts:0,termsAccepted:true})).status,403);role='super_admin';
 const credit={action:'credit',organizationId:org,amountMinor:10000,paymentReference:'confirmed-test-receipt',confirmed:true,evidence:{note:'Isolated test receipt'}};
 assert.equal((await post({...credit,organizationId:undefined})).status,400);
 const credited=await post(credit);assert.equal(credited.body.credited,true,JSON.stringify(credited));assert.equal((await post(credit)).body.result.replayed,true);
 role='owner';assert.equal((await post({action:'checkout'})).status,501);
 const input={to:'+12025550101',numberId:'test-number'},operationKey='sms:service-check';
 const quote=await billing.createQuote({organizationId:org,kind:'sms_send',operationKey,input,providerCostMinor:300,quoteSource:'verified isolated tariff'});assert.equal(quote.amountMinor,500);
 assert.equal((await billing.createQuote({organizationId:org,kind:'sms_send',operationKey,input,providerCostMinor:300,quoteSource:'verified isolated tariff'})).id,quote.id);
 await assert.rejects(billing.verifyQuote({organizationId:org,quoteId:quote.id,operationKey,input:{...input,to:'+12025550102'},providerCostMinor:300}));
 await assert.rejects(billing.verifyQuote({organizationId:other,quoteId:quote.id,operationKey,input,providerCostMinor:300}));
 const held=await billing.reserveQuote({organizationId:org,quoteId:quote.id,operationKey,input});assert.equal(held.amountMinor,500);
 const settled=await billing.settle({organizationId:org,reservationId:held.reservationId,actualProviderCostMinor:900,providerReference:'service-provider-1',evidence:{final:true}});assert.equal(settled.amountMinor,500);
 assert.equal((await billing.settle({organizationId:org,reservationId:held.reservationId,actualProviderCostMinor:900,providerReference:'service-provider-1',evidence:{final:true}})).replayed,true);
 assert.equal(sql(`select provider_loss_minor from billing_wallet_holds where id='${held.reservationId}'`),'400');
 await assert.rejects(billing.verifiedSmsTariff({organizationId:org,from:'+12025550100',to:'+201000000000'}));
 const unknownQuote=await billing.createQuote({organizationId:org,kind:'sms_send',operationKey:'sms:unknown-cost',input,providerCostMinor:30,quoteSource:'test'}),unknownHold=await billing.reserveQuote({organizationId:org,quoteId:unknownQuote.id,operationKey:'sms:unknown-cost',input});
 await billing.settle({organizationId:org,reservationId:unknownHold.reservationId,actualProviderCostMinor:null,retailAmountMinor:50,providerReference:'sms-unknown-cost',evidence:{accepted:true}});
 assert.equal(sql(`select provider_cost_minor is null from billing_wallet_holds where id='${unknownHold.reservationId}'`),'t');
 const enrollment=await post({action:'subscribe',extraAccounts:2,termsAccepted:true});assert.equal(enrollment.status,200,JSON.stringify(enrollment.body));assert.equal(enrollment.body.subscription.monthlyMinor,3600);
 const balance=sql(`select available_minor from billing_wallets where organization_id='${org}'`);assert.equal((await post({action:'renew'})).status,200);assert.equal(sql(`select available_minor from billing_wallets where organization_id='${org}'`),balance);
 assert.equal((await post({action:'cancel_subscription',confirmed:true})).status,200);const subscription=await workspace.subscription(org);assert.equal(subscription.status,'active');assert.equal(subscription.cancelAtPeriodEnd,true);
 const snapshotResponse=await route.GET(new Request(`${base}/api/billing`));assert.equal(snapshotResponse.status,200);const snapshot=await snapshotResponse.json();assert.equal(snapshot.organizationId,org);assert.equal(snapshot.subscription.monthlyMinor,3600);assert.equal(snapshot.subscription.cancelAtPeriodEnd,true);assert.equal(snapshot.agreements[0].nextDueAt,snapshot.subscription.periodEnd);assert.equal(snapshot.wallet.availableMinor,Number(balance));assert.equal(snapshot.rentalReviewRequired,false);
 sql(fs.readFileSync('scripts/sql/check-customer-billing.sql','utf8'));
 assert.equal(billingPeriod('2026-01-31T12:00:00.000Z','starter',new Date('2026-02-28T12:00:00Z')).to,'2026-03-31T12:00:00.000Z');
 const expired=await billing.createQuote({organizationId:other,kind:'phone_rental',operationKey:'expired',input,providerCostMinor:300,quoteSource:'test'});sql(`update billing_wallet_quotes set expires_at=now()-interval '1 second' where id='${expired.id}'`);await assert.rejects(billing.reserveQuote({organizationId:other,quoteId:expired.id,operationKey:'expired',input}));
 console.log('Actual billing services + API + Supabase HTTP + PostgreSQL passed: role/tenant boundaries, quote binding/expiry, one-time credits/settlement, capped customer charges, unknown supplier cost, subscription renew/cancel and month-end dates.');
}finally{
 if(apiStarted)docker(['rm','-f',apiName]);if(databaseStarted)docker(['rm','-f',dbName]);if(networkCreated)docker(['network','rm',network]);
}
