/**
 * 사진 경로 하나를 볼 수 있는 주소로 바꾼다.
 *
 * bucket 이 private 이라 경로만으로는 못 본다. 매번 signed URL 을 받아야 한다.
 * 주소는 한 시간이면 죽으므로 컴포넌트가 살아 있는 동안만 들고 있는다.
 */
import { useEffect, useState } from 'react'
import { signedPhotoUrl } from '@/lib/os2/photo'

export function usePhotoUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    let alive = true
    signedPhotoUrl(path)
      .then((next) => alive && setUrl(next))
      .catch(() => alive && setUrl(null))
    return () => {
      alive = false
    }
  }, [path])

  return url
}
