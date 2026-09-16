-- C0277 P4 — integrate robust chip opportunity gate into C0276 final controller.
-- Supporting gate only; C0248 remains selected-path authority; no external execution.
create or replace function private.c0276_chip_opportunity_gate_v01(p_cycle_id bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare gw int; hz int; r jsonb;
begin
 select gameweek,horizon into gw,hz from public.fpl_decision_cycles where id=p_cycle_id;
 if gw is null then return jsonb_build_object('ok',false,'status','C0277_CYCLE_NOT_FOUND','change_id','C0277','cycle_id',p_cycle_id,'gate_class','UNRESOLVED_FAIL_CLOSED','historical_forecasts_rewritten',false,'external_fpl_execution',false); end if;
 r:=private.c0277_robust_chip_action_selector_v01(gw,hz,19);
 if not coalesce((r->>'ok')::boolean,false) then return jsonb_build_object('ok',false,'status','C0277_CHIP_GATE_INPUT_NOT_READY','change_id','C0277','cycle_id',p_cycle_id,'gameweek',gw,'horizon',hz,'gate_class','UNRESOLVED_FAIL_CLOSED','selector',r,'historical_forecasts_rewritten',false,'external_fpl_execution',false); end if;
 return jsonb_build_object('ok',true,'status','C0277_C0276_CHIP_GATE_EVALUATED','change_id','C0277','cycle_id',p_cycle_id,'gameweek',gw,'horizon',hz,'gate_class',r->>'selector_class','recommended_current_chip',r->>'recommended_current_chip','play_now_authorized',coalesce((r->>'play_now_authorized')::boolean,false),'selector',r,'policy',jsonb_build_object('supporting_gate_only',true,'c0248_selected_path_authority_unchanged',true,'cannot_execute_chip',true,'preservation_may_pass_without_future_numeric_rank',true,'chip_spend_requires_play_now_authorized',true),'historical_forecasts_rewritten',false,'external_fpl_execution',false);
end $$;
revoke all on function private.c0276_chip_opportunity_gate_v01(bigint) from public; grant execute on function private.c0276_chip_opportunity_gate_v01(bigint) to service_role;

create or replace function private.c0276_dispatch_final_gate_v01(p_cycle_id bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare gw int; hz int; r jsonb; st text; chip jsonb; chip_class text; chip_play boolean;
begin
 select gameweek,horizon into gw,hz from public.fpl_decision_cycles where id=p_cycle_id;
 if gw is null then return jsonb_build_object('ok',false,'status','BLOCKED','reason','CYCLE_NOT_FOUND'); end if;
 chip:=private.c0276_chip_opportunity_gate_v01(p_cycle_id); chip_class:=coalesce(chip->>'gate_class','UNRESOLVED_FAIL_CLOSED'); chip_play:=coalesce((chip->>'play_now_authorized')::boolean,false);
 if not coalesce((chip->>'ok')::boolean,false) or chip_class='UNRESOLVED_FAIL_CLOSED' then return jsonb_build_object('ok',false,'status','BLOCKED','reason','C0277_CHIP_OPPORTUNITY_GATE_FAIL_CLOSED','chip_gate',chip,'historical_forecasts_rewritten',false,'external_fpl_execution',false); end if;
 r:=private.c0272_final_promotion_watch_v01(gw,hz,false); st:=coalesce(r->>'status','');
 if st in ('OUTSIDE_FINAL_WINDOW','WAITING_FOR_FINAL_T_MINUS_2_PROJECTION') then return jsonb_build_object('ok',false,'status','BLOCKED','reason','FINAL_T_MINUS_2_GOVERNANCE','detail',st,'chip_gate',jsonb_build_object('gate_class',chip_class,'recommended_current_chip',chip->>'recommended_current_chip','play_now_authorized',chip_play),'deadline_at',r->'deadline_at','final_refresh_threshold',r->'final_refresh_threshold','historical_forecasts_rewritten',false,'external_fpl_execution',false); end if;
 if st='DEADLINE_CLOSED' then return jsonb_build_object('ok',false,'status','BLOCKED','reason','DEADLINE_CLOSED','chip_gate',jsonb_build_object('gate_class',chip_class,'recommended_current_chip',chip->>'recommended_current_chip','play_now_authorized',chip_play),'historical_forecasts_rewritten',false,'external_fpl_execution',false); end if;
 return jsonb_build_object('ok',false,'status','BLOCKED','reason','FINAL_GATE_REQUIRES_GOVERNED_T_MINUS_2_PROMOTION','detail',st,'chip_gate',jsonb_build_object('gate_class',chip_class,'recommended_current_chip',chip->>'recommended_current_chip','play_now_authorized',chip_play),'historical_forecasts_rewritten',false,'external_fpl_execution',false);
end $$;
