-- Private storage bucket for raw interview audio uploaded from the mobile
-- app. The mobile client uploads to <user_id>/<timestamp>.m4a and the
-- interview-grade-answer edge function signs a 30-minute URL server-side.
-- Bucket is private (no public read) and locked down to authenticated
-- users writing only inside their own user_id prefix.

insert into storage.buckets (id, name, public)
values ('interview-audio', 'interview-audio', false)
on conflict (id) do nothing;

drop policy if exists "interview_audio_owner_insert" on storage.objects;
create policy "interview_audio_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'interview-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "interview_audio_owner_read" on storage.objects;
create policy "interview_audio_owner_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'interview-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
