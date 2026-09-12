import { useEffect, useMemo, useState } from 'react';
import { fetchHistoricalFpl, type HistoricalFixture, type HistoricalFplPayload, type HistoricalPlayer } from '../api/historicalFpl';

type LoadState = {
  data: HistoricalFplPayload | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

type HistoricalCall = {
  code: 'H' | 'D' | 'A';
  label: string;
  probability: number;
};

function useHistorical(gameweek: number): LoadState {
  const [data, setData] = useState<HistoricalFplPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchHistoricalFpl(gameweek, controller.signal)
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      });
    return () => controller.abort();
  }, [gameweek, nonce]);

  return { data, loading, error, reload: () => setNonce((value) => value + 1) };
}

export function HistoryPage() {
  const metadata = useHistorical(0);
  const available = useMemo(
    () => (metadata.data?.available_gameweeks ?? [])
      .filter((item) => item.historical_projection_valid && item.gameweek < (metadata.data?.gameweek ?? 99))
      .sort((a, b) => a.gameweek - b.gameweek),
    [metadata.data],
  );
  const [selectedGameweek, setSelectedGameweek] = useState<number>(0);

  useEffect(() => {
    if (selectedGameweek === 0 && available.length > 0) {
      setSelectedGameweek(available[available.length - 1]!.gameweek);
    }
  }, [available, selectedGameweek]);

  const history = useHistorical(selectedGameweek);

  if (metadata.loading || selectedGameweek === 0) return <HistorySkeleton />;
  if (metadata.error || !metadata.data) return <HistoryError title="History index unavailable" message={metadata.error} retry={metadata.reload} />;
  if (history.loading) return <HistorySkeleton />;
  if (history.error || !history.data) return <HistoryError title={`GW${selectedGameweek} history unavailable`} message={history.error} retry={history.reload} />;

  const data = history.data;
  const xi = data.decision?.starting_xi ?? [];
  const bench = data.decision?.bench ?? [];
  const captain = [...xi, ...bench].find((player) => player.id === data.decision?.captain_player_id) ?? null;
  const xiProjectionValues = xi.map((player) => nullableNumber(player.xPts));
  const xiProjectionCaptured = xiProjectionValues.filter((value): value is number => value != null);
  const xiProjectionComplete = xi.length > 0 && xiProjectionCaptured.length === xi.length;
  const xiProjected = xiProjectionComplete ? xiProjectionCaptured.reduce((sum, value) => sum + value, 0) : null;
  const calls = evaluateFixtureCalls(data.fixture_results ?? []);
  const fixtureFinished = (data.fixture_results ?? []).filter((fixture) => fixture.finished).length;
  const recommendation = asRecord(data.decision?.recommendations);
  const formation = typeof recommendation?.formation === 'string' ? recommendation.formation : null;

  return (
    <div className="v3-product-page" data-page="history">
      <section className="v3-product-hero">
        <div>
          <span className="v3-kicker">Frozen decision journal</span>
          <h1 className="v3-display">Judge the decision from the evidence that existed then.</h1>
          <p>Historical snapshots come from the chronology-safe FPL contract. Current price, ownership and model state are not backfilled into older Gameweeks.</p>
        </div>
        <span className="v3-status" data-tone="intelligence">GW{data.gameweek} · {data.snapshot_stage ?? 'Historical'}</span>
      </section>

      <div className="v3-history-gw" aria-label="Select historical Gameweek">
        {available.map((item) => (
          <button key={item.gameweek} type="button" className={item.gameweek === selectedGameweek ? 'is-active' : ''} onClick={() => setSelectedGameweek(item.gameweek)}>
            GW{item.gameweek}
          </button>
        ))}
      </div>

      <section className="v3-history-summary">
        <article className="v3-surface"><span>Frozen run</span><strong>#{data.prediction_run_id ?? '—'}</strong><small>{data.generated_at ? formatTimestamp(data.generated_at) : 'Capture time unavailable'}</small></article>
        <article className="v3-surface"><span>XI projected</span><strong>{xiProjected == null ? '—' : xiProjected.toFixed(1)}</strong><small>{xiProjectionComplete ? `${formation ? `${formation} · ` : ''}frozen xPts` : `${xiProjectionCaptured.length}/${xi.length} player xPts captured`}</small></article>
        <article className="v3-surface"><span>Captain</span><strong>{captain?.name ?? '—'}</strong><small>{captain?.p10 == null ? 'Tail unavailable' : `${Math.round(captain.p10 * 100)}% P10+`}</small></article>
        <article className="v3-surface"><span>1X2 calls</span><strong>{calls.assessed ? `${calls.correct}/${calls.assessed}` : '—'}</strong><small>{fixtureFinished}/{data.fixture_results?.length ?? 0} fixtures finished</small></article>
      </section>

      <section className="v3-surface v3-history-table" aria-labelledby="history-xi-heading">
        <div className="v3-history-table-head">
          <div><span className="v3-kicker">Frozen XI</span><h2 id="history-xi-heading">What the engine knew before the deadline</h2></div>
          <small>{data.metadata_availability?.current_metadata_not_backfilled_into_history ? 'Current metadata not backfilled' : 'Historical metadata policy unavailable'}</small>
        </div>
        <div className="v3-history-rows">
          {xi.map((player) => <HistoricalPlayerRow key={player.id} player={player} captain={player.id === data.decision?.captain_player_id} />)}
        </div>
      </section>

      <section className="v3-product-section" aria-labelledby="history-matches-heading">
        <div className="v3-section-heading"><div><span className="v3-kicker">Fixture audit</span><h2 id="history-matches-heading">Frozen 1X2 call vs result</h2></div></div>
        <div className="v3-match-grid">
          {(data.fixture_results ?? []).map((fixture) => <HistoricalMatchCard key={fixture.match_id} fixture={fixture} />)}
        </div>
      </section>

      {!data.historical_projection_valid ? (
        <aside className="v3-surface v3-history-warning" role="note">
          <strong>This snapshot is excluded from historical evaluation.</strong>
          <span>It remains visible for audit only and must not be treated as valid forward evidence.</span>
        </aside>
      ) : null}
    </div>
  );
}

function HistoricalPlayerRow({ player, captain }: { player: HistoricalPlayer; captain: boolean }) {
  const xPts = nullableNumber(player.xPts);
  return (
    <div className="v3-history-row">
      <strong>{player.name}{captain ? ' (C)' : ''}</strong>
      <span>{player.team ?? player.position ?? '—'}</span>
      <span>{xPts == null ? '—' : `${xPts.toFixed(1)} xPts`}</span>
    </div>
  );
}

function HistoricalMatchCard({ fixture }: { fixture: HistoricalFixture }) {
  const call = fixtureCall(fixture);
  const actual = actualOutcome(fixture);
  const hit = call && actual ? call.code === actual : null;
  return (
    <article className="v3-surface v3-match-card" data-phase={fixture.finished ? 'FINISHED' : 'FUTURE'}>
      <div className="v3-match-card-top">
        <span className="v3-phase-pill" data-phase={fixture.finished ? 'FINISHED' : 'FUTURE'}>{fixture.finished ? 'Finished' : 'Frozen'}</span>
        <time>{formatKickoff(fixture.kickoff_time)}</time>
      </div>
      <div className="v3-scoreline">
        <span>{fixture.home_team ?? 'Home'}</span>
        <strong>{fixture.finished ? `${fixture.home_score ?? '–'} : ${fixture.away_score ?? '–'}` : 'vs'}</strong>
        <span>{fixture.away_team ?? 'Away'}</span>
      </div>
      <div className="v3-match-context"><span>Frozen 1X2 call</span><strong>{call ? `${call.label} · ${Math.round(call.probability * 100)}%` : 'Unavailable'}</strong></div>
      <p>{hit == null ? 'No comparable final outcome.' : hit ? 'Top 1X2 call matched the final outcome.' : 'Top 1X2 call did not match the final outcome.'}</p>
    </article>
  );
}

function evaluateFixtureCalls(fixtures: HistoricalFixture[]) {
  let assessed = 0;
  let correct = 0;
  for (const fixture of fixtures) {
    const call = fixtureCall(fixture);
    const actual = actualOutcome(fixture);
    if (!call || !actual) continue;
    assessed += 1;
    if (call.code === actual) correct += 1;
  }
  return { assessed, correct };
}

function fixtureCall(fixture: HistoricalFixture): HistoricalCall | null {
  const markets = fixture.prediction?.markets;
  if (!markets) return null;
  const candidates: Array<{ code: HistoricalCall['code']; label: string; probability: number | null }> = [
    { code: 'H', label: fixture.home_team ?? 'Home', probability: nullableProbability(markets.home_win) },
    { code: 'D', label: 'Draw', probability: nullableProbability(markets.draw) },
    { code: 'A', label: fixture.away_team ?? 'Away', probability: nullableProbability(markets.away_win) },
  ];
  const rows = candidates.filter((row): row is HistoricalCall => row.probability != null);
  rows.sort((a, b) => b.probability - a.probability);
  return rows[0] ?? null;
}

function actualOutcome(fixture: HistoricalFixture): 'H' | 'D' | 'A' | null {
  if (!fixture.finished || fixture.home_score == null || fixture.away_score == null) return null;
  if (fixture.home_score > fixture.away_score) return 'H';
  if (fixture.away_score > fixture.home_score) return 'A';
  return 'D';
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableProbability(value: unknown): number | null {
  const parsed = nullableNumber(value);
  return parsed != null && parsed >= 0 && parsed <= 1 ? parsed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function formatKickoff(value: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function HistorySkeleton() {
  return <div className="v3-page-skeleton" aria-busy="true" aria-label="Loading decision history"><div /><div /><div className="is-large" /></div>;
}

function HistoryError({ title, message, retry }: { title: string; message: string | null; retry: () => void }) {
  return <section className="v3-surface v3-page-state" aria-live="polite"><span className="v3-kicker">Fail closed</span><h1>{title}</h1><p>{message ?? 'The chronology-safe historical contract could not be resolved.'}</p><button type="button" className="v3-button v3-button--primary" onClick={retry}>Retry</button></section>;
}
