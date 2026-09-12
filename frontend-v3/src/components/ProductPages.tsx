import { useEffect, useMemo, useState } from 'react';
import {
  fetchFplWorkspace,
  type FplWorkspaceApi,
  type PlayerEvidence,
  type WorkspaceFixture,
} from '../api/fplWorkspace';

export type ProductView = 'home' | 'fpl' | 'matches' | 'insights' | 'history';

type Navigate = (view: ProductView) => void;

type WorkspaceLoad = {
  data: FplWorkspaceApi | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

function useWorkspace(gameweek = 0): WorkspaceLoad {
  const [data, setData] = useState<FplWorkspaceApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetchFplWorkspace(gameweek, controller.signal)
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

export function HomePage({ onNavigate }: { onNavigate: Navigate }) {
  const state = useWorkspace();
  if (state.loading) return <PageSkeleton label="Loading command center" />;
  if (state.error || !state.data) return <ErrorState title="Command center unavailable" message={state.error} retry={state.reload} />;

  const workspace = state.data;
  const recommendation = workspace.recommendation;
  const fixtures = [...workspace.realized.fixtures].sort(sortFixture);
  const finished = fixtures.filter((fixture) => fixture.phase === 'FINISHED').length;
  const live = fixtures.filter((fixture) => fixture.phase === 'LIVE').length;
  const next = fixtures.find((fixture) => fixture.phase === 'FUTURE') ?? null;
  const captain = findPlayerName(workspace, recommendation?.captain_player_id ?? null);
  const topUpside = topEvidence(workspace, 'p_10_plus', 3);

  return (
    <div className="v3-product-page" data-page="home">
      <PageHero
        kicker={`Gameweek ${workspace.gameweek} · ${lifecycleLabel(workspace.lifecycle)}`}
        title="Football intelligence, distilled to what matters now."
        copy="The current recommendation, match state and decision-time signals in one consumer view. Nothing here infers an unverified manager action."
        status={recommendation?.execution_authorized ? 'Execution authorized' : 'Decision intelligence only'}
        tone={recommendation?.execution_authorized ? 'positive' : 'warning'}
      />

      <section className="v3-command-grid" aria-label="Current football intelligence">
        <article className="v3-surface v3-command-card v3-command-card--primary">
          <span className="v3-kicker">Engine call</span>
          <h2>{recommendation ? actionLabel(recommendation.transfers.length) : 'No current recommendation'}</h2>
          <p>{recommendation ? recommendationDescription(workspace) : 'The serving contract has not returned a recommendation for this Gameweek.'}</p>
          <div className="v3-inline-actions">
            <button type="button" className="v3-button v3-button--primary" onClick={() => onNavigate('fpl')}>Open FPL pitch</button>
            <button type="button" className="v3-button" onClick={() => onNavigate('insights')}>See the evidence</button>
          </div>
        </article>

        <article className="v3-surface v3-command-card">
          <span className="v3-kicker">Captaincy</span>
          <strong className="v3-command-value">{captain ?? '—'}</strong>
          <p>{recommendation ? `Publication #${recommendation.publication_id} · ${recommendation.authorization_label.replaceAll('_', ' ').toLowerCase()}` : 'No captain attached.'}</p>
        </article>

        <article className="v3-surface v3-command-card">
          <span className="v3-kicker">Gameweek pulse</span>
          <strong className="v3-command-value">{finished}/{fixtures.length}</strong>
          <p>{live > 0 ? `${live} fixture${live === 1 ? '' : 's'} live now.` : next ? `Next: ${next.home_team ?? 'Home'} vs ${next.away_team ?? 'Away'}.` : 'No future fixture in the current snapshot.'}</p>
          <button type="button" className="v3-text-action" onClick={() => onNavigate('matches')}>Open Matches →</button>
        </article>

        <article className="v3-surface v3-command-card">
          <span className="v3-kicker">Actual submission</span>
          <strong className="v3-command-value">{workspace.actual.verification_status === 'VERIFIED' ? 'Verified' : 'Not verified'}</strong>
          <p>{workspace.actual.verification_status === 'VERIFIED' ? 'Submitted manager state is independently verified.' : 'The recommendation is not substituted for the actual submitted team.'}</p>
        </article>
      </section>

      <section className="v3-product-section" aria-labelledby="home-upside-heading">
        <SectionHeading kicker="Decision-time upside" title="The highest P10+ signals inside the recommended squad." id="home-upside-heading" />
        <div className="v3-insight-grid">
          {topUpside.map(({ player, evidence }) => (
            <PlayerSignalCard key={player.player_id} name={player.name} team={player.team_short ?? player.team ?? '—'} evidence={evidence} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function MatchesPage() {
  const state = useWorkspace();
  const [filter, setFilter] = useState<'ALL' | 'FUTURE' | 'LIVE' | 'FINISHED'>('ALL');
  if (state.loading) return <PageSkeleton label="Loading matches" />;
  if (state.error || !state.data) return <ErrorState title="Matches unavailable" message={state.error} retry={state.reload} />;

  const workspace = state.data;
  const fixtures = [...workspace.realized.fixtures].sort(sortFixture);
  const filtered = filter === 'ALL' ? fixtures : fixtures.filter((fixture) => fixture.phase === filter);
  const counts = {
    FUTURE: fixtures.filter((fixture) => fixture.phase === 'FUTURE').length,
    LIVE: fixtures.filter((fixture) => fixture.phase === 'LIVE').length,
    FINISHED: fixtures.filter((fixture) => fixture.phase === 'FINISHED').length,
  };

  return (
    <div className="v3-product-page" data-page="matches">
      <PageHero
        kicker={`Gameweek ${workspace.gameweek} · Match center`}
        title="Every fixture in its real state."
        copy="Upcoming, live and finished matches are kept separate. Once a match starts, frozen pre-match evidence is never presented as a live forecast."
        status={`${counts.FINISHED} finished · ${counts.LIVE} live · ${counts.FUTURE} upcoming`}
        tone={counts.LIVE > 0 ? 'positive' : 'neutral'}
      />

      <div className="v3-filter-tabs" role="tablist" aria-label="Fixture state filter">
        {(['ALL', 'FUTURE', 'LIVE', 'FINISHED'] as const).map((item) => (
          <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>
            {item === 'ALL' ? `All ${fixtures.length}` : item === 'FUTURE' ? `Upcoming ${counts.FUTURE}` : item === 'LIVE' ? `Live ${counts.LIVE}` : `Finished ${counts.FINISHED}`}
          </button>
        ))}
      </div>

      <section className="v3-match-grid" aria-label="Gameweek fixtures">
        {filtered.map((fixture) => {
          const exposure = recommendedPlayersForFixture(workspace, fixture);
          return (
            <article className="v3-surface v3-match-card" data-phase={fixture.phase} key={fixture.match_id}>
              <div className="v3-match-card-top">
                <span className="v3-phase-pill" data-phase={fixture.phase}>{phaseLabel(fixture.phase)}</span>
                <time>{formatKickoff(fixture.kickoff_at)}</time>
              </div>
              <div className="v3-scoreline">
                <span>{fixture.home_team ?? 'Home'}</span>
                <strong>{fixture.phase === 'FUTURE' ? 'vs' : `${fixture.home_score ?? '–'} : ${fixture.away_score ?? '–'}`}</strong>
                <span>{fixture.away_team ?? 'Away'}</span>
              </div>
              <div className="v3-match-context">
                <span>Recommendation exposure</span>
                <strong>{exposure.length ? exposure.join(' · ') : 'None in current XI'}</strong>
              </div>
              <p>{fixture.phase === 'FUTURE' ? 'Future fixture: pre-match decision evidence remains actionable.' : fixture.phase === 'LIVE' ? 'Match has started. Any model probability belongs to the frozen pre-match snapshot.' : 'Finished result. This is realized evidence, not a forecast.'}</p>
            </article>
          );
        })}
      </section>

      {filtered.length === 0 ? <EmptyState title="No fixtures in this state." copy="The filter is empty; missing fixtures are not treated as zero-probability matches." /> : null}
    </div>
  );
}

export function InsightsPage() {
  const state = useWorkspace();
  if (state.loading) return <PageSkeleton label="Loading decision intelligence" />;
  if (state.error || !state.data) return <ErrorState title="Insights unavailable" message={state.error} retry={state.reload} />;

  const workspace = state.data;
  const recommendation = workspace.recommendation;
  const upside = topEvidence(workspace, 'p_10_plus', 5);
  const reliable = topEvidence(workspace, 'p_start', 5);
  const captainId = recommendation?.captain_player_id ?? null;
  const captainEvidence = workspace.decision_snapshot?.player_evidence.find((row) => row.player_id === captainId) ?? null;
  const captainName = findPlayerName(workspace, captainId);

  return (
    <div className="v3-product-page" data-page="insights">
      <PageHero
        kicker={`Gameweek ${workspace.gameweek} · Frozen run #${workspace.decision_snapshot?.prediction_run_id ?? '—'}`}
        title="Decision intelligence without pretending noise is certainty."
        copy="These signals are frozen to the decision-time projection run. They explain the recommendation; they are not relabelled as live probabilities after kickoff."
        status={workspace.decision_snapshot ? `Evidence ${formatTimestamp(workspace.decision_snapshot.generated_at)}` : 'Decision snapshot unavailable'}
        tone="intelligence"
      />

      <section className="v3-intelligence-hero">
        <article className="v3-surface v3-captain-insight">
          <span className="v3-kicker">Captain signal</span>
          <h2>{captainName ?? 'No captain attached'}</h2>
          <div className="v3-number-grid v3-number-grid--three">
            <Metric label="xPts" value={formatNumber(captured(captainEvidence, 'expected_points'), 1)} />
            <Metric label="P10+" value={formatPercent(captured(captainEvidence, 'p_10_plus'))} />
            <Metric label="xMin" value={formatNumber(captured(captainEvidence, 'expected_minutes'), 0)} />
          </div>
          <p>{recommendation?.execution_authorized ? 'This recommendation is explicitly execution-authorized.' : 'Publication maturity does not create execution authority. The current recommendation remains decision intelligence only.'}</p>
        </article>

        <article className="v3-surface v3-truth-card">
          <span className="v3-kicker">Truth boundary</span>
          <h3>{workspace.actual.verification_status === 'VERIFIED' ? 'Actual submission verified' : 'Actual submission not verified'}</h3>
          <p>{workspace.actual.verification_status === 'VERIFIED' ? 'The submitted team can be compared independently with the engine recommendation.' : 'No actual team is inferred from the recommendation, even after the deadline.'}</p>
          <div className="v3-truth-row"><span>Historical rewrite</span><strong>{workspace.semantics.historical_forecasts_rewritten ? 'Detected' : 'None'}</strong></div>
          <div className="v3-truth-row"><span>Decision price/ownership</span><strong>{workspace.decision_snapshot?.price_ownership_evidence.status === 'CAPTURED' ? 'Captured' : 'Not captured'}</strong></div>
        </article>
      </section>

      <section className="v3-product-section" aria-labelledby="upside-heading">
        <SectionHeading kicker="Ceiling" title="Highest P10+ inside the recommended squad" id="upside-heading" />
        <div className="v3-signal-table" role="table" aria-label="Highest P10 plus players">
          {upside.map(({ player, evidence }, index) => <SignalRow key={player.player_id} rank={index + 1} player={player.name} team={player.team_short ?? player.team ?? '—'} primary={formatPercent(captured(evidence, 'p_10_plus'))} secondary={`${formatNumber(captured(evidence, 'expected_points'), 1)} xPts`} />)}
        </div>
      </section>

      <section className="v3-product-section" aria-labelledby="minutes-heading">
        <SectionHeading kicker="Expected minutes gate" title="Most secure starting signals inside the recommendation" id="minutes-heading" />
        <div className="v3-signal-table" role="table" aria-label="Highest start probability players">
          {reliable.map(({ player, evidence }, index) => <SignalRow key={player.player_id} rank={index + 1} player={player.name} team={player.team_short ?? player.team ?? '—'} primary={formatPercent(captured(evidence, 'p_start'))} secondary={`${formatNumber(captured(evidence, 'expected_minutes'), 0)} xMin`} />)}
        </div>
      </section>
    </div>
  );
}

export function HistoryPage() {
  const current = useWorkspace();
  const currentGameweek = current.data?.gameweek ?? 0;
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const resolvedGameweek = selectedGameweek ?? currentGameweek;
  const historical = useWorkspace(resolvedGameweek > 0 ? resolvedGameweek : 0);

  useEffect(() => {
    if (selectedGameweek == null && currentGameweek > 0) setSelectedGameweek(currentGameweek);
  }, [currentGameweek, selectedGameweek]);

  if (current.loading || resolvedGameweek === 0) return <PageSkeleton label="Loading history" />;
  if (current.error) return <ErrorState title="History unavailable" message={current.error} retry={current.reload} />;
  if (historical.loading) return <PageSkeleton label={`Loading Gameweek ${resolvedGameweek}`} />;
  if (historical.error || !historical.data) return <ErrorState title={`Gameweek ${resolvedGameweek} unavailable`} message={historical.error} retry={historical.reload} />;

  const workspace = historical.data;
  const recommendation = workspace.recommendation;
  const starterIds = recommendation?.starting_xi ?? [];
  const rows = starterIds.map((id) => {
    const player = workspace.players.find((item) => item.player_id === id);
    const evidence = workspace.decision_snapshot?.player_evidence.find((item) => item.player_id === id);
    const actual = workspace.realized.player_actuals.find((item) => item.player_id === id);
    return { id, name: player?.name ?? `Player ${id}`, evidence, actual };
  });
  const projected = rows.reduce((sum, row) => sum + (captured(row.evidence, 'expected_points') ?? 0), 0);
  const realizedKnown = rows.filter((row) => row.actual?.status === 'FINAL' && typeof row.actual.total_points === 'number');
  const realized = realizedKnown.reduce((sum, row) => sum + (row.actual?.total_points ?? 0), 0);

  return (
    <div className="v3-product-page" data-page="history">
      <PageHero
        kicker="Decision journal"
        title="Judge the decision from the evidence that existed then."
        copy="Historical recommendations stay frozen. Realized results sit beside them; they never rewrite the original forecast or manufacture an actual submitted team."
        status={`Gameweek ${workspace.gameweek} · ${lifecycleLabel(workspace.lifecycle)}`}
        tone="neutral"
      />

      <div className="v3-history-gw" aria-label="Select Gameweek">
        {Array.from({ length: currentGameweek }, (_, index) => index + 1).map((gw) => (
          <button key={gw} type="button" className={gw === resolvedGameweek ? 'is-active' : ''} onClick={() => setSelectedGameweek(gw)}>GW{gw}</button>
        ))}
      </div>

      <section className="v3-history-summary">
        <article className="v3-surface"><span>Publication</span><strong>{recommendation ? `#${recommendation.publication_id}` : '—'}</strong><small>{recommendation?.publication_status ?? 'No recommendation'}</small></article>
        <article className="v3-surface"><span>XI projected</span><strong>{starterIds.length ? projected.toFixed(1) : '—'}</strong><small>Frozen xPts, no hindsight update</small></article>
        <article className="v3-surface"><span>XI realized</span><strong>{realizedKnown.length ? realized.toFixed(0) : '—'}</strong><small>{realizedKnown.length}/{starterIds.length} final player outcomes</small></article>
        <article className="v3-surface"><span>Actual submission</span><strong>{workspace.actual.verification_status === 'VERIFIED' ? 'Verified' : 'Not verified'}</strong><small>Never inferred from recommendation</small></article>
      </section>

      <section className="v3-surface v3-history-table" aria-labelledby="history-xi-heading">
        <div className="v3-history-table-head">
          <div><span className="v3-kicker">Frozen XI audit</span><h2 id="history-xi-heading">Projection vs realized</h2></div>
          <small>Realized points appear only when final fixture evidence exists.</small>
        </div>
        <div className="v3-history-rows">
          {rows.map((row) => (
            <div className="v3-history-row" key={row.id}>
              <strong>{row.name}</strong>
              <span>{formatNumber(captured(row.evidence, 'expected_points'), 1)} xPts</span>
              <span>{row.actual?.status === 'FINAL' && typeof row.actual.total_points === 'number' ? `${row.actual.total_points} pts` : 'Pending'}</span>
            </div>
          ))}
        </div>
        {rows.length === 0 ? <EmptyState title="No frozen XI for this Gameweek." copy="History remains blank rather than borrowing a later recommendation." /> : null}
      </section>
    </div>
  );
}

function PageHero({ kicker, title, copy, status, tone }: { kicker: string; title: string; copy: string; status: string; tone: 'positive' | 'warning' | 'neutral' | 'intelligence' }) {
  return (
    <section className="v3-product-hero">
      <div><span className="v3-kicker">{kicker}</span><h1 className="v3-display">{title}</h1><p>{copy}</p></div>
      <span className="v3-status" data-tone={tone === 'positive' ? undefined : tone}>{status}</span>
    </section>
  );
}

function SectionHeading({ kicker, title, id }: { kicker: string; title: string; id: string }) {
  return <div className="v3-section-heading"><div><span className="v3-kicker">{kicker}</span><h2 id={id}>{title}</h2></div></div>;
}

function PlayerSignalCard({ name, team, evidence }: { name: string; team: string; evidence: PlayerEvidence }) {
  return <article className="v3-surface v3-player-signal"><span>{team}</span><h3>{name}</h3><div><strong>{formatPercent(captured(evidence, 'p_10_plus'))}</strong><small>P10+</small></div><p>{formatNumber(captured(evidence, 'expected_points'), 1)} xPts · {formatNumber(captured(evidence, 'expected_minutes'), 0)} xMin</p></article>;
}

function SignalRow({ rank, player, team, primary, secondary }: { rank: number; player: string; team: string; primary: string; secondary: string }) {
  return <div className="v3-signal-row" role="row"><b>{rank}</b><div><strong>{player}</strong><small>{team}</small></div><span>{secondary}</span><strong>{primary}</strong></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function ErrorState({ title, message, retry }: { title: string; message: string | null; retry: () => void }) {
  return <section className="v3-surface v3-page-state" aria-live="polite"><span className="v3-kicker">Fail closed</span><h1>{title}</h1><p>{message ?? 'The authoritative V3 contract could not be resolved.'}</p><button type="button" className="v3-button v3-button--primary" onClick={retry}>Retry</button></section>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="v3-empty-state"><strong>{title}</strong><span>{copy}</span></div>;
}

function PageSkeleton({ label }: { label: string }) {
  return <div className="v3-page-skeleton" aria-busy="true" aria-label={label}><div /><div /><div className="is-large" /></div>;
}

function recommendedPlayersForFixture(workspace: FplWorkspaceApi, fixture: WorkspaceFixture): string[] {
  const xi = new Set(workspace.recommendation?.starting_xi ?? []);
  return workspace.players
    .filter((player) => xi.has(player.player_id) && player.fixtures.some((item) => item.match_id === fixture.match_id))
    .map((player) => player.name);
}

function topEvidence(workspace: FplWorkspaceApi, key: keyof Pick<PlayerEvidence, 'p_10_plus' | 'p_start'>, limit: number) {
  const recommendationIds = new Set(workspace.recommendation?.squad.map((player) => player.player_id) ?? []);
  return (workspace.decision_snapshot?.player_evidence ?? [])
    .filter((evidence) => recommendationIds.has(evidence.player_id) && evidence.status === 'CAPTURED' && typeof evidence[key] === 'number')
    .map((evidence) => ({ evidence, player: workspace.players.find((player) => player.player_id === evidence.player_id) }))
    .filter((row): row is { evidence: PlayerEvidence; player: NonNullable<typeof row.player> } => Boolean(row.player))
    .sort((a, b) => (Number(b.evidence[key]) || 0) - (Number(a.evidence[key]) || 0))
    .slice(0, limit);
}

function captured(evidence: PlayerEvidence | null | undefined, key: keyof PlayerEvidence): number | null {
  if (!evidence || evidence.status !== 'CAPTURED') return null;
  const value = evidence[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function findPlayerName(workspace: FplWorkspaceApi, playerId: number | null): string | null {
  if (playerId == null) return null;
  return workspace.recommendation?.squad.find((player) => player.player_id === playerId)?.name
    ?? workspace.players.find((player) => player.player_id === playerId)?.name
    ?? null;
}

function recommendationDescription(workspace: FplWorkspaceApi): string {
  const recommendation = workspace.recommendation;
  if (!recommendation) return 'No current recommendation.';
  const captain = findPlayerName(workspace, recommendation.captain_player_id) ?? 'captain unavailable';
  const action = recommendation.transfers.length === 0 ? 'ROLL' : `${recommendation.transfers.length} transfer${recommendation.transfers.length === 1 ? '' : 's'}`;
  return `${action} · captain ${captain} · ${recommendation.execution_authorized ? 'execution authorized' : 'not execution-authorized'}.`;
}

function actionLabel(transferCount: number): string {
  return transferCount === 0 ? 'ROLL / no transfer' : `${transferCount} recommended transfer${transferCount === 1 ? '' : 's'}`;
}

function sortFixture(a: WorkspaceFixture, b: WorkspaceFixture): number {
  return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
}

function phaseLabel(phase: WorkspaceFixture['phase']): string {
  return phase === 'FUTURE' ? 'Upcoming' : phase === 'LIVE' ? 'Live' : 'Finished';
}

function lifecycleLabel(value: FplWorkspaceApi['lifecycle']): string {
  return value === 'PRE_DEADLINE' ? 'Pre-deadline' : value === 'POST_DEADLINE_ACTIVE' ? 'Post-deadline active' : value === 'GW_COMPLETE' ? 'Gameweek complete' : 'Lifecycle unknown';
}

function formatKickoff(value: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatPercent(value: number | null): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`;
}

function formatNumber(value: number | null, digits: number): string {
  return value == null ? '—' : value.toFixed(digits);
}
