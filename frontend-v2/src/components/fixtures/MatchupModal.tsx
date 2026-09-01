import type { FixtureFact, FixtureFactsItem, FplFixtureResult } from '../../lib/contracts';
import { assessCall, buildMatchStory, groupModalFacts, outcomeLabel, precisePercent } from '../../lib/fixtures';
import { Dialog } from '../primitives/Dialog';

export function MatchupModal({ open, onClose, fixture, facts }: { open: boolean; onClose: () => void; fixture: FplFixtureResult; facts: FixtureFactsItem }) {
  const home = fixture.home_team ?? facts.home.name ?? 'Home';
  const away = fixture.away_team ?? facts.away.name ?? 'Away';
  const prediction = fixture.prediction;
  const assessment = assessCall(prediction?.markets);
  const groups = groupModalFacts(facts.modal_facts);
  const story = buildMatchStory(fixture, facts);
  const call = assessment.top ? outcomeLabel(assessment.top.code, home, away) : 'Unavailable';
  const rawPrediction = prediction as (Record<string, unknown> | null | undefined);
  const rawModalProbability = numeric(rawPrediction?.raw_modal_probability);
  const scriptConfidence = numeric(rawPrediction?.script_confidence);
  const scriptFamily = text(rawPrediction?.script_family);
  const selector = object(rawPrediction?.selector);

  return <Dialog open={open} onClose={onClose} title={`${home} vs ${away}`} eyebrow="Matchup intelligence">
    <section className="modal-thesis" aria-label="Match thesis">
      <div><span>1X2 thesis</span><strong>{assessment.state === 'no-edge' ? 'No clear edge' : call}</strong><small>{assessment.top ? `${precisePercent(assessment.top.probability)} leading probability` : 'Probability unavailable'}</small></div>
      <div><span>Score call</span><strong>{prediction?.headline_score ?? '—'}</strong><small>{prediction?.headline_score_probability == null ? 'Probability unavailable' : `${precisePercent(prediction.headline_score_probability)} exact-score probability`}</small></div>
    </section>

    <section className="match-story" aria-labelledby={`story-${fixture.match_id}`}>
      <span className="modal-section-label">Match story</span>
      <p id={`story-${fixture.match_id}`}>{story}</p>
    </section>

    <div className="modal-evidence-grid">
      <EvidenceGroup title="Supports the call" facts={groups.supports} kind="support" empty="No supporting input cleared the display gate." />
      <EvidenceGroup title="Counterpoints / risks" facts={groups.contradicts} kind="risk" empty="No current counter-input cleared the evidence gate." />
    </div>

    {groups.neutral.length ? <EvidenceGroup title="Additional context" facts={groups.neutral} kind="neutral" /> : null}

    <details className="technical-disclosure">
      <summary>Technical details</summary>
      <div className="technical-grid">
        <TechnicalItem label="Snapshot" value={prediction?.snapshot_id == null ? '—' : `#${prediction.snapshot_id}`} />
        <TechnicalItem label="Source layer" value={prediction?.source_change_id ?? '—'} />
        <TechnicalItem label="Captured" value={prediction?.captured_at ? formatTimestamp(prediction.captured_at) : '—'} />
        <TechnicalItem label="Expected goals" value={prediction?.home_lambda == null || prediction.away_lambda == null ? '—' : `${prediction.home_lambda.toFixed(2)} – ${prediction.away_lambda.toFixed(2)}`} />
        <TechnicalItem label="Headline score" value={prediction?.headline_score ?? '—'} />
        <TechnicalItem label="Raw modal score" value={prediction?.raw_modal_score ?? '—'} />
        <TechnicalItem label="Raw modal probability" value={rawModalProbability == null ? '—' : precisePercent(rawModalProbability)} />
        <TechnicalItem label="Script family" value={scriptFamily ?? '—'} />
        <TechnicalItem label="Script confidence" value={scriptConfidence == null ? '—' : precisePercent(scriptConfidence)} />
        <TechnicalItem label="Selector rule" value={text(selector?.selector_rule) ?? '—'} wide />
      </div>
      {prediction?.top_scorelines?.length ? <div className="scoreline-audit"><span>Top raw score cells</span><div>{prediction.top_scorelines.slice(0, 3).map((row) => <span key={row.score}><strong>{row.score}</strong> {precisePercent(row.prob)}</span>)}</div></div> : null}
    </details>
  </Dialog>;
}

function EvidenceGroup({ title, facts, kind, empty }: { title: string; facts: FixtureFact[]; kind: 'support' | 'risk' | 'neutral'; empty?: string }) {
  return <section className={`modal-evidence-group is-${kind}`}>
    <h3>{title}</h3>
    {facts.length ? <ul>{facts.map((fact) => <li key={fact.id}>{fact.one_liner}</li>)}</ul> : <p className="modal-evidence-empty">{empty ?? 'No additional evidence surfaced.'}</p>}
  </section>;
}

function TechnicalItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? 'is-wide' : ''}><span>{label}</span><strong>{value}</strong></div>;
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
