import { useEffect, useRef, useState } from 'react'
import { Lock, Wallet } from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { useCoupons } from './hooks/useCoupons'
import { deleteImage } from './lib/imageUtils'
import CouponCard from './components/CouponCard'
import CouponModal from './components/CouponModal'
import HistoryModal from './components/HistoryModal'
import ImageViewerModal from './components/ImageViewerModal'
import ConfirmModal from './components/ConfirmModal'
import LoginPage from './components/LoginPage'
import AdminPage from './components/AdminPage'
import './App.css'

const REMEMBER_KEY = 'gift-balance.remember-device'
const SESSION_ONLY_KEY = 'gift-balance.session-only'

function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return pathname
}

function EnvMissingScreen() {
  return (
    <div className="env-missing">
      <div className="env-missing-card">
        <h1 className="env-missing-title">Supabase 설정이 필요해요</h1>
        <p className="env-missing-text">
          <strong>gift_balance</strong> 폴더 안에 <code>.env</code> 파일이 있어야 하고, 아래 두 줄이 비어 있지 않아야 합니다.
        </p>
        <ul className="env-missing-list">
          <li><code>VITE_SUPABASE_URL</code> — Supabase 대시보드 → Project Settings → API → Project URL</li>
          <li><code>VITE_SUPABASE_ANON_KEY</code> — 같은 화면의 anon public 키</li>
        </ul>
        <p className="env-missing-note">
          파일 이름이 <code>.env.txt</code>가 아닌 <code>.env</code>인지 확인하세요. 저장한 뒤 터미널에서 서버를 끄고(Ctrl+C) <code>npm run dev</code>를 다시 실행해야 반영됩니다.
        </p>
        <p className="env-missing-note">
          개발 서버는 보통 <code>http://127.0.0.1:5200/</code> 입니다. 포트가 바쁘면 터미널에 나온 <strong>Local</strong> 주소로 접속하세요.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <EnvMissingScreen />
  }

  const pathname = usePathname()
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <AdminPage
        onBack={() => {
          window.history.pushState({}, '', '/')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}
      />
    )
  }
  return <AuthGate />
}

function AuthGate() {
  const [session, setSession] = useState(undefined)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const passwordRecoveryBypassRef = useRef(false)

  useEffect(() => {
    const syncRecoveryFromUrl = () => {
      if (typeof window === 'undefined') return
      try {
        const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type')
        const fromSearch = new URLSearchParams(window.location.search).get('type')
        if (fromHash === 'recovery' || fromSearch === 'recovery') {
          passwordRecoveryBypassRef.current = true
        }
      } catch {
        /* ignore */
      }
    }
    syncRecoveryFromUrl()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryBypassRef.current = true
        setRecoveryMode(true)
        setSession(sess ?? null)
        return
      }
      setSession(sess ?? null)
      if (event === 'SIGNED_OUT') {
        setRecoveryMode(false)
        passwordRecoveryBypassRef.current = false
        window.localStorage.removeItem(REMEMBER_KEY)
        window.sessionStorage.removeItem(SESSION_ONLY_KEY)
      }
    })

    const runInitialSessionCheck = async () => {
      await new Promise((r) => setTimeout(r, 0))
      syncRecoveryFromUrl()
      const { data } = await supabase.auth.getSession()
      const sess = data.session
      if (sess) {
        const remember = window.localStorage.getItem(REMEMBER_KEY) === 'true'
        const sessionOnly = window.sessionStorage.getItem(SESSION_ONLY_KEY) === 'true'
        if (!remember && !sessionOnly && !passwordRecoveryBypassRef.current) {
          await supabase.auth.signOut()
          setSession(null)
          return
        }
      }
      setSession(sess ?? null)
    }
    void runInitialSessionCheck()

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="auth-shell">
        <div className="auth-checking">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!session || recoveryMode) {
    return (
      <LoginPage
        key={recoveryMode ? 'password-recovery' : 'auth'}
        recoveryMode={recoveryMode}
        onPasswordReset={() => setRecoveryMode(false)}
      />
    )
  }

  return <MainApp session={session} />
}

function MainApp({ session }) {
  const userId = session?.user?.id
  const { coupons, loading, addCoupon, updateCoupon, deleteCoupon, useAmount, fetchHistory, updateHistoryEntry, deleteHistoryEntry } =
    useCoupons(userId)

  const [showCouponModal, setShowCouponModal] = useState(false)
  const [editCoupon, setEditCoupon] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewerUrl, setViewerUrl] = useState(null)
  const [historyTarget, setHistoryTarget] = useState(null)

  const handleSave = async (data) => {
    if (editCoupon) {
      await updateCoupon(editCoupon.id, data)
    } else {
      await addCoupon(data)
    }
    setEditCoupon(null)
  }

  const handleEdit = (coupon) => {
    setEditCoupon(coupon)
    setShowCouponModal(true)
  }

  const handleCloseModal = () => {
    setShowCouponModal(false)
    setEditCoupon(null)
  }

  const handleRequestDelete = (coupon) => {
    setDeleteTarget(coupon)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.image_url) {
      await deleteImage(deleteTarget.image_url)
    }
    await deleteCoupon(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleLock = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      <div className="app">
        <header className="app-header">
          <div className="header-inner">
            <div className="header-left">
              <div className="app-header-brand-grid">
                <span className="app-header-wallet" aria-hidden>
                  <Wallet size={24} strokeWidth={1.75} />
                </span>
                <h1 className="app-title">잔액 얼마</h1>
                <p className="app-header-tagline">내 쿠폰 잔액을 한눈에</p>
              </div>
            </div>
            <div className="header-right">
              <button
                type="button"
                className="header-lock-btn"
                onClick={handleLock}
                title="로그아웃"
                aria-label="로그아웃"
              >
                <Lock size={20} strokeWidth={1.85} aria-hidden />
              </button>
            </div>
          </div>
        </header>

        <main className="main-content main-content--fab">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>불러오는 중...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden>
                <Wallet size={40} strokeWidth={1.5} />
              </span>
              <p>쿠폰을 등록해보세요!</p>
              <p className="empty-sub">오른쪽 아래 + 버튼을 눌러주세요</p>
            </div>
          ) : (
            <div className="coupons-list">
              {coupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  onEdit={handleEdit}
                  onRequestDelete={handleRequestDelete}
                  onViewImage={(url) => setViewerUrl(url)}
                  onUseAmount={useAmount}
                  onViewHistory={(c) => setHistoryTarget(c)}
                />
              ))}
            </div>
          )}
        </main>

        <button
          className="fab"
          onClick={() => { setEditCoupon(null); setShowCouponModal(true) }}
          title="쿠폰 등록"
          aria-label="쿠폰 등록"
        >
          <span className="fab-plus" aria-hidden>+</span>
        </button>
      </div>

      {showCouponModal && (
        <CouponModal
          onClose={handleCloseModal}
          onSave={handleSave}
          initialData={editCoupon}
          userId={userId}
        />
      )}

      {viewerUrl && (
        <ImageViewerModal url={viewerUrl} onClose={() => setViewerUrl(null)} />
      )}

      {historyTarget && (
        <HistoryModal
          coupon={coupons.find((c) => c.id === historyTarget.id) ?? historyTarget}
          fetchHistory={fetchHistory}
          updateHistoryEntry={updateHistoryEntry}
          deleteHistoryEntry={deleteHistoryEntry}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`"${deleteTarget.name}"\n쿠폰을 삭제할까요?`}
          cancelText="취소"
          confirmText="삭제"
          danger
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  )
}
