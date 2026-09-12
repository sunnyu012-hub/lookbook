import { blobToDataUrl, dataUrlToBlob, getPhoto, putPhoto } from './photos'
import { mergeEntries, sanitizeEntries } from './storage'
import type { Entries } from './types'

const FORMAT = 'oneday-backup'
const VERSION = 1

type Backup = {
  format: string
  version: number
  exportedAt: string
  entries: Entries
  /** 사진 id -> data URL. 사진 없이 내보내면 없다 */
  photos?: Record<string, string>
}

/**
 * 기록을 파일 한 장으로 꺼낸다.
 *
 * 사진은 원하면 같이 담는다. 한 장에 200~400KB 라 몇백 장이면 파일이 백 MB 를
 * 넘는다 — 그래서 기본은 글만이고, 사진은 고른 사람만 담는다.
 */
export async function buildBackup(entries: Entries, withPhotos: boolean): Promise<string> {
  const backup: Backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    entries,
  }

  if (withPhotos) {
    const photos: Record<string, string> = {}
    for (const entry of Object.values(entries)) {
      for (const id of entry.photos) {
        if (photos[id]) continue
        const blob = await getPhoto(id)
        if (blob) photos[id] = await blobToDataUrl(blob)
      }
    }
    backup.photos = photos
  }

  return JSON.stringify(backup, null, 2)
}

export type RestoreResult = {
  /** 합친 뒤의 전체 기록 */
  entries: Entries
  /** 새로 들어오거나 덮어쓴 하루 수 */
  days: number
  /** 되살린 사진 수 */
  photos: number
}

/**
 * 파일을 지금 기록과 합친다. 덮어쓰지 않고 합치는 쪽을 고른 이유는
 * 실수로 가져오기를 눌러도 쓴 게 사라지지 않게 하려는 것이다.
 */
export async function restoreBackup(text: string, current: Entries): Promise<RestoreResult> {
  const parsed = JSON.parse(text) as Partial<Backup>
  if (parsed.format !== FORMAT) throw new Error('이 앱에서 내보낸 파일이 아니에요.')

  const incoming = sanitizeEntries(parsed.entries)
  if (Object.keys(incoming).length === 0) throw new Error('파일 안에 기록이 없어요.')

  let photos = 0
  if (parsed.photos && typeof parsed.photos === 'object') {
    for (const [id, dataUrl] of Object.entries(parsed.photos)) {
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) continue
      try {
        await putPhoto(id, await dataUrlToBlob(dataUrl))
        photos += 1
      } catch {
        // 한 장 실패해도 나머지는 되살린다
      }
    }
  }

  return { entries: mergeEntries(current, incoming), days: Object.keys(incoming).length, photos }
}

/**
 * 브라우저에서 파일로 내려주기.
 *
 * 링크를 문서에 붙였다가 떼고, 주소를 바로 풀지 않는다 —
 * 누른 즉시 풀면 크롬이 파일 이름을 잃고 'download' 로 저장한다.
 */
export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
