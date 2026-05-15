import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/** Supabase bigint 등 → 안전한 숫자 (잔액·금액 계산용) */
function toNum(v) {
  if (v == null) return 0
  if (typeof v === 'bigint') return Number(v)
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function useCoupons(userId) {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)

  const sortByExpiry = (arr) =>
    [...arr].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))

  const fetchCoupons = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('user_id', userId)
      .order('expiry_date', { ascending: true })
    if (!error && data) setCoupons(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  const addCoupon = async (couponData) => {
    const { data, error } = await supabase
      .from('coupons')
      .insert([{ ...couponData, user_id: userId }])
      .select()
      .single()
    if (!error && data) {
      setCoupons((prev) => sortByExpiry([...prev, data]))
    }
    return { data, error }
  }

  const updateCoupon = async (id, updates) => {
    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setCoupons((prev) => sortByExpiry(prev.map((c) => (c.id === id ? data : c))))
    }
    return { data, error }
  }

  const deleteCoupon = async (id) => {
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (!error) {
      setCoupons((prev) => prev.filter((c) => c.id !== id))
    }
    return { error }
  }

  const useAmount = async (coupon, amount, memo = '') => {
    const amt = Math.round(toNum(amount))
    if (amt < 1) return { error: new Error('금액을 확인해주세요.') }

    const { data: cupFresh, error: cupErr } = await supabase
      .from('coupons')
      .select('balance')
      .eq('id', coupon.id)
      .maybeSingle()
    if (cupErr || !cupFresh) return { error: cupErr ?? new Error('쿠폰을 불러오지 못했어요.') }
    const curBal = Math.round(toNum(cupFresh.balance))
    const newBalance = curBal - amt
    if (newBalance < 0) {
      return { error: new Error('잔액보다 큰 금액은 입력할 수 없어요.') }
    }

    const { error: histErr } = await supabase.from('usage_history').insert([
      {
        coupon_id: coupon.id,
        user_id: userId,
        amount: amt,
        memo: memo || null,
        used_at: new Date().toISOString(),
      },
    ])
    if (histErr) return { error: histErr }

    const { data, error: updErr } = await supabase
      .from('coupons')
      .update({ balance: newBalance })
      .eq('id', coupon.id)
      .select()
      .single()
    if (!updErr && data) {
      setCoupons((prev) => sortByExpiry(prev.map((c) => (c.id === coupon.id ? data : c))))
    }
    return { data, error: updErr }
  }

  const fetchHistory = useCallback(async (couponId) => {
    const { data, error } = await supabase
      .from('usage_history')
      .select('*')
      .eq('coupon_id', couponId)
      .order('used_at', { ascending: false })
    return { data: data ?? [], error }
  }, [userId])

  /** 사용 내역 삭제 → 해당 금액만큼 잔액 복구 */
  const deleteHistoryEntry = useCallback(async (coupon, historyRow) => {
    const { data: rowFresh, error: rowErr } = await supabase
      .from('usage_history')
      .select('id, amount, coupon_id')
      .eq('id', historyRow.id)
      .eq('user_id', userId)
      .maybeSingle()
    if (rowErr) return { error: rowErr }
    if (!rowFresh || rowFresh.coupon_id !== coupon.id) {
      return { error: new Error('사용 내역을 찾지 못했어요.') }
    }

    const amt = Math.round(toNum(rowFresh.amount))
    if (amt <= 0) return { error: new Error('invalid amount') }

    const { data: cupFresh, error: cupErr } = await supabase
      .from('coupons')
      .select('balance')
      .eq('id', coupon.id)
      .maybeSingle()
    if (cupErr || !cupFresh) return { error: cupErr ?? new Error('쿠폰을 불러오지 못했어요.') }
    const curBal = Math.round(toNum(cupFresh.balance))
    const newBalance = curBal + amt

    const { data: deleted, error: delErr } = await supabase
      .from('usage_history')
      .delete()
      .eq('id', historyRow.id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    if (delErr) return { error: delErr }
    if (!deleted) {
      return { error: new Error('삭제되지 않았어요. 권한을 확인해 주세요.') }
    }

    const { data, error: updErr } = await supabase
      .from('coupons')
      .update({ balance: newBalance })
      .eq('id', coupon.id)
      .select()
      .single()
    if (!updErr && data) {
      setCoupons((prev) => sortByExpiry(prev.map((c) => (c.id === coupon.id ? data : c))))
    }
    return { data, error: updErr }
  }, [userId])

  /** 사용 내역 수정(금액·내역·일자) → 잔액 차액 반영 */
  const updateHistoryEntry = useCallback(async (coupon, historyRow, { amount, memo, usedAtIso }) => {
    const { data: rowFresh, error: rowErr } = await supabase
      .from('usage_history')
      .select('id, amount, coupon_id')
      .eq('id', historyRow.id)
      .eq('user_id', userId)
      .maybeSingle()
    if (rowErr) return { error: rowErr }
    if (!rowFresh || rowFresh.coupon_id !== coupon.id) {
      return { error: new Error('사용 내역을 찾지 못했어요.') }
    }

    const { data: cupFresh, error: cupErr } = await supabase
      .from('coupons')
      .select('balance')
      .eq('id', coupon.id)
      .maybeSingle()
    if (cupErr || !cupFresh) return { error: cupErr ?? new Error('쿠폰을 불러오지 못했어요.') }

    const oldAmt = Math.round(toNum(rowFresh.amount))
    const newAmt = amount != null ? Math.round(toNum(amount)) : oldAmt
    if (newAmt < 1) {
      return { error: new Error('사용 금액을 확인해주세요.') }
    }
    const curBal = Math.round(toNum(cupFresh.balance))
    const maxUse = curBal + oldAmt
    if (newAmt > maxUse) {
      return { error: new Error('잔액보다 큰 금액은 입력할 수 없어요.') }
    }

    const payload = { amount: newAmt }
    if (memo !== undefined) payload.memo = memo === '' ? null : memo
    if (usedAtIso != null) payload.used_at = usedAtIso

    const { data: updated, error: histErr } = await supabase
      .from('usage_history')
      .update(payload)
      .eq('id', historyRow.id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()

    if (histErr) return { error: histErr }
    if (!updated) {
      return {
        error: new Error(
          '내역이 저장되지 않았어요. Supabase에서 usage_history UPDATE 정책(history_update_own)이 있는지 확인해 주세요.',
        ),
      }
    }

    const balanceDelta = oldAmt - newAmt
    if (balanceDelta === 0) {
      return { error: null }
    }
    const newBalance = curBal + balanceDelta
    const { data, error: updErr } = await supabase
      .from('coupons')
      .update({ balance: newBalance })
      .eq('id', coupon.id)
      .select()
      .single()
    if (!updErr && data) {
      setCoupons((prev) => sortByExpiry(prev.map((c) => (c.id === coupon.id ? data : c))))
    }
    return { data, error: updErr }
  }, [userId])

  return {
    coupons,
    loading,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    useAmount,
    fetchHistory,
    deleteHistoryEntry,
    updateHistoryEntry,
    refetch: fetchCoupons,
  }
}
