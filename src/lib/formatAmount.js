/** 숫자만 남기기 (최대 자릿수로 제한) */
export function digitsOnly(s, maxLen = 15) {
  return String(s ?? '').replace(/\D/g, '').slice(0, maxLen)
}

/** 입력용: 숫자 문자열 → 천단위 콤마 (빈 문자열은 그대로) */
export function formatAmountInput(digitsStr) {
  if (!digitsStr) return ''
  const n = parseInt(digitsStr, 10)
  if (Number.isNaN(n)) return ''
  return n.toLocaleString('ko-KR')
}

/** 콤마 포함 문자열 → 정수 (없으면 NaN) */
export function parseAmountInt(s) {
  const d = digitsOnly(s)
  if (!d) return NaN
  return parseInt(d, 10)
}

/** DB/초기값 → 입력용 숫자만 문자열 */
export function balanceToDigits(v) {
  if (v == null || v === '') return ''
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return ''
  return String(Math.floor(n))
}
