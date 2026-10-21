-- Adds a per-exercise load type so bodyweight exercises can be logged as reps only.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Existing custom exercises become 'weight', so current records are unaffected.

alter table public.exercises
  add column if not exists load_type text not null default 'weight';

alter table public.exercises
  drop constraint if exists exercises_load_type_check;

alter table public.exercises
  add constraint exercises_load_type_check check (load_type in ('weight', 'bodyweight'));
