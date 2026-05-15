import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin-list-users
 * Authorization: Bearer <access_token>
 *
 * 관리자 계정으로 인증된 요청에만 전체 사용자 목록을 반환합니다.
 * Service Role 키는 서버 환경 변수에서만 읽히며 클라이언트에 노출되지 않습니다.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다.' })
  }
  const callerToken = authHeader.slice(7)

  const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()

  if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
    console.error('admin-list-users: 서버 환경 변수가 설정되지 않았습니다.')
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

  const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  if (error) {
    console.error('admin-list-users listUsers error:', error)
    return res.status(500).json({ error: '사용자 목록을 가져오지 못했습니다.' })
  }

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }))

  return res.status(200).json({ users })
}
