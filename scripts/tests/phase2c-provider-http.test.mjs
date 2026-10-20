import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test, { before, after } from 'node:test';
import ts from 'typescript';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profileId='66a1f0c2a4b9d3e8f1a2b3c4', accountId='66b1f0c2a4b9d3e8f1a2b3c5', facebookId='66b1f0c2a4b9d3e8f1a2b3c4', postId='66c1f0c2a4b9d3e8f1a2b3c4';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase2c-http-')), logFile = path.join(temp, 'simulation.ndjson');
let simulation, origin, output = '', errors = '';
before(async () => {
 const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve)); const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
 origin = `http://127.0.0.1:${port}/zernio`;
 simulation = spawn('postman', ['simulation', 'run', 'postman/simulations/phase2c-instagram.sim.yaml', '--port', String(port), '--output', 'ndjson', '--no-history'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
 await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(errors || 'Simulation startup timed out')), 30000);
 simulation.on('error', error => { clearTimeout(timer); reject(error); }); simulation.on('exit', code => { if (!output.includes('"event":"listening"')) { clearTimeout(timer); reject(new Error(`Simulation exited ${code}: ${errors}`)); } });
 simulation.stdout.on('data', chunk => { output += chunk; fs.writeFileSync(logFile, output); if (output.includes('"event":"listening"')) { clearTimeout(timer); resolve(); } }); simulation.stderr.on('data', chunk => { errors += chunk; }); });
});
after(() => { if (simulation?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(simulation.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else simulation.kill('SIGINT'); }
 fs.writeFileSync(logFile, output); const requests = output.split(/\r?\n/).flatMap(line => { try { const item = JSON.parse(line); return item.event === 'request' && item.path.startsWith('/api/v1/') ? [item] : []; } catch { return []; } }); assert.ok(requests.length); console.log(`Postman HTTP evidence: ${requests.length} provider requests; log ${logFile}`); });
async function fixture(scenario = 'success') { assert.equal((await fetch(`${origin}/__fixture/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) })).status, 200); }
async function state() { return (await fetch(`${origin}/__fixture/state`)).json(); }
function runtime() {
 const files = { instagram: 'src/lib/publishing/instagram.ts', client: 'src/lib/zernio/client.ts', publishing: 'src/lib/services/publishing.service.ts', core: 'src/lib/services/core-connect.service.ts', accounts: 'src/lib/auth/tenant-provider.ts', lifecycle: 'src/lib/accounts/lifecycle.ts' };
 const sources = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText]));
 const context = vm.createContext({ Buffer, URL, Request, Response, Headers, TextEncoder, TextDecoder, Date, Intl, Set, console, AbortController, setTimeout, clearTimeout,
 process: { env: { ZERNIO_BASE_URL: `${origin}/api/v1`, ZERNIO_API_KEY: 'phase2c_mock_key' } },
 fetch: (url, options) => { assert.equal(new URL(url).origin, new URL(origin).origin, 'Live network forbidden'); return fetch(url, options); } });
 const cache = {}, removed = [];
 function load(name) {
  if (cache[name]) return cache[name];
  const module = { exports: {} }; cache[name] = module.exports; // cycles Core -> lifecycle -> ownership -> Core
  const require = specifier => {
   if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
   const alias = { '@/lib/publishing/instagram': 'instagram', '@/lib/zernio/client': 'client', '@/lib/services/publishing.service': 'publishing', '@/lib/services/core-connect.service': 'core', '@/lib/auth/tenant-provider': 'accounts', '@/lib/accounts/lifecycle': 'lifecycle' }[specifier]; if (alias) return load(alias);
   if (specifier === '@/lib/auth/tenant-access') return { TenantAccessError: class extends Error { constructor(status, message) { super(message); this.status = status; } } };
   if (specifier === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => null };
   if (specifier === '@/lib/storage/workspace-store') return { WorkspaceStore: { getWorkspace: () => ({ connectedAccounts: [] }), removeConnectedAccount: (...args) => removed.push(args) } };
   if (specifier === '@/lib/zernio/policy-engine') return { getFallbackStore: () => ({ globalConfig: {}, tenants: {} }), assertSubServiceAllowed: async org => ({ organizationId: org, organizationName: org, zernioProfileId: org === 'tenant-b' ? '77a1f0c2a4b9d3e8f1a2b3c4' : profileId, allowedPlatforms: ['facebook','instagram'], quotas: { maxConnectedAccounts: 10 } }), resolveConnectScopesParam: () => '' };
   throw new Error(`Unexpected dependency ${specifier}`);
  };
  vm.runInContext(`(function(require,module,exports){${sources[name]}\n})`, context)(require, module, module.exports); return module.exports;
 }
 return { service: load('publishing').PublishingService, core: load('core').CoreConnectService, lifecycle: load('lifecycle'), removed };
}

const image=(n=1)=>({type:'image',url:`https://cdn.example.invalid/image${n}.jpg`});
const video=()=>({type:'video',url:'https://cdn.example.invalid/reel.mp4'});
const input=(patch={})=>({organizationId:'tenant-a',content:'Instagram caption',platforms:[{platform:'instagram',accountId}],mediaItems:[image()],idempotencyKey:'ig-intent',...patch});
const mutations=data=>data.requests.filter(r=>r.path.startsWith('/posts')&&['POST','PUT'].includes(r.method));
async function scenario(name){assert.equal((await fetch(`${origin}/__fixture/scenario`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario:name})})).status,200);}
async function seedPost(patch={}){const post={_id:postId,content:'Stored caption',mediaItems:[image()],status:'draft',platforms:[{platform:'instagram',accountId,status:'pending'}],...patch};assert.equal((await fetch(`${origin}/__fixture/seed`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({post})})).status,200);return post;}

test('Instagram feed,20item carousel,Reel and Story use canonical types and real provider IDs',async()=>{
 for(const patch of [{},{mediaItems:Array.from({length:20},(_,i)=>image(i))},{mediaItems:[video()],platforms:[{platform:'instagram',accountId,platformSpecificData:{shareToFeed:false}}]},{mediaItems:[video()],platforms:[{platform:'instagram',accountId,platformSpecificData:{contentType:'story'}}]}]){await fixture();const result=await runtime().service.createPost(input(patch));assert.equal(result.post.status,'draft');assert.match(result.post._id,/^[a-f0-9]{24}$/);assert.equal(result.warnings[0],'Canonical warning');const calls=(await state()).requests;assert.equal(calls.filter(r=>r.path==='/tools/validate/post').length,1);assert.equal(calls.some(r=>r.path.endsWith('/publishing-limit')),false);}
});
test('requiredmedia,type/count,caption,privateURL and declaredaccount restrictions block post writes',async()=>{
 const patches=[{mediaItems:[]},{mediaItems:[{type:'document',url:'https://cdn.example.invalid/doc.pdf'}]},{mediaItems:Array.from({length:21},(_,i)=>image(i))},{content:'a'.repeat(2201)},{mediaItems:[{type:'image',url:'https://127.0.0.1/private.jpg'}]},{mediaItems:[{type:'image',url:'https://[::ffff:127.0.0.1]/private.jpg'}]},{platforms:[{platform:'instagram',accountId,platformSpecificData:{contentType:'reel'}}]},{mediaItems:[image(),image(2)],platforms:[{platform:'instagram',accountId,platformSpecificData:{contentType:'story'}}]},{platforms:[{platform:'facebook',accountId}]}];
 for(const patch of patches){await fixture();await assert.rejects(runtime().service.createPost(input(patch)),e=>[400,403].includes(e.status||e.envelope?.status));assert.equal(mutations(await state()).length,0);}
 for(const [name,status]of [['inactive',409],['disabled',409]]){await fixture(name);await assert.rejects(runtime().service.createPost(input()),e=>e.status===status);assert.equal(mutations(await state()).length,0);}
 await fixture();await assert.rejects(runtime().service.createPost(input({platforms:[{platform:'instagram',accountId:'77b1f0c2a4b9d3e8f1a2b3c4'}]})),e=>e.status===403);
});
test('mediapreflight reaches configured provider onceperURL and rejectsHTML/wrongtype/unavailable',async()=>{
 for(const[name,status]of [['media-invalid',400],['media-html',400],['media-wrong-type',400],['media-unavailable',503],['media-malformed',502],['post-invalid',400],['post-malformed',502]]){await fixture(name);await assert.rejects(runtime().service.createPost(input()),e=>(e.status||e.envelope?.status)===status);assert.equal(mutations(await state()).length,0);}
 await fixture();await runtime().service.createPost(input({platforms:[{platform:'instagram',accountId,customMedia:[image(),image()]}]}));assert.equal((await state()).requests.filter(r=>r.path==='/tools/validate/media').length,1);
});
test('current authoritativequota blocksimmediate/retry,notdraftorschedule; malformedreadfailsclosed',async()=>{
 for(const[name,status]of [['quota-full',429],['quota-malformed',502],['quota-unavailable',503]]){await fixture(name);await assert.rejects(runtime().service.createPost(input({publishNow:true})),e=>e.envelope?.status===status);assert.equal(mutations(await state()).length,0);}
 await fixture('quota-full');await runtime().service.createPost(input());await runtime().service.createPost(input({scheduledFor:'2099-01-01T00:00:00Z',idempotencyKey:'schedule'}));assert.equal((await state()).requests.some(r=>r.path.endsWith('/publishing-limit')),false);
 await fixture();const quota=await runtime().service.getInstagramPublishingLimit({organizationId:'tenant-a',accountId});assert.equal(quota.quotaTotal,7);assert.equal(quota.quotaDurationSeconds,86400);
});
test('advancedaudio/paidpartnershiprequiresverifiedmetadataFacebookLoginandproperReel/Storyconstraints',async()=>{
 const audio={audioConfiguration:{audioId:'catalog123',audioVolume:80,videoVolume:0}};
 await fixture('direct-login');await assert.rejects(runtime().service.createPost(input({mediaItems:[video()],platforms:[{platform:'instagram',accountId,platformSpecificData:audio}]})),e=>e.status===400);
 await fixture();const result=await runtime().service.createPost(input({mediaItems:[video()],platforms:[{platform:'instagram',accountId,platformSpecificData:{...audio,isPaidPartnership:true,brandedContentSponsors:['brand'],shareToFeed:false}}]}));assert.equal(result.post.platforms[0].platformSpecificData.audioConfiguration.audioVolume,80);
 for(const fields of [{...audio,contentType:'story'},{isPaidPartnership:true,contentType:'story'},{locationId:'123',contentType:'story'},{audioConfiguration:{audioId:'123',audioVolume:101}}]){await fixture();await assert.rejects(runtime().service.createPost(input({mediaItems:[video()],platforms:[{platform:'instagram',accountId,platformSpecificData:fields}]})),e=>e.status===400);assert.equal(mutations(await state()).length,0);}
});
test('updatesvalidateeffectiveexistingrootandcustomoverrideswithoutdiscardingstoredsettings',async()=>{
 await fixture();await seedPost({mediaItems:[video()],platforms:[{platform:'instagram',accountId,status:'pending',customContent:'Stored custom caption',customMedia:[video()],platformSpecificData:{shareToFeed:false,audioName:'Original business audio'}}]});const service=runtime().service;await service.updatePost('tenant-a',postId,{content:'Changed global',idempotencyKey:'update'});const calls=(await state()).requests;const validate=calls.find(r=>r.path==='/tools/validate/post');assert.equal(validate.body.mediaItems[0].type,'video');assert.equal(validate.body.platforms[0].customContent,'Stored custom caption');assert.equal(validate.body.platforms[0].platformSpecificData.shareToFeed,false);const body=mutations(await state())[0].body;assert.equal(body.mediaItems,undefined);assert.equal(body.platforms,undefined);
 await fixture();await seedPost();await assert.rejects(runtime().service.updatePost('tenant-a',postId,{mediaItems:[],idempotencyKey:'empty'}),e=>e.status===400);assert.equal(mutations(await state()).length,0);
 await fixture('disabled');await seedPost();await assert.rejects(runtime().service.updatePost('tenant-a',postId,{content:'New',idempotencyKey:'disabled'}),e=>e.status===409);
});
test('partialretryvalidatesonlyfailedtargets,retainscustommedia/settings,anddoesnotrequirepublishedreconnect',async()=>{
 await fixture('published-disconnected');await seedPost({status:'partial',mediaItems:[],platforms:[{platform:'facebook',accountId:facebookId,status:'published',platformPostUrl:'https://facebook.com/owned'},{platform:'instagram',accountId,status:'failed',customContent:'IG custom',customMedia:[video()],platformSpecificData:{shareToFeed:false}}]});const result=await runtime().service.retryPost('tenant-a',postId,{idempotencyKey:'retry'});assert.equal(result.post.status,'published');const check=(await state()).requests.find(r=>r.path==='/tools/validate/post');assert.equal(check.body.platforms.length,1);assert.equal(check.body.platforms[0].customMedia[0].type,'video');assert.equal(check.body.platforms[0].platformSpecificData.shareToFeed,false);assert.equal(mutations(await state())[0].body.accountId,undefined);
 await fixture();await seedPost({status:'partial',platforms:[{platform:'instagram',accountId,status:'processing'}]});await assert.rejects(runtime().service.retryPost('tenant-a',postId,{idempotencyKey:'processing'}),e=>e.status===409);assert.equal(mutations(await state()).length,0);
});
test('207persistedinfoerrorandprocessingstatesarecanonical;permission/429/unknownnotfakesuccess',async()=>{
 await fixture('partial');const partial=await runtime().service.createPost(input({publishNow:true,platforms:[{platform:'facebook',accountId:facebookId},{platform:'instagram',accountId}]}));assert.equal(partial.httpStatus,207);assert.equal(partial.post.status,'partial');assert.equal(partial.error,'Some publishing targets failed');assert.equal(partial.platformResults[1].status,'failed');assert.equal(partial.post.platforms[0].platformPostUrl,undefined);
 await fixture('processing');const process=await runtime().service.createPost(input({publishNow:true}));assert.equal(process.post.status,'publishing');assert.equal(process.post.platforms[0].status,'processing');assert.equal(process.post.platforms[0].platformPostUrl,undefined);
 for(const[name,status]of [['permission-denied',403],['rate-limit',429],['publish-unknown',502]]){await fixture(name);await assert.rejects(runtime().service.createPost(input({publishNow:true})),e=>e.envelope?.status===status);assert.equal((await state()).posts.length,0);}
});
test('publicpreflightmethods independentlyauthorizeaccountandpreserve providerresult',async()=>{
 await fixture();const service=runtime().service,post=await service.validatePost(input());assert.equal(post.valid,true);assert.equal(post.warnings[0].platform,'instagram');const media=await service.validateMedia({organizationId:'tenant-a',accountId,url:image().url});assert.equal(media.contentType,'image/jpeg');assert.equal(media.platformLimits.instagram.withinLimit,true);assert.equal(media.width,undefined);assert.equal(mutations(await state()).length,0);
 for(const method of ['validateMedia','getInstagramPublishingLimit'])await assert.rejects(service[method]({organizationId:'tenant-a',accountId:'77b1f0c2a4b9d3e8f1a2b3c4',url:image().url}),e=>e.status===403);
 await fixture('disabled');const core=await runtime().core.listTenantAccountsWithHealth('tenant-a');assert.equal(core.accounts.find(a=>a._id===accountId).enabled,false);
});

test('public DNS hosts with IPv6-like names stay valid while literal private addresses are blocked',async()=>{
 await fixture();const service=runtime().service;
 for(const host of ['fcdn.example.com','fdmedia.example.com','fe80media.example.com'])assert.equal((await service.validateMedia({organizationId:'tenant-a',accountId,url:`https://${host}/image.jpg`})).valid,true);
 const before=(await state()).requests.filter(r=>r.path==='/tools/validate/media').length;
 for(const host of ['[fc00::1]','[fd00::1]','[fe80::1]','localhost','127.0.0.1','10.1.2.3'])await assert.rejects(service.validateMedia({organizationId:'tenant-a',accountId,url:`https://${host}/image.jpg`}),e=>e.status===400);
 assert.equal((await state()).requests.filter(r=>r.path==='/tools/validate/media').length,before);
});

test('provided update targets whitelist fields and carry validated stored custom overrides',async()=>{
 await fixture();await seedPost({platforms:[{platform:'instagram',accountId,status:'pending',customContent:'Stored override',customMedia:[video()],platformSpecificData:{shareToFeed:false}}]});
 const result=await runtime().service.updatePost('tenant-a',postId,{content:'New root caption',platforms:[{platform:'instagram',accountId,customContent:undefined,customMedia:undefined,status:'published',_id:'injected',profileId:'foreign'}],idempotencyKey:'safe-update'});
 const sent=mutations(await state())[0].body.platforms[0],checked=(await state()).requests.find(r=>r.path==='/tools/validate/post').body.platforms[0];
 assert.deepEqual(Object.keys(sent).sort(),['accountId','customContent','customMedia','platform','platformSpecificData']);assert.equal(sent.customContent,'Stored override');assert.equal(sent.customMedia[0].type,'video');assert.equal(sent.platformSpecificData.shareToFeed,false);assert.equal(checked.status,undefined);assert.equal(checked._id,undefined);assert.equal(result.post.platforms[0].customContent,'Stored override');
 await fixture();await seedPost({platforms:[{platform:'facebook',accountId:facebookId,status:'pending',platformSpecificData:{firstComment:'Old flat option',facebookSettings:{draft:true,unpublishedContentType:'SCHEDULED'}}}]});
 await runtime().service.updatePost('tenant-a',postId,{platforms:[{platform:'facebook',accountId:facebookId,platformSpecificData:{facebookSettings:{draft:false}}}],idempotencyKey:'namespace-replacement'});
 const replaced=mutations(await state())[0].body.platforms[0];assert.deepEqual(replaced.platformSpecificData,{facebookSettings:{draft:false}});
 for(const platforms of [null,{},[null],[]]){await fixture();await seedPost();await assert.rejects(runtime().service.updatePost('tenant-a',postId,{platforms,idempotencyKey:'malformed-targets'}),e=>e.status===400);assert.equal(mutations(await state()).length,0);}
 for(const platformSpecificData of [null,[],42]){await fixture();await seedPost();await assert.rejects(runtime().service.updatePost('tenant-a',postId,{platforms:[{platform:'instagram',accountId,platformSpecificData}],idempotencyKey:'malformed-options'}),e=>e.status===400);assert.equal(mutations(await state()).length,0);}
});

test('update captions and media constraints apply to the effective per-target state',async()=>{
 await fixture();await seedPost({platforms:[{platform:'instagram',accountId,status:'pending',customContent:'a'.repeat(2201),customMedia:[image()]}]});await assert.rejects(runtime().service.updatePost('tenant-a',postId,{content:'Valid root',idempotencyKey:'invalid-custom'}),e=>e.status===400);assert.equal(mutations(await state()).length,0);
 await fixture();await seedPost({mediaItems:[],platforms:[{platform:'instagram',accountId,status:'pending',customContent:'Valid custom',customMedia:[image()]}]});await runtime().service.updatePost('tenant-a',postId,{content:'a'.repeat(2201),idempotencyKey:'valid-custom'});
 await fixture();await seedPost({platforms:[{platform:'instagram',accountId,status:'pending',customMedia:[image()]}]});await assert.rejects(runtime().service.updatePost('tenant-a',postId,{platforms:[{platform:'instagram',accountId,customMedia:[]}],idempotencyKey:'empty-custom'}),e=>e.status===400);assert.equal(mutations(await state()).length,0);
 await fixture('quota-full');await seedPost({status:'failed',platforms:[{platform:'instagram',accountId,status:'failed'}]});await assert.rejects(runtime().service.retryPost('tenant-a',postId,{idempotencyKey:'retry-quota'}),e=>e.envelope?.code==='instagram_publishing_limit');assert.equal(mutations(await state()).length,0);
});
