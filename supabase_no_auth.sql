-- ============================================================
-- 잔액 얼마 — 로그인 없이 사용 (기존 DB에 한 번 실행)
-- coupons / usage_history / coupon-images 버킷만 변경합니다.
-- 다른 앱 테이블·Auth 설정에는 영향 없습니다.
-- ============================================================

-- user_id: 로그인 없이 쓰므로 FK·NOT NULL 해제
alter table public.coupons drop constraint if exists coupons_user_id_fkey;
alter table public.usage_history drop constraint if exists usage_history_user_id_fkey;
alter table public.coupons alter column user_id drop not null;
alter table public.usage_history alter column user_id drop not null;

-- ── coupons RLS ────────────────────────────────────────────
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

-- ── usage_history RLS ──────────────────────────────────────
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

-- ── Storage: coupon-images ─────────────────────────────────
drop policy if exists "coupon_images_auth_insert_own" on storage.objects;
drop policy if exists "coupon_images_auth_delete_own" on storage.objects;
drop policy if exists "coupon_images_auth_update_own" on storage.objects;
drop policy if exists "coupon_images_anon_insert" on storage.objects;
drop policy if exists "coupon_images_anon_delete" on storage.objects;
drop policy if exists "coupon_images_anon_update" on storage.objects;

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
