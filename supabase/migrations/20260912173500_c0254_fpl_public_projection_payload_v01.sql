-- C0254: compact UI-serving projection surface.
-- The production model continues to write the full immutable features JSON to model_predictions.
-- This view exposes only fields consumed by the public FPL UI so the Edge function does not
-- transfer ~2.2 MB of internal feature blobs from PostgREST on every current-GW request.

create or replace view public.fpl_public_projection_payload_v01
with (security_invoker = true)
as
select
  mp.prediction_run_id,
  mp.player_id,
  mp.expected_points,
  mp.p_blank,
  mp.p_5_plus,
  mp.p_10_plus,
  mp.p_15_plus,
  mp.p_20_plus,
  mp.p_start,
  mp.p_goal,
  mp.p_assist,
  mp.p_clean_sheet,
  mp.p_dc,
  mp.p_bonus,
  mp.expected_minutes,
  mp.confidence,
  nullif(mp.features -> 'point_distribution' ->> 'q90', '')::numeric as q90,
  nullif(mp.features -> 'point_distribution' ->> 'q95', '')::numeric as q95,
  mp.features -> 'point_distribution' ->> 'version' as distribution_version,
  mp.features ->> 'tail_semantics' as tail_semantics
from public.model_predictions mp;

revoke all on public.fpl_public_projection_payload_v01 from anon, authenticated;
grant select on public.fpl_public_projection_payload_v01 to service_role;

comment on view public.fpl_public_projection_payload_v01 is
  'C0254 serving-only projection payload. Removes internal model feature blobs while preserving explicit current-event distribution outputs required by v2.';
