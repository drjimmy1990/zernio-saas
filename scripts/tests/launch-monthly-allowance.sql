begin;
-- Isolated in a rollback: effective zero overrides must never fall through to a paid plan.
insert into public.organizations(id,name,slug,plan_key) values('77777777-7777-4777-8777-777777777777','Monthly limit test','monthly-limit-test','starter');
select public.saas_configure_spending('77777777-7777-4777-8777-777777777777','usr_super_admin','whatsapp_send',true,1,10,'Test allocation');
select public.saas_configure_spending('77777777-7777-4777-8777-777777777777','usr_super_admin','sms_send',true,1,10,'Test allocation');
select public.saas_grant_allowance('77777777-7777-4777-8777-777777777777','usr_super_admin',1000,'monthly-test','Test allocation');
update public.subscription_plan_templates set max_monthly_messages=3 where plan_key='starter';
insert into public.org_feature_overrides(organization_id,custom_max_monthly_messages) values('77777777-7777-4777-8777-777777777777',0);
do $$ declare r jsonb; begin
 r:=public.saas_reserve_allowance('77777777-7777-4777-8777-777777777777','whatsapp_send','zero-override',null,'Test allocation',null,1);
 if r->>'error_code' is distinct from 'monthly_message_limit' then raise exception 'Zero override was ignored: %',r;end if;
 update public.org_feature_overrides set custom_max_monthly_messages=null where organization_id='77777777-7777-4777-8777-777777777777';
 r:=public.saas_reserve_allowance('77777777-7777-4777-8777-777777777777','whatsapp_send','first-two',null,'Test allocation',null,2);
 if r->>'reservationId' is null then raise exception 'Plan inheritance failed: %',r;end if;
 r:=public.saas_reserve_allowance('77777777-7777-4777-8777-777777777777','sms_send','shared-month',null,'Test allocation',null,2);
 if r->>'error_code' is distinct from 'monthly_message_limit' then raise exception 'Channels did not share the monthly limit: %',r;end if;
 r:=public.saas_reserve_allowance('77777777-7777-4777-8777-777777777777','sms_send','last-unit',null,'Test allocation',null,1);
 if r->>'reservationId' is null then raise exception 'Last permitted unit failed: %',r;end if;
 r:=public.saas_reserve_allowance('77777777-7777-4777-8777-777777777777','sms_send','over-limit',null,'Test allocation',null,1);
 if r->>'error_code' is distinct from 'monthly_message_limit' then raise exception 'Unknown attempts must retain consumed units: %',r;end if;
 r:=public.saas_reserve_allowance('77777777-7777-4777-8777-777777777777','whatsapp_send','first-two',null,'Test allocation',null,2);
 if (r->>'replayed')::boolean is distinct from true then raise exception 'A repeat intent allocated again';end if;
 if (select reserved_minor from public.saas_allowances where organization_id='77777777-7777-4777-8777-777777777777')<>3 then raise exception 'Rejected attempts changed spending';end if;
end $$;
rollback;
