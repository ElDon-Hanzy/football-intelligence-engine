// UI semantic hardening for observational tactical intelligence.
// Loaded after app.js so these global render helpers replace the baseline versions
// without changing any API contract or model state.
function signalSalience(s){
  const v=num(s?.score);if(v==null)return -1;
  const type=String(s?.score_type||'');
  if(type==='ADVANTAGE')return Math.abs(v-.5)*2;
  if(type==='DISRUPTION')return v;
  if(type==='OPPORTUNITY')return v;
  return 0;
}
function strongSignal(side){
  return (side?.matchup_signals||[])
    .filter(s=>num(s.score)!=null)
    .sort((a,b)=>signalSalience(b)-signalSalience(a))[0]||null;
}
function directionClass(s){
  const d=String(s?.direction||'');
  if(d==='LOW_DISRUPTION')return '';
  if(d.includes('DISRUPTION'))return 'risk';
  if(d.includes('ADVANTAGE'))return 'advantage';
  if(d.includes('LEAN')||d.includes('MODERATE'))return 'lean';
  return '';
}
function timeOnly(v){
  return v?new Date(v).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—';
}
function renderFixtureCard(f){
  const [status,cls]=matchStatus(f),ff=fixtureFpl(f.match_id);
  const hSig=strongSignal(f.home_team),aSig=strongSignal(f.away_team),sigs=[hSig,aSig].filter(Boolean).slice(0,2);
  const centre=f.finished?actualScore(f):modelScore(ff),centreLabel=f.finished?'actual':ff?.prediction?'model top score':'pre-match';
  return `<article class="fixture-card" data-fixture="${f.match_id}"><div class="fixture-top"><span class="fixture-time">${dateOnly(f.kickoff_time)} · ${timeOnly(f.kickoff_time)}</span><span class="badge ${cls}">${status}</span></div><div class="fixture-teams"><div class="team-block"><strong>${esc(f.home_team.short_name||f.home_team.name)}</strong><span>${esc(f.home_team.name)}</span></div><div class="fixture-score"><strong>${esc(centre)}</strong><span>${centreLabel}</span></div><div class="team-block away"><strong>${esc(f.away_team.short_name||f.away_team.name)}</strong><span>${esc(f.away_team.name)}</span></div></div>${sigs.length?`<div class="signal-strip">${sigs.map(s=>`<span class="signal-chip ${directionClass(s)}">${esc(shortSignal(s.signal_key))}: ${esc(String(s.direction||'').replaceAll('_',' '))}</span>`).join('')}</div>`:''}</article>`;
}
