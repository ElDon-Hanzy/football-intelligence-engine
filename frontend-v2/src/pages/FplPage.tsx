import { Button } from '../components/primitives/Button';
import { chipLabel, decisionLabel, humanizeMachineText, percent, planFreshness, planNarrative } from '../lib/home';
import type { Player } from '../lib/contracts';
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
  const managerState = planApi?.manager_state?.gameweek === gameweek ? planApi.manager_state : null;
  const partial = fpl.isError || managerPlan.isError;
  const freshness = planFreshness(plan?.captured_at);
  const relation = projectionRelation(plan?.captured_at, fplData?.generated_at);
  const captain = findSquadPlayer(fplData, plan?.captain_player_id);
  const vice = findSquadPlayer(fplData, plan?.vice_player_id);
  const xi = resolveSelections(fplData, plan?.starting_xi);
  const bench = resolveSelections(fplData, plan?.bench_order);
  const reasons = decisionReasons(plan);
  const leaders = rankProjectionLeaders(fplData?.all_predictions ?? [], 8);
  const syncWarning = partial || freshness.stale || relation.projectionNewer === true;
  const syncLabel = partial ? 'Partial live data' : freshness.stale ? 'Saved plan needs refresh' : relation.projectionNewer ? 'Newer projection available' : 'Plan / model aligned';

  return <div className="fpl-page">
    <header className="page-intro fpl-intro">
      <div><span className="page-eyebrow">{gameweek ? `Gameweek ${gameweek}` : 'Current Gameweek'} · C0173</span><h1>FPL decision workspace</h1><p>Saved manager action first. Current projections are a separate analytical layer and never silently overwrite the plan.</p></div>
      <span className={`sync-badge${syncWarning ? ' is-warning' : ''}`} role="status"><span aria-hidden="true" />{syncLabel}</span>
    </header>

    <section className="fpl-decision-board" aria-labelledby="fpl-action-title">
      <div className="fpl-action-head">
        <div>
          <span className="decision-label">Authoritative saved manager plan</span>
          <h2 id="fpl-action-title">{decisionLabel(plan)}</h2>
          <p>{planNarrative(plan)}</p>
          <small className={`plan-freshness${freshness.stale ? ' is-stale' : ''}`}>{freshness.label}</small>
        </div>
        <div className="fpl-plan-stats" aria-label="Saved manager state">
          <PlanMetric label="Free transfers" value={managerState?.free_transfers == null ? '—' : `${managerState.free_transfers} FT`} />
          <PlanMetric label="In the bank" value={formatBank(managerState?.bank_tenths)} />
          <PlanMetric label="Chip" value={chipLabel(plan?.chip)} />
          <PlanMetric label="Risk" value={plan?.risk_level ? humanizeMachineText(plan.risk_level) : '—'} />
        </div>
      </div>

      <div className="fpl-captain-strip" aria-label="Saved captaincy">
        <CaptainSummary role="Captain" marker="C" player={captain} fallbackId={plan?.captain_player_id} />
        <CaptainSummary role="Vice" marker="VC" player={vice} fallbackId={plan?.vice_player_id} />
      </div>

      <div className="fpl-compact-squad" aria-label="Saved squad selection">
        <CompactSelection label={`XI · ${xi.length}/11`} selections={xi} />
        <CompactSelection label={`Bench · ${bench.length}/4`} selections={bench} />
      </div>

      <div className={`projection-separation${relation.projectionNewer ? ' is-warning' : ''}`} role="note">
        <div><span>Latest projection layer</span><strong>{fplData?.prediction_run_id ? `Run #${fplData.prediction_run_id}` : 'Run unavailable'}</strong></div>
        <p>{relation.label}. {fplData?.generated_at ? `Generated ${formatTimestamp(fplData.generated_at)}.` : ''} This layer is analysis only and is not a saved manager decision.</p>
      </div>
    </section>

    <section className="fpl-section" aria-labelledby="saved-lineup-heading">
      <div className="fpl-section-heading"><div><span className="page-eyebrow">Manager plan</span><h2 id="saved-lineup-heading">Saved XI & bench</h2></div><small>Player metrics below are from the latest projection, while selection status remains the saved plan.</small></div>
      <div className="saved-lineup-grid">
        <div className="lineup-panel"><h3>Starting XI <span>{xi.length}/11</span></h3><div className="player-tile-grid">{xi.map((selection) => <PlayerTile key={selection.id} selection={selection} captainId={plan?.captain_player_id} viceId={plan?.vice_player_id} />)}</div></div>
        <div className="bench-panel"><h3>Bench <span>{bench.length}/4</span></h3><div className="bench-list">{bench.map((selection, index) => <PlayerTile key={selection.id} selection={selection} captainId={plan?.captain_player_id} viceId={plan?.vice_player_id} benchOrder={index + 1} />)}</div></div>
      </div>
    </section>

    <section className="fpl-section" aria-labelledby="captain-lens-heading">
      <div className="fpl-section-heading"><div><span className="page-eyebrow">Current-event distribution</span><h2 id="captain-lens-heading">Saved captaincy through the latest model</h2></div><small>xPts and xMin are current projections. P10+, P15+, q90 and q95 are shown only from the direct C0160 event distribution.</small></div>
      <div className="captain-lens-grid"><DistributionCard role="Saved captain" player={captain} /><DistributionCard role="Saved vice" player={vice} /></div>
    </section>

    <section className="fpl-section decision-detail-grid" aria-label="Transfer decision and plan provenance">
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
    </section>

    <section className="fpl-section secondary-analysis" aria-labelledby="full-pool-heading">
      <details className="fpl-details full-pool-details">
        <summary><span><strong id="full-pool-heading">Full-pool projection leaders</strong><small>Secondary model view · not transfer recommendations</small></span><span aria-hidden="true">+</span></summary>
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

function DistributionCard({ role, player }: { role: string; player: Player | undefined }) {
  const direct = isDirectCurrentDistribution(player);
  return <article className="distribution-card"><header><span>{role}</span><strong>{player?.name ?? 'Unavailable'}</strong><small>{player?.team ?? ''}</small></header><div className="distribution-metrics"><Metric label="xPts" value={player?.expected_points == null ? '—' : player.expected_points.toFixed(2)} /><Metric label="xMin" value={player?.expected_minutes == null ? '—' : String(Math.round(player.expected_minutes))} /><Metric label="P10+" value={direct ? percent(player?.p_10_plus) : '—'} /><Metric label="P15+" value={direct ? percent(player?.p_15_plus) : '—'} /><Metric label="q90" value={direct && player?.q90 != null ? String(player.q90) : '—'} /><Metric label="q95" value={direct && player?.q95 != null ? String(player.q95) : '—'} /></div><p className={direct ? 'distribution-source' : 'distribution-source is-warning'}>{direct ? 'Direct current-fixture event distribution' : 'Current-event tail distribution unavailable; no legacy proxy is substituted.'}</p></article>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="distribution-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function ProjectionLeader({ player, rank }: { player: Player; rank: number }) {
  const direct = isDirectCurrentDistribution(player);
  return <article className="projection-leader"><span className="leader-rank">#{rank}</span><div className="leader-player"><strong>{player.name}</strong><small>{player.team ?? '—'} · {player.position ?? '—'} · {formatPlayerPrice(player)} · {player.ownership_percent == null ? 'ownership —' : `${Math.round(player.ownership_percent)}% owned`}</small></div><div className="leader-metrics"><span><strong>{player.expected_points == null ? '—' : player.expected_points.toFixed(2)}</strong><small>xPts</small></span><span><strong>{direct ? percent(player.p_10_plus) : '—'}</strong><small>P10+</small></span><span><strong>{direct && player.q90 != null ? player.q90 : '—'}</strong><small>q90</small></span><span><strong>{direct && player.q95 != null ? player.q95 : '—'}</strong><small>q95</small></span></div></article>;
}

function FplSkeleton() {
  return <div className="command-skeleton" aria-busy="true" aria-label="Loading FPL decision workspace"><div className="skeleton-line is-short" /><div className="skeleton-line is-title" /><div className="skeleton-panel" /><div className="skeleton-grid"><div /><div /></div></div>;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
}
