(function(){
  const outcome=m=>{if(!m)return '—';const h=num(m.home_win),d=num(m.draw),a=num(m.away_win);if(h==null||d==null||a==null)return '—';return h>=Math.max(d,a)?'Home win':a>=Math.max(h,d)?'Away win':'Draw'};
  const outcomeProb=m=>{if(!m)return null;const h=num(m.home_win),d=num(m.draw),a=num(m.away_win);if(h==null||d==null||a==null)return null;return Math.max(h,d,a)};
  const score=n=>num(n)==null?'—':Number(n).toFixed(3);
  const delta=(a,b)=>num(a)==null||num(b)==null||Number(a)===0?'—':`${((Number(b)/Number(a)-1)*100)>=0?'+':''}${((Number(b)/Number(a)-1)*100).toFixed(1)}%`;
  const statusLabel=s=>({SHADOW_BETTER:'Enriched version closer',SHADOW_WORSE:'Enriched version worse',SIMILAR:'Little overall change',SHADOW_ONLY_NO_ORIGINAL_BASE:'No preserved original for comparison'})[s]||'Pending result';
  const statusClass=s=>s==='SHADOW_BETTER'?'positive':s==='SHADOW_WORSE'?'negative':'';
  const driverNames={wide:'Wide attacking matchup',aerial_set_piece:'Aerial & set-piece matchup',central_creation:'Central creativity matchup',transition:'Counter-attacking opportunity',recent_attack:'Recent attacking xG trend',opponent_recent_defence:'Opponent defensive xG trend',schedule_fatigue:'Rest / fixture congestion',personnel_attack:'Own absences & role continuity',opponent_personnel_defence:'Opponent absences & defensive continuity'};
  function drivers(side){
    if(!side)return [];
    return Object.entries(side).filter(([k,v])=>driverNames[k]&&v&&num(v.contribution)!=null&&Math.abs(Number(v.contribution))>.00005).map(([k,v])=>({key:k,label:driverNames[k],value:Number(v.contribution)})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,3);
  }
  function reasonLine(side,name){const ds=drivers(side);if(!ds.length)return `<span class="shadow-muted">No material new-layer adjustment available for ${esc(name)}.</span>`;return ds.map(d=>`<span class="shadow-reason ${d.value>=0?'up':'down'}"><strong>${esc(d.label)}</strong> ${d.value>=0?'raised':'lowered'} expected goals by about ${Math.abs((Math.exp(d.value)-1)*100).toFixed(1)}%</span>`).join('');}
  function shadowFixtureCard(f){
    const b=f.baseline||{},s=f.shadow||{},e=f.evaluation||null,home=f.home_team?.name||'Home',away=f.away_team?.name||'Away';
    const originalLabel=f.original_comparison_available?'Original GW1 forecast':'Safe pre-match reconstruction';
    const comp=f.original_comparison_available?'Comparable with original':'Original forecast unavailable';
    return `<article class="shadow-match-card">
      <div class="shadow-match-head"><div><strong>${esc(home)} vs ${esc(away)}</strong><span>${f.finished?`Actual: ${esc(f.actual_score)}`:'Not played yet'}</span></div><span class="chip ${statusClass(e?.comparison_status)}">${esc(statusLabel(e?.comparison_status))}</span></div>
      <div class="shadow-compare-grid">
        <div class="shadow-state"><span>${esc(originalLabel)}</span><strong>${esc(outcome(b.markets))} ${outcomeProb(b.markets)!=null?`· ${pct(outcomeProb(b.markets))}`:''}</strong><small>${score(b.home_lambda)} – ${score(b.away_lambda)} expected goals · top score ${esc(b.top_scoreline||'—')}</small></div>
        <div class="shadow-arrow">→</div>
        <div class="shadow-state current"><span>Enriched shadow engine</span><strong>${esc(outcome(s.markets))} ${outcomeProb(s.markets)!=null?`· ${pct(outcomeProb(s.markets))}`:''}</strong><small>${score(s.home_lambda)} – ${score(s.away_lambda)} expected goals · top score ${esc(s.top_scoreline||'—')}</small></div>
        <div class="shadow-arrow">→</div>
        <div class="shadow-state actual"><span>What happened</span><strong>${f.finished?esc(f.actual_score):'Pending'}</strong><small>${e?`Outcome: ${esc(e.actual_outcome==='HOME'?home:e.actual_outcome==='AWAY'?away:'Draw')}`:'Result not available yet'}</small></div>
      </div>
      <div class="shadow-movement"><span>${esc(home)} expected goals: <strong>${score(b.home_lambda)} → ${score(s.home_lambda)}</strong> (${delta(b.home_lambda,s.home_lambda)})</span><span>${esc(away)} expected goals: <strong>${score(b.away_lambda)} → ${score(s.away_lambda)}</strong> (${delta(b.away_lambda,s.away_lambda)})</span></div>
      <div class="shadow-reasons"><div><b>Why ${esc(home)} moved</b>${reasonLine(f.adjustments?.home,home)}</div><div><b>Why ${esc(away)} moved</b>${reasonLine(f.adjustments?.away,away)}</div></div>
      <div class="shadow-foot"><span>${esc(comp)}</span>${e&&f.original_comparison_available?`<span>Brier: ${fmt(e.baseline_brier_1x2,3)} → ${fmt(e.shadow_brier_1x2,3)} ${num(e.brier_delta_shadow_minus_baseline)<0?'(improved)':'(worsened)'}</span>`:''}</div>
    </article>`;
  }
  function enrichedShadowSection(){
    const sh=state.replay?.enriched_shadow;if(!sh?.available)return `<div class="section">${sectionHead('Enriched shadow re-run','Current intelligence layers applied to pre-kickoff GW data')}<div class="empty-state">No enriched shadow run is available for this gameweek.</div></div>`;
    const s=sh.summary||{},fixtures=sh.fixtures||[];
    const direction=s.avg_brier_delta==null?'—':Number(s.avg_brier_delta)<0?'Improved':'Worsened';
    return `<div class="section shadow-section">${sectionHead('Original → Enriched Shadow → Actual','The current intelligence stack changes a separate research forecast while frozen historical predictions remain untouched')}
      <div class="research-note"><strong>This is the experiment we actually care about.</strong><br>Each GW${state.gw} fixture is replayed as though kickoff has not happened. Only information available before that fixture's kickoff is allowed. The new layers are then permitted to make small, bounded changes to the goal expectations. Results are joined only after the shadow forecast is frozen. This is retrospective calibration—not genuine forward validation.</div>
      <div class="performance-hero">${stat('Comparable finished matches',String(s.comparable_finished??0),'A defensible original GW1 forecast exists')}${stat('Result direction',`${s.baseline_outcome_hits??0}/${s.comparable_finished??0} → ${s.shadow_outcome_hits??0}/${s.comparable_finished??0}`,'Original → enriched shadow')}${stat('Exact top score',`${s.baseline_exact_hits??0}/${s.comparable_finished??0} → ${s.shadow_exact_hits??0}/${s.comparable_finished??0}`,'Original → enriched shadow')}${stat('Average probability error',`${fmt(s.avg_baseline_brier,3)} → ${fmt(s.avg_shadow_brier,3)}`,`${direction} by ${fmt(Math.abs(Number(s.avg_brier_delta||0)),3)} on Brier score`)}</div>
      <div class="shadow-summary"><span class="chip positive">Closer: ${s.better??0}</span><span class="chip">Similar: ${s.similar??0}</span><span class="chip negative">Worse: ${s.worse??0}</span><span class="chip blue">No model effect</span></div>
      <div class="shadow-list">${fixtures.map(shadowFixtureCard).join('')}</div>
    </div>`;
  }
  const priorPerformance=renderPerformance;
  renderPerformance=function(){return priorPerformance()+enrichedShadowSection();};
})();
