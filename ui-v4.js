(function(){
  API.calibration=`${ROOT}/calibration-summary`;
  state.calibration=state.calibration||null;

  const VARIANT_LABELS={
    BASE_V03_ELO:'Base · Elo team strength',
    FORM_ONLY:'Form only',
    TACTICAL_ONLY:'Tactical only',
    ROLE_PERSONNEL_ONLY:'Role + personnel only',
    QUALITY_ONLY:'Player quality only',
    TACTICAL_QUALITY:'Tactical + quality',
    FULL_V04_ELO_NO_SCHEDULE:'Combined · no schedule effect'
  };
  const variantLabel=k=>VARIANT_LABELS[k]||String(k||'').replaceAll('_',' ');
  const metricOrPending=(v,d=3)=>num(v)==null?'Pending':fmt(v,d);
  const pctOrPending=v=>num(v)==null?'Pending':pct(v);

  async function loadCalibration(gw){
    try{
      state.calibration=await getJson(`${API.calibration}?gw=${Number(gw)||1}`);
      delete state.errors.calibration;
    }catch(e){
      state.calibration=null;
      state.errors.calibration=e?.message||String(e);
    }
  }

  function integrityOk(i){
    return i&&!i.ablation_actual_data_used&&!i.ablation_model_effect_enabled&&!i.walk_actual_data_used&&!i.walk_model_effect_enabled&&
      Number(i.prediction_actual_data_violations||0)===0&&Number(i.prediction_model_effect_violations||0)===0&&
      Number(i.cohort_actual_data_violations||0)===0&&Number(i.cohort_model_effect_violations||0)===0;
  }
  function splitInfo(f,split){return (f?.coverage?.splits||[]).find(x=>x.split===split)||{};}
  function variantRows(f){
    const variants=[...new Set((f?.variants||[]).map(x=>x.variant_key))];
    return variants.map(key=>{
      const val=(f.variants||[]).find(x=>x.variant_key===key&&x.split==='VALIDATION')||{};
      const test=(f.variants||[]).find(x=>x.variant_key===key&&x.split==='TEST')||{};
      return `<tr>
        <td><strong>${esc(variantLabel(key))}</strong><br><small>${esc(key)}</small></td>
        <td>${val.evaluated_fixtures??0}/${val.total_predictions??0}</td>
        <td>${metricOrPending(val.avg_brier)}</td>
        <td>${metricOrPending(val.avg_score_log_loss)}</td>
        <td>${pctOrPending(val.direction_accuracy)}</td>
        <td>${metricOrPending(val.avg_process_mae)}</td>
        <td>${test.evaluated_fixtures??0}/${test.total_predictions??0}</td>
        <td>${metricOrPending(test.avg_brier)}</td>
        <td>${metricOrPending(test.avg_score_log_loss)}</td>
        <td>${pctOrPending(test.direction_accuracy)}</td>
        <td>${metricOrPending(test.avg_process_mae)}</td>
      </tr>`;
    }).join('');
  }
  function retrospectiveRows(rows){
    return (rows||[]).map(r=>`<tr>
      <td><strong>${esc(r.replay_version)}</strong><br><small>GW${r.gameweek} · retrospective only</small></td>
      <td>${r.evaluated_fixtures??0}</td><td>${pctOrPending(r.direction_accuracy)}</td><td>${metricOrPending(r.avg_brier)}</td>
      <td>${metricOrPending(r.avg_score_log_loss)}</td><td>${metricOrPending(r.avg_process_mae)}</td><td>${r.forward_valid?'Yes':'No'}</td>
    </tr>`).join('');
  }
  function forwardCalibrationSection(){
    const c=state.calibration;
    if(!c)return `<div class="section validation-section">${sectionHead('Forward validation','W0001 / A0005 calibration status')}<div class="empty-state">${esc(state.errors.calibration||'Calibration data is loading.')}</div></div>`;
    const f=c.validation?.forward;
    if(!f?.available)return `<div class="section validation-section">${sectionHead('Forward validation','Independent pre-match cohort')}<div class="empty-state">No frozen forward-validation cohort is available.</div></div>`;
    const val=splitInfo(f,'VALIDATION'),test=splitInfo(f,'TEST'),integrity=integrityOk(f.integrity),gate=f.latest_promotion_gate;
    const baseMarket=(f.market||[]).find(x=>x.variant_key==='BASE_V03_ELO'&&x.split==='VALIDATION')||null;
    const gateApplies=gate&&Number(gate.ablation_run_id)===Number(f.ablation?.id);
    const clvFixtures=Math.max(0,...(f.market||[]).map(x=>Number(x.fixtures_with_clv||0)));
    const nextKo=[val.next_kickoff,test.next_kickoff].filter(Boolean).sort()[0]||null;
    const retrospective=c.validation?.retrospective||[];
    return `<div class="section validation-section">
      ${sectionHead('Forward validation control room','Genuine pre-match validation is kept separate from retrospective replay evidence')}
      <div class="research-note validation-note"><strong>Independent cohort: ${esc(f.walk_forward?.run_key||'W0001')} / ${esc(f.selected_ablation_key||'A0005')}.</strong><br>These predictions were frozen before the relevant matches. The dashboard will populate outcome metrics only after results are legitimately available; missing results remain “Pending”, never zero.</div>
      <div class="performance-hero">
        ${stat('Frozen predictions',String(f.coverage?.predictions??'—'),'7 variants × GW2 validation + GW3 test')}
        ${stat('Evaluations',String(f.coverage?.evaluations??0),f.coverage?.evaluations?'Scored after results':'No forward results yet')}
        ${stat('GW2 validation',`${val.fixtures??0} fixtures`,val.next_kickoff?`Starts ${dateTime(val.next_kickoff)}`:'Kickoff unavailable')}
        ${stat('GW3 test',`${test.fixtures??0} fixtures`,test.next_kickoff?`Starts ${dateTime(test.next_kickoff)}`:'Kickoff unavailable')}
      </div>
      <div class="validation-status-row">
        <span class="chip ${integrity?'positive':'negative'}">${integrity?'Integrity checks clean':'Integrity violation detected'}</span>
        <span class="chip blue">actual_data_used = false</span>
        <span class="chip blue">model_effect_enabled = false</span>
        <span class="chip">Next cohort kickoff ${nextKo?dateTime(nextKo):'—'}</span>
      </div>
      <div class="section validation-subsection">
        ${sectionHead('A0005 ablation scoreboard','Lower Brier, log loss and process MAE are better; higher direction accuracy is better')}
        <div class="table-shell validation-table-shell"><table class="data-table validation-table"><thead><tr><th rowspan="2">Variant</th><th colspan="5">GW2 · Validation</th><th colspan="5">GW3 · Test</th></tr><tr><th>Scored</th><th>Brier</th><th>Log loss</th><th>Direction</th><th>Process MAE</th><th>Scored</th><th>Brier</th><th>Log loss</th><th>Direction</th><th>Process MAE</th></tr></thead><tbody>${variantRows(f)}</tbody></table></div>
      </div>
      <div class="three-col validation-cards">
        <div class="insight-card"><div class="insight-icon">M</div><div><strong>Market disagreement</strong><p>${baseMarket&&num(baseMarket.avg_market_disagreement)!=null?`GW2 base-vs-consensus average disagreement is ${pct(baseMarket.avg_market_disagreement)}.`:'Market disagreement is pending.'} This is a diagnostic, not a recommendation.</p></div></div>
        <div class="insight-card"><div class="insight-icon">C</div><div><strong>Closing-line evidence</strong><p>${clvFixtures?`${clvFixtures} fixture${clvFixtures===1?'':'s'} now have captured CLV context.`:'No genuine closing-price proxy has been captured yet. CLV stays blank rather than being inferred.'}</p></div></div>
        <div class="insight-card"><div class="insight-icon">G</div><div><strong>Promotion gate</strong><p>${gateApplies?`${esc(gate.assessment_key)}: ${esc(gate.gate_status)}.`:`A0005 has not reached a promotion-gate assessment yet. Latest gate ${esc(gate?.assessment_key||'—')} belongs to an earlier ablation.`} No research feature is promoted from this screen.</p></div></div>
      </div>
      <div class="section validation-subsection">
        ${sectionHead('Retrospective reference only','Useful diagnostics, but explicitly excluded from independent forward evidence')}
        <div class="research-note">The GW1 blind-current-engine replays below were generated without result data, but the hypotheses were investigated retrospectively. They are context for debugging, not evidence for promotion.</div>
        <div class="table-shell"><table class="data-table"><thead><tr><th>Replay</th><th>Fixtures</th><th>Direction</th><th>Brier</th><th>Log loss</th><th>Process MAE</th><th>Forward valid?</th></tr></thead><tbody>${retrospectiveRows(retrospective)||'<tr><td colspan="7">No retrospective runs.</td></tr>'}</tbody></table></div>
      </div>
    </div>`;
  }

  const priorPerformance=renderPerformance;
  renderPerformance=function(){return forwardCalibrationSection()+priorPerformance();};

  const priorLoad=load;
  load=async function(gw=0){await priorLoad(gw);await loadCalibration(state.gw);syncHeader();render();};

  (async()=>{
    for(let i=0;i<100&&!state.loadedAt;i++)await new Promise(r=>setTimeout(r,100));
    if(state.loadedAt){await loadCalibration(state.gw);syncHeader();render();}
  })();
})();
