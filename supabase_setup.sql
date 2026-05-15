-- ============================================================
-- 잔액얼마 앱 — Supabase 한 번에 설정용 SQL
-- 사용법: Supabase 대시보드 → SQL Editor → New query →
--         이 파일 전체를 붙여넣기 → Run (한 번 실행)
-- 이미 일부가 있으면 DROP IF EXISTS 로 다시 맞출 수 있게 되어 있습니다.
-- ============================================================

-- ── 1. 테이블: coupons ─────────────────────────────────────
create table if not exists public.coupons (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
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
  user_id       uuid references auth.users(id) on delete cascade not null,
  amount        bigint not null,
  memo          text,
  used_at       timestamptz default now() not null
);

-- ── 3. 테이블 RLS ──────────────────────────────────────────
alter table public.coupons enable row level security;
alter table public.usage_history enable row level security;

drop policy if exists "coupons_select_own" on public.coupons;
drop policy if exists "coupons_insert_own" on public.coupons;
drop policy if exists "coupons_update_own" on public.coupons;
drop policy if exists "coupons_delete_own" on public.coupons;

create policy "coupons_select_own" on public.coupons
  for select using (auth.uid() = user_id);

create policy "coupons_insert_own" on public.coupons
  for insert with check (auth.uid() = user_id);

create policy "coupons_update_own" on public.coupons
  for update using (auth.uid() = user_id);

create policy "coupons_delete_own" on public.coupons
  for delete using (auth.uid() = user_id);

drop policy if exists "history_select_own" on public.usage_history;
drop policy if exists "history_insert_own" on public.usage_history;
drop policy if exists "history_delete_own" on public.usage_history;
drop policy if exists "history_update_own" on public.usage_history;

create policy "history_select_own" on public.usage_history
  for select using (auth.uid() = user_id);

create policy "history_insert_own" on public.usage_history
  for insert with check (auth.uid() = user_id);

create policy "history_delete_own" on public.usage_history
  for delete using (auth.uid() = user_id);

create policy "history_update_own" on public.usage_history
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. Storage 버킷: coupon-images (공개 읽기) ────────────
-- 앱은 getPublicUrl 로 이미지 주소를 쓰므로 Public 버킷이 맞습니다.
insert into storage.buckets (id, name, public)
values ('coupon-images', 'coupon-images', true)
on conflict (id) do update set public = excluded.public;

-- ── 5. Storage RLS (로그인한 사용자만 본인 폴더에 업로드/삭제) ─
-- 파일 경로 규칙:  {로그인한-사용자-UUID}/{파일명}
-- 앱(imageUtils.js)이 위와 같이 업로드합니다.

drop policy if exists "coupon_images_public_read" on storage.objects;
drop policy if exists "coupon_images_auth_insert_own" on storage.objects;
drop policy if exists "coupon_images_auth_delete_own" on storage.objects;
drop policy if exists "coupon_images_auth_update_own" on storage.objects;

-- 누구나(비로그인 포함) 이 버킷 객체 읽기 — 공개 URL 표시용
create policy "coupon_images_public_read"
  on storage.objects
  for select
  using (bucket_id = 'coupon-images');

-- 로그인 사용자만, 자기 user_id 폴더 아래에 업로드
create policy "coupon_images_auth_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'coupon-images'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- 자기 폴더 파일만 삭제(쿠폰 삭제·이미지 교체 시)
create policy "coupon_images_auth_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'coupon-images'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- 같은 경로로 덮어쓰기/메타 수정이 필요할 때(선택)
create policy "coupon_images_auth_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'coupon-images'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'coupon-images'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );
