// 아주 가벼운 오프라인 셸 캐시. 빌드 산출물은 해시가 붙으므로 런타임 캐시로 처리한다.
const CACHE = 'life-os-v1'
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
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
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 문서 요청: 네트워크 우선, 실패 시 캐시된 셸
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/'). then((r) => r || Response.error())))
    return
  }

  // 정적 자산: 캐시 우선
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        }),
    ),
  )
})
