import { Button } from '../components/primitives/Button';
import { outcomeComparisons, pct, strongestModelOutcome, useMarketsData } from '../lib/analysis';
import type { BettingFixture } from '../lib/analysis-contracts';

type ResearchEdge = {
  matchId: number;
  fixture: string;
  selection: string;
  bookmaker: string;
  odds: number | null;
  modelProbability: number | null;
  expectedValue: number | null;
  minEdge: number | null;
  evidenceQuality: string | null;
};

export function MarketsPage({ requestedGameweek }: { requestedGameweek: number }) {
  const query = useMarketsData(requestedGameweek);
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const priced = data.fixtures.filter((fixture) => fixture.bookmaker_odds.length > 0).length;
  const researchObservations = data.fixtures.reduce((sum, fixture) => sum + (fixture.edge_research?.observation_count ?? 0), 0);
  const noMarket = data.odds_status !== 'connected' || priced === 0;
  const shortlist = researchShortlist(data.fixtures).slice(0, 4);

  return <div className="analysis-page markets-page">
    <header className="page-intro analysis-intro">
      <div><span className="page-eyebrow">Gameweek {data.gameweek} · market intelligence</span><h1>Markets</h1><p>Rank the strongest current bookmaker disagreements first; keep diagnostics secondary.</p></div>
      <span className="sync-badge is-warning" role="status"><span aria-hidden="true" />Research model</span>
    </header>

    <section className="markets-top4" aria-labelledby="top-bets-heading">
      <div className="analysis-section-heading markets-top4-heading">
        <div><span className="page-eyebrow">Current Gameweek only</span><h2 id="top-bets-heading">Top 4 Bets</h2></div>
        <p>Latest valid pre-kickoff bookmaker snapshots, ranked by robust-positive research EV. Research is not yet a validated staking model.</p>
      </div>

      {shortlist.length ? <div className="top-bet-grid">{shortlist.map((edge, index) => <TopBetCard edge={edge} rank={index + 1} key={`${edge.matchId}-${edge.selection}-${edge.bookmaker}`} />)}</div>
        : <div className="market-waiting-state" role="status"><span>Market feed</span><strong>Waiting for GW{data.gameweek} prices</strong><p>No current bookmaker snapshot exists for this Gameweek yet, so there is nothing honest to rank. Historical GW1/GW2 selections are not carried forward.</p></div>}
    </section>

    <section className="market-status-strip" aria-label="Market status">
      <Metric label="Market feed" value={noMarket ? 'Waiting' : 'Connected'} />
      <Metric label="Priced fixtures" value={`${priced}/${data.fixtures.length}`} />
      <Metric label="Research observations" value={String(researchObservations)} />
      <Metric label="Top-4 state" value={shortlist.length ? `${shortlist.length} ranked` : 'Pending prices'} />
    </section>

    <p className="market-validation-note"><strong>Validation status:</strong> edge/CLV research remains model_effect_enabled=false. This affects staking confidence, not whether useful market disagreement should be surfaced.</p>

    <details className="market-diagnostics-disclosure">
      <summary>All fixture market diagnostics</summary>
      <div className="market-diagnostics-body">
        {data.warnings.length ? <aside className="analysis-notice" role="note"><strong>Feed notes</strong><span>{data.warnings.join(' · ')}</span></aside> : null}
        <div className="analysis-section-heading"><div><span className="page-eyebrow">Diagnostics</span><h2>Model vs market</h2></div><p>Raw gaps and fixture-level prices are diagnostic context, not the primary decision surface.</p></div>
        <div className="market-fixture-grid">{data.fixtures.map((fixture) => <MarketFixtureCard key={fixture.match_id} fixture={fixture} />)}</div>
      </div>
    </details>
  </div>;
}

function TopBetCard({ edge, rank }: { edge: ResearchEdge; rank: number }) {
  return <article className="top-bet-card">
    <header><span className="research-rank">#{rank}</span><div><small>{edge.fixture}</small><h3>{edge.selection}</h3></div><span className="market-action-chip is-research">Research</span></header>
    <div className="top-bet-book"><span>Best displayed bookmaker</span><strong>{edge.bookmaker}</strong></div>
    <dl className="top-bet-metrics">
      <Metric label="Odds" value={edge.odds == null ? '—' : edge.odds.toFixed(2)} />
      <Metric label="Model P" value={edge.modelProbability == null ? '—' : pct(edge.modelProbability)} />
      <Metric label="Research EV" value={edge.expectedValue == null ? '—' : signedPct(edge.expectedValue)} />
      <Metric label="Min edge" value={edge.minEdge == null ? '—' : signedPct(edge.minEdge)} />
    </dl>
    <small className="top-bet-quality">{edge.evidenceQuality ? `${edge.evidenceQuality} evidence quality · ` : ''}unvalidated research</small>
  </article>;
}

function MarketFixtureCard({ fixture }: { fixture: BettingFixture }) {
  const comparisons = outcomeComparisons(fixture);
  const strongest = strongestModelOutcome(fixture);
  const pricesAvailable = fixture.bookmaker_odds.length > 0;
  const scoreWatch = pricesAvailable ? topScoreWatch(fixture) : null;
  return <article className="market-card">
    <header className="market-card-head"><div><small>{fixture.home_short ?? 'HOME'} · {fixture.away_short ?? 'AWAY'}</small><h3>{fixture.home_team ?? 'Home'} <span>vs</span> {fixture.away_team ?? 'Away'}</h3></div><span className={`market-action-chip${pricesAvailable ? ' is-research' : ' is-missing'}`}>{pricesAvailable ? 'UNVALIDATED' : 'NO MARKET DATA'}</span></header>
    <div className="market-call"><span>Model lean</span><strong>{strongest?.label ?? 'Unavailable'}</strong><b>{pct(strongest?.modelProbability)}</b></div>
    <div className="market-comparison" aria-label={`${fixture.home_team ?? 'Home'} versus ${fixture.away_team ?? 'Away'} 1X2 comparison`}>
      {comparisons.map((row) => <div key={row.code}><span>{row.label}</span><strong>{pct(row.modelProbability)}</strong><small>{pricesAvailable && row.marketImplied != null ? `Market ${pct(row.marketImplied)} · raw gap ${signedPct(row.rawGap)}` : 'Market —'}</small></div>)}
    </div>
    {pricesAvailable ? <p className="market-source-line">Best displayed prices span {fixture.bookmaker_count ?? '—'} bookmaker families and {fixture.market_count ?? '—'} markets.</p> : <p className="market-empty">No bookmaker snapshot for this fixture. Missing odds are not interpreted as zero edge or “No Bet”.</p>}
    {scoreWatch ? <div className="score-watch"><span>Exact-score market comparison</span><strong>{scoreWatch.score}</strong><small>{scoreWatch.odds != null ? `${scoreWatch.odds.toFixed(2)} best displayed odds` : 'price unavailable'}</small></div> : null}
    {(fixture.edge_research || fixture.clv_research) ? <details className="analysis-details"><summary>Research diagnostics</summary><div className="research-warning"><strong>Research only · no production effect</strong><p>Edge and CLV observations remain model_effect_enabled=false. They are visible for validation, not staking.</p>{fixture.edge_research ? <span>Edge observations: {fixture.edge_research.observation_count} · robust-positive labels: {fixture.edge_research.robust_positive_ev_count}</span> : null}</div></details> : null}
  </article>;
}

function researchShortlist(fixtures: BettingFixture[]): ResearchEdge[] {
  const bestByBet = new Map<string, ResearchEdge>();
  for (const fixture of fixtures) {
    const rawRows = fixture.edge_research?.top_robust_positive_ev;
    if (!Array.isArray(rawRows)) continue;
    for (const raw of rawRows) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      const selection = typeof row.selection_name === 'string' ? row.selection_name : null;
      const bookmaker = typeof row.bookmaker === 'string' ? row.bookmaker : null;
      if (!selection || !bookmaker) continue;
      const edge: ResearchEdge = {
        matchId: fixture.match_id,
        fixture: `${fixture.home_short ?? fixture.home_team ?? 'HOME'}–${fixture.away_short ?? fixture.away_team ?? 'AWAY'}`,
        selection,
        bookmaker,
        odds: numberOrNull(row.decimal_odds),
        modelProbability: numberOrNull(row.model_probability),
        expectedValue: numberOrNull(row.expected_value),
        minEdge: numberOrNull(row.min_edge_across_methods),
        evidenceQuality: typeof row.evidence_quality === 'string' ? row.evidence_quality : null,
      };
      const key = `${edge.matchId}|${edge.selection}`;
      const current = bestByBet.get(key);
      if (!current || (edge.expectedValue ?? -Infinity) > (current.expectedValue ?? -Infinity)) bestByBet.set(key, edge);
    }
  }
  return [...bestByBet.values()].sort((a, b) => (b.expectedValue ?? -Infinity) - (a.expectedValue ?? -Infinity));
}

function topScoreWatch(fixture: BettingFixture): { score: string; odds: number | null } | null {
  const raw = fixture.prediction?.top_scorelines?.[0];
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const score = typeof row.score === 'string' ? row.score : null;
  if (!score) return null;
  const price = fixture.correct_score_odds.filter((item) => item.selection_name === score).sort((a, b) => b.decimal_odds - a.decimal_odds)[0];
  return { score, odds: price?.decimal_odds ?? null };
}

function numberOrNull(value: unknown): number | null { const result = typeof value === 'number' ? value : Number(value); return Number.isFinite(result) ? result : null; }
function signedPct(value: number | null): string { if (value == null) return '—'; return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`; }
function Metric({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Loading() { return <div className="command-skeleton" aria-busy="true" aria-label="Loading Markets"><div className="skeleton-line is-short"/><div className="skeleton-line is-title"/><div className="skeleton-panel"/></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <section className="state-panel"><span className="page-eyebrow">Markets</span><h1>Market data is unavailable.</h1><p>No edge or bet state is inferred when the contract cannot be read.</p><Button onClick={onRetry}>Retry market data</Button></section>; }
