import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
const container = process.env.PHASE1C_PG_CONTAINER;
const sql = (query) => execFileSync('docker', ['exec','-i',container,'psql','-U','postgres','-d','phase1c','-At','-v','ON_ERROR_STOP=1'], { input:query, encoding:'utf8' }).trim();
const org='00000000-0000-0000-0000-000000000001';
const event=(id,type,extra={})=>({id,event:type,timestamp:'2026-10-19T12:00:00Z',profiles:[{id:'profile-a',externalId:org}],account:{accountId:'account-a',profileId:'profile-a',platform:'whatsapp'},...extra});
const quote=(value)=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
const accept=(value,endpoints=[])=>`select accept_zernio_webhook('${org}','profile-a',${quote(value)},${quote(endpoints)});`;
test('actual PostgreSQL transaction: rollback, retry, duplicate, tenant, ordering and leased outbox', {skip:!container},()=>{
 sql(`insert into organizations(id,name,slug,zernio_profile_id) values('${org}','Fixture','phase1c-fixture','profile-a') on conflict do nothing; delete from zernio_webhook_events where organization_id='${org}'; delete from zernio_webhook_projection where organization_id='${org}';`);
 const received=event('received','message.received',{message:{id:'m1',conversationId:'c1',sentAt:'2026-10-19T11:59:00Z',text:'hello',direction:'incoming'}});
 // A failing outbox insert must roll back the event and its projection.
 assert.throws(()=>sql(accept(received,[{id:'endpoint-a',secret:'fixture'}])));
 assert.equal(sql(`select count(*) from zernio_webhook_events where event_id='received';`),'0');
 assert.equal(JSON.parse(sql(accept(received,[{id:'endpoint-a',url:'https://fixture.invalid',secret:'fixture'}]))).deduplicated,false);
 assert.equal(JSON.parse(sql(accept(received))).deduplicated,true);
 assert.equal(sql(`select count(*) from zernio_webhook_outbox where event_id='received';`),'1');
 assert.match(sql(accept({...received,message:{...received.message,text:'changed'}})),/identifier reused/);
 assert.match(sql(accept(event('foreign','whatsapp.number.activated',{number:{id:'n1',profileId:'other'}}))),/mapping mismatch/);
 const read=event('read','message.read',{message:{id:'m2'},statusAt:'2026-10-19T12:05:00Z'});
 sql(accept(read));sql(accept(event('delivered','message.delivered',{message:{id:'m2'},statusAt:'2026-10-19T12:04:00Z'})));
 sql(accept(event('sent','message.sent',{message:{id:'m2',sentAt:'2026-10-19T12:00:00Z',text:'outgoing'}})));
 assert.equal(sql(`select event_type from zernio_webhook_projection where resource_key='message:account-a:m2:receipt';`),'message.read');
 const claimed=JSON.parse(sql(`select row_to_json(r) from claim_zernio_webhook_outbox('worker1',25) r;`));
 assert.equal(sql(`select count(*) from claim_zernio_webhook_outbox('worker2',25);`),'0');
 assert.equal(sql(`select finish_zernio_webhook_outbox('${claimed.id}','wrong',200,true);`),'f');
 assert.equal(sql(`select finish_zernio_webhook_outbox('${claimed.id}','worker1',503,false);`),'t');
 assert.equal(sql(`select count(*) from claim_zernio_webhook_outbox('worker2',25);`),'0');
 sql(`update zernio_webhook_outbox set available_at=now()-interval '1 second'; select count(*) from claim_zernio_webhook_outbox('crashed-worker',25); update zernio_webhook_outbox set lease_until=now()-interval '1 second';`);
 assert.equal(sql(`select count(*) from claim_zernio_webhook_outbox('replacement',25);`),'1');
 assert.equal(sql(`select finish_zernio_webhook_outbox('${claimed.id}','crashed-worker',200,true);`),'f');
 assert.equal(sql(`select finish_zernio_webhook_outbox('${claimed.id}','replacement',200,true);`),'t');
 assert.equal(sql(`select count(*) from claim_zernio_webhook_outbox('worker3',25);`),'0');
 assert.throws(()=>sql(`set role authenticated; select * from zernio_webhook_outbox;`));
 assert.throws(()=>sql(`set role anon; ${accept(event('denied','message.read'))}`));
});
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

test('real outbox worker signs stable payload, records 503 retry and acknowledges 200', {skip:!container}, async()=>{
 sql(`delete from zernio_webhook_events where organization_id='${org}';`);
 sql(accept(event('worker-test','message.received',{message:{id:'m-worker',conversationId:'c-worker'}}),[{id:'endpoint',url:'https://receiver.fixture',secret:'secret-fixture'}]));
 let responseStatus=503;
 const observed=[];
 const db={rpc:(name,args)=>({abortSignal:async()=>{
   if(name==='claim_zernio_webhook_outbox') {
     const rows=sql(`select coalesce(json_agg(r),'[]'::json) from claim_zernio_webhook_outbox('${args.p_token}',${args.p_limit}) r;`);
     return {data:JSON.parse(rows),error:null};
   }
   return {data:sql(`select finish_zernio_webhook_outbox('${args.p_id}','${args.p_token}',${args.p_status},${args.p_success});`)==='t',error:null};
 }})};
 const source=ts.transpileModule(fs.readFileSync('src/lib/webhooks/outbox.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const exports={};
 const require=(name)=>{
   if(name==='crypto') return crypto;
   if(name==='@/lib/supabase/admin') return {createSupabaseAdminClient:()=>db};
   if(name==='./delivery') return {deliverCustomerWebhook:async(url,raw,headers)=>{observed.push({url,raw,headers});return responseStatus;}};
   throw new Error('Module denied '+name);
 };
 vm.runInNewContext(`(function(require,exports){${source}\n})`,{AbortSignal,Promise,Math,process:{env:{SUPABASE_SERVICE_ROLE_KEY:'fixture'}}})(require,exports);
 assert.deepEqual(JSON.parse(JSON.stringify(await exports.drainZernioWebhookOutbox())),{delivered:0,failed:1});
 assert.equal(JSON.parse(observed[0].raw).id,'worker-test');
 assert.equal(observed[0].headers['X-Asra3-Signature'],'sha256='+crypto.createHmac('sha256','secret-fixture').update(observed[0].raw).digest('hex'));
 sql(`update zernio_webhook_outbox set available_at=now()-interval '1 second';`);
 responseStatus=200;
 assert.deepEqual(JSON.parse(JSON.stringify(await exports.drainZernioWebhookOutbox())),{delivered:1,failed:0});
 assert.equal(observed[0].raw,observed[1].raw);
 assert.deepEqual(JSON.parse(JSON.stringify(await exports.drainZernioWebhookOutbox())),{delivered:0,failed:0});
});
import { isIP } from 'node:net';
import { EventEmitter } from 'node:events';

test('actual HTTPS delivery pins public DNS in both Node lookup modes and does not follow redirects', async()=>{
 const source=ts.transpileModule(fs.readFileSync('src/lib/webhooks/delivery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const make=(addresses,{status=302,timeout=false}={})=>{
  let requests=0;
  let lookups=0;
  const exports={};
  const signal=new AbortController();
  const require=(name)=>{
   if(name==='node:net')return {isIP};
   if(name==='node:dns/promises')return {lookup:async()=>{lookups++;if(timeout){queueMicrotask(()=>signal.abort());return new Promise(()=>{});}return addresses;}};
   if(name==='node:https')return {request:(url,options,respond)=>{
    requests++;
    assert.equal(url.hostname,'receiver.example');
    options.lookup('receiver.example',{all:true},(err,value)=>{assert.equal(err,null);assert.equal(value[0].address,addresses[0].address);});
    options.lookup('receiver.example',{all:false},(err,address,family)=>{assert.equal(err,null);assert.equal(address,addresses[0].address);assert.equal(family,addresses[0].family);});
    const request=new EventEmitter();
    request.end=()=>respond({statusCode:status,resume:()=>{}});
    return request;
   }};
   throw new Error('Denied '+name);
  };
  vm.runInNewContext(`(function(require,exports){${source}\n})`,{URL,Promise,AbortSignal:{timeout:()=>signal.signal}})(require,exports);
  return {send:exports.deliverCustomerWebhook,counts:()=>({requests,lookups})};
 };
 const publicDns=make([{address:'93.184.216.34',family:4}]);
 assert.equal(await publicDns.send('https://receiver.example/path','{}',{}),302);
 assert.deepEqual(publicDns.counts(),{requests:1,lookups:1});
 for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','172.20.0.1','192.168.1.2','100.64.0.1','::1','::ffff:127.0.0.1','fd00::1','fe80::1','2001:db8::1']) {
  const blocked=make([{address,family:isIP(address)}]);
  await assert.rejects(blocked.send('https://receiver.example','{}',{}),/Private/);
  assert.equal(blocked.counts().requests,0);
 }
 const mixed=make([{address:'93.184.216.34',family:4},{address:'10.0.0.2',family:4}]);
 await assert.rejects(mixed.send('https://receiver.example','{}',{}),/Private/);
 for(const url of ['http://receiver.example','https://user:pass@receiver.example','https://receiver.example:8443']) await assert.rejects(publicDns.send(url,'{}',{}),/public HTTPS/);
 const timed=make([],{timeout:true});
 await assert.rejects(timed.send('https://receiver.example','{}',{}),/DNS timeout/);
 assert.equal(timed.counts().requests,0);
});
