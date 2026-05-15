import { useState } from 'react'
import { Pencil, Trash2, History, Check, ImageOff } from 'lucide-react'
import { digitsOnly, formatAmountInput, parseAmountInt } from '../lib/formatAmount'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}.${m}.${d}`
}

function formatMoney(n) {
  return Number(n ?? 0).toLocaleString('ko-KR') + '원'
}

function daysLeft(expiryDateStr) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const exp = new Date(expiryDateStr)
  exp.setHours(0, 0, 0, 0)
  return Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
}

export default function CouponCard({ coupon, onEdit, onRequestDelete, onViewImage, onUseAmount, onViewHistory }) {
  const [usageDigits, setUsageDigits] = useState('')
  const [usageLoading, setUsageLoading] = useState(false)
  const [usageError, setUsageError] = useState('')

  async function handleUse() {
    setUsageError('')
    const amt = parseAmountInt(usageDigits)
    if (!usageDigits || Number.isNaN(amt) || amt <= 0) {
      setUsageError('사용금액을 입력해주세요.')
      return
    }
    if (amt > coupon.balance) {
      setUsageError('잔액보다 클 수 없어요.')
      return
    }
    setUsageLoading(true)
    const { error } = await onUseAmount(coupon, amt)
    setUsageLoading(false)
    if (error) {
      setUsageError('처리 중 오류가 발생했어요.')
    } else {
      setUsageDigits('')
    }
  }

  function handleUsageKeyDown(e) {
    if (e.key === 'Enter') handleUse()
  }

  const expired = daysLeft(coupon.expiry_date) < 0

  return (
    <div className={`coupon-card${expired ? ' coupon-card--expired' : ''}`}>
      {/* Top: coupon name + actions */}
      <div className="coupon-card-top">
        <p className="coupon-card-top-title" title={coupon.name}>
          {coupon.name}
        </p>
        <div className="coupon-card-top-actions">
          <div className="coupon-balance-row coupon-balance-row--top">
            <span className="coupon-balance-label">잔액:</span>
            <span className={`coupon-balance-amount${coupon.balance <= 0 ? ' coupon-balance-amount--zero' : ''}`}>
              {formatMoney(coupon.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Body: image left, info right */}
      <div className="coupon-card-body">
        <div className="coupon-card-left">
          <button
            type="button"
            className="coupon-img-wrap"
            onClick={() => coupon.image_url && onViewImage(coupon.image_url)}
            aria-label="이미지 크게 보기"
            disabled={!coupon.image_url}
          >
            {coupon.image_url ? (
              <img
                src={coupon.image_url}
                alt={coupon.name}
                className="coupon-img"
                loading="lazy"
              />
            ) : (
              <div className="coupon-img-placeholder">
                <ImageOff size={20} />
              </div>
            )}
          </button>
        </div>

        {/* Right: info */}
        <div className="coupon-card-right">
          <p className="coupon-date-line">
            유효기간: {formatDate(coupon.expiry_date)}
          </p>

          <div className="coupon-use-block">
            <div className="coupon-use-row">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="coupon-use-input"
                placeholder="사용금액"
                value={formatAmountInput(usageDigits)}
                onChange={(e) => {
                  setUsageDigits(digitsOnly(e.target.value))
                  setUsageError('')
                }}
                onKeyDown={handleUsageKeyDown}
                disabled={usageLoading || expired}
              />
              <button
                type="button"
                className="coupon-use-btn"
                onClick={handleUse}
                disabled={usageLoading || expired}
                aria-label="사용 확인"
              >
                {usageLoading ? (
                  <span className="coupon-use-spinner" />
                ) : (
                  <Check size={17} strokeWidth={2} />
                )}
              </button>
            </div>
            {usageError && <p className="coupon-use-error">{usageError}</p>}
          </div>

          <div className="coupon-card-actions-row">
            <button
              type="button"
              className="coupon-history-btn"
              onClick={() => onViewHistory(coupon)}
            >
              <History size={13} strokeWidth={1.75} />
              내역보기
            </button>
            <div className="coupon-card-actions-icons">
              <button
                type="button"
                className="coupon-top-icon-btn coupon-top-icon-btn--edit"
                onClick={() => onEdit(coupon)}
                aria-label="수정"
              >
                <Pencil size={11} strokeWidth={1.65} />
              </button>
              <button
                type="button"
                className="coupon-top-icon-btn coupon-top-icon-btn--delete"
                onClick={() => onRequestDelete(coupon)}
                aria-label="삭제"
              >
                <Trash2 size={11} strokeWidth={1.65} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
