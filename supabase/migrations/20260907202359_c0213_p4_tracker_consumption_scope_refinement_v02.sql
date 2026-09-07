create or replace function private.c0213_tracker_consumption_governance_v01()
returns jsonb language sql stable security definer set search_path='pg_catalog','private','public' as $$
with scoped as (
 select c.change_id,c.title,c.status,c.delivery_stage,c.model_effect,
   case
     when lower(coalesce(c.model_effect,'')) in ('n/a','none') then false
     when lower(coalesce(c.model_effect,'')) like 'none %' or lower(coalesce(c.model_effect,'')) like 'none —%' then false
     when lower(coalesce(c.model_effect,'')) like 'no direct model effect%' then false
     when lower(coalesce(c.model_effect,'')) like 'audit only%' then false
     when lower(coalesce(c.model_effect,'')) like 'presentation/%' or lower(coalesce(c.model_effect,'')) like 'presentation %' then false
     else true
   end requires_contract
 from public.change_tracker_working c where c.delivery_stage in ('Executed','Verified')
), j as (
 select s.*,cc.pathway,cc.consumer_or_evaluator_ref from scoped s left join private.c0213_change_consumption_contracts cc using(change_id)
)
select jsonb_build_object(
 'ok',count(*) filter(where requires_contract and pathway is null)=0,
 'contract_version','C0213_TRACKER_CONSUMPTION_V02',
 'implemented_rows',count(*),'rows_requiring_contract',count(*) filter(where requires_contract),
 'covered_rows',count(*) filter(where requires_contract and pathway is not null),
 'violations',coalesce(jsonb_agg(jsonb_build_object('change_id',change_id,'title',title,'status',status,'delivery_stage',delivery_stage,'model_effect',model_effect)) filter(where requires_contract and pathway is null),'[]'::jsonb)
) from j;
$$;
revoke all on function private.c0213_tracker_consumption_governance_v01() from public,anon,authenticated;
grant execute on function private.c0213_tracker_consumption_governance_v01() to service_role;