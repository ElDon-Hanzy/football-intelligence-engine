(function(){
  // C0166 — evidence-aligned fixture cards and modal.
  const FACT_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/fixture-facts-api';
  const NO_EDGE=0.05;
  let factsGw=null,factsPayload=null,factsPromise=null,requestSeq=0;
  const bundles=new Map();
  const n=v=>num(v), pc=(v,d=0)=>n(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`, disp=s=>String(s||'—').replace('-', '–');

  function setBundles(j){bundles.clear();for(const f of j?.fixtures||[])bundles.set(Number(f.match_id),f)}
  async function ensureFacts(gw){
    gw=Number(gw||0);if(!gw)return null;
    if(factsGw===gw&&factsPayload)return factsPayload;
    if(factsPromise?.gw===gw)return factsPromise.promise;
    const promise=(async()=>{const r=await fetch(`${FACT_API}?gw=${gw}`,{cache:'no-store'}),j=await r.json();if(!r.ok||!j?.ok)throw new Error(j?.error||`HTTP ${r.status}`);if(Number(state.gw)!==gw)return null;factsGw=gw;factsPayload=j;setBundles(j);if(state.route==='fixtures')render();return j})();
    factsPromise={gw,promise};try{return await promise}finally{if(factsPromise?.promise===promise)factsPromise=null}
  }
  function thesis(ff){const mk=ff?.prediction?.markets||{},rows=[['H',n(mk.home_win)],['D',n(mk.draw)],['A',n(mk.away_win)]].filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]);return rows.length===3?{outcome:rows[0][0],prob:rows[0][1],secondOutcome:rows[1][0],second:rows[1][1],margin:rows[0][1]-rows[1][1],home:n(mk.home_win),draw:n(mk.draw),away:n(mk.away_win)}:null}
  const weak=th=>!!th&&th.margin<NO_EDGE;
  function sideName(o,f,b,short=false){const h=b?.home||f?.home_team||{},a=b?.away||f?.away_team||{};if(o==='H')return short?(h.short_name||h.name||'HOME'):(h.name||'Home');if(o==='A')return short?(a.short_name||a.name||'AWAY'):(a.name||'Away');return 'Draw'}
  function actualOutcome(f,ff){const h=ff?.home_score??f?.home_score,a=ff?.away_score??f?.away_score;if(h==null||a==null)return null;return Number(h)>Number(a)?'H':Number(h)<Number(a)?'A':'D'}
  function family(x){const t=String(x?.fact_type||'');if(t.includes('SYMMETRIC_L5_XG'))return'MATCHUP_XG';if(t.includes('CURRENT_SEASON_PROCESS'))return'CURRENT_SEASON';if(t.includes('VENUE_FORM'))return'VENUE_FORM';if(t.includes('STREAK_PROFILE'))return'STREAK_PROFILE';if(t.includes('RESULT_PROCESS_RESIDUAL'))return'RESULT_PROCESS';if(t==='SCORING_VS_CLEAN_SHEET')return'SCORE_DEFENCE';return x?.payload?.family||t||'OTHER'}
  function distinct(rows,max=5){const fam=new Set(),txt=new Set(),out=[];for(const x of [...(rows||[])].sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score))){const f=family(x),t=String(x.one_liner||'').trim().replace(/\s+/g,' ').toLowerCase();if(!t||fam.has(f)||txt.has(t))continue;fam.add(f);txt.add(t);out.push(x);if(out.length>=max)break}return out}
  const actualInput=x=>x?.payload?.actual_model_input===true||String(x?.payload?.actual_model_input)==='true';
  function cardFacts(b,th){
    if(!b)return[];
    if(!weak(th))return [...(b.card_facts||[])].filter(actualInput).sort((a,b)=>Number(a.card_rank||99)-Number(b.card_rank||99)).slice(0,3);
    const all=b.modal_facts||[],actual=all.filter(actualInput),sup=distinct(actual.filter(x=>x.alignment==='SUPPORTS'),2),opp=distinct(actual.filter(x=>x.alignment==='CONTRADICTS'),1),out=[...sup,...opp];
    if(out.length<3){const used=new Set(out.map(x=>x.id)),fill=distinct(all.filter(x=>!used.has(x.id)),3-out.length);out.push(...fill)}
    return out.slice(0,3);
  }
  function resultLabel(team,r){const opp=r?.opponent_name||r?.opponent_short||'Opponent';return `${team?.name||'Team'} ${r.goals_for}–${r.goals_against} ${opp}`}
  function formDots(team,recent){const rows=(recent||[]).slice(0,5),dots=rows.map(r=>`<button type="button" class="c0162-form-dot ${String(r.result||'').toLowerCase()}" data-c0162-dot="1" data-label="${esc(resultLabel(team,r))}" data-date="${esc(dateOnly(r.fixture_kickoff))}" aria-label="${esc(resultLabel(team,r))}"></button>`);while(dots.length<5)dots.push('<span class="c0162-form-dot empty" aria-hidden="true"></span>');return `<div class="c0162-form">${dots.join('')}</div>`}
  function teamBlock(team,recent,away=false){return `<div class="c0165-team ${away?'away':''}"><strong>${esc(team?.short_name||team?.name||'—')}</strong><span>${esc(team?.name||'—')}</span>${formDots(team,recent)}</div>`}
  function scoreCall(ff){return ff?.prediction?.headline_score||modelScore(ff)}
  function scoreProb(ff){return n(ff?.prediction?.headline_score_probability??ff?.prediction?.top_scoreline_probability)}
  function probabilityStrip(f,th,b,finished,hit){if(!th)return'';const h=b?.home||f.home_team,a=b?.away||f.away_team,label=weak(th)?'NO CLEAR 1X2 EDGE':`${esc(sideName(th.outcome,f,b,true))} LEAN`;return `<div class="c0165-prob-strip ${weak(th)?'weak':''}"><div class="c0165-call-state"><strong>${label}</strong>${!weak(th)&&finished&&hit?'<i>✓</i>':''}</div><div class="c0165-threeway"><span class="${!weak(th)&&th.outcome==='H'?'active':''}">${esc(h?.short_name||'H')} ${pc(th.home)}</span><span class="${!weak(th)&&th.outcome==='D'?'active':''}">D ${pc(th.draw)}</span><span class="${!weak(th)&&th.outcome==='A'?'active':''}">${esc(a?.short_name||'A')} ${pc(th.away)}</span></div></div>`}

  renderFixtureCard=function(f){
    ensureFacts(Number(state.gw||0)).catch(()=>{});
    const ff=fixtureFpl(f.match_id);if(!ff?.prediction)return `<article class="fixture-card fixture-card-v17" data-fixture="${f.match_id}"><div class="c0165-match-row">${teamBlock(f.home_team,[],false)}<div class="c0165-score"><strong>—</strong></div>${teamBlock(f.away_team,[],true)}</div></article>`;
    const b=bundles.get(Number(f.match_id))||null,th=thesis(ff),finished=Boolean(f?.finished||ff?.finished),act=actualOutcome(f,ff),hit=finished&&th&&act===th.outcome,score=scoreCall(ff),sp=scoreProb(ff),facts=cardFacts(b,th),exact=finished&&String(ff?.home_score??f?.home_score)+'-'+String(ff?.away_score??f?.away_score)===String(score).replace('–','-');
    return `<article class="fixture-card fixture-card-v15 fixture-card-v17 ${weak(th)?'no-edge':''}" data-fixture="${f.match_id}">${probabilityStrip(f,th,b,finished,hit)}<div class="c0165-match-row">${teamBlock(b?.home||f.home_team,b?.home?.recent||[],false)}<div class="c0165-score"><span>Score call${sp!=null?` · ${pc(sp,1)}`:''}</span><strong>${esc(disp(score))}${exact?'<i>✓</i>':''}</strong>${finished?`<small>Actual ${esc(disp(`${ff?.home_score??f?.home_score}-${ff?.away_score??f?.away_score}`))}</small>`:''}</div>${teamBlock(b?.away||f.away_team,b?.away?.recent||[],true)}</div>${facts.length?`<button type="button" class="c0162-toggle c0165-toggle" data-c0162-toggle="1" aria-expanded="false">${weak(th)?'Why no clear edge?':'Why this call?'} <span>⌄</span></button><div class="c0162-expand"><div class="c0162-fact-list">${facts.map((x,i)=>`<div class="c0162-fact c0165-fact ${x.alignment==='CONTRADICTS'?'risk':'support'}"><i>${i+1}</i><span>${esc(x.one_liner)}</span></div>`).join('')}</div></div>`:''}</article>`
  };

  function phrase(x,lead){const f=family(x);if(f==='VENUE_FORM')return 'the home/away record';if(f==='STREAK_PROFILE')return 'the recent streak profile';if(f==='MATCHUP_XG')return 'the recent chance-quality matchup';if(f==='CURRENT_SEASON')return 'this season’s chance data';if(f==='RESULT_PROCESS')return 'the gap between results and underlying xG';if(f==='SCORE_DEFENCE')return 'the scoring-versus-clean-sheet pattern';return `${lead}'s supporting evidence`}
  function story(fi,ff,b,th){
    if(!th)return'';const all=b?.modal_facts||[],actual=all.filter(actualInput),sup=distinct(actual.filter(x=>x.alignment==='SUPPORTS'),4),opp=distinct(actual.filter(x=>x.alignment==='CONTRADICTS'),3),lead=sideName(th.outcome,fi,b),second=sideName(th.secondOutcome,fi,b);
    if(weak(th)){
      const parts=[`There is no clear 1X2 edge. ${lead} are only the narrow probability leader at ${pc(th.prob)}, versus ${pc(th.second)} for ${second.toLowerCase()} and ${pc(th.draw)} for the draw.`];
      if(sup.length){const p=sup.slice(0,2).map(x=>phrase(x,lead));parts.push(`The evidence pulling toward ${lead} is mainly ${p.join(' and ')}.`)}
      if(opp.length)parts.push(`The main counterweight is ${phrase(opp[0],second)}.`);
      parts.push('The difference remains inside normal model uncertainty, so the engine does not issue a categorical winner call.');return parts.join(' ')
    }
    const parts=[`${lead} hold the stronger 1X2 position at ${pc(th.prob)}, compared with ${pc(th.second)} for ${second.toLowerCase()}.`];
    if(sup.length){const p=sup.slice(0,2).map(x=>phrase(x,lead));parts.push(`The call is driven mainly by ${p.join(' and ')}.`)}
    if(opp.length)parts.push(`The main counter-signal is ${phrase(opp[0],second)}.`);return parts.join(' ')
  }
  function group(title,rows,klass=''){if(!rows?.length)return'';return `<div class="c0162-evidence-group ${klass}"><h4>${esc(title)}</h4>${rows.map(x=>`<div class="c0162-modal-fact"><span>${esc(x.one_liner)}</span></div>`).join('')}</div>`}
  function modalHtml(fi,ff,mk,b){
    const th=thesis(ff),isWeak=weak(th),all=b?.modal_facts||[],usedSup=distinct(all.filter(x=>actualInput(x)&&x.alignment==='SUPPORTS'),5),usedOpp=distinct(all.filter(x=>actualInput(x)&&x.alignment==='CONTRADICTS'),isWeak?4:2),context=distinct(all.filter(x=>!actualInput(x)),3),home=fi?.home_team||b?.home||{name:ff?.home_team||mk?.home_team},away=fi?.away_team||b?.away||{name:ff?.away_team||mk?.away_team},finished=Boolean(fi?.finished||ff?.finished),s=story(fi||{home_team:home,away_team:away},ff,b,th);
    return `<div class="drawer-kicker">GW${state.gw} fixture intelligence</div><h2 class="drawer-title">${esc(home?.name||'—')} vs ${esc(away?.name||'—')}</h2><div class="drawer-sub">${dateTime(fi?.kickoff_time||ff?.kickoff_time||mk?.kickoff_time)}</div><div class="hero-meta"><span class="chip ${finished?'green':'blue'}">${finished?'Finished':isWeak?'No clear 1X2 edge':'Live pre-match'}</span><span class="chip">Score call ${esc(disp(scoreCall(ff)))}</span>${finished?`<span class="chip green">Actual ${actualScore(fi)}</span>`:''}</div>${s?`<div class="c0162-story"><span>Match story</span><p>${esc(s)}</p></div>`:''}<div class="c0162-modal-evidence"><h3>${isWeak?'Why there is no clear edge':'Evidence behind the call'}</h3>${group(isWeak?'Inputs for the slight lean':'Inputs supporting the call',usedSup,'support')}${group(isWeak?'Inputs the other way':'Counter-inputs',usedOpp,'risk')}${group('Additional context',context,'')}${factsPayload?.snapshot_run?`<small>Fact snapshot after GW${factsPayload.snapshot_run.as_of_gameweek} · no target-fixture results used.</small>`:''}</div>`
  }
  openFixture=async function(id){const seq=++requestSeq,gw=Number(state.gw||0);try{await ensureFacts(gw)}catch(e){console.warn('C0166 fact preload failed',e)}if(seq!==requestSeq||Number(state.gw)!==gw)return;const fi=fixtureIntel(id),ff=fixtureFpl(id),mk=fixtureMarket(id);if(!fi&&!ff&&!mk)return;const root=$('drawerContent');if(!root)return;root.innerHTML=modalHtml(fi,ff,mk,bundles.get(Number(id))||null);openDrawer()};

  const boot=setInterval(()=>{const gw=Number(state.gw||0);if(gw&&factsGw!==gw&&!factsPromise)ensureFacts(gw).catch(()=>{});if(gw&&factsGw===gw)clearInterval(boot)},500);setTimeout(()=>clearInterval(boot),45000);
})();
