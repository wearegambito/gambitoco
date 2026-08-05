-- Lead capture for campaign landing pages / lead magnets.
-- Leads are written ONLY by the `deliver-lead-magnet` edge function using the
-- service role (which bypasses RLS). RLS is enabled with no anon/authenticated
-- write policies, so the table is not directly insertable from the browser.
-- The admin (authenticated) may read leads for the CMS "Leads" view.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  source text,            -- campaign / landing-page slug the lead came from
  lead_magnet text,       -- which asset/offer they requested
  meta jsonb not null default '{}'::jsonb,  -- EmailOctopus sync status, UTM params, etc.
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_source_idx on public.leads (source);

alter table public.leads enable row level security;

-- Admin can read leads in the CMS. (No insert/update policy: writes go through
-- the service-role edge function only.)
drop policy if exists "admin reads leads" on public.leads;
create policy "admin reads leads"
  on public.leads for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz');
