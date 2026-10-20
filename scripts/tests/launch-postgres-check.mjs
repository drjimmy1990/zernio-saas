import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

// A baseline-only upgrade with representative records, using a disposable database.
// No production credentials, host port or persistent volume are used.
const root = process.cwd(), name = `asra3-launch-${crypto.randomBytes(6).toString('hex')}`;
function docker(args, input) { const result = spawnSync('docker', args, { encoding: 'utf8', input, windowsHide: true }); if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Docker failed'); return result.stdout.trim(); }
let container;
try {
  const files = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
  assert.ok(files.includes('20261020000006_manual_crm.sql'), 'The final CRM migration must be present.');
  container = docker(['run', '--rm', '-d', '--name', name, '-e', `POSTGRES_PASSWORD=${crypto.randomBytes(24).toString('hex')}`, '-e', 'POSTGRES_DB=launch', 'postgres:16-alpine']);
  assert.match(container, /^[a-f0-9]{64}$/);
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) { ready = spawnSync('docker', ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'launch'], { windowsHide: true, stdio: 'ignore' }).status === 0; if (!ready) await new Promise(resolve => setTimeout(resolve, 250)); }
  assert.ok(ready, 'Disposable PostgreSQL did not start.');
  const sql = source => docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'launch', '-v', 'ON_ERROR_STOP=1'], source);
  sql('create role anon; create role authenticated; create role service_role bypassrls;');
  const authBootstrap = `create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}'::jsonb,raw_user_meta_data jsonb default '{}'::jsonb,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_user::text $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.email() returns text language sql stable as $$ select auth.jwt()->>'email' $$;
    grant usage on schema public,auth to anon,authenticated,service_role;`;
  sql(authBootstrap);
  for (let index = 0; index < files.length; index++) {
    const source = fs.readFileSync(path.join(root, 'supabase/migrations', files[index]), 'utf8');
    sql(/2000000[67]_/.test(files[index]) ? source : `BEGIN;\n${source}\nCOMMIT;`);
    console.log(`Applied: ${files[index]}`);
    if (index === 0) sql(`insert into auth.users(id,email,email_confirmed_at) values('11111111-1111-4111-8111-111111111111','upgrade@example.invalid',now());
      insert into public.organizations(id,name,slug) values('22222222-2222-4222-8222-222222222222','Upgrade sentinel','upgrade-sentinel');
      insert into public.org_members(organization_id,user_id,role) values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','owner');
      insert into public.contacts(id,organization_id,display_name,phone,tags,custom_fields) values('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','Existing customer','+201000000001',array['preserve'],'{"legacy_note":"keep"}');`);
  }
  sql(`do $$ begin if not exists(select 1 from public.contacts where id='33333333-3333-4333-8333-333333333333' and display_name='Existing customer' and phone='+201000000001' and tags @> array['preserve'] and custom_fields->>'legacy_note'='keep') then raise exception 'Upgrade lost existing contact data'; end if; end $$;`);
  sql(fs.readFileSync(path.join(root, 'scripts/sql/check-phase1-2-migrations.sql'), 'utf8'));
  sql(fs.readFileSync(path.join(root, 'scripts/sql/check-launch-migrations.sql'), 'utf8'));
  for (const file of fs.readdirSync(path.join(root, 'scripts/tests')).filter(file => /^launch-.*\.sql$/.test(file)).sort()) { sql(fs.readFileSync(path.join(root, 'scripts/tests', file), 'utf8')); console.log(`Database assertions: ${file}`); }
  sql(`insert into public.asra3_campaigns(id,organization_id,created_by,account_id,name,template,contact_ids,audience_snapshot,audience_hash)
    values('88888888-8888-4888-8888-888888888888','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','wa-test','Concurrent review','{}','{}','{}','test');`);
  const claim = () => new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'launch', '-t', '-A', '-c',
      `select public.claim_asra3_campaign('22222222-2222-4222-8222-222222222222','88888888-8888-4888-8888-888888888888','${crypto.randomUUID()}') is not null;`], { windowsHide: true });
    let output = '', error = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => error += chunk);
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
  });
  const competing = await Promise.all([claim(), claim()]);
  assert.deepEqual(competing.sort(), ['f', 't'], 'Exactly one simultaneous campaign dispatcher may claim the draft.');
  sql('create database launch_fresh;');
  const freshSql = source => docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'launch_fresh', '-v', 'ON_ERROR_STOP=1'], source);
  freshSql(authBootstrap);
  for (const file of files) freshSql(fs.readFileSync(path.join(root, 'supabase/migrations', file), 'utf8'));
  freshSql(fs.readFileSync(path.join(root, 'scripts/sql/check-launch-migrations.sql'), 'utf8'));
  console.log('Fresh installation and two simultaneous campaign claims passed.');
  console.log('Baseline upgrade preserved existing customer data; all SQL assertions passed.');
} finally { if (container && /^[a-f0-9]{64}$/.test(container)) docker(['stop', container]); }
