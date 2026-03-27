-- ============================================================
-- TeeBad Database Schema
-- ============================================================

-- Extension สำหรับ UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE 1: users
-- ============================================================
create table if not exists public.users (
  line_user_id  text        primary key,
  display_name  text        not null,
  picture_url   text,
  is_admin      boolean     not null default false,
  total_games   integer     not null default 0,
  total_wins    integer     not null default 0,
  created_at    timestamptz not null default now()
);

comment on table public.users is 'ผู้ใช้งาน LINE ที่ login ผ่าน LIFF';

-- ============================================================
-- TABLE 2: sessions
-- ============================================================
create table if not exists public.sessions (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  date               date        not null,
  start_time         time        not null,
  end_time           time        not null,
  court_count        integer     not null check (court_count between 1 and 8),
  max_players        integer     not null check (max_players > 0),
  fee_per_hour       numeric     not null check (fee_per_hour >= 0),
  billing_mode       text        not null check (billing_mode in ('equal', 'by_games')),
  default_match_mode text        not null check (default_match_mode in ('random', 'rotation', 'winner_stays', 'manual')),
  status             text        not null default 'open' check (status in ('open', 'playing', 'ended')),
  created_by         text        not null references public.users(line_user_id),
  created_at         timestamptz not null default now()
);

comment on table public.sessions is 'รอบก๊วนแบดมินตัน';

-- index สำหรับ filter sessions by date + status
create index if not exists idx_sessions_date_status on public.sessions (date, status);

-- ============================================================
-- TABLE 3: registrations
-- ============================================================
create table if not exists public.registrations (
  id              uuid        primary key default gen_random_uuid(),
  session_id      uuid        not null references public.sessions(id) on delete cascade,
  user_id         text        not null references public.users(line_user_id),
  payment_method  text        not null check (payment_method in ('promptpay', 'transfer', 'onsite')),
  paid_status     text        not null default 'pending' check (paid_status in ('pending', 'approved', 'rejected', 'onsite')),
  slip_url        text,
  amount_due      numeric,
  games_played    integer     not null default 0,
  checked_in      boolean     not null default false,
  checked_in_at   timestamptz,
  joined_at       timestamptz not null default now(),
  unique (session_id, user_id)
);

comment on table public.registrations is 'การลงทะเบียนเข้าร่วมก๊วน';

create index if not exists idx_registrations_session_status on public.registrations (session_id, paid_status);
create index if not exists idx_registrations_user on public.registrations (user_id);

-- ============================================================
-- TABLE 4: matches
-- ============================================================
create table if not exists public.matches (
  id             uuid        primary key default gen_random_uuid(),
  session_id     uuid        not null references public.sessions(id) on delete cascade,
  court_number   integer     not null check (court_number >= 1),
  round_number   integer     not null check (round_number >= 1),
  match_mode     text        not null check (match_mode in ('random', 'rotation', 'winner_stays', 'manual')),
  team1_players  text[]      not null default '{}',
  team2_players  text[]      not null default '{}',
  score1         integer     not null default 0,
  score2         integer     not null default 0,
  winner         integer     check (winner in (1, 2)),
  status         text        not null default 'playing' check (status in ('playing', 'done')),
  started_at     timestamptz not null default now(),
  ended_at       timestamptz
);

comment on table public.matches is 'แมทช์การแข่งขันในแต่ละรอบ';

create index if not exists idx_matches_session_status_round on public.matches (session_id, status, round_number);
-- GIN index สำหรับ query ว่า user คนนี้เล่นใน match ไหนบ้าง
create index if not exists idx_matches_team1_gin on public.matches using gin (team1_players);
create index if not exists idx_matches_team2_gin on public.matches using gin (team2_players);

-- ============================================================
-- TABLE 5: payments
-- ============================================================
create table if not exists public.payments (
  id               uuid        primary key default gen_random_uuid(),
  registration_id  uuid        not null references public.registrations(id) on delete cascade,
  amount           numeric     not null check (amount > 0),
  slip_url         text,
  status           text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by      text        references public.users(line_user_id),
  approved_at      timestamptz,
  created_at       timestamptz not null default now()
);

comment on table public.payments is 'การชำระเงินและหลักฐานการโอน';

create index if not exists idx_payments_registration on public.payments (registration_id);
create index if not exists idx_payments_status on public.payments (status);

-- ============================================================
-- TABLE 6: partner_locks
-- ============================================================
create table if not exists public.partner_locks (
  id                   uuid        primary key default gen_random_uuid(),
  session_id           uuid        not null references public.sessions(id) on delete cascade,
  user1_id             text        not null references public.users(line_user_id),
  user2_id             text        not null references public.users(line_user_id),
  lock_type            text        not null check (lock_type in ('same_team', 'opponents', 'avoid')),
  confirmed_by_user2   boolean     not null default false,
  created_at           timestamptz not null default now(),
  check (user1_id <> user2_id)
);

comment on table public.partner_locks is 'ล็อคคู่เล่น: เล่นด้วยกัน, เล่นฝั่งตรงข้าม, หรือหลีกเลี่ยง';

create index if not exists idx_locks_session on public.partner_locks (session_id);
create index if not exists idx_locks_user1 on public.partner_locks (user1_id);
create index if not exists idx_locks_user2 on public.partner_locks (user2_id);

-- ============================================================
-- TABLE 7: notifications_log
-- ============================================================
create table if not exists public.notifications_log (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null references public.users(line_user_id),
  type        text        not null check (type in ('registration_confirmed', 'payment_approved', 'session_reminder', 'personal_bill', 'outstanding_reminder')),
  session_id  uuid        references public.sessions(id) on delete set null,
  sent_at     timestamptz not null default now(),
  success     boolean     not null default true
);

comment on table public.notifications_log is 'บันทึกการส่ง LINE Service Messages';

create index if not exists idx_notif_user_type_session on public.notifications_log (user_id, type, session_id);
create index if not exists idx_notif_sent_at on public.notifications_log (sent_at);

-- ============================================================
-- VIEW: player_stats (คำนวณจาก matches จริง)
-- ============================================================
create or replace view public.player_stats as
select
  u.line_user_id,
  u.display_name,
  u.picture_url,
  count(distinct m.id) filter (
    where u.line_user_id = any(m.team1_players) or u.line_user_id = any(m.team2_players)
  ) as games_played,
  count(distinct m.id) filter (
    where (m.winner = 1 and u.line_user_id = any(m.team1_players))
       or (m.winner = 2 and u.line_user_id = any(m.team2_players))
  ) as wins,
  count(distinct m.id) filter (
    where m.status = 'done'
    and (
      (m.winner = 2 and u.line_user_id = any(m.team1_players))
      or (m.winner = 1 and u.line_user_id = any(m.team2_players))
    )
  ) as losses,
  case
    when count(distinct m.id) filter (
      where u.line_user_id = any(m.team1_players) or u.line_user_id = any(m.team2_players)
    ) = 0 then 0
    else round(
      count(distinct m.id) filter (
        where (m.winner = 1 and u.line_user_id = any(m.team1_players))
           or (m.winner = 2 and u.line_user_id = any(m.team2_players))
      )::numeric /
      count(distinct m.id) filter (
        where u.line_user_id = any(m.team1_players) or u.line_user_id = any(m.team2_players)
      )::numeric * 100,
      1
    )
  end as win_rate
from public.users u
left join public.matches m on m.status = 'done'
group by u.line_user_id, u.display_name, u.picture_url;

comment on view public.player_stats is 'สถิติผู้เล่นแต่ละคน คำนวณจาก matches';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users           enable row level security;
alter table public.sessions        enable row level security;
alter table public.registrations   enable row level security;
alter table public.matches         enable row level security;
alter table public.payments        enable row level security;
alter table public.partner_locks   enable row level security;
alter table public.notifications_log enable row level security;

-- users: อ่านได้ทุกคน, แก้ได้เฉพาะตัวเอง
create policy "users_select_all" on public.users for select using (true);
create policy "users_insert_own" on public.users for insert with check (line_user_id = auth.uid()::text);
create policy "users_update_own" on public.users for update using (line_user_id = auth.uid()::text);

-- sessions: อ่านได้ทุกคน, เขียนได้เฉพาะ admin (enforce ใน backend middleware)
create policy "sessions_select_all" on public.sessions for select using (true);
create policy "sessions_insert_admin" on public.sessions for insert with check (true); -- enforce ใน backend
create policy "sessions_update_admin" on public.sessions for update using (true);      -- enforce ใน backend
create policy "sessions_delete_admin" on public.sessions for delete using (true);      -- enforce ใน backend

-- registrations: อ่านได้ทุกคน, เขียนได้เฉพาะตัวเอง
create policy "registrations_select_all" on public.registrations for select using (true);
create policy "registrations_insert_own" on public.registrations for insert with check (user_id = auth.uid()::text);
create policy "registrations_delete_own" on public.registrations for delete using (user_id = auth.uid()::text);
create policy "registrations_update_admin" on public.registrations for update using (true); -- backend only

-- matches: อ่านได้ทุกคน, เขียนได้ admin
create policy "matches_select_all" on public.matches for select using (true);
create policy "matches_write_admin" on public.matches for all using (true); -- enforce ใน backend

-- payments: เห็นเฉพาะของตัวเอง หรือ admin
create policy "payments_select_own" on public.payments for select using (
  registration_id in (
    select id from public.registrations where user_id = auth.uid()::text
  )
);
create policy "payments_insert_own" on public.payments for insert with check (true); -- backend validates

-- partner_locks: เห็นเฉพาะที่เกี่ยวข้อง
create policy "locks_select_involved" on public.partner_locks for select using (
  user1_id = auth.uid()::text or user2_id = auth.uid()::text
);
create policy "locks_write_involved" on public.partner_locks for all using (
  user1_id = auth.uid()::text or user2_id = auth.uid()::text
);

-- notifications_log: เห็นเฉพาะของตัวเอง
create policy "notif_select_own" on public.notifications_log for select using (
  user_id = auth.uid()::text
);

-- ============================================================
-- REALTIME: เปิดใช้บน matches + registrations เท่านั้น
-- ============================================================
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.registrations;

-- ============================================================
-- MIGRATIONS (เพิ่ม column ใน table ที่มีอยู่แล้ว)
-- ============================================================

-- 2026-03-27: เพิ่มระบบ check-in
alter table public.registrations
  add column if not exists checked_in     boolean     not null default false,
  add column if not exists checked_in_at  timestamptz;
