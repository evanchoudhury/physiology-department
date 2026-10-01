# Department of Physiology — Faculty site

Static site (no build step) backed by **Supabase** (Postgres + Auth).

## Architecture
- **Public site** (`index.html`) reads faculty from Supabase via the REST API using the public **anon key** (safe to expose — Row Level Security protects the data). Falls back to the bundled `data/faculty.json` snapshot if the project is unreachable.
- **Admin** (`admin.html`) signs in with Supabase Auth (email + password) and performs faculty CRUD directly against the `faculty` table. Row Level Security allows public read, but only the admin account can write.
- Config lives in `supabase-config.js` (URL + anon key + admin email). No secrets are committed.

## Supabase project
- Project ref: `nmkriayncwveuvymbxru` (region ap-southeast-1)
- Table: `public.faculty` — RLS on; policies: public `SELECT`, writes restricted to the admin email.
- Admin login email: `admin@physiology.local`
- **Admin password is NOT stored in this repo.** It was delivered separately. Change it any time in the Supabase dashboard → Authentication → Users, or via SQL.

> Free-tier Supabase projects pause after ~1 week of inactivity. If the public list ever looks stale/empty, resume the project in the Supabase dashboard. The static `data/faculty.json` fallback keeps the public list visible while paused (admin edits require the project active).

## Recommended hardening (optional, in Supabase dashboard)
- Authentication → Providers → Email: turn **off** public sign-ups (single-admin site).
- Authentication → enable **leaked-password protection** and **MFA**.

## Deploy
Any static host (e.g. Vercel). No environment variables required — the anon key is public and lives in `supabase-config.js`.
