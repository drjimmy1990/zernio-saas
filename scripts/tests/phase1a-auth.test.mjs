import assert from 'node:assert/strict';
import test from 'node:test';
import { authSandbox as sandbox, organizationId } from './helpers/current-auth.mjs';
const login={action:'login',email:'member@b-slug.example',password:'private-password'};
test('password examples and persona claims cannot bypass provider authentication',async()=>{
 for(const email of ['member@example.invalid','admin@foreign.invalid','admin@asra3.com']) for(const password of ['AnyPasswordForAdmin!','AdminPassword2026!','CustomerPassword2026!']){
  const s=sandbox({badLogin:true});const r=await s.send({...login,email,password,persona:'super_admin'});assert.equal(r.status,401);assert.equal(r.cookie,null);assert.equal(s.calls.filter(x=>x.type==='signin').length,1);
 }
});
test('verified customer identity uses persisted membership, ignores client tenant and admin claims',async()=>{
 const s=sandbox();const r=await s.send({...login,persona:'super_admin',organizationId:'tenant-b',slug:'tenant-b'});
 assert.equal(r.status,200);assert.equal(r.session.user.id,'real-user');assert.equal(r.session.user.role,'member');assert.equal(r.session.tenant.organizationId,organizationId);assert.equal(r.session.tenant.slug,'tenant-a');assert.equal(r.session.sessionId,'durable-session');
 assert.deepEqual(s.calls.find(x=>x.type==='select').filters,{user_id:'real-user'});
});
test('only exact configured private administrator credentials create an admin session',async()=>{
 const s=sandbox({badLogin:true,env:{ADMIN_EMAIL:'control@example.invalid',ADMIN_PASSWORD:'PrivateAdminCredential'}});
 const r=await s.send({...login,email:'control@example.invalid',password:'PrivateAdminCredential'});assert.equal(r.status,200);assert.equal(r.session.user.role,'super_admin');assert.equal(r.session.adminCredentialVersion.length,64);assert.equal(s.calls.some(x=>x.type==='signin'),false);
 assert.equal((await s.send({...login,email:'admin@foreign.invalid',password:'PrivateAdminCredential',persona:'super_admin'})).status,401);
 const implicit=sandbox({badLogin:true,env:{ADMIN_PASSWORD:'PrivateAdminCredential'}});assert.equal((await implicit.send({...login,email:'admin@asra3.com',password:'PrivateAdminCredential'})).status,401);
 for(const password of ['AdminPassword2026!','AnyPasswordForAdmin!'])assert.equal((await sandbox({badLogin:true,env:{ADMIN_EMAIL:'admin@asra3.com',ADMIN_PASSWORD:password}}).send({...login,email:'admin@asra3.com',password})).status,401);
});
test('database, membership and session persistence failures never issue a cookie',async()=>{
 for(const options of [{noSupabase:true},{membershipFailure:true},{sessionFailure:true}]){const r=await sandbox(options).send(login);assert.equal(r.status,503);assert.equal(r.cookie,null);}
 for(const options of [{unverified:true},{inactive:true}]){const r=await sandbox(options).send(login);assert.equal(r.status,403);assert.equal(r.cookie,null);}
});
test('durable throttling and cross-origin guard reject login before credentials are checked',async()=>{
 for(const [options,headers,status] of [[{throttled:true},{},429],[{}, {origin:'https://foreign.invalid'},403]]){const s=sandbox(options);const r=await s.send(login,headers);assert.equal(r.status,status);assert.equal(r.cookie,null);assert.equal(s.calls.some(x=>x.type==='signin'),false);}
});
