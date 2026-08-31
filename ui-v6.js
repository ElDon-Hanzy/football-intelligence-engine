(function(){
  // C0142 — actual-manager action overlay.
  // Historical model decisions remain immutable. Where the manager confirms a real action,
  // present that action as primary while keeping the frozen model recommendation visible for audit.
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
        const changed=applyActual(j.actual_decision||null);
        lastGw=gw;
        if(changed)render();
      }
    }catch(e){console.warn('Actual FPL decision overlay unavailable',e)}finally{syncing=false}
  }

  load=async function(gw=0){
    await priorLoad(gw);
    await syncActual();
  };

  renderFpl=function(){
    const html=priorRenderFpl();
    const actual=state.fpl?.actual_decision,model=state.fpl?.model_decision;
    if(!actual?.captain_player_id||!model)return html;
    const actualCap=findPlayer(actual.captain_player_id),modelCap=findPlayer(model.captain_player_id);
    const banner=`<div class="insight-card"><div class="insight-icon green">A</div><div><strong>Actual manager action</strong><p>Captain ${esc(actualCap?.name||'confirmed')} · frozen model recommendation: ${esc(modelCap?.name||'—')}. The historical model snapshot has not been rewritten.</p></div></div>`;
    return banner+html;
  };

  // app.js may have started its initial async load before this deferred script executed.
  // Reconcile once that first state is available, without forcing a second data load.
  const timer=setInterval(()=>{
    const gw=Number(state.gw||0);
    if(state.fpl&&gw&&gw!==lastGw){syncActual()}
    if(state.fpl&&lastGw===gw)clearInterval(timer);
  },250);
  setTimeout(()=>clearInterval(timer),5000);
})();
