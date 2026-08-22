/**
 * 손으로 그린 SVG 를 PNG 로 그린다. (다음 단계: trim-drawn.py)
 *
 *   npm run assets:draw
 *
 * 시트에 없는 물건 열한 개는 직접 그렸다. 원본은 assets/drawn/<id>.svg 다.
 * SVG 를 고치고 이 명령을 다시 돌리면 게임 안 그림도 따라 바뀐다.
 *
 * 크롬은 playwright 로 띄운다. 그림 다시 그릴 때만 쓰는 것이라
 * dependencies 에 넣지 않았다 — 없으면 여기서 멈추고 알려준다.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'assets/drawn')
const TMP = path.join(ROOT, 'assets/drawn/.rendered')

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  console.error('playwright 가 없다. npm i -D playwright 뒤에 다시 실행한다.')
  process.exit(1)
}

/** 크게 그려서 줄인다. 줄이면 가장자리가 부드러워진다. */
const SIZE = 1024

rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

// 이 환경에는 크롬이 딴 데 있다. 없으면 playwright 가 알아서 찾는다.
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium'
const browser = await chromium.launch(existsSync(CHROME) ? { executablePath: CHROME } : {})
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 1,
})

const names = readdirSync(SRC)
  .filter((f) => f.endsWith('.svg'))
  .sort()

for (const name of names) {
  const svg = readFileSync(path.join(SRC, name), 'utf8')
  await page.setContent(
    `<body style="margin:0;width:${SIZE}px;height:${SIZE}px">` +
      svg.replace('<svg', `<svg width="${SIZE}" height="${SIZE}"`) +
      '</body>',
  )
  writeFileSync(
    path.join(TMP, name.replace(/\.svg$/, '.png')),
    await page.screenshot({ omitBackground: true }),
  )
}

await browser.close()
console.log(`그린 것 ${names.length}개`)
