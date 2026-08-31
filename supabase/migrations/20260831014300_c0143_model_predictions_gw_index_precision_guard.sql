drop index if exists public.idx_predictions_gw;
create index idx_predictions_gw on public.model_predictions using btree (gameweek);
comment on index public.idx_predictions_gw is 'C0143: gameweek lookup index only. expected_points remains full immutable numeric data and is deliberately excluded to avoid oversized btree keys from arbitrary-scale numeric projections.';
