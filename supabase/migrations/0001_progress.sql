-- Learner accounts come from Supabase Auth (auth.users).
-- Course content lives in the repository (/content/courses); the database stores only learner data.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'ru' check (locale in ('ru', 'en', 'el')),
  role text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.step_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  step_key text not null,           -- "<moduleId>/<stepId>"
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id, step_key)
);

create table if not exists public.quiz_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  step_key text not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, course_id);

alter table public.profiles enable row level security;
alter table public.step_progress enable row level security;
alter table public.quiz_attempts enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id and role = 'learner');
create policy "own progress" on public.step_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own attempts read" on public.quiz_attempts
  for select using (auth.uid() = user_id);
create policy "own attempts insert" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);

-- Admins can read everyone's progress (for the statistics dashboard).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create policy "admin reads progress" on public.step_progress for select using (public.is_admin());
create policy "admin reads attempts" on public.quiz_attempts for select using (public.is_admin());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
