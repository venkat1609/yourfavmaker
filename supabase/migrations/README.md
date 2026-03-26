# Supabase migrations

This project uses the standard additive migration flow in `supabase/migrations`.

For future schema changes:

1. Create a new timestamped SQL file in this folder.
1. Put only the incremental change in that file.
1. Keep older migration files untouched so a fresh database can replay the history.

The current latest schema change in this repo is the primary-address migration:

- `20260325121500_1d6d2b8b_primary_addresses.sql`

If you need to start a brand-new Supabase project from the current state, apply the existing migration history in order, then continue adding new migrations here.
