/** Supabase Auth용 내부 이메일 도메인 (사용자에게는 이름만 입력) */
export const AUTH_EMAIL_DOMAIN = 'gift-balance.auth'

function utf8ToBase64Url(str) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToUtf8(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const binary = atob(b64 + pad)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function isSyntheticAuthEmail(email) {
  return (email ?? '').toLowerCase().endsWith(`@${AUTH_EMAIL_DOMAIN}`)
}

/** 회원가입·이름 로그인용 — 표시 이름을 Supabase가 받아들이는 이메일로 변환 */
export function usernameToAuthEmail(username) {
  const name = username.trim()
  if (!name) throw new Error('empty username')
  return `${utf8ToBase64Url(name)}@${AUTH_EMAIL_DOMAIN}`
}

/** 로그인·비밀번호 변경 — 기존 이메일 계정과 이름 계정 모두 지원 */
export function resolveAuthEmail(input) {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('empty input')
  if (trimmed.includes('@')) return trimmed
  return usernameToAuthEmail(trimmed)
}

export function authEmailToDisplayName(email, metadata) {
  const fromMeta = metadata?.display_name
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim()
  if (isSyntheticAuthEmail(email)) {
    try {
      return base64UrlToUtf8(email.split('@')[0])
    } catch {
      return email ?? ''
    }
  }
  return email ?? ''
}
