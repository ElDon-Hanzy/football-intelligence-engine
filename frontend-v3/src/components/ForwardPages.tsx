import { useEffect, useMemo, useState } from 'react';
import { fetchActualLive, type ActualLiveApi } from '../api/actualLive';
import { fetchForwardIntelligence, type ForwardIntelligencePayload, type ForwardPlayerProjection } from '../api/forwardIntelligence';
import { fetchHistoricalFpl, type HistoricalFixture, type HistoricalFplPayload, type HistoricalPlayer, type HistoricalPrediction } from '../api/historicalFpl';
import { BenchStrip, FplPitch, SquadList, type PitchPlayer } from './FplPitch';
import type { ProductView } from './ProductPages';

type Navigate = (view: ProductView) => void;
type ViewMode = 'pitch' | 'list';
type ForwardSquadMode = 'projection' | 'actual';

export function ForwardHomePage({ gameweek, onNavigate }: { gameweek: number; onNavigate: Navigate }) {
  const state = useForwardIntelligence(gameweek);
  if (state.loading) return <PageSkeleton label={`Loading GW${gameweek} initial intelligence`} />;
  if (state.error || !state.data) return <ErrorState title={`GW${gameweek} initial intelligence unavailable`} message={state.error} />;
  const data = state.data;
  const topFour = data.top_players.slice(0, 4);
  return <div className="v3-product-page v3-dense-page" data-page="home" data-forward-gameweek={gameweek}>
    <header className="v3-compact-header"><div><span className="v3-kicker">Gameweek {gameweek} · initial projections</span><h1>Command center</h1></div><span className="v3-status" data-tone="intelligence">Upcoming</span></header>
    <section className="v3-compact-stats" aria-label={`GW${gameweek} initial summary`}>
      <button type="button" onClick={() => onNavigate('fpl')}><span>FPL</span><strong>Initial xPts</strong></button>
      <button type="button" onClick={() => onNavigate('insights')}><span>Top projection</span><strong>{topFour[0]?.name ?? '—'}</strong></button>
      <button type="button" onClick={() => onNavigate('matches')}><span>Fixtures</span><strong>{data.fixture_models.length} predicted</strong></button>
      <button type="button" onClick={() => onNavigate('markets')}><span>Markets</span><strong>4 core calls</strong></button>
    </section>
    <section aria-labelledby="forward-fixtures-heading"><div className="v3-section-head"><div><span className="v3-kicker">Frozen forward fixture model</span><h2 id="forward-fixtures-heading">Initial match predictions</h2></div><button type="button" className="v3-text-action" onClick={() => onNavigate('matches')}>Match intelligence →</button></div><div className="v3-card-grid v3-card-grid--fixtures">{data.fixture_models.map((fixture) => <article className="v3-compact-card v3-fixture-mini-card" key={fixture.match_id}><div className="v3-card-meta"><time>{formatKickoff(fixture.kickoff_time)}</time><span className="v3-phase-text" data-phase="FUTURE">Upcoming</span></div><div className="v3-fixture-teams"><strong>{fixture.home ?? 'Home'}</strong><b>{fixture.headline_score ?? 'vs'}</b><strong>{fixture.away ?? 'Away'}</strong></div></article>)}</div></section>
    <section aria-labelledby="forward-picks-heading"><div className="v3-section-head"><div><span className="v3-kicker">Projection leaders · not final picks</span><h2 id="forward-picks-heading">Strongest 4 initial projections</h2></div><button type="button" className="v3-text-action" onClick={() => onNavigate('insights')}>Player intelligence →</button></div><div className="v3-card-grid v3-card-grid--signals">{topFour.map((player, index) => <ForwardSignalCard key={player.id} player={player} rank={index + 1} />)}</div></section>
    <section className="v3-compact-note" role="note"><strong>Initial intelligence only.</strong><span>The final GW{gameweek} squad, transfers, captain and bench stay unpublished until the manager-plan gates run.</span></section>
  </div>;
}

export function ForwardInsightsPage({ gameweek }: { gameweek: number }) {
  const state = useForwardIntelligence(gameweek);
  if (state.loading) return <PageSkeleton label={`Loading GW${gameweek} player projections`} />;
  if (state.error || !state.data) return <ErrorState title={`GW${gameweek} player intelligence unavailable`} message={state.error} />;
  const leaders = state.data.top_players.slice(0, 4);
  return <div className="v3-product-page v3-dense-page" data-page="insights" data-forward-gameweek={gameweek}>
    <header className="v3-compact-header"><div><span className="v3-kicker">Gameweek {gameweek} · Run #{state.data.prediction_run_id}</span><h1>Player intelligence</h1></div><small>{formatTimestamp(state.data.generated_at)}</small></header>
    <section aria-labelledby="forward-player-heading"><div className="v3-section-head"><div><span className="v3-kicker">All-position projection leaders</span><h2 id="forward-player-heading">Strongest 4 initial projections</h2></div><small>Not the final squad recommendation</small></div><div className="v3-card-grid v3-card-grid--players">{leaders.map((player, index) => <ForwardPlayerCard key={player.id} player={player} rank={index + 1} />)}</div></section>
    <section className="v3-compact-note" role="note"><strong>Projection readiness ≠ decision readiness.</strong><span>These are the four highest current model projections with no forced transfer, ownership or differential interpretation. Final FPL decisions remain gated.</span></section>
  </div>;
}

export function ForwardFplPage({ gameweek, activeGameweek }: { gameweek: number; activeGameweek: number }) {
  const [data, setData] = useState<HistoricalFplPayload | null>(null);
  const [baseline, setBaseline] = useState<ActualLiveApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pitch');
  const [squadMode, setSquadMode] = useState<ForwardSquadMode>('projection');

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null); setData(null); setBaseline(null);
    void Promise.all([fetchHistoricalFpl(gameweek, controller.signal), fetchActualLive(activeGameweek, controller.signal)])
      .then(([projection, actual]) => { setData(projection); setBaseline(actual); setLoading(false); })
      .catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === 'AbortError') return; setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false); });
    return () => controller.abort();
  }, [activeGameweek, gameweek]);

  const baselineSquad = useMemo(() => buildForwardSquad(data, baseline), [data, baseline]);
  const projectedSquad = useMemo(() => buildProjectedDecisionSquad(data), [data]);
  if (loading) return <PageSkeleton label={`Loading GW${gameweek} FPL projection`} />;
  if (error || !data || !baseline) return <ErrorState title={`GW${gameweek} FPL projection unavailable`} message={error} />;
  if (baseline.actual.verification_status !== 'VERIFIED') return <section className="v3-surface v3-workspace-error" aria-live="polite"><span className="v3-kicker">GW{gameweek} initial FPL</span><h1>Current squad baseline unavailable.</h1><p>Actual submitted team not verified.</p><p>The engine recommendation is intentionally not substituted as the future baseline.</p></section>;

  return <div className="v3-fpl-workspace" data-forward-gameweek={gameweek}>
    <section className="v3-fpl-hero"><div><span className="v3-kicker">Gameweek {gameweek} · initial projection</span><h1 className="v3-display">Your next Gameweek</h1><p>GW{gameweek} model projections and your separately preserved verified GW{activeGameweek} submitted team. Neither is presented as a final transfer or captain decision.</p></div><div className="v3-fpl-hero-status"><span className="v3-status" data-tone="intelligence">Initial xPts ready</span><span className="v3-status" data-tone="neutral">Final plan pending</span></div></section>
    <section className="v3-fpl-scorecard v3-surface" aria-label="Initial projected xPTS"><div className="v3-fpl-scoremetric" data-metric="xpts"><span>Baseline XI xPTS</span><strong>{baselineSquad.xiPoints == null ? '—' : baselineSquad.xiPoints.toFixed(1)}</strong><small>Verified GW{activeGameweek} team · {baselineSquad.xiCoverage}/11 projections captured</small></div><div className="v3-fpl-scoremetric"><span>GW{gameweek} model XI</span><strong>{projectedSquad.xiPoints == null ? '—' : projectedSquad.xiPoints.toFixed(1)}</strong><small>{projectedSquad.xiCoverage}/11 projected players</small></div><div className="v3-fpl-scoremetric"><span>Final decision</span><strong>Pending</strong><small>No transfer / captain call published yet</small></div></section>
    <div className="v3-fpl-controls"><div className="v3-view-toggle" aria-label="FPL squad source"><button className={squadMode === 'projection' ? 'is-active' : ''} type="button" onClick={() => setSquadMode('projection')}>GW{gameweek} model XI</button><button className={squadMode === 'actual' ? 'is-active' : ''} type="button" onClick={() => setSquadMode('actual')}>My verified GW{activeGameweek} team</button></div><div className="v3-view-toggle" aria-label="Squad view"><button className={viewMode === 'pitch' ? 'is-active' : ''} type="button" onClick={() => setViewMode('pitch')}>Pitch</button><button className={viewMode === 'list' ? 'is-active' : ''} type="button" onClick={() => setViewMode('list')}>List</button></div></div>
    {(() => { const squad = squadMode === 'projection' ? projectedSquad : baselineSquad; const title = squadMode === 'projection' ? `GW${gameweek} model XI` : `My verified GW${activeGameweek} submitted team`; return <section className="v3-surface v3-squad-stage" aria-labelledby="forward-fpl-title"><div className="v3-squad-stage-head"><div><span className="v3-kicker">{squadMode === 'projection' ? `GW${gameweek} model output · not final` : `GW${activeGameweek} locked actual team · projected into GW${gameweek}`}</span><h2 id="forward-fpl-title">{title}</h2></div></div>{squad.starters.length === 0 ? <div className="v3-empty-state"><strong>No valid squad projection is available.</strong><span>Missing players are not reconstructed.</span></div> : viewMode === 'pitch' ? <><FplPitch players={squad.starters} metricMode="projection" /><BenchStrip players={squad.bench} metricMode="projection" /></> : <SquadList starters={squad.starters} bench={squad.bench} metricMode="projection" />}</section>; })()}
    <details className="v3-data-details v3-surface"><summary>Data details</summary><div className="v3-data-details-grid"><div><span>Projection run</span><strong>#{data.prediction_run_id ?? '—'}</strong></div><div><span>Projection time</span><strong>{data.generated_at ? formatTimestamp(data.generated_at) : '—'}</strong></div><div><span>Baseline source</span><strong>Verified GW{activeGameweek} submitted team</strong></div><div><span>Plan status</span><strong>Not published</strong></div></div><p>Forward projection evidence is shown as soon as it exists. A manager plan is not invented to fill the gap.</p></details>
  </div>;
}

function useForwardIntelligence(gameweek: number) {
  const [data, setData] = useState<ForwardIntelligencePayload | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(null); void fetchForwardIntelligence(gameweek, controller.signal).then((payload) => { setData(payload); setLoading(false); }).catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === 'AbortError') return; setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false); }); return () => controller.abort(); }, [gameweek]);
  return { data, loading, error };
}

function buildForwardSquad(data: HistoricalFplPayload | null, baseline: ActualLiveApi | null) {
  if (!data || !baseline || baseline.actual.verification_status !== 'VERIFIED') return { starters: [] as PitchPlayer[], bench: [] as PitchPlayer[], xiPoints: null as number | null, xiCoverage: 0, squadCoverage: 0 };
  const predictions = new Map((data.all_predictions ?? []).map((row) => [row.id, row]));
  const livePlayers = new Map(baseline.players.map((row) => [row.player_id, row]));
  const toPitch = (id: number): PitchPlayer | null => {
    const prediction = predictions.get(id); const livePlayer = livePlayers.get(id); if (!prediction && !livePlayer) return null;
    const team = prediction?.team ?? livePlayer?.team ?? null; const fixture = findTeamFixture(data.fixture_results ?? [], team);
    const home = fixture && team === fixture.home_team; const opponent = fixture ? (home ? fixture.away_short ?? fixture.away_team : fixture.home_short ?? fixture.home_team) : null;
    const ownShort = fixture ? (home ? fixture.home_short : fixture.away_short) : livePlayer?.team_short ?? null;
    return { id, name: prediction?.name ?? livePlayer?.name ?? `Player ${id}`, position: prediction?.position ?? livePlayer?.position ?? '—', teamShort: ownShort ?? livePlayer?.team_short ?? '—', fixtureLabel: opponent ? `${opponent} (${home ? 'H' : 'A'})` : 'Fixture —', fixturePhase: fixture ? 'FUTURE' : null, expectedPoints: finite(prediction?.expected_points), expectedMinutes: finite(prediction?.expected_minutes), p10: probability(prediction?.p_10_plus), actualPoints: null, actualStatus: null, captain: false, vice: false };
  };
  const starters = baseline.actual.starting_xi.map(toPitch).filter((row): row is PitchPlayer => row != null); const bench = baseline.actual.bench_order.map(toPitch).filter((row): row is PitchPlayer => row != null);
  const capturedXi = starters.map((row) => row.expectedPoints).filter((value): value is number => value != null); const xiCoverage = capturedXi.length; const xiPoints = xiCoverage === 11 ? capturedXi.reduce((sum, value) => sum + value, 0) : null;
  return { starters, bench, xiPoints, xiCoverage, squadCoverage: [...starters, ...bench].filter((row) => row.expectedPoints != null).length };
}

function buildProjectedDecisionSquad(data: HistoricalFplPayload | null) {
  if (!data?.decision) return { starters: [] as PitchPlayer[], bench: [] as PitchPlayer[], xiPoints: null as number | null, xiCoverage: 0 };
  const toPitch = (player: HistoricalPlayer, captainId: number | null, viceId: number | null): PitchPlayer => {
    const fixture = findTeamFixture(data.fixture_results ?? [], player.team ?? null);
    const home = fixture?.home_team === player.team;
    const opponent = fixture ? (home ? fixture.away_short ?? fixture.away_team : fixture.home_short ?? fixture.home_team) : null;
    return { id: player.id, name: player.name, position: player.position ?? '—', teamShort: home ? fixture?.home_short ?? player.team ?? '—' : fixture?.away_short ?? player.team ?? '—', fixtureLabel: opponent ? `${opponent} (${home ? 'H' : 'A'})` : 'Fixture —', fixturePhase: fixture ? 'FUTURE' : null, expectedPoints: finite(player.xPts), expectedMinutes: null, p10: probability(player.p10), actualPoints: null, actualStatus: null, captain: player.id === captainId, vice: player.id === viceId };
  };
  const captainId = data.decision.captain_player_id ?? null; const viceId = data.decision.vice_player_id ?? null;
  const starters = (data.decision.starting_xi ?? []).map((player) => toPitch(player, captainId, viceId));
  const bench = (data.decision.bench ?? []).map((player) => toPitch(player, captainId, viceId));
  const values = starters.map((player) => player.expectedPoints).filter((value): value is number => value != null);
  return { starters, bench, xiPoints: values.length === 11 ? values.reduce((sum, value) => sum + value, 0) : null, xiCoverage: values.length };
}

function findTeamFixture(fixtures: HistoricalFixture[], team: string | null): HistoricalFixture | null { if (!team) return null; return fixtures.find((fixture) => fixture.home_team === team || fixture.away_team === team) ?? null; }
function ForwardSignalCard({ player, rank }: { player: ForwardPlayerProjection; rank: number }) { return <article className="v3-compact-card v3-player-summary-card"><span className="v3-card-rank">#{rank}</span><strong>{player.name}</strong><small>{player.team_short ?? player.team ?? '—'} · {player.position}</small><b>{formatNumber(player.expected_points, 1)} xPts</b><small>{formatPercent(player.p_10_plus)} P10+</small></article>; }
function ForwardPlayerCard({ player, rank }: { player: ForwardPlayerProjection; rank: number }) { return <article className="v3-compact-card v3-player-intel-card"><div className="v3-card-meta"><span>#{rank} · {player.position}</span><small>{player.team_short ?? player.team ?? '—'}</small></div><strong className="v3-card-player-name">{player.name}</strong><div className="v3-mini-metrics"><span><small>xPts</small><b>{formatNumber(player.expected_points, 1)}</b></span><span><small>xMin</small><b>{formatNumber(player.expected_minutes, 0)}</b></span><span><small>Start</small><b>{formatPercent(player.p_start)}</b></span><span><small>10+</small><b>{formatPercent(player.p_10_plus)}</b></span><span><small>15+</small><b>{formatPercent(player.p_15_plus)}</b></span><span><small>20+</small><b>{formatPercent(player.p_20_plus)}</b></span></div></article>; }
function PageSkeleton({ label }: { label: string }) { return <div className="v3-page-skeleton" aria-busy="true" aria-label={label}><div/><div/><div className="is-large"/></div>; }
function ErrorState({ title, message }: { title: string; message: string | null }) { return <section className="v3-surface v3-page-state"><span className="v3-kicker">Forward intelligence</span><h1>{title}</h1><p>{message ?? 'The frozen forward projection contract did not resolve.'}</p></section>; }
function finite(value: unknown): number | null { const parsed = Number(value); return value == null || !Number.isFinite(parsed) ? null : parsed; }
function probability(value: unknown): number | null { const parsed = finite(value); return parsed != null && parsed >= 0 && parsed <= 1 ? parsed : null; }
function formatNumber(value: number | null | undefined, digits: number): string { const parsed = finite(value); return parsed == null ? '—' : parsed.toFixed(digits); }
function formatPercent(value: number | null | undefined): string { const parsed = probability(value); return parsed == null ? '—' : `${Math.round(parsed * 100)}%`; }
function formatTimestamp(value: string): string { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatKickoff(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
