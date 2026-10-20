import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawn,spawnSync} from 'node:child_process';
import test,{before,after} from 'node:test';
import ts from 'typescript';
const root=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'asra3-campaigns-'));
let server,origin,output='',errors='';
before(async()=>{
  const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));origin=`http://127.0.0.1:${port}/zernio`;
  server=spawn('postman',['simulation','run','postman/simulations/launch-campaigns.sim.yaml','--port',String(port),'--output','ndjson','--no-history'],{cwd:root,windowsHide:true});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(errors||'Fixture startup timeout')),30000);server.on('error',e=>{clearTimeout(timer);reject(e);});server.stdout.on('data',b=>{output+=b;if(output.includes('"event":"listening"')){clearTimeout(timer);resolve();}});server.stderr.on('data',b=>errors+=b);});
});
after(()=>{if(server?.pid){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else server.kill('SIGINT');}fs.writeFileSync(path.join(temp,'simulation.ndjson'),output);assert.match(output,/"event":"request"/);console.log(`Campaign HTTP evidence: ${temp}`);});
async function reset(scenario='success'){await fetch(`${origin}/__fixture/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario})});}
async function calls(){return (await(await fetch(`${origin}/__fixture/state`)).json()).requests;}
async function providerStatus(status){await fetch(`${origin}/__fixture/status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});}
const org='org-a',actor='11111111-1111-4111-8111-111111111111',contact='33333333-3333-4333-8333-333333333333';
function runtime(options={}){
  class AccessError extends Error{constructor(status,message){super(message);this.status=status;}}
  const records=new Map(), reservations=[], released=[], modules={};let audienceReads=0;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const store={
    async get(organizationId,id){const r=records.get(id);if(!r||r.organization_id!==organizationId)throw new AccessError(404,'Campaign not found');return copy(r);},
    async create(value){const row={...value,revision:1,status:'draft',provider_id:null,operation_token:null,scheduled_at:null,reservation_id:null,updated_at:new Date().toISOString()};records.set(row.id,row);return copy(row);},
    async edit(organizationId,id,revision,value){const row=await this.get(organizationId,id);if(row.revision!==revision||row.operation_token)throw new AccessError(409,'Campaign changed');Object.assign(row,value,{revision:revision+1});records.set(id,row);return copy(row);},
    async claim(organizationId,id,token){const row=await this.get(organizationId,id);if(!['draft','scheduled'].includes(row.status)||row.operation_token||row.status==='scheduled'&&Date.parse(row.scheduled_at)>Date.now())throw new AccessError(409,'Campaign already processing');Object.assign(row,{status:'dispatching',operation_token:token,revision:row.revision+1,updated_at:new Date().toISOString()});records.set(id,row);return copy(row);},
    async progress(campaign,token,value){const row=records.get(campaign.id);if(row.operation_token!==token)throw new AccessError(503,'Storage fence');Object.assign(row,value);return copy(row);},
  };
  const database={from(table){assert.equal(table,'org_members');return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:options.removed?null:{role:'editor'},error:null};}};}};
  const context=vm.createContext({URL,Request,Response,Headers,Buffer,Date,Intl,AbortController,setTimeout,clearTimeout,console,process:{env:{ZERNIO_BASE_URL:`${origin}/api/v1`,ZERNIO_API_KEY:'launch_campaigns_mock_key'}},fetch:(url,input)=>{assert.equal(new URL(url).origin,new URL(origin).origin,'Live request forbidden');return fetch(url,input);}});
  function load(file){if(modules[file])return modules[file].exports;const module={exports:{}};modules[file]=module;
    const source=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const require=name=>{
      if(['crypto','node:crypto'].includes(name))return crypto;
      if(name==='@/lib/auth/tenant-access')return {TenantAccessError:AccessError};
      if(name==='@/lib/zernio/policy-engine')return {getFallbackStore:()=>({globalConfig:{}}),assertSubServiceAllowed:async id=>assert.equal(id,org)};
      if(name==='@/lib/services/core-connect.service')return {CoreConnectService:{ensureTenantProfile:async id=>{assert.equal(id,org);return 'profile-a';}}};
      if(name==='@/lib/crm/audience')return {resolveCampaignAudience:async()=>{audienceReads++;return {phones:options.withdrawAt&&audienceReads>=options.withdrawAt?[]:['+201000000001'],contactIds:[contact],evidence:[{contactId:contact,consent:'granted'}],excluded:[]};}};
      if(name==='@/lib/saas/allowance')return {SaasAllowanceService:{assertCapability:async()=>{if(options.noAllowance)throw new AccessError(403,'Allowance disabled');},reserveUnits:async input=>{if(options.noAllowance)throw new AccessError(403,'Allowance disabled');reservations.push(input);return {reservationId:'reservation-a',state:'reserved',replayed:false};},release:async input=>released.push(input)}};
      if(file==='src/lib/campaigns/service.ts'&&name==='./store')return {CampaignStore:store,campaignDb:()=>database};
      if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);
      if(name.startsWith('.'))return load(path.posix.join(path.posix.dirname(file),`${name}.ts`));
      throw new Error(`Unexpected dependency ${name}`);
    };
    vm.runInContext(`(function(require,module,exports){${source}\n})`,context)(require,module,module.exports);return module.exports;
  }
  const service=load('src/lib/campaigns/service.ts').CampaignService;
  async function draft(){const preview=await service.preview(org,[contact]);return service.save(org,actor,{id:crypto.randomUUID(),name:'Reviewed offer',accountId:'owned',template:{name:'launch_offer',language:'en_US'},contactIds:[contact],audienceHash:preview.hash,reviewed:true});}
  return {service,draft,records,reservations,released};
}
test('reviewed campaign writes actual provider draft, exact recipients and one send; results reconcile without redispatch',async()=>{
  await reset();const app=runtime(),draft=await app.draft();const sent=await app.service.dispatch(org,draft.id,draft.revision);
  assert.equal(sent.status,'sending');assert.equal(app.reservations.length,1);assert.equal(app.reservations[0].units,1);
  await assert.rejects(app.service.dispatch(org,draft.id,sent.revision),/already processing/);
  await providerStatus('completed');const reconciled=await app.service.reconcile(org,draft.id,sent.revision);assert.equal(reconciled.status,'completed');
  const result=await app.service.results(org,draft.id);assert.equal(result.cost,null);assert.equal(result.recipients[0].status,'delivered');assert.equal(app.released.length,0);
  assert.equal((await calls()).filter(c=>c.path.endsWith('/send')).length,1);
});
test('unapproved template and disabled allowance block before any provider write',async()=>{
  for(const [scenario,opts,expected]of [['unapproved',{},/not approved/],['success',{noAllowance:true},/Allowance disabled/]]){
    await reset(scenario);const app=runtime(opts),draft=await app.draft();await assert.rejects(app.service.dispatch(org,draft.id,draft.revision),expected);
    assert.equal((await calls()).filter(c=>c.method!=='GET').length,0);assert.equal(app.records.get(draft.id).status,'needs_review');
  }
});
test('consent withdrawal and removed creator stop dispatch',async()=>{
  for(const opts of [{withdrawAt:3},{removed:true}]){await reset();const app=runtime(opts),draft=await app.draft();await assert.rejects(app.service.dispatch(org,draft.id,draft.revision),/consent changed|no longer/);assert.equal((await calls()).filter(c=>c.method!=='GET').length,0);}
});
test('recipient or template drift and last-moment withdrawal never send',async()=>{
  for(const [scenario,opts]of [['changed-audience',{}],['changed-template',{}],['success',{withdrawAt:4}]]){
    await reset(scenario);const app=runtime(opts),draft=await app.draft();await assert.rejects(app.service.dispatch(org,draft.id,draft.revision),/recipients differ|template differs|consent changed/);
    assert.equal((await calls()).filter(c=>c.path.endsWith('/send')).length,0);assert.equal(app.records.get(draft.id).status,'uncertain');assert.equal(app.released.length,0);
  }
});
test('unknown create and HTTP429 send retain allowance and never automatically retry',async()=>{
  for(const scenario of ['unknown-create','rate-limit']){await reset(scenario);const app=runtime(),draft=await app.draft();await assert.rejects(app.service.dispatch(org,draft.id,draft.revision));await assert.rejects(app.service.dispatch(org,draft.id,draft.revision),/already processing/);
    assert.equal((await calls()).filter(c=>c.path==='/broadcasts'&&c.method==='POST').length,1);assert.equal((await calls()).filter(c=>c.path.endsWith('/send')).length,scenario==='rate-limit'?1:0);assert.equal(app.released.length,0);
  }
});
test('reconcile reads a known uncertain draft and cancellation confirms deletion',async()=>{
  await reset('changed-audience');const app=runtime(),draft=await app.draft();await assert.rejects(app.service.dispatch(org,draft.id,draft.revision));
  const row=app.records.get(draft.id),reconciled=await app.service.reconcile(org,row.id,row.revision);assert.equal(reconciled.status,'needs_review');
  const cancelled=await app.service.cancel(org,row.id,reconciled.revision);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.result.providerDraftDeleted,true);assert.equal(app.released.length,0);
});
test('future schedules do not run early and stale revision/cross-tenant reads are denied',async()=>{
  await reset();const app=runtime(),draft=await app.draft();await assert.rejects(app.service.schedule(org,draft.id,999,new Date(Date.now()+3600000).toISOString()),/Refresh/);
  const row=await app.service.schedule(org,draft.id,draft.revision,new Date(Date.now()+3600000).toISOString());assert.equal(row.status,'scheduled');await assert.rejects(app.service.dispatch(org,draft.id,row.revision),/already processing/);await assert.rejects(app.service.results('org-b',draft.id),/not found/);
});
