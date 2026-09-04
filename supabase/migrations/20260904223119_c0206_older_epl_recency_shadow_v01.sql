create table if not exists public.research_c0206_older_epl_recency_bootstrap_snapshots (
  id bigserial primary key,
  player_id bigint not null references public.players(id),
  captured_at timestamptz not null default clock_timestamp(),
  historical_season text not null,
  target_season text not null,
  season_gap integer not null,
  historical_minutes integer not null,
  historical_xg90 numeric,
  historical_xa90 numeric,
  validation_id bigint references public.research_c0206_historical_prior_validations(id),
  persistence_factor numeric,
  season_reliability numeric,
  history_weight numeric,
  peer_count integer not null,
  peer_expected_minutes numeric,
  peer_start_probability numeric,
  peer_appearance_probability numeric,
  peer_starter_minutes numeric,
  peer_xg90 numeric,
  peer_xa90 numeric,
  peer_q95_xg90 numeric,
  peer_q95_xa90 numeric,
  peer_dc_probability numeric,
  current_final_rows integer not null default 0,
  current_final_apps integer not null default 0,
  current_final_starts integer not null default 0,
  current_final_minutes numeric not null default 0,
  bootstrap_expected_minutes numeric,
  bootstrap_start_probability numeric,
  bootstrap_appearance_probability numeric,
  bootstrap_starter_minutes numeric,
  bootstrap_xg90 numeric,
  bootstrap_xa90 numeric,
  bootstrap_dc_probability numeric,
  sensitivity_low_xg90 numeric,
  sensitivity_high_xg90 numeric,
  sensitivity_low_xa90 numeric,
  sensitivity_high_xa90 numeric,
  candidate_live_restore boolean not null default false,
  decision text not null,
  evidence jsonb not null default '{}'::jsonb,
  model_effect_enabled boolean not null default false,
  constraint c0206_older_epl_shadow_effect_off check (model_effect_enabled=false)
);

create index if not exists idx_c0206_older_epl_shadow_player_time
  on public.research_c0206_older_epl_recency_bootstrap_snapshots(player_id,captured_at desc);

create or replace function private.block_c0206_older_epl_shadow_mutation_v01()
returns trigger language plpgsql as $$
begin
  raise exception 'C0206 older EPL recency bootstrap snapshots are append-only';
end $$;

drop trigger if exists trg_block_c0206_older_epl_shadow_update on public.research_c0206_older_epl_recency_bootstrap_snapshots;
create trigger trg_block_c0206_older_epl_shadow_update
before update or delete on public.research_c0206_older_epl_recency_bootstrap_snapshots
for each row execute function private.block_c0206_older_epl_shadow_mutation_v01();

create or replace function private.capture_c0206_older_epl_recency_shadow_v01()
returns jsonb
language plpgsql
security definer
set search_path=private,public,pg_temp
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_rows integer:=0;
  v_candidates integer:=0;
begin
  with latest_audit_time as (
    select max(captured_at) t from public.research_c0206_foreign_prior_source_audits
  ), candidates as (
    select a.player_id,p.player_code,p.position,p.now_cost,p.status,p.team_id,
           a.source_club_name,a.latest_transfer_event_at,a.fpl_added_at
    from public.research_c0206_foreign_prior_source_audits a
    join latest_audit_time lt on lt.t=a.captured_at
    join public.players p on p.id=a.player_id
    where a.research_path='SAME_LEAGUE_2024_25_RECENCY_SHRINK'
  ), hist as (
    select c.*,
      count(*) filter(where e.minutes>0)::int played_rows,
      coalesce(sum(e.minutes) filter(where e.minutes>0),0)::int hist_minutes,
      sum(e.xg) filter(where e.minutes>0) hist_xg,
      sum(e.xa) filter(where e.minutes>0) hist_xa,
      count(*) filter(where e.minutes>0 and e.xg is null)::int missing_xg,
      count(*) filter(where e.minutes>0 and e.xa is null)::int missing_xa,
      count(distinct e.source_commit_sha) source_commit_count
    from candidates c
    left join public.research_c0197_player_match_evidence e
      on e.source_player_code=c.player_code and e.season='2024-2025'
    group by c.player_id,c.player_code,c.position,c.now_cost,c.status,c.team_id,
             c.source_club_name,c.latest_transfer_event_at,c.fpl_added_at
  ), validated as (
    select h.*,v.id validation_id,v.approved_for_same_league_prior,
           v.xgi90_abs_diff,v.corroborated_minutes
    from hist h
    left join lateral (
      select vv.* from public.research_c0206_historical_prior_validations vv
      where vv.player_id=h.player_id and vv.historical_season='2024-2025'
      order by vv.validated_at desc,vv.id desc limit 1
    ) v on true
  ), final_runs as (
    select distinct on (r.gameweek) r.id,r.gameweek
    from public.gameweek_result_runs r
    where r.source='official_fpl' and r.is_final=true
    order by r.gameweek,r.observed_at desc,r.id desc
  ), current_final as (
    select v.player_id,
      count(a.result_run_id)::int current_final_rows,
      count(*) filter(where a.minutes>0)::int current_final_apps,
      coalesce(sum(a.starts),0)::int current_final_starts,
      coalesce(sum(a.minutes),0)::numeric current_final_minutes
    from validated v
    left join final_runs r on true
    left join public.player_gameweek_actuals a
      on a.result_run_id=r.id and a.player_id=v.player_id
    left join lateral (
      select max(case when e.time_precision='DAY' then e.event_at+interval '1 day' else e.event_at end) effective_cutoff
      from public.player_transfer_events e
      where e.player_id=v.player_id and e.event_type in ('FPL_ADDED','TRANSFER_CONFIRMED','LOAN_CONFIRMED')
    ) cut on true
    left join lateral (
      select min(m.kickoff_time)-interval '90 minutes' deadline_at
      from public.matches m where m.source='fpl' and m.gameweek=r.gameweek
    ) dl on true
    where a.result_run_id is null or cut.effective_cutoff is null or dl.deadline_at>=cut.effective_cutoff
    group by v.player_id
  ), enriched as (
    select v.*,coalesce(cf.current_final_rows,0) current_final_rows,
      coalesce(cf.current_final_apps,0) current_final_apps,
      coalesce(cf.current_final_starts,0) current_final_starts,
      coalesce(cf.current_final_minutes,0) current_final_minutes,
      pers.attack_persistence_factor persistence_factor,
      pr.*
    from validated v
    left join current_final cf on cf.player_id=v.player_id
    left join public.player_ability_cross_season_persistence pers
      on pers.from_season='2024-2025' and pers.to_season='2025-2026'
      and pers.position=v.position and pers.method='player_ability_cross_season_persistence_v0.1'
    cross join lateral (
      select count(*)::int peer_count,
        percentile_cont(.5) within group(order by s.expected_minutes) peer_xmin,
        percentile_cont(.5) within group(order by s.start_probability) peer_pstart,
        percentile_cont(.5) within group(order by s.appearance_probability) peer_pappear,
        percentile_cont(.5) within group(order by s.starter_minutes_estimate) peer_start_mins,
        percentile_cont(.5) within group(order by s.xg90) peer_xg90,
        percentile_cont(.5) within group(order by s.xa90) peer_xa90,
        percentile_cont(.95) within group(order by s.xg90) q95_xg90,
        percentile_cont(.95) within group(order by s.xa90) q95_xa90,
        percentile_cont(.5) within group(order by s.dc_probability) peer_dc
      from public.current_player_state_base s
      join public.players pp on pp.id=s.player_id
      where pp.position=v.position and pp.now_cost between greatest(35,v.now_cost-5) and v.now_cost+5
    ) pr
  ), calc as (
    select e.*,
      90.0*hist_xg/nullif(hist_minutes,0) hist_xg90,
      90.0*hist_xa/nullif(hist_minutes,0) hist_xa90,
      hist_minutes::numeric/(hist_minutes+900.0) reliability,
      greatest(0,least(1,(hist_minutes::numeric/(hist_minutes+900.0))*power(coalesce(persistence_factor,0),2))) hist_weight,
      greatest(0,least(1,(hist_minutes::numeric/(hist_minutes+900.0))*power(.35::numeric,2))) low_weight,
      greatest(0,least(1,(hist_minutes::numeric/(hist_minutes+900.0))*power(.80::numeric,2))) high_weight
    from enriched e
  ), final as (
    select c.*,
      peer_pstart*peer_start_mins+greatest(0,peer_pappear-peer_pstart)*18 boot_xmin,
      least(hist_weight*hist_xg90+(1-hist_weight)*peer_xg90,q95_xg90) boot_xg90,
      least(hist_weight*hist_xa90+(1-hist_weight)*peer_xa90,q95_xa90) boot_xa90,
      least(low_weight*hist_xg90+(1-low_weight)*peer_xg90,q95_xg90) low_xg90,
      least(high_weight*hist_xg90+(1-high_weight)*peer_xg90,q95_xg90) high_xg90,
      least(low_weight*hist_xa90+(1-low_weight)*peer_xa90,q95_xa90) low_xa90,
      least(high_weight*hist_xa90+(1-high_weight)*peer_xa90,q95_xa90) high_xa90,
      (status not in ('i','s','u') and hist_minutes>=900 and missing_xg=0 and missing_xa=0
       and coalesce(approved_for_same_league_prior,false) and peer_count>=20
       and persistence_factor is not null and position<>'GKP') candidate
    from calc c
  )
  insert into public.research_c0206_older_epl_recency_bootstrap_snapshots(
    player_id,captured_at,historical_season,target_season,season_gap,historical_minutes,historical_xg90,historical_xa90,
    validation_id,persistence_factor,season_reliability,history_weight,
    peer_count,peer_expected_minutes,peer_start_probability,peer_appearance_probability,peer_starter_minutes,
    peer_xg90,peer_xa90,peer_q95_xg90,peer_q95_xa90,peer_dc_probability,
    current_final_rows,current_final_apps,current_final_starts,current_final_minutes,
    bootstrap_expected_minutes,bootstrap_start_probability,bootstrap_appearance_probability,bootstrap_starter_minutes,
    bootstrap_xg90,bootstrap_xa90,bootstrap_dc_probability,
    sensitivity_low_xg90,sensitivity_high_xg90,sensitivity_low_xa90,sensitivity_high_xa90,
    candidate_live_restore,decision,evidence,model_effect_enabled)
  select player_id,v_now,'2024-2025','2026-2027',2,hist_minutes,hist_xg90,hist_xa90,
    validation_id,persistence_factor,reliability,hist_weight,
    peer_count,peer_xmin,peer_pstart,peer_pappear,peer_start_mins,
    peer_xg90,peer_xa90,q95_xg90,q95_xa90,peer_dc,
    current_final_rows,current_final_apps,current_final_starts,current_final_minutes,
    boot_xmin,peer_pstart,peer_pappear,peer_start_mins,boot_xg90,boot_xa90,peer_dc,
    least(low_xg90,high_xg90),greatest(low_xg90,high_xg90),least(low_xa90,high_xa90),greatest(low_xa90,high_xa90),
    candidate,
    case
      when candidate then 'CANDIDATE_SHADOW_OLDER_EPL_RECENCY_SHRINK'
      when not coalesce(approved_for_same_league_prior,false) then 'KEEP_EXCLUDED_PROVENANCE_UNVALIDATED'
      when hist_minutes<900 then 'KEEP_EXCLUDED_HISTORICAL_SAMPLE_TOO_SMALL'
      when missing_xg>0 or missing_xa>0 then 'KEEP_EXCLUDED_HISTORICAL_METRIC_MISSING'
      when persistence_factor is null then 'KEEP_EXCLUDED_PERSISTENCE_UNAVAILABLE'
      when position='GKP' then 'KEEP_EXCLUDED_GOALKEEPER_PRIOR_UNSUPPORTED'
      else 'KEEP_GOVERNED_EXCLUSION'
    end,
    jsonb_build_object(
      'change_id','C0206','method','two-season-gap same-league EPL rate shrinkage to current position-price peers',
      'historical_source','C0197 stable-code FPL-Core-Insights 2024/25',
      'validation_id',validation_id,'xgi90_validation_abs_diff',xgi90_abs_diff,
      'corroborated_minutes',corroborated_minutes,
      'season_gap',2,'season_reliability_formula','minutes/(minutes+900)',
      'persistence_source','C0131 player_ability_cross_season_persistence_v0.1',
      'history_weight_formula','season_reliability * attack_persistence_factor^season_gap',
      'sensitivity_persistence_bounds',jsonb_build_array(.35,.80),
      'new_club_start_rate_from_history_used',false,
      'role_prior','current position +/-0.5m peer median; historical starts ignored',
      'current_evidence_gate','latest final official result run only; non-final snapshots excluded',
      'current_final_rows',current_final_rows,
      'rate_cap','current position +/-0.5m peer q95',
      'missing_data_is_not_zero',true,'historical_forecasts_rewritten',false,
      'model_effect_enabled',false
    ),false
  from final;

  get diagnostics v_rows=row_count;
  select count(*) into v_candidates
  from public.research_c0206_older_epl_recency_bootstrap_snapshots
  where captured_at=v_now and candidate_live_restore;

  return jsonb_build_object('ok',true,'change_id','C0206','shadow_version','OLDER_EPL_RECENCY_V01',
    'captured_at',v_now,'rows',v_rows,'candidates',v_candidates,'model_effect_enabled',false,
    'historical_forecasts_rewritten',false);
end $$;

create or replace function private.c0206_older_epl_recency_shadow_status_v01()
returns jsonb
language sql
stable
security definer
set search_path=private,public,pg_temp
as $$
with lt as (select max(captured_at) t from public.research_c0206_older_epl_recency_bootstrap_snapshots),x as (
  select s.*,p.web_name,p.position,t.short_name club
  from public.research_c0206_older_epl_recency_bootstrap_snapshots s
  join lt on lt.t=s.captured_at join public.players p on p.id=s.player_id join public.teams t on t.id=p.team_id
)
select jsonb_build_object(
  'change_id','C0206','captured_at',(select t from lt),'rows',count(*),'candidates',count(*) filter(where candidate_live_restore),
  'model_effect_violations',count(*) filter(where model_effect_enabled),
  'players',coalesce(jsonb_agg(jsonb_build_object(
    'player_id',player_id,'name',web_name,'club',club,'position',position,
    'historical_minutes',historical_minutes,'historical_xg90',round(historical_xg90,4),'historical_xa90',round(historical_xa90,4),
    'persistence_factor',round(persistence_factor,4),'season_reliability',round(season_reliability,4),'history_weight',round(history_weight,4),
    'peer_count',peer_count,'xMin',round(bootstrap_expected_minutes,2),'pStart',round(bootstrap_start_probability,4),
    'xG90',round(bootstrap_xg90,4),'xA90',round(bootstrap_xa90,4),'dc_probability',round(bootstrap_dc_probability,4),
    'sensitivity_xg90',jsonb_build_array(round(sensitivity_low_xg90,4),round(sensitivity_high_xg90,4)),
    'sensitivity_xa90',jsonb_build_array(round(sensitivity_low_xa90,4),round(sensitivity_high_xa90,4)),
    'current_final_rows',current_final_rows,'current_final_minutes',current_final_minutes,
    'candidate',candidate_live_restore,'decision',decision
  ) order by web_name),'[]'::jsonb)
) from x;
$$;