import { useEffect, useMemo, useState } from 'react';
import {
  fetchFplWorkspace,
  type FplWorkspaceApi,
  type PlayerEvidence,
  type WorkspaceFixturePhase,
  type WorkspacePlayer,
} from '../api/fplWorkspace';
import {
  BenchStrip,
  FplPitch,
  SquadList,
  type PitchMetricMode,
  type PitchPlayer,
} from './FplPitch';

type StateMode = 'recommendation' | 'actual' | 'live';
type ViewMode = 'pitch' | 'list';

export function FplWorkspace() {
  const [workspace, setWorkspace] = useState<FplWorkspaceApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stateMode, setStateMode] = useState<StateMode>('recommendation');
  const [viewMode, setViewMode] = useState<ViewMode>('pitch');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetchFplWorkspace(0, controller.signal)
      .then((data) => {
        setWorkspace(data);
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
  if (error || !workspace) {
    return (
      <section className="v3-surface v3-workspace-error" aria-live="polite">
        <span className="v3-kicker">V3 semantic gate</span>
        <h1>FPL workspace is unavailable.</h1>
        <p>{error ?? 'The V3 state contract could not be resolved.'}</p>
        <p>The interface will not reconstruct a team from ambiguous fallback state.</p>
      </section>
    );
  }

  return (
    <WorkspaceContent
      workspace={workspace}
      stateMode={stateMode}
      setStateMode={setStateMode}
      viewMode={viewMode}
      setViewMode={setViewMode}
    />
  );
}

function WorkspaceContent({
  workspace,
  stateMode,
  setStateMode,
  viewMode,
  setViewMode,
}: {
  workspace: FplWorkspaceApi;
  stateMode: StateMode;
  setStateMode: (value: StateMode) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
}) {
  const recommendation = workspace.recommendation;
  const actualVerified = workspace.actual.verification_status === 'VERIFIED';
  const actualReason = workspace.actual.verification_status === 'NOT_VERIFIED'
    ? workspace.actual.reason
    : null;

  const resolved = useMemo(() => {
    if (stateMode === 'actual' && workspace.actual.verification_status === 'VERIFIED') {
      return {
        starters: resolvePitchPlayers(
          workspace.actual.starting_xi,
          workspace,
          workspace.actual.captain_player_id,
          workspace.actual.vice_player_id,
        ),
        bench: resolvePitchPlayers(
          workspace.actual.bench_order,
          workspace,
          workspace.actual.captain_player_id,
          workspace.actual.vice_player_id,
        ),
      };
    }

    if (!recommendation) return { starters: [], bench: [] };
    return {
      starters: resolvePitchPlayers(
        recommendation.starting_xi,
        workspace,
        recommendation.captain_player_id,
        recommendation.vice_player_id,
      ),
      bench: resolvePitchPlayers(
        recommendation.bench_order,
        workspace,
        recommendation.captain_player_id,
        recommendation.vice_player_id,
      ),
    };
  }, [recommendation, stateMode, workspace]);

  const metricMode: PitchMetricMode = stateMode === 'live' ? 'realized' : 'projection';
  const stateTitle = stateMode === 'recommendation'
    ? 'Engine recommendation'
    : stateMode === 'actual'
      ? 'Actual submitted team'
      : 'Live audit';
  const stateDescription = stateMode === 'recommendation'
    ? recommendationDescription(recommendation)
    : stateMode === 'actual'
      ? actualVerified
        ? 'Verified submitted selection. It remains separate from the engine recommendation.'
        : actualReason ?? 'Actual submitted team not verified'
      : actualVerified
        ? 'Live and finished outcomes compared with the verified submitted selection.'
        : 'Live and finished outcomes overlaid on the frozen engine recommendation. This is not presented as the submitted team.';

  return (
    <div className="v3-fpl-workspace">
      <section className="v3-fpl-hero">
        <div>
          <span className="v3-kicker">Gameweek {workspace.gameweek} · {lifecycleLabel(workspace.lifecycle)}</span>
          <h1 className="v3-display">Pick the state. Read the pitch.</h1>
          <p>{stateDescription}</p>
        </div>
        <div className="v3-fpl-hero-status">
          <StatusPill
            label={recommendation?.execution_authorized ? 'Execution authorized' : 'Not execution-authorized'}
            tone={recommendation?.execution_authorized ? 'positive' : 'warning'}
          />
          <StatusPill
            label={actualVerified ? 'Actual team verified' : 'Actual team not verified'}
            tone={actualVerified ? 'positive' : 'neutral'}
          />
        </div>
      </section>

      <section className="v3-lifecycle-strip" aria-label="Gameweek state">
        <div>
          <span>Lifecycle</span>
          <strong>{lifecycleLabel(workspace.lifecycle)}</strong>
        </div>
        <div>
          <span>Decision snapshot</span>
          <strong>{workspace.decision_snapshot ? `Run #${workspace.decision_snapshot.prediction_run_id}` : 'Unavailable'}</strong>
        </div>
        <div>
          <span>Evidence time</span>
          <strong>{workspace.decision_snapshot ? formatTimestamp(workspace.decision_snapshot.generated_at) : 'Unavailable'}</strong>
        </div>
        <div>
          <span>Actual submission</span>
          <strong>{actualVerified ? 'Verified' : 'Not verified'}</strong>
        </div>
      </section>

      <div className="v3-fpl-controls">
        <div className="v3-state-tabs" role="tablist" aria-label="FPL state">
          <StateTab active={stateMode === 'recommendation'} onClick={() => setStateMode('recommendation')}>
            Engine
          </StateTab>
          <StateTab active={stateMode === 'actual'} onClick={() => setStateMode('actual')}>
            Actual
          </StateTab>
          <StateTab active={stateMode === 'live'} onClick={() => setStateMode('live')}>
            Live
          </StateTab>
        </div>
        <div className="v3-view-toggle" aria-label="Squad view">
          <button className={viewMode === 'pitch' ? 'is-active' : ''} type="button" onClick={() => setViewMode('pitch')}>
            Pitch
          </button>
          <button className={viewMode === 'list' ? 'is-active' : ''} type="button" onClick={() => setViewMode('list')}>
            List
          </button>
        </div>
      </div>

      <section className="v3-surface v3-squad-stage" aria-labelledby="v3-state-title">
        <div className="v3-squad-stage-head">
          <div>
            <span className="v3-kicker">{stateMode === 'live' ? 'Frozen recommendation vs realized' : 'Selection'}</span>
            <h2 id="v3-state-title">{stateTitle}</h2>
          </div>
          {recommendation ? <AuthorizationBadge recommendation={recommendation} /> : null}
        </div>

        {stateMode === 'actual' && !actualVerified ? (
          <ActualUnverified reason={actualReason ?? 'Actual submitted team not verified'} />
        ) : resolved.starters.length === 0 ? (
          <div className="v3-empty-state">
            <strong>No complete selection is available for this state.</strong>
            <span>V3 will not infer missing players from another state lane.</span>
          </div>
        ) : viewMode === 'pitch' ? (
          <>
            <FplPitch players={resolved.starters} metricMode={metricMode} />
            <BenchStrip players={resolved.bench} metricMode={metricMode} />
          </>
        ) : (
          <SquadList starters={resolved.starters} bench={resolved.bench} metricMode={metricMode} />
        )}
      </section>

      {stateMode !== 'actual' && recommendation ? (
        <RecommendationSummary workspace={workspace} />
      ) : null}

      <FixtureRail workspace={workspace} />

      <section className="v3-provenance-note">
        <div>
          <span>Projection evidence</span>
          <strong>Frozen to run #{workspace.decision_snapshot?.prediction_run_id ?? '—'}</strong>
        </div>
        <p>
          xPts, xMin and haul probabilities shown on player cards are decision-time evidence.
          {workspace.decision_snapshot?.price_ownership_evidence.status === 'NOT_CAPTURED'
            ? ' Decision-time price/ownership was not captured and is not backfilled with current values.'
            : ' Decision-time price/ownership has its own captured timestamp.'}
        </p>
      </section>
    </div>
  );
}

function RecommendationSummary({ workspace }: { workspace: FplWorkspaceApi }) {
  const recommendation = workspace.recommendation;
  if (!recommendation) return null;

  return (
    <section className="v3-recommendation-grid" aria-label="Recommendation details">
      <article className="v3-surface v3-summary-card">
        <span className="v3-kicker">Recommended action</span>
        <h3>{recommendation.transfers.length === 0 ? 'ROLL / no transfer' : `${recommendation.transfers.length} transfers`}</h3>
        <div className="v3-transfer-list">
          {recommendation.transfers.length === 0 ? (
            <p>No transfer is attached to this recommendation.</p>
          ) : recommendation.transfers.map((transfer, index) => (
            <div key={`${readNumber(transfer.out_player_id) ?? index}-${readNumber(transfer.in_player_id) ?? index}`}>
              <span>{readString(transfer.out_name) ?? `Player ${readNumber(transfer.out_player_id) ?? '—'}`}</span>
              <b aria-hidden="true">→</b>
              <strong>{readString(transfer.in_name) ?? `Player ${readNumber(transfer.in_player_id) ?? '—'}`}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="v3-surface v3-summary-card">
        <span className="v3-kicker">Post-action state</span>
        <div className="v3-number-grid">
          <SummaryMetric
            label="Free transfers"
            value={recommendation.manager_economy?.free_transfers == null ? '—' : String(recommendation.manager_economy.free_transfers)}
          />
          <SummaryMetric
            label="Bank"
            value={recommendation.manager_economy?.bank_tenths == null ? '—' : `£${(recommendation.manager_economy.bank_tenths / 10).toFixed(1)}m`}
          />
          <SummaryMetric label="Chip" value={recommendation.chip && recommendation.chip !== 'NONE' ? recommendation.chip : 'None'} />
          <SummaryMetric label="Publication" value={`#${recommendation.publication_id}`} />
        </div>
        <small>FT and bank are from the recommendation’s own post-action path, never the pre-transfer manager snapshot.</small>
      </article>
    </section>
  );
}

function FixtureRail({ workspace }: { workspace: FplWorkspaceApi }) {
  const fixtures = [...workspace.realized.fixtures].sort(
    (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
  );

  return (
    <section className="v3-fixture-section" aria-labelledby="fixture-state-heading">
      <div className="v3-section-heading">
        <div>
          <span className="v3-kicker">Gameweek pulse</span>
          <h2 id="fixture-state-heading">Future, live and finished are different states.</h2>
        </div>
        <small>Started fixtures are never labelled “Next”.</small>
      </div>
      <div className="v3-fixture-rail">
        {fixtures.map((fixture) => (
          <article className="v3-fixture-card" data-phase={fixture.phase} key={fixture.match_id}>
            <div className="v3-fixture-card-top">
              <span>{fixture.phase === 'FUTURE' ? 'Upcoming' : fixture.phase === 'LIVE' ? 'Live' : 'Finished'}</span>
              <time>{formatKickoff(fixture.kickoff_at)}</time>
            </div>
            <strong>{fixture.home_team ?? 'Home'} <b>{scoreText(fixture.home_score, fixture.away_score, fixture.phase)}</b> {fixture.away_team ?? 'Away'}</strong>
            <small>
              {fixture.phase === 'FUTURE'
                ? 'Pre-match evidence remains actionable.'
                : 'Any model probability is frozen pre-match evidence, not a current forecast.'}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActualUnverified({ reason }: { reason: string }) {
  return (
    <div className="v3-actual-unverified" role="status">
      <span className="v3-unverified-icon" aria-hidden="true">?</span>
      <div>
        <span className="v3-kicker">Truth boundary</span>
        <h3>Actual submitted team not verified</h3>
        <p>{reason}. The engine recommendation is intentionally not substituted here.</p>
      </div>
    </div>
  );
}

function resolvePitchPlayers(
  ids: number[],
  workspace: FplWorkspaceApi,
  captainId: number | null,
  viceId: number | null,
): PitchPlayer[] {
  return ids.map((id) => {
    const metadata = workspace.players.find((player) => player.player_id === id);
    const recommended = workspace.recommendation?.squad.find((player) => player.player_id === id);
    const evidence = workspace.decision_snapshot?.player_evidence.find((row) => row.player_id === id);
    const actual = workspace.realized.player_actuals.find((row) => row.player_id === id);
    const fixtureState = fixtureStateForPlayer(metadata);

    return {
      id,
      name: recommended?.name ?? metadata?.name ?? `Player ${id}`,
      position: recommended?.position ?? metadata?.position ?? 'UNKNOWN',
      teamShort: metadata?.team_short ?? recommended?.team ?? '—',
      fixtureLabel: fixtureState.label,
      fixturePhase: fixtureState.phase,
      expectedPoints: capturedNumber(evidence, 'expected_points'),
      expectedMinutes: capturedNumber(evidence, 'expected_minutes') ?? recommended?.expected_minutes ?? null,
      p10: capturedNumber(evidence, 'p_10_plus'),
      actualPoints: actual?.status === 'FINAL' ? actual.total_points : null,
      actualStatus: actual?.status ?? null,
      captain: id === captainId,
      vice: id === viceId,
    };
  });
}

function fixtureStateForPlayer(player: WorkspacePlayer | undefined): {
  label: string;
  phase: WorkspaceFixturePhase | null;
} {
  if (!player || player.fixtures.length === 0) return { label: 'Fixture unavailable', phase: null };

  const labels = player.fixtures.map((fixture) => `${fixture.opponent_short ?? fixture.opponent ?? 'OPP'} (${fixture.venue})`);
  const phase = player.fixtures.some((fixture) => fixture.phase === 'LIVE')
    ? 'LIVE'
    : player.fixtures.every((fixture) => fixture.phase === 'FINISHED')
      ? 'FINISHED'
      : 'FUTURE';

  return {
    label: labels.join(' · '),
    phase,
  };
}

function capturedNumber(
  evidence: PlayerEvidence | undefined,
  key: keyof Pick<PlayerEvidence, 'expected_points' | 'expected_minutes' | 'p_10_plus'>,
): number | null {
  if (!evidence || evidence.status !== 'CAPTURED') return null;
  const value = evidence[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function StateTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? 'is-active' : ''}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function AuthorizationBadge({ recommendation }: { recommendation: NonNullable<FplWorkspaceApi['recommendation']> }) {
  const authorized = recommendation.execution_authorized;
  return (
    <span className="v3-authorization" data-authorized={authorized ? 'true' : 'false'}>
      {authorized ? 'Authorized final recommendation' : recommendation.publication_status === 'FINAL'
        ? 'Final frozen recommendation · not authorized'
        : 'Provisional recommendation · not authorized'}
    </span>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'positive' | 'warning' | 'neutral' }) {
  return <span className="v3-status" data-tone={tone}>{label}</span>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return <div className="v3-summary-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function recommendationDescription(recommendation: FplWorkspaceApi['recommendation']): string {
  if (!recommendation) return 'No engine recommendation is available for this Gameweek.';
  if (recommendation.execution_authorized) return 'The engine recommendation is final and explicitly execution-authorized.';
  if (recommendation.publication_status === 'FINAL') {
    return 'The engine recommendation is frozen after the deadline, but execution was not authorized.';
  }
  return 'The engine recommendation is still provisional and is not execution-authorized.';
}

function lifecycleLabel(value: FplWorkspaceApi['lifecycle']): string {
  if (value === 'PRE_DEADLINE') return 'Pre-deadline · action mode';
  if (value === 'POST_DEADLINE_ACTIVE') return 'Post-deadline · active';
  if (value === 'GW_COMPLETE') return 'Gameweek complete · audit';
  return 'Lifecycle unavailable';
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatKickoff(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function scoreText(home: number | null, away: number | null, phase: WorkspaceFixturePhase): string {
  if (phase === 'FUTURE') return 'vs';
  if (home == null || away == null) return '–';
  return `${home}–${away}`;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function WorkspaceSkeleton() {
  return (
    <div className="v3-fpl-loading" aria-busy="true" aria-label="Loading V3 FPL workspace">
      <div className="v3-loading-line" />
      <div className="v3-loading-title" />
      <div className="v3-loading-pitch" />
    </div>
  );
}
