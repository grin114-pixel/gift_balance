import { useEffect, useState } from 'react'
import { X, Pencil, Trash2, Check, Undo2 } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import { balanceToDigits, digitsOnly, formatAmountInput, parseAmountInt } from '../lib/formatAmount'

function formatHistoryDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const mo = d.getMonth() + 1
  const day = d.getDate()
  return `${y}.${mo}.${day}`
}

function toDateInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateInputToUsedAtIso(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d, 12, 0, 0, 0).toISOString()
}

function formatMoney(n) {
  return Number(n ?? 0).toLocaleString('ko-KR')
}

export default function HistoryModal({
  coupon,
  fetchHistory,
  updateHistoryEntry,
  deleteHistoryEntry,
  onClose,
}) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rowError, setRowError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editAmountDigits, setEditAmountDigits] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function reloadHistory() {
    const { data, error: err } = await fetchHistory(coupon.id)
    if (err) setRowError('목록을 다시 불러오지 못했어요.')
    else {
      setHistory(data)
      setRowError('')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      setError('')
      const { data, error: err } = await fetchHistory(coupon.id)
      if (cancelled) return
      setLoading(false)
      if (err) setError('내역을 불러오지 못했어요.')
      else setHistory(data)
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [coupon.id, fetchHistory])

  function startEdit(h) {
    setRowError('')
    setEditingId(h.id)
    setEditDate(toDateInputValue(h.used_at))
    setEditAmountDigits(balanceToDigits(h.amount))
  }

  function cancelEdit() {
    setEditingId(null)
    setRowError('')
  }

  async function saveEdit(h) {
    setRowError('')
    const amt = parseAmountInt(editAmountDigits)
    if (!editAmountDigits || Number.isNaN(amt) || amt < 1) {
      setRowError('사용 금액을 입력해주세요.')
      return
    }
    const usedAtIso = dateInputToUsedAtIso(editDate)
    if (!usedAtIso) {
      setRowError('날짜를 선택해주세요.')
      return
    }
    setSaving(true)
    const { error: err } = await updateHistoryEntry(coupon, h, {
      amount: amt,
      usedAtIso,
    })
    setSaving(false)
    if (err) {
      const msg = err && typeof err.message === 'string' ? err.message : '저장하지 못했어요.'
      setRowError(msg)
      return
    }
    setEditingId(null)
    await reloadHistory()
  }

  async function confirmDelete(h) {
    setSaving(true)
    const { error: err } = await deleteHistoryEntry(coupon, h)
    setSaving(false)
    setDeleteTarget(null)
    if (err) {
      const msg = err && typeof err.message === 'string' ? err.message : '삭제하지 못했어요.'
      setRowError(msg)
      return
    }
    await reloadHistory()
  }

  const totalUsed = history.reduce((sum, h) => sum + Number(h.amount), 0)

  return (
    <>
      <div
        className="modal-overlay modal-overlay--centered"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="modal-sheet modal-sheet--history">
          <div className="modal-header modal-header--history">
            <div className="modal-header-text-block">
              <h2 className="modal-title modal-title--history-name">{coupon.name}</h2>
              <p className="modal-history-balance">
                <span className="text-body-secondary">잔액 </span>
                <span className="pretendard-num">{formatMoney(coupon.balance)}원</span>
              </p>
            </div>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="닫기">
              <X size={18} />
            </button>
          </div>

          {rowError && <p className="history-row-error">{rowError}</p>}

          {loading ? (
            <div className="history-loading">
              <div className="adm-spinner" />
            </div>
          ) : error ? (
            <p className="history-error">{error}</p>
          ) : history.length === 0 ? (
            <p className="history-empty">사용 내역이 없어요.</p>
          ) : (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th className="history-th-date">날짜</th>
                    <th className="history-th-amount">사용금액</th>
                    <th className="history-th-actions" scope="col" aria-label="내역 수정·내역 삭제" />
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      {editingId === h.id ? (
                        <>
                          <td className="history-td-edit">
                            <input
                              type="date"
                              className="history-edit-date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                            />
                          </td>
                          <td className="history-td-edit">
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              className="history-edit-amount"
                              value={formatAmountInput(editAmountDigits)}
                              onChange={(e) => setEditAmountDigits(digitsOnly(e.target.value))}
                            />
                          </td>
                          <td className="history-td-actions">
                            <div className="history-actions-row">
                              <button
                                type="button"
                                className="history-icon-btn history-icon-btn--ok"
                                disabled={saving}
                                onClick={() => saveEdit(h)}
                                aria-label="저장"
                              >
                                <Check size={12} strokeWidth={2.25} />
                              </button>
                              <button
                                type="button"
                                className="history-icon-btn"
                                disabled={saving}
                                onClick={cancelEdit}
                                aria-label="취소"
                              >
                                <Undo2 size={12} strokeWidth={2.25} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="history-td-date">{formatHistoryDate(h.used_at)}</td>
                          <td className="history-td-amount">-{formatMoney(h.amount)}원</td>
                          <td className="history-td-actions">
                            <div className="history-actions-row">
                              <button
                                type="button"
                                className="history-icon-btn"
                                onClick={() => startEdit(h)}
                                disabled={!!editingId || saving}
                                aria-label="내역 수정"
                                title="내역 수정"
                              >
                                <Pencil size={12} strokeWidth={2.25} />
                              </button>
                              <button
                                type="button"
                                className="history-icon-btn history-icon-btn--danger"
                                onClick={() => setDeleteTarget(h)}
                                disabled={!!editingId || saving}
                                aria-label="내역 삭제"
                                title="내역 삭제"
                              >
                                <Trash2 size={12} strokeWidth={2.25} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="history-tfoot-row">
                    <td className="history-td-foot-label">합계</td>
                    <td className="history-td-amount">{formatMoney(totalUsed)}원</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmModal
          overlayClassName="modal-overlay--stack"
          message={`이 사용 내역(${formatHistoryDate(deleteTarget.used_at)}, ${formatMoney(deleteTarget.amount)}원)을 삭제할까요?\n삭제하면 잔액에 다시 반영돼요.`}
          cancelText="취소"
          confirmText="삭제"
          danger
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => confirmDelete(deleteTarget)}
        />
      )}
    </>
  )
}
