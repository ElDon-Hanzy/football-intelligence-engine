import { createClient } from 'supabase';

const BASE = 'https://fantasy.premierleague.com/api';
const ENTRY_ID = 3559923;
const ua = { 'User-Agent': 'FootballIntelligence/0.6' };
const FROZEN_SOURCES = ['public_fpl_api_locked_picks_c0257', 'public_fpl_api_locked_picks_c0258_frozen'];

async function getJson(url: string) {
  const response = await fetch(url, { headers: ua });
  let data: any = null;
  try { data = await response.json(); } catch { /* fail closed below */ }
  return { ok: response.ok, status: response.status, data };
}

async function sha256(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function completeFrozenDecision(row: any): boolean {
  return Boolean(row && FROZEN_SOURCES.includes(String(row.source || '')) && Array.isArray(row.starting_xi) && row.starting_xi.length === 11 && Array.isArray(row.bench_order) && row.bench_order.length === 4 && Number.isFinite(Number(row.captain_player_id)) && Number.isFinite(Number(row.vice_player_id)));
}

async function latestActual(sb: any, gameweek: number) {
  const { data, error } = await sb.from('fpl_actual_manager_decisions').select('id,gameweek,captured_at,captain_player_id,vice_player_id,starting_xi,bench_order,chip,source,notes').eq('gameweek', gameweek).order('captured_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

function frozenResponse(row: any, gameweek: number, entryId: number, status = 'FROZEN_DB_SNAPSHOT') {
  return Response.json({ ok: true, change_id: 'C0258', gameweek, entry_id: entryId, status, persisted: false, decision_id: Number(row.id), captured_at: row.captured_at, source: row.source, starting_xi: row.starting_xi, bench_order: row.bench_order, captain_player_id: Number(row.captain_player_id), vice_player_id: Number(row.vice_player_id), chip: row.chip ?? null, semantics: { actual_snapshot_is_immutable_after_first_complete_locked_capture: true, no_fpl_request_was_made: true, frontend_reads_database_only: true, actual_is_not_inferred_from_engine: true } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ ok: false, error: 'POST required' }, { status: 405 });
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) return Response.json({ ok: false, error: 'service credential missing' }, { status: 500 });
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
    const { data: token, error: authError } = await sb.rpc('get_backend_secret', { secret_name: 'FOOTBALL_ENGINE_ADMIN_TOKEN' });
    if (authError || !token || req.headers.get('x-engine-token') !== token) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const entryId = Number(body.entry_id || ENTRY_ID);
    const requestedGw = Number(body.gameweek || 0);
    let gameweek = requestedGw >= 1 && requestedGw <= 38 ? requestedGw : 0;
    if (!gameweek) {
      const { data: currentPlan, error: currentPlanError } = await sb.from('current_fpl_live_plan_v01').select('gameweek').order('gameweek', { ascending: false }).limit(1).maybeSingle();
      if (currentPlanError) throw currentPlanError;
      gameweek = Number(currentPlan?.gameweek || 0);
    }
    if (gameweek) { const existing = await latestActual(sb, gameweek); if (completeFrozenDecision(existing)) return frozenResponse(existing, gameweek, entryId); }
    const bootstrap = await getJson(`${BASE}/bootstrap-static/`);
    if (!bootstrap.ok) throw new Error(`FPL bootstrap failed HTTP ${bootstrap.status}`);
    const events = Array.isArray(bootstrap.data?.events) ? bootstrap.data.events : [];
    const now = Date.now();
    const targetEvent = gameweek ? events.find((event: any) => Number(event.id) === gameweek) : [...events].filter((event: any) => new Date(event.deadline_time).getTime() <= now).sort((a: any, b: any) => Number(b.id) - Number(a.id))[0];
    if (!targetEvent) return Response.json({ ok: true, change_id: 'C0258', status: 'NO_LOCKED_GAMEWEEK', persisted: false });
    gameweek = Number(targetEvent.id);
    const deadlineAt = String(targetEvent.deadline_time || '');
    if (!deadlineAt || now < new Date(deadlineAt).getTime()) return Response.json({ ok: true, change_id: 'C0258', gameweek, status: 'PRE_DEADLINE_HIDDEN', persisted: false, deadline_at: deadlineAt || null, semantics: { predeadline_hidden_picks_are_not_inferred: true } });
    const existingAfterBootstrap = await latestActual(sb, gameweek);
    if (completeFrozenDecision(existingAfterBootstrap)) return frozenResponse(existingAfterBootstrap, gameweek, entryId, 'FROZEN_DB_SNAPSHOT_RACE_GUARD');
    const picksResponse = await getJson(`${BASE}/entry/${entryId}/event/${gameweek}/picks/`);
    if (!picksResponse.ok) return Response.json({ ok: true, change_id: 'C0258', gameweek, status: 'LOCKED_PICKS_NOT_AVAILABLE', fpl_http_status: picksResponse.status, persisted: false });
    const rawPicks = Array.isArray(picksResponse.data?.picks) ? picksResponse.data.picks : [];
    const picks = rawPicks.map((pick: any) => ({ fpl_player_id: Number(pick.element), position: Number(pick.position), multiplier: Number(pick.multiplier), is_captain: pick.is_captain === true, is_vice_captain: pick.is_vice_captain === true })).filter((pick: any) => Number.isFinite(pick.fpl_player_id) && Number.isFinite(pick.position)).sort((a: any, b: any) => a.position - b.position);
    const positions = new Set(picks.map((pick: any) => pick.position));
    if (picks.length !== 15 || positions.size !== 15 || Math.min(...positions) !== 1 || Math.max(...positions) !== 15) throw new Error(`FPL locked picks incomplete: ${picks.length} picks / ${positions.size} unique positions`);
    const { data: players, error: playerError } = await sb.from('players').select('id,fpl_player_id').in('fpl_player_id', picks.map((pick: any) => pick.fpl_player_id));
    if (playerError) throw playerError;
    const byFplId = new Map((players || []).map((player: any) => [Number(player.fpl_player_id), Number(player.id)]));
    const mapped = picks.map((pick: any) => ({ ...pick, player_id: byFplId.get(pick.fpl_player_id) ?? null }));
    const missing = mapped.filter((pick: any) => pick.player_id == null).map((pick: any) => pick.fpl_player_id);
    if (missing.length) throw new Error(`Locked FPL picks have unmapped players: ${missing.join(',')}`);
    const startingXi = mapped.filter((pick: any) => pick.position <= 11).map((pick: any) => Number(pick.player_id));
    const benchOrder = mapped.filter((pick: any) => pick.position > 11).map((pick: any) => Number(pick.player_id));
    const captain = mapped.find((pick: any) => pick.is_captain); const vice = mapped.find((pick: any) => pick.is_vice_captain);
    if (startingXi.length !== 11 || benchOrder.length !== 4 || !captain || !vice) throw new Error('Locked FPL selection failed XI/bench/captain/vice integrity gate');
    const chip = typeof picksResponse.data?.active_chip === 'string' && picksResponse.data.active_chip ? String(picksResponse.data.active_chip) : null;
    const signature = await sha256({ entry_id: entryId, gameweek, deadline_at: deadlineAt, picks: mapped.map((pick: any) => ({ position: pick.position, player_id: pick.player_id, multiplier: pick.multiplier, is_captain: pick.is_captain, is_vice_captain: pick.is_vice_captain })), chip });
    const prior = await latestActual(sb, gameweek);
    if (completeFrozenDecision(prior)) return frozenResponse(prior, gameweek, entryId, 'FROZEN_DB_SNAPSHOT_RACE_GUARD');
    const notes = [`C0258_SIGNATURE:${signature}`, `entry_id:${entryId}`, `deadline_at:${deadlineAt}`, 'source:FPL_GAMEWEEK_PICKS', 'semantics:first_complete_locked_selection_is_immutable'].join('; ');
    const { data: inserted, error: insertError } = await sb.from('fpl_actual_manager_decisions').insert({ gameweek, captured_at: new Date().toISOString(), captain_player_id: Number(captain.player_id), vice_player_id: Number(vice.player_id), starting_xi: startingXi, bench_order: benchOrder, chip, source: 'public_fpl_api_locked_picks_c0258_frozen', notes, correction_of_id: prior?.id == null ? null : Number(prior.id) }).select('id,captured_at').single();
    if (insertError) throw insertError;
    return Response.json({ ok: true, change_id: 'C0258', gameweek, status: 'PERSISTED_AND_FROZEN', persisted: true, decision_id: Number(inserted.id), captured_at: inserted.captured_at, deadline_at: deadlineAt, entry_id: entryId, source: 'public_fpl_api_locked_picks_c0258_frozen', signature, starting_xi: startingXi, bench_order: benchOrder, captain_player_id: Number(captain.player_id), vice_player_id: Number(vice.player_id), chip, semantics: { pulled_only_after_official_fpl_deadline: true, first_complete_locked_snapshot_is_immutable: true, future_invocations_read_database_before_external_fpl: true, frontend_reads_database_only: true, actual_is_not_inferred_from_engine: true } });
  } catch (error) { return Response.json({ ok: false, change_id: 'C0258', error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
});
