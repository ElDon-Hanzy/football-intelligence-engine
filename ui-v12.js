(function(){
  // C0157 — FPL Top 10 truth-source guard.
  // The visible ranking must come from the currently selected GW FPL snapshot,
  // never from a stale human-insights payload left over from another gameweek.
  const priorRenderFpl=renderFpl;

  function currentTop10(){
    const rows=[...(state.fpl?.all_predictions||[])];
    return rows
      .filter(x=>num(x?.expected_points)!=null)
      .sort((a,b)=>Number(b.expected_points)-Number(a.expected_points))
      .slice(0,10);
  }

  function currentRow(x,i){
    return `<div class="human-player-row" data-player="${x.id}">
      <span class="rank-no">${i+1}</span>
      <div><strong>${esc(x.name||'—')}</strong><small>${esc(x.team||'—')} · ${esc(x.position||'—')}</small></div>
      <b>${fmt(x.expected_points)}</b>
      <span>${fmt(x.expected_minutes,0)} min</span>
      <span>${pct(x.p_10_plus)} 10+</span>
    </div>`;
  }

  renderFpl=function(){
    const html=priorRenderFpl();
    const top=currentTop10();
    if(!top.length)return html;

    const doc=new DOMParser().parseFromString(`<div id="c0157-root">${html}</div>`,'text/html');
    const root=doc.querySelector('#c0157-root');
    const list=root?.querySelector('.human-player-list');
    if(!root||!list)return html;

    list.innerHTML=`<div class="human-player-row human-header"><span>#</span><span>Player</span><b>xPts</b><span>xMins</span><span>Ceiling</span></div>${top.map(currentRow).join('')}`;
    list.dataset.gw=String(state.gw||'');
    list.dataset.predictionRun=String(state.fpl?.prediction_run_id||'');

    const section=list.closest('.human-section');
    const desc=section?.querySelector('.human-section-head p');
    if(desc)desc.textContent=`Selected GW snapshot · run ${state.fpl?.prediction_run_id||'—'}. Raw xPts only; not an automatic transfer ranking.`;

    return root.innerHTML;
  };
})();
