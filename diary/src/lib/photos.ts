/**
 * 사진 보관소.
 *
 * 글은 localStorage 에 두지만 사진은 거기 들어가지 않는다 (보통 5MB 벽).
 * 그림은 IndexedDB 에 그대로 넣고, 기록에는 id 만 적는다.
 */
const DB_NAME = 'oneday-photos'
const STORE = 'photos'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch((error) => {
    // 다음에 다시 열어볼 수 있게 실패한 약속은 버린다
    if (dbPromise === opening) dbPromise = null
    throw error
  })

  dbPromise = opening
  return opening
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

export function newPhotoId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function putPhoto(id: string, blob: Blob): Promise<void> {
  await tx('readwrite', (store) => store.put(blob, id))
}

export async function getPhoto(id: string): Promise<Blob | null> {
  try {
    const blob = await tx<Blob | undefined>('readonly', (store) => store.get(id))
    return blob ?? null
  } catch {
    return null
  }
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    await tx('readwrite', (store) => store.delete(id))
  } catch {
    // 못 지워도 기록에서 id 가 빠지면 화면에는 안 보인다
  }
}

export async function listPhotoIds(): Promise<string[]> {
  try {
    const keys = await tx<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
    return keys.filter((key): key is string => typeof key === 'string')
  } catch {
    return []
  }
}

/**
 * 기록에 없는 사진을 치운다.
 *
 * 사진을 지우다 앱이 닫히거나, 가져오기로 기록만 바뀌면 주인 없는 그림이 남는다.
 * 앱을 켤 때 한 번 훑어서 자리를 돌려준다.
 */
export async function collectOrphans(usedIds: Set<string>): Promise<number> {
  const all = await listPhotoIds()
  const orphans = all.filter((id) => !usedIds.has(id))
  await Promise.all(orphans.map((id) => deletePhoto(id)))
  return orphans.length
}

const MAX_SIDE = 1400
const QUALITY = 0.82

/**
 * 폰 사진은 한 장에 4~8MB 다. 그대로 넣으면 몇 달 만에 저장 공간이 찬다.
 * 긴 변 1400px · jpeg 로 줄여서 넣는다 — 일기에 곁들이는 크기로는 충분하다.
 *
 * 줄이는 데 실패하면 원본을 그대로 넣는다. 사진을 못 받는 것보다는 낫다.
 */
export async function shrinkImage(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    return blob ?? file
  } catch {
    return file
  }
}

/** 내보내기용. 사진을 텍스트(data URL)로 바꾼다. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** 가져오기용. data URL 을 다시 그림으로. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}
