import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import crypto from 'node:crypto';

const source=ts.transpileModule(fs.readFileSync('src/lib/whatsapp/broadcasts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(overrides={}){
 const calls=[];
 let broadcast={id:'bc1',accountId:'account1',platform:'whatsapp',status:'draft',recipientCount:1,template:{name:'order',language:'en_US'}};
 class ZernioApiException extends Error{constructor(envelope){super(envelope.error);this.envelope=envelope}}
 const deps={
 'crypto':crypto,
 '@/lib/auth/tenant-provider':{requireTenantAccounts:async(org,ids)=>{assert.equal(org,'org1');if(ids[0]!=='account1')throw Error('foreign account');return[{platform:'whatsapp',isActive:true,...overrides.account}]}},
 '@/lib/services/core-connect.service':{CoreConnectService:{ensureTenantProfile:async()=> 'profile1'}},
 '@/lib/zernio/policy-engine':{assertSubServiceAllowed:async()=>{}},
 '@/lib/zernio/client':{ZernioApiException,zernioClient:{request:async params=>{calls.push(params);let data;if(params.path==='/whatsapp/templates')data={templates:[{name:'order',language:'en_US',status:overrides.approval||'APPROVED'}]};else if(params.path==='/broadcasts'&&params.method==='POST')data={broadcast:{...broadcast,...overrides.created}};else if(params.path==='/broadcasts')data={broadcasts:[broadcast,{...broadcast,id:'foreign',accountId:'account2'}]};else if(params.path==='/broadcasts/bc1')data={broadcast:{...broadcast,...overrides.broadcast}};else if(params.path.endsWith('/recipients'))data=overrides.addResponse||{added:1,skipped:0};else if(params.path.endsWith('/send'))data=overrides.sendResponse||{status:'sending',sent:0,failed:0,recipientCount:1};else throw Error('Unexpected provider path');return{data,status:200}}}}
 };
 const module={exports:{}};vm.runInNewContext(source,{exports:module.exports,require:name=>deps[name],URL,Set,Object,Number,String,Array,Boolean});
 return{service:module.exports.WhatsAppBroadcastService,calls};
}
const account={organizationId:'org1',accountId:'account1'};
const params={...account,broadcastId:'bc1'};
const create={...account,name:'Order update',template:{name:'order',language:'en_US'},idempotencyKey:'intent1'};
test('draft creation sends verified profile and exact template without recipients',async()=>{const f=fixture();await f.service.create({...create,profileId:'foreign',phones:['123']});const call=f.calls.find(x=>x.path==='/broadcasts');assert.equal(call.body.profileId,'profile1');assert.equal(call.body.platform,'whatsapp');assert.equal(call.idempotencyKey,`asra3-bc-${crypto.createHash('sha256').update(JSON.stringify(['org1','account1','create','intent1'])).digest('hex')}`);assert.equal(call.body.phones,undefined);assert.equal(call.body.segmentFilters,undefined)});
test('unapproved template never creates provider draft',async()=>{const f=fixture({approval:'PENDING'});await assert.rejects(f.service.create(create),/not approved/);assert.equal(f.calls.filter(x=>x.path==='/broadcasts').length,0)});
test('foreign account never reaches provider',async()=>{const f=fixture();await assert.rejects(f.service.get({...params,accountId:'account2'}),/foreign account/);assert.equal(f.calls.length,0)});
test('foreign broadcast cannot add recipients or dispatch',async()=>{for(const operation of ['addRecipients','send']){const f=fixture({broadcast:{accountId:'account2'}});await assert.rejects(f.service[operation]({...params,phones:['+12025550100']}),/not found/);assert.equal(f.calls.some(x=>x.method==='POST'),false)}});
test('disconnected account blocks create',async()=>{const f=fixture({account:{needsReconnection:true}});await assert.rejects(f.service.create(create),/Reconnect/);assert.equal(f.calls.length,0)});
test('recipient addition normalizes and deduplicates explicit phones, never segment',async()=>{const f=fixture();await f.service.addRecipients({...params,phones:['+12025550100','12025550100'],useSegment:true});const call=f.calls.find(x=>x.path.endsWith('/recipients'));assert.deepEqual(JSON.parse(JSON.stringify(call.body)),{phones:['12025550100'],useSegment:false})});
test('recipient failure never creates or sends another broadcast',async()=>{const f=fixture({addResponse:{success:false,error:'unavailable'}});await assert.rejects(f.service.addRecipients({...params,phones:['+12025550100']}));assert.equal(f.calls.filter(x=>x.path==='/broadcasts').length,0);assert.equal(f.calls.some(x=>x.path.endsWith('/send')),false)});
test('dispatch rechecks recipients and approval',async()=>{for(const overrides of [{broadcast:{recipientCount:0}},{approval:'REJECTED'},{broadcast:{status:'sending'}}]){const f=fixture(overrides);await assert.rejects(f.service.send(params));assert.equal(f.calls.some(x=>x.path.endsWith('/send')),false)}});
test('provider malformed acknowledgments rejected',async()=>{const f=fixture({created:{id:undefined}});await assert.rejects(f.service.create(create),/identifier/);const g=fixture({sendResponse:{success:true}});await assert.rejects(g.service.send(params),/confirm broadcast/)});
test('list filters provider results to selected verified account',async()=>{const f=fixture();const result=await f.service.list(account);assert.equal(result.broadcasts.length,1);assert.equal(f.calls[0].query.profileId,'profile1')});
