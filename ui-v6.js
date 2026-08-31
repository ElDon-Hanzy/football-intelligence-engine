(function(){
  // C0142/C0144 — actual-manager action + full-pool advisory overlays.
  // Historical model decisions remain immutable. Actual actions and advisory plans live in separate append-only lineages.
  const ACTUAL_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/fpl-actual-decision-api';
  const priorLoad=load;
  const priorRenderFpl=renderFpl;
  let syncing=false,lastGw=null;

  function applyActual(actual){
    if(!state.fpl)return false;
    state.fpl.model_decision=state.fpl.model_decision||state.fpl.decision||null;
    state.fpl.actual_decision=actual||null;
    if(!actual?.captain_player_id)return false;
    state.fpl.decision={
      ...(state.fpl.model_decision||state.fpl.decision||{}),
      captain_player_id:actual.captain_player_id,
      ...(actual.vice_player_id?{vice_player_id:actual.vice_player_id}:{}),
      actual_action_overlay:true
    };
    return true;
  }

  async function syncActual(){
    const gw=Number(state.gw||state.fpl?.gameweek||0);
    if(!state.fpl||gw<1||gw>38||syncing)return;
    syncing=true;
    try{
      const r=await fetch(`${ACTUAL_API}?gw=${gw}`,{cache:'no-store'});
      const j=await r.json();
      if(r.ok&&j?.ok){
        const actualChanged=applyActual(j.actual_decision||null);
        state.fpl.manager_plan=j.manager_plan||null;
        lastGw=gw;
        if(actualChanged||j.manager_plan)render();
      }
    }catch(e){console.warn('FPL manager overlay unavailable',e)}finally{syncing=false}
  }

  load=async function(gw=0){
    await priorLoad(gw);
    await syncActual();
  };

  function actualBanner(){
    const actual=state.fpl?.actual_decision,model=state.fpl?.model_decision;
    if(!actual?.captain_player_id||!model)return '';
    const actualCap=findPlayer(actual.captain_player_id),modelCap=findPlayer(model.captain_player_id);
    return `<div class="insight-card"><div class="insight-icon green">A</div><div><strong>Actual manager action</strong><p>Captain ${esc(actualCap?.name||'confirmed')} · frozen model recommendation: ${esc(modelCap?.name||'—')}. The historical model snapshot has not been rewritten.</p></div></div>`;
  }

  function planBanner(){
    const p=state.fpl?.manager_plan;if(!p)return '';
    const transfers=(p.transfers||[]).map(t=>`${esc(t.out||'—')} → ${esc(t.in||'—')}`).join(' · ')||'Hold';
    const cap=findPlayer(p.captain_player_id),vice=findPlayer(p.vice_player_id);
    const status=String(p.status||'').replaceAll('_',' ');
    const x=Number(p.gw_expected_xi_points),g=Number(p.expected_gain_current_gw),h=Number(p.expected_gain_horizon);
    const budget=esc(p.rationale?.budget_after_plan||'');
    return `<div class="insight-card"><div class="insight-icon amber">P</div><div><strong>Full-pool manager plan · ${esc(status)}</strong><p>${transfers} · C ${esc(cap?.name||'—')} / VC ${esc(vice?.name||'—')}${Number.isFinite(x)?` · projected XI ${x.toFixed(1)}`:''}${Number.isFinite(g)?` · +${g.toFixed(1)} GW${state.gw}`:''}${Number.isFinite(h)?` · +${h.toFixed(1)} over horizon`:''}${budget?` · ${budget}`:''}</p>${p.rationale?.red_team?`<small>${esc(p.rationale.red_team)}</small>`:''}</div></div>`;
  }

  renderFpl=function(){return actualBanner()+planBanner()+priorRenderFpl();};

  // app.js may have started its initial async load before this deferred script executed.
  const timer=setInterval(()=>{
    const gw=Number(state.gw||0);
    if(state.fpl&&gw&&gw!==lastGw)syncActual();
    if(state.fpl&&lastGw===gw)clearInterval(timer);
  },250);
  setTimeout(()=>clearInterval(timer),5000);
})();
