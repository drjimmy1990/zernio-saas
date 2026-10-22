import assert from 'node:assert/strict';import test from 'node:test';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';import crypto from 'node:crypto';import {createServer} from 'node:http';import {createClient} from '@supabase/supabase-js';

const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'owner@example.invalid',email_confirmed_at:'2026-10-20T00:00:00Z',user_metadata:{full_name:'Owner',company_name:'Business'}};
const org={id:'11111111-1111-4111-8111-111111111111',name:'Business',slug:'business',plan_key:'starter',status:'active'};
const sessionId='22222222-2222-4222-8222-222222222222';
test('closed registration blocks signup and new workspace provisioning while existing login and recovery remain available through actual SDK', async () => {
 for (const partial of [false, true]) {
  const e = await environment({ partial, env: { PUBLIC_REGISTRATION_ENABLED: 'false' } });
  try {
   const signup = await e.post({ action: 'signup', email: user.email, password: 'private-password', fullName: 'Owner' });
   assert.equal(signup.status, 403); assert.equal(signup.body.code, 'registration_closed'); assert.equal(e.calls.length, 0);
   const login = await e.post({ action: 'login', email: user.email, password: 'private-password' });
   assert.equal(login.status, partial ? 403 : 200);
   if (partial) assert.equal(login.body.code, 'registration_closed');
   assert.equal(e.calls.filter(c => c.path.endsWith('saas_provision_signup')).length, 0);
   const recover = await e.post({ action: 'recover', email: user.email });
   assert.equal(recover.status, 200); assert.ok(e.calls.some(c => c.path === '/auth/v1/recover'));
  } finally { await e.close(); }
 }
});
async function environment(options={}) {
 const calls=[];let memberships=options.partial?[]:[{organization_id:org.id,role:'owner',organizations:org}];
 const server=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};const u=new URL(req.url,'http://localhost');calls.push({path:u.pathname,method:req.method,body});res.setHeader('content-type','application/json');let data;
  if(options.authFailure && u.pathname.startsWith('/auth/v1/')){res.statusCode=options.authFailure.status;res.setHeader('x-supabase-api-version','2024-01-01');data={code:options.authFailure.code,message:'DUMMY PRIVATE PROVIDER DETAIL'};}
  else if(options.outage){res.statusCode=503;data={message:'Unavailable'};}
  else if(u.pathname==='/auth/v1/signup')data={user:options.missingSignupUser?null:{...user,email_confirmed_at:undefined,...(options.obfuscatedSignup?{identities:[]}: {})},session:null};
  else if(u.pathname==='/auth/v1/token'){if(options.badPassword){res.statusCode=400;data={error_code:'invalid_credentials',msg:'Invalid'};}else data={access_token:'private-test-token',refresh_token:'private-refresh',expires_in:3600,token_type:'bearer',user:options.unverified?{...user,email_confirmed_at:undefined}:user};}
  else if(u.pathname==='/auth/v1/user')data=user;
  else if(u.pathname.startsWith('/auth/v1/admin/users/'))data={user};
  else if(u.pathname==='/auth/v1/recover'||u.pathname==='/auth/v1/resend')data={};
  else if(u.pathname==='/rest/v1/org_members')data=memberships;
  else if(u.pathname==='/rest/v1/organizations')data=org;
  else if(u.pathname==='/rest/v1/saas_sessions')data={user_id:user.id,organization_id:org.id,expires_at:new Date(Date.now()+86400000).toISOString(),revoked_at:options.revoked?'2026-10-20':null};
  else if(u.pathname==='/rest/v1/saas_user_security')data={version:1,disabled:false};
  else if(u.pathname==='/rest/v1/rpc/saas_auth_throttle')data=!options.throttled;
  else if(u.pathname==='/rest/v1/rpc/saas_provision_signup'){data=org.id;memberships=[{organization_id:org.id,role:'owner',organizations:org}];}
  else if(u.pathname==='/rest/v1/rpc/saas_issue_session'){assert.equal(body.p_org,org.id);data={sessionId,securityVersion:1};}
  else if(u.pathname==='/rest/v1/rpc/saas_revoke_sessions')data=true;
  else if(u.pathname==='/rest/v1/rpc/saas_recover_access')data=true;
  else if(u.pathname==='/rest/v1/rpc/saas_resolve_api_key')data=options.keyRemoved?{error_code:'revoked_access',status:403,message:'Removed'}:{organizationId:org.id,userId:user.id,role:'owner',scopes:['read'],keyId:sessionId};
  else if(u.pathname==='/rest/v1/rpc/saas_reserve_allowance')data=options.disabled?{error_code:'spending_disabled',status:403,message:'Disabled'}:{reservationId:sessionId,state:'reserved',amountMinor:50,currency:'USD',replayed:Boolean(options.replayed),quoteSource:body.p_quote_source};
  else if(u.pathname==='/rest/v1/saas_api_keys')data=[];
  else if(u.pathname==='/rest/v1/billing_recurring_agreements')data=[];
  else if(u.pathname==='/rest/v1/platform_global_config')data={id:1,brand_name:'Asra3',brand_primary_color:'#123456',enforce_headless_oauth:true,enabled_platforms:['facebook','instagram','whatsapp'],enabled_ad_platforms:[],enabled_oauth_scopes:['posting','messaging'],enabled_subservices:['publishing','inbox_crm','telephony'],default_max_support_cost_usd:3};
  else if(u.pathname==='/rest/v1/org_feature_overrides')data=options.emptyPolicy?{custom_allowed_platforms:[],custom_enabled_subservices:[],custom_max_phone_numbers:0,custom_max_ai_support_usd:0}:null;
  else if(u.pathname==='/rest/v1/subscription_plan_templates')data={plan_key:'starter',is_active:true,display_name:'Starter',monthly_price_usd:29,enabled_subservices:['publishing','inbox_crm'],allowed_platforms:['facebook','instagram'],allowed_ad_platforms:[],allowed_oauth_scopes:['posting'],disabled_zernio_resource_groups:['billing'],max_connected_accounts:5,max_monthly_posts:300,max_monthly_messages:1000,max_managed_ads:0,max_phone_numbers:1,max_ai_support_usd:5,max_x_api_spend_usd:0};
  else {res.statusCode=404;data={message:'Unexpected path'};}res.end(JSON.stringify(data));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const db=createClient(base,'isolated-service-key',{auth:{persistSession:false,autoRefreshToken:false}});
 const env={SESSION_SECRET:'test-private-long-secret',SUPABASE_SERVICE_ROLE_KEY:'isolated-service-key',NEXT_PUBLIC_APP_URL:'https://app.example.invalid',PUBLIC_REGISTRATION_ENABLED:'true',...(options.admin?{ADMIN_EMAIL:'admin@example.invalid',ADMIN_PASSWORD:options.adminPassword||'private-configured-admin-password'}:{}),...options.env};
 const context=vm.createContext({process:{env},Buffer,TextEncoder,TextDecoder,URL,Date,console});const modules={};
 function load(file){if(modules[file])return modules[file];const exports={};modules[file]=exports;const source=ts.transpileModule(fs.readFileSync(path.resolve(file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  function require(name){if(name==='node:crypto'||name==='crypto')return crypto;if(name==='@/lib/supabase/admin')return{createSupabaseAdminClient:()=>db};if(name==='next/server')return{NextResponse:{json:(body,init)=>{const r=Response.json(body,init);r.cookies={set:(name,value)=>r.headers.append('set-cookie',`${name}=${value}; HttpOnly`)};return r;}}};if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);if(name.startsWith('.'))return load(path.posix.normalize(`${path.posix.dirname(file)}/${name}.ts`));throw Error(name);}
  vm.runInContext(`(function(require,exports){${source}\n})`,context)(require,exports);return exports;
 }
 const route=load('src/app/api/auth/route.ts');const post=async body=>{const r=await route.POST(new Request('https://app.example.invalid/api/auth',{method:'POST',headers:{'content-type':'application/json',origin:'https://app.example.invalid'},body:JSON.stringify(body)}));return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};};
 return{post,route,load,calls,env,close:()=>new Promise(r=>server.close(r))};
}
test('signup sends verification without creating membership or a session',async()=>{const e=await environment();try{const r=await e.post({action:'signup',email:user.email,password:'private-password',fullName:'Owner'});assert.equal(r.status,200);assert.equal(r.body.verificationRequired,true);assert.equal(r.cookie,null);assert.ok(e.calls.some(c=>c.path==='/auth/v1/signup'));assert.ok(!e.calls.some(c=>c.path.endsWith('saas_issue_session')));}finally{await e.close();}});
test('verified login recovers partial signup and persists the exact workspace session',async()=>{const e=await environment({partial:true});try{const r=await e.post({action:'login',email:user.email,password:'private-password',organizationId:'foreign'});assert.equal(r.status,200);assert.equal(r.body.tenant.organizationId,org.id);assert.ok(r.cookie);assert.equal(e.calls.filter(c=>c.path.endsWith('saas_provision_signup')).length,1);assert.equal(e.calls.filter(c=>c.path.endsWith('saas_issue_session')).length,1);}finally{await e.close();}});
test('unverified identity, outage and durable throttle cannot produce a session',async()=>{for(const [options,status]of[[{unverified:true},403],[{outage:true},503],[{throttled:true},429],[{badPassword:true},401]]){const e=await environment(options);try{const r=await e.post({action:'login',email:user.email,password:'private-password'});assert.equal(r.status,status);assert.equal(r.cookie,null);}finally{await e.close();}}});
test('current revoked session fails closed through actual protected auth GET',async()=>{const e=await environment({revoked:true});try{const r=await e.post({action:'login',email:user.email,password:'private-password'});const response=await e.route.GET(new Request('https://app.example.invalid/api/auth',{headers:{cookie:r.cookie.split(';')[0]}}));assert.equal((await response.json()).authenticated,false);}finally{await e.close();}});
test('old local keys are retired; durable key ownership errors remain enforced',async()=>{for(const removed of[false,true]){const e=await environment({keyRemoved:removed});try{const keys=e.load('src/lib/saas/api-keys.ts').SaasApiKeyService;await assert.rejects(keys.resolve('old-local-key'),x=>x.status===401);if(removed)await assert.rejects(keys.resolve(`asra3_${'a'.repeat(64)}`,'read'),x=>x.status===403);else assert.equal((await keys.resolve(`asra3_${'a'.repeat(64)}`,'read')).organizationId,org.id);assert.equal(e.calls.find(c=>c.path.endsWith('saas_resolve_api_key')).body.p_hash.length,64);}finally{await e.close();}}});
test('unit reservations preserve approved allocation source, replay and disabled errors',async()=>{for(const options of[{},{replayed:true},{disabled:true}]){const e=await environment(options);try{const service=e.load('src/lib/saas/allowance.ts').SaasAllowanceService;const promise=service.reserveUnits({organizationId:org.id,capability:'whatsapp_send',operationKey:'stable-send',units:2});if(options.disabled)await assert.rejects(promise,x=>x.status===403);else{const r=await promise;assert.equal(r.amountMinor,50);assert.equal(r.replayed,Boolean(options.replayed));assert.equal(r.quoteSource,'admin spending allocation, not provider quote');}await assert.rejects(service.reserveUnits({organizationId:org.id,capability:'whatsapp_send',operationKey:'x',units:1.5}),x=>x.status===400);}finally{await e.close();}}});
test('actual policy reads distinguish absent inheritance from empty denial and zero caps, outage denies',async()=>{for(const options of[{},{emptyPolicy:true},{outage:true}]){const e=await environment(options);try{const resolve=e.load('src/lib/saas/policy.ts').strictTenantPolicy;if(options.outage)await assert.rejects(resolve(org.id),x=>x.status===503);else{const p=await resolve(org.id);assert.deepEqual(Array.from(p.allowedPlatforms),options.emptyPolicy?[]:['facebook','instagram']);assert.equal(p.quotas.maxPhoneNumbers,options.emptyPolicy?0:1);assert.equal(p.quotas.maxAiSupportUsd,options.emptyPolicy?0:5);}}finally{await e.close();}}});
test('password recovery verifies ownership and durably revokes sessions/keys around provider password change',async()=>{const e=await environment();try{const r=await e.post({action:'complete_recovery',accessToken:'verified-local-token',password:'new-private-password'});assert.equal(r.status,200);assert.equal(r.cookie,null);const calls=e.calls.filter(c=>c.path.endsWith('saas_recover_access')||c.method==='PUT');assert.deepEqual(calls.map(c=>c.method),['POST','PUT','POST']);assert.equal(calls[1].body.password,'new-private-password');const generic=await e.post({action:'recover',email:user.email});assert.equal(generic.status,200);assert.ok(e.calls.find(c=>c.path==='/auth/v1/recover'));}finally{await e.close();}});
test('only private configured administrator credentials work and rotation invalidates the signed session',async()=>{const e=await environment({admin:true});try{const r=await e.post({action:'login',email:'admin@example.invalid',password:'private-configured-admin-password'});assert.equal(r.status,200);assert.equal(r.body.user.role,'super_admin');const request=new Request('https://app.example.invalid/api/auth',{headers:{cookie:r.cookie.split(';')[0]}});assert.equal((await(await e.route.GET(request)).json()).authenticated,true);e.env.ADMIN_PASSWORD='rotated-private-password';assert.equal((await(await e.route.GET(request)).json()).authenticated,false);}finally{await e.close();}const defaults=await environment({admin:true,adminPassword:'AdminPassword2026!',badPassword:true});try{const r=await defaults.post({action:'login',email:'admin@example.invalid',password:'AdminPassword2026!'});assert.equal(r.status,401);assert.equal(r.cookie,null);}finally{await defaults.close();}});
test('auth rejects cross-origin mutations and GET logout has no effect',async()=>{const e=await environment();try{const r=await e.route.POST(new Request('https://app.example.invalid/api/auth',{method:'POST',headers:{origin:'https://foreign.invalid','content-type':'application/json'},body:JSON.stringify({action:'signup'})}));assert.equal(r.status,403);assert.equal(e.calls.length,0);assert.equal((await e.route.GET(new Request('https://app.example.invalid/api/auth?action=logout'))).status,405);}finally{await e.close();}});

test('administrator login cannot use its management identity for customer policy queries', async () => {
  const e = await environment({ admin: true });
  try {
    const login = await e.post({ action: 'login', email: 'admin@example.invalid', password: 'private-configured-admin-password' });
    assert.equal(login.status, 200);
    assert.equal(login.body.redirectTo, '/admin');
    const before = e.calls.length;
    await assert.rejects(e.load('src/lib/saas/policy.ts').strictTenantPolicy(login.body.tenant.organizationId),
      error => error.status === 403 && /business account/i.test(error.message));
    assert.equal(e.calls.length, before, 'The management identity must not be queried as a UUID workspace');
    const customerPolicy = await e.load('src/lib/saas/policy.ts').strictTenantPolicy(org.id);
    assert.equal(customerPolicy.organizationId, org.id);
    assert.deepEqual(Array.from(customerPolicy.allowedPlatforms), ['facebook', 'instagram']);
  } finally {
    await e.close();
  }
});


test('actual SDK authentication errors are safe and email failures never claim delivery',async()=>{
 for(const [action,providerCode,http,status,code] of [
 ['signup','email_address_not_authorized',400,503,'email_delivery_unavailable'],
 ['signup','signup_disabled',422,503,'signup_unavailable'],
 ['signup','weak_password',422,400,'weak_password'],
 ['signup','captcha_failed',400,503,'auth_verification_unavailable'],
 ['signup','email_address_invalid',400,400,'invalid_email'],
 ['signup','user_already_exists',422,400,'registration_unconfirmed'],
 ['login','unexpected_failure',503,503,'auth_unavailable'],
 ['login','over_request_rate_limit',429,429,'auth_rate_limited'],
 ['recover','over_email_send_rate_limit',429,429,'auth_rate_limited'],
 ['resend','email_provider_disabled',422,503,'email_delivery_unavailable'],
 ['recover','unknown_failure',400,503,'email_delivery_unavailable'],
 ['resend','user_not_found',404,200,null],
 ['complete_recovery','unexpected_failure',503,503,'auth_unavailable'],
 ['verify_email','unexpected_failure',503,503,'auth_unavailable'],
 ]){
  const e=await environment({authFailure:{code:providerCode,status:http}});
  try{const r=await e.post({action,email:user.email,password:'private-password',fullName:'Owner',accessToken:'local-dummy-token'});assert.equal(r.status,status,action+providerCode);assert.equal(r.body.code??null,code);assert.equal(r.cookie,null);assert.ok(!JSON.stringify(r.body).includes('DUMMY PRIVATE'));assert.ok(!e.calls.some(c=>c.path.endsWith('saas_issue_session')));if(status!==200)assert.equal(r.body.ok,undefined);}finally{await e.close();}
 }
});


test('signup requires a provider user but preserves obfuscated duplicate verification responses',async()=>{
 for(const [options,status] of [[{missingSignupUser:true},503],[{obfuscatedSignup:true},200]]){
  const e=await environment(options);try{const r=await e.post({action:'signup',email:user.email,password:'private-password',fullName:'Owner'});assert.equal(r.status,status);assert.equal(r.cookie,null);assert.equal(r.body.verificationRequired,status===200?true:undefined);assert.ok(!e.calls.some(c=>c.path.endsWith('saas_provision_signup')||c.path.endsWith('saas_issue_session')));}finally{await e.close();}
 }
});
