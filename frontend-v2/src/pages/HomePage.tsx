import type { AppView } from '../components/layout/AppShell';
import { Button } from '../components/primitives/Button';
import { Surface } from '../components/primitives/Surface';
import {
  chipLabel,
  decisionLabel,
  findPlayer,
  percent,
  planFreshness,
  planNarrative,
  strongestFixtureCall,
  useHomeData,
} from '../lib/home';

export function HomePage({ requestedGameweek, onNavigate }: { requestedGameweek: number; onNavigate: (view: AppView) => void }) {
  const { fpl, managerPlan } = useHomeData(requestedGameweek);
  const fplData = fpl.data;
  const plan = managerPlan.data?.plan;
  const gameweek = managerPlan.data?.gameweek ?? fplData?.gameweek ?? (requestedGameweek || null);

  if (fpl.isPending && managerPlan.isPending) return <CommandSkeleton />;

  if (fpl.isError && managerPlan.isError) {
    return (
      <section className="state-panel" aria-live="polite">
        <span className="page-eyebrow">Command center</span>
        <h1>Live decision data is temporarily unavailable.</h1>
        <p>The interface will not invent a weekly action when authoritative API contracts fail.</p>
        <Button onClick={() => { void fpl.refetch(); void managerPlan.refetch(); }}>Retry live data</Button>
      </section>
    );
  }

  const captain = findPlayer(fplData, plan?.captain_player_id);
  const vice = findPlayer(fplData, plan?.vice_player_id);
  const fixtureList = fplData?.fixture_results ?? [];
  const finished = fixtureList.filter((fixture) => fixture.finished).length;
  const nextFixture = [...fixtureList]
    .filter((fixture) => !fixture.finished)
    .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime())[0];
  const fixtureCall = strongestFixtureCall(fixtureList);
  const freshness = planFreshness(plan?.captured_at);
  const partial = fpl.isError || managerPlan.isError;
  const attention = partial || (Boolean(plan) && freshness.stale);
  const syncLabel = partial ? 'Partial live data' : freshness.stale && plan ? 'Plan needs refresh' : 'Live data synced';

  return (
    <div className="home-page">
      <header className="page-intro">
        <div>
          <span className="page-eyebrow">{gameweek ? `Gameweek ${gameweek}` : 'Current gameweek'}</span>
          <h1>Command Center</h1>
          <p>Weekly action first. Supporting intelligence stays one layer down.</p>
        </div>
        <span className={`sync-badge${attention ? ' is-warning' : ''}`} role="status">
          <span aria-hidden="true" />{syncLabel}
        </span>
      </header>

      <section className="decision-hero" aria-labelledby="weekly-action-title">
        <div className="decision-main">
          <span className="decision-label">Latest saved manager plan</span>
          <h2 id="weekly-action-title">{decisionLabel(plan)}</h2>
          <p>{planNarrative(plan)}</p>
          <span className={`plan-freshness${freshness.stale ? ' is-stale' : ''}`}>{freshness.label}</span>
          <div className="decision-actions">
            <Button onClick={() => onNavigate('fpl')}>Open FPL workspace</Button>
            <Button variant="secondary" onClick={() => onNavigate('fixtures')}>Scan fixtures</Button>
          </div>
        </div>
        <div className="decision-grid" aria-label="Weekly decision summary">
          <DecisionMetric
            label="Captain"
            value={captain?.name ?? (plan?.captain_player_id ? 'Saved captain' : '—')}
            detail={captain?.expected_points == null ? undefined : `${captain.expected_points.toFixed(2)} current xPts · ${percent(captain.p_10_plus)} P10+`}
          />
          <DecisionMetric
            label="Vice"
            value={vice?.name ?? (plan?.vice_player_id ? 'Saved vice' : '—')}
            detail={vice?.expected_points == null ? undefined : `${vice.expected_points.toFixed(2)} current xPts`}
          />
          <DecisionMetric label="Chip" value={chipLabel(plan?.chip)} />
          <DecisionMetric label="Risk" value={plan?.risk_level ?? '—'} />
        </div>
      </section>

      <section className="home-grid" aria-label="Gameweek pulse">
        <Surface className="pulse-card">
          <div className="card-heading"><span>Fixtures</span><strong>{finished}/{fixtureList.length || '—'}</strong></div>
          <p className="card-copy">Finished this Gameweek</p>
          {nextFixture ? (
            <div className="next-fixture">
              <span>Next</span>
              <strong>{nextFixture.home_team ?? 'Home'} vs {nextFixture.away_team ?? 'Away'}</strong>
              <small>{formatKickoff(nextFixture.kickoff_time)}</small>
            </div>
          ) : (
            <div className="next-fixture"><span>State</span><strong>{fixtureList.length ? 'Gameweek complete' : 'Fixture feed unavailable'}</strong></div>
          )}
        </Surface>

        <Surface className="pulse-card">
          <div className="card-heading"><span>Captaincy</span><strong>{captain ? percent(captain.p_10_plus) : '—'}</strong></div>
          <p className="card-copy">Current-model P10+ for the saved captain</p>
          <div className="next-fixture">
            <span>Saved call</span>
            <strong>{captain?.name ?? (plan?.captain_player_id ? 'Captain data unavailable' : 'No saved captain')}</strong>
            <small>{captain?.expected_minutes == null ? 'Minutes unavailable' : `${Math.round(captain.expected_minutes)} expected minutes`}</small>
          </div>
        </Surface>

        <Surface className="pulse-card">
          <div className="card-heading"><span>Strongest 1X2</span><strong>{fixtureCall ? percent(fixtureCall.probability) : '—'}</strong></div>
          <p className="card-copy">Largest top-two probability separation</p>
          <div className="next-fixture">
            <span>{fixtureCall?.clear ? 'Clear call' : 'Edge state'}</span>
            <strong>{fixtureCall ? (fixtureCall.clear ? fixtureCall.label : 'No clear edge') : 'Prediction feed unavailable'}</strong>
            <small>{fixtureCall ? `${fixtureCall.fixture} · ${Math.round(fixtureCall.margin * 100)}pp margin` : 'No current 1X2 snapshot'}</small>
          </div>
        </Surface>
      </section>

      <section className="focus-section" aria-labelledby="focus-heading">
        <div className="section-heading">
          <span className="page-eyebrow">Next actions</span>
          <h2 id="focus-heading">Go deeper only where the decision needs it.</h2>
        </div>
        <div className="focus-grid">
          <button className="focus-card" type="button" onClick={() => onNavigate('fixtures')}>
            <span>Fixtures</span><strong>Match calls & evidence</strong><small>Compact 1X2 calls, form, signed evidence and matchup story.</small>
          </button>
          <button className="focus-card" type="button" onClick={() => onNavigate('fpl')}>
            <span>FPL</span><strong>Squad decision workspace</strong><small>Saved action, XI/bench, FT/ITB and current-event haul tails.</small>
          </button>
        </div>
      </section>
    </div>
  );
}

function DecisionMetric({ label, value, detail }: { label: string; value: string; detail?: string | undefined }) {
  return <div className="decision-metric"><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</div>;
}

function CommandSkeleton() {
  return <div className="command-skeleton" aria-busy="true" aria-label="Loading command center"><div className="skeleton-line is-short" /><div className="skeleton-line is-title" /><div className="skeleton-panel" /><div className="skeleton-grid"><div /><div /></div></div>;
}

function formatKickoff(value: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
