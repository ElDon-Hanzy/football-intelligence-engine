import { Button } from '../components/primitives/Button';
import { outcomeComparisons, pct, strongestModelOutcome, useMarketsData, useStrongestBettingCalls, type StrongestBettingCall } from '../lib/analysis';
import type { BettingFixture } from '../lib/analysis-contracts';

export function MarketsPage({ requestedGameweek }: { requestedGameweek: number }) {
  const callsQuery = useStrongestBettingCalls(requestedGameweek);
  const marketQuery = useMarketsData(requestedGameweek);

  if (callsQuery.isPending) return <Loading />;
  if (callsQuery.isError || !callsQuery.data) return <ErrorState onRetry={() => void callsQuery.refetch()} />;

  const callsData = callsQuery.data;
  const calls = callsData.betting_recommendations;
  const market = marketQuery.data;
  const researchObservations = market?.fixtures.reduce((sum, fixture) => sum + (fixture.edge_research?.observation_count ?? 0), 0) ?? 0;

  return <div className="analysis-page markets-page betting-page">
    <header className="betting-hero">
      <span className="page-eyebrow">GW{callsData.gameweek} betting</span>
      <h1>Betting</h1>
      <p>Four strongest model views across the core markets.</p>
    </header>

    <div className="betting-note" role="note">Probability is not betting value. These are our four strongest football-model calls; bookmaker comparison stays secondary.</div>

    <section className="markets-top4 betting-primary" aria-label="Four strongest model calls">
      {calls.length ? <div className="legacy-bet-grid">{calls.map((call, index) => <ModelCallCard call={call} rank={index + 1} key={`${call.type}-${call.match_id}-${call.selection}`} />)}</div>
        : <div className="market-waiting-state" role="status"><span>Model calls</span><strong>GW{callsData.gameweek} calls unavailable</strong><p>The existing strongest-call source returned no recommendations. Bookmaker research is not substituted as a fallback.</p></div>}
    </section>

    <details className="market-diagnostics-disclosure legacy-market-diagnostics">
      <summary>Market comparison &amp; research</summary>
      <div className="market-diagnostics-body">
        {marketQuery.isPending ? <div className="empty-state">Bookmaker diagnostics are loading. The four model calls above are independent of this feed.</div> : null}
        {marketQuery.isError || !market ? <div className="empty-state">Bookmaker diagnostics are unavailable. The four model calls above remain valid because they come from the frozen model-call source.</div> : null}
        {market ? <>
          {market.warnings.length ? <aside className="analysis-notice" role="note"><strong>Feed notes</strong><span>{market.warnings.join(' · ')}</span></aside> : null}
          <div className="analysis-section-heading"><div><span className="page-eyebrow">Secondary diagnostics</span><h2>Model vs market</h2></div><p>{researchObservations} research observations. Raw gaps and prices are context only and never choose the four primary calls.</p></div>
          <div className="market-fixture-grid">{market.fixtures.map((fixture) => <MarketFixtureCard key={fixture.match_id} fixture={fixture} />)}</div>
        </> : null}
      </div>
    </details>
  </div>;
}

function ModelCallCard({ call, rank }: { call: StrongestBettingCall; rank: number }) {
  const note = call.type === 'Correct score' ? 'Exact scores are naturally low-probability outcomes.' : 'Model probability, not bookmaker value.';
  return <article className="legacy-bet-card">
    <div className="legacy-bet-top"><span>{rank}. {call.type}</span><strong>{pct(call.probability, 1)}</strong></div>
    <h2>{call.selection}</h2>
    <p className="legacy-bet-fixture">{call.fixture}</p>
    <div className="legacy-bet-xg"><span>Model xG</span><strong>{call.home_lambda == null ? '—' : call.home_lambda.toFixed(2)} – {call.away_lambda == null ? '—' : call.away_lambda.toFixed(2)}</strong></div>
    <small>{note}</small>
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

function topScoreWatch(fixture: BettingFixture): { score: string; odds: number | null } | null {
  const raw = fixture.prediction?.top_scorelines?.[0];
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const score = typeof row.score === 'string' ? row.score : null;
  if (!score) return null;
  const price = fixture.correct_score_odds.filter((item) => item.selection_name === score).sort((a, b) => b.decimal_odds - a.decimal_odds)[0];
  return { score, odds: price?.decimal_odds ?? null };
}

function signedPct(value: number | null): string { if (value == null) return '—'; return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`; }
function Loading() { return <div className="command-skeleton" aria-busy="true" aria-label="Loading Betting"><div className="skeleton-line is-short"/><div className="skeleton-line is-title"/><div className="skeleton-panel"/></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <section className="state-panel"><span className="page-eyebrow">Betting</span><h1>Model calls are unavailable.</h1><p>The existing strongest-call contract could not be read. Bookmaker EV is not substituted as a fallback.</p><Button onClick={onRetry}>Retry model calls</Button></section>; }
