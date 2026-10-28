-- Design service page (/design): content model + lead storage.
-- Applied to the remote project via MCP; kept here for reproducibility.

create table if not exists public.design_settings (
  id text primary key default 'default',
  ad_headline text not null default '',
  hero_subhead text not null default '',
  capacity_count int not null default 2,
  next_opening text not null default '',
  starting_price text not null default '',
  reply_time_text text not null default 'within an hour',
  booking_url text not null default '/book/',
  budget_bands jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.design_case_studies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  client_name text not null default '',
  client_type text not null default 'startup',      -- startup | corporate
  attribution text not null default 'gambito',       -- gambito | employed | agency
  attribution_company text not null default '',
  year int,
  summary text not null default '',
  problem text not null default '',
  what_i_built text not null default '',
  system_tags jsonb not null default '[]'::jsonb,
  timeline text not null default '',
  result text not null default '',
  testimonial_quote text not null default '',
  testimonial_name text not null default '',
  testimonial_role text not null default '',
  hero_image text not null default '',
  gallery jsonb not null default '[]'::jsonb,         -- [{url, alt}]
  live_url text not null default '',
  can_show_work boolean not null default true,
  can_show_logo boolean not null default true,
  featured boolean not null default false,
  order_index int not null default 0,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.design_logos (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  logo_svg text not null default '',                 -- inline SVG or image URL
  can_show_logo boolean not null default true,
  order_index int not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.design_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null default '',
  answer text not null default '',
  order_index int not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.design_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null default '',
  whatsapp text not null default '',
  business text not null default '',
  stage text not null default '',
  needs jsonb not null default '[]'::jsonb,
  budget text not null default '',
  message text not null default '',
  meta jsonb not null default '{}'::jsonb,            -- utm_*, fbclid, page_url, timestamp
  created_at timestamptz not null default now()
);

alter table public.design_settings enable row level security;
alter table public.design_case_studies enable row level security;
alter table public.design_logos enable row level security;
alter table public.design_faqs enable row level security;
alter table public.design_leads enable row level security;

create policy "public read design_settings" on public.design_settings for select using (true);
create policy "admin write design_settings" on public.design_settings for all
  using ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz') with check ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz');

create policy "public read published design_case_studies" on public.design_case_studies for select using (published = true);
create policy "admin write design_case_studies" on public.design_case_studies for all
  using ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz') with check ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz');

create policy "public read published design_logos" on public.design_logos for select using (published = true);
create policy "admin write design_logos" on public.design_logos for all
  using ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz') with check ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz');

create policy "public read published design_faqs" on public.design_faqs for select using (published = true);
create policy "admin write design_faqs" on public.design_faqs for all
  using ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz') with check ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz');

create policy "admin reads design_leads" on public.design_leads for select
  using ((auth.jwt() ->> 'email') = 'armic@gambito.co.nz');
