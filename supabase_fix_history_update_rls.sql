-- ============================================================
-- 사용 내역「수정」이 안 될 때: usage_history UPDATE RLS 추가
-- 실행: Supabase → SQL Editor → New query → 전체 붙여넣기 → Run
-- ============================================================

alter table public.usage_history enable row level security;

drop policy if exists "history_update_own" on public.usage_history;

create policy "history_update_own" on public.usage_history
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
