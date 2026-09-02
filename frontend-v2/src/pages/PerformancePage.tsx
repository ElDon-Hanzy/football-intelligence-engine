import { Button } from '../components/primitives/Button';
import { metric, pct, usePerformanceData } from '../lib/analysis';

export function PerformancePage({ requestedGameweek }: { requestedGameweek: number }) {
  const query = usePerformanceData(requestedGameweek);
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const variants = data.validation.forward.variants ?? [];
  const validation = variants.filter((row) => row.split === 'VALIDATION' && (row.evaluated_fixtures ?? 0) > 0 && row.avg_brier != null).sort((a, b) => (a.avg_brier ?? Infinity) - (b.avg_brier ?? Infinity));
  const best = validation[0] ?? null;
  const base = validation.find((row) => row.variant_key === 'BASE_V03_ELO') ?? null;
  const testRows = variants.filter((row) => row.split === 'TEST');
  const testEvaluated = Math.max(0, ...testRows.map((row) => row.evaluated_fixtures ?? 0));
  const retrospective = data.validation.retrospective.filter((row) => row.evaluated_fixtures > 0);

  return <div className="analysis-page performance-page">
    <header className="page-intro analysis-intro">
      <div><span className="page-eyebrow">Gameweek {data.gameweek} · validation</span><h1>Performance</h1><p>Sample size first. Forward validation is separated from retrospective diagnostics, and pending metrics remain blank rather than becoming zeros.</p></div>
      <span className="sync-badge" role="status"><span aria-hidden="true" />{data.active_model}</span>
    </header>

    <section className="analysis-hero" aria-labelledby="performance-title">
      <div><span className="decision-label">Forward validation</span><h2 id="performance-title">{best ? `${best.evaluated_fixtures ?? 0} fixtures evaluated` : 'No completed forward sample'}</h2><p>{best ? `${best.variant_key} is the strongest current validation row by Brier score. This is evidence for review, not automatic promotion.` : 'Metrics remain pending until the frozen validation cohort is evaluated.'}</p></div>
      <dl className="analysis-hero-metrics">
        <Metric label="Direction" value={pct(best?.direction_accuracy, 0)} />
        <Metric label="Brier" value={metric(best?.avg_brier, 3)} />
        <Metric label="Log loss" value={metric(best?.avg_score_log_loss, 3)} />
        <Metric label="Test sample" value={testEvaluated > 0 ? `${testEvaluated} evaluated` : 'Pending'} />
      </dl>
    </section>

    <section className="analysis-section" aria-labelledby="forward-heading">
      <div className="analysis-section-heading"><div><span className="page-eyebrow">A0005</span><h2 id="forward-heading">Forward validation variants</h2></div><p>Lower Brier/log loss is better. Direction accuracy is shown only where outcomes have been evaluated.</p></div>
      {validation.length ? <div className="performance-table-wrap" role="region" aria-label="Forward validation variants table" tabIndex={0}><table className="performance-table"><thead><tr><th>Variant</th><th>n</th><th>Direction</th><th>Brier</th><th>Log loss</th><th>Δ Brier vs base</th></tr></thead><tbody>{validation.map((row) => <tr key={row.variant_key} className={row.variant_key === best?.variant_key ? 'is-best' : ''}><th>{row.variant_key}</th><td>{row.evaluated_fixtures ?? '—'}</td><td>{pct(row.direction_accuracy)}</td><td>{metric(row.avg_brier, 3)}</td><td>{metric(row.avg_score_log_loss, 3)}</td><td>{brierDelta(row.avg_brier, base?.avg_brier)}</td></tr>)}</tbody></table></div> : <div className="analysis-empty"><strong>Validation metrics pending</strong><span>No completed rows are available for this cohort.</span></div>}
      {testEvaluated === 0 ? <aside className="analysis-notice" role="note"><strong>GW3 test remains unevaluated</strong><span>No TEST accuracy metric is displayed until fixtures are completed and evaluated.</span></aside> : null}
    </section>

    <section className="analysis-section two-column-analysis" aria-label="Projection calibration and retrospective evaluation">
      <article className="analysis-card"><span className="page-eyebrow">FPL projection calibration</span><h2>Current snapshot</h2><dl className="stacked-metrics"><Metric label="Current XI xPts" value={metric(data.summary.current_xi_xpts, 2)} /><Metric label="Benchmark XI xPts" value={metric(data.summary.benchmark_xi_xpts, 2)} /><Metric label="Matched players" value={String(data.summary.matched_players ?? '—')} /><Metric label="MAE vs benchmark" value={metric(data.summary.mae, 3)} /></dl><p className="analysis-card-note">Benchmark agreement is a projection comparison, not realised FPL accuracy.</p></article>
      <article className="analysis-card"><span className="page-eyebrow">Retrospective engine checks</span><h2>{retrospective.length ? `${retrospective.length} evaluated runs` : 'No evaluated runs'}</h2>{retrospective.length ? <div className="compact-run-list">{retrospective.slice(0, 4).map((row) => <div key={`${row.gameweek}-${row.evaluated_fixtures}`}><strong>GW{row.gameweek}</strong><span>{row.evaluated_fixtures} fixtures</span><small>{pct(row.direction_accuracy)} direction · {metric(row.avg_brier, 3)} Brier</small></div>)}</div> : <p className="analysis-card-note">This section stays compact until evaluation rows exist.</p>}</article>
    </section>

    <details className="analysis-details research-details"><summary>Validation methodology & pending research</summary><div><p>Forward validation is frozen before outcomes, and model promotion requires a completed sample plus manual review. Pending cohorts and missing CLV/process metrics are displayed as pending—not zero.</p><p>Current forward key: <strong>{data.validation.forward.selected_ablation_key ?? '—'}</strong>. Frozen FPL run: <strong>{data.frozen_prediction_run_id ?? '—'}</strong>.</p></div></details>
  </div>;
}

function brierDelta(value: number | null | undefined, base: number | null | undefined): string {
  if (value == null || base == null) return '—';
  const delta = value - base;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(3)}`;
}
function Metric({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Loading() { return <div className="command-skeleton" aria-busy="true" aria-label="Loading Performance"><div className="skeleton-line is-short"/><div className="skeleton-line is-title"/><div className="skeleton-panel"/></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <section className="state-panel"><span className="page-eyebrow">Performance</span><h1>Validation data is unavailable.</h1><p>No performance metric is reconstructed from stale or incomplete data.</p><Button onClick={onRetry}>Retry validation data</Button></section>; }
