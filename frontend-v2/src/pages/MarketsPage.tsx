import { Button } from '../components/primitives/Button';
import { outcomeComparisons, pct, strongestModelOutcome, useMarketsData } from '../lib/analysis';
import type { BettingFixture } from '../lib/analysis-contracts';

export function MarketsPage({ requestedGameweek }: { requestedGameweek: number }) {
  const query = useMarketsData(requestedGameweek);
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const priced = data.fixtures.filter((fixture) => fixture.bookmaker_odds.length > 0).length;
  const researchObservations = data.fixtures.reduce((sum, fixture) => sum + (fixture.edge_research?.observation_count ?? 0), 0);
  const noMarket = data.odds_status !== 'connected' || priced === 0;

  return <div className="analysis-page markets-page">
    <header className="page-intro analysis-intro">
      <div><span className="page-eyebrow">Gameweek {data.gameweek} · market discipline</span><h1>Markets</h1><p>Model probabilities and bookmaker prices are kept separate from validation. Research signals never become bets by presentation alone.</p></div>
      <span className="sync-badge is-warning" role="status"><span aria-hidden="true" />Research only</span>
    </header>

    <section className="analysis-hero is-caution" aria-labelledby="market-action-title">
      <div><span className="decision-label">Current action</span><h2 id="market-action-title">NO VALIDATED BET EDGE</h2><p>{noMarket ? 'Current GW bookmaker prices are not available yet, so no market comparison can be made.' : 'Prices are connected, but the edge/CLV layer is still unvalidated and model_effect_enabled=false.'}</p></div>
      <dl className="analysis-hero-metrics">
        <Metric label="Market feed" value={noMarket ? 'No current data' : 'Connected'} />
        <Metric label="Priced fixtures" value={`${priced}/${data.fixtures.length}`} />
        <Metric label="Research observations" value={String(researchObservations)} />
        <Metric label="Validated bets" value="0" />
      </dl>
    </section>

    {data.warnings.length ? <aside className="analysis-notice" role="note"><strong>Feed notes</strong><span>{data.warnings.join(' · ')}</span></aside> : null}

    <section className="analysis-section" aria-labelledby="market-fixtures-heading">
      <div className="analysis-section-heading"><div><span className="page-eyebrow">Fixture scan</span><h2 id="market-fixtures-heading">Model vs market</h2></div><p>“Raw gap” is model probability minus the best displayed implied probability. It is not a validated betting edge.</p></div>
      <div className="market-fixture-grid">{data.fixtures.map((fixture) => <MarketFixtureCard key={fixture.match_id} fixture={fixture} />)}</div>
    </section>
  </div>;
}

function MarketFixtureCard({ fixture }: { fixture: BettingFixture }) {
  const comparisons = outcomeComparisons(fixture);
  const strongest = strongestModelOutcome(fixture);
  const pricesAvailable = fixture.bookmaker_odds.length > 0;
  const scoreWatch = topScoreWatch(fixture);
  return <article className="market-card">
    <header className="market-card-head"><div><small>{fixture.home_short ?? 'HOME'} · {fixture.away_short ?? 'AWAY'}</small><h3>{fixture.home_team ?? 'Home'} <span>vs</span> {fixture.away_team ?? 'Away'}</h3></div><span className="market-action-chip">NO BET</span></header>
    <div className="market-call"><span>Model lean</span><strong>{strongest?.label ?? 'Unavailable'}</strong><b>{pct(strongest?.modelProbability)}</b></div>
    <div className="market-comparison" aria-label={`${fixture.home_team ?? 'Home'} versus ${fixture.away_team ?? 'Away'} 1X2 comparison`}>
      {comparisons.map((row) => <div key={row.code}><span>{row.label}</span><strong>{pct(row.modelProbability)}</strong><small>{pricesAvailable && row.marketImplied != null ? `Market ${pct(row.marketImplied)} · raw gap ${signedPct(row.rawGap)}` : 'Market —'}</small></div>)}
    </div>
    {pricesAvailable ? <p className="market-source-line">Best displayed prices span {fixture.bookmaker_count ?? '—'} bookmaker families and {fixture.market_count ?? '—'} markets.</p> : <p className="market-empty">Market price unavailable. Missing data is not interpreted as zero edge.</p>}
    {scoreWatch ? <div className="score-watch"><span>Correct-score watch</span><strong>{scoreWatch.score}</strong><small>{scoreWatch.modelProbability != null ? `${pct(scoreWatch.modelProbability, 1)} model` : 'model probability —'}{scoreWatch.odds != null ? ` · ${scoreWatch.odds.toFixed(2)} best displayed odds` : ' · price unavailable'}</small></div> : null}
    {(fixture.edge_research || fixture.clv_research) ? <details className="analysis-details"><summary>Unvalidated research</summary><div className="research-warning"><strong>Research only · no production effect</strong><p>Edge and CLV observations remain model_effect_enabled=false. They are visible for validation, not staking.</p>{fixture.edge_research ? <span>Edge observations: {fixture.edge_research.observation_count} · robust-positive labels: {fixture.edge_research.robust_positive_ev_count}</span> : null}</div></details> : null}
  </article>;
}

function topScoreWatch(fixture: BettingFixture): { score: string; modelProbability: number | null; odds: number | null } | null {
  const raw = fixture.prediction?.top_scorelines?.[0];
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const score = typeof row.score === 'string' ? row.score : null;
  if (!score) return null;
  const probability = typeof row.prob === 'number' ? row.prob : typeof row.probability === 'number' ? row.probability : null;
  const price = fixture.correct_score_odds.filter((item) => item.selection_name === score).sort((a, b) => b.decimal_odds - a.decimal_odds)[0];
  return { score, modelProbability: probability, odds: price?.decimal_odds ?? null };
}

function signedPct(value: number | null): string {
  if (value == null) return '—';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Loading() { return <div className="command-skeleton" aria-busy="true" aria-label="Loading Markets"><div className="skeleton-line is-short"/><div className="skeleton-line is-title"/><div className="skeleton-panel"/></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <section className="state-panel"><span className="page-eyebrow">Markets</span><h1>Market data is unavailable.</h1><p>No edge or bet state is inferred when the contract cannot be read.</p><Button onClick={onRetry}>Retry market data</Button></section>; }
