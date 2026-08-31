(function(){
  // C0146 — human-first team, player and fixture intelligence. Presentation only.
  const DETAIL_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/intelligence-detail-api';
  const priorFixtureCard=renderFixtureCard;

  const humanRole=v=>String(v||'Role unresolved').replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());
  const pc=(v,d=0)=>num(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`;
  const f2=(v,d=2)=>num(v)==null?'—':Number(v).toFixed(d);
  const tone=v=>String(v||'').toUpperCase()==='STRONG'?'positive':String(v||'').toUpperCase()==='WEAK'?'negative':'';
  const signalLabel=k=>({wide_channel_pressure:'wide-channel matchup',aerial_set_piece_mismatch:'aerial / set-piece matchup',central_creation_vs_block:'central creation vs block',direct_transition_opportunity:'transition opportunity',personnel_disruption:'personnel continuity'})[k]||String(k||'').replaceAll('_',' ');

  async function detail(params){
    const q=new URLSearchParams({gw:String(state.gw),...params});
    const r=await fetch(`${DETAIL_API}?${q}`,{cache:'no-store'}),j=await r.json();
    if(!r.ok||!j?.ok)throw new Error(j?.error||`HTTP ${r.status}`);return j;
  }
  function drawerLoading(title='Loading intelligence'){
    $('drawerContent').innerHTML=`<div class="drawer-kicker">GW${state.gw} intelligence</div><h2 class="drawer-title">${esc(title)}</h2><div class="modal-loading"><div class="loader"></div><span>Building the human-readable evidence view…</span></div>`;openDrawer();
  }
  function tags(items,empty='No strong signal yet'){
    return items?.length?`<div class="intel-tags">${items.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:`<span class="intel-muted">${esc(empty)}</span>`;
  }
  function ratingGrid(r={}){
    const rows=[['Attack',r.attack],['Defence',r.defence],['Control',r.control],['Possession',r.possession],['Set pieces',r.set_piece],['Width',r.width],['Box occupation',r.box_occupation]];
    return `<div class="intel-rating-grid">${rows.map(([k,v])=>`<div><span>${esc(k)}</span><b class="${tone(v)}">${esc(v||'Unresolved')}</b></div>`).join('')}</div>`;
  }
  function formLine(x){
    return `<div class="intel-form-row"><b class="result-pill ${x.result==='W'?'positive':x.result==='L'?'negative':''}">${esc(x.result)}</b><div><strong>${esc(x.venue)} vs ${esc(x.opponent||'—')}</strong><small>GW${x.gameweek}${num(x.xg_for)!=null?` · xG ${f2(x.xg_for)}–${f2(x.xg_against)}`:''}</small></div><span>${x.goals_for}–${x.goals_against}</span></div>`;
  }
  function absenceImpact(a){
    const imp=Number(a.importance||0),level=imp>=.72?'Major':imp>=.50?'Material':'Squad';
    const sets=[];if(Number(a.penalties_order)===1)sets.push('pens');if(Number(a.direct_freekicks_order)===1)sets.push('free-kicks');if(Number(a.corners_order)===1)sets.push('corners');
    const role=a.primary_role&&a.primary_role!=='UNRESOLVED'?humanRole(a.primary_role):a.secondary_role?humanRole(a.secondary_role):a.position||'role unresolved';
    return {level,role,sets:sets.join(' + ')};
  }
  function absenceRows(rows=[]){
    if(!rows.length)return '<div class="intel-empty">No meaningful current absence flagged for this fixture.</div>';
    return `<div class="intel-absence-list">${rows.slice(0,6).map(a=>{const x=absenceImpact(a);return `<div class="intel-absence-row"><div><strong>${esc(a.name||'—')}</strong><small>${esc(x.role)} · ${esc(String(a.availability_status||'').toLowerCase())}${num(a.chance_of_playing)!=null?` · ${pc(a.chance_of_playing)} chance`:''}</small></div><span class="impact ${x.level.toLowerCase()}">${x.level}</span><p>${esc(a.news||'Availability concern')}${x.sets?` · Set pieces: ${esc(x.sets)}`:''}</p></div>`}).join('')}</div>`;
  }
  function teamSummary(d){
    const r=d.profile?.ratings||{},t=d.form?.totals||{},strength=d.profile?.strengths||[],weak=d.profile?.weaknesses||[];
    const record=t.played?`${t.w}W ${t.d}D ${t.l}L, ${t.gf} scored and ${t.ga} conceded`: 'No completed Premier League matches in this chronology window';
    const core=[];if(r.attack!=='UNRESOLVED')core.push(`${String(r.attack).toLowerCase()} attacking profile`);if(r.defence!=='UNRESOLVED')core.push(`${String(r.defence).toLowerCase()} defensive profile`);
    return `${d.team.name}: ${record}. ${core.length?core.join(', ')+'.':''}${strength.length?` Main strengths: ${strength.join(', ')}.`:''}${weak.length?` Main weaknesses: ${weak.join(', ')}.`:''}`;
  }

  window.openTeam=async function(id){
    drawerLoading('Club intelligence');
    try{
      const d=await detail({team_id:String(id)}),t=d.form?.totals||{},f=d.fixture;
      $('drawerContent').innerHTML=`<div class="drawer-kicker">GW${state.gw} club intelligence</div><h2 class="drawer-title">${esc(d.team.name)}</h2><div class="drawer-sub">${f?`${f.venue==='H'?'Home':'Away'} vs ${esc(f.opponent?.name||'—')} · ${dateTime(f.kickoff_time)}`:'No current fixture'}</div>
        <div class="intel-story">${esc(teamSummary(d))}</div>
        <div class="drawer-section"><h3>Current profile</h3>${ratingGrid(d.profile?.ratings||{})}<div class="intel-split"><div><b>Strengths</b>${tags(d.profile?.strengths,'No strong profile signal')}</div><div><b>Weaknesses</b>${tags(d.profile?.weaknesses,'No weak profile signal')}</div></div><div class="intel-note">Strength/weakness labels combine blended team-performance state with observational tactical profiles. Recent W/D/L alone does not determine team strength.</div></div>
        <div class="drawer-section"><h3>Premier League form</h3><div class="intel-stat-strip"><div><span>Record</span><b>${t.played?`${t.w}-${t.d}-${t.l}`:'—'}</b></div><div><span>Goals</span><b>${t.gf??'—'}</b></div><div><span>Conceded</span><b>${t.ga??'—'}</b></div><div><span>Clean sheets</span><b>${t.cs??'—'}</b></div></div><div class="intel-form-list">${(d.form?.matches||[]).map(formLine).join('')||'<div class="intel-empty">No completed league matches yet.</div>'}</div></div>
        <div class="drawer-section"><h3>Important absences</h3>${absenceRows(d.absences||[])}</div>
        <div class="drawer-section"><h3>Next-match matchup</h3>${matchupBlock(d.matchup_signals||[],d.fixture_model,d.team.id,f?.opponent?.name)}</div>`;
    }catch(e){$('drawerContent').innerHTML=errorBlock('Club intelligence unavailable',e.message)}
  };

  function matchupBlock(signals=[],model=null,teamId=null,opponent='Opponent'){
    const useful=signals.filter(s=>num(s.score)!=null&&num(s.confidence)!=null).sort((a,b)=>Number(b.confidence)-Number(a.confidence)).slice(0,3);
    const lines=useful.map(s=>`<div class="intel-signal"><div><strong>${esc(signalLabel(s.signal_key))}</strong><small>${esc(String(s.direction||'').replaceAll('_',' ').toLowerCase())}</small></div><b>${pc(s.confidence)} conf.</b></div>`).join('');
    const modelLine=model?`Model goals: <strong>${f2(model.home_lambda)}–${f2(model.away_lambda)}</strong>. ${model.markets?.home_win!=null?`Home ${pc(model.markets.home_win)} · Draw ${pc(model.markets.draw)} · Away ${pc(model.markets.away_win)}.`:''}`:'Fixture model not available.';
    return `<div class="intel-matchup"><p>${modelLine}</p>${lines||'<div class="intel-empty">No material tactical matchup signal is currently resolved.</div>'}<div class="intel-note">Matchup signals are evidence context. Unvalidated tactical and personnel effects remain observational and do not silently alter the frozen forecast.</div></div>`;
  }
  function setPieceText(p){const s=[];if(Number(p.penalties_order)===1)s.push('Penalties');if(Number(p.direct_freekicks_order)===1)s.push('Direct free-kicks');if(Number(p.corners_order)===1)s.push('Corners');return s.join(' · ')||'No first-choice set-piece role captured'}
  function recentPlayerRows(rows=[]){
    if(!rows.length)return '<div class="intel-empty">No finalized recent player match data in this chronology window.</div>';
    return `<div class="intel-player-form">${rows.map(x=>`<div><span>GW${x.gameweek}</span><b>${x.total_points} pts</b><small>${x.minutes} min · xG ${f2(x.xg)} · xA ${f2(x.xa)} · ${x.goals||0}G ${x.assists||0}A</small></div>`).join('')}</div>`;
  }
  function playerStory(d){
    const p=d.player,pr=d.projection||{},role=d.fixture_role?.primary_role||d.role_profile?.primary_role||d.state?.role||null,av=d.availability;
    const bits=[`${p.name} is a ${p.position} for ${p.team}.`];
    if(role)bits.push(`Current role profile: ${humanRole(role)}.`);
    if(num(pr.expected_minutes)!=null)bits.push(`Projected for ${Number(pr.expected_minutes).toFixed(0)} minutes and ${f2(pr.expected_points,1)} FPL points in GW${state.gw}.`);
    if(av&&String(av.availability_status).toUpperCase()!=='AVAILABLE')bits.push(`Availability: ${String(av.availability_status).toLowerCase()} — ${av.news||'status flagged'}.`);
    return bits.join(' ');
  }

  openPlayer=async function(id){
    drawerLoading('Player intelligence');
    try{
      const d=await detail({player_id:String(id)}),p=d.player,pr=d.projection||{},s=d.state||{},season=d.season||{},fixture=d.fixture;
      $('drawerContent').innerHTML=`<div class="drawer-kicker">GW${state.gw} player intelligence</div><h2 class="drawer-title">${esc(p.name)}</h2><div class="drawer-sub"><button class="team-inline" data-team="${p.team_id}">${esc(p.team)}</button> · ${esc(p.position)}${num(p.price)!=null?` · £${Number(p.price).toFixed(1)}`:''}${num(p.ownership)!=null?` · ${Number(p.ownership).toFixed(1)}% owned`:''}</div>
        <div class="intel-story">${esc(playerStory(d))}</div>
        <div class="drawer-section"><h3>GW${state.gw} FPL profile</h3><div class="intel-stat-grid"><div><span>xPts</span><b>${f2(pr.expected_points)}</b></div><div><span>xMins</span><b>${f2(pr.expected_minutes,0)}</b></div><div><span>P(blank)</span><b>${pc(pr.p_blank)}</b></div><div><span>P(10+)</span><b>${pc(pr.p_10_plus)}</b></div><div><span>P(15+)</span><b>${pc(pr.p_15_plus)}</b></div><div><span>P(20+)</span><b>${pc(pr.p_20_plus)}</b></div><div><span>Goal</span><b>${pc(pr.p_goal)}</b></div><div><span>Assist</span><b>${pc(pr.p_assist)}</b></div></div><div class="intel-setpiece"><span>Set pieces</span><b>${esc(setPieceText(p))}</b></div></div>
        <div class="drawer-section"><h3>Role & underlying performance</h3><div class="intel-stat-grid"><div><span>xG/90</span><b>${f2(s.xg90)}</b></div><div><span>xA/90</span><b>${f2(s.xa90)}</b></div><div><span>xGI/90</span><b>${f2(s.xgi90)}</b></div><div><span>Shots in box/90</span><b>${f2(s.shots_box90)}</b></div><div><span>Big chances/90</span><b>${f2(s.big_chances90)}</b></div><div><span>DC probability</span><b>${pc(pr.p_dc)}</b></div></div><div class="intel-role-line"><span>Role</span><b>${esc(humanRole(d.fixture_role?.primary_role||d.role_profile?.primary_role||s.role))}</b></div></div>
        <div class="drawer-section"><h3>Season so far</h3><div class="intel-stat-strip"><div><span>Minutes</span><b>${season.minutes??0}</b></div><div><span>Points</span><b>${season.points??0}</b></div><div><span>Goals</span><b>${season.goals??0}</b></div><div><span>Assists</span><b>${season.assists??0}</b></div></div>${recentPlayerRows(d.recent||[])}</div>
        <div class="drawer-section"><h3>Matchup</h3><p class="intel-matchup-lead">${fixture?`${esc(p.name)} faces ${esc(fixture.opponent?.name||'—')} ${fixture.venue==='H'?'at home':'away'}.`: 'No current fixture.'}</p>${matchupBlock(d.matchup_signals||[],d.fixture_model,p.team_id,fixture?.opponent?.name)}</div>`;
    }catch(e){$('drawerContent').innerHTML=errorBlock('Player intelligence unavailable',e.message)}
  };

  function fixtureStory(d){
    const m=d.model||{},mk=m.markets||{},home=d.match?.home?.name||'Home',away=d.match?.away?.name||'Away',hp=num(mk.home_win),ap=num(mk.away_win),dp=num(mk.draw);
    if(hp==null||ap==null)return `${home} vs ${away}: model probabilities are not currently available.`;
    const fav=hp>=ap?home:away,prob=Math.max(hp,ap),hprof=d.home?.profile?.ratings||{},aprof=d.away?.profile?.ratings||{};
    const edge=hp>=ap?hprof.attack:aprof.attack,def=hp>=ap?hprof.defence:aprof.defence;
    return `${fav} are the model favourite at ${pc(prob)}. The fixture projects ${f2(m.home_lambda)}–${f2(m.away_lambda)} expected goals. ${fav}'s current profile rates ${String(edge||'unresolved').toLowerCase()} in attack and ${String(def||'unresolved').toLowerCase()} in defence. Draw probability is ${pc(dp)}.`;
  }
  function topFixturePlayers(rows=[]){
    return rows.length?`<div class="intel-top-players">${rows.map(x=>`<button data-player="${x.id}"><div><strong>${esc(x.name)}</strong><small>${esc(x.team)} · ${esc(x.position)} · ${f2(x.expected_minutes,0)} min</small></div><b>${f2(x.expected_points)} xPts</b></button>`).join('')}</div>`:'<div class="intel-empty">No player projections available.</div>';
  }

  openFixture=async function(id){
    drawerLoading('Matchup intelligence');
    try{
      const d=await detail({match_id:String(id)}),home=d.match?.home,away=d.match?.away,m=d.model||{},scores=Array.isArray(m.top_scorelines)?m.top_scorelines.slice(0,3):[];
      $('drawerContent').innerHTML=`<div class="drawer-kicker">GW${state.gw} matchup intelligence</div><h2 class="drawer-title"><button class="team-inline" data-team="${home?.id}">${esc(home?.name||'—')}</button> vs <button class="team-inline" data-team="${away?.id}">${esc(away?.name||'—')}</button></h2><div class="drawer-sub">${dateTime(d.match?.kickoff_time)}</div>
        <div class="intel-story">${esc(fixtureStory(d))}</div>
        <div class="drawer-section"><h3>Model view</h3><div class="intel-stat-grid"><div><span>Home win</span><b>${pc(m.markets?.home_win)}</b></div><div><span>Draw</span><b>${pc(m.markets?.draw)}</b></div><div><span>Away win</span><b>${pc(m.markets?.away_win)}</b></div><div><span>Over 2.5</span><b>${pc(m.markets?.over_2_5)}</b></div><div><span>BTTS</span><b>${pc(m.markets?.btts_yes)}</b></div><div><span>Model xG</span><b>${f2(m.home_lambda)}–${f2(m.away_lambda)}</b></div></div>${scores.length?`<div class="intel-scorelines">${scores.map(x=>`<span>${esc(x.score)} <b>${pc(x.prob??x.probability,1)}</b></span>`).join('')}</div>`:''}</div>
        <div class="drawer-section"><h3>Team comparison</h3><div class="intel-team-compare"><div><button class="team-inline" data-team="${home?.id}">${esc(home?.name||'Home')}</button>${ratingGrid(d.home?.profile?.ratings||{})}</div><div><button class="team-inline" data-team="${away?.id}">${esc(away?.name||'Away')}</button>${ratingGrid(d.away?.profile?.ratings||{})}</div></div></div>
        <div class="drawer-section"><h3>Key availability</h3><div class="intel-team-compare"><div><b>${esc(home?.name||'Home')}</b>${absenceRows(d.home?.absences||[])}</div><div><b>${esc(away?.name||'Away')}</b>${absenceRows(d.away?.absences||[])}</div></div></div>
        <div class="drawer-section"><h3>Tactical matchup evidence</h3>${matchupBlock(d.signals||[],d.model)}</div>
        <div class="drawer-section"><h3>FPL players most exposed to this match</h3>${topFixturePlayers(d.top_players||[])}</div>`;
    }catch(e){$('drawerContent').innerHTML=errorBlock('Matchup intelligence unavailable',e.message)}
  };

  renderFixtureCard=function(f){
    const [status,cls]=matchStatus(f),ff=fixtureFpl(f.match_id),sigs=[strongSignal(f.home_team),strongSignal(f.away_team)].filter(Boolean),centre=f.finished?actualScore(f):modelScore(ff),centreLabel=f.finished?'actual':ff?.prediction?'model top score':'pre-match';
    const hId=f.home_team?.id,aId=f.away_team?.id;
    const teamName=(t,id,away=false)=>id?`<button class="fixture-team-link ${away?'away':''}" data-team="${id}"><strong>${esc(t.short_name||t.name)}</strong><span>${esc(t.name)}</span></button>`:`<div class="team-block ${away?'away':''}"><strong>${esc(t.short_name||t.name)}</strong><span>${esc(t.name)}</span></div>`;
    return `<article class="fixture-card" data-fixture="${f.match_id}"><div class="fixture-top"><span class="fixture-time">${dateOnly(f.kickoff_time)} · ${timeOnly(f.kickoff_time)}</span><span class="badge ${cls}">${status}</span></div><div class="fixture-teams">${teamName(f.home_team,hId)}<div class="fixture-score"><strong>${esc(centre)}</strong><span>${centreLabel}</span></div>${teamName(f.away_team,aId,true)}</div>${sigs.length?`<div class="signal-strip">${sigs.map(s=>`<span class="signal-chip ${directionClass(s)}">${esc(shortSignal(s.signal_key))}: ${esc(s.direction)}</span>`).join('')}</div>`:''}</article>`;
  };

  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-team]');if(!t)return;
    e.preventDefault();e.stopImmediatePropagation();const id=Number(t.dataset.team);if(id)openTeam(id);
  },true);
})();
