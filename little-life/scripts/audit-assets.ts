/**
 * 그림과 카탈로그가 어긋난 데가 없는지 훑는다.
 *
 *   npm run assets:audit
 *
 * 리포트를 reports/asset-audit.md 로 남긴다.
 * "있는 것처럼 보이는데 없는 것" 을 찾는 게 목적이라, 없는 건 없다고만 적는다.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  ALL_COLLECTION_ITEMS,
  CATALOG,
  MATERIAL_CATALOG,
  TROPHY_CATALOG,
} from '../src/lib/collection/catalog'

const ROOT = path.resolve(import.meta.dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const REPORT = path.join(ROOT, 'reports/asset-audit.md')

/** 이 크기보다 작으면 도감에서 뭉개져 보인다 */
const SMALL_PX = 120
/** 이 크기보다 크면 폰에서 굳이 필요 없다 */
const BIG_BYTES = 120 * 1024

interface Row {
  id: string
  name: string
  note: string
}

const missing: Row[] = []
const brokenPath: Row[] = []
const placeableWithoutArt: Row[] = []
const tooSmall: Row[] = []
const tooBig: Row[] = []
const emojiOnly: Row[] = []
const silhouetteOnly: Row[] = []

let mapped = 0

function webpSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file)
  if (buf.slice(8, 12).toString() !== 'WEBP') return { width: 0, height: 0 }
  const fourcc = buf.slice(12, 16).toString()
  if (fourcc === 'VP8X') {
    return {
      width: 1 + (buf.readUIntLE(24, 3) & 0xffffff),
      height: 1 + (buf.readUIntLE(27, 3) & 0xffffff),
    }
  }
  if (fourcc === 'VP8L') {
    const bits = buf.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (fourcc === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
  }
  return { width: 0, height: 0 }
}

for (const item of ALL_COLLECTION_ITEMS) {
  const label = item.nameKo

  if (!item.assetKey) {
    if (item.icon) emojiOnly.push({ id: item.id, name: label, note: item.icon })
    else silhouetteOnly.push({ id: item.id, name: label, note: item.category })
    if (item.placement === 'PLACEABLE' && !item.icon) {
      placeableWithoutArt.push({ id: item.id, name: label, note: item.category })
    }
    missing.push({ id: item.id, name: label, note: item.category })
    continue
  }

  const file = path.join(PUBLIC, item.assetKey)
  if (!existsSync(file)) {
    brokenPath.push({ id: item.id, name: label, note: item.assetKey })
    continue
  }

  mapped += 1
  const { width, height } = webpSize(file)
  const bytes = statSync(file).size
  if (Math.max(width, height) < SMALL_PX) {
    tooSmall.push({ id: item.id, name: label, note: `${width}×${height}` })
  }
  if (bytes > BIG_BYTES) {
    tooBig.push({ id: item.id, name: label, note: `${Math.round(bytes / 1024)} KB` })
  }
}

// 카탈로그에 없는 파일이 폴더에 남아 있는지
const known = new Set(
  ALL_COLLECTION_ITEMS.filter((i) => i.assetKey).map((i) => path.join(PUBLIC, i.assetKey!)),
)
const orphans: string[] = []
function walk(dir: string) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else if (full.endsWith('.webp') && !known.has(full)) orphans.push(path.relative(PUBLIC, full))
  }
}
walk(path.join(PUBLIC, 'assets/items'))

// 아이디·경로 중복
const ids = ALL_COLLECTION_ITEMS.map((i) => i.id)
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i)
const paths = ALL_COLLECTION_ITEMS.filter((i) => i.assetKey).map((i) => i.assetKey!)
const dupPaths = paths.filter((p, i) => paths.indexOf(p) !== i)

// 배치 분류
const byPlacement = { PLACEABLE: 0, DISPLAY_ONLY: 0, MATERIAL_ONLY: 0 } as Record<string, number>
const byType: Record<string, number> = {}
for (const item of ALL_COLLECTION_ITEMS) {
  byPlacement[item.placement ?? 'PLACEABLE'] += 1
  const t = item.placementType ?? 'FLOOR'
  byType[t] = (byType[t] ?? 0) + 1
}

const table = (rows: Row[]) =>
  rows.length === 0
    ? '없음\n'
    : `${rows.map((r) => `- \`${r.id}\` ${r.name} — ${r.note}`).join('\n')}\n`

const lines = [
  '# 에셋 점검',
  '',
  `생성: \`npm run assets:audit\``,
  '',
  '## 요약',
  '',
  '| | 개수 |',
  '| --- | --- |',
  `| 도감 | ${CATALOG.length} |`,
  `| 트로피 | ${TROPHY_CATALOG.length} |`,
  `| 재료 | ${MATERIAL_CATALOG.length} |`,
  `| 그림 연결됨 | ${mapped} |`,
  `| 그림 없음 (이모지로 그림) | ${emojiOnly.length} |`,
  `| 그림도 이모지도 없음 | ${silhouetteOnly.length} |`,
  `| 경로는 있는데 파일 없음 | ${brokenPath.length} |`,
  `| 카탈로그에 없는 파일 | ${orphans.length} |`,
  `| id 중복 | ${dupIds.length} |`,
  `| 경로 중복 | ${dupPaths.length} |`,
  '',
  '## 배치 분류',
  '',
  '| | 개수 |',
  '| --- | --- |',
  ...Object.entries(byPlacement).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '| 놓는 자리 | 개수 |',
  '| --- | --- |',
  ...Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## 그림이 없는 물건',
  '',
  table(missing),
  '## 방에 놓을 수 있는데 그림이 없는 것',
  '',
  table(placeableWithoutArt),
  '## 경로는 있는데 파일이 없는 것',
  '',
  table(brokenPath),
  '## 카탈로그에 없는 파일',
  '',
  orphans.length === 0 ? '없음\n' : `${orphans.map((o) => `- ${o}`).join('\n')}\n`,
  '## 너무 작은 그림',
  '',
  table(tooSmall),
  '## 너무 큰 그림',
  '',
  table(tooBig),
]

mkdirSync(path.dirname(REPORT), { recursive: true })
writeFileSync(REPORT, `${lines.join('\n')}\n`)

console.log(`도감 ${CATALOG.length} · 연결 ${mapped} · 이모지 ${emojiOnly.length} · 실루엣 ${silhouetteOnly.length}`)
console.log(`깨진 경로 ${brokenPath.length} · 주인 없는 파일 ${orphans.length} · 중복 ${dupIds.length + dupPaths.length}`)
console.log(`리포트: reports/asset-audit.md`)

// 깨진 경로나 중복은 그냥 넘어가면 안 된다
if (brokenPath.length > 0 || dupIds.length > 0 || dupPaths.length > 0) process.exit(1)
