import { useEffect, useMemo, useState } from 'react';
import { fetchMatchIntelligence, type MatchFixture } from '../api/matchIntelligence';
import { fetchCoreMarkets, type CoreMarketCall, type CoreMarketsPayload } from '../api/markets';

type LoadState = { calls: CoreMarketsPayload | null; fixtures: MatchFixture[]; loading: boolean; error: string | null };

export function MarketsPage({ gameweek = 0 }: { gameweek?: number }) {
  const [state, setState] = useState<LoadState>({ calls: null, fixtures: [], loading: true, error: null });

  useEffect(() => {
    if (gameweek < 1) return;
    const controller = new AbortController();
    setState({ calls: null, fixtures: [], loading: true, error: null });
    void Promise.all([
      fetchCoreMarkets(gameweek, controller.signal),
      fetchMatchIntelligence(gameweek, controller.signal),
    ]).then(([calls, matches]) => {
      setState({ calls, fixtures: matches.fixtures, loading: false, error: null });
    }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setState({ calls: null, fixtures: [], loading: false, error: reason instanceof Error ? reason.message : String(reason) });
    });
    return () => controller.abort();
  }, [gameweek]);

  const fixtureById = useMemo(() => new Map(state.fixtures.map((fixture) => [fixture.match_id, fixture])), [state.fixtures]);

  if (gameweek < 1 || state.loading) return <section className="v3-product-page" aria-busy="true"><div className="v3-surface v3-skeleton-panel" /></section>;
  if (state.error || !state.calls) return <section className="v3-product-page"><div className="v3-surface v3-page-state"><span className="v3-kicker">Core markets</span><h1>Market calls unavailable</h1><p>{state.error ?? 'The frozen strongest-call contract did not resolve.'}</p></div></section>;

  return <div className="v3-product-page v3-dense-page" data-page="markets">
    <header className="v3-compact-header">
      <div><span className="v3-kicker">Gameweek {state.calls.gameweek} · frozen predictions</span><h1>Four core market predictions</h1></div>
      <small>{formatTimestamp(state.calls.generated_at)}</small>
    </header>

    <section aria-labelledby="core-market-heading">
      <div className="v3-section-head"><div><span className="v3-kicker">Strongest model call per market</span><h2 id="core-market-heading">1X2 · O/U 2.5 · BTTS · Correct score</h2></div><small>Final audit appears when the fixture finishes</small></div>
      <div className="v3-card-grid v3-card-grid--markets">{state.calls.betting_recommendations.map((call) => <MarketCard key={`${call.type}-${call.match_id}`} call={call} fixture={fixtureById.get(call.match_id)} />)}</div>
      {state.calls.betting_recommendations.length !== 4 ? <p className="v3-inline-warning">Only {state.calls.betting_recommendations.length}/4 frozen market calls are currently available. Missing calls are not reconstructed.</p> : null}
    </section>
  </div>;
}

function MarketCard({ call, fixture }: { call: CoreMarketCall; fixture: MatchFixture | undefined }) {
  const audit = auditMarketCall(call, fixture);
  return <article className="v3-compact-card v3-market-card">
    <div className="v3-card-meta"><span>{call.type}</span></div>
    <small className="v3-card-fixture">{call.fixture}</small>
    <h3>{call.selection}</h3>
    <div className="v3-market-result">
      {audit ? <>
        <span className="v3-market-stamp" data-result={audit.aligned ? 'correct' : 'wrong'} role="img" aria-label={audit.aligned ? 'Correct prediction' : 'Incorrect prediction'}>{audit.aligned ? '✓' : '✕'}</span>
        <small>{audit.actual}</small>
      </> : <span className="v3-market-pending">Pending</span>}
    </div>
  </article>;
}

function auditMarketCall(call: CoreMarketCall, fixture: MatchFixture | undefined): { aligned: boolean; actual: string } | null {
  if (!fixture?.finished || fixture.home_score == null || fixture.away_score == null) return null;
  const home = fixture.home_score;
  const away = fixture.away_score;
  const total = home + away;
  const actualScore = `${home}-${away}`;
  const type = call.type.toLowerCase();
  const selection = call.selection.toLowerCase();

  if (type.includes('correct')) return { aligned: call.selection.trim() === actualScore, actual: actualScore };
  if (type.includes('o/u') || type.includes('over') || type.includes('under')) {
    const actual = total > 2.5 ? 'Over 2.5' : 'Under 2.5';
    return { aligned: selection.includes(total > 2.5 ? 'over' : 'under'), actual };
  }
  if (type.includes('btts')) {
    const yes = home > 0 && away > 0;
    const actual = yes ? 'BTTS Yes' : 'BTTS No';
    return { aligned: selection.includes(yes ? 'yes' : 'no'), actual };
  }
  if (type.includes('1x2')) {
    const actual = home > away ? `${fixture.home_team ?? 'Home'} win` : away > home ? `${fixture.away_team ?? 'Away'} win` : 'Draw';
    const aligned = home > away ? selection.includes('home') || selection.includes((fixture.home_team ?? '').toLowerCase()) : away > home ? selection.includes('away') || selection.includes((fixture.away_team ?? '').toLowerCase()) : selection.includes('draw');
    return { aligned, actual };
  }
  return null;
}

function formatTimestamp(value: string): string { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
