export const V3_WORKSPACE_ENDPOINT =
  'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/fpl-v3-workspace-api';

const PUBLIC_SUPABASE_ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub29pd2V6enN4Y3dodGp0ZGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzY0MjQsImV4cCI6MjEwMjkxMjQyNH0.V22pHe1g39CnFGTYUX-39Teg_EEmr3kns_Fwbdi4kiQ';

export type WorkspaceLifecycle = 'PRE_DEADLINE' | 'POST_DEADLINE_ACTIVE' | 'GW_COMPLETE' | 'UNKNOWN';
export type WorkspaceFixturePhase = 'FUTURE' | 'LIVE' | 'FINISHED';

export type PlayerFixtureContext = {
  match_id: number;
  fpl_fixture_id: number | null;
  venue: 'H' | 'A';
  opponent_team_id: number;
  opponent: string | null;
  opponent_short: string | null;
  kickoff_at: string;
  phase: WorkspaceFixturePhase;
  finished: boolean;
};

export type WorkspacePlayer = {
  player_id: number;
  name: string;
  position: 'GKP' | 'DEF' | 'MID' | 'FWD' | string;
  team_id: number;
  team: string | null;
  team_short: string | null;
  fixtures: PlayerFixtureContext[];
};

export type PlayerEvidence = {
  player_id: number;
  status: 'CAPTURED' | 'NOT_CAPTURED';
  captured_at: string | null;
  expected_points?: number | null;
  expected_minutes?: number | null;
  p_blank?: number | null;
  p_5_plus?: number | null;
  p_10_plus?: number | null;
  p_15_plus?: number | null;
  p_20_plus?: number | null;
  p_start?: number | null;
  p_goal?: number | null;
  p_assist?: number | null;
  p_clean_sheet?: number | null;
  p_dc?: number | null;
  p_bonus?: number | null;
  confidence?: number | null;
  q90?: number | null;
  q95?: number | null;
  distribution_version?: string | null;
  tail_semantics?: string | null;
};

export type PlayerActual = {
  player_id: number;
  fixture_ids: number[];
  status: 'FINAL' | 'PENDING';
  minutes: number | null;
  total_points: number | null;
  goals: number | null;
  assists: number | null;
  bonus: number | null;
  defensive_contribution: number | null;
};

export type RecommendationSquadPlayer = {
  player_id: number;
  name: string | null;
  team: string | null;
  position: string | null;
  price_tenths: number | null;
  role: string | null;
  expected_minutes: number | null;
};

export type WorkspaceRecommendation = {
  publication_id: number;
  captured_at: string;
  publication_stage: string;
  publication_status: string;
  final_status: string | null;
  execution_authorized: boolean;
  authorization_label:
    | 'AUTHORIZED_FINAL_RECOMMENDATION'
    | 'FINAL_FROZEN_NOT_AUTHORIZED'
    | 'PROVISIONAL_NOT_AUTHORIZED';
  frozen_after_deadline: boolean;
  prediction_run_id: number | null;
  optimizer_run_id: number | null;
  autonomous_gate_run_id: number | null;
  source: string | null;
  squad: RecommendationSquadPlayer[];
  starting_xi: number[];
  bench_order: number[];
  captain_player_id: number | null;
  vice_player_id: number | null;
  chip: string | null;
  transfers: Array<Record<string, unknown>>;
  manager_economy: {
    free_transfers: number | null;
    bank_tenths: number | null;
    captured_at: string;
    source: string;
    basis: 'RECOMMENDATION_POST_ACTION';
  } | null;
};

export type WorkspaceActual =
  | {
      verification_status: 'NOT_VERIFIED';
      reason: string;
      squad: null;
      starting_xi: null;
      bench_order: null;
      captain_player_id: null;
      vice_player_id: null;
      chip: null;
      manager_economy: null;
    }
  | {
      verification_status: 'VERIFIED';
      decision_id: number;
      captured_at: string;
      source: string;
      squad: number[];
      starting_xi: number[];
      bench_order: number[];
      captain_player_id: number | null;
      vice_player_id: number | null;
      chip: string | null;
      manager_economy: null;
      manager_economy_reason: string;
    };

export type WorkspaceFixture = {
  match_id: number;
  fpl_fixture_id: number | null;
  kickoff_at: string;
  phase: WorkspaceFixturePhase;
  finished: boolean;
  home_team_id: number;
  away_team_id: number;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  result_source: string;
  updated_at: string;
};

export type FplWorkspaceApi = {
  ok: true;
  contract_version: 'fpl_v3_workspace_v02_player_evidence';
  gameweek: number;
  lifecycle: WorkspaceLifecycle;
  generated_at: string;
  actual: WorkspaceActual;
  recommendation: WorkspaceRecommendation | null;
  decision_snapshot: {
    prediction_run_id: number;
    generated_at: string;
    deadline_at: string;
    run_type: string;
    frozen: boolean;
    excluded_from_backtest: boolean;
    model_version_id: number | null;
    player_evidence: PlayerEvidence[];
    price_ownership_evidence: {
      status: 'CAPTURED' | 'NOT_CAPTURED';
      captured_at: string | null;
      source: string | null;
    };
  } | null;
  realized: {
    result_run_id: number | null;
    observed_at: string | null;
    is_final: boolean;
    fixtures: WorkspaceFixture[];
    player_actuals: PlayerActual[];
  };
  players: WorkspacePlayer[];
  semantics: {
    final_does_not_imply_execution_authorized: true;
    actual_is_never_inferred_from_recommendation: true;
    actual_manager_economy_is_not_inferred: true;
    recommendation_economy_is_same_path_post_action_only: true;
    decision_time_evidence_is_timestamp_scoped: true;
    player_projection_evidence_is_frozen_to_prediction_run: true;
    realized_player_values_require_finished_fixture_evidence: true;
    fixture_phase_is_explicit: true;
    historical_forecasts_rewritten: boolean;
  };
};

function isWorkspacePayload(value: unknown): value is FplWorkspaceApi {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.ok === true &&
    payload.contract_version === 'fpl_v3_workspace_v02_player_evidence' &&
    typeof payload.gameweek === 'number' &&
    typeof payload.lifecycle === 'string' &&
    Array.isArray(payload.players) &&
    typeof payload.actual === 'object' &&
    typeof payload.realized === 'object'
  );
}

export async function fetchFplWorkspace(gameweek = 0, signal?: AbortSignal): Promise<FplWorkspaceApi> {
  const endpoint = gameweek > 0 ? `${V3_WORKSPACE_ENDPOINT}?gw=${gameweek}` : V3_WORKSPACE_ENDPOINT;
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_JWT}`,
      apikey: PUBLIC_SUPABASE_ANON_JWT,
    },
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(`V3 workspace returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isWorkspacePayload(payload)) {
    throw new Error('V3 workspace contract mismatch');
  }
  if (payload.semantics.historical_forecasts_rewritten) {
    throw new Error('Integrity gate: historical forecasts report rewritten');
  }
  return payload;
}
