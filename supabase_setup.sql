-- ============================================================
-- 잔액얼마 앱 — Supabase 한 번에 설정용 SQL
-- 사용법: Supabase 대시보드 → SQL Editor → New query →
--         이 파일 전체를 붙여넣기 → Run (한 번 실행)
-- 이미 일부가 있으면 DROP IF EXISTS 로 다시 맞출 수 있게 되어 있습니다.
-- 로그인 없이 사용합니다 (coupons / usage_history / coupon-images 만).
-- ============================================================

-- ── 1. 테이블: coupons ─────────────────────────────────────
create table if not exists public.coupons (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid,
  name          text not null,
  expiry_date   date not null,
  balance       bigint not null default 0,
  image_url     text,
  created_at    timestamptz default now() not null
);

-- ── 2. 테이블: usage_history ───────────────────────────────
create table if not exists public.usage_history (
  id            uuid default gen_random_uuid() primary key,
  coupon_id     uuid references public.coupons(id) on delete cascade not null,
  user_id       uuid,
  amount        bigint not null,
  memo          text,
  used_at       timestamptz default now() not null
);

-- ── 3. 테이블 RLS (로그인 없이 anon 접근) ───────────────────
alter table public.coupons enable row level security;
alter table public.usage_history enable row level security;

drop policy if exists "coupons_select_own" on public.coupons;
drop policy if exists "coupons_insert_own" on public.coupons;
drop policy if exists "coupons_update_own" on public.coupons;
drop policy if exists "coupons_delete_own" on public.coupons;
drop policy if exists "coupons_public_all" on public.coupons;

create policy "coupons_public_all" on public.coupons
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "history_select_own" on public.usage_history;
drop policy if exists "history_insert_own" on public.usage_history;
drop policy if exists "history_delete_own" on public.usage_history;
drop policy if exists "history_update_own" on public.usage_history;
drop policy if exists "history_public_all" on public.usage_history;

create policy "history_public_all" on public.usage_history
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ── 4. Storage 버킷: coupon-images (공개 읽기) ────────────
insert into storage.buckets (id, name, public)
values ('coupon-images', 'coupon-images', true)
on conflict (id) do update set public = excluded.public;

-- ── 5. Storage RLS (로그인 없이 업로드/삭제) ───────────────
drop policy if exists "coupon_images_public_read" on storage.objects;
drop policy if exists "coupon_images_auth_insert_own" on storage.objects;
drop policy if exists "coupon_images_auth_delete_own" on storage.objects;
drop policy if exists "coupon_images_auth_update_own" on storage.objects;
drop policy if exists "coupon_images_anon_insert" on storage.objects;
drop policy if exists "coupon_images_anon_delete" on storage.objects;
drop policy if exists "coupon_images_anon_update" on storage.objects;

create policy "coupon_images_public_read"
  on storage.objects
  for select
  using (bucket_id = 'coupon-images');

create policy "coupon_images_anon_insert"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'coupon-images');

create policy "coupon_images_anon_delete"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'coupon-images');

create policy "coupon_images_anon_update"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'coupon-images')
  with check (bucket_id = 'coupon-images');
