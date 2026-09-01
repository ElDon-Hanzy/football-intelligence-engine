(function(){
  // C0163/C0164 — atomic, human-readable matchup-modal rendering.
  // The drawer opens only after the full fact payload is ready.
  // Raw C0147 signal tables and replacement-research scores remain stored for audit,
  // but are deliberately excluded from the primary human matchup modal.
  const FACT_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/fixture-facts-api';
  let modalFactsGw=null,modalFactsPayload=null,modalFactsPromise=null,requestSeq=0;
  const modalBundleByMatch=new Map();

  const n16=v=>num(v);
  const p16=(v,d=0)=>n16(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`;
  const f16=(v,d=2)=>n16(v)==null?'—':Number(v).toFixed(d);

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
  function favDog16(th,bundle,fi){
    const home=bundle?.home||fi?.home_team||{},away=bundle?.away||fi?.away_team||{};
    if(th?.outcome==='H')return {fav:home,dog:away};
    if(th?.outcome==='A')return {fav:away,dog:home};
    return {fav:null,dog:null};
  }
  function family16(x){
    const t=String(x?.fact_type||'');
    if(t==='MODEL_SCORING_EDGE')return 'MODEL_THESIS';
    if(t==='ATTACK_DEFENCE_XG_CONTRAST')return 'MATCHUP_XG';
    if(t==='SCORING_VS_CLEAN_SHEET')return 'SCORING_VS_DEFENCE';
    if(t==='FAV_ATTACK_XG'||t==='FAV_GOAL_OUTPUT')return 'ATTACK_PROCESS';
    if(t==='FAV_SHOT_VOLUME')return 'SHOT_VOLUME';
    if(t==='OPP_GOALS_CONCEDED')return 'OPP_DEFENCE';
    if(['WINNING_STREAK','UNBEATEN_STREAK','WINLESS_STREAK','LOSING_STREAK'].includes(t))return 'RESULT_STREAK';
    if(['SCORING_STREAK','FAILED_TO_SCORE_STREAK','CONCEDING_STREAK','CLEAN_SHEET_STREAK'].includes(t))return 'SCORING_STREAK';
    if(t==='HOME_AWAY_FORM')return 'VENUE_FORM';
    return t||'OTHER';
  }
  function distinctFacts16(rows,max=5){
    const seenText=new Set(),seenFamily=new Set(),out=[];
    for(const x of [...(rows||[])].sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score))){
      const text=String(x?.one_liner||'').trim().replace(/\s+/g,' ').toLowerCase();
      const fam=family16(x);
      if(!text||seenText.has(text)||seenFamily.has(fam))continue;
      seenText.add(text);seenFamily.add(fam);out.push(x);
      if(out.length>=max)break;
    }
    return out;
  }
  function factByType16(rows,...types){return (rows||[]).find(x=>types.includes(String(x.fact_type||'')))||null}
  function teamName16(bundle,id){
    if(Number(bundle?.home?.id)===Number(id))return bundle.home.name;
    if(Number(bundle?.away?.id)===Number(id))return bundle.away.name;
    return 'The team';
  }

  function story16(fi,ff,bundle){
    const th=thesis16(ff),all=bundle?.modal_facts||[];
    if(!th)return '';
    const supports=distinctFacts16(all.filter(x=>x.alignment==='SUPPORTS'),6);
    const risks=distinctFacts16(all.filter(x=>x.alignment==='CONTRADICTS'),3);
    const {fav,dog}=favDog16(th,bundle,fi);
    const favName=fav?.name||'The favourite',dogName=dog?.name||'the opponent';
    const parts=[];

    if(th.outcome==='D')parts.push(`This is a genuinely balanced matchup: the draw is the single most likely 1X2 outcome at ${p16(th.prob)}.`);
    else parts.push(`${favName} are favoured at ${p16(th.prob)}, but the call is based on the overall matchup rather than recent results alone.`);

    const model=factByType16(supports,'MODEL_SCORING_EDGE');
    const contrast=factByType16(supports,'ATTACK_DEFENCE_XG_CONTRAST');
    const attack=factByType16(supports,'FAV_ATTACK_XG');
    const scoreDef=factByType16(supports,'SCORING_VS_CLEAN_SHEET');

    if(model){
      const a=n16(model.payload?.fav_lambda),d=n16(model.payload?.dog_lambda);
      if(a!=null&&d!=null)parts.push(`The strongest signal is the projected scoring gap: roughly ${f16(a)} expected goals for ${favName} versus ${f16(d)} for ${dogName}.`);
    }
    if(contrast){
      const a=n16(contrast.payload?.team_xgf_l5),d=n16(contrast.payload?.opponent_xga_l5);
      if(a!=null&&d!=null)parts.push(`That is backed by the recent chance-quality matchup, with ${favName} creating about ${f16(a)} xG per game while ${dogName} have been allowing about ${f16(d)}.`);
    }else if(attack){
      const a=n16(attack.payload?.xg_for_l5);
      if(a!=null)parts.push(`${favName}'s underlying attack is still healthy, producing roughly ${f16(a)} xG per league game across the last five.`);
    }else if(scoreDef){
      parts.push(`Recent scoring and clean-sheet patterns also point in the same direction as the ${favName} call.`);
    }

    if(risks.length){
      const riskBits=[];
      for(const r of risks.slice(0,2)){
        const t=String(r.fact_type||''),name=teamName16(bundle,r.team_id),st=Number(r.payload?.streak||0);
        if(t==='WINLESS_STREAK'&&st)riskBits.push(`${name} are winless in ${st}`);
        else if(t==='CONCEDING_STREAK'&&st)riskBits.push(`${name} have conceded in ${st} straight`);
        else if(t==='LOSING_STREAK'&&st)riskBits.push(`${name} have lost ${st} straight`);
        else if(t==='FAILED_TO_SCORE_STREAK'&&st)riskBits.push(`${name} have failed to score in ${st} straight`);
      }
      if(riskBits.length)parts.push(`The main caution is recent form: ${riskBits.join(' and ')}.`);
    }
    return parts.slice(0,4).join(' ');
  }

  function evidenceGroup16(title,rows,klass=''){
    if(!rows?.length)return '';
    return `<div class="c0162-evidence-group ${klass}"><h4>${esc(title)}</h4>${rows.map(x=>`<div class="c0162-modal-fact"><span>${esc(x.one_liner)}</span></div>`).join('')}</div>`;
  }
  function evidenceBlock16(bundle,fi,ff){
    if(!bundle)return '';
    const all=bundle.modal_facts||[];
    const supports=distinctFacts16(all.filter(x=>x.alignment==='SUPPORTS'),5);
    const maxRisks=Math.min(2,supports.length);
    const risks=distinctFacts16(all.filter(x=>x.alignment==='CONTRADICTS'),maxRisks);
    const story=story16(fi||{home_team:bundle.home,away_team:bundle.away},ff,bundle);
    return `${story?`<div class="c0162-story"><span>Match story</span><p>${esc(story)}</p></div>`:''}<div class="c0162-modal-evidence"><h3>Evidence behind the call</h3>${evidenceGroup16('Supporting evidence',supports,'support')}${evidenceGroup16('Risks to the call',risks,'risk')}<small>Fact snapshot after GW${modalFactsPayload?.snapshot_run?.as_of_gameweek??'—'} · no target-fixture results used.</small></div>`;
  }

  function baseModal16(id,fi,ff,mk,bundle){
    const home=fi?.home_team||bundle?.home||{name:ff?.home_team||mk?.home_team},away=fi?.away_team||bundle?.away||{name:ff?.away_team||mk?.away_team};
    const finished=Boolean(fi?.finished||ff?.finished);
    const status=finished?'Finished':'Live pre-match';
    const intelligence=evidenceBlock16(bundle,fi,ff);
    return `<div class="drawer-kicker">GW${state.gw} fixture intelligence</div><h2 class="drawer-title">${esc(home?.name||'—')} vs ${esc(away?.name||'—')}</h2><div class="drawer-sub">${dateTime(fi?.kickoff_time||ff?.kickoff_time||mk?.kickoff_time)}</div><div class="hero-meta"><span class="chip ${finished?'green':'blue'}">${status}</span><span class="chip">Score call ${esc(modelScore(ff))}</span>${finished?`<span class="chip green">Actual ${actualScore(fi)}</span>`:''}</div>${intelligence}`;
  }

  openFixture=async function(id){
    const seq=++requestSeq,gw=Number(state.gw||0);
    try{await ensureModalFacts(gw)}catch(e){console.warn('C0164 modal fact preload failed',e)}
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
