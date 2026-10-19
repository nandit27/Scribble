-- Scribble: Supabase schema for synced sessions (todo.md item 1: "Add auth").
-- Run this once in the Supabase SQL editor for your project.
--
-- Model: one session row per user (matches the app's current single-session scope).
-- Multi-session support is a natural follow-up once this is in place.

create table if not exists public.sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_name text,
  data jsonb not null default '{}'::jsonb,
  pdf_path text,
  updated_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Users can read their own session"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own session"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own session"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own session"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- Private storage bucket for uploaded PDFs. Objects are stored as "{user_id}/{filename}",
-- and the policies below restrict access to the folder matching the signed-in user's id.
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

create policy "Users can read their own PDFs"
  on storage.objects for select
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own PDFs"
  on storage.objects for insert
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can replace their own PDFs"
  on storage.objects for update
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own PDFs"
  on storage.objects for delete
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
