/**
 * 서비스 워커 등록.
 *
 * 개발 중에는 켜지 않는다. 캐시가 끼면 고친 게 바로 안 보여서 헷갈린다.
 * 새 버전이 준비되면 다음에 앱을 열 때 자동으로 적용된다.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // 등록에 실패해도 앱은 그냥 온라인으로 돌아간다
      console.error('[little-life] 서비스 워커 등록 실패', error)
    })
  })

  // 새 워커가 자리를 잡으면 화면을 한 번 새로 그린다.
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })
}
