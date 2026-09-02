import { Button } from '../components/primitives/Button';
import { metric, pct, usePerformanceData } from '../lib/analysis';

export function PerformancePage({ requestedGameweek }: { requestedGameweek: number }) {
  const query = usePerformanceData(requestedGameweek);
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const variants = data.validation.forward.variants ?? [];
  const validationRows = variants.filter((row) => row.split === 'VALIDATION' && (row.evaluated_fixtures ?? 0) > 0 && row.avg_brier != null).sort((a, b) => (a.avg_brier ?? Infinity) - (b.avg_brier ?? Infinity));
  const best = validationRows[0] ?? null;
  const reference = validationRows.find((row) => row.variant_key === 'BASE_V03_ELO') ?? null;
  const splitCoverage = data.validation.forward.coverage?.splits ?? [];
  const validationCoverage = splitCoverage.find((row) => row.split === 'VALIDATION') ?? null;
  const testCoverage = splitCoverage.find((row) => row.split === 'TEST') ?? null;
  const validationGameweek = validationCoverage?.gameweek ?? null;
  const testGameweek = testCoverage?.gameweek ?? null;
  const testRows = variants.filter((row) => row.split === 'TEST');
  const testEvaluated = Math.max(0, ...testRows.map((row) => row.evaluated_fixtures ?? 0));
  const retrospective = data.validation.retrospective.filter((row) => row.evaluated_fixtures > 0);
  const retrospectiveByGw = new Map<number, typeof retrospective>();
  for (const row of retrospective) retrospectiveByGw.set(row.gameweek, [...(retrospectiveByGw.get(row.gameweek) ?? []), row]);

  return <div className="analysis-page performance-page">
    <header className="page-intro analysis-intro">
      <div><span className="page-eyebrow">Gameweek {data.gameweek} · realised accuracy</span><h1>Performance</h1><p>What happened, how accurate the engine was, and how strong the evidence is. Internal model variants stay out of the primary human view.</p></div>
      <span className="sync-badge" role="status"><span aria-hidden="true" />{data.active_model}</span>
    </header>

    <section className="analysis-hero" aria-labelledby="performance-title">
      <div><span className="decision-label">Latest completed forward sample</span><h2 id="performance-title">{best && validationGameweek ? `GW${validationGameweek} · ${best.evaluated_fixtures ?? 0} fixtures` : 'No completed forward sample'}</h2><p>{best ? 'GW2 is covered by the pre-registered forward-validation cohort. This is stronger evidence than a retrospective replay and remains review-only until the promotion gate is satisfied.' : 'Metrics remain pending until a frozen forward cohort is evaluated.'}</p></div>
      <dl className="analysis-hero-metrics">
        <Metric label="Direction" value={pct(best?.direction_accuracy, 0)} />
        <Metric label="Brier" value={metric(best?.avg_brier, 3)} />
        <Metric label="Reference direction" value={pct(reference?.direction_accuracy, 0)} />
        <Metric label={testGameweek ? `GW${testGameweek} test` : 'Test sample'} value={testEvaluated > 0 ? `${testEvaluated} evaluated` : 'Pending'} />
      </dl>
    </section>

    <section className="analysis-section" aria-labelledby="gw-history-heading">
      <div className="analysis-section-heading"><div><span className="page-eyebrow">Completed gameweeks</span><h2 id="gw-history-heading">Engine record</h2></div><p>Forward evidence and retrospective diagnostics are labelled separately so their strength is not confused.</p></div>
      <div className="gameweek-performance-grid">
        {validationGameweek && best ? <article className="analysis-card gameweek-performance-card"><span className="page-eyebrow">GW{validationGameweek} · Forward validation</span><h2>{pct(best.direction_accuracy, 0)} direction accuracy</h2><dl className="stacked-metrics"><Metric label="Fixtures" value={String(best.evaluated_fixtures ?? validationCoverage?.fixtures ?? '—')} /><Metric label="Brier" value={metric(best.avg_brier, 3)} /><Metric label="Log loss" value={metric(best.avg_score_log_loss, 3)} /><Metric label="Reference Brier" value={metric(reference?.avg_brier, 3)} /></dl><p className="analysis-card-note">Frozen before outcomes. Review-only; no automatic model promotion.</p></article> : null}
        {[...retrospectiveByGw.entries()].sort((a, b) => b[0] - a[0]).map(([gw, runs]) => <article className="analysis-card gameweek-performance-card is-retrospective" key={gw}><span className="page-eyebrow">GW{gw} · Retrospective blind checks</span><h2>{runs.length} engine run{runs.length === 1 ? '' : 's'}</h2><div className="compact-run-list">{runs.map((row, index) => <div key={`${gw}-${index}-${row.evaluated_fixtures}`}><strong>Run {index + 1}</strong><span>{row.evaluated_fixtures} fixtures</span><small>{pct(row.direction_accuracy)} direction · {metric(row.avg_brier, 3)} Brier</small></div>)}</div><p className="analysis-card-note">Diagnostic only. These replays exclude current-gameweek outcomes from generation but are not forward-valid evidence.</p></article>)}
        {testGameweek ? <article className="analysis-card gameweek-performance-card is-pending"><span className="page-eyebrow">GW{testGameweek} · Forward test</span><h2>{testEvaluated > 0 ? `${testEvaluated} evaluated` : 'Pending'}</h2><p className="analysis-card-note">No accuracy metric is displayed before the test fixtures finish and the frozen cohort is evaluated.</p></article> : null}
      </div>
    </section>

    <section className="analysis-section" aria-labelledby="projection-heading">
      <div className="analysis-section-heading"><div><span className="page-eyebrow">Projection calibration</span><h2 id="projection-heading">Current FPL snapshot</h2></div><p>This compares projections with external benchmarks; it is not realised FPL accuracy.</p></div>
      <article className="analysis-card projection-calibration-card"><dl className="stacked-metrics"><Metric label="Current XI xPts" value={metric(data.summary.current_xi_xpts, 2)} /><Metric label="Benchmark XI xPts" value={metric(data.summary.benchmark_xi_xpts, 2)} /><Metric label="Matched players" value={String(data.summary.matched_players ?? '—')} /><Metric label="MAE vs benchmark" value={metric(data.summary.mae, 3)} /></dl></article>
    </section>

    <details className="analysis-details research-details"><summary>Methodology</summary><div><p>Forward validation is frozen before outcomes and carries more decision weight than retrospective checks. Internal A0005 variant-by-variant tables are intentionally kept out of this human Performance view.</p><p>Current forward key: <strong>{data.validation.forward.selected_ablation_key ?? '—'}</strong>. Frozen FPL run: <strong>{data.frozen_prediction_run_id ?? '—'}</strong>.</p></div></details>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Loading() { return <div className="command-skeleton" aria-busy="true" aria-label="Loading Performance"><div className="skeleton-line is-short"/><div className="skeleton-line is-title"/><div className="skeleton-panel"/></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <section className="state-panel"><span className="page-eyebrow">Performance</span><h1>Validation data is unavailable.</h1><p>No performance metric is reconstructed from stale or incomplete data.</p><Button onClick={onRetry}>Retry validation data</Button></section>; }
