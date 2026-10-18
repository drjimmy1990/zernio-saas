#!/usr/bin/env node
import fs from 'node:fs';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = 'tk_live_forensic_auditor_token_99';
const HEADERS = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

async function req(method, endpoint, body = null) {
  const init = { method, headers: HEADERS };
  if (body) init.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${endpoint}`, init);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

let allPassed = true;
function assert(name, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${name}${details ? ` -> ${details}` : ''}`);
  } else {
    console.error(`[FAIL] ${name}${details ? ` -> ${details}` : ''}`);
    allPassed = false;
  }
}

async function runAudit() {
  console.log('=== RUNNING INDEPENDENT FORENSIC AUDIT SUITE ===');

  // Test 1: Verify backdoor removal & rejection of 123456 / 000000
  const vReq = await req('POST', '/api/v1/verify', {
    to: '+14155550199',
    channel: 'sms',
    brandName: 'Auditor Verification',
  });
  assert('Verify request created', vReq.status === 201 && vReq.data.verificationId, `id=${vReq.data.verificationId}`);
  const vId = vReq.data.verificationId;
  const genCode = vReq.data.code;

  // Attempt backdoor code 123456
  const bad1 = await req('POST', '/api/v1/verify/check', { verificationId: vId, code: '123456' });
  assert('Backdoor code 123456 rejected', bad1.status === 400 && bad1.data.verified === false, `status=${bad1.status}`);

  // Attempt code 000000
  const bad2 = await req('POST', '/api/v1/verify/check', { verificationId: vId, code: '000000' });
  assert('Dummy code 000000 rejected', bad2.status === 400 && bad2.data.verified === false, `status=${bad2.status}`);

  // Genuine code verification
  const good = await req('POST', '/api/v1/verify/check', { verificationId: vId, code: genCode });
  assert('Genuine code accepted', good.status === 200 && good.data.verified === true, `status=${good.status}`);

  // Re-check already approved code should fail
  const replay = await req('POST', '/api/v1/verify/check', { verificationId: vId, code: genCode });
  assert('Replay of used OTP code rejected', replay.status === 400 && replay.data.verified === false, `status=${replay.status}`);

  // Test 2: WhatsApp Templates genuine storage persistence
  const tplName = `audit_tpl_${Date.now()}`;
  const addTpl = await req('POST', '/api/v1/whatsapp/templates', {
    name: tplName,
    category: 'UTILITY',
    language: 'en_US',
    components: ['BODY: Independent audit notification {{1}}'],
  });
  assert('POST /whatsapp/templates creates template', addTpl.status === 201 && addTpl.data.template?.name === tplName);

  const getTpl = await req('GET', '/api/v1/whatsapp/templates');
  const foundTpl = (getTpl.data.templates || []).some(t => t.name === tplName);
  assert('GET /whatsapp/templates retrieves persisted template', getTpl.status === 200 && foundTpl, `found=${foundTpl}`);

  // Test 3: Mutating endpoints genuine persistence
  // 3A: Review reply
  const rev = await req('POST', '/api/v1/inbox/reviews', {
    reviewerName: 'Forensic Reviewer',
    rating: 5,
    text: 'Auditing platform persistence',
    platform: 'google',
  });
  const revId = rev.data.review?.id;
  assert('POST /inbox/reviews creates review', rev.status === 201 && revId);

  const replyRes = await req('POST', `/api/v1/inbox/reviews/${revId}/reply`, {
    text: 'Auditor verified reply persistence',
  });
  assert('POST /inbox/reviews/{id}/reply returns 200', replyRes.status === 200 && replyRes.data.reply?.text === 'Auditor verified reply persistence');

  const listRev = await req('GET', '/api/v1/inbox/reviews');
  const updatedRev = (listRev.data.reviews || []).find(r => r.id === revId);
  assert('GET /inbox/reviews confirms reply persisted in store', updatedRev?.reply?.text === 'Auditor verified reply persistence');

  // 3B: Broadcast send
  const bc = await req('POST', '/api/v1/broadcasts', {
    name: 'Auditor Broadcast',
    platform: 'whatsapp',
    message: 'Auditor Broadcast Message',
  });
  const bcId = bc.data.broadcast?.id;
  assert('POST /broadcasts creates broadcast', bc.status === 201 && bcId);

  const sendBc = await req('POST', `/api/v1/broadcasts/${bcId}/send`);
  assert('POST /broadcasts/{id}/send returns 200', sendBc.status === 200 && sendBc.data.status === 'sent');

  const listBc = await req('GET', '/api/v1/broadcasts');
  const updatedBc = (listBc.data.broadcasts || []).find(b => b.id === bcId);
  assert('GET /broadcasts confirms sent status and sentAt persisted', updatedBc?.status === 'sent' && !!updatedBc?.sentAt);

  // 3C: Sequence enroll
  const seq = await req('POST', '/api/v1/sequences', {
    name: 'Auditor Drip Sequence',
    platform: 'instagram',
    steps: [{ stepNumber: 1, delayMinutes: 0, message: 'Auditor step 1' }],
  });
  const seqId = seq.data.sequence?.id;
  assert('POST /sequences creates sequence', seq.status === 201 && seqId);

  const enrollRes = await req('POST', `/api/v1/sequences/${seqId}/enroll`, {
    contactIds: ['con_auditor_01', 'con_auditor_02', 'con_auditor_03'],
  });
  assert('POST /sequences/{id}/enroll returns enrolled count 3', enrollRes.status === 200 && enrollRes.data.enrolledCount === 3);

  const listSeq = await req('GET', '/api/v1/sequences');
  const updatedSeq = (listSeq.data.sequences || []).find(s => s.id === seqId);
  assert('GET /sequences confirms enrolledContactsCount persisted', updatedSeq?.enrolledContactsCount === 3);

  // 3D: Workflow trigger
  const wf = await req('POST', '/api/v1/workflows', {
    name: 'Auditor Workflow Automation',
    nodes: [{ id: 'trig_01', type: 'trigger', data: { event: 'dm_keyword', keyword: 'AUDIT' } }],
    edges: [],
  });
  const wfId = wf.data.workflow?.id;
  assert('POST /workflows creates workflow', wf.status === 201 && wfId);

  const trigRes = await req('POST', `/api/v1/workflows/${wfId}/trigger`, { keyword: 'AUDIT' });
  assert('POST /workflows/{id}/trigger returns 201 completed', trigRes.status === 201 && trigRes.data.status === 'completed');

  const listWf = await req('GET', '/api/v1/workflows');
  const updatedWf = (listWf.data.workflows || []).find(w => w.id === wfId);
  assert('GET /workflows confirms executionCount incremented to 1', updatedWf?.executionCount === 1);

  // Test 4: Account health 404 guard
  const fakeHealth = await req('GET', '/api/v1/accounts/acc_completely_fake_account_id/health');
  assert('GET /accounts/acc_completely_fake_account_id/health returns 404', fakeHealth.status === 404 && fakeHealth.data.error?.code === 'not_found');

  // Test 5: Clean reset
  const resetRes = await req('POST', '/api/v1/workspaces/reset', {});
  assert('POST /workspaces/reset returns 200', resetRes.status === 200 && resetRes.data.success === true);

  const storeRaw = fs.readFileSync('.data/workspaces.json', 'utf8').trim();
  const storeSize = fs.statSync('.data/workspaces.json').size;
  assert('.data/workspaces.json reset to {"workspaces":{}}', storeSize === 22 && storeRaw === '{\n  "workspaces": {}\n}');

  console.log(`=== AUDIT SUMMARY: ${allPassed ? 'ALL AUDIT CHECKS PASSED' : 'FAILURES DETECTED'} ===`);
  process.exit(allPassed ? 0 : 1);
}

runAudit().catch(err => {
  console.error('Audit exception:', err);
  process.exit(1);
});
