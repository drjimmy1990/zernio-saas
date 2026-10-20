import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const image = process.env.ASRA3_TEST_IMAGE || 'asra3-launch-check:20261020';
const name = `asra3-smoke-${crypto.randomBytes(6).toString('hex')}`;
const secret = crypto.randomBytes(32).toString('hex');
function docker(args) {const result=spawnSync('docker',args,{encoding:'utf8',windowsHide:true});if(result.status!==0)throw new Error(result.stderr||result.error?.message);return result.stdout.trim();}
let container;
try {
  container=docker(['run','--rm','-d','--name',name,'-p','127.0.0.1::3008',
    '-e',`SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}`,'-e',`ZERNIO_WEBHOOK_SECRET=${secret}`,
    '-e','ZERNIO_API_KEY=','-e','SUPABASE_SERVICE_ROLE_KEY=',image]);
  assert.match(container,/^[a-f0-9]{64}$/);
  assert.equal(docker(['inspect','--format','{{.Config.User}}',container]),'node');
  docker(['exec',container,'node','-e',"const fs=require('fs');if(process.getuid()!==1000||fs.existsSync('/app/.env')||fs.existsSync('/app/.env.local'))process.exit(1);fs.writeFileSync('/app/.data/smoke','local test');"]);
  const address=docker(['port',container,'3008/tcp']);assert.match(address,/^127\.0\.0\.1:\d+$/);const base=`http://${address}`;
  let ready=false;
  for(let i=0;i<100&&!ready;i++){try{ready=(await fetch(`${base}/api/v1/openapi.json`)).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,250));}
  assert.ok(ready,'Container did not become ready.');
  for(const path of ['/api/crm','/api/saas','/api/campaigns','/api/admin','/api/reports','/api/phone-lifecycle'])assert.equal((await fetch(`${base}${path}`)).status,401,path);
  const raw=JSON.stringify({id:'container-smoke',event:'webhook.test',timestamp:new Date().toISOString()});
  assert.equal((await fetch(`${base}/webhooks/zernio`,{method:'POST',body:raw,headers:{'X-Zernio-Signature':crypto.createHmac('sha256',secret).update(raw).digest('hex')}})).status,200);
  const home=await fetch(base);assert.equal(home.status,200);assert.equal(home.headers.get('x-content-type-options'),'nosniff');assert.equal(home.headers.get('x-frame-options'),'DENY');
  console.log('Docker smoke passed: nonroot user, writable legacy data directory, no env files, private binding, HTTP/auth/signature boundaries and security headers.');
} finally {if(container&&/^[a-f0-9]{64}$/.test(container))docker(['stop',container]);}
