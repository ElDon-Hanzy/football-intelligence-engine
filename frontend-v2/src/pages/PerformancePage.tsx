import { Button } from '../components/primitives/Button';
import { metric, pct, usePerformanceData } from '../lib/analysis';

export function PerformancePage({ requestedGameweek }: { requestedGameweek: number }) {
  const query = usePerformanceData(requestedGameweek);
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const variants = data.validation.forward.variants ?? [];
  const splitCoverage = data.validation.forward.coverage?.splits ?? [];

  const completedForwardSamples = splitCoverage.flatMap((coverage) => {
    if (coverage.gameweek == null || coverage.fixtures <= 0) return [];
    const rows = variants
      .filter((row) => row.split === coverage.split && (row.evaluated_fixtures ?? 0) >= coverage.fixtures && row.avg_brier != null)
      .sort((a, b) => (a.avg_brier ?? Infinity) - (b.avg_brier ?? Infinity));
    const best = rows[0] ?? null;
    if (!best) return [];
    const reference = rows.find((row) => row.variant_key === 'BASE_V03_ELO') ?? null;
    return [{ coverage, best, reference }];
  }).sort((a, b) => (b.coverage.gameweek ?? 0) - (a.coverage.gameweek ?? 0));

  const latestForward = completedForwardSamples[0] ?? null;
  const latestCompletedGameweek = latestForward?.coverage.gameweek ?? null;
  const pendingForwardSamples = splitCoverage.filter((coverage) => {
    if (coverage.gameweek == null || coverage.fixtures <= 0) return false;
    const evaluated = Math.max(0, ...variants.filter((row) => row.split === coverage.split).map((row) => row.evaluated_fixtures ?? 0));
    return evaluated < coverage.fixtures;
  });

  const retrospective = data.validation.retrospective.filter((row) => row.evaluated_fixtures > 0);
  const retrospectiveByGw = new Map<number, typeof retrospective>();
  for (const row of retrospective) retrospectiveByGw.set(row.gameweek, [...(retrospectiveByGw.get(row.gameweek) ?? []), row]);
  const benchmarkMatched = data.summary.matched_players ?? 0;
  const benchmarkXiMatched = data.summary.benchmark_xi_matched ?? 0;
  const benchmarkAvailable = benchmarkMatched > 0 && data.summary.benchmark_xi_xpts != null;
  const lifecycleLabel = latestCompletedGameweek != null
    ? `Gameweek ${data.gameweek} · performance through GW${latestCompletedGameweek}`
    : `Gameweek ${data.gameweek} · performance pending`;

  return <div className="analysis-page performance-page">
    <header className="page-intro analysis-intro">
      <div><span className="page-eyebrow">{lifecycleLabel}</span><h1>Performance</h1><p>What happened, how accurate the engine was, and how strong the evidence is. Detailed model experiments stay in Engine & Research rather than cluttering this summary. Only completed forward evidence is labelled as realised performance; the active Gameweek is never treated as completed before its frozen sample is evaluated.</p></div>
      <span className="sync-badge" role="status"><span aria-hidden="true" />{data.active_model}</span>
    </header>

    <section className="analysis-hero" aria-labelledby="performance-title">
      <div><span className="decision-label">Latest completed forward sample</span><h2 id="performance-title">{latestForward ? `GW${latestForward.coverage.gameweek} · ${latestForward.best.evaluated_fixtures ?? latestForward.coverage.fixtures} fixtures` : 'No completed forward sample'}</h2><p>{latestForward ? `${forwardLabel(latestForward.coverage.split)} predictions were frozen before the matches were played. Every metric in this card comes from this same GW${latestForward.coverage.gameweek} sample.` : 'Metrics remain pending until a frozen forward sample is fully evaluated.'}</p></div>
      <dl className="analysis-hero-metrics">
        <Metric label="Direction" value={pct(latestForward?.best.direction_accuracy, 0)} />
        <Metric label="Brier" value={metric(latestForward?.best.avg_brier, 3)} />
        <Metric label="Reference direction" value={pct(latestForward?.reference?.direction_accuracy, 0)} />
        <Metric label="Reference Brier" value={metric(latestForward?.reference?.avg_brier, 3)} />
      </dl>
    </section>

    <section className="analysis-section" aria-labelledby="gw-history-heading">
      <div className="analysis-section-heading"><div><span className="page-eyebrow">Completed gameweeks</span><h2 id="gw-history-heading">Engine record</h2></div><p>Forward samples are ordered by Gameweek, not by experiment split. Retrospective replays remain visibly separate.</p></div>
      <div className="gameweek-performance-grid">
        {completedForwardSamples.map(({ coverage, best, reference }) => <article className="analysis-card gameweek-performance-card" key={`${coverage.split}-${coverage.gameweek}`}><span className="page-eyebrow">GW{coverage.gameweek} · {forwardLabel(coverage.split)}</span><h2>{pct(best.direction_accuracy, 0)} direction accuracy</h2><dl className="stacked-metrics"><Metric label="Fixtures" value={String(best.evaluated_fixtures ?? coverage.fixtures)} /><Metric label="Brier" value={metric(best.avg_brier, 3)} /><Metric label="Log loss" value={metric(best.avg_score_log_loss, 3)} /><Metric label="Reference Brier" value={metric(reference?.avg_brier, 3)} /></dl><p className="analysis-card-note">Frozen before outcomes. Review-only; no automatic model promotion.</p></article>)}
        {[...retrospectiveByGw.entries()].sort((a, b) => b[0] - a[0]).map(([gw, runs]) => <article className="analysis-card gameweek-performance-card is-retrospective" key={gw}><span className="page-eyebrow">GW{gw} · Retrospective blind checks</span><h2>{runs.length} engine run{runs.length === 1 ? '' : 's'}</h2><div className="compact-run-list">{runs.map((row, index) => <div key={`${gw}-${index}-${row.evaluated_fixtures}`}><strong>Run {index + 1}</strong><span>{row.evaluated_fixtures} fixtures</span><small>{pct(row.direction_accuracy)} direction · {metric(row.avg_brier, 3)} Brier</small></div>)}</div><p className="analysis-card-note">Diagnostic only. These replays exclude current-gameweek outcomes from generation but are not forward-valid evidence.</p></article>)}
        {pendingForwardSamples.map((coverage) => {
          const evaluated = Math.max(0, ...variants.filter((row) => row.split === coverage.split).map((row) => row.evaluated_fixtures ?? 0));
          return <article className="analysis-card gameweek-performance-card is-pending" key={`pending-${coverage.split}-${coverage.gameweek}`}><span className="page-eyebrow">GW{coverage.gameweek} · {forwardLabel(coverage.split)}</span><h2>{evaluated > 0 ? `${evaluated}/${coverage.fixtures} evaluated` : 'Pending'}</h2><p className="analysis-card-note">Accuracy stays hidden until the frozen sample is fully evaluated. Partial results never replace the latest completed sample.</p></article>;
        })}
      </div>
    </section>

    <section className="analysis-section" aria-labelledby="projection-heading">
      <div className="analysis-section-heading"><div><span className="page-eyebrow">Projection calibration</span><h2 id="projection-heading">Current FPL snapshot</h2></div><p>This compares projections with external benchmarks when a benchmark snapshot was actually captured. Missing benchmark coverage is never converted to zero.</p></div>
      {!benchmarkAvailable ? <aside className="analysis-notice" role="note"><strong>External benchmark not captured for GW{data.gameweek}</strong><span>The engine projection is available, but no same-Gameweek benchmark players are stored. Benchmark xPts and MAE therefore remain unavailable rather than being shown as zero.</span></aside> : null}
      <article className="analysis-card projection-calibration-card"><dl className="stacked-metrics"><Metric label="Current XI xPts" value={metric(data.summary.current_xi_xpts, 2)} /><Metric label="Frozen XI xPts" value={metric(data.summary.frozen_xi_xpts, 2)} /><Metric label="Benchmark XI xPts" value={benchmarkAvailable ? metric(data.summary.benchmark_xi_xpts, 2) : 'Not captured'} /><Metric label="Benchmark XI matched" value={benchmarkAvailable ? String(benchmarkXiMatched) : '0 · unavailable'} /><Metric label="Matched players" value={benchmarkAvailable ? String(benchmarkMatched) : '0 · unavailable'} /><Metric label="MAE vs benchmark" value={benchmarkAvailable ? metric(data.summary.mae, 3) : 'Not available'} /></dl></article>
    </section>

    <details className="analysis-details research-details"><summary>Methodology</summary><div><p>A forward sample is shown as completed only when every fixture in that split has an evaluation. The latest completed sample is selected by Gameweek across validation and test splits, so an older validation set can never outrank a newer completed test set merely because of its split name.</p><p>Frozen FPL run used for the current projection comparison: <strong>{data.frozen_prediction_run_id ?? '—'}</strong>.</p></div></details>
  </div>;
}

function forwardLabel(split: string): string { return split === 'TEST' ? 'Forward test' : split === 'VALIDATION' ? 'Forward validation' : `Forward ${split.toLowerCase()}`; }
function Metric({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Loading() { return <div className="command-skeleton" aria-busy="true" aria-label="Loading Performance"><div className="skeleton-line is-short"/><div className="skeleton-line is-title"/><div className="skeleton-panel"/></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <section className="state-panel"><span className="page-eyebrow">Performance</span><h1>Validation data is unavailable.</h1><p>No performance metric is reconstructed from stale or incomplete data.</p><Button onClick={onRetry}>Retry validation data</Button></section>; }
