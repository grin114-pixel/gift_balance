import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Search, Lock, Check, RefreshCw, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './AdminPage.css'

const PIN_SUFFIX = 'balance'
const REMEMBER_KEY = 'gift-balance.remember-device'
const SESSION_ONLY_KEY = 'gift-balance.session-only'

function toAuthPassword(pin) {
  return pin + PIN_SUFFIX
}
function onlyDigits(val) {
  return val.replace(/\D/g, '').slice(0, 4)
}

function formatDate(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function AdminPage({ onBack }) {
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase()
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess ?? null)
    })
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!adminEmail) {
    return (
      <div className="adm-shell adm-shell--center">
        <div className="adm-login-card">
          <p className="adm-login-error-msg">
            VITE_ADMIN_EMAIL 이 설정되지 않았어요. 환경 변수를 확인해주세요.
          </p>
          <button type="button" className="adm-btn-ghost" onClick={onBack}>
            <ArrowLeft size={14} aria-hidden /> 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (session === undefined) {
    return (
      <div className="adm-shell adm-shell--center">
        <div className="adm-spinner" />
      </div>
    )
  }

  const loggedInAsAdmin =
    !!session && (session.user?.email ?? '').trim().toLowerCase() === adminEmail

  if (!loggedInAsAdmin) {
    return <AdminLogin adminEmail={adminEmail} onBack={onBack} />
  }

  return <AdminPageInner onBack={onBack} />
}

function AdminLogin({ adminEmail, onBack }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(() => {
    return typeof window !== 'undefined' && window.localStorage.getItem(REMEMBER_KEY) === 'true'
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (pin.length !== 4) {
      setError('비밀번호 4자리를 입력해주세요.')
      return
    }
    setLoading(true)
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: toAuthPassword(pin),
    })
    setLoading(false)
    if (signError) {
      setError('이메일 또는 비밀번호가 올바르지 않아요.')
      return
    }
    if (rememberDevice) {
      window.localStorage.setItem(REMEMBER_KEY, 'true')
    } else {
      window.localStorage.removeItem(REMEMBER_KEY)
      window.sessionStorage.setItem(SESSION_ONLY_KEY, 'true')
    }
  }

  return (
    <div className="adm-shell adm-shell--center">
      <div className="adm-login-card">
        <h1 className="adm-login-title">관리자 로그인</h1>
        <p className="adm-login-sub">사용자 관리를 위해 관리자 계정으로 로그인해주세요.</p>

        <form className="adm-login-form" onSubmit={handleSubmit}>
          <label className="adm-field">
            <span>관리자 이메일</span>
            <input type="email" readOnly value={adminEmail} className="adm-input-readonly" />
          </label>
          <label className="adm-field">
            <span>비밀번호 (숫자 4자리)</span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value))}
              autoComplete="current-password"
              className="adm-login-pin"
            />
          </label>

          <label className="adm-login-remember">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <span className="adm-login-remember-label">이 기기 기억하기</span>
          </label>

          {error ? <p className="adm-field-error">{error}</p> : null}

          <button type="submit" className="adm-btn-primary" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <button type="button" className="adm-btn-ghost adm-login-back" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden /> 메인으로 돌아가기
        </button>
      </div>
    </div>
  )
}

function AdminPageInner({ onBack }) {
  const [users, setUsers] = useState([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [pinError, setPinError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? ''
  }, [])

  const fetchUsers = useCallback(async () => {
    setFetchLoading(true)
    setFetchError('')
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-list-users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) {
        throw new Error(
          '⚠️ API를 찾을 수 없어요 (404).\n' +
            '로컬에서 테스트할 때는 npm run dev 대신 vercel dev 를 사용해주세요.',
        )
      }
      let json
      try {
        json = await res.json()
      } catch {
        throw new Error(`서버 응답을 읽지 못했어요 (HTTP ${res.status}).`)
      }
      if (!res.ok) throw new Error(json.error || `오류 (HTTP ${res.status})`)
      setUsers(json.users)
    } catch (e) {
      setFetchError(e.message)
    } finally {
      setFetchLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setPinError('')
    if (pin.length !== 4) {
      setPinError('새 비밀번호 4자리를 입력해주세요.')
      return
    }
    if (pin !== pin2) {
      setPinError('비밀번호가 일치하지 않아요.')
      return
    }
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: selected.id, password: toAuthPassword(pin) }),
      })
      let json
      try {
        json = await res.json()
      } catch {
        throw new Error(`서버 응답을 읽지 못했어요 (HTTP ${res.status}).`)
      }
      if (!res.ok) throw new Error(json.error || `오류 (HTTP ${res.status})`)
      setDone(true)
      setPin('')
      setPin2('')
    } catch (e) {
      setPinError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleSelect(user) {
    setSelected(user)
    setPin('')
    setPin2('')
    setPinError('')
    setDone(false)
  }

  const filtered = users.filter((u) => u.email.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="adm-shell">
      <header className="adm-header">
        <button type="button" className="adm-back-btn" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden /> 돌아가기
        </button>
        <span className="adm-header-title">사용자 관리</span>
        <div className="adm-header-actions">
          <button
            type="button"
            className="adm-refresh-btn"
            onClick={fetchUsers}
            disabled={fetchLoading}
            aria-label="새로고침"
          >
            <RefreshCw size={14} className={fetchLoading ? 'adm-spin' : ''} aria-hidden />
          </button>
          <button
            type="button"
            className="adm-refresh-btn"
            onClick={handleSignOut}
            title="관리자 로그아웃"
            aria-label="관리자 로그아웃"
          >
            <LogOut size={14} aria-hidden />
          </button>
        </div>
      </header>

      <div className="adm-body">
        <section className="adm-panel adm-panel--users">
          <div className="adm-panel-head">
            <h2 className="adm-panel-title">사용자 목록</h2>
            {!fetchLoading && <span className="adm-badge">{users.length}명</span>}
          </div>

          <div className="adm-search-wrap">
            <Search size={13} className="adm-search-icon" aria-hidden />
            <input
              className="adm-search-input"
              type="search"
              placeholder="이메일로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>

          {fetchLoading ? (
            <div className="adm-center">
              <div className="adm-spinner" />
            </div>
          ) : fetchError ? (
            <div className="adm-center">
              <p className="adm-error-msg">{fetchError}</p>
              <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={fetchUsers}>
                다시 시도
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="adm-empty">{query ? '검색 결과가 없어요.' : '등록된 사용자가 없어요.'}</p>
          ) : (
            <ul className="adm-user-list">
              {filtered.map((user) => (
                <li
                  key={user.id}
                  className={`adm-user-item${selected?.id === user.id ? ' adm-user-item--sel' : ''}`}
                  onClick={() => handleSelect(user)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelect(user)
                  }}
                >
                  <span className="adm-user-email">{user.email}</span>
                  <span className="adm-user-meta">
                    마지막 로그인 {formatDate(user.last_sign_in_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-panel adm-panel--pw">
          <div className="adm-panel-head">
            <h2 className="adm-panel-title">비밀번호 변경</h2>
          </div>

          {!selected ? (
            <p className="adm-empty adm-empty--hint">
              왼쪽 목록에서
              <br />
              사용자를 선택하세요.
            </p>
          ) : done ? (
            <div className="adm-done">
              <div className="adm-done-check">
                <Check size={22} aria-hidden />
              </div>
              <p className="adm-done-msg">
                <strong>{selected.email}</strong>의
                <br />
                비밀번호가 변경됐어요.
              </p>
              <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setDone(false)}>
                다시 변경하기
              </button>
            </div>
          ) : (
            <>
              <div className="adm-target-box">
                <Lock size={12} aria-hidden />
                <span className="adm-target-email">{selected.email}</span>
              </div>

              <form className="adm-form" onSubmit={handleUpdatePassword}>
                <label className="adm-field">
                  <span>새 비밀번호 (숫자 4자리)</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0000"
                    value={pin}
                    onChange={(e) => setPin(onlyDigits(e.target.value))}
                    autoComplete="new-password"
                  />
                </label>
                <label className="adm-field">
                  <span>비밀번호 확인</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0000"
                    value={pin2}
                    onChange={(e) => setPin2(onlyDigits(e.target.value))}
                    autoComplete="new-password"
                  />
                </label>

                {pinError ? <p className="adm-field-error">{pinError}</p> : null}

                <button type="submit" className="adm-btn-primary" disabled={saving}>
                  {saving ? '변경 중...' : '비밀번호 변경'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
