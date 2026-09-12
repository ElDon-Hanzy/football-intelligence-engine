export type PitchPlayer = {
  id: number;
  name: string;
  position: string;
  teamShort: string;
  fixtureLabel: string;
  fixturePhase: 'FUTURE' | 'LIVE' | 'FINISHED' | null;
  expectedPoints: number | null;
  expectedMinutes: number | null;
  p10: number | null;
  actualPoints: number | null;
  actualStatus: 'FINAL' | 'PENDING' | null;
  captain: boolean;
  vice: boolean;
};

export type PitchMetricMode = 'projection' | 'realized';

const positionOrder = ['GKP', 'DEF', 'MID', 'FWD'] as const;

export function FplPitch({
  players,
  metricMode,
}: {
  players: PitchPlayer[];
  metricMode: PitchMetricMode;
}) {
  const rows = positionOrder.map((position) => ({
    position,
    players: players.filter((player) => player.position === position),
  }));
  const formation = rows
    .filter((row) => row.position !== 'GKP')
    .map((row) => row.players.length)
    .join('-');

  return (
    <div className="v3-fpl-pitch-wrap">
      <div className="v3-pitch-meta">
        <span>{players.length}/11 selected</span>
        <strong>{formation || '—'}</strong>
      </div>
      <div className="v3-fpl-pitch" aria-label={`Formation ${formation || 'unknown'}`}>
        <span className="v3-field-halfway" aria-hidden="true" />
        <span className="v3-field-circle" aria-hidden="true" />
        <span className="v3-field-box v3-field-box--top" aria-hidden="true" />
        <span className="v3-field-box v3-field-box--bottom" aria-hidden="true" />

        {rows.map((row) => (
          <div
            className={`v3-pitch-row v3-pitch-row--${row.position.toLowerCase()}`}
            key={row.position}
            data-count={row.players.length}
          >
            {row.players.map((player) => (
              <PlayerCard key={player.id} player={player} metricMode={metricMode} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BenchStrip({
  players,
  metricMode,
}: {
  players: PitchPlayer[];
  metricMode: PitchMetricMode;
}) {
  return (
    <section className="v3-bench-strip" aria-labelledby="bench-heading">
      <div className="v3-bench-heading">
        <div>
          <span className="v3-kicker">Substitutes</span>
          <h3 id="bench-heading">Bench</h3>
        </div>
        <span>{players.length}/4</span>
      </div>
      <div className="v3-bench-grid">
        {players.map((player, index) => (
          <div className="v3-bench-slot" key={player.id}>
            <span className="v3-bench-order">{index + 1}</span>
            <PlayerCard player={player} metricMode={metricMode} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SquadList({
  starters,
  bench,
  metricMode,
}: {
  starters: PitchPlayer[];
  bench: PitchPlayer[];
  metricMode: PitchMetricMode;
}) {
  return (
    <div className="v3-squad-list">
      <ListGroup title="Starting XI" players={starters} metricMode={metricMode} />
      <ListGroup title="Bench" players={bench} metricMode={metricMode} />
    </div>
  );
}

function ListGroup({
  title,
  players,
  metricMode,
}: {
  title: string;
  players: PitchPlayer[];
  metricMode: PitchMetricMode;
}) {
  return (
    <section className="v3-list-group">
      <div className="v3-list-group-head">
        <h3>{title}</h3>
        <span>{players.length}</span>
      </div>
      <div className="v3-list-rows">
        {players.map((player) => (
          <div className="v3-list-player" key={player.id}>
            <Shirt player={player} />
            <div className="v3-list-player-main">
              <strong>{player.name}</strong>
              <span>{player.teamShort} · {player.fixtureLabel}</span>
            </div>
            <CaptainMarkers player={player} />
            <div className="v3-list-player-metric">
              <strong>{metricPrimary(player, metricMode)}</strong>
              <span>{metricSecondary(player, metricMode)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlayerCard({
  player,
  metricMode,
  compact = false,
}: {
  player: PitchPlayer;
  metricMode: PitchMetricMode;
  compact?: boolean;
}) {
  return (
    <article
      className={`v3-player-card${compact ? ' is-compact' : ''}`}
      aria-label={`${player.name}, ${player.position}, ${player.fixtureLabel}`}
    >
      <div className="v3-player-visual">
        <Shirt player={player} />
        <CaptainMarkers player={player} />
      </div>
      <div className="v3-player-name">{player.name}</div>
      <div className="v3-player-fixture">
        <span data-phase={player.fixturePhase ?? 'NONE'}>{player.fixtureLabel}</span>
      </div>
      <div className="v3-player-metric">
        <strong>{metricPrimary(player, metricMode)}</strong>
        <span>{metricSecondary(player, metricMode)}</span>
      </div>
    </article>
  );
}

function Shirt({ player }: { player: PitchPlayer }) {
  return (
    <span className="v3-shirt" aria-hidden="true" data-team={player.teamShort || '—'}>
      <span>{player.teamShort || '—'}</span>
    </span>
  );
}

function CaptainMarkers({ player }: { player: PitchPlayer }) {
  if (!player.captain && !player.vice) return null;
  return (
    <span className="v3-captain-markers" aria-label={player.captain ? 'Captain' : 'Vice captain'}>
      {player.captain ? 'C' : 'VC'}
    </span>
  );
}

function metricPrimary(player: PitchPlayer, metricMode: PitchMetricMode): string {
  if (metricMode === 'realized') {
    if (player.actualStatus === 'FINAL' && player.actualPoints != null) return `${player.actualPoints} pts`;
    if (player.fixturePhase === 'LIVE') return 'LIVE';
    return 'Pending';
  }
  return player.expectedPoints == null ? '— xPts' : `${player.expectedPoints.toFixed(1)} xPts`;
}

function metricSecondary(player: PitchPlayer, metricMode: PitchMetricMode): string {
  if (metricMode === 'realized') {
    return player.expectedPoints == null ? 'Frozen projection unavailable' : `Frozen ${player.expectedPoints.toFixed(1)} xPts`;
  }

  const minutes = player.expectedMinutes == null ? 'xMin —' : `${Math.round(player.expectedMinutes)} xMin`;
  const tail = player.p10 == null ? 'P10+ —' : `P10+ ${Math.round(player.p10 * 100)}%`;
  return `${minutes} · ${tail}`;
}
