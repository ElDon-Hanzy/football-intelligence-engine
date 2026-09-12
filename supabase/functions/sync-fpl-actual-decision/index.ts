import { createClient } from 'supabase';

const BASE = 'https://fantasy.premierleague.com/api';
const ENTRY_ID = 3559923;
const ua = { 'User-Agent': 'FootballIntelligence/0.5' };

async function getJson(url: string) {
  const response = await fetch(url, { headers: ua });
  let data: any = null;
  try { data = await response.json(); } catch { /* fail closed below */ }
  return { ok: response.ok, status: response.status, data };
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function sha256(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'POST required' }, { status: 405 });
  }

  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) return Response.json({ ok: false, error: 'service credential missing' }, { status: 500 });

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
    const { data: token, error: authError } = await sb.rpc('get_backend_secret', { secret_name: 'FOOTBALL_ENGINE_ADMIN_TOKEN' });
    if (authError || !token || req.headers.get('x-engine-token') !== token) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const entryId = Number(body.entry_id || ENTRY_ID);
    const requestedGw = Number(body.gameweek || 0);
    const bootstrap = await getJson(`${BASE}/bootstrap-static/`);
    if (!bootstrap.ok) throw new Error(`FPL bootstrap failed HTTP ${bootstrap.status}`);

    const events = Array.isArray(bootstrap.data?.events) ? bootstrap.data.events : [];
    const now = Date.now();
    const targetEvent = requestedGw >= 1 && requestedGw <= 38
      ? events.find((event: any) => Number(event.id) === requestedGw)
      : [...events]
          .filter((event: any) => new Date(event.deadline_time).getTime() <= now)
          .sort((a: any, b: any) => Number(b.id) - Number(a.id))[0];

    if (!targetEvent) {
      return Response.json({ ok: true, change_id: 'C0257', status: 'NO_LOCKED_GAMEWEEK', persisted: false });
    }

    const gameweek = Number(targetEvent.id);
    const deadlineAt = String(targetEvent.deadline_time || '');
    if (!deadlineAt || now < new Date(deadlineAt).getTime()) {
      return Response.json({
        ok: true,
        change_id: 'C0257',
        gameweek,
        status: 'PRE_DEADLINE_HIDDEN',
        persisted: false,
        semantics: { predeadline_hidden_picks_are_not_inferred: true },
      });
    }

    const picksResponse = await getJson(`${BASE}/entry/${entryId}/event/${gameweek}/picks/`);
    if (!picksResponse.ok) {
      return Response.json({
        ok: true,
        change_id: 'C0257',
        gameweek,
        status: 'LOCKED_PICKS_NOT_AVAILABLE',
        fpl_http_status: picksResponse.status,
        persisted: false,
      });
    }

    const rawPicks = Array.isArray(picksResponse.data?.picks) ? picksResponse.data.picks : [];
    const picks = rawPicks
      .map((pick: any) => ({
        fpl_player_id: Number(pick.element),
        position: Number(pick.position),
        multiplier: Number(pick.multiplier),
        is_captain: pick.is_captain === true,
        is_vice_captain: pick.is_vice_captain === true,
      }))
      .filter((pick: any) => Number.isFinite(pick.fpl_player_id) && Number.isFinite(pick.position))
      .sort((a: any, b: any) => a.position - b.position);

    const positions = new Set(picks.map((pick: any) => pick.position));
    if (picks.length !== 15 || positions.size !== 15 || Math.min(...positions) !== 1 || Math.max(...positions) !== 15) {
      throw new Error(`FPL locked picks incomplete: ${picks.length} picks / ${positions.size} unique positions`);
    }

    const fplPlayerIds = picks.map((pick: any) => pick.fpl_player_id);
    const { data: players, error: playerError } = await sb
      .from('players')
      .select('id,fpl_player_id,web_name,position,team_id')
      .in('fpl_player_id', fplPlayerIds);
    if (playerError) throw playerError;

    const byFplId = new Map((players || []).map((player: any) => [Number(player.fpl_player_id), player]));
    const mapped = picks.map((pick: any) => ({ ...pick, player: byFplId.get(pick.fpl_player_id) || null }));
    const missing = mapped.filter((pick: any) => !pick.player).map((pick: any) => pick.fpl_player_id);
    if (missing.length) throw new Error(`Locked FPL picks have unmapped players: ${missing.join(',')}`);

    const startingXi = mapped.filter((pick: any) => pick.position <= 11).map((pick: any) => Number(pick.player.id));
    const benchOrder = mapped.filter((pick: any) => pick.position > 11).map((pick: any) => Number(pick.player.id));
    const captain = mapped.find((pick: any) => pick.is_captain);
    const vice = mapped.find((pick: any) => pick.is_vice_captain);
    if (startingXi.length !== 11 || benchOrder.length !== 4 || !captain || !vice) {
      throw new Error('Locked FPL selection failed XI/bench/captain/vice integrity gate');
    }

    const chip = typeof picksResponse.data?.active_chip === 'string' && picksResponse.data.active_chip
      ? String(picksResponse.data.active_chip)
      : null;
    const signature = await sha256({
      entry_id: entryId,
      gameweek,
      deadline_at: deadlineAt,
      picks: mapped.map((pick: any) => ({
        position: pick.position,
        player_id: Number(pick.player.id),
        multiplier: pick.multiplier,
        is_captain: pick.is_captain,
        is_vice_captain: pick.is_vice_captain,
      })),
      chip,
    });

    const { data: latest, error: latestError } = await sb
      .from('fpl_actual_manager_decisions')
      .select('id,gameweek,captured_at,captain_player_id,vice_player_id,starting_xi,bench_order,chip,source,notes')
      .eq('gameweek', gameweek)
      .order('captured_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;

    if (typeof latest?.notes === 'string' && latest.notes.includes(`C0257_SIGNATURE:${signature}`)) {
      return Response.json({
        ok: true,
        change_id: 'C0257',
        gameweek,
        status: 'UNCHANGED',
        persisted: false,
        decision_id: Number(latest.id),
        signature,
        source: latest.source,
      });
    }

    const notes = [
      `C0257_SIGNATURE:${signature}`,
      `entry_id:${entryId}`,
      `deadline_at:${deadlineAt}`,
      'source:FPL_GAMEWEEK_PICKS',
      'semantics:submitted_locked_selection_not_engine_inference',
    ].join('; ');

    const { data: inserted, error: insertError } = await sb
      .from('fpl_actual_manager_decisions')
      .insert({
        gameweek,
        captured_at: new Date().toISOString(),
        captain_player_id: Number(captain.player.id),
        vice_player_id: Number(vice.player.id),
        starting_xi: startingXi,
        bench_order: benchOrder,
        chip,
        source: 'public_fpl_api_locked_picks_c0257',
        notes,
        correction_of_id: latest?.id == null ? null : Number(latest.id),
      })
      .select('id,captured_at')
      .single();
    if (insertError) throw insertError;

    return Response.json({
      ok: true,
      change_id: 'C0257',
      gameweek,
      status: 'PERSISTED',
      persisted: true,
      decision_id: Number(inserted.id),
      captured_at: inserted.captured_at,
      deadline_at: deadlineAt,
      entry_id: entryId,
      source: 'public_fpl_api_locked_picks_c0257',
      signature,
      starting_xi: startingXi,
      bench_order: benchOrder,
      captain_player_id: Number(captain.player.id),
      vice_player_id: Number(vice.player.id),
      chip,
      fpl_entry_history: picksResponse.data?.entry_history ?? null,
      semantics: {
        pulled_only_after_deadline: true,
        actual_is_not_inferred_from_engine: true,
        submitted_order_is_preserved: true,
        missing_mapping_fails_closed: true,
      },
    });
  } catch (error) {
    return Response.json({ ok: false, change_id: 'C0257', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
