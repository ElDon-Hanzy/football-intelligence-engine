import { Button } from '../components/primitives/Button';
import { chipLabel, decisionLabel, humanizeMachineText, percent, planFreshness, planNarrative } from '../lib/home';
import type { ActualManagerDecision, Player } from '../lib/contracts';
import {
  decisionReasons,
  findSquadPlayer,
  formatBank,
  formatPlayerPrice,
  isDirectCurrentDistribution,
  projectionRelation,
  rankProjectionLeaders,
  resolveSelections,
  transferDescription,
  type ResolvedSelection,
  useFplWorkspaceData,
} from '../lib/fpl';

export function FplPage({ requestedGameweek }: { requestedGameweek: number }) {
  const { fpl, managerPlan } = useFplWorkspaceData(requestedGameweek);

  if (fpl.isPending || managerPlan.isPending) return <FplSkeleton />;

  if (fpl.isError && managerPlan.isError) {
    return <section className="state-panel" aria-live="polite"><span className="page-eyebrow">FPL workspace</span><h1>FPL decision data is unavailable.</h1><p>The workspace will not reconstruct a manager decision from projection rankings when the authoritative contracts fail.</p><Button onClick={() => { void fpl.refetch(); void managerPlan.refetch(); }}>Retry live data</Button></section>;
  }

  const fplData = fpl.data;
  const planApi = managerPlan.data;
  if (fplData?.gameweek && planApi?.gameweek && fplData.gameweek !== planApi.gameweek) {
    return <section className="state-panel" aria-live="polite"><span className="page-eyebrow">Integrity gate</span><h1>Gameweek contracts do not align.</h1><p>The saved plan and latest projection resolved to different Gameweeks, so the workspace refuses to merge them.</p><Button onClick={() => { void fpl.refetch(); void managerPlan.refetch(); }}>Refresh both contracts</Button></section>;
  }

  const gameweek = planApi?.gameweek ?? fplData?.gameweek ?? (requestedGameweek || null);
  const plan = planApi?.plan ?? null;
  const historicalDecision = !plan ? fplData?.decision ?? null : null;
  const isHistorical = historicalDecision != null;
  const actualManagerDecision = planApi?.actual_manager_decision ?? null;

  if (!plan && !historicalDecision && fplData) {
    return <section className="state-panel" aria-live="polite"><span className="page-eyebrow">FPL history</span><h1>{gameweek ? `No saved FPL decision for GW${gameweek}.` : 'No saved FPL decision is available.'}</h1><p>The workspace will not invent a historical XI, bench or captaincy from today’s projections.</p></section>;
  }

  const managerState = !isHistorical && planApi?.manager_state?.gameweek === gameweek ? planApi.manager_state : null;
  const partial = fpl.isError || managerPlan.isError;
  const freshness = planFreshness(plan?.captured_at);
  const relation = plan ? projectionRelation(plan.captured_at, fplData?.generated_at) : { label: 'Historical frozen projection aligned to the saved decision snapshot', projectionNewer: false };
  const captainId = plan?.captain_player_id ?? historicalDecision?.captain_player_id ?? null;
  const viceId = plan?.vice_player_id ?? historicalDecision?.vice_player_id ?? null;
  const captain = findSquadPlayer(fplData, captainId);
  const vice = findSquadPlayer(fplData, viceId);
  const xi = resolveSelections(fplData, plan?.starting_xi ?? historicalDecision?.starting_xi);
  const bench = resolveSelections(fplData, plan?.bench_order ?? historicalDecision?.bench);
  const reasons = decisionReasons(plan);
  const leaders = rankProjectionLeaders(fplData?.all_predictions ?? [], 8);
  const syncWarning = !isHistorical && (partial || freshness.stale || relation.projectionNewer === true);
  const syncLabel = isHistorical ? 'Historical snapshot' : partial ? 'Partial live data' : freshness.stale ? 'Saved plan needs refresh' : relation.projectionNewer ? 'Newer projection available' : 'Plan / model aligned';
  const actualCaptain = findSquadPlayer(fplData, actualManagerDecision?.captain_player_id);
  const actualVice = findSquadPlayer(fplData, actualManagerDecision?.vice_player_id);

  return <div className="fpl-page">
    <header className="page-intro fpl-intro">
      <div><span className="page-eyebrow">{gameweek ? `Gameweek ${gameweek}` : 'Current Gameweek'} · {isHistorical ? 'historical record' : 'C0173'}</span><h1>{isHistorical ? 'FPL decision history' : 'FPL decision workspace'}</h1><p>{isHistorical ? 'The frozen pre-deadline model decision is shown exactly as stored. Any recorded real manager action is kept separate so history is not rewritten.' : 'Saved manager action first. Current projections are a separate analytical layer and never silently overwrite the plan.'}</p></div>
      <span className={`sync-badge${syncWarning ? ' is-warning' : ''}`} role="status"><span aria-hidden="true" />{syncLabel}</span>
    </header>

    <section className="fpl-decision-board" aria-labelledby="fpl-action-title">
      <div className="fpl-action-head">
        <div>
          <span className="decision-label">{isHistorical ? 'Frozen model decision snapshot' : 'Authoritative saved manager plan'}</span>
          <h2 id="fpl-action-title">{isHistorical ? `GW${gameweek ?? '—'} frozen model decision` : decisionLabel(plan)}</h2>
          <p>{isHistorical ? 'Preserved from the original pre-deadline prediction run. Later results and later model versions do not alter this record.' : planNarrative(plan)}</p>
          <small className={`plan-freshness${!isHistorical && freshness.stale ? ' is-stale' : ''}`}>{isHistorical ? (fplData?.generated_at ? `Frozen ${formatTimestamp(fplData.generated_at)}` : 'Historical timestamp unavailable') : freshness.label}</small>
        </div>
        <div className="fpl-plan-stats" aria-label={isHistorical ? 'Historical model snapshot' : 'Saved manager state'}>
          {isHistorical ? <>
            <PlanMetric label="Snapshot" value="Frozen" />
            <PlanMetric label="Prediction run" value={fplData?.prediction_run_id ? `#${fplData.prediction_run_id}` : '—'} />
            <PlanMetric label="Model" value={fplData?.model_version ?? '—'} />
            <PlanMetric label="Actual action" value={actualManagerDecision ? 'Recorded' : 'Not recorded'} />
          </> : <>
            <PlanMetric label="Free transfers" value={managerState?.free_transfers == null ? '—' : `${managerState.free_transfers} FT`} />
            <PlanMetric label="In the bank" value={formatBank(managerState?.bank_tenths)} />
            <PlanMetric label="Chip" value={chipLabel(plan?.chip)} />
            <PlanMetric label="Risk" value={plan?.risk_level ? humanizeMachineText(plan.risk_level) : '—'} />
          </>}
        </div>
      </div>

      <div className="fpl-captain-strip" aria-label={isHistorical ? 'Frozen model captaincy' : 'Saved captaincy'}>
        <CaptainSummary role={isHistorical ? 'Model captain' : 'Captain'} marker="C" player={captain} fallbackId={captainId} />
        <CaptainSummary role={isHistorical ? 'Model vice' : 'Vice'} marker="VC" player={vice} fallbackId={viceId} />
      </div>

      {isHistorical && actualManagerDecision ? <div className="projection-separation" role="note">
        <div><span>Actual manager action</span><strong>{actualActionHeadline(actualManagerDecision, actualCaptain, actualVice)}</strong></div>
        <p>Only fields explicitly recorded after the Gameweek are shown here. Missing fields remain unknown. This overlay does not overwrite the frozen model decision above.</p>
      </div> : null}

      <div className="fpl-compact-squad" aria-label={isHistorical ? 'Frozen model squad selection' : 'Saved squad selection'}>
        <CompactSelection label={`${isHistorical ? 'Frozen XI' : 'XI'} · ${xi.length}/11`} selections={xi} />
        <CompactSelection label={`${isHistorical ? 'Frozen bench' : 'Bench'} · ${bench.length}/4`} selections={bench} />
      </div>

      <div className={`projection-separation${!isHistorical && relation.projectionNewer ? ' is-warning' : ''}`} role="note">
        <div><span>{isHistorical ? 'Frozen projection layer' : 'Latest projection layer'}</span><strong>{fplData?.prediction_run_id ? `Run #${fplData.prediction_run_id}` : 'Run unavailable'}</strong></div>
        <p>{relation.label}. {fplData?.generated_at ? `Generated ${formatTimestamp(fplData.generated_at)}.` : ''} {isHistorical ? 'This historical layer is preserved for review and is not recalculated with later information.' : 'This layer is analysis only and is not a saved manager decision.'}</p>
      </div>
    </section>

    <section className="fpl-section" aria-labelledby="saved-lineup-heading">
      <div className="fpl-section-heading"><div><span className="page-eyebrow">{isHistorical ? 'Frozen selection' : 'Manager plan'}</span><h2 id="saved-lineup-heading">{isHistorical ? 'Frozen XI & bench' : 'Saved XI & bench'}</h2></div><small>{isHistorical ? 'Player metrics are from that Gameweek’s frozen prediction run, not today’s model.' : 'Player metrics below are from the latest projection, while selection status remains the saved plan.'}</small></div>
      <div className="saved-lineup-grid">
        <div className="lineup-panel"><h3>Starting XI <span>{xi.length}/11</span></h3><div className="player-tile-grid">{xi.map((selection) => <PlayerTile key={selection.id} selection={selection} captainId={captainId} viceId={viceId} />)}</div></div>
        <div className="bench-panel"><h3>Bench <span>{bench.length}/4</span></h3><div className="bench-list">{bench.map((selection, index) => <PlayerTile key={selection.id} selection={selection} captainId={captainId} viceId={viceId} benchOrder={index + 1} />)}</div></div>
      </div>
    </section>

    <section className="fpl-section" aria-labelledby="captain-lens-heading">
      <div className="fpl-section-heading"><div><span className="page-eyebrow">{isHistorical ? 'Frozen event distribution' : 'Current-event distribution'}</span><h2 id="captain-lens-heading">{isHistorical ? 'Frozen captaincy through its original model' : 'Saved captaincy through the latest model'}</h2></div><small>{isHistorical ? 'These probabilities belong to the historical frozen run. Missing tail metrics are left blank rather than backfilled from a later model.' : 'xPts and xMin are current projections. P10+, P15+, q90 and q95 are shown only from the direct C0160 event distribution.'}</small></div>
      <div className="captain-lens-grid"><DistributionCard role={isHistorical ? 'Frozen model captain' : 'Saved captain'} player={captain} historical={isHistorical} /><DistributionCard role={isHistorical ? 'Frozen model vice' : 'Saved vice'} player={vice} historical={isHistorical} /></div>
    </section>

    {isHistorical ? <section className="fpl-section decision-detail-grid" aria-label="Historical FPL decision provenance">
      <div className="decision-detail-card">
        <span className="page-eyebrow">Frozen model decision</span><h2>Preserved without hindsight</h2><p>The XI, bench and captaincy above come from the stored decision snapshot for this Gameweek. We do not replace them with what the model would choose today.</p>
        <dl className="provenance-list"><div><dt>Prediction run</dt><dd>{fplData?.prediction_run_id ? `#${fplData.prediction_run_id}` : '—'}</dd></div><div><dt>Model version</dt><dd>{fplData?.model_version ?? '—'}</dd></div><div><dt>Generated</dt><dd>{fplData?.generated_at ? formatTimestamp(fplData.generated_at) : '—'}</dd></div><div><dt>Actual action</dt><dd>{actualManagerDecision ? actualManagerDecision.source : 'Not recorded'}</dd></div></dl>
      </div>
      <HistoricalActualAction decision={actualManagerDecision} captain={actualCaptain} vice={actualVice} />
    </section> : <section className="fpl-section decision-detail-grid" aria-label="Transfer decision and plan provenance">
      <div className="decision-detail-card">
        <span className="page-eyebrow">Transfer decision</span><h2>{decisionLabel(plan)}</h2>
        {plan?.transfers.length ? <ol className="transfer-list">{plan.transfers.map((transfer, index) => <li key={index}>{transferDescription(transfer, index)}</li>)}</ol> : <p>No transfer is encoded in the saved manager plan. Rolling remains the stored action until that plan is superseded.</p>}
        {reasons.length ? <ul className="decision-reasons">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
      </div>
      <div className="decision-detail-card">
        <span className="page-eyebrow">Plan provenance</span><h2>Keep decision and model truth separate</h2>
        <dl className="provenance-list"><div><dt>Plan saved</dt><dd>{plan?.captured_at ? formatTimestamp(plan.captured_at) : '—'}</dd></div><div><dt>Plan source</dt><dd>{plan?.source ?? '—'}</dd></div><div><dt>Projection</dt><dd>{fplData?.prediction_run_id ? `Run #${fplData.prediction_run_id}` : '—'}</dd></div><div><dt>Manager state</dt><dd>{managerState?.source ?? '—'}</dd></div></dl>
        {managerState ? <details className="fpl-details"><summary>FT / bank provenance</summary><p>Captured {formatTimestamp(managerState.captured_at)}. Acquisition-squad cost: {managerState.acquisition_squad_cost_tenths == null ? 'unavailable' : `£${(managerState.acquisition_squad_cost_tenths / 10).toFixed(1)}m`}. Missing state is never interpreted as zero.</p></details> : null}
      </div>
    </section>}

    <section className="fpl-section secondary-analysis" aria-labelledby="full-pool-heading">
      <details className="fpl-details full-pool-details">
        <summary><span><strong id="full-pool-heading">Full-pool projection leaders</strong><small>{isHistorical ? 'Historical frozen model view · not current transfer recommendations' : 'Secondary model view · not transfer recommendations'}</small></span><span aria-hidden="true">+</span></summary>
        <div className="leader-list">{leaders.length ? leaders.map((player, index) => <ProjectionLeader key={player.id} player={player} rank={index + 1} />) : <p>Full-pool rankings are unavailable.</p>}</div>
      </details>
    </section>
  </div>;
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return <div className="fpl-plan-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function CaptainSummary({ role, marker, player, fallbackId }: { role: string; marker: string; player: Player | undefined; fallbackId: number | null | undefined }) {
  return <div className="captain-summary"><span className="captain-marker" aria-hidden="true">{marker}</span><div><small>{role}</small><strong>{player?.name ?? (fallbackId ? `Player #${fallbackId}` : '—')}</strong>{player ? <span>{player.team ?? 'Team unavailable'} · {player.expected_points == null ? 'xPts —' : `${player.expected_points.toFixed(2)} xPts`}</span> : null}</div></div>;
}

function CompactSelection({ label, selections }: { label: string; selections: ResolvedSelection[] }) {
  return <div className="compact-selection"><span>{label}</span><p>{selections.length ? selections.map((selection) => selection.player?.name ?? `Player #${selection.id}`).join(' · ') : 'No saved selections available'}</p></div>;
}

function PlayerTile({ selection, captainId, viceId, benchOrder }: { selection: ResolvedSelection; captainId: number | null | undefined; viceId: number | null | undefined; benchOrder?: number }) {
  const player = selection.player;
  return <article className={`player-tile${selection.id === captainId ? ' is-captain' : selection.id === viceId ? ' is-vice' : ''}`}>
    <div className="player-tile-top"><span>{benchOrder ? `Bench ${benchOrder}` : player?.position ?? '—'}</span><div>{selection.id === captainId ? <b>C</b> : null}{selection.id === viceId ? <b>VC</b> : null}</div></div>
    <strong>{player?.name ?? `Player #${selection.id}`}</strong><small>{player?.team ?? 'Projection data unavailable'}</small>
    {player ? <div className="tile-metrics"><span>{player.expected_points == null ? '—' : player.expected_points.toFixed(2)} <small>xPts</small></span><span>{player.expected_minutes == null ? '—' : Math.round(player.expected_minutes)} <small>xMin</small></span><span>{formatPlayerPrice(player)} <small>price</small></span></div> : null}
  </article>;
}

function DistributionCard({ role, player, historical = false }: { role: string; player: Player | undefined; historical?: boolean }) {
  const direct = isDirectCurrentDistribution(player);
  return <article className="distribution-card"><header><span>{role}</span><strong>{player?.name ?? 'Unavailable'}</strong><small>{player?.team ?? ''}</small></header><div className="distribution-metrics"><Metric label="xPts" value={player?.expected_points == null ? '—' : player.expected_points.toFixed(2)} /><Metric label="xMin" value={player?.expected_minutes == null ? '—' : String(Math.round(player.expected_minutes))} /><Metric label="P10+" value={direct ? percent(player?.p_10_plus) : '—'} /><Metric label="P15+" value={direct ? percent(player?.p_15_plus) : '—'} /><Metric label="q90" value={direct && player?.q90 != null ? String(player.q90) : '—'} /><Metric label="q95" value={direct && player?.q95 != null ? String(player.q95) : '—'} /></div><p className={direct ? 'distribution-source' : 'distribution-source is-warning'}>{direct ? (historical ? 'Direct event distribution from the frozen historical run' : 'Direct current-fixture event distribution') : historical ? 'Historical tail distribution unavailable; no later-model proxy is substituted.' : 'Current-event tail distribution unavailable; no legacy proxy is substituted.'}</p></article>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="distribution-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function ProjectionLeader({ player, rank }: { player: Player; rank: number }) {
  const direct = isDirectCurrentDistribution(player);
  return <article className="projection-leader"><span className="leader-rank">#{rank}</span><div className="leader-player"><strong>{player.name}</strong><small>{player.team ?? '—'} · {player.position ?? '—'} · {formatPlayerPrice(player)} · {player.ownership_percent == null ? 'ownership —' : `${Math.round(player.ownership_percent)}% owned`}</small></div><div className="leader-metrics"><span><strong>{player.expected_points == null ? '—' : player.expected_points.toFixed(2)}</strong><small>xPts</small></span><span><strong>{direct ? percent(player.p_10_plus) : '—'}</strong><small>P10+</small></span><span><strong>{direct && player.q90 != null ? player.q90 : '—'}</strong><small>q90</small></span><span><strong>{direct && player.q95 != null ? player.q95 : '—'}</strong><small>q95</small></span></div></article>;
}

function HistoricalActualAction({ decision, captain, vice }: { decision: ActualManagerDecision | null; captain: Player | undefined; vice: Player | undefined }) {
  return <div className="decision-detail-card">
    <span className="page-eyebrow">Actual manager action</span><h2>{decision ? 'Recorded fields only' : 'Not recorded'}</h2>
    {decision ? <><p>Actual-action records are an after-the-Gameweek overlay. They correct what the manager really did without changing the frozen model recommendation.</p><dl className="provenance-list"><div><dt>Captain</dt><dd>{decision.captain_player_id == null ? 'Not recorded' : captain?.name ?? `Player #${decision.captain_player_id}`}</dd></div><div><dt>Vice</dt><dd>{decision.vice_player_id == null ? 'Not recorded' : vice?.name ?? `Player #${decision.vice_player_id}`}</dd></div><div><dt>Starting XI</dt><dd>{decision.starting_xi?.length ? `${decision.starting_xi.length} recorded` : 'Not recorded'}</dd></div><div><dt>Chip</dt><dd>{decision.chip ?? 'Not recorded'}</dd></div></dl>{decision.notes ? <p>{decision.notes}</p> : null}</> : <p>No authoritative actual-action record exists for this Gameweek. The frozen model snapshot is still available above, but missing actual manager actions are not inferred.</p>}
  </div>;
}

function actualActionHeadline(decision: ActualManagerDecision, captain: Player | undefined, vice: Player | undefined): string {
  const parts: string[] = [];
  if (decision.captain_player_id != null) parts.push(`Captain ${captain?.name ?? `#${decision.captain_player_id}`}`);
  if (decision.vice_player_id != null) parts.push(`Vice ${vice?.name ?? `#${decision.vice_player_id}`}`);
  if (decision.chip) parts.push(`Chip ${decision.chip}`);
  return parts.length ? parts.join(' · ') : 'A partial actual-action record exists';
}

function FplSkeleton() {
  return <div className="command-skeleton" aria-busy="true" aria-label="Loading FPL decision workspace"><div className="skeleton-line is-short" /><div className="skeleton-line is-title" /><div className="skeleton-panel" /><div className="skeleton-grid"><div /><div /></div></div>;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
}
