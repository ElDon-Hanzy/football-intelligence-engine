import { Button } from '../components/primitives/Button';
import { useEngineData } from '../lib/analysis';

export function EnginePage({ requestedGameweek }: { requestedGameweek: number }) {
  const query = useEngineData(requestedGameweek);
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const a0005 = data.experiments.A0005;
  const w0002 = data.experiments.W0002;
  const sourceRows = asRecords(data.source_health.zero_cost.sources);
  const governanceClean = data.governance.ok && data.governance.bad_change_ids === 0 && data.governance.completed_not_verified === 0 && data.governance.completed_without_refs === 0;

  return <div className="analysis-page engine-page">
    <header className="page-intro analysis-intro">
      <div><span className="page-eyebrow">Gameweek {data.gameweek} · diagnostics</span><h1>Engine & Research</h1><p>Production identity, source health, validation experiments and governance live here—not in the core decision surfaces.</p></div>
      <span className={`sync-badge${governanceClean ? '' : ' is-warning'}`} role="status"><span aria-hidden="true" />{governanceClean ? 'Governance clean' : 'Review required'}</span>
    </header>

    <section className="analysis-hero" aria-labelledby="engine-title">
      <div><span className="decision-label">Production identity</span><h2 id="engine-title">Model {data.active_model?.version ?? 'unavailable'}</h2><p>{data.production_fixture_layer.change_ids.length ? `Current fixture layer: ${data.production_fixture_layer.change_ids.join(' + ')}.` : 'Fixture-layer identity unavailable.'} Historical forecasts remain immutable.</p></div>
      <dl className="analysis-hero-metrics"><Metric label="Latest FPL run" value={data.latest_prediction_run ? `#${data.latest_prediction_run.id}` : '—'} /><Metric label="Fixture snapshots" value={String(data.production_fixture_layer.fixtures)} /><Metric label="Decision audit" value={auditLabel(data.decision_evidence_audit)} /><Metric label="Evidence audit" value={auditLabel(data.production_evidence_audit)} /></dl>
    </section>

    <section className="analysis-section two-column-analysis" aria-label="Governance and production state">
      <article className="analysis-card"><span className="page-eyebrow">Governance</span><h2>{governanceClean ? 'Clean ledger' : 'Attention required'}</h2><dl className="stacked-metrics"><Metric label="Tracker rows" value={String(data.governance.total_rows)} /><Metric label="Decision rows" value={String(data.governance.decision_rows)} /><Metric label="Bad Change IDs" value={String(data.governance.bad_change_ids)} /><Metric label="Completed without refs" value={String(data.governance.completed_without_refs)} /></dl></article>
      <article className="analysis-card"><span className="page-eyebrow">Production semantics</span><h2>Fail-closed rules active</h2><ul className="plain-status-list"><li>Research status is not production effect.</li><li>Missing data is not zero.</li><li>Historical forecasts remain immutable.</li><li>Evidence audits are read from the recurring production guardrail.</li></ul></article>
    </section>

    <section className="analysis-section" aria-labelledby="source-heading"><div className="analysis-section-heading"><div><span className="page-eyebrow">Data layer</span><h2 id="source-heading">Source health</h2></div><p>Availability is not the same as production readiness.</p></div><div className="source-health-grid">
      {sourceRows.map((row, index) => <article className="source-health-card" key={String(row.source_key ?? index)}><header><strong>{human(String(row.source_key ?? 'source'))}</strong><span>{row.any_production_ready === true ? 'Production ready' : 'Research only'}</span></header><dl><Metric label="Available" value={String(row.available ?? '—')} /><Metric label="Blocked" value={String(row.blocked ?? '—')} /><Metric label="Current EPL" value={row.any_current_epl_scope === true ? 'Yes' : 'No'} /></dl></article>)}
      <article className="source-health-card"><header><strong>FotMob metric layer</strong><span>Research only</span></header><dl><Metric label="Rows" value={String(data.source_health.fotmob_metrics.rows)} /><Metric label="Usable" value={String(data.source_health.fotmob_metrics.usable_rows)} /><Metric label="Model-effect violations" value={String(data.source_health.fotmob_metrics.integrity_violations?.model_effect_enabled ?? 0)} /></dl></article>
      <article className="source-health-card"><header><strong>Physical-load state</strong><span>Research only</span></header><dl><Metric label="Teams" value={String(data.source_health.physical_load.latest_teams)} /><Metric label="Rows" value={String(data.source_health.physical_load.rows)} /><Metric label="Model-effect violations" value={String(data.source_health.physical_load.integrity_violations?.model_effect_enabled ?? 0)} /></dl></article>
    </div></section>

    <section className="analysis-section" aria-labelledby="experiment-heading"><div className="analysis-section-heading"><div><span className="page-eyebrow">Frozen experiments</span><h2 id="experiment-heading">Forward validation</h2></div><p>Experiment status is shown explicitly and never promoted by UI wording.</p></div><div className="experiment-grid"><ExperimentCard name="A0005" state={a0005.decision_state ?? 'Unknown'} coverage={a0005.coverage} /><ExperimentCard name="W0002" state={w0002.decision_state ?? 'Unknown'} coverage={w0002.coverage} /></div></section>

    <details className="analysis-details research-details"><summary>Raw diagnostic contract</summary><pre className="diagnostic-json">{JSON.stringify({ production_fixture_layer: data.production_fixture_layer, governance: data.governance, decision_evidence_audit: data.decision_evidence_audit, production_evidence_audit: data.production_evidence_audit }, null, 2)}</pre></details>
  </div>;
}

function ExperimentCard({ name, state, coverage }: { name: string; state: string; coverage: unknown }) {
  const record = asRecord(coverage);
  return <article className="analysis-card experiment-card"><span className="page-eyebrow">{name}</span><h2>{human(state)}</h2><dl className="stacked-metrics"><Metric label="Fixtures" value={String(record.fixtures ?? '—')} /><Metric label="Evaluations" value={String(record.evaluations ?? '—')} /><Metric label="Predictions" value={String(record.predictions ?? '—')} /></dl><p className="analysis-card-note">Research / validation state. No automatic production promotion.</p></article>;
}
function auditLabel(value: Record<string, unknown>): string { return value.ok === true ? 'PASS' : value.ok === false ? 'FAIL' : '—'; }
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function asRecords(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').map((item) => item as Record<string, unknown>) : []; }
function human(value: string): string { return value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()); }
function Metric({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Loading() { return <div className="command-skeleton" aria-busy="true" aria-label="Loading Engine diagnostics"><div className="skeleton-line is-short"/><div className="skeleton-line is-title"/><div className="skeleton-panel"/></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <section className="state-panel"><span className="page-eyebrow">Engine</span><h1>Diagnostics are unavailable.</h1><p>Production or research status is never inferred from a failed diagnostics contract.</p><Button onClick={onRetry}>Retry diagnostics</Button></section>; }
