import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('manual CRM baseline upgrade preserves records; direct roles, validation, import rollback/replay and persistence',async()=>{
 const name=`asra3-crm-test-${crypto.randomBytes(5).toString('hex')}`;
 const run=(args,input)=>{const result=spawnSync('docker',args,{input,encoding:'utf8',windowsHide:true});if(result.status!==0)throw new Error(result.stderr||result.stdout||result.error?.message);return result.stdout;};
 let container;
 try{
  container=run(['run','--rm','-d','--name',name,'-e',`POSTGRES_PASSWORD=${crypto.randomBytes(20).toString('hex')}`,'-e','POSTGRES_DB=crm','postgres:16-alpine']).trim();
  for(let i=0;i<80;i++){const check=spawnSync('docker',['exec',container,'psql','-U','postgres','-d','crm','-t','-A','-c',"select not pg_is_in_recovery() and current_setting('listen_addresses') <> ''"],{windowsHide:true,encoding:'utf8'});if(check.status===0&&check.stdout.trim()==='t')break;await new Promise(resolve=>setTimeout(resolve,250));}
  const sql=text=>run(['exec','-i',container,'psql','-U','postgres','-d','crm','-v','ON_ERROR_STOP=1','-t','-A'],text);
  sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   create function auth.role()returns text language sql stable as $$select current_user::text$$;grant usage on schema auth to authenticated,service_role;grant execute on all functions in schema auth to authenticated,service_role;`);
  sql(fs.readFileSync('supabase/migrations/20261017000001_full_schema_and_super_admin.sql','utf8'));
  const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',owner='11111111-1111-4111-8111-111111111111',viewer='22222222-2222-4222-8222-222222222222',editor='33333333-3333-4333-8333-333333333333',foreign='44444444-4444-4444-8444-444444444444',contact='99999999-9999-4999-8999-999999999999';
  sql(`insert into auth.users values('${owner}'),('${viewer}'),('${editor}'),('${foreign}');insert into public.organizations(id,name,slug,status)values('${org}','Our store','our-store','active'),('${other}','Other store','other-store','active');insert into public.org_members(organization_id,user_id,role)values('${org}','${owner}','owner'),('${org}','${viewer}','viewer'),('${org}','${editor}','editor'),('${other}','${foreign}','owner');insert into public.contacts(id,organization_id,display_name,phone,email,custom_fields,channels,zernio_contact_id)values('${contact}','${org}','Preserved customer','+20 (123) 456-7890','Original@Example.com','{"legacy":"retain"}','[{"platform":"whatsapp"}]','provider-real-contact');`);
  sql(fs.readFileSync('supabase/migrations/20261020000006_manual_crm.sql','utf8'));
  assert.match(sql(`select display_name||'|'||phones[1]||'|'||emails[1]||'|'||(custom_fields->>'legacy') from public.contacts where id='${contact}';`),/Preserved customer\|\+201234567890\|original@example.com\|retain/);
  const as=(user,text)=>`set role authenticated;set test.uid='${user}';${text}`;
  assert.equal(sql(as(foreign,`select count(*)from contacts;`)).trim().split('\n').at(-1),'0');
  const denied=(query)=>assert.throws(()=>sql(query));
  denied(as(viewer,`insert into contacts(organization_id,display_name)values('${org}','Denied viewer');`));
  assert.equal(sql(as(viewer,`update contacts set display_name='Cannot edit'where id='${contact}';select display_name from contacts where id='${contact}';`)).trim().split('\n').at(-1),'Preserved customer');
  sql(as(editor,`insert into contacts(organization_id,display_name,phones)values('${org}','Editor customer',array['+201111111111']);`));
  denied(as(editor,`insert into contacts(organization_id,display_name,phones)values('${org}','Invalid',array['123']);`));
  denied(as(editor,`update contacts set owner_user_id='${foreign}'where id='${contact}';`));
  denied(as(editor,`update contacts set inbox_links='[{"accountId":"forged","conversationId":"other"}]'where id='${contact}';`));
  denied(as(editor,`insert into contacts(organization_id,display_name,phones)values('${org}','Duplicate',array['+201234567890']);`));
  sql(as(editor,`insert into contacts(organization_id,display_name,phones,duplicate_reviewed)values('${org}','Reviewed duplicate',array['+201234567890'],true);`));
  denied(as(editor,`update contacts set consents='[{"channel":"whatsapp","destination":"+201234567890","purpose":"marketing","status":"granted","source":"forged","recordedAt":"2099-01-01T00:00:00Z"}]'where id='${contact}';`));
  sql(as(editor,`update contacts set consents=jsonb_build_array(jsonb_build_object('channel','whatsapp','destination','+201234567890','purpose','marketing','status','granted','source','Customer form','recordedAt',clock_timestamp()))where id='${contact}';`));
  denied(as(editor,`update contacts set consents='[]'where id='${contact}';`));
  denied(as(editor,`delete from crm_fields;insert into crm_fields(organization_id,name,kind)values('${org}','Denied field','text');`));
  const field=sql(as(owner,`insert into crm_fields(organization_id,name,kind)values('${org}','Order count','number')returning id;`)).trim().split('\n').find(line=>/^[a-f0-9-]{36}$/.test(line));
  denied(as(editor,`update contacts set custom_fields=jsonb_build_object('${field}','wrong')where id='${contact}';`));
  sql(as(editor,`update contacts set custom_fields=custom_fields||jsonb_build_object('${field}',3)where id='${contact}';`));
  denied(as(editor,`insert into crm_audiences(organization_id,name,contact_ids)values('${other}','Foreign',array['${contact}'::uuid]);`));
  const operations=JSON.stringify([{action:'create',contact:{display_name:'Imported customer',phones:['+201222222222']}},{action:'update',id:contact,revision:0,contact:{display_name:'Should rollback'}}]);
  denied(`set role service_role;select crm_import_contacts('${org}','${editor}','rollback','csv-hash','${operations}'::jsonb);`);
  assert.equal(sql(`select count(*)from contacts where display_name='Imported customer';`).trim(),'0');
  const valid=JSON.stringify([{action:'create',contact:{display_name:'Imported customer',phones:['+201222222222']}}]);
  const invoke=`set role service_role;select crm_import_contacts('${org}','${editor}','stable-import','csv-hash','${valid}'::jsonb);`;
  assert.match(sql(invoke),/"created": 1/);assert.match(sql(invoke),/"created": 1/);assert.equal(sql(`select count(*)from contacts where display_name='Imported customer';`).trim(),'1');
  denied(`set role authenticated;set test.uid='${editor}';select crm_import_contacts('${org}','${owner}','forged','hash','[]');`);
  denied(`set role service_role;select crm_import_contacts('${org}','${editor}','stable-import','different','[]');`);
  denied(as(editor,`delete from contacts where id='${contact}';insert into crm_audiences(organization_id,name,contact_ids)values('${org}','Bad audience',array['${foreign}'::uuid]);`));
  sql(as(editor,`update contacts set archived_at=now()where id='${contact}';`));
  assert.equal(sql(as(editor,`delete from contacts where id='${contact}';select count(*)from contacts where id='${contact}';`)).trim().split('\n').at(-1),'1');
  denied(as(owner,`delete from contacts where id='${contact}';`));
  denied(`set role service_role;delete from contacts where id='${contact}';`);
  sql(as(editor,`update contacts set archived_at=now(),do_not_contact=true where display_name='Reviewed duplicate';`));
  denied(as(owner,`delete from contacts where display_name='Reviewed duplicate';`));
  sql(as(editor,`update contacts set archived_at=now() where display_name='Editor customer';`));
  sql(as(owner,`delete from contacts where display_name='Editor customer';`));
  assert.equal(sql(`select count(*)from contacts where id='${contact}';`).trim(),'1');
  run(['restart',container]);for(let i=0;i<80;i++){if(spawnSync('docker',['exec',container,'pg_isready','-U','postgres','-d','crm'],{windowsHide:true,stdio:'ignore'}).status===0)break;await new Promise(resolve=>setTimeout(resolve,250));}
  assert.equal(sql(`select count(*)from contacts where display_name='Imported customer';`).trim(),'1');
 }finally{if(container&&/^[a-f0-9]{64}$/.test(container))run(['stop',container]);}
});
