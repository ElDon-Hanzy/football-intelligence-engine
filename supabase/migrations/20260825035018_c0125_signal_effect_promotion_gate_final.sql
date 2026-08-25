-- C0125 — final signal-effect promotion gate state after record-path fix.
-- Production migrations: 20260825034944 + 20260825035018.

create sequence if not exists public.signal_effect_promotion_assessment_key_seq;
create table if not exists public.signal_effect_promotion_assessments (
  id bigserial primary key,
  assessment_key text not null default ('SPE'||lpad(nextval('public.signal_effect_promotion_assessment_key_seq')::text,4,'0')) unique,
  change_id text not null default 'C0125', family_key text not null,
  historical_experiment_key text, historical_decision text,
  forward_ablation_key text, forward_experiment_key text, candidate_variant text,
  gate_policy jsonb not null, metrics jsonb not null, gate_status text not null,
  definition_hash text not null unique,
  automatic_activation boolean not null default false,
  model_effect_enabled boolean not null default false,
  assessed_at timestamptz not null default now(),
  check(automatic_activation=false), check(model_effect_enabled=false)
);
alter table public.signal_effect_promotion_assessments enable row level security;
revoke all on public.signal_effect_promotion_assessments from anon,authenticated;
grant select,insert on public.signal_effect_promotion_assessments to service_role;
grant usage,select on sequence public.signal_effect_promotion_assessments_id_seq,public.signal_effect_promotion_assessment_key_seq to service_role;

create or replace function private.block_signal_effect_promotion_assessment_mutation_v01()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'signal_effect_promotion_assessments is append-only'; end; $$;
revoke all on function private.block_signal_effect_promotion_assessment_mutation_v01() from public,anon,authenticated;
grant execute on function private.block_signal_effect_promotion_assessment_mutation_v01() to service_role;
drop trigger if exists signal_effect_promotion_assessments_no_mutation on public.signal_effect_promotion_assessments;
create trigger signal_effect_promotion_assessments_no_mutation before update or delete on public.signal_effect_promotion_assessments
for each row execute function private.block_signal_effect_promotion_assessment_mutation_v01();

-- Final corrected assessment function. Families without an isolated forward variant return a gate status rather than raising.
create or replace function private.assess_signal_effect_promotion_v01(p_family_key text,p_ablation_key text default 'A0005',p_candidate_variant text default null)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare
  v_hist record; v_ar_id bigint; v_forward_experiment text; v_candidate text:=p_candidate_variant;
  v_policy jsonb:=jsonb_build_object('min_validation_observations',50,'min_test_observations',30,'min_absolute_brier_improvement',0.005,'log_loss_must_not_worsen',true,'process_mae_tolerance_ratio',1.02,'requires_both_validation_and_test',true,'historical_retrospective_evidence_cannot_pass_alone',true,'no_integrity_violations',true,'automatic_activation',false);
  vb_n integer:=0;vc_n integer:=0;tb_n integer:=0;tc_n integer:=0;
  vb_brier numeric;vc_brier numeric;tb_brier numeric;tc_brier numeric;
  vb_logloss numeric;vc_logloss numeric;tb_logloss numeric;tc_logloss numeric;
  vb_process numeric;vc_process numeric;tb_process numeric;tc_process numeric;
  v_integrity integer:=0;v_status text;v_metrics jsonb;v_hash text;v_id bigint;v_key text;
begin
  select d.* into v_hist from public.signal_effect_family_decisions d where d.experiment_key='E0009' and d.family_key=p_family_key order by d.id desc limit 1;
  if v_candidate is null then v_candidate:=case p_family_key when 'RECENT_FORM_PACKAGE' then 'FORM_ONLY' else null end; end if;
  select ar.id,ar.experiment_key into v_ar_id,v_forward_experiment from public.walk_forward_ablation_runs ar where ar.ablation_key=p_ablation_key limit 1;
  if v_ar_id is not null and v_candidate is not null then
    select count(*),avg(brier),avg(score_log_loss),avg(process_mae) into vb_n,vb_brier,vb_logloss,vb_process from public.walk_forward_ablation_evaluations where ablation_run_id=v_ar_id and split='VALIDATION' and variant_key='BASE_V03_ELO';
    select count(*),avg(brier),avg(score_log_loss),avg(process_mae) into vc_n,vc_brier,vc_logloss,vc_process from public.walk_forward_ablation_evaluations where ablation_run_id=v_ar_id and split='VALIDATION' and variant_key=v_candidate;
    select count(*),avg(brier),avg(score_log_loss),avg(process_mae) into tb_n,tb_brier,tb_logloss,tb_process from public.walk_forward_ablation_evaluations where ablation_run_id=v_ar_id and split='TEST' and variant_key='BASE_V03_ELO';
    select count(*),avg(brier),avg(score_log_loss),avg(process_mae) into tc_n,tc_brier,tc_logloss,tc_process from public.walk_forward_ablation_evaluations where ablation_run_id=v_ar_id and split='TEST' and variant_key=v_candidate;
    select count(*) into v_integrity from public.walk_forward_ablation_predictions p join public.walk_forward_fixture_cohort c on c.id=p.cohort_id where p.ablation_run_id=v_ar_id and (p.actual_data_used or p.model_effect_enabled or c.actual_data_used or c.model_effect_enabled or c.cohort_cutoff>=c.kickoff_time);
  end if;
  v_metrics:=jsonb_build_object('historical',jsonb_build_object('experiment_key','E0009','decision',v_hist.decision,'evidence',v_hist.evidence),'forward',jsonb_build_object('ablation_key',p_ablation_key,'experiment_key',v_forward_experiment,'candidate_variant',v_candidate,'validation',jsonb_build_object('base_n',vb_n,'candidate_n',vc_n,'base_brier',vb_brier,'candidate_brier',vc_brier,'base_log_loss',vb_logloss,'candidate_log_loss',vc_logloss,'base_process_mae',vb_process,'candidate_process_mae',vc_process),'test',jsonb_build_object('base_n',tb_n,'candidate_n',tc_n,'base_brier',tb_brier,'candidate_brier',tc_brier,'base_log_loss',tb_logloss,'candidate_log_loss',tc_logloss,'base_process_mae',tb_process,'candidate_process_mae',tc_process),'integrity_violations',v_integrity));
  if v_hist.family_key is null then v_status:='NO_HISTORICAL_FAMILY_DECISION';
  elsif v_hist.decision not in ('RETAIN_SMALL_RESEARCH_COMPARATOR','RETAIN_RESEARCH_CANDIDATE') then v_status:='HISTORICAL_NOT_ELIGIBLE';
  elsif v_candidate is null then v_status:='NO_FORWARD_ISOLATION_VARIANT';
  elsif v_ar_id is null then v_status:='NO_FORWARD_ABLATION';
  elsif vc_n<50 or tc_n<30 then v_status:='NOT_ENOUGH_FORWARD_SAMPLE';
  elsif v_integrity>0 then v_status:='FAIL_INTEGRITY';
  elsif vc_brier>vb_brier-.005 or tc_brier>tb_brier-.005 then v_status:='FAIL_BRIER';
  elsif vc_logloss>vb_logloss or tc_logloss>tb_logloss then v_status:='FAIL_LOG_LOSS';
  elsif vc_process is not null and vb_process is not null and vc_process>vb_process*1.02 then v_status:='FAIL_PROCESS_MAE';
  elsif tc_process is not null and tb_process is not null and tc_process>tb_process*1.02 then v_status:='FAIL_PROCESS_MAE';
  else v_status:='PASS_RESEARCH_PROMOTION_REVIEW'; end if;
  v_hash:=md5(jsonb_build_object('family',p_family_key,'historical_experiment','E0009','ablation',p_ablation_key,'candidate',v_candidate,'policy',v_policy,'metrics',v_metrics,'status',v_status)::text);
  select id,assessment_key into v_id,v_key from public.signal_effect_promotion_assessments where definition_hash=v_hash;
  if v_id is null then insert into public.signal_effect_promotion_assessments(family_key,historical_experiment_key,historical_decision,forward_ablation_key,forward_experiment_key,candidate_variant,gate_policy,metrics,gate_status,definition_hash) values(p_family_key,'E0009',v_hist.decision,p_ablation_key,v_forward_experiment,v_candidate,v_policy,v_metrics,v_status,v_hash) returning id,assessment_key into v_id,v_key; end if;
  return jsonb_build_object('ok',true,'assessment_id',v_id,'assessment_key',v_key,'family_key',p_family_key,'gate_status',v_status,'policy',v_policy,'metrics',v_metrics,'automatic_activation',false,'model_effect_enabled',false);
end $$;
revoke all on function private.assess_signal_effect_promotion_v01(text,text,text) from public,anon,authenticated;
grant execute on function private.assess_signal_effect_promotion_v01(text,text,text) to service_role;

create or replace function private.signal_effect_promotion_gate_status_v01()
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
select jsonb_build_object('ok',true,'latest_assessments',coalesce((select jsonb_agg(to_jsonb(x)-'id' order by family_key) from (select distinct on (family_key) * from public.signal_effect_promotion_assessments order by family_key,assessed_at desc,id desc) x),'[]'::jsonb),'automatic_activation',false,'model_effect_enabled',false);
$$;
revoke all on function private.signal_effect_promotion_gate_status_v01() from public,anon,authenticated;
grant execute on function private.signal_effect_promotion_gate_status_v01() to service_role;
