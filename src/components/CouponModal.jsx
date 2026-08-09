import { useState, useRef } from 'react'
import { X, Calendar, ImagePlus, Trash2 } from 'lucide-react'
import { uploadImage, deleteImage } from '../lib/imageUtils'
import { balanceToDigits, digitsOnly, formatAmountInput, parseAmountInt } from '../lib/formatAmount'

/** coupon_book 과 동일: 오늘 날짜를 YYYY-MM-DD (date input 기본값) */
function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function initialExpiresAt(initialData) {
  const raw = initialData?.expiry_date
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return getTodayInputValue()
}

/** 저장값 YYYY-MM-DD → 화면 표시 2026.5.14 (로케일과 무관) */
function formatExpiryDisplayDots(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '날짜 선택'
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}.${m}.${d}`
}

/** 투명 date 대신: 버튼에서 네이티브 달력 열기 */
function openNativeDatePicker(inputEl) {
  if (!inputEl) return
  try {
    if (typeof inputEl.showPicker === 'function') {
      inputEl.showPicker()
      return
    }
  } catch {
    /* secure context 등 */
  }
  inputEl.focus()
  inputEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
}

export default function CouponModal({ onClose, onSave, initialData = null }) {
  const isEdit = !!initialData
  const [expiresAt, setExpiresAt] = useState(() => initialExpiresAt(initialData))

  const [name, setName] = useState(initialData?.name ?? '')
  const [balanceDigits, setBalanceDigits] = useState(() => balanceToDigits(initialData?.balance))
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? '')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(initialData?.image_url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const dateRef = useRef(null)

  function handleDateChange(e) {
    setExpiresAt(e.target.value)
    setError('')
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImagePreview('')
    setImageUrl('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('쿠폰 이름을 입력해주세요.'); return }
    if (!expiresAt?.trim()) {
      setError('사용 기한을 선택해 주세요.')
      return
    }
    const balanceNum = parseAmountInt(balanceDigits)
    if (!balanceDigits || Number.isNaN(balanceNum) || balanceNum < 0) {
      setError('잔액을 올바르게 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      let finalImageUrl = imageUrl

      if (imageFile) {
        if (isEdit && imageUrl && !imageUrl.startsWith('blob:')) {
          await deleteImage(imageUrl)
        }
        finalImageUrl = await uploadImage(imageFile)
      } else if (!imagePreview && isEdit && initialData?.image_url) {
        await deleteImage(initialData.image_url)
        finalImageUrl = ''
      }

      await onSave({
        name: name.trim(),
        expiry_date: expiresAt.trim(),
        balance: balanceNum,
        image_url: finalImageUrl || null,
      })
      onClose()
    } catch (err) {
      setError(err.message || '저장 중 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '쿠폰 수정' : '쿠폰 등록'}</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <form className="modal-form coupon-book-like-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>쿠폰 이름</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </label>

          <div className="field">
            <span id="coupon-expiry-label">사용 기한</span>
            <div className="field-date-shell">
              <input
                ref={dateRef}
                id="coupon-expiry-date"
                type="date"
                className="field-date-sr-native"
                value={expiresAt}
                onChange={handleDateChange}
                tabIndex={-1}
                aria-labelledby="coupon-expiry-label"
              />
              <button
                type="button"
                className="field-date-trigger"
                onClick={() => openNativeDatePicker(dateRef.current)}
              >
                <span className="field-date-text pretendard-num">{formatExpiryDisplayDots(expiresAt)}</span>
                <Calendar size={20} strokeWidth={2} className="field-date-cal-icon" aria-hidden />
              </button>
            </div>
          </div>

          <label className="field">
            <span>잔액 (원)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatAmountInput(balanceDigits)}
              onChange={(e) => {
                setBalanceDigits(digitsOnly(e.target.value))
                setError('')
              }}
            />
          </label>

          <div className="modal-field">
            <span className="field-file-label">쿠폰 이미지</span>
            {imagePreview ? (
              <div className="modal-img-preview-wrap">
                <img src={imagePreview} alt="미리보기" className="modal-img-preview" />
                <button
                  type="button"
                  className="modal-img-remove-btn"
                  onClick={handleRemoveImage}
                  aria-label="이미지 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="modal-img-upload-btn"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={20} />
                <span>이미지 추가</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-cancel" onClick={onClose} disabled={loading}>
              취소
            </button>
            <button type="submit" className="modal-btn-save" disabled={loading}>
              {loading ? '저장 중...' : isEdit ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
