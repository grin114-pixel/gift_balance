import { useEffect } from 'react'

export default function ConfirmModal({
  message,
  cancelText = '취소',
  confirmText = '확인',
  danger = false,
  onClose,
  onConfirm,
  overlayClassName = '',
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className={`modal-overlay modal-overlay--centered${overlayClassName ? ` ${overlayClassName}` : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="confirm-sheet">
        <p className="confirm-msg">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-btn-ok${danger ? ' confirm-btn-ok--danger' : ''}`}
            onClick={() => { onConfirm(); onClose() }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
