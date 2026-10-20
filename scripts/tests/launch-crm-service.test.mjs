import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import crypto from 'node:crypto';

const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',user='11111111-1111-4111-8111-111111111111',id='99999999-9999-4999-8999-999999999999',second='88888888-8888-4888-8888-888888888888';
class TenantAccessError extends Error{constructor(status,message){super(message);this.status=status;}}
function harness(options={}){
 const rows=options.rows||[],calls=[],cache={};
 const actor={organizationId:org,userId:user,role:options.role||'editor'};
 const db={from(table){const filters=[],chain={select(){return chain;},eq(key,value){filters.push([key,value]);return chain;},in(key,value){filters.push([key,value]);return chain;},or(value){calls.push({table,or:value});return chain;},limit(){return chain;},order(){return chain;},range(){return chain;},is(){return chain;},not(){return chain;},contains(){return chain;},neq(){return chain;},insert(value){calls.push({table,insert:value});return chain;},update(value){calls.push({table,update:value});return chain;},delete(){calls.push({table,delete:true});return chain;},async maybeSingle(){return execute(true);},async single(){return execute(true);},then(ok,fail){return Promise.resolve(execute(false)).then(ok,fail);}};
  function execute(single){calls.push({table,filters});if(options.failure)return {data:null,error:{code:'XX',message:'dbfail'}};if(table==='org_members')return {data:options.removed?null:{role:actor.role,user_id:user},error:null};if(table==='organizations')return {data:{status:options.suspended?'suspended':'active'},error:null};if(table==='crm_fields')return {data:options.fields||[],error:null};if(table==='crm_import_runs')return {data:null,error:null};const matches=rows.filter(row=>filters.every(([key,value])=>Array.isArray(value)?value.includes(row[key]):row[key]===value));return {data:single?matches[0]||null:matches,error:null,count:matches.length};}
  return chain;},async rpc(name,input){calls.push({rpc:name,input});return {data:{created:1,updated:0},error:null};}};
 const context=vm.createContext({Buffer,Date,URL,Request,Response,TextEncoder,TextDecoder,console,process:{env:{}},fetch:()=>{throw new Error('No live calls');}});
 function load(file){if(cache[file])return cache[file].exports;const module={exports:{}};cache[file]=module;const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const require=specifier=>{
   if(specifier==='node:crypto')return crypto;if(specifier==='@/lib/supabase/admin')return {createSupabaseAdminClient:()=>options.unconfigured?null:db};
   if(specifier==='@/lib/auth/tenant-access')return {TenantAccessError,requireWorkspaceRole:(role,editor)=>{if(!['owner','admin',...(editor?['editor']:[])].includes(role))throw new TenantAccessError(403,'Role denied');},requireTenantAccess:async(request,requested)=>{if(options.anonymous)throw new TenantAccessError(401,'Sign in');if(requested&&requested!==org)throw new TenantAccessError(403,'Foreign workspace');if(options.removed)throw new TenantAccessError(403,'Membership removed');return {session:{tenant:{organizationId:org},user:{id:user}},role:actor.role};}};
   if(specifier==='@/lib/auth/tenant-provider')return {requireTenantAccounts:async()=>[{_id:'owned-account',platform:'instagram'}]};
   if(specifier==='@/lib/zernio/client')return {zernioClient:{request:async()=>({data:{data:{id:'owned-conversation',accountId:options.foreignLink?'foreign':'owned-account',platform:'instagram'}}})}};
   const resolved=specifier.startsWith('@/')?path.resolve('src',specifier.slice(2)+'.ts'):path.resolve(path.dirname(file),specifier+'.ts');return load(resolved);
  };vm.runInContext(`(function(require,module,exports){${source}\n})`,context)(require,module,module.exports);return module.exports;}
 return {load,rows,calls,actor};
}
const contact=(overrides={})=>({id,organization_id:org,display_name:'Customer',phones:['+201234567890'],phone:'+201234567890',emails:['customer@example.com'],tags:[],identities:[],custom_fields:{legacy:'preserved'},notes:[],consents:[],inbox_links:[],status:'lead',archived_at:null,do_not_contact:false,revision:1,updated_at:'2026-01-01T00:00:00Z',...overrides});
const granted={channel:'whatsapp',destination:'+201234567890',purpose:'marketing',status:'granted',source:'Signed customer form',recordedAt:'2026-01-01T00:00:00Z'};
test('audience is stable, normalized and globally suppressed by an unselected duplicate withdrawal',async()=>{
 const h=harness({rows:[contact({consents:[granted]}),contact({id:second,consents:[{...granted,status:'withdrawn',recordedAt:'2026-02-01T00:00:00Z'}]})]});const api=h.load('src/lib/crm/audience.ts');const result=await api.resolveCampaignAudience(org,[id]);assert.equal(result.phones.length,0);assert.equal(result.excluded.length,1);
 const good=harness({rows:[contact({consents:[granted]})]}).load('src/lib/crm/audience.ts');const a=await good.resolveCampaignAudience(org,[id]),b=await good.resolveCampaignAudience(org,[id]);assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));assert.deepEqual(Array.from(a.phones),['+201234567890']);assert.equal(JSON.stringify(a).includes('provider'),false);
});
test('DNC/archive/future/tied withdrawals deny audience and individual destination eligibility',async()=>{
 for(const overrides of [{do_not_contact:true},{archived_at:'2026-01-01'},{consents:[{...granted,recordedAt:'2099-01-01T00:00:00Z'}]},{consents:[granted,{...granted,status:'withdrawn'}]}]){const h=harness({rows:[contact({consents:[granted],...overrides})]});assert.equal((await h.load('src/lib/crm/audience.ts').resolveCampaignAudience(org,[id])).phones.length,0);await assert.rejects(h.load('src/lib/crm/consent.ts').assertDestinationConsent({organizationId:org,channel:'whatsapp',phone:'+20 (123) 456-7890',purpose:'marketing'}));}
 const h=harness({rows:[contact()]});await h.load('src/lib/crm/consent.ts').assertDestinationConsent({organizationId:org,channel:'sms',phone:'+201234567890',purpose:'transactional'});assert.match(h.calls.find(call=>call.or).or,/phones.ov/);
});
test('storage failures fail closed and tenant filters never return foreign contacts',async()=>{
 const failing=harness({failure:true});await assert.rejects(failing.load('src/lib/crm/audience.ts').resolveCampaignAudience(org,[id]),error=>error.status===503);
 const h=harness({rows:[contact({organization_id:other})]});await assert.rejects(h.load('src/lib/crm/service.ts').ManualCrmService.get(org,id),error=>error.status===404);assert.ok(h.calls.some(call=>call.filters?.some(([key,value])=>key==='organization_id'&&value===org)));
});
test('writes recheck current role, organization and revisions; unknown provider mappings cannot be inserted',async()=>{
 for(const options of [{role:'viewer'},{removed:true},{suspended:true},{failure:true}]){const h=harness(options);await assert.rejects(h.load('src/lib/crm/service.ts').ManualCrmService.save(h.actor,{display_name:'New customer'}));}
 const h=harness({rows:[contact()]});const service=h.load('src/lib/crm/service.ts').ManualCrmService;await assert.rejects(service.save(h.actor,{display_name:'Changed'},{id,revision:0}),error=>error.status===409);await assert.rejects(service.save(h.actor,{display_name:'New',zernio_contact_id:'local-uuid'}),error=>error.status===400);await assert.rejects(service.save(h.actor,{display_name:'New',custom_fields:{unknown:3}}),error=>error.status===400);
 await service.save(h.actor,{display_name:'Changed',custom_fields:{legacy:'preserved'}},{id,revision:1});assert.equal(h.calls.find(call=>call.update)?.update.custom_fields.legacy,'preserved');
});
test('consent records server time; manual inbox links require native account/conversation ownership',async()=>{
 const h=harness({rows:[contact()]});const service=h.load('src/lib/crm/service.ts').ManualCrmService;await service.consent(h.actor,id,{...granted,recordedAt:'2099-01-01'},1);assert.ok(Date.parse(h.calls.find(call=>call.update).update.consents[0].recordedAt)<=Date.now());
 const foreign=harness({rows:[contact()],foreignLink:true});await assert.rejects(foreign.load('src/lib/crm/service.ts').ManualCrmService.linkInbox(foreign.actor,id,{accountId:'owned-account',conversationId:'owned-conversation'},1),error=>error.status===403);
});
test('CSV preview preserves quoting, rejects invalid and repeated destinations, imports explicit row decisions only',async()=>{
 const h=harness();const service=h.load('src/lib/crm/service.ts').ManualCrmService;
 const csv='display_name,phones\r\n"Customer, One",+201234567890\r\nSecond,+201234567890\r\nBad,123';const preview=await service.preview(org,csv);assert.equal(preview.rows[0].contact.display_name,'Customer, One');assert.match(preview.rows[1].errors[0],/within this CSV/);assert.equal(preview.rows[2].errors.length,1);
 await assert.rejects(service.import(h.actor,csv,preview.hash,[],'key'),error=>error.status===409);
 await service.import(h.actor,csv,preview.hash,[{row:2,action:'create'},{row:3,action:'skip'},{row:4,action:'skip'}],'key');assert.equal(h.calls.find(call=>call.rpc).input.p_operations.length,1);
 const out=h.load('src/lib/crm/csv.ts').exportCrmCsv([{display_name:'=HYPERLINK("bad")',phones:['+201234567890']}]);assert.match(out,/"'=HYPERLINK/);assert.match(out,/"'\+201234567890"/);
});
test('actual CRM API dispatch denies anonymous/viewer/foreign requests and malformed/automation payloads',async()=>{
 for(const [options,status,method] of [[{anonymous:true},401,'GET'],[{role:'viewer'},403,'POST'],[{removed:true},403,'GET']]){const h=harness(options);const route=h.load('src/app/api/crm/route.ts');const response=await route[method](new Request('http://local/api/crm?resource=contacts',{method,...(method==='POST'?{body:JSON.stringify({action:'create',contact:{display_name:'Denied'}})}:{})}));assert.equal(response.status,status);}
 const h=harness();const route=h.load('src/app/api/crm/route.ts');assert.equal((await route.GET(new Request(`http://local/api/crm?organizationId=${other}`))).status,403);
 assert.equal((await route.POST(new Request('http://local/api/crm',{method:'POST',body:'{invalid'}))).status,400);
 const automation=await route.POST(new Request('http://local/api/crm',{method:'POST',body:JSON.stringify({action:'automation'})}));assert.equal(automation.status,400);assert.match((await automation.json()).error.message,/coming soon/i);
 const list=await route.GET(new Request('http://local/api/crm?resource=contacts'));assert.equal(list.status,200);assert.equal(list.headers.get('Cache-Control'),'no-store');assert.equal((await list.json()).organizationId,org);
});
test('permanent removal preserves durable consent and do-not-contact suppression',async()=>{
 for(const overrides of [{consents:[granted]},{do_not_contact:true}]){const h=harness({role:'owner',rows:[contact({archived_at:'2026-10-20',...overrides})]});await assert.rejects(h.load('src/lib/crm/service.ts').ManualCrmService.purge(h.actor,id),error=>error.status===409);assert.equal(h.calls.some(call=>call.delete),false);const response=await h.load('src/app/api/crm/route.ts').POST(new Request('http://local/api/crm',{method:'POST',body:JSON.stringify({action:'purge',id})}));assert.equal(response.status,409);}
 const h=harness({role:'owner',rows:[contact({archived_at:'2026-10-20'})]});await h.load('src/lib/crm/service.ts').ManualCrmService.purge(h.actor,id);assert.equal(h.calls.some(call=>call.delete),true);
});
test('CSV row decisions retain original row numbers when a blank record is skipped',()=>{
 const inputs=harness().load('src/lib/crm/csv.ts').crmCsvInputs('display_name,phones\r\n\r\nCustomer,+201234567890\r\n,\r\nSecond,+201111111111');assert.deepEqual(Array.from(inputs,row=>row.row),[3,5]);
});

test('consent chronology compares instants across timezone offsets and withdrawal wins an equal instant',async()=>{
 const api=harness().load('src/lib/crm/audience.ts');
 const grant={...granted,recordedAt:'2026-01-01T12:30:00+03:00'},withdrawal={...granted,status:'withdrawn',recordedAt:'2026-01-01T10:00:00Z'};
 assert.equal(api.currentCrmConsent([grant,withdrawal],'whatsapp',granted.destination,'marketing').status,'withdrawn');
 assert.equal(api.currentCrmConsent([withdrawal,{...grant,recordedAt:'2026-01-01T13:00:00+03:00'}],'whatsapp',granted.destination,'marketing').status,'withdrawn');
 const h=harness({rows:[contact({consents:[grant,withdrawal]})]});
 assert.equal((await h.load('src/lib/crm/audience.ts').resolveCampaignAudience(org,[id])).phones.length,0);
 await assert.rejects(h.load('src/lib/crm/consent.ts').assertDestinationConsent({organizationId:org,channel:'whatsapp',phone:granted.destination,purpose:'marketing'}),e=>e.status===409);
});
