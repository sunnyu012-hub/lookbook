/**
 * Quick Log 사진.
 *
 * 원본 그대로 올리면 요즘 폰 사진 한 장이 3~8MB 다. 하루 몇 장씩 몇 년이면 감당이 안 된다.
 * 그래서 올리기 전에 브라우저에서 줄인다 — 새 라이브러리 없이 Canvas 만 쓴다.
 *
 * Canvas 로 다시 그리면 EXIF(촬영 위치·기기 정보)가 통째로 사라진다.
 * 용량을 줄이려고 한 일이지만, 사진에 붙어 다니는 위치정보를 떼는 효과가 더 크다.
 *
 * 사진은 개인 데이터다. bucket 은 private 이고 읽을 때마다 signed URL 을 받는다.
 */
import { supabase } from '../supabase'

export const PHOTO_BUCKET = 'quick-log-photos'

/** 긴 변 기준 최대 픽셀 — 폰 화면에서 크게 봐도 충분하다 */
export const MAX_EDGE = 1600
/** 0.82 는 눈으로 차이를 못 느끼면서 용량은 확 준다 */
export const JPEG_QUALITY = 0.82
/** 서버 정책과 같은 값. 여기서 먼저 걸러서 실패를 앞당긴다 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export class PhotoError extends Error {
  constructor(
    message: string,
    /** 화면에 그대로 보여 줄 한국어 문구 */
    readonly userMessage: string,
  ) {
    super(message)
    this.name = 'PhotoError'
  }
}

/** {user_id}/{YYYY}/{MM}/{log_id}.jpg — 맨 앞이 user_id 여야 Storage 정책이 폴더로 막는다 */
export function photoPathFor(userId: string, logId: string, when: Date): string {
  const year = when.getFullYear()
  const month = String(when.getMonth() + 1).padStart(2, '0')
  return `${userId}/${year}/${month}/${logId}.jpg`
}

/**
 * 긴 변을 MAX_EDGE 로 맞추고 JPEG 으로 다시 굽는다.
 * 원본이 이미 작으면 확대하지 않는다 — 늘려 봐야 화질만 나빠진다.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await loadBitmap(file)

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoError('no 2d context', '이 브라우저에서는 사진을 줄이지 못했어요.')

  // 축소할 때 계단 현상을 줄인다
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)

  if ('close' in bitmap) bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new PhotoError('toBlob failed', '사진을 준비하지 못했어요.')
  return blob
}

/** createImageBitmap 이 없는 브라우저(사파리 일부)를 위해 <img> 로도 읽는다 */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // 아래 방법으로 한 번 더 시도한다 (HEIC 등)
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new PhotoError('decode failed', '이 사진은 열지 못했어요.'))
      img.src = url
    })
  } finally {
    // 그림이 canvas 로 옮겨간 뒤에 지운다
    setTimeout(() => URL.revokeObjectURL(url), 5_000)
  }
}

export interface UploadResult {
  path: string
}

/**
 * 사진 한 장을 올린다.
 * upsert 를 켜 둔다 — 같은 로그의 사진을 바꿀 때 지웠다 올리지 않고 덮어쓴다.
 */
export async function uploadPhoto(
  blob: Blob,
  path: string,
): Promise<UploadResult> {
  if (!supabase) throw new PhotoError('no supabase', '로컬 모드에서는 사진을 올릴 수 없어요.')
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new PhotoError('too large', '사진이 너무 커요. 다른 사진으로 해 주세요.')
  }

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

  if (error) throw new PhotoError(error.message, '사진만 올리지 못했어요.')
  return { path }
}

/** signed URL 은 시간이 지나면 죽는다. 화면에서 볼 만큼만 준다 */
const SIGNED_URL_SECONDS = 60 * 60

export async function signedPhotoUrl(path: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS)
  return error ? null : (data?.signedUrl ?? null)
}

/**
 * 사진을 지운다.
 * 실패해도 던지지 않는다 — 사진 하나 못 지웠다고 기록 삭제가 막히면 안 된다.
 * 남은 파일은 orphan 이 되지만, 기록이 안 지워지는 것보다 낫다.
 */
export async function removePhoto(path: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path])
  return !error
}

/** 고른 파일이 쓸 수 있는 사진인지 */
export function checkFile(file: File): PhotoError | null {
  if (!file.type.startsWith('image/')) {
    return new PhotoError('not an image', '사진 파일만 올릴 수 있어요.')
  }
  // 원본 크기는 넉넉히 받는다. 어차피 줄여서 올린다
  if (file.size > 40 * 1024 * 1024) {
    return new PhotoError('source too large', '사진이 너무 커요. 다른 사진으로 해 주세요.')
  }
  return null
}
