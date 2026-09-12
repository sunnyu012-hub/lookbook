import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * 이 빌드의 이름. 서비스 워커 캐시 이름과 설정 화면이 같은 값을 쓴다 —
 * 따로 만들면 "설정에 적힌 판" 과 "실제로 돌는 판" 이 달라져서 제보를 못 믿는다.
 */
const BUILD_ID = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)

function listFiles(dir: string, base: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return listFiles(full, `${base}/${name}`)
    return [`${base}/${name}`]
  })
}

/**
 * 배포할 때마다 서비스 워커에 빌드 시각과 미리 받아둘 파일 목록을 찍는다.
 * 캐시 이름이 그대로면 새 워커가 예전 캐시를 안 지워서 폰에 옛 화면이 남는다.
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
          .filter((url) => url !== '/sw.js' && url !== '/manifest.webmanifest')
          .concat('/')
        const stamped = readFileSync(file, 'utf8')
          .replace('__BUILD_ID__', BUILD_ID)
          .replace('__PRECACHE__', JSON.stringify(precache))
        writeFileSync(file, stamped)
        console.log(`  sw.js  build ${BUILD_ID} · 미리 받을 파일 ${precache.length}개`)
      } catch {
        // sw.js 가 없으면 조용히 넘어간다
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
