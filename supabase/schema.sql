-- =============================================================
--  ベストショット抽出 SaaS — Supabase スキーマ
--  Supabase ダッシュボード → SQL Editor でこのファイル全体を実行する。
--  何度実行しても安全（IF NOT EXISTS / OR REPLACE）。
-- =============================================================

-- ---------- 1. profiles（ユーザーごとのプラン状態） ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'ユーザーのプラン状態。plan/stripe_* はサーバー（Stripe Webhook）のみが更新する。';

create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id);

-- ---------- 2. daily_usage（日本時間の日次利用回数） ----------
create table if not exists public.daily_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

comment on table public.daily_usage is '無料プランの1日3本制限のカウント。usage_date は Asia/Tokyo の日付。';

create index if not exists daily_usage_date_idx on public.daily_usage (usage_date);

-- ---------- 3. updated_at 自動更新 ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists daily_usage_touch_updated_at on public.daily_usage;
create trigger daily_usage_touch_updated_at
  before update on public.daily_usage
  for each row execute function public.touch_updated_at();

-- ---------- 4. 新規ユーザー作成時に profiles を自動生成 ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 5. RLS（行レベルセキュリティ） ----------
alter table public.profiles enable row level security;
alter table public.daily_usage enable row level security;

-- 自分のプロフィールは読める（プラン表示用）
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- ログイン直後など、自分のプロフィール行だけは作成できる
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 自分の利用回数は読める（残り回数表示用）
drop policy if exists "daily_usage_select_own" on public.daily_usage;
create policy "daily_usage_select_own"
  on public.daily_usage for select
  using (auth.uid() = user_id);

-- 更新・削除ポリシーは作らない:
--   plan / stripe_* の変更は service_role（Webhook）だけが行う。
--   daily_usage の加算は下の SQL 関数（service_role のみ実行可）で行う。
--   service_role キーは RLS をバイパスする。

-- ---------- 6. 利用回数の原子的な加算 ----------
-- 戻り値: 加算後の count（1以上）。上限に達している場合は -(現在のcount) - 1。
create or replace function public.consume_daily_usage(
  p_user_id uuid,
  p_day date,
  p_limit integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cur integer;
begin
  insert into public.daily_usage (user_id, usage_date, count)
  values (p_user_id, p_day, 0)
  on conflict (user_id, usage_date) do nothing;

  update public.daily_usage
     set count = count + 1,
         updated_at = now()
   where user_id = p_user_id
     and usage_date = p_day
     and count < p_limit
  returning count into cur;

  if cur is null then
    select count into cur
      from public.daily_usage
     where user_id = p_user_id and usage_date = p_day;
    return -coalesce(cur, 0) - 1;
  end if;

  return cur;
end;
$$;

-- この関数はサーバー（service_role）だけが実行できる。
revoke all on function public.consume_daily_usage(uuid, date, integer) from public;
revoke all on function public.consume_daily_usage(uuid, date, integer) from anon;
revoke all on function public.consume_daily_usage(uuid, date, integer) from authenticated;
grant execute on function public.consume_daily_usage(uuid, date, integer) to service_role;

-- ---------- 7. 確認用 ----------
-- select * from public.profiles limit 5;
-- select * from public.daily_usage order by usage_date desc limit 5;
