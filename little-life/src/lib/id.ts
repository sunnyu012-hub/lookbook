/** uuid 를 만든다. crypto.randomUUID 가 없는 환경(구형 iOS 등)만 대비한다. */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'q-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
