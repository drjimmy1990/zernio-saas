import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function runtime({profile='profile-a',accounts=[],existing=null}={}) {
 const writes=[],reads=[];
 class TenantAccessError extends Error { constructor(status,message){super(message);this.status=status;} }
 const db={from(table){const query={select(){return query;},eq(){return query;},single(){return Promise.resolve({data:{zernio_profile_id:profile},error:null});},then(resolve,reject){return Promise.resolve({data:table==='billing_recurring_agreements'?(existing?[existing]:[]):[],error:null}).then(resolve,reject);}};return query;},async rpc(name,args){writes.push({name,args});return {data:{agreementId:'agreement-a'},error:null};}};
 const modules={};
 function load(name){if(modules[name])return modules[name];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(`src/lib/billing/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const require=specifier=>{if(specifier==='./pricing')return load('pricing');if(specifier==='@/lib/auth/tenant-access')return {TenantAccessError};if(specifier==='@/lib/saas/storage')return {saasDatabase:()=>db};if(specifier==='@/lib/zernio/client')return {zernioClient:{async request(input){reads.push(input);return{data:{accounts}};}}};throw new Error(`Unexpected module ${specifier}`);};
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`)(require,module,module.exports);return modules[name]=module.exports;
 }
 const service=load('workspace').BillingWorkspaceService;
 // Enrollment has its own current-inventory/price gate; recurring debit is covered by PostgreSQL tests.
 service.renew=async()=>({paid:0});service.subscription=async()=>({status:'payment_due'});
 return {service,writes,reads};
}

test('subscription enrollment prices every existing social connection and excludes phone/SMS service accounts',async()=>{
 const accounts=[...Array.from({length:5},(_,i)=>({_id:`social-${i}`,platform:i?'instagram':'facebook',profileId:'profile-a'})),{_id:'sms',platform:'sms',profileId:'profile-a'},{_id:'phone',platform:'phone',profileId:'profile-a'}];
 const r=runtime({accounts});await assert.rejects(r.service.subscribe('tenant-a','owner-a',0,true),e=>e.status===409&&/3 extra/.test(e.message));assert.equal(r.writes.length,0);assert.equal(r.reads[0].query.profileId,'profile-a');
 await r.service.subscribe('tenant-a','owner-a',3,true);assert.equal(r.writes.length,1);assert.equal(r.writes[0].args.p_amount,4400);assert.equal(r.writes[0].args.p_evidence.extraAccounts,3);
});

test('foreign or incomplete inventories prevent subscription enrollment without a charge',async()=>{
 for(const accounts of [[{_id:'foreign',platform:'facebook',profileId:'profile-b'}],[{platform:'facebook',profileId:'profile-a'}],null]){const r=runtime({accounts});await assert.rejects(r.service.subscribe('tenant-a','owner-a',0,true),e=>e.status===503);assert.equal(r.writes.length,0);}
 const r=runtime({profile:{id:'unexpected'}});await assert.rejects(r.service.subscribe('tenant-a','owner-a',0,true),e=>e.status===503);assert.equal(r.writes.length,0);
});

test('a new workspace without a provider profile can enroll at the base price while existing plan changes remain blocked',async()=>{
 const r=runtime({profile:null});await r.service.subscribe('tenant-a','owner-a',0,true);assert.equal(r.reads.length,0);assert.equal(r.writes[0].args.p_amount,2000);
 const existing=runtime({existing:{agreement_key:'subscription',evidence:{extraAccounts:1}}});await assert.rejects(existing.service.subscribe('tenant-a','owner-a',0,true),e=>e.status===409);assert.equal(existing.reads.length,0);assert.equal(existing.writes.length,0);
});
