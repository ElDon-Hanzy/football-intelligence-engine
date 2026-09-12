import { useEffect, useMemo, useState } from 'react';
import { fetchActualLive, type ActualLiveApi } from '../api/actualLive';
import { fetchFplWorkspace, type FplWorkspaceApi, type PlayerEvidence, type WorkspaceFixture } from '../api/fplWorkspace';
import { PlayerIntelligenceModal } from './PlayerIntelligenceModal';

export type ProductView = 'home' | 'fpl' | 'matches' | 'markets' | 'insights' | 'history';
type Navigate = (view: ProductView) => void;

type WorkspaceLoad = { data: FplWorkspaceApi | null; loading: boolean; error: string | null; reload: () => void };

function useWorkspace(gameweek = 0): WorkspaceLoad {
  const [data, setData] = useState<FplWorkspaceApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    void fetchFplWorkspace(gameweek, controller.signal).then((payload) => { setData(payload); setLoading(false); }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false);
    });
    return () => controller.abort();
  }, [gameweek, nonce]);
  return { data, loading, error, reload: () => setNonce((value) => value + 1) };
}

function useLive(gameweek: number | null) {
  const [data, setData] = useState<ActualLiveApi | null>(null);
  useEffect(() => {
    if (!gameweek) return;
    const controller = new AbortController();
    void fetchActualLive(gameweek, controller.signal).then(setData).catch(() => setData(null));
    return () => controller.abort();
  }, [gameweek]);
  return data;
}

export function HomePage({ onNavigate }: { onNavigate: Navigate }) {
  const state = useWorkspace();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const live = useLive(state.data?.gameweek ?? null);
  if (state.loading) return <PageSkeleton label="Loading command center" />;
  if (state.error || !state.data) return <ErrorState title="Command center unavailable" message={state.error} retry={state.reload} />;
  const workspace = state.data;
  const fixtures = [...workspace.realized.fixtures].sort(sortFixture);
  const finished = fixtures.filter((fixture) => fixture.phase === 'FINISHED').length;
  const recommendation = workspace.recommendation;
  const captain = playerName(workspace, recommendation?.captain_player_id ?? null);
  const topUpside = rankedEvidence(workspace).slice(0, 5);

  return <div className="v3-product-page v3-dense-page" data-page="home">
    <header className="v3-compact-header">
      <div><span className="v3-kicker">Gameweek {workspace.gameweek} · {lifecycleLabel(workspace.lifecycle)}</span><h1>Command center</h1></div>
      <span className="v3-status" data-tone={workspace.actual.verification_status === 'VERIFIED' ? 'positive' : 'neutral'}>{workspace.actual.verification_status === 'VERIFIED' ? 'Actual frozen' : 'Actual not verified'}</span>
    </header>

    <section className="v3-compact-stats" aria-label="Current Gameweek summary">
      <button type="button" onClick={() => onNavigate('fpl')}><span>Engine</span><strong>{recommendation ? actionLabel(recommendation.transfers.length) : '—'}</strong></button>
      <button type="button" onClick={() => onNavigate('fpl')}><span>Captain</span><strong>{captain ?? '—'}</strong></button>
      <button type="button" onClick={() => onNavigate('matches')}><span>Fixtures</span><strong>{finished}/{fixtures.length} final</strong></button>
      <button type="button" onClick={() => onNavigate('markets')}><span>Markets</span><strong>4 core calls</strong></button>
    </section>

    <section className="v3-surface v3-dense-card" aria-labelledby="home-fixtures-heading">
      <div className="v3-dense-card-head"><div><span className="v3-kicker">Gameweek fixtures</span><h2 id="home-fixtures-heading">All matches</h2></div><button type="button" className="v3-text-action" onClick={() => onNavigate('matches')}>Match intelligence →</button></div>
      <div className="v3-fixture-list">{fixtures.map((fixture) => <HomeFixtureRow key={fixture.match_id} fixture={fixture} />)}</div>
    </section>

    <section className="v3-surface v3-dense-card" aria-labelledby="home-upside-heading">
      <div className="v3-dense-card-head"><div><span className="v3-kicker">Decision-time ceiling</span><h2 id="home-upside-heading">Top P10+ signals</h2></div><button type="button" className="v3-text-action" onClick={() => onNavigate('insights')}>Full player table →</button></div>
      <div className="v3-player-list">{topUpside.map(({ playerId, evidence }, index) => <div className="v3-player-list-row" key={playerId}><b>{index + 1}</b><PlayerButton id={playerId} name={playerName(workspace, playerId) ?? `Player ${playerId}`} onClick={setSelectedPlayerId} /><span>{formatNumber(captured(evidence, 'expected_points'), 1)} xPts</span><strong>{formatPercent(captured(evidence, 'p_10_plus'))}</strong></div>)}</div>
    </section>

    {selectedPlayerId != null && live ? <PlayerIntelligenceModal open onClose={() => setSelectedPlayerId(null)} playerId={selectedPlayerId} workspace={workspace} live={live} /> : null}
  </div>;
}

export function InsightsPage() {
  const state = useWorkspace();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const live = useLive(state.data?.gameweek ?? null);
  if (state.loading) return <PageSkeleton label="Loading player intelligence" />;
  if (state.error || !state.data) return <ErrorState title="Insights unavailable" message={state.error} retry={state.reload} />;
  const workspace = state.data;
  const recommendation = workspace.recommendation;
  const evidenceById = new Map((workspace.decision_snapshot?.player_evidence ?? []).map((row) => [row.player_id, row]));
  const players = recommendation?.squad ?? [];
  const capturedCount = players.filter((player) => evidenceById.get(player.player_id)?.status === 'CAPTURED').length;

  return <div className="v3-product-page v3-dense-page" data-page="insights">
    <header className="v3-compact-header">
      <div><span className="v3-kicker">GW{workspace.gameweek} · frozen run #{workspace.decision_snapshot?.prediction_run_id ?? '—'}</span><h1>Player intelligence</h1></div>
      <small>{capturedCount}/{players.length} players with frozen evidence</small>
    </header>

    <section className="v3-surface v3-dense-card" aria-labelledby="insights-table-heading">
      <div className="v3-dense-card-head"><div><span className="v3-kicker">Full recommended squad</span><h2 id="insights-table-heading">Decision-time projection matrix</h2></div><small>Missing = —, never zero</small></div>
      <div className="v3-table-scroll">
        <table className="v3-data-table v3-player-data-table">
          <thead><tr><th>Player</th><th>Pos</th><th>xPts</th><th>xMin</th><th>Start</th><th>Blank</th><th>5+</th><th>10+</th><th>15+</th><th>20+</th><th>Goal</th><th>Assist</th><th>CS</th><th>DC</th><th>Bonus</th></tr></thead>
          <tbody>{players.map((player) => <InsightRow key={player.player_id} workspace={workspace} playerId={player.player_id} position={player.position ?? '—'} evidence={evidenceById.get(player.player_id)} onPlayer={setSelectedPlayerId} />)}</tbody>
        </table>
      </div>
    </section>

    <section className="v3-compact-note" aria-label="Projection provenance"><strong>Frozen at decision time.</strong><span>These probabilities explain the recommendation and are not recalculated from post-kickoff outcomes.</span></section>
    {selectedPlayerId != null && live ? <PlayerIntelligenceModal open onClose={() => setSelectedPlayerId(null)} playerId={selectedPlayerId} workspace={workspace} live={live} /> : null}
  </div>;
}

function InsightRow({ workspace, playerId, position, evidence, onPlayer }: { workspace: FplWorkspaceApi; playerId: number; position: string; evidence: PlayerEvidence | undefined; onPlayer: (id: number) => void }) {
  return <tr><td><PlayerButton id={playerId} name={playerName(workspace, playerId) ?? `Player ${playerId}`} onClick={onPlayer} /></td><td>{position}</td><td>{formatNumber(captured(evidence, 'expected_points'), 1)}</td><td>{formatNumber(captured(evidence, 'expected_minutes'), 0)}</td><td>{formatPercent(captured(evidence, 'p_start'))}</td><td>{formatPercent(captured(evidence, 'p_blank'))}</td><td>{formatPercent(captured(evidence, 'p_5_plus'))}</td><td><strong>{formatPercent(captured(evidence, 'p_10_plus'))}</strong></td><td>{formatPercent(captured(evidence, 'p_15_plus'))}</td><td>{formatPercent(captured(evidence, 'p_20_plus'))}</td><td>{formatPercent(captured(evidence, 'p_goal'))}</td><td>{formatPercent(captured(evidence, 'p_assist'))}</td><td>{formatPercent(captured(evidence, 'p_clean_sheet'))}</td><td>{formatPercent(captured(evidence, 'p_dc'))}</td><td>{formatPercent(captured(evidence, 'p_bonus'))}</td></tr>;
}

function HomeFixtureRow({ fixture }: { fixture: WorkspaceFixture }) {
  return <div className="v3-fixture-row" data-phase={fixture.phase}><time>{formatKickoff(fixture.kickoff_at)}</time><span className="v3-phase-dot">{phaseLabel(fixture.phase)}</span><strong>{fixture.home_team ?? 'Home'}</strong><b>{fixture.phase === 'FUTURE' ? 'vs' : `${fixture.home_score ?? '–'}–${fixture.away_score ?? '–'}`}</b><strong>{fixture.away_team ?? 'Away'}</strong></div>;
}

function PlayerButton({ id, name, onClick }: { id: number; name: string; onClick: (id: number) => void }) { return <button type="button" className="v3-player-link" onClick={() => onClick(id)}>{name}</button>; }
function rankedEvidence(workspace: FplWorkspaceApi) { return (workspace.decision_snapshot?.player_evidence ?? []).filter((row) => row.status === 'CAPTURED').map((evidence) => ({ playerId: evidence.player_id, evidence })).sort((a, b) => (captured(b.evidence, 'p_10_plus') ?? -1) - (captured(a.evidence, 'p_10_plus') ?? -1)); }
function playerName(workspace: FplWorkspaceApi, id: number | null): string | null { if (id == null) return null; return workspace.players.find((player) => player.player_id === id)?.name ?? workspace.recommendation?.squad.find((player) => player.player_id === id)?.name ?? null; }
function captured(evidence: PlayerEvidence | undefined, key: keyof PlayerEvidence): number | null { if (!evidence || evidence.status !== 'CAPTURED') return null; const value = evidence[key]; return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function formatNumber(value: number | null, digits: number): string { return value == null ? '—' : value.toFixed(digits); }
function formatPercent(value: number | null): string { return value == null ? '—' : `${Math.round(value * 100)}%`; }
function actionLabel(count: number): string { return count === 0 ? 'ROLL' : `${count} transfer${count === 1 ? '' : 's'}`; }
function lifecycleLabel(value: string): string { return value === 'PRE_DEADLINE' ? 'Pre-deadline' : value === 'POST_DEADLINE_ACTIVE' ? 'GW active' : value === 'GW_COMPLETE' ? 'GW complete' : 'State unknown'; }
function phaseLabel(value: string): string { return value === 'FUTURE' ? 'Upcoming' : value === 'LIVE' ? 'Live' : 'Final'; }
function sortFixture(a: WorkspaceFixture, b: WorkspaceFixture): number { return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(); }
function formatKickoff(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function PageSkeleton({ label }: { label: string }) { return <div className="v3-page-skeleton" aria-busy="true" aria-label={label}><div/><div/><div className="is-large"/></div>; }
function ErrorState({ title, message, retry }: { title: string; message: string | null; retry: () => void }) { return <section className="v3-surface v3-page-state"><span className="v3-kicker">Fail closed</span><h1>{title}</h1><p>{message ?? 'The database-backed product contract could not be resolved.'}</p><button type="button" className="v3-button v3-button--primary" onClick={retry}>Retry</button></section>; }
