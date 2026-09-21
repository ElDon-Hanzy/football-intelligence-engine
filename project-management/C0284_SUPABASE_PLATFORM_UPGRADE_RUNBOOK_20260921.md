# C0284 Supabase Platform Upgrade Runbook

## Purpose

Apply Supabase's platform release that remediates the known JWT/API-Gateway incident, without weakening C0284 publication or changing historical forecasts.

## Pre-upgrade state

- Production project: `knooiwezzsxcwhtjtdap` (Football Intelligence).
- PostgreSQL: 17.6. The dashboard reports a newer eligible platform/Postgres release.
- Supabase blocks upgrade because C0213 governance views depend on `pg_cron`.
- The C0284 forward writer is cron job 6 and remains active. Legacy C0166 job 20 remains paused.
- The bridge migration snapshots only private C0213 governance views. It never copies, rewrites, or publishes forecasts.

## Execution order

1. Apply `20260921235000_c0284_supabase_platform_upgrade_cron_bridge_v01.sql`.
2. Confirm the dashboard no longer reports `pg_cron`-dependent objects as an upgrade prerequisite.
3. Start the dashboard upgrade. Do not run prediction writers or release Pages while the project is offline.
4. After Supabase reports success, apply `20260921235001_c0284_supabase_platform_upgrade_cron_restore_v01.sql`.
5. Verify extension availability, active C0284 job 6, paused job 20, frozen GW6 lineage, and the protected live smoke before any Pages retry.

## Rollback posture

If the Supabase upgrade fails, its documented process restores the original database. The snapshots leave C0213 reporting available during the attempt. Do not apply the restore migration until the platform reports a successful upgrade.
