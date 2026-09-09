import { FixtureCard } from '../components/fixtures/FixtureCard';
import { Button } from '../components/primitives/Button';
import { assessCall, evidenceMatchesPrediction, useFixturesData } from '../lib/fixtures';
import { useGameweekStatus } from '../lib/gameweek';

export function FixturesPage({ requestedGameweek }: { requestedGameweek: number }) {
  const { fpl, facts, intelligence, resolvedGameweek } = useFixturesData(requestedGameweek);
  const gameweekStatus = useGameweekStatus();
  if (fpl.isPending) return <FixturesSkeleton />;
  if (fpl.isError || !fpl.data) return <section className="state-panel" aria-live="polite"><span className="page-eyebrow">Fixtures</span><h1>Fixture predictions are temporarily unavailable.</h1><p>The scan surface will not infer match calls when the authoritative prediction contract fails.</p><Button onClick={() => void fpl.refetch()}>Retry predictions</Button></section>;

  const fixtures = fpl.data.fixture_results;
  const historical = fpl.data.snapshot_stage === 'HISTORICAL_FROZEN';
  const factsData = facts.data?.facts_available ? facts.data : null;
  const factsByMatch = new Map((factsData?.fixtures ?? []).map((item) => [item.match_id, item]));
  const intelligenceByMatch = new Map((intelligence.data?.fixtures ?? []).map((item) => [item.match_id, item.high_score_intelligence]));
  const teamCodeByShort = new Map((gameweekStatus.data?.teams ?? []).map((team) => [team.short_name, team.team_code]));
  const assessments = fixtures.map((fixture) => assessCall(fixture.prediction?.markets));
  const strong = assessments.filter((item) => item.state === 'strong').length;
  const lean = assessments.filter((item) => item.state === 'lean').length;
  const noEdge = assessments.filter((item) => item.state === 'no-edge').length;
  const unavailable = assessments.filter((item) => item.state === 'unavailable').length;
  const coverage = historical ? historicalTacticalCoverage(intelligence.data?.fixtures ?? [], fixtures.length) : null;
  const historicalCoveragePartial = Boolean(coverage?.partial);
  const evidencePartial = facts.isError || facts.isPending || intelligence.isError || intelligence.isPending || (facts.data != null && !facts.data.facts_available) || historicalCoveragePartial;
  const syncLabel = historicalCoveragePartial ? 'Historical evidence partial' : evidencePartial ? 'Evidence partial' : historical ? 'Historical evidence preserved' : 'Forecasts aligned';

  return <div className="fixtures-page">
    <header className="page-intro fixtures-intro">
      <div><span className="page-eyebrow">Gameweek {resolvedGameweek || '—'} · Fixture scan</span><h1>Fixtures</h1><p>All fixtures start collapsed for fast scanning. Expand only the match you want to inspect.</p></div>
      <span className={`sync-badge${evidencePartial ? ' is-warning' : ''}`} role="status"><span aria-hidden="true" />{syncLabel}</span>
    </header>

    {historical && coverage ? <aside className="analysis-notice" role="note">
      <strong>{coverage.partial ? 'Historical tactical coverage is partial' : 'Historical tactical coverage preserved'}</strong>
      <span>{coverage.tacticalProfiles}/{coverage.expectedSides} tactical team-side profiles · {coverage.matchupSides}/{coverage.expectedSides} matchup-signal sides · {coverage.expectedXiSides}/{coverage.expectedSides} expected-XI sides were captured pre-kickoff. Missing historical evidence is shown as unavailable and is never backfilled from later models.</span>
    </aside> : null}

    <section className="fixture-summary" aria-label="Fixture call summary">
      <div><span>Strong</span><strong>{strong}</strong></div><div><span>Lean</span><strong>{lean}</strong></div><div><span>No clear edge</span><strong>{noEdge}</strong></div><div><span>Unavailable</span><strong>{unavailable}</strong></div><div><span>Fixtures</span><strong>{fixtures.length}</strong></div>
    </section>

    {fixtures.length ? <section className="fixture-grid" aria-label={`Gameweek ${resolvedGameweek} fixtures`}>
      {fixtures.map((fixture) => {
        const factItem = factsByMatch.get(fixture.match_id);
        const highScore = intelligenceByMatch.get(fixture.match_id);
        const hasComparableSnapshots = fixture.prediction?.snapshot_id != null && factItem?.alignment_basis?.snapshot_id != null;
        const aligned = hasComparableSnapshots && evidenceMatchesPrediction(fixture, factItem);
        const evidenceStatus = aligned ? 'aligned' as const : hasComparableSnapshots ? 'mismatch' as const : 'unavailable' as const;
        return <FixtureCard
          key={fixture.match_id}
          fixture={fixture}
          facts={aligned ? factItem : undefined}
          highScore={highScore}
          highScorePending={intelligence.isPending}
          evidenceStatus={evidenceStatus}
          homeTeamCode={fixture.home_short ? teamCodeByShort.get(fixture.home_short) ?? null : null}
          awayTeamCode={fixture.away_short ? teamCodeByShort.get(fixture.away_short) ?? null : null}
        />;
      })}
    </section> : <section className="state-panel"><h2>No fixtures returned for this Gameweek.</h2><p>Missing fixtures are not treated as zero-probability matches.</p></section>}
  </div>;
}

function historicalTacticalCoverage(items: unknown[], fixtureCount: number) {
  const expectedSides = fixtureCount * 2;
  let tacticalProfiles = 0;
  let matchupSides = 0;
  let expectedXiSides = 0;
  for (const raw of items) {
    const fixture = asRecord(raw);
    for (const key of ['home_team', 'away_team'] as const) {
      const side = asRecord(fixture?.[key]);
      if (asRecord(side?.tactical_profile)) tacticalProfiles += 1;
      if (Array.isArray(side?.matchup_signals) && side.matchup_signals.length > 0) matchupSides += 1;
      if (Array.isArray(side?.expected_xi) && side.expected_xi.length > 0) expectedXiSides += 1;
    }
  }
  return {
    expectedSides,
    tacticalProfiles,
    matchupSides,
    expectedXiSides,
    partial: expectedSides > 0 && (tacticalProfiles < expectedSides || matchupSides < expectedSides || expectedXiSides < expectedSides),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function FixturesSkeleton() {
  return <div className="command-skeleton" aria-busy="true" aria-label="Loading fixtures"><div className="skeleton-line is-short" /><div className="skeleton-line is-title" /><div className="fixture-grid"><div className="skeleton-panel" /><div className="skeleton-panel" /></div></div>;
}
