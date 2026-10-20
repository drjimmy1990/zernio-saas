import { spawnSync } from 'node:child_process';
for (const file of ['launch-postgres-check.mjs','launch-saas-postgres-check.mjs','launch-phone-postgres-check.mjs','phase1c-postgres-check.mjs']) {
  const result = spawnSync(process.execPath, [`scripts/tests/${file}`], { stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}
