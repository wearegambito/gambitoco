-- Campaign landing pages. Each page ships full copy in static HTML; a row here
-- holds per-field `content` overrides that hydrate at runtime (see src/landing.js).
-- Public reads published pages (anon key); admin manages them.

create table if not exists public.landing_pages (
  slug text primary key,
  published boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.landing_pages enable row level security;

drop policy if exists "public reads published landing pages" on public.landing_pages;
create policy "public reads published landing pages"
  on public.landing_pages for select
  using (published = true);

drop policy if exists "admin manages landing pages" on public.landing_pages;
create policy "admin manages landing pages"
  on public.landing_pages for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz')
  with check ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz');

insert into public.landing_pages (slug, published, content)
values ('idea-to-launch', true, '{}'::jsonb)
on conflict (slug) do nothing;
