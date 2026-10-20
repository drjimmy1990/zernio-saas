import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const container = process.env.PHASE1C_PG_CONTAINER;
const sql = query => execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'phase1c', '-At', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8', windowsHide: true }).trim();
const org = '00000000-0000-0000-0000-000000000002';
const quote = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
const accept = (value, endpoints = []) => `select accept_zernio_webhook('${org}','profile-meta',${quote(value)},${quote(endpoints)});`;

test('Meta inbox webhooks retain platform/standby and order control by changedAt with atomic replay', { skip: !container }, () => {
  sql(`insert into organizations(id,name,slug,zernio_profile_id) values('${org}','Meta Fixture','phase2a-meta-fixture','profile-meta') on conflict do nothing;`);
  for (const platform of ['facebook', 'instagram']) {
    const base = { profiles: [{ id: 'profile-meta', externalId: org }], account: { id: platform, profileId: 'profile-meta', platform }, timestamp: '2026-10-19T12:05:00Z', conversation: { id: 'same-thread' } };
    const received = { ...base, id: `${platform}-received`, event: 'message.received', message: { id: 'same-message', platform, text: 'Customer question', direction: 'incoming', sentAt: '2026-10-19T12:00:00Z' }, metadata: { standby: true } };
    sql(accept(received));
    assert.equal(sql(`select payload#>>'{metadata,standby}' from zernio_webhook_projection where organization_id='${org}' and resource_key='message:${platform}:same-message:content';`), 'true');
    const control = { ...base, id: `${platform}-control`, event: 'conversation.control_changed', changedAt: '2026-10-19T12:04:00Z', control: { owner: 'other', previousOwner: 'app', ownerAppId: '263902037430900', metadata: 'Customer support' } };
    assert.throws(() => sql(accept(control, [{ id: 'invalid-endpoint', secret: 'fixture' }])));
    assert.equal(sql(`select count(*) from zernio_webhook_events where event_id='${platform}-control';`), '0');
    assert.equal(sql(`select count(*) from zernio_webhook_projection where organization_id='${org}' and resource_key='conversation:${platform}:same-thread:control';`), '0');
    assert.equal(JSON.parse(sql(accept(control))).deduplicated, false);
    assert.equal(JSON.parse(sql(accept(control))).deduplicated, true);
    sql(accept({ ...control, id: `${platform}-late-control`, changedAt: '2026-10-19T12:03:00Z', timestamp: '2026-10-19T12:06:00Z', control: { owner: 'app', previousOwner: 'other' } }));
    assert.equal(sql(`select payload#>>'{control,owner}' from zernio_webhook_projection where organization_id='${org}' and resource_key='conversation:${platform}:same-thread:control';`), 'other');
    sql(accept({ ...control, id: `${platform}-new-control`, changedAt: '2026-10-19T12:05:00Z', control: { owner: 'app', previousOwner: 'other' } }));
    assert.equal(sql(`select payload#>>'{control,owner}' from zernio_webhook_projection where organization_id='${org}' and resource_key='conversation:${platform}:same-thread:control';`), 'app');
    assert.match(sql(accept({ ...control, id: `${platform}-foreign-control`, account: { ...base.account, profileId: 'foreign' } })), /mapping mismatch/);
    assert.throws(() => sql(`set role authenticated; select * from zernio_webhook_projection;`));
  }
  assert.equal(sql(`select count(*) from zernio_webhook_projection where organization_id='${org}' and resource_key like 'conversation:%:control';`), '2');
});
