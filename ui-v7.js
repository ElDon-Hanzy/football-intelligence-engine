(function(){
  // C0145 — human-first presentation layer. No forecast mutation.
  const HUMAN_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/human-insights-api';
  const priorLoad=load;
  let human=null,humanGw=null,humanLoading=false;

  ROUTES.market.title='Betting';
  ROUTES.market.eyebrow='Model betting views';

  function renameNav(){
    const d=document.querySelector('#desktopNav [data-route="market"] span:last-child');if(d)d.textContent='Betting';
    const m=document.querySelector('#mobileNav [data-route="market"] small');if(m)m.textContent='Betting';
  }
  renameNav();

  async function syncHuman(){
    const gw=Number(state.gw||0);if(!gw||humanLoading)return;
    humanLoading=true;
    try{
      const r=await fetch(`${HUMAN_API}?gw=${gw}`,{cache:'no-store'}),j=await r.json();
      if(r.ok&&j?.ok){human=j;humanGw=gw;render();}
      else console.warn('Human insights unavailable',j?.error||r.status);
    }catch(e){console.warn('Human insights unavailable',e)}finally{humanLoading=false}
  }

  load=async function(gw=0){await priorLoad(gw);await syncHuman();};

  function p(v,d=0){return num(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`}
  function n2(v,d=2){return num(v)==null?'—':Number(v).toFixed(d)}
  function cleanName(v){return String(v||'').replace('Manchester United','Man Utd').replace('Manchester City','Man City')}
  function scoreText(a,b){return `${a??'—'}–${b??'—'}`}

  function previousStory(){
    const h=human?.previous_highlight;if(!h?.player)return 'Previous gameweek results are still syncing.';
    const pl=h.player,f=h.fixture;let first='';
    if(f&&f.home&&f.away&&f.home_score!=null&&f.away_score!=null){
      const isHome=pl.team===f.home,team=cleanName(pl.team),opp=cleanName(isHome?f.away:f.home),ts=isHome?Number(f.home_score):Number(f.away_score),os=isHome?Number(f.away_score):Number(f.home_score);
      const verb=ts>os?'beat':ts<os?'lost to':'drew with';first=`${team} ${verb} ${opp} ${scoreText(ts,os)}.`;
    }
    const returns=[];if(pl.goals)returns.push(`${pl.goals} goal${pl.goals===1?'':'s'}`);if(pl.assists)returns.push(`${pl.assists} assist${pl.assists===1?'':'s'}`);
    const ret=returns.length?` from ${returns.join(' and ')}`:'';
    return `${first}${first?' ':''}${pl.name} was the standout of GW${h.gameweek} with ${pl.total_points} FPL points${ret}.`;
  }

  function nextStory(){
    const ex=human?.next_expectation,favs=ex?.top_favorites||[],f=favs[0],f2=favs[1],hi=ex?.highest_total;
    if(!f)return 'The next gameweek model is still building.';
    const bits=[`${cleanName(f.team)} have the clearest team edge: ${p(f.prob)} to beat ${cleanName(f.opponent)}, with ${n2(f.team_lambda)} model goals.`];
    if(f2)bits.push(`${cleanName(f2.team)} are the next strongest favourite at ${p(f2.prob)} against ${cleanName(f2.opponent)}.`);
    if(hi){const total=(Number(hi.home_lambda||0)+Number(hi.away_lambda||0));bits.push(`${cleanName(hi.home)}–${cleanName(hi.away)} is the highest-scoring environment at ${total.toFixed(2)} combined expected goals.`)}
    return bits.join(' ');
  }

  function setPieces(x){
    const a=[];if(Number(x.penalties_order)===1)a.push('penalties');if(Number(x.direct_freekicks_order)===1)a.push('direct free-kicks');if(Number(x.corners_order)===1)a.push('corners');
    if(a.length)return a.join(' + ');
    if(Number(x.penalties_order)===2||Number(x.direct_freekicks_order)===2||Number(x.corners_order)===2)return 'secondary set pieces';
    return 'no major set-piece edge';
  }
  function captainCard(x){
    return `<article class="human-card captain-card" data-player="${x.id}">
      <div class="captain-head"><div><h3>${esc(x.name)}</h3><p>${esc(cleanName(x.team))} · ${esc(x.position)}</p></div><strong>${n2(x.expected_points,1)} xPts</strong></div>
      <div class="evidence-grid">
        <div><span>xG</span><b>${n2(x.xg)}</b></div><div><span>xA</span><b>${n2(x.xa)}</b></div><div><span>xMins</span><b>${n2(x.expected_minutes,0)}</b></div>
        <div><span>xCeiling</span><b>${p(x.p_10_plus)} 10+</b><small>${p(x.p_15_plus)} 15+</small></div>
      </div>
      <div class="set-piece-line"><span>Set pieces</span><b>${esc(setPieces(x))}</b></div>
    </article>`;
  }
  function captainNoise(caps){
    if(!caps||caps.length<2)return '';
    const a=caps[0],b=caps[1],gap=Math.abs(Number(a.expected_points||0)-Number(b.expected_points||0));
    if(gap<=0.3)return `<div class="captain-noise"><strong>No meaningful raw xPts edge:</strong> ${esc(a.name)} and ${esc(b.name)} are separated by only ${gap.toFixed(2)} projected points. Use minutes, role, set pieces and haul/blank risk to break the tie — not the decimal ranking.</div>`;
    return '';
  }

  function humanPageHead(kicker,title,text){return `<div class="human-page-head"><span>${esc(kicker)}</span><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`}

  renderHome=function(){
    if(!state.fpl)return errorBlock('FPL data unavailable',state.errors.fpl);
    const caps=human?.captain_candidates||[];
    return `${humanPageHead(`GW${state.gw}`,'The week in plain English','What happened, what we expect next, and who matters most for captaincy.')}
      <div class="story-grid">
        <article class="story-card"><span>Last gameweek</span><h3>What actually mattered</h3><p>${esc(previousStory())}</p></article>
        <article class="story-card"><span>Next gameweek</span><h3>What the model expects</h3><p>${esc(nextStory())}</p></article>
      </div>
      <section class="human-section"><div class="human-section-head"><div><span>Captaincy</span><h2>${caps.length||4} serious candidates</h2></div><p>xPts plus minutes, attacking expectation, ceiling and set-piece role. Cards are candidates, not fake-precision rankings.</p></div>
        ${captainNoise(caps)}
        <div class="captain-grid">${caps.map(captainCard).join('')||'<div class="empty-state">Captaincy candidates are still syncing.</div>'}</div>
      </section>`;
  };

  function planTransferText(plan){
    const ts=Array.isArray(plan?.transfers)?plan.transfers:[];if(!ts.length)return 'Hold the squad for now. Keep the free transfers until a move shows a robust edge over doing nothing.';
    return `Recommended moves: ${ts.map(t=>`${t.out||t.out_name||'—'} → ${t.in||t.in_name||'—'}`).join(' · ')}.`;
  }
  function planPlayer(id){const x=findPlayer(id)||(human?.top_players||[]).find(p=>Number(p.id)===Number(id));return x?.name||'—'}
  function planBrief(){
    const plan=human?.manager_plan||state.fpl?.manager_plan;if(!plan)return 'No current manager plan has been published yet. The default is to avoid forcing a move until a robust edge appears.';
    const moves=planTransferText(plan),cap=planPlayer(plan.captain_player_id),vc=planPlayer(plan.vice_player_id),provisional=String(plan.status||'').toLowerCase().includes('provisional');
    return `${moves} Captain ${cap}; vice-captain ${vc}.${provisional?' This is provisional: no action is final until it survives the noise-control gate.':''}`;
  }

  function topRow(x,i){
    return `<div class="human-player-row" data-player="${x.id}"><span class="rank-no">${i+1}</span><div><strong>${esc(x.name)}</strong><small>${esc(cleanName(x.team))} · ${esc(x.position)}${num(x.price)!=null?` · £${Number(x.price).toFixed(1)}`:''}</small></div><b>${n2(x.expected_points,2)}</b><span>${n2(x.expected_minutes,0)} min</span><span>${p(x.p_10_plus)} 10+</span></div>`;
  }

  renderFpl=function(){
    if(!state.fpl)return errorBlock('FPL data unavailable',state.errors.fpl);
    const top=human?.top_players||[];
    return `${humanPageHead(`GW${state.gw} FPL`,'Our squad decision','A short recommendation first; the model ranking underneath it.')}
      <article class="decision-brief"><span>Recommended action</span><h2>${esc(planBrief())}</h2></article>
      <section class="human-section"><div class="human-section-head"><div><span>Player model</span><h2>Top 10 by expected points</h2></div><p>This is a raw xPts table, not an automatic transfer ranking. Final decisions still need minutes, role, price, squad structure and robustness.</p></div>
        <div class="human-player-list"><div class="human-player-row human-header"><span>#</span><span>Player</span><b>xPts</b><span>xMins</span><span>Ceiling</span></div>${top.map(topRow).join('')||'<div class="empty-state">Top-player model is still syncing.</div>'}</div>
      </section>`;
  };

  function betCard(x,i){
    const note=x.type==='Correct score'?'Exact scores are naturally low-probability outcomes.':'This is model probability, not bookmaker value.';
    return `<article class="human-card bet-card" data-fixture="${x.match_id}"><div class="bet-top"><span>${i+1}. ${esc(x.type)}</span><strong>${p(x.probability,1)}</strong></div><h3>${esc(x.selection)}</h3><p>${esc(x.fixture)}</p><div class="bet-xg"><span>Model xG</span><b>${n2(x.home_lambda)} – ${n2(x.away_lambda)}</b></div><small>${esc(note)}</small></article>`;
  }

  renderMarket=function(){
    const bets=human?.betting_recommendations||[];
    return `${humanPageHead(`GW${state.gw} betting`,'Four strongest model views','No bookmaker odds and no price-chasing: these are the model’s highest-conviction views in four core markets.')}
      <div class="betting-note">Probability is not the same as betting value. This page deliberately ranks our football model first; bookmaker comparison can be layered on later.</div>
      <div class="bet-grid">${bets.map(betCard).join('')||'<div class="empty-state">Betting model views are still syncing.</div>'}</div>`;
  };

  const boot=setInterval(()=>{if(state.fpl&&state.gw&&humanGw!==Number(state.gw)&&!humanLoading)syncHuman();if(humanGw===Number(state.gw))clearInterval(boot)},300);
  setTimeout(()=>clearInterval(boot),10000);
})();
