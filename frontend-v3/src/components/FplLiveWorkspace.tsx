import { useEffect, useMemo, useState } from 'react';
import { fetchActualLive, type ActualLiveApi, type ActualLivePlayer } from '../api/actualLive';
import { fetchFplWorkspace, type FplWorkspaceApi, type PlayerEvidence, type WorkspacePlayer } from '../api/fplWorkspace';
import { dominantFixturePhase } from '../domain/fplPresentation';
import { BenchStrip, FplPitch, SquadList, type PitchMetricMode, type PitchPlayer } from './FplPitch';
import { PlayerIntelligenceModal } from './PlayerIntelligenceModal';

type StateMode = 'recommendation' | 'actual' | 'live';
type ViewMode = 'pitch' | 'list';

export function FplLiveWorkspace() {
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
    return <section className="v3-surface v3-workspace-error" aria-live="polite"><span className="v3-kicker">V3 truth gate</span><h1>FPL workspace is unavailable.</h1><p>{error ?? 'The actual/live contract could not be resolved.'}</p><p>No engine squad will be substituted for missing submitted-team evidence.</p></section>;
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

  const metricMode: PitchMetricMode = stateMode === 'live' ? 'realized' : 'projection';
  const stateTitle = stateMode === 'recommendation' ? 'Engine recommendation' : stateMode === 'actual' ? 'Actual submitted team' : 'Live actual squad';
  const stateDescription = stateMode === 'recommendation'
    ? recommendation ? `Frozen publication #${recommendation.publication_id}. This is decision intelligence, not proof of execution.` : 'No current recommendation is available.'
    : stateMode === 'actual'
      ? actualVerified ? 'Automatically verified from the public FPL picks endpoint after Gameweek lock.' : 'Actual submitted team not verified'
      : actualVerified ? 'Realized FPL results for the actual submitted XI and bench. Engine-selected players are not substituted here.' : 'Actual submitted team not verified';

  return (
    <div className="v3-fpl-workspace">
      <section className="v3-fpl-hero">
        <div>
          <span className="v3-kicker">Gameweek {workspace.gameweek} · {lifecycleLabel(workspace.lifecycle)}</span>
          <h1 className="v3-display">Pick the state. Read the pitch.</h1>
          <p>{stateDescription}</p>
        </div>
        <div className="v3-fpl-hero-status">
          <span className="v3-status" data-tone={actualVerified ? 'positive' : 'neutral'}>{actualVerified ? 'Actual team verified from FPL' : 'Actual team not verified'}</span>
          <span className="v3-status" data-tone={recommendation?.execution_authorized ? 'positive' : 'warning'}>{recommendation?.execution_authorized ? 'Execution authorized' : 'Engine call not execution-authorized'}</span>
        </div>
      </section>

      <section className="v3-lifecycle-strip" aria-label="Gameweek state">
        <div><span>Lifecycle</span><strong>{lifecycleLabel(workspace.lifecycle)}</strong></div>
        <div><span>Actual source</span><strong>{actualVerified ? 'FPL locked picks' : 'Not verified'}</strong></div>
        <div><span>Result snapshot</span><strong>{live.result_snapshot?.observed_at ? formatTimestamp(live.result_snapshot.observed_at) : 'Unavailable'}</strong></div>
        <div><span>Projection snapshot</span><strong>{workspace.decision_snapshot ? `Run #${workspace.decision_snapshot.prediction_run_id}` : 'Unavailable'}</strong></div>
      </section>

      <div className="v3-fpl-controls">
        <div className="v3-state-tabs" role="tablist" aria-label="FPL state">
          <Tab active={stateMode === 'recommendation'} onClick={() => setStateMode('recommendation')}>Engine</Tab>
          <Tab active={stateMode === 'actual'} onClick={() => setStateMode('actual')}>Actual</Tab>
          <Tab active={stateMode === 'live'} onClick={() => setStateMode('live')}>Live</Tab>
        </div>
        <div className="v3-view-toggle" aria-label="Squad view">
          <button className={viewMode === 'pitch' ? 'is-active' : ''} type="button" onClick={() => setViewMode('pitch')}>Pitch</button>
          <button className={viewMode === 'list' ? 'is-active' : ''} type="button" onClick={() => setViewMode('list')}>List</button>
        </div>
      </div>

      <section className="v3-surface v3-squad-stage" aria-labelledby="v3-state-title">
        <div className="v3-squad-stage-head">
          <div><span className="v3-kicker">{stateMode === 'live' ? 'Actual submitted squad · realized FPL evidence' : 'Selection'}</span><h2 id="v3-state-title">{stateTitle}</h2></div>
          {stateMode === 'recommendation' && recommendation ? <span className="v3-authorization" data-authorized={recommendation.execution_authorized}>{recommendation.authorization_label.replaceAll('_', ' ')}</span> : null}
        </div>

        {isActualLane && !actualVerified ? (
          <div className="v3-actual-unverified" role="status"><span className="v3-unverified-icon" aria-hidden="true">?</span><div><span className="v3-kicker">Truth boundary</span><h3>Actual submitted team not verified</h3><p>The engine recommendation is intentionally not substituted into Actual or Live.</p></div></div>
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

      <section className="v3-provenance-note">
        <div><span>State separation</span><strong>Engine ≠ Actual ≠ Live result</strong></div>
        <p>Actual is pulled only after FPL lock. Live uses only that verified submitted squad. Frozen xPts remain decision-time evidence and are never relabelled as live probabilities.</p>
      </section>

      <PlayerIntelligenceModal open={selectedPlayerId != null} onClose={() => setSelectedPlayerId(null)} playerId={selectedPlayerId} workspace={workspace} live={live} />
    </div>
  );
}

function EngineSummary({ workspace }: { workspace: FplWorkspaceApi }) {
  const recommendation = workspace.recommendation;
  if (!recommendation) return null;
  return <section className="v3-recommendation-grid" aria-label="Engine recommendation details">
    <article className="v3-surface v3-summary-card"><span className="v3-kicker">Recommended action</span><h3>{recommendation.transfers.length ? `${recommendation.transfers.length} transfers` : 'ROLL / no transfer'}</h3><div className="v3-transfer-list">{recommendation.transfers.length ? recommendation.transfers.map((transfer, index) => <div key={index}><span>{readString(transfer.out_name) ?? `Player ${readNumber(transfer.out_player_id) ?? '—'}`}</span><b aria-hidden="true">→</b><strong>{readString(transfer.in_name) ?? `Player ${readNumber(transfer.in_player_id) ?? '—'}`}</strong></div>) : <p>No transfer attached.</p>}</div></article>
    <article className="v3-surface v3-summary-card"><span className="v3-kicker">Engine post-action state</span><div className="v3-number-grid"><Summary label="FT" value={recommendation.manager_economy?.free_transfers == null ? '—' : String(recommendation.manager_economy.free_transfers)} /><Summary label="Bank" value={recommendation.manager_economy?.bank_tenths == null ? '—' : `£${(recommendation.manager_economy.bank_tenths / 10).toFixed(1)}m`} /><Summary label="Chip" value={recommendation.chip && recommendation.chip !== 'NONE' ? recommendation.chip : 'None'} /><Summary label="Publication" value={`#${recommendation.publication_id}`} /></div></article>
  </section>;
}

function LiveTruthStrip({ live }: { live: ActualLiveApi }) {
  const final = live.player_actuals.filter((item) => item.status === 'FINAL').length;
  const provisional = live.player_actuals.filter((item) => item.status === 'LIVE' || item.status === 'PARTIAL').length;
  const pending = live.player_actuals.filter((item) => item.status === 'PENDING').length;
  return <section className="v3-surface v3-live-truth-strip" aria-label="Actual squad result state"><div><span>Final player fixtures</span><strong>{final}</strong></div><div><span>Live / partial</span><strong>{provisional}</strong></div><div><span>Pending</span><strong>{pending}</strong></div><p>Points shown are raw player FPL points. Captain multipliers and automatic substitutions are not applied in this audit view.</p></section>;
}

function FixtureRail({ workspace }: { workspace: FplWorkspaceApi }) {
  const fixtures = [...workspace.realized.fixtures].sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
  return <section className="v3-fixture-section" aria-labelledby="fixture-state-heading"><div className="v3-section-heading"><div><span className="v3-kicker">Gameweek pulse</span><h2 id="fixture-state-heading">Future, live and finished are different states.</h2></div><small>Open Matches for model calls and matchup intelligence.</small></div><div className="v3-fixture-rail">{fixtures.map((fixture) => <article className="v3-fixture-card" data-phase={fixture.phase} key={fixture.match_id}><div className="v3-fixture-card-top"><span>{fixture.phase === 'FUTURE' ? 'Upcoming' : fixture.phase === 'LIVE' ? 'Live' : 'Finished'}</span><time>{formatKickoff(fixture.kickoff_at)}</time></div><strong>{fixture.home_team ?? 'Home'} <b>{fixture.phase === 'FUTURE' ? 'vs' : `${fixture.home_score ?? '–'} : ${fixture.away_score ?? '–'}`}</b> {fixture.away_team ?? 'Away'}</strong></article>)}</div></section>;
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

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button className={active ? 'is-active' : ''} type="button" role="tab" aria-selected={active} onClick={onClick}>{children}</button>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function readString(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value : null; }
function readNumber(value: unknown): number | null { const n = Number(value); return Number.isFinite(n) ? n : null; }
function lifecycleLabel(value: string): string { return value === 'PRE_DEADLINE' ? 'Pre-deadline' : value === 'POST_DEADLINE_ACTIVE' ? 'Live Gameweek' : value === 'GW_COMPLETE' ? 'Gameweek complete' : 'State unavailable'; }
function formatTimestamp(value: string): string { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatKickoff(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

function WorkspaceSkeleton() {
  return <div className="v3-fpl-workspace" aria-busy="true" aria-label="Loading FPL workspace"><section className="v3-fpl-hero"><div><span className="v3-kicker">FPL workspace</span><h1 className="v3-display">Loading submitted-team truth…</h1></div></section><div className="v3-surface v3-skeleton-panel" /></div>;
}
