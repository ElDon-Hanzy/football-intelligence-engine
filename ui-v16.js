(function(){
  // C0163/C0164 — atomic, human-readable matchup modal.
  // Opens only after the complete fact payload is ready. Raw tactical/replacement
  // research stays in storage/audit surfaces and is intentionally not dumped here.
  const FACT_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/fixture-facts-api';
  let factsGw=null,factsPayload=null,factsPromise=null,requestSeq=0;
  const bundles=new Map();
  const n=v=>num(v), pct16=(v,d=0)=>n(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`, f2=v=>n(v)==null?'—':Number(v).toFixed(2);

  function setBundles(j){bundles.clear();for(const f of j?.fixtures||[])bundles.set(Number(f.match_id),f)}
  async function ensureFacts(gw){
    gw=Number(gw||0);if(!gw)return null;
    if(factsGw===gw&&factsPayload)return factsPayload;
    if(factsPromise?.gw===gw)return factsPromise.promise;
    const promise=(async()=>{const r=await fetch(`${FACT_API}?gw=${gw}`,{cache:'no-store'}),j=await r.json();if(!r.ok||!j?.ok)throw new Error(j?.error||`HTTP ${r.status}`);if(Number(state.gw)!==gw)return null;factsPayload=j;factsGw=gw;setBundles(j);return j})();
    factsPromise={gw,promise};try{return await promise}finally{if(factsPromise?.promise===promise)factsPromise=null}
  }
  function thesis(ff){
    const mk=ff?.prediction?.markets||{},rows=[['H',n(mk.home_win)],['D',n(mk.draw)],['A',n(mk.away_win)]].filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]);
    return rows.length===3?{outcome:rows[0][0],prob:rows[0][1],secondOutcome:rows[1][0],second:rows[1][1],margin:rows[0][1]-rows[1][1]}:null;
  }
  function outcomeName(o,b,fi){const h=b?.home||fi?.home_team||{},a=b?.away||fi?.away_team||{};if(o==='H')return `${h.name||'Home'} win`;if(o==='A')return `${a.name||'Away'} win`;return 'draw'}
  function favDog(th,b,fi){const h=b?.home||fi?.home_team||{},a=b?.away||fi?.away_team||{};return th?.outcome==='H'?{fav:h,dog:a}:th?.outcome==='A'?{fav:a,dog:h}:{fav:null,dog:null}}
  function family(x){
    const t=String(x?.fact_type||'');
    if(t==='MODEL_SCORING_EDGE')return 'MODEL';
    if(t==='ATTACK_DEFENCE_XG_CONTRAST')return 'MATCHUP_XG';
    if(t==='SCORING_VS_CLEAN_SHEET')return 'SCORE_DEFENCE';
    if(t==='FAV_ATTACK_XG'||t==='FAV_GOAL_OUTPUT')return 'ATTACK_PROCESS';
    if(t==='FAV_SHOT_VOLUME')return 'SHOT_VOLUME';
    if(t==='OPP_GOALS_CONCEDED')return 'OPP_DEFENCE';
    if(['WINNING_STREAK','UNBEATEN_STREAK','WINLESS_STREAK','LOSING_STREAK'].includes(t))return 'RESULT_STREAK';
    if(['SCORING_STREAK','FAILED_TO_SCORE_STREAK','CONCEDING_STREAK','CLEAN_SHEET_STREAK'].includes(t))return 'SCORING_STREAK';
    if(t==='HOME_AWAY_FORM')return 'VENUE_FORM';return t||'OTHER';
  }
  function distinct(rows,max=5){
    const fam=new Set(),txt=new Set(),out=[];
    for(const x of [...(rows||[])].sort((a,b)=>Number(b.usefulness_score)-Number(a.usefulness_score))){const f=family(x),t=String(x.one_liner||'').trim().replace(/\s+/g,' ').toLowerCase();if(!t||fam.has(f)||txt.has(t))continue;fam.add(f);txt.add(t);out.push(x);if(out.length>=max)break}return out;
  }
  const byType=(rows,...types)=>(rows||[]).find(x=>types.includes(String(x.fact_type||'')))||null;
  function teamName(b,id){if(Number(b?.home?.id)===Number(id))return b.home.name;if(Number(b?.away?.id)===Number(id))return b.away.name;return 'The team'}

  function story(fi,ff,b){
    const th=thesis(ff),all=b?.modal_facts||[];if(!th)return '';
    const supports=distinct(all.filter(x=>x.alignment==='SUPPORTS'),6),risks=distinct(all.filter(x=>x.alignment==='CONTRADICTS'),3),{fav,dog}=favDog(th,b,fi),favName=fav?.name||'The slight favourite',dogName=dog?.name||'the opponent',parts=[];
    const weak=th.margin<0.05;
    if(th.outcome==='D')parts.push(`This is a balanced matchup: the draw is the single most likely outcome at ${pct16(th.prob)}.`);
    else if(weak)parts.push(`There is no clear 1X2 edge here. ${favName} are only a slight lean at ${pct16(th.prob)}, with the next outcome at ${pct16(th.second)}.`);
    else parts.push(`${favName} are favoured at ${pct16(th.prob)}, with a ${pct16(th.margin)} gap to the next 1X2 outcome.`);

    const model=byType(supports,'MODEL_SCORING_EDGE'),contrast=byType(supports,'ATTACK_DEFENCE_XG_CONTRAST'),attack=byType(supports,'FAV_ATTACK_XG'),scoreDef=byType(supports,'SCORING_VS_CLEAN_SHEET');
    if(model){const a=n(model.payload?.fav_lambda),d=n(model.payload?.dog_lambda);if(a!=null&&d!=null)parts.push(`The main structural reason is the scoring projection: about ${f2(a)} expected goals for ${favName} versus ${f2(d)} for ${dogName}.`)}
    if(contrast){const a=n(contrast.payload?.team_xgf_l5),d=n(contrast.payload?.opponent_xga_l5);if(a!=null&&d!=null)parts.push(`Recent chance quality supports that direction, with ${favName} creating about ${f2(a)} xG per game while ${dogName} have been allowing about ${f2(d)}.`)}
    else if(attack){const a=n(attack.payload?.xg_for_l5);if(a!=null)parts.push(`${favName}'s underlying attack remains strong at roughly ${f2(a)} xG per league game across the last five.`)}
    else if(scoreDef)parts.push(`The recent scoring-versus-defence pattern also supports the lean.`);

    if(risks.length){const bits=[];for(const r of risks.slice(0,2)){const t=String(r.fact_type||''),name=teamName(b,r.team_id),st=Number(r.payload?.streak||0);if(t==='WINLESS_STREAK'&&st)bits.push(`${name} are winless in ${st}`);else if(t==='CONCEDING_STREAK'&&st)bits.push(`${name} have conceded in ${st} straight`);else if(t==='LOSING_STREAK'&&st)bits.push(`${name} have lost ${st} straight`);else if(t==='FAILED_TO_SCORE_STREAK'&&st)bits.push(`${name} have failed to score in ${st} straight`)}if(bits.length)parts.push(`The main caution is recent form: ${bits.join(' and ')}.`)}
    return parts.slice(0,4).join(' ');
  }
  function group(title,rows,klass=''){if(!rows?.length)return '';return `<div class="c0162-evidence-group ${klass}"><h4>${esc(title)}</h4>${rows.map(x=>`<div class="c0162-modal-fact"><span>${esc(x.one_liner)}</span></div>`).join('')}</div>`}
  function evidence(b,fi,ff){
    if(!b)return '';
    const all=b.modal_facts||[],th=thesis(ff),supports=distinct(all.filter(x=>x.alignment==='SUPPORTS'),5),risks=distinct(all.filter(x=>x.alignment==='CONTRADICTS'),Math.min(2,supports.length)),weak=!!th&&th.margin<0.05,s=story(fi||{home_team:b.home,away_team:b.away},ff,b);
    const heading=weak?'Evidence around the lean':'Evidence behind the call';
    return `${s?`<div class="c0162-story"><span>Match story</span><p>${esc(s)}</p></div>`:''}<div class="c0162-modal-evidence"><h3>${heading}</h3>${group(weak?'Supporting evidence':'Supporting evidence',supports,'support')}${group('Risks to the call',risks,'risk')}<small>Fact snapshot after GW${factsPayload?.snapshot_run?.as_of_gameweek??'—'} · no target-fixture results used.</small></div>`;
  }
  function modal(fi,ff,mk,b){
    const home=fi?.home_team||b?.home||{name:ff?.home_team||mk?.home_team},away=fi?.away_team||b?.away||{name:ff?.away_team||mk?.away_team},finished=Boolean(fi?.finished||ff?.finished),status=finished?'Finished':'Live pre-match';
    return `<div class="drawer-kicker">GW${state.gw} fixture intelligence</div><h2 class="drawer-title">${esc(home?.name||'—')} vs ${esc(away?.name||'—')}</h2><div class="drawer-sub">${dateTime(fi?.kickoff_time||ff?.kickoff_time||mk?.kickoff_time)}</div><div class="hero-meta"><span class="chip ${finished?'green':'blue'}">${status}</span><span class="chip">Score call ${esc(modelScore(ff))}</span>${finished?`<span class="chip green">Actual ${actualScore(fi)}</span>`:''}</div>${evidence(b,fi,ff)}`;
  }

  openFixture=async function(id){
    const seq=++requestSeq,gw=Number(state.gw||0);try{await ensureFacts(gw)}catch(e){console.warn('C0164 modal fact preload failed',e)}if(seq!==requestSeq||Number(state.gw)!==gw)return;
    const fi=fixtureIntel(id),ff=fixtureFpl(id),mk=fixtureMarket(id);if(!fi&&!ff&&!mk)return;const root=$('drawerContent');if(!root)return;root.innerHTML=modal(fi,ff,mk,bundles.get(Number(id))||null);openDrawer();
  };

  const boot=setInterval(()=>{const gw=Number(state.gw||0);if(gw&&factsGw!==gw&&!factsPromise)ensureFacts(gw).catch(()=>{});if(gw&&factsGw===gw)clearInterval(boot)},500);setTimeout(()=>clearInterval(boot),45000);
})();
