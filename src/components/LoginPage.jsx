import { useState, useId } from 'react'
import { User, Lock, UserPlus, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { resolveAuthEmail, usernameToAuthEmail } from '../lib/authIdentity'
import './LoginPage.css'

function GiftIcon() {
  const uid = useId().replace(/:/g, '')
  const gradId = `giftGrad_${uid}`
  return (
    <svg
      className="auth-btn-gift-svg"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect x="6" y="20" width="36" height="22" rx="3" fill={`url(#${gradId})`} />
      <rect x="4" y="14" width="40" height="8" rx="2" fill="#8B5CF6" />
      <rect x="21" y="14" width="6" height="28" rx="2" fill="white" opacity="0.85" />
      <path
        d="M24 14 C24 14 16 10 16 6 C16 3.8 17.8 2 20 2 C22 2 23.5 3.5 24 5 C24.5 3.5 26 2 28 2 C30.2 2 32 3.8 32 6 C32 10 24 14 24 14Z"
        fill="#C4B5FD"
      />
    </svg>
  )
}

const PIN_SUFFIX = 'balance'
const REMEMBER_KEY = 'gift-balance.remember-device'

function toAuthPassword(pin) {
  return pin + PIN_SUFFIX
}

function onlyDigits(val) {
  return val.replace(/\D/g, '').slice(0, 4)
}

function NameField({ value, onChange, autoComplete = 'username' }) {
  return (
    <label className="auth-field">
      <span>이름</span>
      <div className="auth-input-wrap">
        <span className="auth-input-icon"><User size={15} strokeWidth={1.6} /></span>
        <input
          type="text"
          autoComplete={autoComplete}
          placeholder="이름 또는 아이디"
          value={value}
          onChange={onChange}
        />
      </div>
    </label>
  )
}

function PinField({ label, value, onChange, autoComplete }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input-wrap">
        <span className="auth-input-icon"><Lock size={15} strokeWidth={1.6} /></span>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="0000"
          value={value}
          onChange={(e) => onChange(onlyDigits(e.target.value))}
          autoComplete={autoComplete}
        />
      </div>
    </label>
  )
}

const Footer = () => (
  <p className="auth-footer">
    <span className="auth-footer-text">© 잔액 얼마</span>
  </p>
)

export default function LoginPage({ recoveryMode = false, onPasswordReset }) {
  const [view, setView] = useState(recoveryMode ? 'reset' : 'login')

  const [loginName, setLoginName] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(() => {
    return typeof window !== 'undefined' && window.localStorage.getItem(REMEMBER_KEY) === 'true'
  })

  const [signupName, setSignupName] = useState('')
  const [signupPin, setSignupPin] = useState('')
  const [signupPin2, setSignupPin2] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  const [forgotName, setForgotName] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotDone, setForgotDone] = useState(false)

  const [changeName, setChangeName] = useState('')
  const [changeCurrentPin, setChangeCurrentPin] = useState('')
  const [changeNewPin, setChangeNewPin] = useState('')
  const [changeError, setChangeError] = useState('')
  const [changeLoading, setChangeLoading] = useState(false)
  const [changeDone, setChangeDone] = useState(false)

  const [resetPin, setResetPin] = useState('')
  const [resetPin2, setResetPin2] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    if (!loginName.trim()) { setLoginError('이름을 입력해주세요.'); return }
    if (loginPin.length !== 4) { setLoginError('비밀번호 4자리를 입력해주세요.'); return }
    let authEmail
    try {
      authEmail = resolveAuthEmail(loginName)
    } catch {
      setLoginError('이름을 입력해주세요.')
      return
    }
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: toAuthPassword(loginPin),
    })
    setLoginLoading(false)
    if (error) {
      setLoginError('이름 또는 비밀번호가 올바르지 않아요.')
      return
    }
    if (rememberDevice) {
      window.localStorage.setItem(REMEMBER_KEY, 'true')
    } else {
      window.localStorage.removeItem(REMEMBER_KEY)
      window.sessionStorage.setItem('gift-balance.session-only', 'true')
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    setSignupError('')
    const displayName = signupName.trim()
    if (!displayName) { setSignupError('이름을 입력해주세요.'); return }
    if (signupPin.length !== 4) { setSignupError('비밀번호 4자리를 입력해주세요.'); return }
    if (signupPin !== signupPin2) { setSignupError('비밀번호가 일치하지 않아요.'); return }
    let authEmail
    try {
      authEmail = usernameToAuthEmail(displayName)
    } catch {
      setSignupError('이름을 입력해주세요.')
      return
    }
    setSignupLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: toAuthPassword(signupPin),
      options: { data: { display_name: displayName } },
    })
    setSignupLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        setSignupError('이미 가입된 이름이에요.')
      } else {
        setSignupError('가입에 실패했어요. 다시 시도해주세요.')
      }
      return
    }
    if (data?.session) return
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: toAuthPassword(signupPin),
    })
    if (!signInError) return
    setSignupError('가입은 되었지만 로그인에 실패했어요. 잠시 후 다시 시도해주세요.')
  }

  async function handleForgot(e) {
    e.preventDefault()
    setForgotError('')
    if (!forgotName.trim()) { setForgotError('이름을 입력해주세요.'); return }
    let authEmail
    try {
      authEmail = resolveAuthEmail(forgotName)
    } catch {
      setForgotError('이름을 입력해주세요.')
      return
    }
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: window.location.origin,
    })
    setForgotLoading(false)
    if (error) {
      setForgotError('전송에 실패했어요. 다시 시도해주세요.')
    } else {
      setForgotDone(true)
    }
  }

  async function handleChange(e) {
    e.preventDefault()
    setChangeError('')
    if (!changeName.trim()) { setChangeError('이름을 입력해주세요.'); return }
    if (changeCurrentPin.length !== 4) { setChangeError('현재 비밀번호 4자리를 입력해주세요.'); return }
    if (changeNewPin.length !== 4) { setChangeError('새 비밀번호 4자리를 입력해주세요.'); return }
    let authEmail
    try {
      authEmail = resolveAuthEmail(changeName)
    } catch {
      setChangeError('이름을 입력해주세요.')
      return
    }
    setChangeLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: toAuthPassword(changeCurrentPin),
    })
    if (signInError) {
      setChangeLoading(false)
      setChangeError('이름 또는 현재 비밀번호가 올바르지 않아요.')
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password: toAuthPassword(changeNewPin),
    })
    setChangeLoading(false)
    if (updateError) {
      setChangeError('비밀번호 변경에 실패했어요.')
    } else {
      await supabase.auth.signOut()
      setChangeDone(true)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetError('')
    if (resetPin.length !== 4) { setResetError('새 비밀번호 4자리를 입력해주세요.'); return }
    if (resetPin !== resetPin2) { setResetError('비밀번호가 일치하지 않아요.'); return }
    setResetLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: toAuthPassword(resetPin),
    })
    setResetLoading(false)
    if (error) {
      setResetError('비밀번호 변경에 실패했어요.')
    } else {
      setResetDone(true)
      await supabase.auth.signOut()
      onPasswordReset?.()
    }
  }

  function goLogin() {
    setView('login')
    setLoginError('')
    setSignupError('')
    setForgotError('')
    setChangeError('')
    setForgotDone(false)
    setChangeDone(false)
  }

  const brand = (
    <div className="auth-brand">
      <span className="auth-brand-wallet" aria-hidden>
        <Wallet size={34} strokeWidth={1.75} />
      </span>
      <div className="auth-brand-text">
        <span className="auth-brand-name">잔액 얼마</span>
        <p className="auth-tagline">내 쿠폰 잔액을 한눈에</p>
      </div>
    </div>
  )

  const backToLogin = (
    <div className="auth-bottom-links auth-bottom-links--center">
      <button type="button" className="auth-link" onClick={goLogin}>
        로그인으로 돌아가기
      </button>
    </div>
  )

  if (view === 'reset') {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          {brand}
          <h2 className="auth-subtitle">새 비밀번호 설정</h2>
          {resetDone ? (
            <div className="auth-done">
              <p>비밀번호를 변경했어요.</p>
              <p>새 비밀번호로 다시 로그인해주세요.</p>
              <button className="auth-btn-primary" onClick={goLogin}>
                <GiftIcon />
                로그인으로 이동
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleReset}>
              <PinField label="새 비밀번호 (숫자 4자리)" value={resetPin} onChange={setResetPin} />
              <PinField label="새 비밀번호 확인" value={resetPin2} onChange={setResetPin2} />
              {resetError && <p className="auth-error">{resetError}</p>}
              <button type="submit" className="auth-btn-primary" disabled={resetLoading}>
                <GiftIcon />
                {resetLoading ? '변경 중...' : '비밀번호 변경하기'}
              </button>
            </form>
          )}
          <Footer />
        </div>
      </div>
    )
  }

  if (view === 'signup') {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          {brand}
          <h2 className="auth-subtitle">회원 가입하기</h2>
          <form className="auth-form" onSubmit={handleSignup}>
            <NameField value={signupName} onChange={(e) => setSignupName(e.target.value)} />
            <PinField label="비밀번호 (숫자 4자리)" value={signupPin} onChange={setSignupPin} />
            <PinField label="비밀번호 확인" value={signupPin2} onChange={setSignupPin2} />
            {signupError && <p className="auth-error">{signupError}</p>}
            <button type="submit" className="auth-btn-primary" disabled={signupLoading}>
              <GiftIcon />
              {signupLoading ? '가입 중...' : '가입하기'}
            </button>
          </form>
          {backToLogin}
          <Footer />
        </div>
      </div>
    )
  }

  if (view === 'forgot') {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          {brand}
          <h2 className="auth-subtitle">비밀번호 찾기</h2>
          {forgotDone ? (
            <div className="auth-done">
              <p>비밀번호 재설정 링크를 보냈어요.</p>
              <p>이메일로 가입한 계정이 있다면 확인해주세요.</p>
              <button className="auth-btn-primary" onClick={goLogin}>
                <GiftIcon />
                로그인으로 이동
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleForgot}>
              <NameField value={forgotName} onChange={(e) => setForgotName(e.target.value)} />
              {forgotError && <p className="auth-error">{forgotError}</p>}
              <button type="submit" className="auth-btn-primary" disabled={forgotLoading}>
                <GiftIcon />
                {forgotLoading ? '전송 중...' : '재설정 링크 보내기'}
              </button>
            </form>
          )}
          {backToLogin}
          <Footer />
        </div>
      </div>
    )
  }

  if (view === 'change') {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          {brand}
          <h2 className="auth-subtitle">비밀번호 변경하기</h2>
          {changeDone ? (
            <div className="auth-done">
              <p>비밀번호를 변경했어요.</p>
              <p>새 비밀번호로 다시 로그인해주세요.</p>
              <button className="auth-btn-primary" onClick={goLogin}>
                <GiftIcon />
                로그인으로 이동
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleChange}>
              <NameField value={changeName} onChange={(e) => setChangeName(e.target.value)} />
              <PinField label="현재 비밀번호" value={changeCurrentPin} onChange={setChangeCurrentPin} />
              <PinField label="새 비밀번호" value={changeNewPin} onChange={setChangeNewPin} />
              {changeError && <p className="auth-error">{changeError}</p>}
              <button type="submit" className="auth-btn-primary" disabled={changeLoading}>
                <GiftIcon />
                {changeLoading ? '변경 중...' : '비밀번호 변경하기'}
              </button>
            </form>
          )}
          {backToLogin}
          <Footer />
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {brand}
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-form-email-pin">
            <NameField
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              autoComplete="username"
            />
            <PinField
              label="비밀번호 (숫자 4자리)"
              value={loginPin}
              onChange={setLoginPin}
              autoComplete="current-password"
            />
          </div>
          <label className="auth-remember">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <span className="auth-checkbox-custom" />
            <span className="auth-remember-label">이 기기 기억하기</span>
          </label>
          {loginError && <p className="auth-error">{loginError}</p>}
          <button type="submit" className="auth-btn-primary" disabled={loginLoading}>
            <GiftIcon />
            {loginLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="auth-bottom-links auth-bottom-links--spread">
          <button
            type="button"
            className="auth-link auth-link--signup-cta"
            onClick={() => { setView('signup'); setSignupError('') }}
          >
            <UserPlus size={13} strokeWidth={1.6} />
            회원 가입하기
          </button>
          <span className="auth-link-sep" aria-hidden />
          <button
            type="button"
            className="auth-link"
            onClick={() => { setView('change'); setChangeError(''); setChangeDone(false) }}
          >
            <Lock size={13} strokeWidth={1.6} />
            비밀번호 변경하기
          </button>
        </div>
        <Footer />
      </div>
    </div>
  )
}
