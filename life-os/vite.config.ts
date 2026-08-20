import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * 배포할 때마다 서비스 워커의 캐시 이름을 새로 찍는다.
 * 이게 없으면 새 워커가 예전 캐시를 지우지 않아서, 에셋을 바꿔도 옛날 그림이 계속 나온다.
 */
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    apply: 'build' as const,
    closeBundle() {
      const file = path.resolve(__dirname, 'dist/sw.js')
      try {
        const stamped = readFileSync(file, 'utf8').replace(
          '__BUILD_ID__',
          new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14),
        )
        writeFileSync(file, stamped)
      } catch {
        // sw.js 가 없으면 조용히 넘어간다 (개발 빌드 등)
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
    port: 5173,
  },
})
