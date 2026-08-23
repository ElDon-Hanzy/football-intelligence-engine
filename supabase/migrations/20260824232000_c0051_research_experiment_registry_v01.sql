-- C0051 — immutable research experiment registry
-- Applied to production as c0051_research_experiment_registry_v01 on 2026-08-24.

create sequence if not exists public.research_experiment_key_seq start with 1 increment by 1;

create table if not exists public.research_experiments (
  id bigint generated always as identity primary key,
  experiment_key text not null unique,
  change_id text not null check (change_id ~ '^C[0-9]{4}$'),
  parent_experiment_key text references public.research_experiments(experiment_key),
  experiment_name text not null,
  purpose text not null,
  hypothesis text,
  experiment_type text not null check (experiment_type in (
    'SHADOW_REPLAY','BLIND_REPLAY','ABLATION','OUTCOME_MODEL','LEARNED_EFFECTS',
    'INTERACTION','WALK_FORWARD','CALIBRATION','DATA_QUALITY','OTHER'
  )),
  feature_schema_version text,
  feature_families jsonb not null default '[]'::jsonb,
  baseline_model_version text,
  candidate_model_version text,
  outcome_model_version text,
  chronology_policy jsonb not null,
  train_window jsonb,
  validation_window jsonb,
  test_window jsonb,
  code_commit_sha text,
  model_artifact_hash text,
  coefficient_manifest jsonb,
  external_refs jsonb not null default '{}'::jsonb,
  definition_hash text not null unique,
  status text not null default 'REGISTERED' check (status in ('REGISTERED','SUPERSEDED','REJECTED','PROMOTED')),
  actual_data_allowed_in_generation boolean not null default false,
  forward_valid boolean not null default false,
  model_effect_enabled boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  created_by text not null default 'service_role',
  check (not model_effect_enabled),
  check (not actual_data_allowed_in_generation)
);

create index if not exists research_experiments_change_id_idx on public.research_experiments(change_id, created_at desc);
create index if not exists research_experiments_parent_idx on public.research_experiments(parent_experiment_key);
create index if not exists research_experiments_type_idx on public.research_experiments(experiment_type, created_at desc);

alter table public.research_experiments enable row level security;
revoke all on public.research_experiments from anon, authenticated;
revoke all on sequence public.research_experiment_key_seq from anon, authenticated;
grant select, insert on public.research_experiments to service_role;
grant usage, select on sequence public.research_experiment_key_seq to service_role;

create or replace function private.block_research_experiment_mutation()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  raise exception 'research_experiments is immutable; create a new experiment definition instead';
end;
$$;

drop trigger if exists trg_block_research_experiment_mutation on public.research_experiments;
create trigger trg_block_research_experiment_mutation
before update or delete on public.research_experiments
for each row execute function private.block_research_experiment_mutation();

create or replace function public.register_research_experiment_v01(
  p_change_id text,
  p_experiment_name text,
  p_purpose text,
  p_experiment_type text,
  p_chronology_policy jsonb,
  p_hypothesis text default null,
  p_parent_experiment_key text default null,
  p_feature_schema_version text default null,
  p_feature_families jsonb default '[]'::jsonb,
  p_baseline_model_version text default null,
  p_candidate_model_version text default null,
  p_outcome_model_version text default null,
  p_train_window jsonb default null,
  p_validation_window jsonb default null,
  p_test_window jsonb default null,
  p_code_commit_sha text default null,
  p_model_artifact_hash text default null,
  p_coefficient_manifest jsonb default null,
  p_external_refs jsonb default '{}'::jsonb,
  p_forward_valid boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_hash text;
  v_key text;
  v_row public.research_experiments%rowtype;
  v_payload jsonb;
begin
  if p_change_id !~ '^C[0-9]{4}$' then
    raise exception 'Invalid Change ID %', p_change_id;
  end if;
  if p_experiment_type not in ('SHADOW_REPLAY','BLIND_REPLAY','ABLATION','OUTCOME_MODEL','LEARNED_EFFECTS','INTERACTION','WALK_FORWARD','CALIBRATION','DATA_QUALITY','OTHER') then
    raise exception 'Invalid experiment_type %', p_experiment_type;
  end if;
  if p_chronology_policy is null or jsonb_typeof(p_chronology_policy) <> 'object' then
    raise exception 'chronology_policy must be a JSON object';
  end if;
  if coalesce((p_chronology_policy->>'pre_kickoff_only')::boolean,false) is not true then
    raise exception 'chronology_policy.pre_kickoff_only must be true';
  end if;
  if coalesce((p_chronology_policy->>'actual_data_allowed_in_generation')::boolean,false) is true then
    raise exception 'Actual outcome data is forbidden during experiment generation';
  end if;
  if p_parent_experiment_key is not null and not exists(select 1 from public.research_experiments where experiment_key=p_parent_experiment_key) then
    raise exception 'Unknown parent experiment %', p_parent_experiment_key;
  end if;

  v_payload := jsonb_strip_nulls(jsonb_build_object(
    'change_id',p_change_id,
    'parent_experiment_key',p_parent_experiment_key,
    'experiment_name',p_experiment_name,
    'purpose',p_purpose,
    'hypothesis',p_hypothesis,
    'experiment_type',p_experiment_type,
    'feature_schema_version',p_feature_schema_version,
    'feature_families',coalesce(p_feature_families,'[]'::jsonb),
    'baseline_model_version',p_baseline_model_version,
    'candidate_model_version',p_candidate_model_version,
    'outcome_model_version',p_outcome_model_version,
    'chronology_policy',p_chronology_policy,
    'train_window',p_train_window,
    'validation_window',p_validation_window,
    'test_window',p_test_window,
    'code_commit_sha',p_code_commit_sha,
    'model_artifact_hash',p_model_artifact_hash,
    'coefficient_manifest',p_coefficient_manifest,
    'external_refs',coalesce(p_external_refs,'{}'::jsonb),
    'forward_valid',p_forward_valid
  ));
  v_hash := md5(v_payload::text);

  select * into v_row from public.research_experiments where definition_hash=v_hash;
  if found then
    return jsonb_build_object('ok',true,'existing',true,'experiment_key',v_row.experiment_key,'id',v_row.id,'definition_hash',v_row.definition_hash);
  end if;

  v_key := 'E' || lpad(nextval('public.research_experiment_key_seq')::text,4,'0');
  if length(v_key) <> 5 then
    raise exception 'Experiment key sequence exceeded 4 digits';
  end if;

  insert into public.research_experiments(
    experiment_key,change_id,parent_experiment_key,experiment_name,purpose,hypothesis,experiment_type,
    feature_schema_version,feature_families,baseline_model_version,candidate_model_version,outcome_model_version,
    chronology_policy,train_window,validation_window,test_window,code_commit_sha,model_artifact_hash,
    coefficient_manifest,external_refs,definition_hash,status,actual_data_allowed_in_generation,forward_valid,
    model_effect_enabled,created_by
  ) values (
    v_key,p_change_id,p_parent_experiment_key,p_experiment_name,p_purpose,p_hypothesis,p_experiment_type,
    p_feature_schema_version,coalesce(p_feature_families,'[]'::jsonb),p_baseline_model_version,p_candidate_model_version,p_outcome_model_version,
    p_chronology_policy,p_train_window,p_validation_window,p_test_window,p_code_commit_sha,p_model_artifact_hash,
    p_coefficient_manifest,coalesce(p_external_refs,'{}'::jsonb),v_hash,'REGISTERED',false,p_forward_valid,false,'service_role'
  ) returning * into v_row;

  return jsonb_build_object('ok',true,'existing',false,'experiment_key',v_row.experiment_key,'id',v_row.id,'definition_hash',v_row.definition_hash);
end;
$$;

revoke all on function public.register_research_experiment_v01(text,text,text,text,jsonb,text,text,text,jsonb,text,text,text,jsonb,jsonb,jsonb,text,text,jsonb,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.register_research_experiment_v01(text,text,text,text,jsonb,text,text,text,jsonb,text,text,text,jsonb,jsonb,jsonb,text,text,jsonb,jsonb,boolean) to service_role;

create or replace view public.research_experiment_registry
with (security_invoker=true) as
select experiment_key,change_id,parent_experiment_key,experiment_name,purpose,hypothesis,experiment_type,
       feature_schema_version,feature_families,baseline_model_version,candidate_model_version,outcome_model_version,
       chronology_policy,train_window,validation_window,test_window,code_commit_sha,model_artifact_hash,
       coefficient_manifest,external_refs,definition_hash,status,forward_valid,model_effect_enabled,created_at
from public.research_experiments;

revoke all on public.research_experiment_registry from anon, authenticated;
grant select on public.research_experiment_registry to service_role;
