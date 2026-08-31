(function(){
  // C0158 — decision-readable fixture cards: 1X2 thesis, audit tick and concrete evidence facts.
  // Presentation/data-context only. Frozen forecast probabilities are never changed.
  const priorRenderFixtureCard=renderFixtureCard;

  const p13=(v,d=0)=>num(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`;
  const f13=(v,d=2)=>num(v)==null?'—':Number(v).toFixed(d);
  const norm13=v=>String(v||'').trim().replaceAll('–','-').replace(/\s+/g,'');
  const scoreOutcome13=s=>{const m=norm13(s).match(/^(\d+)-(\d+)$/);if(!m)return null;const h=Number(m[1]),a=Number(m[2]);return h>a?'H':h<a?'A':'D'};
  const done13=(f,ff)=>Boolean(f?.finished||ff?.finished);
  const actualScore13=(f,ff)=>{const done=done13(f,ff),h=ff?.home_score??f?.home_score,a=ff?.away_score??f?.away_score;return done&&h!=null&&a!=null?`${h}-${a}`:'—'};
  const actualOutcome13=(f,ff)=>scoreOutcome13(actualScore13(f,ff));

  function thesis13(ff){
    const mk=ff?.prediction?.markets||{};
    const rows=[['H',num(mk.home_win)],['D',num(mk.draw)],['A',num(mk.away_win)]].filter(x=>x[1]!=null);
    if(rows.length!==3)return null;rows.sort((a,b)=>b[1]-a[1]);
    return {outcome:rows[0][0],prob:rows[0][1],margin:rows[0][1]-rows[1][1]};
  }
  function outcomeName13(o,f){
    if(o==='H')return `${f.home_team?.name||'Home'} win`;
    if(o==='A')return `${f.away_team?.name||'Away'} win`;
    return 'Draw';
  }
  function shortOutcome13(o,f){
    if(o==='H')return `${f.home_team?.short_name||f.home_team?.name||'HOME'} WIN`;
    if(o==='A')return `${f.away_team?.short_name||f.away_team?.name||'AWAY'} WIN`;
    return 'DRAW';
  }
  function scoreMeta13(ff){
    const rows=ff?.prediction?.top_scorelines||[];
    const score=modelScore(ff),p=num(rows?.[0]?.prob??rows?.[0]?.probability),p2=num(rows?.[1]?.prob??rows?.[1]?.probability);
    return {score,p,close:p!=null&&p2!=null&&Math.abs(p-p2)<.02,rows};
  }
  function bestInOutcome13(rows,o){
    for(const r of rows||[]){const score=String(r?.score||'');if(scoreOutcome13(score)===o)return {score,p:num(r?.prob??r?.probability)}}
    return null;
  }
  function teamLink13(t,away=false){
    const id=Number(t?.id||0);
    if(id)return `<button class="fixture-team-link ${away?'away':''}" data-team="${id}"><strong>${esc(t.short_name||t.name||'—')}</strong><span>${esc(t.name||'—')}</span></button>`;
    return `<div class="team-block ${away?'away':''}"><strong>${esc(t?.short_name||t?.name||'—')}</strong><span>${esc(t?.name||'—')}</span></div>`;
  }

  function factCandidates13(f,th){
    const out=[];
    const add=(score,text)=>{if(text&&!out.some(x=>x.text===text))out.push({score,text})};
    const home=f.home_team||{},away=f.away_team||{};
    const fav=th?.outcome==='H'?home:th?.outcome==='A'?away:null;
    const dog=th?.outcome==='H'?away:th?.outcome==='A'?home:null;
    const favForm=fav?.recent_form,dogForm=dog?.recent_form;

    if(fav&&favForm?.sample>=5){
      const n=Number(favForm.sample),cs=Number(favForm.clean_sheets||0),avgGa=num(favForm.avg_goals_against),avgXga=num(favForm.avg_xg_against),avgXgf=num(favForm.avg_xg_for);
      if(cs/n>=.5)add(100,`${fav.name}: ${cs}/${n} clean sheets in the last ${n} PL matches`);
      else if(avgGa!=null&&avgGa<=.9)add(92,`${fav.name}: only ${f13(avgGa)} goals conceded per match over the last ${n}`);
      else if(avgXga!=null&&avgXga<=1.0)add(88,`${fav.name}: ${f13(avgXga)} xGA per match over the last ${n}`);
      if(avgXgf!=null&&avgXgf>=1.7)add(76,`${fav.name}: ${f13(avgXgf)} xG per match over the last ${n}`);
    }
    if(dog&&dogForm?.sample>=5){
      const n=Number(dogForm.sample),blanks=Number(dogForm.scoring_blanks||0),avgGf=num(dogForm.avg_goals_for),avgGa=num(dogForm.avg_goals_against),avgXgf=num(dogForm.avg_xg_for),avgXga=num(dogForm.avg_xg_against);
      if(blanks/n>=.3)add(98,`${dog.name}: failed to score in ${blanks}/${n} of the last ${n} PL matches`);
      else if(avgXgf!=null&&avgXgf<=1.1)add(90,`${dog.name}: only ${f13(avgXgf)} xG per match over the last ${n}`);
      if(avgGa!=null&&avgGa>=1.5)add(84,`${dog.name}: ${f13(avgGa)} goals conceded per match over the last ${n}`);
      else if(avgXga!=null&&avgXga>=1.6)add(80,`${dog.name}: ${f13(avgXga)} xGA per match over the last ${n}`);
      if(avgGf!=null&&avgGf<=.9)add(82,`${dog.name}: ${f13(avgGf)} goals scored per match over the last ${n}`);
    }

    if(!fav&&home.recent_form?.sample>=5&&away.recent_form?.sample>=5){
      const hf=home.recent_form,af=away.recent_form;
      if(num(hf.avg_goals_against)!=null&&num(af.avg_goals_against)!=null&&Number(hf.avg_goals_against)<=1&&Number(af.avg_goals_against)<=1)add(88,`Both sides concede 1.0 goal per match or fewer across their recent PL windows`);
      if(num(hf.avg_xg_for)!=null&&num(af.avg_xg_for)!=null&&Number(hf.avg_xg_for)<=1.3&&Number(af.avg_xg_for)<=1.3)add(84,`Both attacks are below 1.3 xG per match across their recent PL windows`);
    }

    const h=f.h2h;
    if(h?.sample>=3){
      const n=Number(h.sample),under=Number(h.under_2_5||0),btts=Number(h.btts||0),wins=Number(h.wins||0),draws=Number(h.draws||0);
      if(under/n>=.75)add(72,`${under}/${n} recent H2Hs finished under 2.5 goals`);
      if(btts/n<=.25)add(68,`Both teams scored in only ${btts}/${n} recent H2Hs`);
      if(th?.outcome==='H'&&wins/n>=.75)add(66,`${home.name} won ${wins}/${n} recent H2Hs`);
      if(th?.outcome==='D'&&draws/n>=.5)add(64,`${draws}/${n} recent H2Hs were draws`);
    }

    // Tactical research is only a fallback when concrete history cannot supply two useful facts.
    if(out.length<2){
      const sigs=[...(home.matchup_signals||[]),...(away.matchup_signals||[])].filter(s=>num(s?.confidence)!=null&&num(s?.score)!=null).sort((a,b)=>Number(b.confidence)-Number(a.confidence));
      const s=sigs.find(x=>/ADVANTAGE|OPPORTUNITY|MATERIAL_DISRUPTION|DEFENSIVE_RESISTANCE/i.test(String(x.direction||'')));
      if(s)add(45,`${shortSignal(s.signal_key)} — ${String(s.direction||'').replaceAll('_',' ').toLowerCase()}`);
    }
    return out.sort((a,b)=>b.score-a.score).slice(0,3);
  }

  renderFixtureCard=function(f){
    const ff=fixtureFpl(f.match_id);
    if(!ff?.prediction)return priorRenderFixtureCard(f);
    const done=done13(f,ff),th=thesis13(ff),sm=scoreMeta13(ff),actual=actualScore13(f,ff),actualOutcome=actualOutcome13(f,ff);
    const rawOutcome=scoreOutcome13(sm.score),conflict=!!(th&&rawOutcome&&rawOutcome!==th.outcome&&!done);
    const best=th?bestInOutcome13(sm.rows,th.outcome):null;
    const exactHit=done&&sm.score!=='—'&&norm13(sm.score)===norm13(actual);
    const outcomeHit=done&&th&&actualOutcome===th.outcome;
    const outcomeMiss=done&&th&&actualOutcome&&actualOutcome!==th.outcome;
    const facts=factCandidates13(f,th);
    const statusFixture={...f,finished:done};
    const [status,cls]=matchStatus(statusFixture);
    const exactValue=conflict?'Unresolved':sm.score;
    const exactNote=conflict?`Raw mode ${sm.score}${sm.p!=null?` ${p13(sm.p,1)}`:''}${best?` · best ${outcomeName13(th.outcome,f).toLowerCase()} score ${best.score}${best.p!=null?` ${p13(best.p,1)}`:''}`:''}`:(sm.close?'Tight top-score race':'');

    return `<article class="fixture-card fixture-card-v13" data-fixture="${f.match_id}">
      <div class="fixture-top"><span class="fixture-time">${dateOnly(f.kickoff_time)} · ${timeOnly(f.kickoff_time)}</span><span class="badge ${cls}">${status}</span></div>
      ${th?`<div class="fixture-outcome-pick ${outcomeHit?'hit':outcomeMiss?'miss':''}"><span>1X2 PICK</span><strong>${esc(shortOutcome13(th.outcome,f))} · ${p13(th.prob)}</strong>${outcomeHit?'<i aria-label="Correct 1X2 prediction">✓</i>':outcomeMiss?'<i class="miss" aria-label="Incorrect 1X2 prediction">×</i>':''}</div>`:''}
      <div class="fixture-teams">
        ${teamLink13(f.home_team)}
        <div class="fixture-score-pair">
          <div class="fixture-score-line predicted"><span>Exact score${sm.p!=null&&!conflict?` · ${p13(sm.p,1)}`:''}</span><strong>${esc(exactValue)}</strong>${exactNote?`<small class="score-edge-note">${esc(exactNote)}</small>`:''}</div>
          <div class="fixture-score-line actual ${exactHit?'exact-hit':''}"><span>Actual</span><strong>${esc(actual)}${exactHit?'<i class="fixture-hit-mark" aria-label="Correct exact score">✓</i>':''}</strong></div>
        </div>
        ${teamLink13(f.away_team,true)}
      </div>
      ${facts.length?`<div class="fixture-facts"><b>Why this call</b>${facts.map(x=>`<span>${esc(x.text)}</span>`).join('')}</div>`:''}
    </article>`;
  };
})();