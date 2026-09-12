import { useEffect, useMemo, useState } from 'react';
import { fetchHistoricalFpl, type HistoricalFixture, type HistoricalFplPayload, type HistoricalPlayer } from '../api/historicalFpl';
import { V3Dialog } from './V3Dialog';

type LoadState = { data: HistoricalFplPayload | null; loading: boolean; error: string | null; reload: () => void };
type HistoricalCall = { code: 'H' | 'D' | 'A'; label: string; probability: number; state: 'edge' | 'no-edge' };

function useHistorical(gameweek: number): LoadState {
  const [data, setData] = useState<HistoricalFplPayload | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [nonce, setNonce] = useState(0);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(null); void fetchHistoricalFpl(gameweek, controller.signal).then((payload) => { setData(payload); setLoading(false); }).catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === 'AbortError') return; setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false); }); return () => controller.abort(); }, [gameweek, nonce]);
  return { data, loading, error, reload: () => setNonce((value) => value + 1) };
}

export function HistoryPage() {
  const metadata = useHistorical(0);
  const available = useMemo(() => (metadata.data?.available_gameweeks ?? []).filter((item) => item.historical_projection_valid && item.gameweek < (metadata.data?.gameweek ?? 99)).sort((a, b) => a.gameweek - b.gameweek), [metadata.data]);
  const [selectedGameweek, setSelectedGameweek] = useState(0); const [selectedPlayer, setSelectedPlayer] = useState<HistoricalPlayer | null>(null);
  useEffect(() => { if (selectedGameweek === 0 && available.length) setSelectedGameweek(available[available.length - 1]!.gameweek); }, [available, selectedGameweek]);
  const history = useHistorical(selectedGameweek);
  if (metadata.loading || selectedGameweek === 0) return <HistorySkeleton />;
  if (metadata.error || !metadata.data) return <HistoryError title="History index unavailable" message={metadata.error} retry={metadata.reload} />;
  if (history.loading) return <HistorySkeleton />;
  if (history.error || !history.data) return <HistoryError title={`GW${selectedGameweek} history unavailable`} message={history.error} retry={history.reload} />;

  const data = history.data; const xi = data.decision?.starting_xi ?? []; const bench = data.decision?.bench ?? []; const squad = [...xi, ...bench];
  const calls = evaluateFixtureCalls(data.fixture_results ?? []); const captain = squad.find((player) => player.id === data.decision?.captain_player_id) ?? null;
  const capturedXpts = xi.map((player) => nullableNumber(player.xPts)); const completeXpts = xi.length > 0 && capturedXpts.every((value) => value != null); const totalXpts = completeXpts ? capturedXpts.reduce((sum, value) => sum + (value ?? 0), 0) : null;

  return <div className="v3-product-page v3-dense-page" data-page="history">
    <header className="v3-compact-header"><div><span className="v3-kicker">Frozen decision journal</span><h1>History</h1></div><small>GW{data.gameweek} · {data.snapshot_stage ?? 'Historical'}</small></header>
    <div className="v3-history-gw" aria-label="Select historical Gameweek">{available.map((item) => <button key={item.gameweek} type="button" className={item.gameweek === selectedGameweek ? 'is-active' : ''} onClick={() => setSelectedGameweek(item.gameweek)}>GW{item.gameweek}</button>)}</div>

    <section className="v3-compact-stats" aria-label="Historical summary">
      <div><span>Frozen run</span><strong>#{data.prediction_run_id ?? '—'}</strong></div>
      <div><span>XI xPts</span><strong>{totalXpts == null ? '—' : totalXpts.toFixed(1)}</strong></div>
      <div><span>Captain</span><strong>{captain?.name ?? '—'}</strong></div>
      <div><span>1X2 audit</span><strong>{calls.assessed ? `${calls.aligned}/${calls.assessed}` : '—'}</strong></div>
    </section>

    <section className="v3-surface v3-dense-card" aria-labelledby="history-squad-heading">
      <div className="v3-dense-card-head"><div><span className="v3-kicker">Frozen squad</span><h2 id="history-squad-heading">Decision-time player evidence</h2></div><small>{data.metadata_availability?.current_metadata_not_backfilled_into_history ? 'No current metadata backfill' : 'Metadata policy unavailable'}</small></div>
      <div className="v3-table-scroll"><table className="v3-data-table"><thead><tr><th>Slot</th><th>Player</th><th>Team / Pos</th><th>xPts</th><th>P10+</th><th>P15+</th><th>P20+</th></tr></thead><tbody>{xi.map((player, index) => <HistoricalPlayerRow key={`xi-${player.id}-${index}`} player={player} slot={player.id === data.decision?.captain_player_id ? 'XI · C' : player.id === data.decision?.vice_player_id ? 'XI · VC' : 'XI'} onOpen={setSelectedPlayer} />)}{bench.map((player, index) => <HistoricalPlayerRow key={`bench-${player.id}-${index}`} player={player} slot={`B${index + 1}`} onOpen={setSelectedPlayer} />)}</tbody></table></div>
    </section>

    <section className="v3-surface v3-dense-card" aria-labelledby="history-fixtures-heading">
      <div className="v3-dense-card-head"><div><span className="v3-kicker">Fixture audit</span><h2 id="history-fixtures-heading">Frozen calls vs final results</h2></div><small>No-edge is displayed as DRAW</small></div>
      <div className="v3-table-scroll"><table className="v3-data-table v3-match-table"><thead><tr><th>Fixture</th><th>Final</th><th>1X2 call</th><th>Prob.</th><th>Correct score</th><th>Audit</th></tr></thead><tbody>{(data.fixture_results ?? []).map((fixture) => <HistoricalMatchRow key={fixture.match_id} fixture={fixture} />)}</tbody></table></div>
    </section>

    {!data.historical_projection_valid ? <aside className="v3-compact-note" role="note"><strong>Audit only.</strong><span>This snapshot is excluded from historical forward evaluation.</span></aside> : null}
    {selectedPlayer ? <HistoricalPlayerModal player={selectedPlayer} open onClose={() => setSelectedPlayer(null)} gameweek={data.gameweek} runId={data.prediction_run_id ?? null} /> : null}
  </div>;
}

function HistoricalPlayerRow({ player, slot, onOpen }: { player: HistoricalPlayer; slot: string; onOpen: (player: HistoricalPlayer) => void }) { return <tr><td>{slot}</td><td><button type="button" className="v3-player-link" onClick={() => onOpen(player)}>{player.name}</button></td><td>{player.team ?? '—'} · {player.position ?? '—'}</td><td>{formatNumber(nullableNumber(player.xPts), 1)}</td><td>{formatPercent(nullableProbability(player.p10))}</td><td>{formatPercent(nullableProbability(player.p15))}</td><td>{formatPercent(nullableProbability(player.p20))}</td></tr>; }

function HistoricalMatchRow({ fixture }: { fixture: HistoricalFixture }) {
  const call = fixtureCall(fixture); const actual = actualOutcome(fixture); const directionAligned = call && actual ? call.code === actual : null; const score = scoreCall(fixture); const actualScore = fixture.finished && fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null; const scoreAligned = score && actualScore ? score === actualScore : null;
  return <tr><td><strong>{fixture.home_team ?? 'Home'}</strong> <span className="v3-muted">vs</span> <strong>{fixture.away_team ?? 'Away'}</strong><small className="v3-cell-sub">{formatKickoff(fixture.kickoff_time)}</small></td><td>{actualScore ?? '—'}</td><td><strong>{call?.label ?? '—'}</strong>{call?.state === 'no-edge' ? <small className="v3-cell-sub">Parity/no-edge → DRAW</small> : null}</td><td>{call ? formatPercent(call.probability) : '—'}</td><td>{score ?? '—'}</td><td>{fixture.finished ? <span className="v3-audit-text" data-result={directionAligned ? 'aligned' : 'different'}>1X2 {directionAligned ? 'aligned' : 'different'}{score ? ` · score ${scoreAligned ? 'aligned' : 'different'}` : ''}</span> : <span className="v3-muted">Pending</span>}</td></tr>;
}

function HistoricalPlayerModal({ player, open, onClose, gameweek, runId }: { player: HistoricalPlayer; open: boolean; onClose: () => void; gameweek: number; runId: number | null }) { return <V3Dialog open={open} onClose={onClose} title={player.name} eyebrow={`GW${gameweek} · ${player.team ?? '—'} · ${player.position ?? '—'}`}><section className="v3-modal-section"><div className="v3-modal-section-head"><span className="v3-kicker">Frozen historical projection</span><small>{runId ? `Run #${runId}` : 'Run unavailable'}</small></div><div className="v3-modal-metric-grid"><Metric label="xPts" value={formatNumber(nullableNumber(player.xPts), 1)} /><Metric label="P10+" value={formatPercent(nullableProbability(player.p10))} /><Metric label="P15+" value={formatPercent(nullableProbability(player.p15))} /><Metric label="P20+" value={formatPercent(nullableProbability(player.p20))} /></div><p className="v3-modal-note">Only evidence captured in the historical contract is shown. Current player metadata is not backfilled.</p></section></V3Dialog>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function evaluateFixtureCalls(fixtures: HistoricalFixture[]) { let assessed = 0; let aligned = 0; for (const fixture of fixtures) { const call = fixtureCall(fixture); const actual = actualOutcome(fixture); if (!call || !actual) continue; assessed += 1; if (call.code === actual) aligned += 1; } return { assessed, aligned }; }
function fixtureCall(fixture: HistoricalFixture): HistoricalCall | null { const markets = fixture.prediction?.markets; const h = nullableProbability(markets?.home_win); const d = nullableProbability(markets?.draw); const a = nullableProbability(markets?.away_win); if (h == null || d == null || a == null) return null; const rows = [{ code: 'H' as const, probability: h }, { code: 'D' as const, probability: d }, { code: 'A' as const, probability: a }].sort((x, y) => y.probability - x.probability); const top = rows[0]!; const second = rows[1]!; const margin = top.probability - second.probability; const noEdge = !((top.probability >= 0.5 && margin >= 0.08) || (top.probability >= 0.4 && margin >= 0.04)); if (noEdge) return { code: 'D', label: 'DRAW', probability: d, state: 'no-edge' }; return { code: top.code, label: top.code === 'H' ? `${fixture.home_team ?? 'Home'} win` : top.code === 'A' ? `${fixture.away_team ?? 'Away'} win` : 'DRAW', probability: top.probability, state: 'edge' }; }
function scoreCall(fixture: HistoricalFixture): string | null { return fixture.prediction?.headline_score ?? fixture.prediction?.raw_modal_score ?? fixture.prediction?.top_scorelines?.find((row) => typeof row.score === 'string')?.score ?? null; }
function actualOutcome(fixture: HistoricalFixture): 'H' | 'D' | 'A' | null { if (!fixture.finished || fixture.home_score == null || fixture.away_score == null) return null; return fixture.home_score > fixture.away_score ? 'H' : fixture.away_score > fixture.home_score ? 'A' : 'D'; }
function nullableNumber(value: unknown): number | null { if (value == null || value === '') return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function nullableProbability(value: unknown): number | null { const parsed = nullableNumber(value); return parsed != null && parsed >= 0 && parsed <= 1 ? parsed : null; }
function formatNumber(value: number | null, digits: number): string { return value == null ? '—' : value.toFixed(digits); }
function formatPercent(value: number | null): string { return value == null ? '—' : `${Math.round(value * 100)}%`; }
function formatKickoff(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value)); }
function HistorySkeleton() { return <div className="v3-page-skeleton" aria-busy="true" aria-label="Loading decision history"><div/><div/><div className="is-large"/></div>; }
function HistoryError({ title, message, retry }: { title: string; message: string | null; retry: () => void }) { return <section className="v3-surface v3-page-state"><span className="v3-kicker">Fail closed</span><h1>{title}</h1><p>{message ?? 'The chronology-safe historical contract could not be resolved.'}</p><button type="button" className="v3-button v3-button--primary" onClick={retry}>Retry</button></section>; }
