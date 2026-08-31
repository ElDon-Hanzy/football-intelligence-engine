(function(){
  // C0153 — decision-readable matchup context, fixture score audit, mobile table fit.
  const DETAIL_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/intelligence-detail-api';
  const priorOpenFixture=window.openFixture;
  const priorOpenTeam=window.openTeam;
  const priorOpenPlayer=window.openPlayer;

  const pc10=(v,d=0)=>num(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`;
  const human10=v=>String(v||'').replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());
  const signalLabel10=k=>({
    wide_channel_pressure:'Wide-channel matchup',
    aerial_set_piece_mismatch:'Aerial / set-piece matchup',
    central_creation_vs_block:'Central creation vs block',
    direct_transition_opportunity:'Transition opportunity',
    personnel_disruption:'Personnel continuity'
  })[k]||human10(k);

  async function detail10(params){
    const q=new URLSearchParams({gw:String(state.gw),...params});
    const r=await fetch(`${DETAIL_API}?${q}`,{cache:'no-store'}),j=await r.json();
    if(!r.ok||!j?.ok)throw new Error(j?.error||`HTTP ${r.status}`);
    return j;
  }

  function normalizeScore(v){return String(v||'').trim().replaceAll('–','-').replace(/\s+/g,'')}
  function fixturePredictedMeta(f){
    const ff=fixtureFpl(f.match_id),rows=ff?.prediction?.top_scorelines||[];
    const score=modelScore(ff),p=num(rows?.[0]?.prob??rows?.[0]?.probability);
    const p2=num(rows?.[1]?.prob??rows?.[1]?.probability);
    return {score,p,close:p!=null&&p2!=null&&Math.abs(p-p2)<.02};
  }
  function fixtureActual(f){
    return f?.finished&&f.home_score!=null&&f.away_score!=null?`${f.home_score}-${f.away_score}`:'—';
  }
  function scoreHit(f,pred,actual){
    return !!f?.finished&&pred!=='—'&&actual!=='—'&&normalizeScore(pred)===normalizeScore(actual);
  }
  function teamLink10(t,away=false){
    const id=Number(t?.id||0);
    if(id)return `<button class="fixture-team-link ${away?'away':''}" data-team="${id}"><strong>${esc(t.short_name||t.name||'—')}</strong><span>${esc(t.name||'—')}</span></button>`;
    return `<div class="team-block ${away?'away':''}"><strong>${esc(t?.short_name||t?.name||'—')}</strong><span>${esc(t?.name||'—')}</span></div>`;
  }
  function signalTeamName10(s,f){
    const tid=Number(s?.team_id||0);
    if(tid&&tid===Number(f?.home_team?.id))return f.home_team.short_name||f.home_team.name;
    if(tid&&tid===Number(f?.away_team?.id))return f.away_team.short_name||f.away_team.name;
    return null;
  }

  renderFixtureCard=function(f){
    const [status,cls]=matchStatus(f);
    const pm=fixturePredictedMeta(f),pred=pm.score,actual=fixtureActual(f),hit=scoreHit(f,pred,actual);
    const sigs=[strongSignal(f.home_team),strongSignal(f.away_team)].filter(Boolean);
    return `<article class="fixture-card" data-fixture="${f.match_id}">
      <div class="fixture-top"><span class="fixture-time">${dateOnly(f.kickoff_time)} · ${timeOnly(f.kickoff_time)}</span><span class="badge ${cls}">${status}</span></div>
      <div class="fixture-teams">
        ${teamLink10(f.home_team)}
        <div class="fixture-score-pair">
          <div class="fixture-score-line predicted"><span>Predicted${pm.p!=null?` · ${pc10(pm.p,1)}`:''}</span><strong>${esc(pred)}</strong>${pm.close?'<small class="score-edge-note">tight top-score race</small>':''}</div>
          <div class="fixture-score-line actual ${hit?'exact-hit':''}"><span>Actual</span><strong>${esc(actual)}${hit?'<i class="fixture-hit-mark" aria-label="Correct prediction">✓</i>':''}</strong></div>
        </div>
        ${teamLink10(f.away_team,true)}
      </div>
      ${sigs.length?`<div class="signal-strip">${sigs.map(s=>{const side=signalTeamName10(s,f);return `<span class="signal-chip ${directionClass(s)}">${side?`${esc(side)} · `:''}${esc(shortSignal(s.signal_key))}: ${esc(human10(s.direction))}</span>`}).join('')}</div>`:''}
    </article>`;
  };

  function signalPriority10(s){
    const d=String(s?.direction||'').toUpperCase();
    if(d.includes('MATERIAL_DISRUPTION')||d.includes('ATTACK_ADVANTAGE')||d==='TRANSITION_OPPORTUNITY')return 5;
    if(d.includes('MODERATE_DISRUPTION')||d.includes('ATTACK_LEAN')||d.includes('DEFENSIVE_RESISTANCE')||d.includes('MODERATE_TRANSITION'))return 4;
    if(d.includes('LOW_DISRUPTION')||d.includes('LOW_TRANSITION'))return 2;
    if(d==='BALANCED')return 1;
    return 0;
  }
  function signalImpact10(s,teamName,oppName){
    const d=String(s?.direction||'').toUpperCase();
    if(d==='MATERIAL_DISRUPTION')return {state:'Material disruption',impact:`Negative: ${teamName} · Relative benefit: ${oppName}`};
    if(d==='MODERATE_DISRUPTION')return {state:'Moderate disruption',impact:`Negative: ${teamName} · Relative benefit: ${oppName}`};
    if(d==='LOW_DISRUPTION')return {state:'Low disruption',impact:`Personnel continuity broadly stable for ${teamName}`};
    if(d==='NO_MATERIAL_TARGET_IDENTIFIED')return {state:'No material disruption resolved',impact:`No clear personnel penalty for ${teamName}`};
    if(d==='ATTACK_ADVANTAGE')return {state:'Attack advantage',impact:`Advantage: ${teamName}`};
    if(d==='ATTACK_LEAN')return {state:'Attack lean',impact:`Lean: ${teamName}`};
    if(d==='DEFENSIVE_RESISTANCE')return {state:'Defensive resistance',impact:`Favors ${oppName} against ${teamName}'s attacking route`};
    if(d==='TRANSITION_OPPORTUNITY')return {state:'Transition opportunity',impact:`Opportunity: ${teamName}`};
    if(d==='MODERATE_TRANSITION_OPPORTUNITY')return {state:'Moderate transition opportunity',impact:`Moderate opportunity: ${teamName}`};
    if(d==='LOW_TRANSITION_OPPORTUNITY')return {state:'Low transition opportunity',impact:`Limited transition edge for ${teamName}`};
    if(d==='BALANCED')return {state:'Balanced',impact:'Neither side has a material edge on this signal'};
    if(d==='INSUFFICIENT_DATA')return {state:'Unresolved',impact:'Insufficient evidence for a directional call'};
    return {state:human10(d||'Unresolved'),impact:`Perspective: ${teamName}`};
  }
  function contextSignals10(signals=[],home,away,contextTeamId=null){
    const hId=Number(home?.id||0),aId=Number(away?.id||0);
    const nameFor=id=>Number(id)===hId?(home?.name||'Home'):Number(id)===aId?(away?.name||'Away'):'Team';
    const oppFor=id=>Number(id)===hId?(away?.name||'Away'):Number(id)===aId?(home?.name||'Home'):'Opponent';
    let rows=(signals||[]).filter(s=>num(s?.score)!=null&&num(s?.confidence)!=null);

    // In fixture view, collapse duplicated BALANCED tactical observations into one fixture-level row.
    if(!contextTeamId){
      const seenBalanced=new Set();
      rows=rows.filter(s=>{
        if(String(s.direction||'').toUpperCase()!=='BALANCED')return true;
        const k=String(s.signal_key||'');
        if(seenBalanced.has(k))return false;
        seenBalanced.add(k);return true;
      });
    }
    rows.sort((a,b)=>signalPriority10(b)-signalPriority10(a)||Number(b.confidence)-Number(a.confidence));
    const useful=rows.slice(0,4);
    if(!useful.length)return '<div class="intel-empty">No material tactical matchup signal is currently resolved.</div>';

    return `<div class="intel-context-signals">${useful.map(s=>{
      const tid=Number(s.team_id||contextTeamId||0),teamName=nameFor(tid),oppName=oppFor(tid);
      const x=signalImpact10(s,teamName,oppName);
      const balanced=String(s.direction||'').toUpperCase()==='BALANCED';
      const title=balanced?signalLabel10(s.signal_key):`${teamName} · ${signalLabel10(s.signal_key)}`;
      return `<div class="intel-context-signal ${balanced?'balanced':''}">
        <div class="intel-context-copy"><strong>${esc(title)}</strong><span>${esc(x.state)}</span><small>${esc(x.impact)}</small></div>
        <div class="intel-context-confidence"><b>${pc10(s.confidence)}</b><span>evidence confidence</span></div>
      </div>`;
    }).join('')}</div>`;
  }
  function replaceMatchup10(root,html){
    if(!root)return;
    const sections=[...root.querySelectorAll('.drawer-section')];
    const section=sections.find(x=>/tactical matchup evidence|next-match matchup|^matchup$/i.test(x.querySelector('h3')?.textContent?.trim()||''));
    const target=section?.querySelector('.intel-matchup');
    if(!target)return;
    const modelP=target.querySelector(':scope > p')?.outerHTML||'';
    const note=target.querySelector('.intel-note')?.outerHTML||'<div class="intel-note">Matchup signals are evidence context. Unvalidated tactical and personnel effects remain observational and do not silently alter the frozen forecast.</div>';
    target.innerHTML=`${modelP}${html}${note}`;
  }

  if(typeof priorOpenFixture==='function')window.openFixture=async function(id){
    await priorOpenFixture(id);
    try{
      const d=await detail10({match_id:String(id)});
      replaceMatchup10(document.querySelector('#drawerContent'),contextSignals10(d.signals||[],d.match?.home,d.match?.away,null));
    }catch(e){console.warn('C0153 fixture matchup context unavailable',e)}
  };

  if(typeof priorOpenTeam==='function')window.openTeam=async function(id){
    await priorOpenTeam(id);
    try{
      const d=await detail10({team_id:String(id)}),team=d.team||{},opp=d.fixture?.opponent||{};
      const home=d.fixture?.venue==='H'?team:opp,away=d.fixture?.venue==='H'?opp:team;
      replaceMatchup10(document.querySelector('#drawerContent'),contextSignals10(d.matchup_signals||[],home,away,Number(team.id)));
    }catch(e){console.warn('C0153 team matchup context unavailable',e)}
  };

  if(typeof priorOpenPlayer==='function')window.openPlayer=async function(id){
    await priorOpenPlayer(id);
    try{
      const d=await detail10({player_id:String(id)}),p=d.player||{},opp=d.fixture?.opponent||{};
      const team={id:p.team_id,name:p.team},home=d.fixture?.venue==='H'?team:opp,away=d.fixture?.venue==='H'?opp:team;
      replaceMatchup10(document.querySelector('#drawerContent'),contextSignals10(d.matchup_signals||[],home,away,Number(p.team_id)));
    }catch(e){console.warn('C0153 player matchup context unavailable',e)}
  };
})();