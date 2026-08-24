/**
 * 파일 한 장을 사람 손에 쥐어주기.
 *
 * ── 폰에서는 내려받기가 잘 안 통한다 ───────────────────
 *
 * 홈 화면에 올려둔 PWA 안에서 <a download> 를 누르면, 기기에 따라
 * 아무 일도 안 일어난 것처럼 보인다. 어디로 갔는지 알 수가 없다.
 * 공유 시트를 열면 "파일에 저장" 도 있고 자기한테 메일로 보내기도 있어서
 * 사용자가 어디로 갔는지 눈으로 본다.
 *
 * 그래서 손가락으로 쓰는 기기에서는 공유를 먼저 쓰고,
 * 마우스 쓰는 데서는 평범하게 내려받는다.
 */

export type SaveOutcome =
  /** 공유 시트로 넘겼다 */
  | 'SHARED'
  /** 평범하게 내려받았다 */
  | 'DOWNLOADED'
  /** 사용자가 공유 시트를 닫았다 — 실패가 아니다 */
  | 'CANCELLED'
  | 'FAILED'

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export async function saveTextFile(name: string, text: string): Promise<SaveOutcome> {
  const file = new File([text], name, { type: 'application/json' })

  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches

  if (coarse && typeof navigator.share === 'function') {
    const shareable = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
    if (shareable) {
      try {
        await navigator.share({ files: [file], title: name })
        return 'SHARED'
      } catch (error) {
        // 사용자가 닫은 건 실패가 아니다. 뒤이어 내려받기까지 하면 안 된다.
        if (isAbort(error)) return 'CANCELLED'
        // 그 밖의 이유면 아래 내려받기로 한 번 더 해본다
      }
    }
  }

  try {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    // 바로 지우면 사파리에서 다운로드가 끊긴다. 한 박자 뒤에 놓아준다.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return 'DOWNLOADED'
  } catch {
    return 'FAILED'
  }
}

/** 골라온 파일을 글자로 읽는다 */
export function readTextFile(file: File): Promise<string> {
  return file.text()
}
