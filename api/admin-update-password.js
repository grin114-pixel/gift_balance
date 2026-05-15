import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin-update-password
 * Authorization: Bearer <access_token>
 * Body: { userId: string, password: string }
 *
 * 관리자 계정으로 인증된 요청에만 특정 사용자의 비밀번호를 강제 변경합니다.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다.' })
  }
  const callerToken = authHeader.slice(7)

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: '요청 형식이 올바르지 않습니다.' })
  }

  const { userId, password } = body ?? {}
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId가 필요합니다.' })
  }
  if (!password || typeof password !== 'string' || password.length < 5) {
    return res.status(400).json({ error: '비밀번호가 너무 짧습니다.' })
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()

  if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
    console.error('admin-update-password: 서버 환경 변수가 설정되지 않았습니다.')
    return res.status(500).json({ error: '서버 설정 오류입니다. 관리자에게 문의하세요.' })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: userError } = await adminClient.auth.getUser(callerToken)
  if (userError || !user) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' })
  }
  if ((user.email ?? '').toLowerCase() !== adminEmail) {
    return res.status(403).json({ error: '관리자 권한이 없습니다.' })
  }

  if (user.id === userId) {
    return res.status(400).json({ error: '본인 비밀번호는 이 기능으로 변경할 수 없어요.' })
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password })
  if (updateError) {
    console.error('admin-update-password updateUserById error:', updateError)
    return res.status(500).json({ error: '비밀번호 변경에 실패했습니다.' })
  }

  return res.status(200).json({ ok: true })
}
