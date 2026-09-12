/**
 * 오프라인용 워커를 등록한다.
 *
 * 개발 중에는 등록하지 않는다 — 캐시가 남아서 방금 고친 화면이 안 뜬다.
 */
export function registerServiceWorker() {
  if (import.meta.env.DEV) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 등록이 안 되면 온라인에서만 쓰면 된다. 일기는 이미 기기 안에 있다.
    })
  })
}
