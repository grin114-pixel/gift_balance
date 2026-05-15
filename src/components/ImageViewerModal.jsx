import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function ImageViewerModal({ url, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="viewer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <button type="button" className="viewer-close-btn" onClick={onClose} aria-label="닫기">
        <X size={22} />
      </button>
      <div className="viewer-img-wrap">
        <img src={url} alt="쿠폰 원본" className="viewer-img" />
      </div>
    </div>
  )
}
