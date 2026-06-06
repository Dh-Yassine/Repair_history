-- AutoHistory — run once in Supabase Dashboard → SQL Editor
-- Creates storage buckets used by the API (service role uploads; signed URLs for private files).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'vehicle-photos',
    'vehicle-photos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  ),
  (
    'documents',
    'documents',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  ),
  (
    'shop-proofs',
    'shop-proofs',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Optional: allow authenticated users to read their own files via client SDK (API uses service role).
-- The backend handles all uploads/downloads; these policies are a safety net.

create policy "Public vehicle photos"
on storage.objects for select
using (bucket_id = 'vehicle-photos');

-- Service role uploads bypass RLS; these policies help if you ever use the anon key from the client.
create policy "Allow vehicle photo uploads"
on storage.objects for insert
with check (bucket_id = 'vehicle-photos');

create policy "Allow document uploads"
on storage.objects for insert
with check (bucket_id = 'documents');

create policy "Allow shop proof uploads"
on storage.objects for insert
with check (bucket_id = 'shop-proofs');
