/**
 * Learner data schema. Course content lives in the repository (/content/courses).
 * Applied automatically on the first API request; every statement is idempotent.
 */
export const SCHEMA = [
  `create table if not exists users (
  id bigint generated always as identity primary key,
  email text not null unique,
  password_hash text not null,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  locale text not null default 'ru' check (locale in ('ru', 'en', 'el')),
  created_at timestamptz not null default now()
)`,
  `create table if not exists sessions (
  token_hash text primary key,
  user_id bigint not null references users (id) on delete cascade,
  expires_at timestamptz not null
)`,
  `create index if not exists sessions_user_idx on sessions (user_id)`,
  `create table if not exists step_progress (
  user_id bigint not null references users (id) on delete cascade,
  course_id text not null,
  step_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id, step_key)
)`,
  `create table if not exists quiz_attempts (
  id bigint generated always as identity primary key,
  user_id bigint not null references users (id) on delete cascade,
  course_id text not null,
  step_key text not null,
  passed boolean not null,
  created_at timestamptz not null default now()
)`,
  `create index if not exists quiz_attempts_user_idx on quiz_attempts (user_id, course_id)`,
];
