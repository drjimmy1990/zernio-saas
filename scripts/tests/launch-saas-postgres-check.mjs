import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync,spawn } from 'node:child_process';

const name=`asra3-saas-test-${crypto.randomBytes(6).toString('hex')}`;
const docker=(args,input)=>{const r=spawnSync('docker',args,{encoding:'utf8',input,windowsHide:true});if(r.status!==0)throw new Error(r.stderr||r.error?.message||'Docker failed');return r.stdout.trim();};
let id;
try{
 id=docker(['run','--rm','-d','--name',name,'-e',`POSTGRES_PASSWORD=${crypto.randomBytes(24).toString('hex')}`,'-e','POSTGRES_DB=saas','postgres:16-alpine']);assert.match(id,/^[a-f0-9]{64}$/);
 for(let i=0;i<100;i++){if(spawnSync('docker',['exec',id,'pg_isready','-U','postgres','-d','saas'],{windowsHide:true,stdio:'ignore'}).status===0)break;await new Promise(r=>setTimeout(r,250));}
 await new Promise(r=>setTimeout(r,1500));
 const sql=s=>docker(['exec','-i',id,'psql','-U','postgres','-d','saas','-v','ON_ERROR_STOP=1','-At'],s);
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select current_user::text$$;grant usage on schema public,auth to authenticated,anon,service_role;`);
 const org='11111111-1111-4111-8111-111111111111',owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',viewer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')&&f<='20261020000007_saas_security.sql').sort()) {sql(fs.readFileSync(`supabase/migrations/${file}`,'utf8'));console.log(`Applied ${file}`);if(file==='20261017000001_full_schema_and_super_admin.sql')sql(`insert into auth.users values('${owner}'),('${viewer}');insert into organizations(id,name,slug,plan_key)values('${org}','Existing customer','existing','agency');insert into org_members(organization_id,user_id,role) values('${org}','${owner}','owner'),('${org}','${viewer}','viewer');insert into contacts(organization_id,display_name,phone)values('${org}','Preserved customer','+201234567890');`);}
 assert.equal(sql(`select display_name from contacts where organization_id='${org}'`),'Preserved customer');
 const expectFailure=(s)=>assert.throws(()=>sql(s));
 expectFailure(`select saas_change_member('${org}','${owner}','${owner}',null);`);
 expectFailure(`select saas_change_member('${org}','${viewer}','${owner}','viewer');`);
 const first=sql(`select saas_provision_signup('${owner}','Recovered');`).split('\n').at(-1);assert.equal(first,org);
 const session=JSON.parse(sql(`select saas_issue_session('${owner}','${org}',now()+interval '1 day');`).split('\n').at(-1));assert.ok(session.sessionId);
 sql(`select saas_configure_spending('${org}','usr_super_admin','whatsapp_send',true,25,3,'Controlled trial');select saas_grant_allowance('${org}','usr_super_admin',100,'grant-1','Controlled trial');`);
 expectFailure(`select saas_grant_allowance('${org}','${owner}',100,'self-credit','forged');`);
 const reserve=key=>`select saas_reserve_allowance('${org}','whatsapp_send','${key}',null,'admin spending allocation, not provider quote',null,2);`;
 const r=JSON.parse(sql(reserve('send-one')).split('\n').at(-1));assert.equal(r.amountMinor,50);assert.equal(r.replayed,false);assert.equal(JSON.parse(sql(reserve('send-one')).split('\n').at(-1)).replayed,true);
 sql(`select saas_grant_allowance('${org}','usr_super_admin',100,'grant-1','Controlled trial');`);
 assert.equal(sql(`select available_minor from saas_allowances where organization_id='${org}'`),'50');
 const concurrent=s=>new Promise(resolve=>{const p=spawn('docker',['exec','-i',id,'psql','-U','postgres','-d','saas','-v','ON_ERROR_STOP=1','-At'],{windowsHide:true});let out='';p.stdout.on('data',b=>out+=b);p.on('close',code=>resolve({code,out}));p.stdin.end(s);});
 const outcomes=await Promise.all([concurrent(reserve('send-two')),concurrent(reserve('send-three'))]);assert.equal(outcomes.filter(x=>x.code===0&&JSON.parse(x.out.trim()).reservationId).length,1);
 assert.equal(sql(`select reserved_minor from saas_allowances where organization_id='${org}'`),'100');
 const result=JSON.parse(sql(`select saas_finish_allowance('${org}','${r.reservationId}',20,'provider-one','{"invoice":"confirmed"}',null);`).split('\n').at(-1));assert.equal(result.state,'settled');
 sql(`select saas_finish_allowance('${org}','${r.reservationId}',20,'provider-one','{"invoice":"confirmed"}',null);`);
 assert.equal(sql(`select available_minor||','||reserved_minor||','||spent_minor from saas_allowances where organization_id='${org}'`),'30,50,20');
 expectFailure(`set role authenticated;select * from platform_global_config;`);
 expectFailure(`set role authenticated;select saas_grant_allowance('${org}','usr_super_admin',100,'forged','forged');`);
 expectFailure(`set role authenticated;select set_config('request.jwt.claim.sub','${viewer}',false);update org_members set role='owner' where user_id='${viewer}';`);
 const key=JSON.parse(sql(`select saas_create_api_key('${org}','${owner}','Test',array['read','write'],now()+interval '1 day','asra3_x','hash-one');`).split('\n').at(-1));
 assert.equal(JSON.parse(sql(`select saas_resolve_api_key('hash-one','write');`).split('\n').at(-1)).keyId,key.id);
 sql(`select saas_change_member('${org}','${owner}','${viewer}','owner');select saas_change_member('${org}','${owner}','${owner}','viewer');`);
 assert.equal(JSON.parse(sql(`select saas_resolve_api_key('hash-one','write');`).split('\n').at(-1)).status,401);
 assert.ok(sql(`select revoked_at is not null from saas_sessions where id='${session.sessionId}'`)==='t');
 const patched=JSON.parse(sql(`select saas_admin_patch('tenant','${org}','{"custom_allowed_platforms":[],"custom_max_phone_numbers":0}','usr_super_admin');`).split('\n').at(-1));assert.deepEqual(patched.override.custom_allowed_platforms,[]);assert.equal(patched.override.custom_max_phone_numbers,0);
 sql(`select saas_admin_patch('plan','starter','{"max_monthly_posts":0}','usr_super_admin');select saas_admin_patch('global','1','{"enabled_ad_platforms":[]}','usr_super_admin');`);
 assert.equal(sql(`select max_monthly_posts from subscription_plan_templates where plan_key='starter'`),'0');
 expectFailure(`select saas_admin_patch('tenant','${org}','{"plan_key":"unknown","custom_max_phone_numbers":50}','usr_super_admin');`);
 assert.equal(sql(`select custom_max_phone_numbers from org_feature_overrides where organization_id='${org}'`),'0');
 const token='invite-hash';sql(`select saas_invite_member('${org}','${viewer}','invited@example.invalid','editor','${token}');`);
 expectFailure(`select saas_accept_invitation('${owner}','wrong@example.invalid','${token}');`);
 assert.equal(sql(`select saas_accept_invitation('${owner}','invited@example.invalid','${token}');`).split('\n').at(-1),org);
 expectFailure(`select saas_accept_invitation('${owner}','invited@example.invalid','${token}');`);
 sql(`select saas_archive_workspace('${org}','usr_super_admin');`);
 assert.equal(sql(`select status from organizations where id='${org}'`),'Archived');
 assert.ok(Number(sql(`select count(*) from saas_audit where action like 'admin_patch_%'`))>=4);
 console.log('SaaS PostgreSQL: persistence, last owner, atomic allowance/replay/concurrency, evidence settlement, key revocation and secret/RLS boundaries passed.');
} finally {if(id&&/^[a-f0-9]{64}$/.test(id))docker(['stop',id]);}
