import { createClient } from 'supabase';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const numeric = (value: unknown): number | null =>
  value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ ok: false, error: 'GET required' }), { status: 405, headers: cors });
    }

    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) throw new Error('Missing Supabase service credential');

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
    const url = new URL(req.url);
    const requested = Number(url.searchParams.get('gw') || 0);
    const now = new Date();

    const { data: allMatches, error: matchError } = await sb
      .from('matches')
      .select('id,gameweek,kickoff_time,home_team_id,away_team_id,home_score,away_score,finished')
      .eq('source', 'fpl')
      .not('gameweek', 'is', null)
      .order('kickoff_time');
    if (matchError) throw matchError;

    const gameweeks = [...new Set((allMatches || []).map((match: any) => Number(match.gameweek)).filter(Number.isFinite))]
      .sort((a, b) => a - b);
    let gameweek = requested >= 1 && requested <= 38 ? requested : 0;
    if (!gameweek) {
      const future = (allMatches || []).find((match: any) => new Date(match.kickoff_time) > now);
      gameweek = future ? Number(future.gameweek) : (gameweeks.at(-1) || 1);
    }
    const matches = (allMatches || []).filter((match: any) => Number(match.gameweek) === gameweek);

    const [
      { data: teams },
      { data: players },
      { data: tactics },
      { data: matchups },
      { data: availability },
      { data: roles },
      { data: replacements },
      { data: history },
      { data: highScoreRows, error: highScoreError },
      { data: highScoreRuns, error: highScoreRunError },
    ] = await Promise.all([
      sb.from('teams').select('id,name,short_name'),
      sb.from('players').select('id,web_name,position,team_id'),
      sb.from('current_team_fixture_tactics').select('id,match_id,gameweek,team_id,opponent_team_id,kickoff_time,captured_at,profile_observed_at,taxonomy_version,style_label,possession_control_score,directness_score,width_score,box_pressure_score,set_piece_score,defensive_block_score,confidence,evidence,model_effect_enabled').eq('gameweek', gameweek),
      sb.from('current_fixture_tactical_matchups').select('id,match_id,gameweek,team_id,opponent_team_id,kickoff_time,captured_at,evidence_cutoff,signal_family,signal_key,score_type,score,direction,attacking_component,resistance_component,confidence,data_coverage,evidence,model_effect_enabled').eq('gameweek', gameweek),
      sb.from('current_player_fixture_availability').select('id,match_id,gameweek,team_id,opponent_team_id,player_id,kickoff_time,captured_at,availability_status,chance_of_playing,base_start_probability,base_expected_minutes,expected_xi,confidence,evidence,model_effect_enabled').eq('gameweek', gameweek),
      sb.from('current_player_fixture_roles').select('id,match_id,gameweek,team_id,opponent_team_id,player_id,kickoff_time,captured_at,taxonomy_version,primary_role,secondary_role,primary_score,secondary_score,expected_xi,availability_status,confidence,evidence,model_effect_enabled').eq('gameweek', gameweek).eq('taxonomy_version', 'event_role_v0.2.1'),
      sb.from('current_player_replacement_quality').select('id,match_id,gameweek,team_id,opponent_team_id,target_player_id,candidate_player_id,kickoff_time,captured_at,target_primary_role,candidate_primary_role,role_fit_score,production_continuity_score,composite_score,candidate_rank,quality_status,confidence,evidence,model_effect_enabled').eq('gameweek', gameweek),
      sb.from('team_match_intelligence').select('team_id,fixture_kickoff,goals_for,goals_against,xg_for,xg_against,raw').eq('source', 'understat').eq('competition', 'Premier League').order('fixture_kickoff', { ascending: false }),
      sb.from('research_c0197_pregw3_experiment_snapshots').select('experiment_key,variant_key,gameweek,match_id,fixture,score,rank,route,confidence,coverage,features,research_only,model_effect_enabled').eq('gameweek', gameweek).in('experiment_key', ['V04_ADAPTIVE_HISTORY_DECAY', 'V05_TACTICAL_CLASH', 'V06_EXPECTED_ATTACK_UNIT_DELTA', 'V08_SHOOTOUT_DEMOLITION_ROUTER']),
      sb.from('research_c0197_pregw3_experiment_runs').select('run_key,experiment_key,frozen_at,research_only,model_effect_enabled').in('experiment_key', ['V04_ADAPTIVE_HISTORY_DECAY', 'V05_TACTICAL_CLASH', 'V06_EXPECTED_ATTACK_UNIT_DELTA', 'V08_SHOOTOUT_DEMOLITION_ROUTER']),
    ]);

    const teamMap = new Map((teams || []).map((team: any) => [Number(team.id), team]));
    const playerMap = new Map((players || []).map((player: any) => [Number(player.id), player]));
    const group = (rows: any[] | null | undefined, key: (row: any) => string) => {
      const map = new Map<string, any[]>();
      for (const row of rows || []) {
        const value = key(row);
        if (!map.has(value)) map.set(value, []);
        map.get(value)!.push(row);
      }
      return map;
    };

    const tacticsBySide = group(tactics, (row) => `${row.match_id}:${row.team_id}`);
    const matchupsBySide = group(matchups, (row) => `${row.match_id}:${row.team_id}`);
    const availabilityBySide = group(availability, (row) => `${row.match_id}:${row.team_id}`);
    const rolesByPlayer = group(roles, (row) => `${row.match_id}:${row.team_id}:${row.player_id}`);
    const replacementsBySide = group(replacements, (row) => `${row.match_id}:${row.team_id}`);
    const historyByTeam = group(history, (row) => String(row.team_id));
    const highScoreByMatch = group(highScoreRows, (row) => String(row.match_id));

    const frozenAt = (highScoreRuns || [])
      .filter((row: any) => row.experiment_key === 'V08_SHOOTOUT_DEMOLITION_ROUTER')
      .map((row: any) => row.frozen_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null;

    const recentForm = (teamId: number, kickoff: string) => {
      const cutoff = new Date(kickoff).getTime();
      const rows = (historyByTeam.get(String(teamId)) || [])
        .filter((row: any) => new Date(row.fixture_kickoff).getTime() < cutoff)
        .sort((a: any, b: any) => new Date(b.fixture_kickoff).getTime() - new Date(a.fixture_kickoff).getTime())
        .slice(0, 10);
      if (!rows.length) return null;
      const values = (key: string) => rows.map((row: any) => numeric(row[key])).filter((value: any) => value != null) as number[];
      const average = (items: number[]) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : null;
      const goalsFor = values('goals_for');
      const goalsAgainst = values('goals_against');
      const xgFor = values('xg_for');
      const xgAgainst = values('xg_against');
      return {
        sample: rows.length,
        clean_sheets: rows.filter((row: any) => numeric(row.goals_against) === 0).length,
        scoring_blanks: rows.filter((row: any) => numeric(row.goals_for) === 0).length,
        goals_for: goalsFor.reduce((sum, value) => sum + value, 0),
        goals_against: goalsAgainst.reduce((sum, value) => sum + value, 0),
        avg_goals_for: average(goalsFor),
        avg_goals_against: average(goalsAgainst),
        avg_xg_for: average(xgFor),
        avg_xg_against: average(xgAgainst),
        source: 'Understat',
        window: 'last_10_PL_before_kickoff',
      };
    };

    const h2hSummary = (teamId: number, opponentId: number, kickoff: string) => {
      const teamName = teamMap.get(teamId)?.name;
      const opponentName = teamMap.get(opponentId)?.name;
      if (!teamName || !opponentName) return null;
      const cutoff = new Date(kickoff).getTime();
      const rows = (historyByTeam.get(String(teamId)) || [])
        .filter((row: any) => {
          if (new Date(row.fixture_kickoff).getTime() >= cutoff) return false;
          const home = row.raw?.h?.title;
          const away = row.raw?.a?.title;
          const opponent = home === teamName ? away : away === teamName ? home : null;
          return opponent === opponentName;
        })
        .sort((a: any, b: any) => new Date(b.fixture_kickoff).getTime() - new Date(a.fixture_kickoff).getTime())
        .slice(0, 5);
      if (!rows.length) return null;
      let wins = 0, draws = 0, losses = 0, under = 0, btts = 0;
      for (const row of rows) {
        const goalsFor = numeric(row.goals_for) || 0;
        const goalsAgainst = numeric(row.goals_against) || 0;
        if (goalsFor > goalsAgainst) wins += 1;
        else if (goalsFor === goalsAgainst) draws += 1;
        else losses += 1;
        if (goalsFor + goalsAgainst < 2.5) under += 1;
        if (goalsFor > 0 && goalsAgainst > 0) btts += 1;
      }
      return { sample: rows.length, team_id: teamId, opponent_team_id: opponentId, wins, draws, losses, under_2_5: under, btts, source: 'Understat', window: 'last_5_H2H_before_kickoff' };
    };

    const highScoreIntelligence = (matchId: number) => {
      if (highScoreError || highScoreRunError) {
        return { available: false, reason: 'C0197 high-score research unavailable', research_only: true, model_effect_enabled: false };
      }
      const rows = highScoreByMatch.get(String(matchId)) || [];
      const find = (experimentKey: string, variantKey: string) => rows.find((row: any) => row.experiment_key === experimentKey && row.variant_key === variantKey) || null;
      const structural = find('V08_SHOOTOUT_DEMOLITION_ROUTER', 'A_STRUCTURAL');
      const disruption = find('V08_SHOOTOUT_DEMOLITION_ROUTER', 'B_PLUS_DISRUPTION');
      if (!structural || !disruption) {
        return { available: false, reason: 'No frozen C0197 router snapshot for this fixture', research_only: true, model_effect_enabled: false };
      }

      const variant = (row: any) => ({
        variant_key: row.variant_key,
        route: row.route === 'SHOOTOUT' || row.route === 'DEMOLITION' ? row.route : null,
        score: numeric(row.score),
        rank: numeric(row.rank),
        favorite: typeof row.features?.favorite === 'string' ? row.features.favorite : null,
        favorite_probability: numeric(row.features?.favorite_probability),
      });
      const a = variant(structural);
      const b = variant(disruption);
      const routeAgreement = a.route != null && a.route === b.route;
      const scores = [a.score, b.score].filter((value): value is number => value != null);
      const ranks = [a.rank, b.rank].filter((value): value is number => value != null);
      const minimumScore = scores.length ? Math.min(...scores) : null;
      const maximumScore = scores.length ? Math.max(...scores) : null;
      const worstRank = ranks.length ? Math.max(...ranks) : null;

      let archetype: 'SHOOTOUT' | 'DEMOLITION' | 'MIXED' | 'NO_STRONG_SIGNAL' = 'NO_STRONG_SIGNAL';
      if (maximumScore != null && maximumScore > 0) {
        archetype = routeAgreement && a.route ? a.route : 'MIXED';
      }

      let strength: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (archetype !== 'NO_STRONG_SIGNAL' && archetype !== 'MIXED' && minimumScore != null && worstRank != null) {
        if (minimumScore >= 1 && worstRank <= 2) strength = 'VERY_HIGH';
        else if (minimumScore >= 0.75 && worstRank <= 5) strength = 'HIGH';
        else if (minimumScore > 0 && worstRank <= 7) strength = 'MEDIUM';
      }

      const v04 = find('V04_ADAPTIVE_HISTORY_DECAY', 'MAX4');
      const v05 = find('V05_TACTICAL_CLASH', 'B_PLUS_DISRUPTION');
      const v06 = find('V06_EXPECTED_ATTACK_UNIT_DELTA', 'ATTACK_UNIT_DELTA');
      const supportRanks = [numeric(v04?.rank), numeric(v05?.rank), numeric(v06?.rank)].filter((value): value is number => value != null);
      const supportMedianRank = median(supportRanks);
      const v05Confidence = numeric(v05?.confidence);

      let agreement: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (routeAgreement && minimumScore != null && minimumScore > 0) {
        if (archetype === 'SHOOTOUT') {
          if (supportMedianRank != null && supportMedianRank <= 3 && (v05Confidence ?? 0) >= 0.5) agreement = 'HIGH';
          else if (supportMedianRank != null && supportMedianRank <= 6 && (v05Confidence ?? 0) >= 0.4) agreement = 'MEDIUM';
        } else if (archetype === 'DEMOLITION') {
          if (strength === 'VERY_HIGH') agreement = 'HIGH';
          else if (strength === 'HIGH' || strength === 'MEDIUM') agreement = 'MEDIUM';
        }
      }

      const favorite = a.favorite || b.favorite;
      const note = archetype === 'SHOOTOUT'
        ? 'Two-sided 6+ goal route.'
        : archetype === 'DEMOLITION'
          ? `${favorite || 'Favorite'} one-sided 6+ goal route.`
          : archetype === 'MIXED'
            ? 'Router variants disagree on the high-score archetype.'
            : 'No strong 6+ goal signal from the frozen router.';

      return {
        available: true,
        source_change_id: 'C0197',
        frozen_at: frozenAt,
        prediction_semantics: 'research_high_score_archetype_not_probability',
        archetype,
        strength,
        agreement,
        note,
        router: { structural: a, disruption: b },
        supporting_models: {
          adaptive_history_rank: numeric(v04?.rank),
          tactical_clash_rank: numeric(v05?.rank),
          tactical_clash_confidence: v05Confidence,
          attack_unit_rank: numeric(v06?.rank),
          median_support_rank: supportMedianRank,
        },
        research_only: true,
        model_effect_enabled: false,
      };
    };

    const side = (matchId: number, teamId: number, kickoff: string) => {
      const tactic = (tacticsBySide.get(`${matchId}:${teamId}`) || [])[0] || null;
      const signals = (matchupsBySide.get(`${matchId}:${teamId}`) || []).map((row: any) => ({
        signal_family: row.signal_family,
        signal_key: row.signal_key,
        score_type: row.score_type,
        score: row.score,
        direction: row.direction,
        attacking_component: row.attacking_component,
        resistance_component: row.resistance_component,
        confidence: row.confidence,
        data_coverage: row.data_coverage,
        captured_at: row.captured_at,
        evidence_cutoff: row.evidence_cutoff,
        technical_evidence: row.evidence,
        model_effect_enabled: false,
      }));
      const expectedXi = (availabilityBySide.get(`${matchId}:${teamId}`) || [])
        .filter((row: any) => row.expected_xi === true)
        .map((row: any) => {
          const player = playerMap.get(Number(row.player_id));
          const role = (rolesByPlayer.get(`${matchId}:${teamId}:${row.player_id}`) || [])[0] || null;
          return {
            player_id: row.player_id,
            name: player?.web_name || null,
            position: player?.position || null,
            availability_status: row.availability_status,
            chance_of_playing: row.chance_of_playing,
            p_start: row.base_start_probability,
            xmin: row.base_expected_minutes,
            availability_confidence: row.confidence,
            role: role ? {
              taxonomy_version: role.taxonomy_version,
              primary: role.primary_role,
              secondary: role.secondary_role,
              primary_score: role.primary_score,
              secondary_score: role.secondary_score,
              confidence: role.confidence,
            } : null,
          };
        });
      const replacementResearch = (replacementsBySide.get(`${matchId}:${teamId}`) || [])
        .map((row: any) => ({
          target_player_id: row.target_player_id,
          target_name: playerMap.get(Number(row.target_player_id))?.web_name || null,
          candidate_player_id: row.candidate_player_id,
          candidate_name: playerMap.get(Number(row.candidate_player_id))?.web_name || null,
          candidate_rank: row.candidate_rank,
          target_role: row.target_primary_role,
          candidate_role: row.candidate_primary_role,
          role_fit_score: row.role_fit_score,
          production_continuity_score: row.production_continuity_score,
          composite_score: row.composite_score,
          quality_status: row.quality_status,
          confidence: row.confidence,
          captured_at: row.captured_at,
          technical_evidence: row.evidence,
          model_effect_enabled: false,
        }))
        .sort((a: any, b: any) => Number(a.target_player_id) - Number(b.target_player_id) || Number(a.candidate_rank) - Number(b.candidate_rank));
      return {
        tactical_profile: tactic ? {
          taxonomy_version: tactic.taxonomy_version,
          style_label: tactic.style_label,
          possession_control: tactic.possession_control_score,
          directness: tactic.directness_score,
          width: tactic.width_score,
          attacking_box_occupation: tactic.box_pressure_score,
          set_piece: tactic.set_piece_score,
          defensive_block: tactic.defensive_block_score,
          confidence: tactic.confidence,
          captured_at: tactic.captured_at,
          technical_evidence: tactic.evidence,
          model_effect_enabled: false,
        } : null,
        matchup_signals: signals,
        expected_xi: expectedXi,
        replacement_research: replacementResearch,
        recent_form: recentForm(teamId, kickoff),
        research_only: true,
        model_effect_enabled: false,
      };
    };

    const fixtures = matches.map((match: any) => {
      const home = teamMap.get(Number(match.home_team_id));
      const away = teamMap.get(Number(match.away_team_id));
      return {
        match_id: match.id,
        gameweek: match.gameweek,
        kickoff_time: match.kickoff_time,
        frozen: new Date(match.kickoff_time) <= now,
        finished: Boolean(match.finished),
        home_score: match.home_score,
        away_score: match.away_score,
        h2h: h2hSummary(Number(match.home_team_id), Number(match.away_team_id), match.kickoff_time),
        high_score_intelligence: highScoreIntelligence(Number(match.id)),
        home_team: { id: match.home_team_id, name: home?.name || null, short_name: home?.short_name || null, ...side(Number(match.id), Number(match.home_team_id), match.kickoff_time) },
        away_team: { id: match.away_team_id, name: away?.name || null, short_name: away?.short_name || null, ...side(Number(match.id), Number(match.away_team_id), match.kickoff_time) },
      };
    });

    return new Response(JSON.stringify({
      ok: true,
      gameweek,
      available_gameweeks: gameweeks,
      research_only: true,
      model_effect_enabled: false,
      contract_version: 'fixture_intelligence_v0.3',
      limitations: [
        'high-score intelligence is a frozen research archetype signal, not a calibrated probability',
        'C0197 high-score intelligence does not alter production fixture or FPL projections',
        'no exact tactical formation',
        'no left/right flank assignment',
        'no defensive pressing intensity',
        'no defensive line height',
        'replacement ability/tactical consequence not validated',
      ],
      fixtures,
    }), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: cors });
  }
});
