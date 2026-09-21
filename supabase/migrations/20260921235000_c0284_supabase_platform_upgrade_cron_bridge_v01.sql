-- C0284 / Supabase platform upgrade prerequisite.
--
-- Supabase recreates pg_cron during a platform upgrade.  C0213's private
-- governance views are therefore bridged through same-shape snapshots for
-- the short maintenance window.  This does not change any prediction,
-- publication, FPL, or forecast record.

create table private.c0284_upgrade_cron_components_snapshot_v01 as
select * from private.c0213_active_cron_components_v01;

create table private.c0284_upgrade_cron_runs_snapshot_v01 as
select * from private.c0213_p2_latest_cron_runs_v01;

revoke all on private.c0284_upgrade_cron_components_snapshot_v01 from public, anon, authenticated;
revoke all on private.c0284_upgrade_cron_runs_snapshot_v01 from public, anon, authenticated;
grant select on private.c0284_upgrade_cron_components_snapshot_v01 to service_role;
grant select on private.c0284_upgrade_cron_runs_snapshot_v01 to service_role;

create or replace view private.c0213_active_cron_components_v01 as
select * from private.c0284_upgrade_cron_components_snapshot_v01;

create or replace view private.c0213_p2_latest_cron_runs_v01 as
select * from private.c0284_upgrade_cron_runs_snapshot_v01;
