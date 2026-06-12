-- DJ Set Builder Supabase schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  genre text not null,
  place text not null,
  time text not null,
  min_bpm int not null,
  max_bpm int not null,
  set_vibe text,
  bpm_range text,
  energy_curve text,
  tracks jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.playlists enable row level security;

drop policy if exists "Users can read own playlists" on public.playlists;
drop policy if exists "Users can insert own playlists" on public.playlists;
drop policy if exists "Users can update own playlists" on public.playlists;
drop policy if exists "Users can delete own playlists" on public.playlists;

create policy "Users can read own playlists"
on public.playlists
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own playlists"
on public.playlists
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own playlists"
on public.playlists
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own playlists"
on public.playlists
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists playlists_user_created_idx
on public.playlists (user_id, created_at desc);
