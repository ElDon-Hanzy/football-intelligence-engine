(function(){
  // C0162 — persistent fact-engine fixture UI.
  // Collapsed by default; last-five EPL dots always visible when available.
  // Expanded card shows up to three SUPPORTS facts. Full evidence lives in matchup drawer.
  const FACT_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/fixture-facts-api';
  const priorRenderFixtureCard=renderFixtureCard;
  const priorOpenFixture=openFixture;
  const priorLoad=load;
  let factPayload=null,factGw=null,factLoading=false,factRetry=0,factTimer=null;
  const bundleByMatch=new Map();

  const n15=v=>num(v);
  const p15=(v,d=0)=>n15(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`;
  const norm15=v=>String(v||'').trim().replaceAll('–','-').replace(/\s+/g,'');
  const scoreOutcome15=s=>{const m=norm15(s).match(/^(\d+)-(\d+)$/);if(!m)return null;const h=Number(m[1]),a=Number(m[2]);return h>a?'H':h<a?'A':'D'};
  const disp15=s=>String(s||'—').replace('-', '–');

  function setBundles(j){
    bundleByMatch.clear();
    for(const f of j?.fixtures||[])bundleByMatch.set(Number(f.match_id),f);
  }
  function scheduleRetry(gw){
    if(factGw===gw||factRetry>=4)return;
    factRetry+=1;clearTimeout(factTimer);
    factTimer=setTimeout(()=>{if(Number(state.gw)===gw&&!factLoading&&factGw!==gw)syncFacts()},Math.min(5000,900*factRetry));
  }
  async function syncFacts(){
    const gw=Number(state.gw||0);if(!gw||factLoading||factGw===gw)return;
    factLoading=true;
    try{
      const r=await fetch(`${FACT_API}?gw=${gw}`,{cache:'no-store'}),j=await r.json();
      if(!r.ok||!j?.ok)throw new Error(j?.error||`HTTP ${r.status}`);
      if(Number(state.gw)!==gw)return;
      factPayload=j;factGw=gw;factRetry=0;clearTimeout(factTimer);setBundles(j);render();
    }catch(e){console.warn('C0162 fixture facts unavailable',e);scheduleRetry(gw)}
    finally{factLoading=false}
  }
  function ensureFacts(){const gw=Number(state.gw||0);if(gw&&factGw!==gw&&!factLoading)setTimeout(syncFacts,0)}
  load=async function(gw=0){factRetry=0;clearTimeout(factTimer);factPayload=null;factGw=null;bundleByMatch.clear();await priorLoad(gw);await syncFacts()};

  function thesis15(ff){
    const mk=ff?.prediction?.markets||{};
    const rows=[['H',n15(mk.home_win)],['D',n15(mk.draw)],['A',n15(mk.away_win)]].filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]);
    return rows.length===3?{outcome:rows[0][0],prob:rows[0][1],second:rows[1][1]}:null;
  }
  function outcomeText15(o,f,short=false){
    if(o==='H')return short?`${f.home_team?.short_name||f.home_team?.name||'HOME'} WIN`:`${f.home_team?.name||'Home'} win`;
    if(o==='A')return short?`${f.away_team?.short_name||f.away_team?.name||'AWAY'} WIN`:`${f.away_team?.name||'Away'} win`;
    return short?'DRAW':'draw';
  }
  function done15(f,ff){return Boolean(f?.finished||ff?.finished)}
  function actual15(f,ff){const h=ff?.home_score??f?.home_score,a=ff?.away_score??f?.away_score;return done15(f,ff)&&h!=null&&a!=null?`${h}-${a}`:null}

  function resultLabel15(team,r){
    const opp=r?.opponent_name||r?.opponent_short||'Opponent';
    return `${team?.name||'Team'} ${r.goals_for}–${r.goals_against} ${opp}`;
  }
  function formDots15(team,recent){
    const rows=(recent||[]).slice(0,5);
    const dots=rows.map(r=>`<button type="button" class="c0162-form-dot ${String(r.result||'').toLowerCase()}" data-c0162-dot="1" data-label="${esc(resultLabel15(team,r))}" data-date="${esc(dateOnly(r.fixture_kickoff))}" aria-label="${esc(resultLabel15(team,r))}"></button>`);
    while(dots.length<5)dots.push('<span class="c0162-form-dot empty" aria-hidden="true"></span>');
    return `<div class="c0162-form" aria-label="Last five Premier League matches">${dots.join('')}</div>`;
  }
  function team15(team,recent,away=false){
    return `<div class="c0162-team ${away?'away':''}"><strong>${esc(team?.short_name||team?.name||'—')}</strong><span>${esc(team?.name||'—')}</span>${formDots15(team,recent)}</div>`;
  }
  function facts15(bundle){
    const facts=[...(bundle?.card_facts||[])].sort((a,b)=>Number(a.card_rank||99)-Number(b.card_rank||99)).slice(0,3);
    if(!facts.length)return '';
    return `<div class="c0162-expand"><div class="c0162-fact-list">${facts.map((x,i)=>`<div class="c0162-fact"><i>${i+1}</i><span>${esc(x.one_liner)}</span></div>`).join('')}</div></div>`;
  }

  renderFixtureCard=function(f){
    ensureFacts();
    const ff=fixtureFpl(f.match_id);if(!ff?.prediction)return priorRenderFixtureCard(f);
    const bundle=bundleByMatch.get(Number(f.match_id))||null,th=thesis15(ff),done=done15(f,ff),act=actual15(f,ff),pred=modelScore(ff),predProb=n15(ff?.prediction?.top_scoreline_probability),actualOutcome=scoreOutcome15(act),exactHit=done&&act&&norm15(act)===norm15(pred),outcomeHit=done&&th&&actualOutcome===th.outcome;
    const statusFixture={...f,finished:done};const [status,cls]=matchStatus(statusFixture);
    const cardFacts=facts15(bundle),hasFacts=Boolean(bundle?.card_facts?.length);
    return `<article class="fixture-card fixture-card-v15" data-fixture="${f.match_id}">
      <div class="fixture-top"><span class="fixture-time">${dateOnly(f.kickoff_time)} · ${timeOnly(f.kickoff_time)}</span><span class="badge ${cls}">${status}</span></div>
      ${th?`<div class="c0162-pick ${outcomeHit?'hit':''}"><span>Prediction</span><strong>${esc(outcomeText15(th.outcome,f,true))} · ${p15(th.prob)}</strong>${outcomeHit?'<i aria-label="Correct 1X2 prediction">✓</i>':''}</div>`:''}
      <div class="c0162-match-row">
        ${team15(bundle?.home||f.home_team,bundle?.home?.recent||[],false)}
        <div class="c0162-score"><span>Score call${predProb!=null?` · ${p15(predProb,1)}`:''}</span><strong>${esc(disp15(pred))}${exactHit?'<i class="c0162-exact-hit">✓</i>':''}</strong>${done?`<small>Actual ${esc(disp15(act))}</small>`:''}</div>
        ${team15(bundle?.away||f.away_team,bundle?.away?.recent||[],true)}
      </div>
      ${hasFacts?`<button type="button" class="c0162-toggle" data-c0162-toggle="1" aria-expanded="false">Why this call? <span>⌄</span></button>${cardFacts}`:''}
    </article>`;
  };

  function lowerFirst15(s){return s?String(s).charAt(0).toLowerCase()+String(s).slice(1):''}
  function story15(f,ff,bundle){
    const th=thesis15(ff),all=bundle?.modal_facts||[],sup=all.filter(x=>x.alignment==='SUPPORTS').sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score)),contra=all.filter(x=>x.alignment==='CONTRADICTS').sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score));
    if(!th||!sup.length)return '';
    const pick=outcomeText15(th.outcome,f,false);
    let story=th.outcome==='D'?`The model sees a draw as the most likely 1X2 outcome at ${p15(th.prob)}.`:`The model leans toward ${pick} at ${p15(th.prob)}.`;
    story+=` ${sup.slice(0,2).map(x=>x.one_liner).join(' ')}`;
    if(contra[0])story+=` The main counterpoint is that ${lowerFirst15(contra[0].one_liner)}`;
    return story;
  }
  function evidenceGroup15(title,rows,klass=''){
    if(!rows?.length)return '';
    return `<div class="c0162-evidence-group ${klass}"><h4>${esc(title)}</h4>${rows.map(x=>`<div class="c0162-modal-fact"><span>${esc(x.one_liner)}</span></div>`).join('')}</div>`;
  }

  openFixture=function(id){
    priorOpenFixture(id);
    const fi=fixtureIntel(id),ff=fixtureFpl(id),bundle=bundleByMatch.get(Number(id));
    if(!bundle||!ff)return;
    const root=$('drawerContent');if(!root)return;
    const all=bundle.modal_facts||[],supports=all.filter(x=>x.alignment==='SUPPORTS'),contradicts=all.filter(x=>x.alignment==='CONTRADICTS'),neutral=all.filter(x=>x.alignment==='NEUTRAL'),story=story15(fi||{home_team:bundle.home,away_team:bundle.away},ff,bundle);
    const block=document.createElement('div');block.className='c0162-modal-intel';
    block.innerHTML=`${story?`<div class="c0162-story"><span>Match story</span><p>${esc(story)}</p></div>`:''}<div class="c0162-modal-evidence"><h3>Evidence behind the call</h3>${evidenceGroup15('Supports the call',supports,'support')}${evidenceGroup15('Counterpoints / risks',contradicts,'risk')}${evidenceGroup15('Other context',neutral,'neutral')}<small>Fact snapshot after GW${factPayload?.snapshot_run?.as_of_gameweek??'—'} · no target-fixture results used.</small></div>`;
    const sub=root.querySelector('.drawer-sub');if(sub)sub.insertAdjacentElement('afterend',block);else root.prepend(block);
  };

  function hidePopover15(){document.getElementById('c0162-form-popover')?.remove()}
  function showPopover15(btn){
    hidePopover15();const r=btn.getBoundingClientRect(),d=document.createElement('div');d.id='c0162-form-popover';d.className='c0162-form-popover';d.innerHTML=`<strong>${esc(btn.dataset.label||'')}</strong><span>${esc(btn.dataset.date||'')}</span>`;document.body.appendChild(d);
    const w=d.offsetWidth,h=d.offsetHeight,left=Math.max(8,Math.min(window.innerWidth-w-8,r.left+r.width/2-w/2)),top=Math.max(8,r.top-h-10);d.style.left=`${left}px`;d.style.top=`${top}px`;
  }
  document.addEventListener('click',e=>{
    const dot=e.target.closest('[data-c0162-dot]');if(dot){e.preventDefault();e.stopImmediatePropagation();showPopover15(dot);return}
    const tog=e.target.closest('[data-c0162-toggle]');if(tog){e.preventDefault();e.stopImmediatePropagation();const card=tog.closest('.fixture-card-v15');if(!card)return;const on=card.classList.toggle('expanded');tog.setAttribute('aria-expanded',String(on));tog.querySelector('span').textContent=on?'⌃':'⌄';hidePopover15();return}
    if(!e.target.closest('#c0162-form-popover'))hidePopover15();
  },true);

  const boot=setInterval(()=>{if(state.gw&&factGw!==Number(state.gw)&&!factLoading)syncFacts();if(factGw===Number(state.gw)&&factGw!=null)clearInterval(boot)},500);
  setTimeout(()=>clearInterval(boot),45000);
})();
