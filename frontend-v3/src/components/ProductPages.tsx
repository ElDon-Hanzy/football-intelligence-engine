import { useEffect, useState } from 'react';
import { fetchActualLive, type ActualLiveApi } from '../api/actualLive';
import { fetchFplWorkspace, type FplWorkspaceApi, type PlayerEvidence, type WorkspaceFixture } from '../api/fplWorkspace';
import { fetchHistoricalFpl, type HistoricalFplPayload, type HistoricalPlayer } from '../api/historicalFpl';
import { PlayerIntelligenceModal } from './PlayerIntelligenceModal';

export type ProductView = 'home' | 'fpl' | 'matches' | 'markets' | 'insights' | 'history';
type Navigate = (view: ProductView) => void;
type WorkspaceLoad = { data: FplWorkspaceApi | null; loading: boolean; error: string | null; reload: () => void };
type HistoricalLoad = { data: HistoricalFplPayload | null; loading: boolean; error: string | null; reload: () => void };

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

function useHistorical(gameweek: number): HistoricalLoad {
  const [data, setData] = useState<HistoricalFplPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    void fetchHistoricalFpl(gameweek, controller.signal).then((payload) => { setData(payload); setLoading(false); }).catch((reason: unknown) => {
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

export function HomePage({ onNavigate, gameweek = 0, currentGameweek = null }: { onNavigate: Navigate; gameweek?: number; currentGameweek?: number | null }) {
  const isCurrent = gameweek === 0 || (currentGameweek != null && gameweek === currentGameweek);
  return isCurrent ? <CurrentHomePage onNavigate={onNavigate} gameweek={currentGameweek ?? undefined} /> : <HistoricalHomePage onNavigate={onNavigate} gameweek={gameweek} />;
}

function CurrentHomePage({ onNavigate, gameweek }: { onNavigate: Navigate; gameweek?: number | undefined }) {
  const state = useWorkspace(gameweek);
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

    <section aria-labelledby="home-fixtures-heading">
      <div className="v3-section-head"><div><span className="v3-kicker">Gameweek fixtures</span><h2 id="home-fixtures-heading">All matches</h2></div><button type="button" className="v3-text-action" onClick={() => onNavigate('matches')}>Match intelligence →</button></div>
      <div className="v3-card-grid v3-card-grid--fixtures">{fixtures.map((fixture) => <HomeFixtureCard key={fixture.match_id} fixture={fixture} />)}</div>
    </section>

    <section aria-labelledby="home-upside-heading">
      <div className="v3-section-head"><div><span className="v3-kicker">Decision-time ceiling</span><h2 id="home-upside-heading">Top P10+ signals</h2></div><button type="button" className="v3-text-action" onClick={() => onNavigate('insights')}>Player intelligence →</button></div>
      <div className="v3-card-grid v3-card-grid--signals">{topUpside.map(({ playerId, evidence }, index) => <button type="button" className="v3-compact-card v3-player-summary-card" key={playerId} onClick={() => setSelectedPlayerId(playerId)} aria-label={`Open ${playerName(workspace, playerId) ?? `Player ${playerId}`} intelligence`}><span className="v3-card-rank">#{index + 1}</span><strong>{playerName(workspace, playerId) ?? `Player ${playerId}`}</strong><small>{formatNumber(captured(evidence, 'expected_points'), 1)} xPts</small><b>{formatPercent(captured(evidence, 'p_10_plus'))} P10+</b></button>)}</div>
    </section>

    {selectedPlayerId != null && live ? <PlayerIntelligenceModal open onClose={() => setSelectedPlayerId(null)} playerId={selectedPlayerId} workspace={workspace} live={live} /> : null}
  </div>;
}

function HistoricalHomePage({ onNavigate, gameweek }: { onNavigate: Navigate; gameweek: number }) {
  const state = useHistorical(gameweek);
  if (state.loading) return <PageSkeleton label="Loading historical command center" />;
  if (state.error || !state.data) return <ErrorState title={`GW${gameweek} command center unavailable`} message={state.error} retry={state.reload} />;
  const data = state.data;
  const xi = data.decision?.starting_xi ?? [];
  const squad = [...xi, ...(data.decision?.bench ?? [])];
  const captain = squad.find((player) => player.id === data.decision?.captain_player_id)?.name ?? '—';
  const xpts = totalHistoricalXpts(xi);
  const fixtures = data.fixture_results ?? [];
  const topUpside = [...squad].filter((player) => numeric(player.p10) != null).sort((a, b) => (numeric(b.p10) ?? -1) - (numeric(a.p10) ?? -1)).slice(0, 5);

  return <div className="v3-product-page v3-dense-page" data-page="home">
    <header className="v3-compact-header"><div><span className="v3-kicker">Gameweek {data.gameweek} · historical review</span><h1>Command center</h1></div><span className="v3-status" data-tone={data.historical_projection_valid ? 'positive' : 'neutral'}>{data.historical_projection_valid ? 'Frozen projection' : 'Audit only'}</span></header>
    <section className="v3-compact-stats" aria-label="Historical Gameweek summary">
      <button type="button" onClick={() => onNavigate('fpl')}><span>XI xPts</span><strong>{xpts == null ? '—' : xpts.toFixed(1)}</strong></button>
      <button type="button" onClick={() => onNavigate('fpl')}><span>Captain</span><strong>{captain}</strong></button>
      <button type="button" onClick={() => onNavigate('matches')}><span>Fixtures</span><strong>{fixtures.filter((fixture) => fixture.finished).length}/{fixtures.length} final</strong></button>
      <button type="button" onClick={() => onNavigate('history')}><span>Review</span><strong>Open audit</strong></button>
    </section>
    <section aria-labelledby="home-fixtures-heading"><div className="v3-section-head"><div><span className="v3-kicker">Gameweek fixtures</span><h2 id="home-fixtures-heading">All matches</h2></div><button type="button" className="v3-text-action" onClick={() => onNavigate('matches')}>Match intelligence →</button></div><div className="v3-card-grid v3-card-grid--fixtures">{fixtures.map((fixture) => <article className="v3-compact-card v3-fixture-mini-card" key={fixture.match_id}><div className="v3-card-meta"><time>{formatKickoff(fixture.kickoff_time)}</time><span className="v3-phase-text" data-phase={fixture.finished ? 'FINISHED' : 'FUTURE'}>{fixture.finished ? 'Final' : 'Upcoming'}</span></div><div className="v3-fixture-teams"><strong>{fixture.home_team ?? 'Home'}</strong><b>{fixture.finished ? `${fixture.home_score ?? '–'}–${fixture.away_score ?? '–'}` : 'vs'}</b><strong>{fixture.away_team ?? 'Away'}</strong></div></article>)}</div></section>
    <section aria-labelledby="home-upside-heading"><div className="v3-section-head"><div><span className="v3-kicker">Decision-time ceiling</span><h2 id="home-upside-heading">Top P10+ signals</h2></div><button type="button" className="v3-text-action" onClick={() => onNavigate('insights')}>Player intelligence →</button></div><div className="v3-card-grid v3-card-grid--signals">{topUpside.map((player, index) => <article className="v3-compact-card v3-player-summary-card" key={player.id}><span className="v3-card-rank">#{index + 1}</span><strong>{player.name}</strong><small>{formatNumber(numeric(player.xPts), 1)} xPts</small><b>{formatPercent(numeric(player.p10))} P10+</b></article>)}</div></section>
  </div>;
}

export function InsightsPage({ gameweek = 0, currentGameweek = null }: { gameweek?: number; currentGameweek?: number | null }) {
  const isCurrent = gameweek === 0 || (currentGameweek != null && gameweek === currentGameweek);
  return isCurrent ? <CurrentInsightsPage gameweek={currentGameweek ?? undefined} /> : <HistoricalInsightsPage gameweek={gameweek} />;
}

function CurrentInsightsPage({ gameweek }: { gameweek?: number | undefined }) {
  const state = useWorkspace(gameweek);
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
    <header className="v3-compact-header"><div><span className="v3-kicker">Gameweek {workspace.gameweek} · decision-time projections</span><h1>Player intelligence</h1></div><small>{capturedCount}/{players.length} players with frozen evidence</small></header>
    <section aria-labelledby="insights-cards-heading"><div className="v3-section-head"><div><span className="v3-kicker">Full recommended squad</span><h2 id="insights-cards-heading">Decision-time player cards</h2></div><small>Missing = —, never zero</small></div><div className="v3-card-grid v3-card-grid--players">{players.map((player) => <InsightCard key={player.player_id} workspace={workspace} playerId={player.player_id} position={player.position ?? '—'} evidence={evidenceById.get(player.player_id)} onPlayer={setSelectedPlayerId} />)}</div></section>
    <section className="v3-compact-note" aria-label="Projection provenance"><strong>Frozen at decision time.</strong><span>These probabilities explain the recommendation and are not recalculated from post-kickoff outcomes.</span></section>
    {selectedPlayerId != null && live ? <PlayerIntelligenceModal open onClose={() => setSelectedPlayerId(null)} playerId={selectedPlayerId} workspace={workspace} live={live} /> : null}
  </div>;
}

function HistoricalInsightsPage({ gameweek }: { gameweek: number }) {
  const state = useHistorical(gameweek);
  if (state.loading) return <PageSkeleton label="Loading historical player intelligence" />;
  if (state.error || !state.data) return <ErrorState title={`GW${gameweek} insights unavailable`} message={state.error} retry={state.reload} />;
  const data = state.data;
  const players = [...(data.decision?.starting_xi ?? []), ...(data.decision?.bench ?? [])];
  return <div className="v3-product-page v3-dense-page" data-page="insights">
    <header className="v3-compact-header"><div><span className="v3-kicker">Gameweek {data.gameweek} · frozen decision-time projections</span><h1>Player intelligence</h1></div><small>{players.length} frozen squad players</small></header>
    <section aria-labelledby="insights-cards-heading"><div className="v3-section-head"><div><span className="v3-kicker">Frozen squad</span><h2 id="insights-cards-heading">Decision-time player cards</h2></div><small>No current metadata backfill</small></div><div className="v3-card-grid v3-card-grid--players">{players.map((player) => <HistoricalInsightCard key={player.id} player={player} />)}</div></section>
    <section className="v3-compact-note" aria-label="Projection provenance"><strong>Frozen at decision time.</strong><span>Historical probabilities are preserved as captured and are not recalculated from final outcomes.</span></section>
  </div>;
}

function InsightCard({ workspace, playerId, position, evidence, onPlayer }: { workspace: FplWorkspaceApi; playerId: number; position: string; evidence: PlayerEvidence | undefined; onPlayer: (id: number) => void }) {
  const name = playerName(workspace, playerId) ?? `Player ${playerId}`;
  const metrics = [['xPts', formatNumber(captured(evidence, 'expected_points'), 1)], ['xMin', formatNumber(captured(evidence, 'expected_minutes'), 0)], ['Start', formatPercent(captured(evidence, 'p_start'))], ['Blank', formatPercent(captured(evidence, 'p_blank'))], ['10+', formatPercent(captured(evidence, 'p_10_plus'))], ['15+', formatPercent(captured(evidence, 'p_15_plus'))], ['20+', formatPercent(captured(evidence, 'p_20_plus'))], ['Goal', formatPercent(captured(evidence, 'p_goal'))], ['Assist', formatPercent(captured(evidence, 'p_assist'))], ['CS', formatPercent(captured(evidence, 'p_clean_sheet'))], ['DC', formatPercent(captured(evidence, 'p_dc'))], ['Bonus', formatPercent(captured(evidence, 'p_bonus'))]];
  return <button type="button" className="v3-compact-card v3-player-intel-card" onClick={() => onPlayer(playerId)} aria-label={`Open ${name} intelligence`}><span className="v3-card-meta"><b>{position}</b><small>{evidence?.status === 'CAPTURED' ? 'Frozen' : 'Missing evidence'}</small></span><strong className="v3-card-player-name">{name}</strong><span className="v3-metric-cluster">{metrics.map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}</span></button>;
}

function HistoricalInsightCard({ player }: { player: HistoricalPlayer }) {
  const metrics = [['xPts', formatNumber(numeric(player.xPts), 1)], ['10+', formatPercent(numeric(player.p10))], ['15+', formatPercent(numeric(player.p15))], ['20+', formatPercent(numeric(player.p20))]];
  return <article className="v3-compact-card v3-player-intel-card"><span className="v3-card-meta"><b>{player.position ?? '—'}</b><small>{player.team ?? '—'}</small></span><strong className="v3-card-player-name">{player.name}</strong><span className="v3-metric-cluster">{metrics.map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}</span></article>;
}

function HomeFixtureCard({ fixture }: { fixture: WorkspaceFixture }) { return <article className="v3-compact-card v3-fixture-mini-card" data-phase={fixture.phase}><div className="v3-card-meta"><time>{formatKickoff(fixture.kickoff_at)}</time><span className="v3-phase-text" data-phase={fixture.phase}>{phaseLabel(fixture.phase)}</span></div><div className="v3-fixture-teams"><strong>{fixture.home_team ?? 'Home'}</strong><b>{fixture.phase === 'FUTURE' ? 'vs' : `${fixture.home_score ?? '–'}–${fixture.away_score ?? '–'}`}</b><strong>{fixture.away_team ?? 'Away'}</strong></div></article>; }
function rankedEvidence(workspace: FplWorkspaceApi) { return (workspace.decision_snapshot?.player_evidence ?? []).filter((row) => row.status === 'CAPTURED').map((evidence) => ({ playerId: evidence.player_id, evidence })).sort((a, b) => (captured(b.evidence, 'p_10_plus') ?? -1) - (captured(a.evidence, 'p_10_plus') ?? -1)); }
function playerName(workspace: FplWorkspaceApi, id: number | null): string | null { if (id == null) return null; return workspace.players.find((player) => player.player_id === id)?.name ?? workspace.recommendation?.squad.find((player) => player.player_id === id)?.name ?? null; }
function captured(evidence: PlayerEvidence | undefined, key: keyof PlayerEvidence): number | null { if (!evidence || evidence.status !== 'CAPTURED') return null; const value = evidence[key]; return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function totalHistoricalXpts(players: HistoricalPlayer[]): number | null { const values = players.map((player) => numeric(player.xPts)); return players.length === 11 && values.every((value) => value != null) ? values.reduce((sum, value) => sum + (value ?? 0), 0) : null; }
function numeric(value: unknown): number | null { if (value == null || value === '') return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function formatNumber(value: number | null, digits: number): string { return value == null ? '—' : value.toFixed(digits); }
function formatPercent(value: number | null): string { return value == null ? '—' : `${Math.round(value * 100)}%`; }
function actionLabel(count: number): string { return count === 0 ? 'ROLL' : `${count} transfer${count === 1 ? '' : 's'}`; }
function lifecycleLabel(value: string): string { return value === 'PRE_DEADLINE' ? 'Pre-deadline' : value === 'POST_DEADLINE_ACTIVE' ? 'GW active' : value === 'GW_COMPLETE' ? 'GW complete' : 'State unknown'; }
function phaseLabel(value: string): string { return value === 'FUTURE' ? 'Upcoming' : value === 'LIVE' ? 'Live' : 'Final'; }
function sortFixture(a: WorkspaceFixture, b: WorkspaceFixture): number { return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(); }
function formatKickoff(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function PageSkeleton({ label }: { label: string }) { return <div className="v3-page-skeleton" aria-busy="true" aria-label={label}><div/><div/><div className="is-large"/></div>; }
function ErrorState({ title, message, retry }: { title: string; message: string | null; retry: () => void }) { return <section className="v3-surface v3-page-state"><span className="v3-kicker">Fail closed</span><h1>{title}</h1><p>{message ?? 'The database-backed product contract could not be resolved.'}</p><button type="button" className="v3-button v3-button--primary" onClick={retry}>Retry</button></section>; }
