import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Disposable PostgreSQL only: no host port, production credentials or persistent volume.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const name = `asra3-phase1c-test-${crypto.randomBytes(6).toString('hex')}`;
const docker = (args, input) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', input, windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Docker command failed');
  return result.stdout.trim();
};
let containerId;
try {
  containerId = docker(['run', '--rm', '-d', '--name', name,
    '-e', `POSTGRES_PASSWORD=${crypto.randomBytes(24).toString('hex')}`, '-e', 'POSTGRES_DB=phase1c', 'postgres:16-alpine']);
  assert.match(containerId, /^[a-f0-9]{64}$/);
  let ready = false;
  for (let attempt = 0; attempt < 100 && !ready; attempt++) {
    ready = spawnSync('docker', ['exec', containerId, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'phase1c'], { windowsHide: true, stdio: 'ignore' }).status === 0;
    if (!ready) await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Disposable PostgreSQL did not become ready.');
  const sql = text => docker(['exec', '-i', containerId, 'psql', '-U', 'postgres', '-d', 'phase1c', '-v', 'ON_ERROR_STOP=1'], text);
  sql(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_user::text $$;`);
  for (const file of ['20261017000001_full_schema_and_super_admin.sql', '20261019000002_oauth_sessions.sql',
    '20261019000003_phone_purchase_intents.sql', '20261019000004_durable_webhooks.sql', '20261019000005_conversation_control_projection.sql']) {
    sql(fs.readFileSync(path.join(root, 'supabase/migrations', file), 'utf8'));
    console.log(`Applied in disposable PostgreSQL: ${file}`);
  }
  const result = spawnSync(process.execPath, ['--test', 'scripts/tests/phase1c-webhooks.test.mjs', 'scripts/tests/phase2a-meta-webhooks.test.mjs'], {
    cwd: root, env: { ...process.env, PHASE1C_PG_CONTAINER: name }, windowsHide: true, stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
} finally {
  if (containerId && /^[a-f0-9]{64}$/.test(containerId)) docker(['stop', containerId]);
}
