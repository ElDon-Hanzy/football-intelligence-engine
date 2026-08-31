(function(){
  // C0148 — live-visible shadow intelligence + actual outcomes. Production forecasts remain unchanged.
  const HUMAN_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/human-insights-api';
  const OBS_API='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/observation-results-api';
  const priorLoad=load,priorRender=render,priorOpenFixture=window.openFixture;
  let h9=null,o9=null,gw9=null,busy=false;

  const pc9=(v,d=0)=>num(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`;
  const n9=(v,d=2)=>num(v)==null?'—':Number(v).toFixed(d);
  const fixtureXg=(p)=>{const q=Number(p);return Number.isFinite(q)&&q>0&&q<1?-Math.log(1-q):q>=1?null:0};
  const pois=(k,l)=>{if(!Number.isFinite(l)||l<0)return null;let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f};

  async function sync9(){
    const gw=Number(state.gw||0);if(!gw||busy)return;busy=true;
    try{
      const [hr,or]=await Promise.all([fetch(`${HUMAN_API}?gw=${gw}`,{cache:'no-store'}),fetch(`${OBS_API}?gw=${gw}`,{cache:'no-store'})]);
      const [hj,oj]=await Promise.all([hr.json(),or.json()]);
      if(hr.ok&&hj?.ok)h9=hj;if(or.ok&&oj?.ok)o9=oj;gw9=gw;render();
    }catch(e){console.warn('Observation/result layer unavailable',e)}finally{busy=false}
  }
  load=async function(gw=0){await priorLoad(gw);await sync9();};
  render=function(){priorRender();setTimeout(enhance,0)};

  function teamFinished(team){return (o9?.fixtures||[]).some(f=>f.finished&&(f.home===team||f.away===team))}
  function actualMap(){return new Map((o9?.player_actuals||[]).map(x=>[Number(x.player_id),x]))}
  function fixtureMap(){return new Map((o9?.fixtures||[]).map(x=>[Number(x.match_id),x]))}
  function actualTop10(){
    if(!o9?.result_run?.is_final)return new Set();
    return new Set([...(o9.player_actuals||[])].sort((a,b)=>Number(b.total_points)-Number(a.total_points)||Number(b.minutes)-Number(a.minutes)).slice(0,10).map(x=>Number(x.player_id)));
  }
  function observationBanner(){
    if(!(o9?.fixtures||[]).some(f=>f.under_observation))return null;
    const div=document.createElement('div');div.className='observation-banner';
    div.innerHTML='<div><strong>Matchup layer · UNDER OBSERVATION</strong><span>Live shadow numbers are shown beside production forecasts. They do not yet drive FPL or betting decisions.</span></div><b>Research only</b>';
    return div;
  }
  function addBanner(){const head=document.querySelector('.human-page-head');if(!head||document.querySelector('.observation-banner'))return;const b=observationBanner();if(b)head.insertAdjacentElement('afterend',b)}

  function actualStrip(a,withTick=false){
    const d=document.createElement('div');d.className='actual-result-strip';
    d.innerHTML=`${withTick?'<span class="hit-mark">✓</span>':''}<div><span>Actual result</span><strong>${a.total_points} pts</strong><small>${a.minutes} min${a.goals?` · ${a.goals}G`:''}${a.assists?` · ${a.assists}A`:''}${num(a.xg)!=null?` · xG ${n9(a.xg)}`:''}${num(a.xa)!=null?` · xA ${n9(a.xa)}`:''}</small></div>`;
    return d;
  }
  function enhancePlayers(){
    if(!h9||!o9)return;const am=actualMap(),topActual=actualTop10();
    document.querySelectorAll('.captain-card[data-player]').forEach(card=>{
      const id=Number(card.dataset.player),x=(h9.captain_candidates||[]).find(p=>Number(p.id)===id);if(!x)return;
      const ev=card.querySelectorAll('.evidence-grid > div');
      if(ev[0])ev[0].innerHTML=`<span>Fixture xG*</span><b>${n9(fixtureXg(x.p_goal))}</b>`;
      if(ev[1])ev[1].innerHTML=`<span>Fixture xA*</span><b>${n9(fixtureXg(x.p_assist))}</b>`;
      if(!card.querySelector('.fixture-xg-note')){const s=document.createElement('small');s.className='fixture-xg-note';s.textContent='*Fixture-conditioned scoring/assist expectation derived from the model event probabilities.';card.appendChild(s)}
      const a=am.get(id);if(a&&teamFinished(x.team)&&!card.querySelector('.actual-result-strip'))card.appendChild(actualStrip(a,false));
    });
    document.querySelectorAll('.human-player-row[data-player]').forEach(row=>{
      const id=Number(row.dataset.player),x=(h9.top_players||[]).find(p=>Number(p.id)===id),a=am.get(id);if(!x||!a||!teamFinished(x.team)||row.querySelector('.row-actual'))return;
      const s=document.createElement('span');s.className=`row-actual ${topActual.has(id)?'actual-hit':''}`;s.innerHTML=`${topActual.has(id)?'<b>✓</b> ':''}${a.total_points} actual`;row.appendChild(s);
    });
  }

  function observedProb(rec,fx){
    const o=fx?.under_observation;if(!o)return null;const mk=o.markets||{},sel=String(rec.selection||'');
    if(rec.type==='1X2'){if(sel==='Draw')return Number(mk.draw);if(sel===`${fx.home} win`)return Number(mk.home_win);if(sel===`${fx.away} win`)return Number(mk.away_win)}
    if(rec.type==='O/U 2.5')return sel==='Over 2.5'?Number(mk.over_2_5):Number(mk.under_2_5);
    if(rec.type==='BTTS')return sel==='BTTS Yes'?Number(mk.btts_yes):Number(mk.btts_no);
    if(rec.type==='Correct score'){const m=sel.match(/^(\d+)-(\d+)$/);if(m){const ph=pois(Number(m[1]),Number(o.home_lambda)),pa=pois(Number(m[2]),Number(o.away_lambda));return ph==null||pa==null?null:ph*pa}}
    return null;
  }
  function judge(rec,fx){
    if(!fx?.finished||!fx.actual)return null;const h=Number(fx.actual.home_score),a=Number(fx.actual.away_score),sel=String(rec.selection||'');
    if(rec.type==='Correct score')return sel===`${h}-${a}`;
    if(rec.type==='1X2'){if(sel==='Draw')return h===a;if(sel===`${fx.home} win`)return h>a;if(sel===`${fx.away} win`)return a>h}
    if(rec.type==='O/U 2.5')return sel==='Over 2.5'?(h+a)>=3:(h+a)<=2;
    if(rec.type==='BTTS')return sel==='BTTS Yes'?(h>0&&a>0):!(h>0&&a>0);
    return null;
  }
  function enhanceBets(){
    if(!h9||!o9)return;const fm=fixtureMap(),recs=h9.betting_recommendations||[];
    document.querySelectorAll('.bet-card[data-fixture]').forEach((card,i)=>{
      const rec=recs[i],fx=rec?fm.get(Number(rec.match_id)):null;if(!rec||!fx)return;
      if(fx.under_observation&&!card.querySelector('.shadow-strip')){
        const prob=observedProb(rec,fx),s=document.createElement('div');s.className='shadow-strip';
        s.innerHTML=`<span>UNDER OBSERVATION</span><b>${n9(fx.under_observation.home_lambda)} – ${n9(fx.under_observation.away_lambda)} xG${Number.isFinite(prob)?` · ${pc9(prob,1)}`:''}</b>`;card.appendChild(s);
      }
      const hit=judge(rec,fx);if(hit!==null&&!card.querySelector('.market-actual')){
        const d=document.createElement('div');d.className=`market-actual ${hit?'market-hit':'market-miss'}`;
        d.innerHTML=`<span class="market-mark">${hit?'✓':'×'}</span><div><span>Actual</span><strong>${fx.home} ${fx.actual.home_score}–${fx.actual.away_score} ${fx.away}</strong><small>${hit?'Prediction nailed':'Prediction missed'}</small></div>`;card.appendChild(d);
      }
    });
  }
  function enhance(){if(Number(state.gw)!==gw9)return;addBanner();enhancePlayers();enhanceBets()}

  if(typeof priorOpenFixture==='function')window.openFixture=async function(id){
    await priorOpenFixture(id);
    const fx=fixtureMap().get(Number(id));if(!fx?.under_observation)return;
    const root=document.querySelector('#drawerContent');if(!root||root.querySelector('.modal-observation'))return;
    const d=document.createElement('div');d.className='drawer-section modal-observation';
    const o=fx.under_observation,b=fx.baseline;
    d.innerHTML=`<h3>Matchup model · under observation</h3><div class="observation-banner"><div><strong>Shadow forecast</strong><span>This uses the C0147 matchup layer but remains excluded from production decisions.</span></div><b>Research only</b></div><div class="intel-stat-grid"><div><span>Production xG</span><b>${b?`${n9(b.home_lambda)}–${n9(b.away_lambda)}`:'—'}</b></div><div><span>Observed xG</span><b>${n9(o.home_lambda)}–${n9(o.away_lambda)}</b></div><div><span>Home win</span><b>${pc9(o.markets?.home_win)}</b></div><div><span>Draw</span><b>${pc9(o.markets?.draw)}</b></div><div><span>Away win</span><b>${pc9(o.markets?.away_win)}</b></div><div><span>Over 2.5</span><b>${pc9(o.markets?.over_2_5)}</b></div></div>`;
    root.appendChild(d);
  };

  const boot=setInterval(()=>{if(state.gw&&gw9!==Number(state.gw)&&!busy)sync9();if(gw9===Number(state.gw))clearInterval(boot)},350);
  setTimeout(()=>clearInterval(boot),12000);
})();