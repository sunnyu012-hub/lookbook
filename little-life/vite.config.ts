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
  server: {
    host: true,
    port: 5174,
  },
})
