import type { ActualLiveApi } from '../api/actualLive';
import type { FplWorkspaceApi, PlayerEvidence } from '../api/fplWorkspace';
import { V3Dialog } from './V3Dialog';

export function PlayerIntelligenceModal({
  open,
  onClose,
  playerId,
  workspace,
  live,
}: {
  open: boolean;
  onClose: () => void;
  playerId: number | null;
  workspace: FplWorkspaceApi;
  live: ActualLiveApi;
}) {
  if (playerId == null) return null;
  const player = live.players.find((item) => item.player_id === playerId)
    ?? workspace.players.find((item) => item.player_id === playerId);
  const recommended = workspace.recommendation?.squad.find((item) => item.player_id === playerId);
  const evidence = workspace.decision_snapshot?.player_evidence.find((item) => item.player_id === playerId);
  const actual = live.player_actuals.find((item) => item.player_id === playerId);
  const name = player?.name ?? recommended?.name ?? `Player ${playerId}`;
  const team = player?.team ?? player?.team_short ?? recommended?.team ?? '—';
  const position = player?.position ?? recommended?.position ?? '—';
  const fixtures = player?.fixtures ?? [];

  return (
    <V3Dialog open={open} onClose={onClose} title={name} eyebrow={`${team} · ${position}`}>
      <section className="v3-modal-summary">
        <div>
          <span>Status</span>
          <strong>{actualStatus(actual?.status ?? 'PENDING')}</strong>
          <small>{actual?.status === 'LIVE' || actual?.status === 'PARTIAL' ? 'Current FPL values are provisional.' : actual?.status === 'FINAL' ? 'FPL values are final for the player fixture.' : 'Fixture has not produced realized points yet.'}</small>
        </div>
        <div>
          <span>Fixture</span>
          <strong>{fixtures.length ? fixtures.map((fixture) => `${fixture.opponent_short ?? fixture.opponent ?? 'OPP'} (${fixture.venue})`).join(' · ') : 'Unavailable'}</strong>
          <small>{fixtures.length ? fixtures.map((fixture) => fixture.phase).join(' · ') : 'No fixture evidence'}</small>
        </div>
      </section>

      <section className="v3-modal-section">
        <div className="v3-modal-section-head">
          <span className="v3-kicker">Frozen decision-time projection</span>
          <small>{workspace.decision_snapshot ? `Run #${workspace.decision_snapshot.prediction_run_id}` : 'No frozen run'}</small>
        </div>
        <div className="v3-modal-metric-grid">
          <Metric label="xPts" value={num(evidence, 'expected_points', 1)} />
          <Metric label="xMin" value={num(evidence, 'expected_minutes', 0)} />
          <Metric label="P start" value={pct(evidence, 'p_start')} />
          <Metric label="P blank" value={pct(evidence, 'p_blank')} />
          <Metric label="P5+" value={pct(evidence, 'p_5_plus')} />
          <Metric label="P10+" value={pct(evidence, 'p_10_plus')} />
          <Metric label="P15+" value={pct(evidence, 'p_15_plus')} />
          <Metric label="P20+" value={pct(evidence, 'p_20_plus')} />
          <Metric label="P goal" value={pct(evidence, 'p_goal')} />
          <Metric label="P assist" value={pct(evidence, 'p_assist')} />
          <Metric label="P clean sheet" value={pct(evidence, 'p_clean_sheet')} />
          <Metric label="P DC" value={pct(evidence, 'p_dc')} />
          <Metric label="P bonus" value={pct(evidence, 'p_bonus')} />
          <Metric label="Q90" value={num(evidence, 'q90', 1)} />
          <Metric label="Q95" value={num(evidence, 'q95', 1)} />
        </div>
      </section>

      <section className="v3-modal-section">
        <div className="v3-modal-section-head">
          <span className="v3-kicker">Realized FPL evidence</span>
          <small>{live.result_snapshot?.observed_at ? `Observed ${formatTimestamp(live.result_snapshot.observed_at)}` : 'No result snapshot'}</small>
        </div>
        <div className="v3-modal-metric-grid">
          <Metric label="Points" value={actual?.total_points == null ? '—' : String(actual.total_points)} />
          <Metric label="Minutes" value={actual?.minutes == null ? '—' : String(actual.minutes)} />
          <Metric label="Goals" value={actual?.goals == null ? '—' : String(actual.goals)} />
          <Metric label="Assists" value={actual?.assists == null ? '—' : String(actual.assists)} />
          <Metric label="Bonus" value={actual?.bonus == null ? '—' : String(actual.bonus)} />
          <Metric label="Def. contrib." value={actual?.defensive_contribution == null ? '—' : String(actual.defensive_contribution)} />
          <Metric label="xG" value={actual?.xg == null ? '—' : actual.xg.toFixed(2)} />
          <Metric label="xA" value={actual?.xa == null ? '—' : actual.xa.toFixed(2)} />
          <Metric label="xGI" value={actual?.xgi == null ? '—' : actual.xgi.toFixed(2)} />
          <Metric label="BPS" value={actual?.bps == null ? '—' : String(actual.bps)} />
        </div>
        <p className="v3-modal-note">Realized values come from the actual submitted squad lane. They are never taken from the engine recommendation.</p>
      </section>
    </V3Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function captured(evidence: PlayerEvidence | undefined, key: keyof PlayerEvidence): number | null {
  if (!evidence || evidence.status !== 'CAPTURED') return null;
  const value = evidence[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function num(evidence: PlayerEvidence | undefined, key: keyof PlayerEvidence, digits: number): string {
  const value = captured(evidence, key);
  return value == null ? '—' : value.toFixed(digits);
}

function pct(evidence: PlayerEvidence | undefined, key: keyof PlayerEvidence): string {
  const value = captured(evidence, key);
  return value == null ? '—' : `${Math.round(value * 100)}%`;
}

function actualStatus(value: string): string {
  if (value === 'FINAL') return 'Final';
  if (value === 'LIVE') return 'Live · provisional';
  if (value === 'PARTIAL') return 'Partial · provisional';
  return 'Pending';
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
