import { useEffect, useMemo, useState } from 'react';
import { fetchMatchIntelligence, type MatchFixture } from '../api/matchIntelligence';
import { fetchCoreMarkets, type CoreMarketCall, type CoreMarketsPayload } from '../api/markets';
import { fetchFplWorkspace } from '../api/fplWorkspace';

type LoadState = { calls: CoreMarketsPayload | null; fixtures: MatchFixture[]; loading: boolean; error: string | null };

export function MarketsPage() {
  const [state, setState] = useState<LoadState>({ calls: null, fixtures: [], loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    void fetchFplWorkspace(0, controller.signal)
      .then(async (workspace) => {
        const [calls, matches] = await Promise.all([
          fetchCoreMarkets(workspace.gameweek, controller.signal),
          fetchMatchIntelligence(workspace.gameweek, controller.signal),
        ]);
        setState({ calls, fixtures: matches.fixtures, loading: false, error: null });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setState({ calls: null, fixtures: [], loading: false, error: reason instanceof Error ? reason.message : String(reason) });
      });
    return () => controller.abort();
  }, []);

  const fixtureById = useMemo(() => new Map(state.fixtures.map((fixture) => [fixture.match_id, fixture])), [state.fixtures]);

  if (state.loading) return <section className="v3-product-page" aria-busy="true"><div className="v3-surface v3-skeleton-panel" /></section>;
  if (state.error || !state.calls) return <section className="v3-product-page"><div className="v3-surface v3-page-state"><span className="v3-kicker">Core markets</span><h1>Market calls unavailable</h1><p>{state.error ?? 'The frozen strongest-call contract did not resolve.'}</p></div></section>;

  return (
    <div className="v3-product-page v3-dense-page" data-page="markets">
      <header className="v3-compact-header">
        <div><span className="v3-kicker">GW{state.calls.gameweek} · frozen run #{state.calls.prediction_run_id}</span><h1>Four core market predictions</h1></div>
        <small>{formatTimestamp(state.calls.generated_at)}</small>
      </header>

      <section className="v3-surface v3-dense-card" aria-labelledby="core-market-heading">
        <div className="v3-dense-card-head"><div><span className="v3-kicker">Strongest model call per market</span><h2 id="core-market-heading">1X2 · O/U 2.5 · BTTS · Correct score</h2></div><small>Model probability, not bookmaker value</small></div>
        <div className="v3-table-scroll" tabIndex={0} role="region" aria-label="Four core market predictions table">
          <table className="v3-data-table v3-markets-table">
            <thead><tr><th>Market</th><th>Fixture</th><th>Prediction</th><th>Prob.</th><th>xG</th><th>Final audit</th></tr></thead>
            <tbody>
              {state.calls.betting_recommendations.map((call) => <MarketRow key={`${call.type}-${call.match_id}`} call={call} fixture={fixtureById.get(call.match_id)} />)}
            </tbody>
          </table>
        </div>
        {state.calls.betting_recommendations.length !== 4 ? <p className="v3-inline-warning">Only {state.calls.betting_recommendations.length}/4 frozen market calls are currently available. Missing calls are not reconstructed.</p> : null}
      </section>
    </div>
  );
}

function MarketRow({ call, fixture }: { call: CoreMarketCall; fixture: MatchFixture | undefined }) {
  const audit = auditMarketCall(call, fixture);
  return <tr>
    <td><strong>{call.type}</strong></td>
    <td>{call.fixture}</td>
    <td><strong>{call.selection}</strong></td>
    <td>{percent(call.probability)}</td>
    <td>{call.home_lambda == null || call.away_lambda == null ? '—' : `${call.home_lambda.toFixed(2)}–${call.away_lambda.toFixed(2)}`}</td>
    <td>{audit ? <span className="v3-audit-text" data-result={audit.aligned ? 'aligned' : 'different'}>{audit.aligned ? 'Aligned' : 'Different'} · {audit.actual}</span> : <span className="v3-muted">Pending</span>}</td>
  </tr>;
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

function percent(value: number): string { return `${(value * 100).toFixed(1)}%`; }
function formatTimestamp(value: string): string { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
