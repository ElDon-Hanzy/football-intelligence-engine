import { useEffect, useMemo, useState } from 'react';
import { fetchActualLive, type ActualLiveApi, type ActualLivePlayer } from '../api/actualLive';
import { fetchFplWorkspace, type FplWorkspaceApi, type PlayerEvidence, type WorkspacePlayer } from '../api/fplWorkspace';
import { fetchHistoricalFpl, type HistoricalFplPayload, type HistoricalPlayer } from '../api/historicalFpl';
import { dominantFixturePhase } from '../domain/fplPresentation';
import { BenchStrip, FplPitch, SquadList, type PitchMetricMode, type PitchPlayer } from './FplPitch';
import { PlayerIntelligenceModal } from './PlayerIntelligenceModal';

type StateMode = 'recommendation' | 'actual' | 'live';
type ViewMode = 'pitch' | 'list';

type XiScoreComparison = {
  projectedPoints: number | null;
  projectedCoverage: number;
  actualPoints: number | null;
  actualCoverage: number;
};

export function FplLiveWorkspace({ gameweek = 0 }: { gameweek?: number }) {
  return gameweek > 0 ? <HistoricalFplReview gameweek={gameweek} /> : <CurrentFplLiveWorkspace />;
}

function CurrentFplLiveWorkspace() {
  const [workspace, setWorkspace] = useState<FplWorkspaceApi | null>(null);
  const [live, setLive] = useState<ActualLiveApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateMode, setStateMode] = useState<StateMode>('recommendation');
  const [viewMode, setViewMode] = useState<ViewMode>('pitch');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedPlayerId(null);
    void fetchFplWorkspace(0, controller.signal)
      .then(async (current) => {
        const actual = await fetchActualLive(current.gameweek, controller.signal);
        setWorkspace(current);
        setLive(actual);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading) return <WorkspaceSkeleton />;
  if (error || !workspace || !live) {
    return <section className="v3-surface v3-workspace-error" aria-live="polite"><span className="v3-kicker">FPL</span><h1>FPL workspace is unavailable.</h1><p>{error ?? 'The actual/live contract could not be resolved.'}</p><p>No engine squad will be substituted for missing submitted-team evidence.</p></section>;
  }

  return <WorkspaceContent
    workspace={workspace}
    live={live}
    stateMode={stateMode}
    setStateMode={setStateMode}
    viewMode={viewMode}
    setViewMode={setViewMode}
    selectedPlayerId={selectedPlayerId}
    setSelectedPlayerId={setSelectedPlayerId}
  />;
}

function HistoricalFplReview({ gameweek }: { gameweek: number }) {
  const [data, setData] = useState<HistoricalFplPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pitch');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setData(null);
    void fetchHistoricalFpl(gameweek, controller.signal)
      .then((payload) => { setData(payload); setLoading(false); })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false);
      });
    return () => controller.abort();
  }, [gameweek]);

  if (loading) return <WorkspaceSkeleton />;
  if (error || !data) return <section className="v3-surface v3-workspace-error" aria-live="polite"><span className="v3-kicker">FPL history</span><h1>Gameweek review unavailable.</h1><p>{error ?? 'The chronology-safe historical contract could not be resolved.'}</p></section>;

  const xi = data.decision?.starting_xi ?? [];
  const bench = data.decision?.bench ?? [];
  const players = resolveHistoricalPitchPlayers(xi, data, data.decision?.captain_player_id ?? null, data.decision?.vice_player_id ?? null);
  const benchPlayers = resolveHistoricalPitchPlayers(bench, data, data.decision?.captain_player_id ?? null, data.decision?.vice_player_id ?? null);
  const score = buildHistoricalXiScoreComparison(xi, data);
  const hasOutcomeEvidence = score.actualCoverage > 0;

  return <div className="v3-fpl-workspace" data-historical-gameweek={data.gameweek}>
    <section className="v3-fpl-hero">
      <div><span className="v3-kicker">Gameweek {data.gameweek} review</span><h1 className="v3-display">Your Gameweek</h1><p>Frozen engine XI compared with the points those players actually returned.</p></div>
      <div className="v3-fpl-hero-status"><span className="v3-status" data-tone="neutral">Historical review</span><span className="v3-status" data-tone={data.historical_projection_valid ? 'positive' : 'neutral'}>{data.historical_projection_valid ? 'Valid frozen projection' : 'Audit only'}</span></div>
    </section>

    <FplScorecard score={score} actualVerified={hasOutcomeEvidence} note="Frozen engine-XI comparison. Captain multiplier and automatic substitutions are not applied." />

    <div className="v3-fpl-controls">
      <div><span className="v3-kicker">Historical state</span><strong>Frozen engine XI</strong></div>
      <div className="v3-view-toggle" aria-label="Squad view"><button className={viewMode === 'pitch' ? 'is-active' : ''} type="button" onClick={() => setViewMode('pitch')}>Pitch</button><button className={viewMode === 'list' ? 'is-active' : ''} type="button" onClick={() => setViewMode('list')}>List</button></div>
    </div>

    <section className="v3-surface v3-squad-stage" aria-labelledby="v3-historical-state-title">
      <div className="v3-squad-stage-head"><div><span className="v3-kicker">xPts vs actual points</span><h2 id="v3-historical-state-title">Frozen engine XI</h2></div></div>
      {players.length === 0 ? <div className="v3-empty-state"><strong>No valid frozen XI is available.</strong><span>Missing history is not reconstructed from current data.</span></div> : viewMode === 'pitch' ? <><FplPitch players={players} metricMode="comparison" /><BenchStrip players={benchPlayers} metricMode="comparison" /></> : <SquadList starters={players} bench={benchPlayers} metricMode="comparison" />}
    </section>

    <details className="v3-data-details v3-surface"><summary>Data details</summary><div className="v3-data-details-grid"><div><span>Projection snapshot</span><strong>{data.prediction_run_id == null ? 'Unavailable' : `Run #${data.prediction_run_id}`}</strong></div><div><span>Snapshot stage</span><strong>{data.snapshot_stage ?? 'Historical'}</strong></div><div><span>Projection validity</span><strong>{data.historical_projection_valid ? 'Valid' : 'Audit only'}</strong></div><div><span>Metadata policy</span><strong>{data.metadata_availability?.current_metadata_not_backfilled_into_history ? 'No current backfill' : 'Unavailable'}</strong></div></div><p>Historical evidence stays chronology-safe. Current prices, ownership and post-deadline metadata are not used to rewrite the frozen projection.</p></details>
  </div>;
}

function WorkspaceContent({
  workspace,
  live,
  stateMode,
  setStateMode,
  viewMode,
  setViewMode,
  selectedPlayerId,
  setSelectedPlayerId,
}: {
  workspace: FplWorkspaceApi;
  live: ActualLiveApi;
  stateMode: StateMode;
  setStateMode: (value: StateMode) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  selectedPlayerId: number | null;
  setSelectedPlayerId: (value: number | null) => void;
}) {
  const recommendation = workspace.recommendation;
  const actualVerified = live.actual.verification_status === 'VERIFIED';
  const isActualLane = stateMode === 'actual' || stateMode === 'live';
  const score = useMemo(() => buildXiScoreComparison(workspace, live), [workspace, live]);

  const resolved = useMemo(() => {
    if (isActualLane) {
      if (live.actual.verification_status !== 'VERIFIED') return { starters: [], bench: [] };
      return {
        starters: resolveActualPitchPlayers(live.actual.starting_xi, workspace, live, live.actual.captain_player_id, live.actual.vice_player_id),
        bench: resolveActualPitchPlayers(live.actual.bench_order, workspace, live, live.actual.captain_player_id, live.actual.vice_player_id),
      };
    }
    if (!recommendation) return { starters: [], bench: [] };
    return {
      starters: resolveEnginePitchPlayers(recommendation.starting_xi, workspace, recommendation.captain_player_id, recommendation.vice_player_id),
      bench: resolveEnginePitchPlayers(recommendation.bench_order, workspace, recommendation.captain_player_id, recommendation.vice_player_id),
    };
  }, [isActualLane, live, recommendation, workspace]);

  const metricMode: PitchMetricMode = isActualLane ? 'comparison' : 'projection';
  const stateTitle = stateMode === 'recommendation' ? 'Engine recommendation' : stateMode === 'actual' ? 'My submitted team' : 'Live team';
  const stateDescription = stateMode === 'recommendation'
    ? recommendation ? 'The engine’s frozen pre-deadline recommendation.' : 'No engine recommendation is available for this Gameweek.'
    : stateMode === 'actual'
      ? actualVerified ? 'The team submitted to FPL at the Gameweek lock.' : 'Actual submitted team not verified'
      : actualVerified ? 'Your submitted team with realized points compared against its frozen xPts.' : 'Actual submitted team not verified';

  return (
    <div className="v3-fpl-workspace">
      <section className="v3-fpl-hero">
        <div>
          <span className="v3-kicker">Gameweek {workspace.gameweek}</span>
          <h1 className="v3-display">Your Gameweek</h1>
          <p>{stateDescription}</p>
        </div>
        <div className="v3-fpl-hero-status">
          <span className="v3-status" data-tone={actualVerified ? 'positive' : 'neutral'}>{actualVerified ? 'Submitted team verified' : 'Team not verified'}</span>
          <span className="v3-status" data-tone={workspace.lifecycle === 'POST_DEADLINE_ACTIVE' ? 'intelligence' : 'neutral'}>{lifecycleLabel(workspace.lifecycle)}</span>
        </div>
      </section>

      <FplScorecard score={score} actualVerified={actualVerified} />

      <div className="v3-fpl-controls">
        <div className="v3-state-tabs" role="tablist" aria-label="FPL state">
          <Tab active={stateMode === 'recommendation'} onClick={() => setStateMode('recommendation')}>Engine</Tab>
          <Tab active={stateMode === 'actual'} onClick={() => setStateMode('actual')}>My team</Tab>
          <Tab active={stateMode === 'live'} onClick={() => setStateMode('live')}>Live</Tab>
        </div>
        <div className="v3-view-toggle" aria-label="Squad view">
          <button className={viewMode === 'pitch' ? 'is-active' : ''} type="button" onClick={() => setViewMode('pitch')}>Pitch</button>
          <button className={viewMode === 'list' ? 'is-active' : ''} type="button" onClick={() => setViewMode('list')}>List</button>
        </div>
      </div>

      <section className="v3-surface v3-squad-stage" aria-labelledby="v3-state-title">
        <div className="v3-squad-stage-head">
          <div><span className="v3-kicker">{stateMode === 'live' ? 'xPts vs actual points' : 'Selection'}</span><h2 id="v3-state-title">{stateTitle}</h2></div>
        </div>

        {isActualLane && !actualVerified ? (
          <div className="v3-actual-unverified" role="status"><span className="v3-unverified-icon" aria-hidden="true">?</span><div><span className="v3-kicker">Submitted team</span><h3>Actual submitted team not verified</h3><p>The engine recommendation is intentionally not substituted into My team or Live.</p></div></div>
        ) : resolved.starters.length === 0 ? (
          <div className="v3-empty-state"><strong>No complete selection is available for this state.</strong><span>Missing players are not reconstructed from another lane.</span></div>
        ) : viewMode === 'pitch' ? (
          <><FplPitch players={resolved.starters} metricMode={metricMode} onPlayerSelect={(player) => setSelectedPlayerId(player.id)} /><BenchStrip players={resolved.bench} metricMode={metricMode} onPlayerSelect={(player) => setSelectedPlayerId(player.id)} /></>
        ) : (
          <SquadList starters={resolved.starters} bench={resolved.bench} metricMode={metricMode} onPlayerSelect={(player) => setSelectedPlayerId(player.id)} />
        )}
      </section>

      {stateMode === 'recommendation' && recommendation ? <EngineSummary workspace={workspace} /> : null}
      {stateMode === 'live' && actualVerified ? <LiveTruthStrip live={live} /> : null}
      <FixtureRail workspace={workspace} />
      <DataDetails workspace={workspace} live={live} actualVerified={actualVerified} />

      <PlayerIntelligenceModal open={selectedPlayerId != null} onClose={() => setSelectedPlayerId(null)} playerId={selectedPlayerId} workspace={workspace} live={live} />
    </div>
  );
}

function FplScorecard({ score, actualVerified, note = 'Raw submitted-XI comparison. Captain multiplier and automatic substitutions are not applied here.' }: { score: XiScoreComparison; actualVerified: boolean; note?: string }) {
  const projectedPoints = score.projectedPoints;
  const actualPoints = score.actualPoints;
  const difference = projectedPoints != null && actualPoints != null && score.actualCoverage === 11 ? actualPoints - projectedPoints : null;
  return <section className="v3-fpl-scorecard v3-surface" aria-label="Projected xPTS versus Actual PTS">
    <div className="v3-fpl-scoremetric" data-metric="xpts"><span>XI xPTS</span><strong>{projectedPoints == null ? '—' : projectedPoints.toFixed(1)}</strong><small>{projectedPoints == null ? `${score.projectedCoverage}/11 projections captured` : 'Frozen pre-deadline projection'}</small></div>
    <div className="v3-fpl-scoremetric" data-metric="actual"><span>Actual PTS</span><strong>{!actualVerified || actualPoints == null ? '—' : String(actualPoints)}</strong><small>{!actualVerified ? 'Actual points unavailable' : `${score.actualCoverage}/11 players reported`}</small></div>
    <div className="v3-fpl-scoremetric" data-metric="delta"><span>vs xPTS</span><strong>{difference == null ? '—' : `${difference >= 0 ? '+' : ''}${difference.toFixed(1)}`}</strong><small>{difference == null ? 'Shown when all XI points are available' : 'Actual minus projected'}</small></div>
    <p>{note}</p>
  </section>;
}

function DataDetails({ workspace, live, actualVerified }: { workspace: FplWorkspaceApi; live: ActualLiveApi; actualVerified: boolean }) {
  return <details className="v3-data-details v3-surface">
    <summary>Data details</summary>
    <div className="v3-data-details-grid">
      <div><span>Lifecycle</span><strong>{lifecycleLabel(workspace.lifecycle)}</strong></div>
      <div><span>Actual source</span><strong>{actualVerified ? 'FPL locked picks' : 'Not verified'}</strong></div>
      <div><span>Result snapshot</span><strong>{live.result_snapshot?.observed_at ? formatTimestamp(live.result_snapshot.observed_at) : 'Unavailable'}</strong></div>
      <div><span>Projection snapshot</span><strong>{workspace.decision_snapshot ? `Run #${workspace.decision_snapshot.prediction_run_id}` : 'Unavailable'}</strong></div>
      <div><span>Engine execution</span><strong>{workspace.recommendation?.execution_authorized ? 'Authorized' : 'Not execution-authorized'}</strong></div>
    </div>
    <p>Engine recommendation, submitted team and live result remain separate. Frozen xPts stay decision-time evidence and are never rewritten after kickoff.</p>
  </details>;
}

function EngineSummary({ workspace }: { workspace: FplWorkspaceApi }) {
  const recommendation = workspace.recommendation;
  if (!recommendation) return null;
  const captain = playerName(workspace, recommendation.captain_player_id);
  return <section className="v3-recommendation-grid" aria-label="Engine recommendation details">
    <article className="v3-surface v3-summary-card"><span className="v3-kicker">Recommended action</span><h3>{recommendation.transfers.length ? `${recommendation.transfers.length} transfers` : 'ROLL / no transfer'}</h3><div className="v3-transfer-list">{recommendation.transfers.length ? recommendation.transfers.map((transfer, index) => <div key={index}><span>{readString(transfer.out_name) ?? `Player ${readNumber(transfer.out_player_id) ?? '—'}`}</span><b aria-hidden="true">→</b><strong>{readString(transfer.in_name) ?? `Player ${readNumber(transfer.in_player_id) ?? '—'}`}</strong></div>) : <p>No transfer attached.</p>}</div></article>
    <article className="v3-surface v3-summary-card"><span className="v3-kicker">After recommended action</span><div className="v3-number-grid"><Summary label="FT" value={recommendation.manager_economy?.free_transfers == null ? '—' : String(recommendation.manager_economy.free_transfers)} /><Summary label="Bank" value={recommendation.manager_economy?.bank_tenths == null ? '—' : `£${(recommendation.manager_economy.bank_tenths / 10).toFixed(1)}m`} /><Summary label="Chip" value={recommendation.chip && recommendation.chip !== 'NONE' ? recommendation.chip : 'None'} /><Summary label="Captain" value={captain ?? '—'} /></div></article>
  </section>;
}

function LiveTruthStrip({ live }: { live: ActualLiveApi }) {
  const final = live.player_actuals.filter((item) => item.status === 'FINAL').length;
  const provisional = live.player_actuals.filter((item) => item.status === 'LIVE' || item.status === 'PARTIAL').length;
  const pending = live.player_actuals.filter((item) => item.status === 'PENDING').length;
  return <section className="v3-surface v3-live-truth-strip" aria-label="Actual squad result state"><div><span>Final</span><strong>{final}</strong></div><div><span>Live / partial</span><strong>{provisional}</strong></div><div><span>Pending</span><strong>{pending}</strong></div><p>Player cards show Actual PTS against the frozen xPts for the same player.</p></section>;
}

function FixtureRail({ workspace }: { workspace: FplWorkspaceApi }) {
  const fixtures = [...workspace.realized.fixtures].sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
  return <section className="v3-fixture-section" aria-labelledby="fixture-state-heading"><div className="v3-section-heading"><div><span className="v3-kicker">Gameweek pulse</span><h2 id="fixture-state-heading">Fixtures</h2></div><small>Open Matches for predictions and matchup intelligence.</small></div><div className="v3-fixture-rail">{fixtures.map((fixture) => <article className="v3-fixture-card" data-phase={fixture.phase} key={fixture.match_id}><div className="v3-fixture-card-top"><span>{fixture.phase === 'FUTURE' ? 'Upcoming' : fixture.phase === 'LIVE' ? 'Live' : 'Finished'}</span><time>{formatKickoff(fixture.kickoff_at)}</time></div><strong>{fixture.home_team ?? 'Home'} <b>{fixture.phase === 'FUTURE' ? 'vs' : `${fixture.home_score ?? '–'} : ${fixture.away_score ?? '–'}`}</b> {fixture.away_team ?? 'Away'}</strong></article>)}</div></section>;
}

function buildXiScoreComparison(workspace: FplWorkspaceApi, live: ActualLiveApi): XiScoreComparison {
  if (live.actual.verification_status !== 'VERIFIED') return { projectedPoints: null, projectedCoverage: 0, actualPoints: null, actualCoverage: 0 };
  const xi = live.actual.starting_xi;
  const evidenceById = new Map((workspace.decision_snapshot?.player_evidence ?? []).map((row) => [row.player_id, row]));
  const actualById = new Map(live.player_actuals.map((row) => [row.player_id, row]));
  const projections = xi.map((id) => captured(evidenceById.get(id), 'expected_points')).filter((value): value is number => value != null);
  const actuals = xi.map((id) => actualById.get(id)?.total_points ?? null).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return { projectedPoints: projections.length === xi.length ? projections.reduce((sum, value) => sum + value, 0) : null, projectedCoverage: projections.length, actualPoints: actuals.length ? actuals.reduce((sum, value) => sum + value, 0) : null, actualCoverage: actuals.length };
}

function buildHistoricalXiScoreComparison(xi: HistoricalPlayer[], data: HistoricalFplPayload): XiScoreComparison {
  const actualById = new Map((data.all_predictions ?? []).map((row) => [row.id, row.actual?.total_points ?? null]));
  const projections = xi.map((player) => numeric(player.xPts)).filter((value): value is number => value != null);
  const actuals = xi.map((player) => actualById.get(player.id) ?? null).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return { projectedPoints: projections.length === xi.length && xi.length === 11 ? projections.reduce((sum, value) => sum + value, 0) : null, projectedCoverage: projections.length, actualPoints: actuals.length ? actuals.reduce((sum, value) => sum + value, 0) : null, actualCoverage: actuals.length };
}

function resolveHistoricalPitchPlayers(players: HistoricalPlayer[], data: HistoricalFplPayload, captainId: number | null, viceId: number | null): PitchPlayer[] {
  const predictionById = new Map((data.all_predictions ?? []).map((row) => [row.id, row]));
  return players.map((player) => {
    const prediction = predictionById.get(player.id);
    const fixture = historicalFixtureState(player.team ?? null, data);
    const actualPoints = numeric(prediction?.actual?.total_points);
    return { id: player.id, name: player.name, position: player.position ?? prediction?.position ?? 'UNKNOWN', teamShort: teamShort(player.team ?? prediction?.team ?? null), fixtureLabel: fixture.label, fixturePhase: fixture.phase, expectedPoints: numeric(player.xPts) ?? numeric(prediction?.expected_points), expectedMinutes: numeric(prediction?.expected_minutes), p10: numeric(player.p10) ?? numeric(prediction?.p_10_plus), actualPoints, actualStatus: actualPoints == null ? 'PENDING' : 'FINAL', captain: player.id === captainId, vice: player.id === viceId };
  });
}

function historicalFixtureState(team: string | null, data: HistoricalFplPayload) {
  if (!team) return { label: `GW${data.gameweek}`, phase: 'FINISHED' as const };
  const normalized = team.toLowerCase();
  const fixture = (data.fixture_results ?? []).find((row) => row.home_team?.toLowerCase() === normalized || row.away_team?.toLowerCase() === normalized);
  if (!fixture) return { label: `GW${data.gameweek}`, phase: 'FINISHED' as const };
  const home = fixture.home_team?.toLowerCase() === normalized;
  const opponent = home ? fixture.away_team : fixture.home_team;
  return { label: `${teamShort(opponent)} (${home ? 'H' : 'A'})`, phase: fixture.finished ? 'FINISHED' as const : 'FUTURE' as const };
}

function resolveEnginePitchPlayers(ids: number[], workspace: FplWorkspaceApi, captainId: number | null, viceId: number | null): PitchPlayer[] {
  return ids.map((id) => {
    const metadata = workspace.players.find((player) => player.player_id === id);
    const recommended = workspace.recommendation?.squad.find((player) => player.player_id === id);
    const evidence = workspace.decision_snapshot?.player_evidence.find((row) => row.player_id === id);
    const fixture = workspaceFixtureState(metadata);
    return { id, name: recommended?.name ?? metadata?.name ?? `Player ${id}`, position: recommended?.position ?? metadata?.position ?? 'UNKNOWN', teamShort: metadata?.team_short ?? recommended?.team ?? '—', fixtureLabel: fixture.label, fixturePhase: fixture.phase, expectedPoints: captured(evidence, 'expected_points'), expectedMinutes: captured(evidence, 'expected_minutes') ?? recommended?.expected_minutes ?? null, p10: captured(evidence, 'p_10_plus'), actualPoints: null, actualStatus: null, captain: id === captainId, vice: id === viceId };
  });
}

function resolveActualPitchPlayers(ids: number[], workspace: FplWorkspaceApi, live: ActualLiveApi, captainId: number | null, viceId: number | null): PitchPlayer[] {
  return ids.map((id) => {
    const metadata = live.players.find((player) => player.player_id === id);
    const evidence = workspace.decision_snapshot?.player_evidence.find((row) => row.player_id === id);
    const actual = live.player_actuals.find((row) => row.player_id === id);
    const fixture = actualFixtureState(metadata);
    return { id, name: metadata?.name ?? `Player ${id}`, position: metadata?.position ?? 'UNKNOWN', teamShort: metadata?.team_short ?? '—', fixtureLabel: fixture.label, fixturePhase: fixture.phase, expectedPoints: captured(evidence, 'expected_points'), expectedMinutes: captured(evidence, 'expected_minutes'), p10: captured(evidence, 'p_10_plus'), actualPoints: actual?.total_points ?? null, actualStatus: actual?.status ?? null, captain: id === captainId, vice: id === viceId };
  });
}

function workspaceFixtureState(player: WorkspacePlayer | undefined) {
  if (!player?.fixtures.length) return { label: 'Fixture unavailable', phase: null as PitchPlayer['fixturePhase'] };
  return { label: player.fixtures.map((fixture) => `${fixture.opponent_short ?? fixture.opponent ?? 'OPP'} (${fixture.venue})`).join(' · '), phase: dominantFixturePhase(player.fixtures.map((fixture) => fixture.phase)) };
}

function actualFixtureState(player: ActualLivePlayer | undefined) {
  if (!player?.fixtures.length) return { label: 'Fixture unavailable', phase: null as PitchPlayer['fixturePhase'] };
  return { label: player.fixtures.map((fixture) => `${fixture.opponent_short ?? fixture.opponent ?? 'OPP'} (${fixture.venue})`).join(' · '), phase: dominantFixturePhase(player.fixtures.map((fixture) => fixture.phase)) };
}

function captured(evidence: PlayerEvidence | undefined, key: keyof Pick<PlayerEvidence, 'expected_points' | 'expected_minutes' | 'p_10_plus'>): number | null {
  if (!evidence || evidence.status !== 'CAPTURED') return null;
  const value = evidence[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function playerName(workspace: FplWorkspaceApi, id: number | null): string | null { if (id == null) return null; return workspace.players.find((player) => player.player_id === id)?.name ?? workspace.recommendation?.squad.find((player) => player.player_id === id)?.name ?? null; }
function teamShort(value: string | null | undefined): string { if (!value) return '—'; const tokens = value.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean); if (tokens.length > 1) return tokens.map((token) => token[0]).join('').slice(0, 3).toUpperCase(); return value.slice(0, 3).toUpperCase(); }
function numeric(value: unknown): number | null { const parsed = Number(value); return value == null || value === '' || !Number.isFinite(parsed) ? null : parsed; }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button className={active ? 'is-active' : ''} type="button" role="tab" aria-selected={active} onClick={onClick}>{children}</button>; }
function Summary({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function readString(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value : null; }
function readNumber(value: unknown): number | null { const n = Number(value); return Number.isFinite(n) ? n : null; }
function lifecycleLabel(value: string): string { return value === 'PRE_DEADLINE' ? 'Pre-deadline' : value === 'POST_DEADLINE_ACTIVE' ? 'Live Gameweek' : value === 'GW_COMPLETE' ? 'Gameweek complete' : 'State unavailable'; }
function formatTimestamp(value: string): string { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatKickoff(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

function WorkspaceSkeleton() { return <div className="v3-fpl-workspace" aria-busy="true" aria-label="Loading FPL workspace"><section className="v3-fpl-hero"><div><span className="v3-kicker">FPL</span><h1 className="v3-display">Loading Gameweek…</h1></div></section><div className="v3-surface v3-skeleton-panel" /></div>; }
