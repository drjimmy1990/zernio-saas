-- Preserve Meta handover evidence independently of message/receipt clocks.
-- This audit projection is updated in the same transaction as durable acceptance.
create function public.project_zernio_conversation_control()
returns trigger language plpgsql security invoker set search_path=public as $$
declare resource text; changed timestamptz;
begin
 if new.payload->>'event' <> 'conversation.control_changed' then return new; end if;
 resource := 'conversation:' || coalesce(new.payload#>>'{account,accountId}', new.payload#>>'{account,id}') || ':' ||
   (new.payload#>>'{conversation,id}') || ':control';
 changed := (new.payload->>'changedAt')::timestamptz;
 if resource is null or changed is null or coalesce(new.payload#>>'{control,owner}','') not in ('app','ai_agent','other') then
   raise exception 'Invalid conversation control event';
 end if;
 insert into zernio_webhook_projection(organization_id,resource_key,event_type,event_at,payload)
 values(new.organization_id,resource,'conversation.control_changed',changed,new.payload)
 on conflict(organization_id,resource_key) do update
 set event_type=excluded.event_type,event_at=excluded.event_at,payload=excluded.payload
 where excluded.event_at>zernio_webhook_projection.event_at;
 return new;
end $$;
revoke all on function public.project_zernio_conversation_control() from public,anon,authenticated;
grant execute on function public.project_zernio_conversation_control() to service_role;
create trigger zernio_conversation_control_projection
after insert on public.zernio_webhook_events
for each row execute function public.project_zernio_conversation_control();
