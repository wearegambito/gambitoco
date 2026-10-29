-- Public bucket for the design portfolio (/services/design/) media: images, gifs, videos.
-- Public read via public URLs; only the admin can write (same pattern as case-studies).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 52428800,
        array['image/webp','image/jpeg','image/png','image/gif','image/avif','video/mp4','video/webm'])
on conflict (id) do nothing;

create policy "admin list portfolio media" on storage.objects for select
  using (bucket_id = 'portfolio' and (auth.jwt() ->> 'email') = 'armic@gambito.co.nz');
create policy "admin upload portfolio media" on storage.objects for insert
  with check (bucket_id = 'portfolio' and (auth.jwt() ->> 'email') = 'armic@gambito.co.nz');
create policy "admin update portfolio media" on storage.objects for update
  using (bucket_id = 'portfolio' and (auth.jwt() ->> 'email') = 'armic@gambito.co.nz');
create policy "admin delete portfolio media" on storage.objects for delete
  using (bucket_id = 'portfolio' and (auth.jwt() ->> 'email') = 'armic@gambito.co.nz');
