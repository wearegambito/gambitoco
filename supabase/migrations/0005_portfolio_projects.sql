-- Design portfolio projects (/services/design/). Only `name` is required; every other
-- text field is optional and hidden on the page when empty.
-- media: ordered JSON array of
--   { type: "image"|"gif"|"video", path, path_sm?, poster?, w, h, span: 1|2, alt?, cap? }
-- where path/path_sm/poster are object paths in the public `portfolio` Storage bucket.
create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (length(trim(name)) > 0),
  tagline text, lede text, client text, year text, scope text, url text, accent text,
  categories text[] not null default '{}',
  services text[] not null default '{}',
  media jsonb not null default '[]'::jsonb,
  order_index int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_projects enable row level security;
create policy "public read published portfolio" on public.portfolio_projects for select
  using (published = true);
create policy "admin write portfolio" on public.portfolio_projects for all
  using ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz')
  with check ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz');

create or replace function public.portfolio_projects_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger portfolio_projects_touch before update on public.portfolio_projects
  for each row execute function public.portfolio_projects_touch();
