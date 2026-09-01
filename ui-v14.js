(function(){
  // C0161 — align fixture cards with C0159 production truth and simplify mobile decision presentation.
  // Presentation only. Raw fixture probabilities remain immutable and auditable.
  const priorRenderFixtureCard=renderFixtureCard;
  const priorRenderFixtures=renderFixtures;

  const n14=v=>num(v);
  const pc14=(v,d=0)=>n14(v)==null?'—':`${(Number(v)*100).toFixed(d)}%`;
  const norm14=v=>String(v||'').trim().replaceAll('–','-').replace(/\s+/g,'');
  const out14=s=>{const m=norm14(s).match(/^(\d+)-(\d+)$/);if(!m)return null;const h=Number(m[1]),a=Number(m[2]);return h>a?'H':h<a?'A':'D'};
  const dispScore14=s=>String(s||'—').replace('-', '–');

  function thesis14(ff){
    const mk=ff?.prediction?.markets||{};
    const rows=[['H',n14(mk.home_win)],['D',n14(mk.draw)],['A',n14(mk.away_win)]].filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]);
    if(rows.length!==3)return null;
    return {outcome:rows[0][0],prob:rows[0][1],second:rows[1][1],margin:rows[0][1]-rows[1][1]};
  }
  function outcomeLabel14(o,f,short=false){
    if(o==='H')return short?(f.home_team?.short_name||f.home_team?.name||'HOME'):(f.home_team?.name||'Home');
    if(o==='A')return short?(f.away_team?.short_name||f.away_team?.name||'AWAY'):(f.away_team?.name||'Away');
    return 'Draw';
  }
  function scoreRows14(ff){
    return (ff?.prediction?.top_scorelines||[]).map(r=>({score:String(r?.score||''),p:n14(r?.prob??r?.probability)})).filter(r=>r.score&&r.p!=null);
  }
  function resolveScore14(ff,th){
    const rows=scoreRows14(ff),raw=rows[0]||{score:modelScore(ff),p:n14(ff?.prediction?.top_scoreline_probability)};
    const rawOutcome=out14(raw.score);
    const inOutcome=rows.filter(r=>out14(r.score)===th?.outcome);
    const best=inOutcome[0]||null;
    const explicit=ff?.prediction?.headline_score?{score:String(ff.prediction.headline_score),p:n14(ff.prediction.headline_score_probability),source:'api'}:null;
    if(explicit){
      const alt=inOutcome.find(r=>norm14(r.score)!==norm14(explicit.score))||null;
      return {headline:explicit,raw,alt,changed:norm14(explicit.score)!==norm14(raw.score),rule:'production'};
    }
    // Backward-compatible mirror of the frozen C0159 presentation gate until fpl-api exposes headline fields.
    const conflict=!!(th&&rawOutcome&&rawOutcome!==th.outcome);
    const tight=!!(best&&raw.p!=null&&best.p!=null&&Math.abs(raw.p-best.p)<=0.02);
    const strong=!!(th&&th.margin>=0.08);
    const headline=conflict&&tight&&strong?best:raw;
    const alt=inOutcome.find(r=>norm14(r.score)!==norm14(headline.score))||null;
    return {headline,raw,alt,changed:norm14(headline.score)!==norm14(raw.score),rule:conflict&&tight&&strong?'c0159_gate':'raw'};
  }
  function teamLink14(t,away=false){
    const id=Number(t?.id||0),abbr=t?.short_name||t?.name||'—';
    if(id)return `<button class="fixture-v14-team ${away?'away':''}" data-team="${id}"><strong>${esc(abbr)}</strong><span>${esc(t?.name||'—')}</span></button>`;
    return `<div class="fixture-v14-team ${away?'away':''}"><strong>${esc(abbr)}</strong><span>${esc(t?.name||'—')}</span></div>`;
  }
  function rationale14(f,ff,th,res){
    const p=ff?.prediction||{},hl=n14(p.home_lambda),al=n14(p.away_lambda);
    const fav=th?.outcome==='H'?f.home_team:th?.outcome==='A'?f.away_team:null;
    const dog=th?.outcome==='H'?f.away_team:th?.outcome==='A'?f.home_team:null;
    const favLam=th?.outcome==='H'?hl:th?.outcome==='A'?al:null;
    const dogLam=th?.outcome==='H'?al:th?.outcome==='A'?hl:null;
    const facts=[];
    if(fav&&dog&&favLam!=null&&dogLam!=null){
      facts.push(`<span><b>Structural scoring edge:</b> ${esc(fav.name||'Favourite')} ${favLam.toFixed(2)} vs ${esc(dog.name||'opponent')} ${dogLam.toFixed(2)} expected goals.</span>`);
    }
    if(res?.changed&&res.raw?.p!=null&&res.headline?.p!=null&&th){
      const gap=Math.abs(Number(res.raw.p)-Number(res.headline.p))*100;
      facts.push(`<span><b>Score tie-break:</b> ${esc(dispScore14(res.raw.score))} and ${esc(dispScore14(res.headline.score))} are only ${gap.toFixed(2)}pp apart; the ${pc14(th.prob)} ${esc(outcomeLabel14(th.outcome,f))}${th.outcome==='D'?'':' win'} thesis breaks the tie.</span>`);
    }else if(th){
      facts.push(`<span><b>Outcome edge:</b> ${pc14(th.prob)} for ${esc(outcomeLabel14(th.outcome,f))}${th.outcome==='D'?'':' to win'} vs ${pc14(th.second)} for the next outcome.</span>`);
    }
    return facts.slice(0,2).join('');
  }

  renderFixtureCard=function(f){
    const ff=fixtureFpl(f.match_id);
    if(f?.finished||ff?.finished||!ff?.prediction)return priorRenderFixtureCard(f);
    const th=thesis14(ff);if(!th)return priorRenderFixtureCard(f);
    const res=resolveScore14(ff,th);
    const selectedOutcome=th.outcome;
    const shortPick=selectedOutcome==='D'?'DRAW':`${outcomeLabel14(selectedOutcome,f,true)} WIN`;
    const alt=res.alt;
    const pairProb=res.headline?.p!=null&&alt?.p!=null?Number(res.headline.p)+Number(alt.p):null;
    const [status,cls]=matchStatus(f);
    const reason=rationale14(f,ff,th,res);
    return `<article class="fixture-card fixture-card-v14" data-fixture="${f.match_id}">
      <div class="fixture-top"><span class="fixture-time">${dateOnly(f.kickoff_time)} · ${timeOnly(f.kickoff_time)}</span><span class="badge ${cls}">${status}</span></div>
      <div class="fixture-v14-matchup">${teamLink14(f.home_team)}<span class="fixture-v14-vs">vs</span>${teamLink14(f.away_team,true)}</div>
      <div class="fixture-v14-pick"><span>Prediction</span><strong>${esc(shortPick)} <em>${pc14(th.prob)}</em></strong></div>
      <div class="fixture-v14-score"><span>Score call</span><strong>${esc(dispScore14(res.headline?.score||'—'))}</strong>${res.headline?.p!=null?`<small>${pc14(res.headline.p,1)} single-score probability</small>`:''}</div>
      ${alt?`<div class="fixture-v14-alt"><span>Alternative</span><b>${esc(dispScore14(alt.score))}</b>${pairProb!=null?`<small>Top two ${esc(outcomeLabel14(selectedOutcome,f).toLowerCase())}${selectedOutcome==='D'?'':'-win'} score paths: ${pc14(pairProb,1)}</small>`:''}</div>`:''}
      ${reason?`<div class="fixture-v14-why"><b>Why this call?</b>${reason}</div>`:''}
    </article>`;
  };

  renderFixtures=function(){
    const html=String(priorRenderFixtures());
    return html
      .replace('Current frozen / updating fixture state','Live pre-match forecast · updates until kickoff')
      .replace('Fixture intelligence v0.1','Fixture intelligence · live maturation')
      .replace('model_effect_enabled = false','Bounded production matchup effect')
      .replace('Expected XI, player roles, team style, replacement research and tactical matchups appear only where a genuine pre-kickoff snapshot exists. Historical blanks stay blank.','Current pre-match inputs feed the bounded production layer where promoted; frozen research tracks remain separate for validation. Historical blanks stay blank.');
  };
})();
