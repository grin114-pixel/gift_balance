import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** .env 가 없거나 비어 있으면 false — 앱은 뜨고 안내 화면만 보여줍니다 */
export const isSupabaseConfigured = Boolean(url && key)

// 비어 있으면 createClient 가 즉시 throw 하므로, 임시 URL로만 클라이언트를 만듭니다(실제 API는 호출되지 않도록 상위에서 막음)
const safeUrl = isSupabaseConfigured ? url : 'https://example.invalid/'
const safeKey = isSupabaseConfigured ? key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.missing'

export const supabase = createClient(safeUrl, safeKey)
