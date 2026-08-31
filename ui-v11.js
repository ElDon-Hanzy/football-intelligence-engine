(function(){
  // C0155 — presentation-only outcome/score coherence guard.
  // Never rewrites frozen probabilities or historical forecasts.
  const priorRenderFixtureCard=renderFixtureCard;

  const pc11=(v,d=0)=>num(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`;
  const normScore11=v=>String(v||'').trim().replaceAll('–','-').replace(/\s+/g,'');
  const scoreOutcome11=s=>{
    const m=normScore11(s).match(/^(\d+)-(\d+)$/);if(!m)return null;
    const h=Number(m[1]),a=Number(m[2]);return h>a?'H':h<a?'A':'D';
  };
  const thesis11=ff=>{
    const mk=ff?.prediction?.markets||{};
    const rows=[['H',num(mk.home_win)],['D',num(mk.draw)],['A',num(mk.away_win)]].filter(x=>x[1]!=null);
    if(rows.length!==3)return null;
    rows.sort((a,b)=>b[1]-a[1]);
    return {outcome:rows[0][0],prob:rows[0][1],margin:rows[0][1]-rows[1][1]};
  };
  const outcomeLabel11=(o,f)=>o==='H'?`${f.home_team?.short_name||f.home_team?.name||'Home'} win`:o==='A'?`${f.away_team?.short_name||f.away_team?.name||'Away'} win`:'Draw';
  const bestInOutcome11=(ff,o)=>{
    const matrix=ff?.prediction?.score_matrix;
    if(!matrix||typeof matrix!=='object'||Array.isArray(matrix))return null;
    let best=null;
    for(const [score,p0] of Object.entries(matrix)){
      if(scoreOutcome11(score)!==o)continue;
      const p=num(p0);if(p==null)continue;
      if(!best||p>best.p)best={score,p};
    }
    return best;
  };
  const rawMeta11=ff=>{
    const rows=ff?.prediction?.top_scorelines||[];
    return {score:modelScore(ff),p:num(rows?.[0]?.prob??rows?.[0]?.probability)};
  };
  const actual11=f=>f?.finished&&f.home_score!=null&&f.away_score!=null?`${f.home_score}-${f.away_score}`:'—';
  const hit11=(f,pred)=>!!f?.finished&&pred!=='—'&&normScore11(pred)===normScore11(actual11(f));
  const teamLink11=(t,away=false)=>{
    const id=Number(t?.id||0);
    if(id)return `<button class="fixture-team-link ${away?'away':''}" data-team="${id}"><strong>${esc(t.short_name||t.name||'—')}</strong><span>${esc(t.name||'—')}</span></button>`;
    return `<div class="team-block ${away?'away':''}"><strong>${esc(t?.short_name||t?.name||'—')}</strong><span>${esc(t?.name||'—')}</span></div>`;
  };

  renderFixtureCard=function(f){
    const ff=fixtureFpl(f.match_id),raw=rawMeta11(ff),th=thesis11(ff);
    if(!ff?.prediction||!th||f.finished)return priorRenderFixtureCard(f);
    const rawOutcome=scoreOutcome11(raw.score);
    if(!rawOutcome||rawOutcome===th.outcome)return priorRenderFixtureCard(f);

    const [status,cls]=matchStatus(f),best=bestInOutcome11(ff,th.outcome),actual=actual11(f);
    const sigs=[strongSignal(f.home_team),strongSignal(f.away_team)].filter(Boolean);
    return `<article class="fixture-card" data-fixture="${f.match_id}">
      <div class="fixture-top"><span class="fixture-time">${dateOnly(f.kickoff_time)} · ${timeOnly(f.kickoff_time)}</span><span class="badge ${cls}">${status}</span></div>
      <div class="fixture-teams">
        ${teamLink11(f.home_team)}
        <div class="fixture-score-pair score-coherence-conflict">
          <div class="fixture-score-line predicted"><span>Outcome thesis · ${esc(outcomeLabel11(th.outcome,f))} ${pc11(th.prob)}</span><strong>Unresolved</strong><small class="score-edge-note">raw mode ${esc(raw.score)}${raw.p!=null?` ${pc11(raw.p,1)}`:''}${best?` · best thesis score ${esc(best.score)} ${pc11(best.p,1)}`:''}</small></div>
          <div class="fixture-score-line actual"><span>Actual</span><strong>${esc(actual)}</strong></div>
        </div>
        ${teamLink11(f.away_team,true)}
      </div>
      <div class="score-coherence-note">Raw modal score conflicts with the dominant 1X2 thesis. No headline correct score is forced while C0154 validation is in progress.</div>
      ${sigs.length?`<div class="signal-strip">${sigs.map(s=>`<span class="signal-chip ${directionClass(s)}">${esc(shortSignal(s.signal_key))}: ${esc(String(s.direction||'').replaceAll('_',' '))}</span>`).join('')}</div>`:''}
    </article>`;
  };
})();