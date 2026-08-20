// 아주 가벼운 오프라인 셸 캐시.
//
// 규칙
//   · 문서와 그림처럼 "이름이 그대로인 파일" 은 네트워크를 먼저 본다.
//     캐시를 먼저 보면 에셋을 새로 넣어도 옛날 그림이 계속 나온다.
//   · 파일명에 해시가 붙는 빌드 산출물(index-XXXX.js/css)만 캐시를 먼저 본다.
//     이름이 바뀌면 어차피 새로 받으니 캐시가 오래돼도 안전하다.
//   · 배포할 때마다 CACHE 이름이 바뀌어서, 새 워커가 켜지면 예전 캐시를 통째로 지운다.
const CACHE = 'life-os-__BUILD_ID__'
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

/** 이름에 해시가 박혀 있어 내용이 절대 안 바뀌는 파일 */
const isImmutable = (pathname) => /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(pathname)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
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

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const res = await fetch(request)
  const copy = res.clone()
  caches.open(CACHE).then((c) => c.put(request, copy))
  return res
}

async function networkFirst(request, fallback) {
  try {
    const res = await fetch(request)
    const copy = res.clone()
    caches.open(CACHE).then((c) => c.put(request, copy))
    return res
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (fallback) {
      const shell = await caches.match(fallback)
      if (shell) return shell
    }
    return Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/'))
    return
  }

  event.respondWith(isImmutable(url.pathname) ? cacheFirst(request) : networkFirst(request))
})
