import { useEffect, useState } from 'react'
import { getPhoto } from '../lib/photos'

/**
 * 사진 id 로 화면에 걸 주소를 얻는다.
 *
 * createObjectURL 은 안 풀어주면 탭이 닫힐 때까지 메모리에 남는다.
 * 사진첩을 오래 넘기면 그게 쌓여서 앱이 무거워진다 — 여기서 꼭 풀어준다.
 */
export function usePhotoUrl(id: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setUrl(null)
      return
    }

    let revoked = false
    let objectUrl: string | null = null

    void getPhoto(id).then((blob) => {
      if (!blob || revoked) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })

    return () => {
      revoked = true
      setUrl(null)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  return url
}
