import assert from 'node:assert/strict';
import test from 'node:test';
import { authSandbox as sandbox, organizationId } from './helpers/current-auth.mjs';
const signup={action:'signup',email:'new@example.invalid',password:'private-password',fullName:'New user',companyName:'New company'};
test('registration requires email verification and never provisions or signs in unverified identities',async()=>{
 for(const planKey of [undefined,'growth','enterprise',{planKey:'enterprise'}]){const s=sandbox();const r=await s.send({...signup,planKey});assert.equal(r.status,200);assert.equal(r.body.verificationRequired,true);assert.equal(r.cookie,null);assert.equal(s.calls.some(x=>x.name==='saas_provision_signup'||x.name==='saas_issue_session'),false);assert.equal(s.calls.find(x=>x.type==='signup').credentials.options.data.planKey,undefined);}
});
test('signup refuses disabled provider email confirmation and duplicate registrations',async()=>{
 for(const [options,status] of [[{autoConfirm:true},503],[{duplicate:true},400],[{noSupabase:true},503]]){const r=await sandbox(options).send(signup);assert.equal(r.status,status);assert.equal(r.cookie,null);}
});
test('first verified login uses atomic signup provisioning then persists a session for starter membership',async()=>{
 const s=sandbox({noMembership:true});const r=await s.send({action:'login',email:signup.email,password:signup.password,planKey:'enterprise'});
 assert.equal(r.status,200);assert.equal(r.session.tenant.organizationId,organizationId);assert.equal(r.session.tenant.planKey,'starter');assert.equal(r.session.sessionId,'durable-session');
 assert.deepEqual(s.calls.filter(x=>x.type==='rpc').map(x=>x.name),['saas_auth_throttle','saas_provision_signup','saas_issue_session']);assert.equal(s.calls.find(x=>x.name==='saas_provision_signup').args.p_plan,undefined);
});
test('failed atomic provisioning cannot fall back to a local workspace or issue a cookie',async()=>{
 const s=sandbox({noMembership:true,provisionFailure:true});const r=await s.send({action:'login',email:signup.email,password:signup.password});assert.equal(r.status,503);assert.equal(r.cookie,null);assert.equal(s.calls.some(x=>x.name==='saas_issue_session'),false);
});
