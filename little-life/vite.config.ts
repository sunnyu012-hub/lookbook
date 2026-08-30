import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/** dist 안의 파일을 전부 URL 경로로 훑는다. */
function listFiles(dir: string, base: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return listFiles(full, `${base}/${name}`)
    return [`${base}/${name}`]
  })
}

/**
 * 배포할 때마다 서비스 워커에 빌드 시각과 미리 받아둘 파일 목록을 찍는다.
 *
 * 캐시 이름이 그대로면 새 워커가 예전 캐시를 지우지 않아서,
 * 에셋을 바꿔도 폰에는 계속 옛날 그림이 나온다.
 */
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    apply: 'build' as const,
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist')
      const file = path.join(dist, 'sw.js')

      try {
        const precache = listFiles(dist, '')
          // 워커 자신과 매니페스트는 캐시에 넣지 않는다
          .filter((url) => url !== '/sw.js' && url !== '/manifest.webmanifest')
          // 도감 그림 250여 장은 첫 실행에 한꺼번에 받지 않는다.
          // 처음 보는 순간 받아서 캐시에 남으니 오프라인에서도 두 번째부터는 뜬다.
          .filter((url) => !url.startsWith('/assets/items/'))
          .filter((url) => !url.startsWith('/assets/thumbs/'))
          // 동료 그림도 서른두 장이라 다 받지는 않는다.
          // 다만 늘 서 있는 자세 두 개는 미리 받는다 — 이 둘이 없으면
          // 홈 화면과 발견함에서 자리가 비어 보인다.
          .filter(
            (url) =>
              !url.startsWith('/assets/companions/') ||
              url.endsWith('/idle.webp') ||
              url.endsWith('/walk.webp'),
          )
          // 캐릭터 모습도 스물네 벌이라 다 받지는 않는다.
          // 기본 모습 하나만 미리 받는다 — 그림을 못 받았을 때 돌아가는 자리라
          // 이건 오프라인에서도 반드시 있어야 한다.
          // 나머지는 처음 보는 순간 받아서 캐시에 남는다.
          .filter(
            (url) => !url.startsWith('/assets/characters/') || url.endsWith('/basic_day.webp'),
          )
          // 사람 얼굴 스물넷(480KB)은 미리 받는다. 도감 그림과 달리 지도를
          // 여는 순간 열두 장이 한꺼번에 보이는 자리라, 그때 하나씩 받으면
          // 얼굴이 뒤늦게 하나씩 떠오른다. 여기는 걸러내지 않는다.
          // 클라우드 백업 라이브러리는 백업을 켠 사람만 받는다.
          // 첫 실행에 미리 받아두면 안 쓰는 사람에게까지 짐이 된다.
          // (쓰기 시작하면 그때 받아서 캐시에 남는다)
          .filter((url) => !url.startsWith('/assets/supabase-'))
          .concat('/')

        const buildId = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)

        const stamped = readFileSync(file, 'utf8')
          .replace('__BUILD_ID__', buildId)
          .replace('__PRECACHE__', JSON.stringify(precache))

        writeFileSync(file, stamped)
        console.log(`  sw.js  build ${buildId} · 미리 받을 파일 ${precache.length}개`)
      } catch {
        // sw.js 가 없으면 조용히 넘어간다
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * 백업 라이브러리를 이름이 정해진 덩어리로 뺀다.
         *
         * 이름이 정해져 있어야 서비스 워커의 미리받기 목록에서 걸러낼 수 있다.
         * (해시만 붙어 있으면 어느 게 그건지 빌드할 때 알 수 없다)
         */
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase'
          return undefined
        },
      },
    },
  },
  server: {
    host: true,
    port: 5174,
  },
})
