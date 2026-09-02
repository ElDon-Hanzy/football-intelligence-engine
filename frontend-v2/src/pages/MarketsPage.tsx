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
  const priced = market?.fixtures.filter((fixture) => fixture.bookmaker_odds.length > 0).length ?? 0;
  const researchObservations = market?.fixtures.reduce((sum, fixture) => sum + (fixture.edge_research?.observation_count ?? 0), 0) ?? 0;
  const marketFeed = marketQuery.isPending ? 'Loading' : marketQuery.isError || !market ? 'Unavailable' : market.odds_status !== 'connected' || priced === 0 ? 'Waiting' : 'Connected';

  return <div className="analysis-page markets-page">
    <header className="page-intro analysis-intro">
      <div><span className="page-eyebrow">Gameweek {callsData.gameweek} · betting model</span><h1>Markets</h1><p>Strongest football-model calls first. Bookmaker prices are context, not the ranking engine.</p></div>
      <span className="sync-badge" role="status"><span aria-hidden="true" />Frozen model</span>
    </header>

    <section className="markets-top4" aria-labelledby="top-bets-heading">
      <div className="analysis-section-heading markets-top4-heading">
        <div><span className="page-eyebrow">Legacy decision source</span><h2 id="top-bets-heading">Four strongest model calls</h2></div>
        <p>One highest-conviction model view in each core market: Correct score, 1X2, O/U 2.5 and BTTS. These cards come directly from the existing human-insights betting recommendations; v2 does not re-rank them using odds or EV.</p>
      </div>

      {calls.length ? <div className="top-bet-grid">{calls.map((call, index) => <ModelCallCard call={call} rank={index + 1} key={`${call.type}-${call.match_id}-${call.selection}`} />)}</div>
        : <div className="market-waiting-state" role="status"><span>Model calls</span><strong>GW{callsData.gameweek} calls unavailable</strong><p>The existing model-call source returned no recommendations. Bookmaker research is not substituted as a fallback.</p></div>}
    </section>

    <dl className="market-status-strip" aria-label="Market status">
      <Metric label="Model calls" value={`${calls.length}/4`} />
      <Metric label="Prediction run" value={String(callsData.prediction_run_id)} />
      <Metric label="Bookmaker feed" value={marketFeed} />
      <Metric label="Priced fixtures" value={market ? `${priced}/${market.fixtures.length}` : '—'} />
    </dl>

    <p className="market-validation-note"><strong>Selection rule:</strong> model probability chooses these four calls. Bookmaker odds, research EV and CLV do not determine the shortlist; they remain secondary diagnostics.</p>

    <details className="market-diagnostics-disclosure">
      <summary>Bookmaker and fixture diagnostics</summary>
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
  const note = call.type === 'Correct score' ? 'Exact scores are naturally lower-probability outcomes.' : 'Model probability, not bookmaker value.';
  return <article className="top-bet-card">
    <header><span className="research-rank">#{rank}</span><div><small>{call.type}</small><h3>{call.selection}</h3></div><span className="market-action-chip">MODEL</span></header>
    <div className="top-bet-book"><span>Fixture</span><strong>{call.fixture}</strong></div>
    <dl className="top-bet-metrics">
      <Metric label="Model probability" value={pct(call.probability, 1)} />
      <Metric label="Home xG" value={call.home_lambda == null ? '—' : call.home_lambda.toFixed(2)} />
      <Metric label="Away xG" value={call.away_lambda == null ? '—' : call.away_lambda.toFixed(2)} />
    </dl>
    <small className="top-bet-quality">{note}</small>
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
function Metric({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Loading() { return <div className="command-skeleton" aria-busy="true" aria-label="Loading Markets"><div className="skeleton-line is-short"/><div className="skeleton-line is-title"/><div className="skeleton-panel"/></div>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <section className="state-panel"><span className="page-eyebrow">Markets</span><h1>Model calls are unavailable.</h1><p>The existing strongest-call contract could not be read. Bookmaker EV is not substituted as a fallback.</p><Button onClick={onRetry}>Retry model calls</Button></section>; }
