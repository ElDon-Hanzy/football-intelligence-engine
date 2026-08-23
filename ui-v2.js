(function(){
  const PAGE_SIZE=20;
  const pages={performance:1};
  API.replay=`${ROOT}/research-replay-api`;
  state.replay=state.replay||null;

  const DIRECTION={
    ATTACK_ADVANTAGE:['Clear attacking edge','The attacking profile looks meaningfully stronger than the opponent’s resistance in this area.'],
    ATTACK_LEAN:['Slight attacking edge','There is a modest attacking advantage, but not enough evidence to call it a strong mismatch.'],
    BALANCED:['No clear matchup edge','Neither side has a meaningful advantage from the evidence we currently have.'],
    DEFENSIVE_LEAN:['Opponent offers some resistance','The opponent looks reasonably well equipped to limit this route of attack.'],
    DEFENSIVE_RESISTANCE:['Strong defensive resistance','The opponent’s profile looks particularly well suited to defending this type of attack.'],
    TRANSITION_OPPORTUNITY:['Good counter-attacking opportunity','The matchup could create useful chances when possession changes hands.'],
    MODERATE_TRANSITION_OPPORTUNITY:['Some counter-attacking opportunity','There may be space to attack after turnovers, but the signal is not strong.'],
    LOW_TRANSITION_OPPORTUNITY:['Limited counter-attacking opportunity','The matchup does not currently look especially favourable for attacks immediately after turnovers.'],
    MATERIAL_DISRUPTION:['Important absences may affect the team','Missing or doubtful players could materially change the expected lineup or reduce role continuity.'],
    MODERATE_DISRUPTION:['Some disruption from absences','Availability issues may alter parts of the lineup, although cover appears reasonably plausible.'],
    LOW_DISRUPTION:['Little disruption from absences','Current availability issues are unlikely to change the team structure significantly.'],
    NO_PREMATCH_AVAILABILITY_CAPTURE:['No reliable pre-match availability snapshot','We did not capture enough reliable availability information before kickoff to judge the effect of absences.'],
    NO_MATERIAL_TARGET_IDENTIFIED:['No major absence identified','No missing or doubtful player currently looks important enough to create a material lineup disruption.'],
    INSUFFICIENT_DATA:['Not enough pre-match evidence','There is not enough reliable pre-match information to make this comparison.']
  };
  const SIGNAL={
    wide_channel_pressure:['Wide attacking threat','Compares width, delivery and wide/creative player behaviour with the opponent’s ability to resist attacks in wide areas.'],
    aerial_set_piece_mismatch:['Aerial & set-piece matchup','Compares crossing, set-piece and aerial threat with the opponent’s aerial and defensive resistance.'],
    central_creation_vs_block:['Central creativity vs defensive shape','Compares possession, creativity and progression through central areas with the opponent’s defensive block.'],
    direct_transition_opportunity:['Counter-attacking opportunity','Looks for conditions that may create chances immediately after turnovers. It does not measure defensive line height or player speed.'],
    personnel_disruption:['Impact of absences','Estimates whether missing or doubtful players may disturb the expected lineup and whether plausible role cover exists. It is not a player-quality rating.']
  };
  const ROLES={
    GOALKEEPER:'Goalkeeper',CENTRE_BACK:'Centre-back',WIDE_BACK:'Attacking full-back / wing-back',HYBRID_DEFENDER:'Flexible defender',HOLDING_MIDFIELDER:'Defensive midfielder',BOX_TO_BOX:'Box-to-box midfielder',CREATOR_10:'Creative midfielder',WIDE_ATTACKER:'Wide attacker',WING_BACK:'Wing-back',CENTRAL_STRIKER:'Central striker',LINK_FORWARD:'Link-up forward',WIDE_FORWARD:'Wide forward',TARGET_FORWARD:'Target forward',UNRESOLVED:'Role still uncertain'
  };
  const STYLES={POSSESSION_CONTROL:'Possession-focused',DIRECT_TRANSITION:'Direct / transition-focused',WIDE_DELIVERY:'Wide delivery',HIGH_BOX_OCCUPATION:'Gets plenty of players and touches into the box',SET_PIECE_EMPHASIS:'Set-piece emphasis',DEEP_DEFENSIVE_BLOCK:'Deeper defensive shape',BALANCED:'Balanced'};
  const REPLACEMENT={PROXY_NOT_VALIDATED:'Early research estimate',ROLE_FIT_ONLY:'Role match only',INSUFFICIENT_ROLE_EVIDENCE:'Not enough role evidence',NO_RELIABLE_MATCH:'No reliable replacement match'};
  const MARKET_STATUS={ROBUST_POSITIVE_EV:'Strong model/market disagreement — research only',UNVALIDATED:'Research only — not yet validated'};

  function humanDirection(code){return DIRECTION[String(code||'')]?.[0]||String(code||'').replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase())||'Not enough evidence'}
  function directionExplanation(code){return DIRECTION[String(code||'')]?.[1]||'This is an observational research signal and does not change the active model yet.'}
  function humanRole(code){return ROLES[String(code||'')]||String(code||'').replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase())}
  function humanStyle(code){return STYLES[String(code||'')]||String(code||'').replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase())}
  function signalLabel(key){return SIGNAL[String(key||'')]?.[0]||String(key||'').replaceAll('_',' ')}
  function signalExplanation(key,code){return `${SIGNAL[String(key||'')]?.[1]||'Observational fixture context.'} ${directionExplanation(code)}`}
  function humanOutcome(code){return code==='HOME'?'Home win':code==='AWAY'?'Away win':code==='DRAW'?'Draw':'—'}

  function humanizeSignal(s){
    if(!s)return s;
    if(!s.direction_code){s.direction_code=s.direction;s.direction=humanDirection(s.direction_code);}
    s.human_explanation=signalExplanation(s.signal_key,s.direction_code);
    return s;
  }
  function humanizeState(){
    for(const f of state.fixtures?.fixtures||[]){
      for(const side of [f.home_team,f.away_team]){
        for(const s of side?.matchup_signals||[])humanizeSignal(s);
        const t=side?.tactical_profile;if(t&&!t.style_code){t.style_code=t.style_label;t.style_label=humanStyle(t.style_code);}
        for(const p of side?.expected_xi||[]){if(p.role){if(!p.role.primary_code){p.role.primary_code=p.role.primary;p.role.primary=humanRole(p.role.primary_code);}if(p.role.secondary&&!p.role.secondary_code){p.role.secondary_code=p.role.secondary;p.role.secondary=humanRole(p.role.secondary_code);}}}
        for(const r of side?.replacement_research||[]){if(!r.quality_status_code){r.quality_status_code=r.quality_status;r.quality_status=REPLACEMENT[r.quality_status_code]||humanRole(r.quality_status_code);}}
      }
    }
    for(const f of state.market?.fixtures||[]){for(const e of f.edge_research?.top_robust_positive_ev||[]){if(!e.research_status_code){e.research_status_code=e.research_status;e.research_status=MARKET_STATUS[e.research_status_code]||e.research_status;}}}
    for(const f of state.replay?.fixtures||[]){for(const s of [...(f.signals?.home||[]),...(f.signals?.away||[])])humanizeSignal(s);}
  }

  directionClass=function(s){const d=String(s?.direction_code||s?.direction||'');if(d==='LOW_DISRUPTION'||d==='NO_MATERIAL_TARGET_IDENTIFIED')return '';if(d.includes('DISRUPTION'))return 'risk';if(d.includes('ADVANTAGE'))return 'advantage';if(d.includes('LEAN')||d.includes('MODERATE'))return 'lean';return ''};
  shortSignal=function(k){return signalLabel(k)};
  signalSalience=function(s){
    const v=num(s?.score);if(v==null)return -1;const type=String(s?.score_type||'');
    if(type==='ADVANTAGE')return Math.abs(v-.5)*2;
    if(type==='DISRUPTION')return v>=.18?.30+v*.45:.04;
    if(type==='OPPORTUNITY')return v>=.55?.18+(v-.55)*.60:.02;
    return 0;
  };
  strongSignal=function(side){return (side?.matchup_signals||[]).filter(s=>num(s.score)!=null).sort((a,b)=>signalSalience(b)-signalSalience(a))[0]||null};

  const _render=render;
  render=function(){humanizeState();return _render();};

  const _renderHome=renderHome;
  renderHome=function(){
    return _renderHome()
      .replaceAll('value_edge_available is false','The market layer is research-only; no live betting recommendation is enabled')
      .replaceAll('value_edge_available is true','A live betting recommendation layer is enabled')
      .replaceAll('Research edge signals','Market disagreements')
      .replaceAll('Consensus research available','Bookmaker-margin adjusted research available');
  };

  const _renderFixtures=renderFixtures;
  renderFixtures=function(){return _renderFixtures().replaceAll('model_effect_enabled = false','Research only — does not change the active model').replaceAll('Fixture intelligence v0.1','Pre-match match intelligence')};

  const _renderMarket=renderMarket;
  renderMarket=function(){return _renderMarket()
    .replaceAll('value_edge_available = false','No live betting recommendations yet')
    .replaceAll('value_edge_available = true','Live betting recommendations enabled')
    .replaceAll('Robust +EV research','Strong model/market disagreements')
    .replaceAll('Positive price CLV','Positive closing-line movement')
    .replaceAll('CLV research','Closing-line analysis')
    .replaceAll('De-vig consensus research','Bookmaker-margin adjusted comparison')
    .replaceAll('Latest valid pre-kickoff bookmaker state only','Only bookmaker prices captured before kickoff are used');};

  function pitchPlayer(p,cap,vice){return `<button class="pitch-player" data-player="${p.id}"><strong>${esc(p.name)}</strong><span>${fmt(p.expected_points)} expected pts</span>${Number(p.id)===Number(cap?.id)?'<i>C</i>':Number(p.id)===Number(vice?.id)?'<i>VC</i>':''}</button>`}
  function pitchRow(players,cap,vice){return `<div class="pitch-row">${players.map(p=>pitchPlayer(p,cap,vice)).join('')}</div>`}
  function pitch(xi,cap,vice){const group=pos=>xi.filter(p=>p.position===pos);return `<div class="pitch-wrap"><div class="pitch-note"><strong>Your starting XI on a football pitch</strong><span>Positional FPL layout only — this is not a prediction of the team’s real tactical formation.</span></div><div class="football-pitch"><div class="pitch-mark half"></div><div class="pitch-mark centre"></div><div class="pitch-mark box top"></div><div class="pitch-mark box bottom"></div>${pitchRow(group('FWD'),cap,vice)}${pitchRow(group('MID'),cap,vice)}${pitchRow(group('DEF'),cap,vice)}${pitchRow(group('GKP'),cap,vice)}</div></div>`}

  renderFpl=function(){
    const d=state.fpl;if(!d)return errorBlock('FPL data unavailable',state.errors.fpl);const squad=d.squad||[];const xi=(d.decision?.starting_xi||[]).map(idOf).map(findPlayer).filter(Boolean);const bench=(d.decision?.bench||[]).map(idOf).map(findPlayer).filter(Boolean);const cap=findPlayer(d.decision?.captain_player_id),vice=findPlayer(d.decision?.vice_player_id);const xiPts=xi.reduce((z,p)=>z+(num(p.expected_points)||0),0),squadPts=squad.reduce((z,p)=>z+(num(p.expected_points)||0),0);const top=[...(d.top_double_digit||[])].slice(0,8);
    return `<div class="hero"><div class="hero-panel"><div class="hero-kicker">Frozen gameweek decision</div><h2>${esc(cap?.name||'Captain pending')} leads the GW${state.gw} squad.</h2><p>This is the decision state that existed before the gameweek. Later results never rewrite these expectations.</p><div class="hero-meta"><span class="chip green">Captain ${esc(cap?.name||'—')}</span><span class="chip">Vice ${esc(vice?.name||'—')}</span><span class="chip blue">${esc(d.model_version||'—')}</span></div></div><div class="hero-side">${stat('Starting XI expected points',fmt(xiPts),'Frozen XI expectation')}${stat('15-man expected points',fmt(squadPts),'Full squad expectation')}</div></div><div class="squad-summary">${stat('Captain chance of 10+ pts',pct(cap?.p_10_plus),cap?`${fmt(cap.expected_minutes,0)} expected minutes`:'—')}${stat('Captain chance of 15+ pts',pct(cap?.p_15_plus),'High-haul probability')}${stat('Squad size',String(squad.length),'Full 15-man squad')}${stat('Prediction run',String(d.prediction_run_id||'—'),dateTime(d.generated_at))}</div><div class="section">${sectionHead('Starting XI','Pitch view of the frozen FPL selection')}${pitch(xi,cap,vice)}</div><div class="section"><div class="two-col"><div><div class="section-head"><div class="section-title"><h2>Starting XI list</h2><p>Expected points and haul probability</p></div></div><div class="panel"><div class="lineup-grid">${xi.map(p=>`<div class="lineup-card" data-player="${p.id}"><strong>${esc(p.name)}</strong><span>${esc(p.position)} · ${fmt(p.expected_points)} expected pts</span><span class="role">${pct(p.p_10_plus)} chance of 10+</span></div>`).join('')}</div></div></div><div><div class="section-head"><div class="section-title"><h2>Bench</h2><p>Frozen bench order</p></div></div><div class="panel"><div class="lineup-grid">${bench.map((p,i)=>`<div class="lineup-card" data-player="${p.id}"><strong>${i+1}. ${esc(p.name)}</strong><span>${esc(p.position)} · ${fmt(p.expected_points)} expected pts</span><span class="role">${fmt(p.expected_minutes,0)} expected minutes</span></div>`).join('')||'<div class="empty-state">Bench not available.</div>'}</div></div></div></div></div><div class="section">${sectionHead('Best chance of a big score','Players ranked by the chance of scoring 10+ points')}<div class="player-list">${playerRow(null,true)}${top.map(playerRow).join('')}</div></div><div class="section">${sectionHead('Full squad','All 15 frozen player projections')}<div class="player-list">${playerRow(null,true)}${squad.map(playerRow).join('')}</div></div>`;
  };

  function oddsForActual(f){const a=f?.actual_result_pre_match_odds;if(!a)return '';if(!a.available)return `<div class="empty-state">No correct-score price for the eventual ${esc(a.selection)} result was captured before kickoff.</div>`;return `<div class="panel">${(a.prices||[]).map(x=>metric(`${x.bookmaker} · ${a.selection}`,`${fmt(x.pre_match_decimal_odds)} odds · ${pct(x.pre_match_implied_probability)} implied chance`)).join('')}</div><div class="research-note">These are the latest valid prices we actually captured before kickoff. “Closing” here is only our closest captured pre-match proxy, not a claim that it was the bookmaker’s final price.</div>`}
  const _openFixture=openFixture;
  openFixture=function(id){_openFixture(id);humanizeState();const mk=fixtureMarket(id),fi=fixtureIntel(id);const sides=[fi?.home_team,fi?.away_team].filter(Boolean);let extra='';const actual=mk?.actual_result_pre_match_odds;if(actual)extra+=`<div class="drawer-section"><h3>What bookmakers priced the actual score at before kickoff</h3>${oddsForActual(mk)}</div>`;const sigs=sides.flatMap(s=>(s?.matchup_signals||[]).filter(x=>x.score!=null));if(sigs.length)extra+=`<div class="drawer-section"><h3>What the matchup signals mean</h3><div class="panel">${sigs.map(s=>`<div class="explain-row"><strong>${esc(signalLabel(s.signal_key))}</strong><span>${esc(s.direction)}</span><p>${esc(s.human_explanation)}</p></div>`).join('')}</div></div>`;$('drawerContent').insertAdjacentHTML('beforeend',extra)};

  function pager(key,page,total){const pagesN=Math.ceil(total/PAGE_SIZE);if(pagesN<=1)return '';return `<div class="pager-v2"><button data-page-key="${key}" data-page-go="${page-1}" ${page<=1?'disabled':''}>Previous</button><span>${(page-1)*PAGE_SIZE+1}–${Math.min(total,page*PAGE_SIZE)} of ${total}</span><button data-page-key="${key}" data-page-go="${page+1}" ${page>=pagesN?'disabled':''}>Next</button></div>`}
  function actualOddsRows(){const fs=(state.market?.fixtures||[]).filter(f=>f.finished);return fs.map(f=>{const a=f.actual_result_pre_match_odds;const best=a?.available?[...(a.prices||[])].sort((x,y)=>Number(y.pre_match_decimal_odds)-Number(x.pre_match_decimal_odds))[0]:null;return `<tr class="rowclick" data-fixture="${f.match_id}"><td>${esc(f.home_short||f.home_team)} – ${esc(f.away_short||f.away_team)}</td><td>${esc(a?.selection||`${f.home_score}-${f.away_score}`)}</td><td>${best?`${fmt(best.pre_match_decimal_odds)} (${esc(best.bookmaker)})`:'Not captured'}</td><td>${best?pct(best.pre_match_implied_probability):'—'}</td></tr>`}).join('')}
  function replaySection(){const r=state.replay;if(!r?.available)return `<div class="section">${sectionHead('Blind gameweek replay','Retrospective calibration layer')}<div class="empty-state">Blind replay data is not available for this gameweek.</div></div>`;const all=r.fixtures||[],evaluated=all.filter(f=>f.evaluation),withBase=evaluated.filter(f=>f.base_prediction_available),outcomeHits=withBase.filter(f=>f.evaluation?.predicted_outcome_hit).length,exactHits=withBase.filter(f=>f.evaluation?.top_scoreline_hit).length;const worst=[...withBase].filter(f=>num(f.evaluation?.brier_1x2)!=null).sort((a,b)=>Number(b.evaluation.brier_1x2)-Number(a.evaluation.brier_1x2))[0];const homeMiss=[...withBase].filter(f=>num(f.evaluation?.home_goal_error)!=null).sort((a,b)=>Number(b.evaluation.home_goal_error)-Number(a.evaluation.home_goal_error))[0];const totalOver=[...withBase].filter(f=>num(f.evaluation?.total_goal_error)!=null).sort((a,b)=>Number(a.evaluation.total_goal_error)-Number(b.evaluation.total_goal_error))[0];return `<div class="section">${sectionHead('Blind GW1 replay','Results were hidden while the replay was generated; results were joined only afterward for scoring')}<div class="research-note"><strong>Retrospective blind research — not forward validation.</strong><br>The replay re-created the current context engine for all ${all.length} GW1 fixtures using only evidence that was available before each kickoff. It did not use the score or any GW1 match events while generating the replay. Where no genuine pre-kickoff base forecast had been saved, the system leaves the base forecast blank rather than inventing one.</div><div class="performance-hero">${stat('Fixtures replayed',String(all.length),'All GW1 fixtures')}${stat('Finished fixtures scored',String(evaluated.length),'Evaluation happens after generation')}${stat('True base forecasts available',String(withBase.length),'Historical forecast snapshot existed pre-kickoff')}${stat('Result direction correct',`${outcomeHits}/${withBase.length||'—'}`,`${exactHits}/${withBase.length||'—'} exact top-score hits`)}</div><div class="section"><div class="three-col"><div class="insight-card"><div class="insight-icon amber">1</div><div><strong>Weakest result-direction call</strong><p>${worst?`${esc(worst.home_team.name)} vs ${esc(worst.away_team.name)} had the largest result-probability error. The replay leaned ${humanOutcome(worst.evaluation.predicted_outcome)}; the actual result was ${esc(worst.actual_score)}.`:'Not enough evaluated forecasts.'}</p></div></div><div class="insight-card"><div class="insight-icon amber">2</div><div><strong>Biggest attacking underestimate</strong><p>${homeMiss?`${esc(homeMiss.home_team.name)} scored ${homeMiss.actual_score.split('-')[0]} after the model expected ${fmt(Number(homeMiss.actual_score.split('-')[0])-Number(homeMiss.evaluation.home_goal_error))} home goals.`:'Not enough evaluated forecasts.'}</p></div></div><div class="insight-card"><div class="insight-icon amber">3</div><div><strong>Signal-ranking issue found</strong><p>The counter-attacking opportunity score appeared too often as the headline signal. It has different meaning from a true matchup edge, so the UI now stops ranking the two on the same scale.</p></div></div></div></div><div class="section">${sectionHead('Replay by fixture','Base forecasts remain blank where no genuine pre-kickoff snapshot exists')}<div class="fixture-grid">${all.map(f=>{const e=f.evaluation,hs=strongSignal({matchup_signals:f.signals?.home||[]}),as=strongSignal({matchup_signals:f.signals?.away||[]});return `<article class="fixture-card"><div class="fixture-top"><span class="fixture-time">${dateOnly(f.kickoff_time)}</span><span class="badge ${f.base_prediction_available?'future':'frozen'}">${f.base_prediction_available?'Base forecast preserved':'No saved base forecast'}</span></div><div class="fixture-teams"><div class="team-block"><strong>${esc(f.home_team.short_name||f.home_team.name)}</strong></div><div class="fixture-score"><strong>${esc(f.actual_score||'Pending')}</strong><span>${f.finished?'actual score':'not played'}</span></div><div class="team-block away"><strong>${esc(f.away_team.short_name||f.away_team.name)}</strong></div></div>${e&&f.base_prediction_available?`<div class="signal-strip"><span class="signal-chip">Model result lean: ${humanOutcome(e.predicted_outcome)}</span><span class="signal-chip">Top score: ${esc(e.top_scoreline||'—')}</span><span class="signal-chip">Actual-score chance: ${pct(e.actual_score_probability)}</span></div>`:''}${[hs,as].filter(Boolean).length?`<div class="signal-strip">${[hs,as].filter(Boolean).map(s=>`<span class="signal-chip ${directionClass(s)}">${esc(signalLabel(s.signal_key))}: ${esc(s.direction)}</span>`).join('')}</div>`:''}</article>`}).join('')}</div></div></div>`}

  renderPerformance=function(){const d=state.fpl;if(!d)return errorBlock('Performance data unavailable',state.errors.fpl);const rows=(d.all_predictions||[]).filter(x=>x.actual);const finished=(d.fixture_results||[]).filter(x=>x.finished);const exact=finished.filter(f=>f.prediction?.top_scoreline&&f.home_score!=null&&f.away_score!=null&&f.prediction.top_scoreline===`${f.home_score}-${f.away_score}`).length;const ok=rows.filter(acceptable).length,mae=rows.length?rows.reduce((z,x)=>z+Math.abs(actualError(x)),0)/rows.length:null,meanErr=rows.length?rows.reduce((z,x)=>z+actualError(x),0)/rows.length:null,rate=rows.length?ok/rows.length:null;const sorted=[...rows].sort((a,b)=>Math.abs(actualError(b))-Math.abs(actualError(a)));const totalPages=Math.max(1,Math.ceil(sorted.length/PAGE_SIZE));pages.performance=Math.min(Math.max(1,pages.performance),totalPages);const shown=sorted.slice((pages.performance-1)*PAGE_SIZE,pages.performance*PAGE_SIZE);return `<div class="hero"><div class="hero-panel"><div class="hero-kicker">Frozen forecast audit</div><h2>Judge the model against what it knew before kickoff.</h2><p>Historical forecasts remain untouched. Actual results are used only for evaluation, never to rewrite the prediction that existed before the match.</p><div class="hero-meta"><span class="chip green">${rows.length} players with valid results</span><span class="chip">Historical predictions preserved</span></div></div><div class="hero-side">${stat('Within decision tolerance',rate==null?'—':pct(rate),`${ok}/${rows.length} audited players`)}${stat('Mean absolute error',fmt(mae),'Points per audited player')}</div></div><div class="performance-hero">${stat('Average forecast bias',signed(meanErr),meanErr!=null?(meanErr>0?'Players scored above expectation on average':'Players scored below expectation on average'):'No results')}${stat('Exact top-score hits',`${exact}/${finished.length||'—'}`,'Original fixture model')}${stat('Audited players',String(rows.length),'Only valid frozen forecasts')}${stat('Gameweek',`GW${state.gw}`,'Current audit')}</div><div class="section">${sectionHead('Player forecast audit',`20 players per page · sorted by largest absolute miss`)}<div class="table-shell"><table class="data-table"><thead><tr><th>Player</th><th>Team</th><th>Expected pts</th><th>Actual</th><th>Error</th><th>Expected min</th></tr></thead><tbody>${shown.map(p=>`<tr class="rowclick" data-player="${p.id}"><td>${esc(p.name)}</td><td>${esc(p.team||'—')}</td><td>${fmt(p.expected_points)}</td><td>${p.actual?.total_points??'—'}</td><td class="${actualError(p)>=0?'positive':'negative'}">${signed(actualError(p))}</td><td>${fmt(p.expected_minutes,0)}</td></tr>`).join('')}</tbody></table></div>${pager('performance',pages.performance,sorted.length)}</div><div class="section">${sectionHead('Bookmaker price of the score that actually happened','Latest correct-score price we captured before kickoff')}<div class="table-shell"><table class="data-table"><thead><tr><th>Fixture</th><th>Actual score</th><th>Best captured price</th><th>Implied chance</th></tr></thead><tbody>${actualOddsRows()||'<tr><td colspan="4">No captured correct-score prices.</td></tr>'}</tbody></table></div></div>${replaySection()}`};

  async function loadReplay(gw){try{state.replay=await getJson(`${API.replay}?gw=${gw}`)}catch(e){state.replay=null;state.errors.replay=e.message}}
  const _load=load;
  load=async function(gw=0){await _load(gw);humanizeState();await loadReplay(state.gw);humanizeState();render()};
  (async()=>{for(let i=0;i<80&&!state.loadedAt;i++)await new Promise(r=>setTimeout(r,100));if(state.loadedAt){await loadReplay(state.gw);humanizeState();render();}})();
  document.addEventListener('click',e=>{const b=e.target.closest('[data-page-key]');if(!b||b.disabled)return;const key=b.dataset.pageKey,go=Number(b.dataset.pageGo);if(key==='performance'){pages.performance=Math.max(1,go);render();window.scrollTo({top:0,behavior:'smooth'});}});
})();
