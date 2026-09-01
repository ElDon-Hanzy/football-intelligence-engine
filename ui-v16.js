(function(){
  // C0163 — atomic matchup-modal rendering.
  // The drawer is not opened until the full C0162 evidence payload is ready.
  // One innerHTML write, then one openDrawer() call. No progressive DOM injection.
  const FACT_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/fixture-facts-api';
  let modalFactsGw=null,modalFactsPayload=null,modalFactsPromise=null,requestSeq=0;
  const modalBundleByMatch=new Map();

  const n16=v=>num(v);
  const p16=(v,d=0)=>n16(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`;

  function setModalBundles(j){
    modalBundleByMatch.clear();
    for(const f of j?.fixtures||[])modalBundleByMatch.set(Number(f.match_id),f);
  }

  async function ensureModalFacts(gw){
    gw=Number(gw||0);
    if(!gw)return null;
    if(modalFactsGw===gw&&modalFactsPayload)return modalFactsPayload;
    if(modalFactsPromise&&modalFactsPromise.gw===gw)return modalFactsPromise.promise;
    const promise=(async()=>{
      const r=await fetch(`${FACT_API}?gw=${gw}`,{cache:'no-store'});
      const j=await r.json();
      if(!r.ok||!j?.ok)throw new Error(j?.error||`HTTP ${r.status}`);
      if(Number(state.gw)!==gw)return null;
      modalFactsPayload=j;modalFactsGw=gw;setModalBundles(j);
      return j;
    })();
    modalFactsPromise={gw,promise};
    try{return await promise}
    finally{if(modalFactsPromise?.promise===promise)modalFactsPromise=null}
  }

  function thesis16(ff){
    const mk=ff?.prediction?.markets||{};
    const rows=[['H',n16(mk.home_win)],['D',n16(mk.draw)],['A',n16(mk.away_win)]].filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]);
    return rows.length===3?{outcome:rows[0][0],prob:rows[0][1],second:rows[1][1]}:null;
  }
  function outcomeText16(o,f){
    if(o==='H')return `${f?.home_team?.name||f?.home?.name||'Home'} win`;
    if(o==='A')return `${f?.away_team?.name||f?.away?.name||'Away'} win`;
    return 'draw';
  }
  function lowerFirst16(s){return s?String(s).charAt(0).toLowerCase()+String(s).slice(1):''}
  function story16(f,ff,bundle){
    const th=thesis16(ff),all=bundle?.modal_facts||[];
    const sup=all.filter(x=>x.alignment==='SUPPORTS').sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score));
    const contra=all.filter(x=>x.alignment==='CONTRADICTS').sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score));
    if(!th||!sup.length)return '';
    const pick=outcomeText16(th.outcome,f);
    let story=th.outcome==='D'?`The model sees a draw as the most likely 1X2 outcome at ${p16(th.prob)}.`:`The model leans toward ${pick} at ${p16(th.prob)}.`;
    story+=` ${sup.slice(0,2).map(x=>x.one_liner).join(' ')}`;
    if(contra[0])story+=` The main counterpoint is that ${lowerFirst16(contra[0].one_liner)}`;
    return story;
  }
  function evidenceGroup16(title,rows,klass=''){
    if(!rows?.length)return '';
    return `<div class="c0162-evidence-group ${klass}"><h4>${esc(title)}</h4>${rows.map(x=>`<div class="c0162-modal-fact"><span>${esc(x.one_liner)}</span></div>`).join('')}</div>`;
  }
  function evidenceBlock16(bundle,fi,ff){
    if(!bundle)return '';
    const all=bundle.modal_facts||[];
    const supports=all.filter(x=>x.alignment==='SUPPORTS').sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score));
    const contradicts=all.filter(x=>x.alignment==='CONTRADICTS').sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score));
    const neutral=all.filter(x=>x.alignment==='NEUTRAL').sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score));
    const story=story16(fi||{home_team:bundle.home,away_team:bundle.away},ff,bundle);
    return `${story?`<div class="c0162-story"><span>Match story</span><p>${esc(story)}</p></div>`:''}<div class="c0162-modal-evidence"><h3>Evidence behind the call</h3>${evidenceGroup16('Supports the call',supports,'support')}${evidenceGroup16('Counterpoints / risks',contradicts,'risk')}${evidenceGroup16('Other context',neutral,'neutral')}<small>Fact snapshot after GW${modalFactsPayload?.snapshot_run?.as_of_gameweek??'—'} · no target-fixture results used.</small></div>`;
  }

  function baseModal16(id,fi,ff,mk,bundle){
    const home=fi?.home_team||{name:ff?.home_team||mk?.home_team},away=fi?.away_team||{name:ff?.away_team||mk?.away_team};
    const signals=[...(home?.matchup_signals||[]),...(away?.matchup_signals||[])];
    const marketEdges=mk?.edge_research?.top_robust_positive_ev||[];
    const finished=Boolean(fi?.finished||ff?.finished);
    const status=finished?'Finished':'Live pre-match';
    const intelligence=evidenceBlock16(bundle,fi,ff);
    return `<div class="drawer-kicker">GW${state.gw} fixture intelligence</div><h2 class="drawer-title">${esc(home?.name||'—')} vs ${esc(away?.name||'—')}</h2><div class="drawer-sub">${dateTime(fi?.kickoff_time||ff?.kickoff_time||mk?.kickoff_time)}</div><div class="hero-meta"><span class="chip ${finished?'green':'blue'}">${status}</span><span class="chip">Score call ${esc(modelScore(ff))}</span>${finished?`<span class="chip green">Actual ${actualScore(fi)}</span>`:''}</div>${intelligence}${signals.length?`<div class="drawer-section"><h3>Tactical matchup signals</h3><div class="panel">${signals.map(s=>{const owner=(home.matchup_signals||[]).includes(s)?home.name:away.name;return metric(`${s.signal_family==='PERSONNEL'?'Personnel':shortSignal(s.signal_key)} · ${owner}`,`${fmt(s.score,3)} · ${esc(s.direction)}`,directionClass(s)==='risk'?'warning':'')}).join('')}</div></div>`:''}${sideDrawer(home)}${sideDrawer(away)}${marketEdges.length?`<div class="drawer-section"><h3>Market research</h3><div class="research-note">Observational only. A positive research edge is not an active recommendation.</div><div class="panel" style="margin-top:8px">${marketEdges.slice(0,5).map(e=>metric(`${e.bookmaker} · ${e.selection_name}`,`${fmt(e.decimal_odds)} · EV ${pct(e.expected_value)}`,'warning')).join('')}</div></div>`:''}<div class="drawer-section"><div class="research-note">Raw technical signals remain available for audit below the human-readable match story; they do not replace the evidence narrative.</div></div>`;
  }

  openFixture=async function(id){
    const seq=++requestSeq,gw=Number(state.gw||0);
    try{await ensureModalFacts(gw)}catch(e){console.warn('C0163 modal fact preload failed',e)}
    if(seq!==requestSeq||Number(state.gw)!==gw)return;
    const fi=fixtureIntel(id),ff=fixtureFpl(id),mk=fixtureMarket(id);
    if(!fi&&!ff&&!mk)return;
    const root=$('drawerContent');if(!root)return;
    const bundle=modalBundleByMatch.get(Number(id))||null;
    root.innerHTML=baseModal16(id,fi,ff,mk,bundle);
    openDrawer();
  };

  // Preload quietly so most taps open immediately; opening still awaits the same promise if needed.
  const boot=setInterval(()=>{const gw=Number(state.gw||0);if(gw&&modalFactsGw!==gw&&!modalFactsPromise)ensureModalFacts(gw).catch(()=>{});if(gw&&modalFactsGw===gw)clearInterval(boot)},500);
  setTimeout(()=>clearInterval(boot),45000);
})();
