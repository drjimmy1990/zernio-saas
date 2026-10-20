begin;
insert into public.asra3_campaigns(id,organization_id,created_by,account_id,name,template,contact_ids,audience_snapshot,audience_hash)
values('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','test-account','Atomic claim','{"name":"test","language":"en_US"}',array['33333333-3333-4333-8333-333333333333'::uuid],'{"phones":["201000000001"],"contactIds":[],"evidence":[]}','reviewed');
do $$ declare r jsonb; begin
  if has_table_privilege('anon','public.asra3_campaigns','SELECT') or has_table_privilege('authenticated','public.asra3_campaigns','UPDATE') or has_function_privilege('authenticated','public.claim_asra3_campaign(uuid,uuid,text)','EXECUTE') then raise exception 'Campaign permissions are exposed'; end if;
  r:=public.claim_asra3_campaign('22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444','first');
  if r->>'status'<>'dispatching' or r->>'operation_token'<>'first' then raise exception 'Initial claim failed'; end if;
  if public.claim_asra3_campaign('22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444','second') is not null then raise exception 'Duplicate dispatch claim accepted'; end if;
  if public.claim_asra3_campaign('99999999-9999-4999-8999-999999999999','44444444-4444-4444-8444-444444444444','foreign') is not null then raise exception 'Cross-tenant claim accepted'; end if;
end $$;
rollback;
