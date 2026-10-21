import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const files = { route:'src/app/api/auth/route.ts', session:'src/lib/auth/session.ts', auth:'src/lib/saas/auth.ts', http:'src/lib/saas/http.ts', origin:'src/lib/auth/request-origin.ts', providerErrors:'src/lib/auth/provider-errors.ts', registration:'src/lib/auth/registration.ts' };
const sources = Object.fromEntries(Object.entries(files).map(([key,file])=>[key,ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText]));
export const organizationId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
// Real auth route, session issuer, throttling and cookie encoding. Only database I/O is replaced.
// Real RPC persistence, concurrent signup and RLS are exercised in launch-saas database tests.
export function authSandbox(options={}) {
 const calls=[], modules={}; let provisioned=false;
 class TenantAccessError extends Error { constructor(status,message){super(message);this.status=status;} }
 const user={id:'real-user',email:'member@b-slug.example',email_confirmed_at:options.unverified?null:'2026-10-01T00:00:00Z',user_metadata:{full_name:'Real user',company_name:'New company'}};
 const db={auth:{
  signInWithPassword:async credentials=>{calls.push({type:'signin',credentials});return options.badLogin?{data:{},error:{message:'Invalid',status:400,code:'invalid_credentials'}}:{data:{user},error:null};},
  signUp:async credentials=>{calls.push({type:'signup',credentials});return options.duplicate?{data:{},error:{status:400}}:{data:{user:{...user,email_confirmed_at:options.autoConfirm?'2026-10-01':null}},error:null};},
  getUser:async()=>({data:{user},error:null}),
 },from:table=>{const filters={};const query={select:()=>query,eq:(k,v)=>{filters[k]=v;return query;},order:()=>query,
  then:(resolve,reject)=>Promise.resolve().then(()=>{calls.push({type:'select',table,filters});return {data:options.noMembership&&!provisioned?[]:[{organization_id:organizationId,role:options.role||'viewer',organizations:{id:organizationId,name:'Tenant A',slug:'tenant-a',plan_key:'starter',status:options.inactive?'suspended':'active'}}],error:options.membershipFailure?{message:'Failure'}:null};}).then(resolve,reject),
  maybeSingle:async()=>({data:null,error:null})};return query;}};
 const storage={saasDatabase:()=>{if(options.noSupabase)throw new TenantAccessError(503,'Database unavailable');return db;},saasRpc:async(name,args)=>{calls.push({type:'rpc',name,args});if(options.noSupabase)throw new TenantAccessError(503,'Database unavailable');if(name==='saas_auth_throttle')return !options.throttled;if(name==='saas_provision_signup'){if(options.provisionFailure)throw new TenantAccessError(503,'Provisioning unavailable');provisioned=true;return organizationId;}if(name==='saas_issue_session'){if(options.sessionFailure)throw new TenantAccessError(503,'Session unavailable');return {sessionId:'durable-session',securityVersion:1};}return true;}};
 const context=vm.createContext({Buffer,Date,URL,TextEncoder,TextDecoder,process:{env:{SESSION_SECRET:'isolated-session-key',PUBLIC_REGISTRATION_ENABLED:'true',...options.env}}});
 function load(name){if(modules[name])return modules[name];const exports={};const require=specifier=>{
  const key={'@/lib/auth/session':'session','@/lib/saas/http':'http','@/lib/saas/auth':'auth','@/lib/auth/request-origin':'origin','@/lib/auth/provider-errors':'providerErrors','@/lib/auth/registration':'registration'}[specifier];if(key)return load(key);
  if(specifier==='@/lib/saas/storage'||specifier==='./storage')return storage;
  if(specifier==='@/lib/auth/tenant-access')return {TenantAccessError,requireTenantAccess:async()=>{throw new TenantAccessError(401,'No session');}};
  if(specifier==='node:crypto')return crypto;
  if(specifier==='next/server')return {NextResponse:{json:(value,init)=>{const r=Response.json(value,init);r.cookies={set:(key,value,opts)=>r.headers.append('set-cookie',`${key}=${value}; HttpOnly; SameSite=${opts.sameSite}`)};return r;}}};
  throw new Error(`Unexpected auth dependency: ${specifier}`);
 };vm.runInContext(`(function(require,exports){${sources[name]}\n})`,context)(require,exports);modules[name]=exports;return exports;}
 return {calls,send:async(body,headers={})=>{const r=await load('route').POST(new Request(options.requestUrl || 'https://isolated.invalid/api/auth',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}));const cookie=r.headers.get('set-cookie');const token=cookie?.split(';')[0].slice('asra3_session='.length);return {status:r.status,body:await r.json(),cookie,session:token?load('session').decodeSession(token):null};}};
}
