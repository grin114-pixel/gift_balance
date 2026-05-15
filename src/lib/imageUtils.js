import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

const BUCKET = 'coupon-images'

async function compressFile(file) {
  const options = {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 900,
    useWebWorker: true,
    initialQuality: 0.72,
  }
  try {
    return await imageCompression(file, options)
  } catch {
    try {
      return await imageCompression(file, { ...options, maxSizeMB: 0.25 })
    } catch {
      if (file.size <= 6 * 1024 * 1024) return file
      throw new Error('이미지 압축에 실패했습니다. 용량이 작은 사진으로 다시 시도해 주세요.')
    }
  }
}

function safeFileName(originalName) {
  const ext = (originalName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext || 'jpg'}`
}

export async function uploadImage(file, { userId = 'unknown' } = {}) {
  const blob = await compressFile(file)
  const fileName = safeFileName(file.name)
  const path = `${userId}/${fileName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false })

  if (error) {
    if (error.message?.includes('bucket') || error.statusCode === '404') {
      throw new Error(
        'Storage 버킷을 찾을 수 없습니다.\nSupabase Dashboard → Storage에서\n"coupon-images" 버킷을 Public으로 생성해주세요.',
      )
    }
    throw new Error('이미지 업로드 실패: ' + error.message)
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

export async function deleteImage(url) {
  if (!url) return
  try {
    const urlObj = new URL(url)
    const marker = `/object/public/${BUCKET}/`
    const idx = urlObj.pathname.indexOf(marker)
    if (idx === -1) return
    const path = decodeURIComponent(urlObj.pathname.slice(idx + marker.length))
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    // ignore
  }
}
