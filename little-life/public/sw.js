/**
 * 오프라인용 서비스 워커.
 *
 * 캐시 이름과 미리 받아둘 파일 목록은 빌드할 때 vite 플러그인이 채워 넣는다.
 * (vite.config.ts 의 stampServiceWorker)
 *
 * 캐시 이름에 빌드 시각을 박아두는 게 중요하다.
 * 이름이 그대로면 새 워커가 예전 캐시를 지우지 않아서,
 * 새로 배포해도 폰에는 계속 옛날 화면이 뜬다.
 */
const CACHE = 'little-life-__BUILD_ID__'
const PRECACHE = __PRECACHE__

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // 한 파일이라도 실패하면 addAll 은 통째로 실패한다. 각각 받아서 되는 것만 담는다.
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => {
            /* 못 받은 건 나중에 요청될 때 채워진다 */
          }),
        ),
      ),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // 폰트 CDN 같은 외부 요청은 건드리지 않는다
  if (url.origin !== self.location.origin) return

  // 화면 이동은 네트워크를 먼저 본다 — 그래야 새 배포가 바로 반영된다.
  // 실패하면 캐시에 있는 index.html 로 넘긴다.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // 나머지(해시 붙은 번들, 그림)는 캐시를 먼저 본다. 내용이 바뀌면 파일명이 바뀐다.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
