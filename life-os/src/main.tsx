import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: 배포 환경에서만 서비스워커를 등록한다 (개발 중 캐시 혼란 방지)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 이미 워커가 돌고 있었는지 기억해 둔다 — 첫 설치 때는 새로고침이 필요 없다
    const hadController = Boolean(navigator.serviceWorker.controller)
    let reloading = false

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return
      // 새 워커가 자리를 잡았다 = 새 버전이 배포됐다. 한 번만 새로고침한다.
      reloading = true
      window.location.reload()
    })

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // 앱을 열 때마다 새 버전이 있는지 확인한다
        void reg.update()
      })
      .catch(() => {
        /* 등록 실패해도 앱 동작에는 영향 없음 */
      })
  })
}
