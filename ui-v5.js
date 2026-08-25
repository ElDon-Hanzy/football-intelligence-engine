(function(){
  // C0119 — explain score distributions and replace misleading delta-attribution with a result-hidden football thesis.
  // Presentation only: no forecast/model mutation.
  const priorPerformance=renderPerformance;

  function poisson(k,lambda){
    const l=num(lambda);if(l==null||l<0)return null;
    let fact=1;for(let i=2;i<=k;i++)fact*=i;
    return Math.exp(-l)*Math.pow(l,k)/fact;
  }
  function exactScoreDistribution(homeLambda,awayLambda){
    const h=num(homeLambda),a=num(awayLambda);if(h==null||a==null)return [];
    const rows=[];
    for(let hg=0;hg<=8;hg++)for(let ag=0;ag<=8;ag++){
      rows.push({score:`${hg}-${ag}`,probability:poisson(hg,h)*poisson(ag,a)});
    }
    return rows.sort((x,y)=>y.probability-x.probability);
  }
  function scoreSummary(model){
    const h=num(model?.home_lambda),a=num(model?.away_lambda);if(h==null||a==null)return 'Expected-goal distribution unavailable.';
    const top=exactScoreDistribution(h,a).slice(0,3);
    return `<span class="c0119-xg">Expected goals: <strong>${h.toFixed(2)} – ${a.toFixed(2)}</strong> · mean total <strong>${(h+a).toFixed(2)}</strong></span><span class="c0119-scores">Most likely exact scores: ${top.map(x=>`<strong>${esc(x.score)}</strong> ${pct(x.probability)}`).join(' · ')}</span>`;
  }
  function rawDirection(s){return String(s?.direction_code||s?.direction||'');}
  function salience(s){
    const v=num(s?.score);if(v==null)return -1;
    const type=String(s?.score_type||'');
    if(type==='ADVANTAGE')return Math.abs(v-.5)*2;
    if(type==='DISRUPTION')return v>=.18?.30+v*.45:.04;
    if(type==='OPPORTUNITY')return v>=.55?.18+(v-.55)*.60:.02;
    return 0;
  }
  function signalName(k){return ({
    wide_channel_pressure:'wide-channel matchup',
    aerial_set_piece_mismatch:'aerial/set-piece matchup',
    central_creation_vs_block:'central-creation matchup',
    direct_transition_opportunity:'transition opportunity',
    personnel_disruption:'personnel disruption'
  })[String(k||'')]||String(k||'').replaceAll('_',' ');}
  function bestCounterSignal(signals){
    return [...(signals||[])]
      .filter(s=>num(s?.score)!=null&&!rawDirection(s).includes('INSUFFICIENT')&&!rawDirection(s).includes('NO_PREMATCH'))
      .sort((a,b)=>salience(b)-salience(a))[0]||null;
  }
  function materialAdjustment(side){
    if(!side)return null;
    const labels={recent_attack:'recent attacking xG trend',opponent_recent_defence:'opponent defensive xG trend',schedule_fatigue:'rest / congestion',transition:'transition opportunity',personnel_attack:'own personnel',opponent_personnel_defence:'opponent personnel'};
    return Object.entries(side)
      .filter(([k,v])=>labels[k]&&v&&num(v.contribution)!=null&&Math.abs(Math.exp(Number(v.contribution))-1)>=.01)
      .map(([k,v])=>({label:labels[k],effect:Math.exp(Number(v.contribution))-1}))
      .sort((a,b)=>Math.abs(b.effect)-Math.abs(a.effect))[0]||null;
  }
  function preMatchThesis(f){
    const s=f?.shadow||{},m=s.markets||{},home=f?.home_team?.name||'Home',away=f?.away_team?.name||'Away';
    const hp=num(m.home_win),dp=num(m.draw),ap=num(m.away_win),hl=num(s.home_lambda),al=num(s.away_lambda);
    if(hp==null||dp==null||ap==null||hl==null||al==null)return '<p>Not enough preserved pre-match evidence to form a defensible thesis.</p>';
    const max=Math.max(hp,dp,ap),fav=max===hp?home:max===ap?away:null,underdog=max===hp?away:max===ap?home:null;
    const favProb=max;
    const underdogBlank=max===hp?num(m.home_clean_sheet):max===ap?num(m.away_clean_sheet):null;
    const bttsNo=num(m.btts_no);
    const replay=(state.replay?.fixtures||[]).find(x=>Number(x.match_id)===Number(f.match_id))||null;
    const underdogSignals=max===hp?replay?.signals?.away:max===ap?replay?.signals?.home:[];
    const counter=bestCounterSignal(underdogSignals);
    const venue=f?.adjustments?.policy?.venue_calibration||null;
    const sideAdj=max===hp?materialAdjustment(f?.adjustments?.home):max===ap?materialAdjustment(f?.adjustments?.away):null;

    const sentences=[];
    if(fav){
      const favXg=max===hp?hl:al,oppXg=max===hp?al:hl;
      sentences.push(`${esc(fav)} were the clear pre-match favourite: <strong>${pct(favProb)}</strong> to win, with a <strong>${favXg.toFixed(2)}–${oppXg.toFixed(2)}</strong> expected-goal edge.`);
      if(venue?.total_preserved===true){
        sentences.push(`Historical home/away evidence did not raise the match's total goal expectation; it shifted a larger share of the same <strong>${(hl+al).toFixed(2)}</strong> expected goals toward ${esc(fav)}.`);
      }else if(sideAdj){
        sentences.push(`${esc(fav)} also had a material pre-match ${esc(sideAdj.label)} signal (${sideAdj.effect>0?'supportive':'negative'} by about ${Math.abs(sideAdj.effect*100).toFixed(1)}%).`);
      }
      if(underdogBlank!=null){
        sentences.push(`${esc(underdog)} had a <strong>${pct(underdogBlank)}</strong> chance of being held scoreless${bttsNo!=null?`, with BTTS No at <strong>${pct(bttsNo)}</strong>`:''}; a blank was plausible, not certain.`);
      }
      if(counter){
        const d=rawDirection(counter),phrase=counter.signal_key==='direct_transition_opportunity'?'transition opportunity':signalName(counter.signal_key);
        sentences.push(`${esc(underdog)}'s clearest counter-case was ${esc(phrase)}${d.includes('OPPORTUNITY')?'':' in the preserved matchup evidence'}, so the clean-sheet view still carried meaningful risk.`);
      }
    }else{
      sentences.push(`The pre-match probabilities were comparatively balanced: home ${pct(hp)}, draw ${pct(dp)}, away ${pct(ap)}, with ${hl.toFixed(2)}–${al.toFixed(2)} expected goals.`);
      if(bttsNo!=null)sentences.push(`BTTS No was ${pct(bttsNo)}, so neither a clean sheet nor both teams scoring was a dominant scenario.`);
    }

    const personnelKnown=[...(replay?.signals?.home||[]),...(replay?.signals?.away||[])].some(x=>x.signal_key==='personnel_disruption'&&!rawDirection(x).includes('NO_PREMATCH'));
    const caveat=personnelKnown?'':'<span class="c0119-caveat">Personnel/injury claims are omitted where no reliable pre-kickoff availability capture was preserved. H2H is also omitted unless sourced in the decision-state evidence.</span>';
    return `<p>${sentences.join(' ')}</p>${caveat}`;
  }
  function upgrade(html){
    if(!state.replay?.enriched_shadow?.fixtures?.length)return html;
    const host=document.createElement('div');host.innerHTML=html;
    const cards=[...host.querySelectorAll('.shadow-match-card')],fixtures=state.replay.enriched_shadow.fixtures||[];
    cards.forEach((card,i)=>{
      const f=fixtures[i];if(!f)return;
      const grid=card.querySelector('.shadow-compare-grid'),states=grid?[...grid.querySelectorAll('.shadow-state')]:[];
      if(states[0]){const small=states[0].querySelector('small');if(small)small.innerHTML=scoreSummary(f.baseline);}
      if(states[1]){const small=states[1].querySelector('small');if(small)small.innerHTML=scoreSummary(f.shadow);}

      let postMatch=null;
      if(states[2]){
        postMatch=document.createElement('div');postMatch.className='c0119-postmatch';
        postMatch.innerHTML=`<b>Post-match audit <span>revealed after the thesis was fixed</span></b><div class="c0119-postmatch-body">${states[2].innerHTML}</div>`;
        states[2].remove();
        const arrows=grid?[...grid.querySelectorAll('.shadow-arrow')]:[];if(arrows.length)arrows.at(-1).remove();
      }
      card.querySelector('.shadow-movement')?.remove();
      const reasons=card.querySelector('.shadow-reasons');
      if(reasons){
        const thesis=document.createElement('div');thesis.className='c0119-thesis';
        thesis.innerHTML=`<b>Pre-match thesis <span>result-hidden reasoning</span></b>${preMatchThesis(f)}`;
        reasons.replaceWith(thesis);
        if(postMatch)thesis.insertAdjacentElement('afterend',postMatch);
      }else if(postMatch){card.appendChild(postMatch);}
    });
    return host.innerHTML;
  }
  renderPerformance=function(){return upgrade(priorPerformance());};
})();
