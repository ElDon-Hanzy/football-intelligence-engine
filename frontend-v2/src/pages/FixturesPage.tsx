import { Button } from '../components/primitives/Button';
import { FixtureCard } from '../components/fixtures/FixtureCard';
import { assessCall, evidenceMatchesPrediction, useFixturesData } from '../lib/fixtures';

export function FixturesPage({ requestedGameweek }: { requestedGameweek: number }) {
  const { fpl, facts, resolvedGameweek } = useFixturesData(requestedGameweek);
  if (fpl.isPending) return <FixturesSkeleton />;
  if (fpl.isError || !fpl.data) return <section className="state-panel" aria-live="polite"><span className="page-eyebrow">Fixtures</span><h1>Fixture predictions are temporarily unavailable.</h1><p>The scan surface will not infer match calls when the authoritative prediction contract fails.</p><Button onClick={() => void fpl.refetch()}>Retry predictions</Button></section>;

  const fixtures = fpl.data.fixture_results;
  const factsData = facts.data?.facts_available ? facts.data : null;
  const factsByMatch = new Map((factsData?.fixtures ?? []).map((item) => [item.match_id, item]));
  const assessments = fixtures.map((fixture) => assessCall(fixture.prediction?.markets));
  const strong = assessments.filter((item) => item.state === 'strong').length;
  const lean = assessments.filter((item) => item.state === 'lean').length;
  const noEdge = assessments.filter((item) => item.state === 'no-edge').length;
  const evidencePartial = facts.isError || facts.isPending || (facts.data != null && !facts.data.facts_available);

  return <div className="fixtures-page">
    <header className="page-intro fixtures-intro">
      <div><span className="page-eyebrow">Gameweek {resolvedGameweek || '—'} · Fixture scan</span><h1>Fixtures</h1><p>Outcome first, then score, form and only the evidence that belongs to the same frozen forecast.</p></div>
      <span className={`sync-badge${evidencePartial ? ' is-warning' : ''}`} role="status"><span aria-hidden="true" />{evidencePartial ? 'Evidence partial' : 'Forecasts aligned'}</span>
    </header>

    <section className="fixture-summary" aria-label="Fixture call summary">
      <div><span>Strong</span><strong>{strong}</strong></div><div><span>Lean</span><strong>{lean}</strong></div><div><span>No clear edge</span><strong>{noEdge}</strong></div><div><span>Fixtures</span><strong>{fixtures.length}</strong></div>
    </section>

    {fixtures.length ? <section className="fixture-grid" aria-label={`Gameweek ${resolvedGameweek} fixtures`}>
      {fixtures.map((fixture) => {
        const factItem = factsByMatch.get(fixture.match_id);
        const hasComparableSnapshots = fixture.prediction?.snapshot_id != null && factItem?.alignment_basis?.snapshot_id != null;
        const aligned = hasComparableSnapshots && evidenceMatchesPrediction(fixture, factItem);
        const evidenceStatus = aligned ? 'aligned' as const : hasComparableSnapshots ? 'mismatch' as const : 'unavailable' as const;
        return <FixtureCard key={fixture.match_id} fixture={fixture} facts={aligned ? factItem : undefined} evidenceStatus={evidenceStatus} />;
      })}
    </section> : <section className="state-panel"><h2>No fixtures returned for this Gameweek.</h2><p>Missing fixtures are not treated as zero-probability matches.</p></section>}
  </div>;
}

function FixturesSkeleton() {
  return <div className="command-skeleton" aria-busy="true" aria-label="Loading fixtures"><div className="skeleton-line is-short" /><div className="skeleton-line is-title" /><div className="fixture-grid"><div className="skeleton-panel" /><div className="skeleton-panel" /></div></div>;
}
