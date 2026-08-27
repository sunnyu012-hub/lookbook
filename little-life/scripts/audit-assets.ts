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
import { SKINS, skinArt, skinThumb } from '../src/lib/character/skins'
import { findPack } from '../src/lib/character/packs'

const ROOT = path.resolve(import.meta.dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const REPORT = path.join(ROOT, 'reports/asset-audit.md')

/** 이 크기보다 작으면 도감에서 뭉개져 보인다 */
const SMALL_PX = 120
/** 이 크기보다 크면 폰에서 굳이 필요 없다 */
const BIG_BYTES = 120 * 1024
/**
 * 테두리가 이만큼 넘게 물감으로 차 있으면 목록에 올린다.
 *
 * 네모난 물건(액자·모니터·러그)은 원래 여기 걸린다. 잘렸다는 뜻이 아니다.
 * 그래도 옆 조각이 딸려 들어온 그림도 같이 걸리니, 몇 장 안 될 때
 * 한 번 훑어보라는 목록으로 쓴다. 위에서 97% 쯤에 걸리는 값이다.
 */
const EDGE_RATIO = 0.35

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
const possibleCrop: Row[] = []
const styleReview: Row[] = []

let mapped = 0

/**
 * 테두리에 물감이 얼마나 닿아 있는지는 `npm run assets:thumbs` 가 재서
 * 매니페스트에 적어둔다 (webp 를 열려면 디코더가 있어야 해서 파이썬 쪽에서 잰다).
 * 이만큼 넘으면 옆 조각이 잘려 들어왔을 수 있으니 사람이 한 번 본다.
 */
const manifest = JSON.parse(
  readFileSync(path.join(ROOT, 'src/data/asset-manifest.json'), 'utf8'),
) as Record<string, { edgeAlpha?: number; bytes: number; width: number; height: number }>

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
  const edge = manifest[item.id]?.edgeAlpha
  if (edge !== undefined && edge > EDGE_RATIO) {
    possibleCrop.push({
      id: item.id,
      name: label,
      note: `테두리 ${Math.round(edge * 100)}% 가 차 있다`,
    })
  }
  // 같은 크기인데 유난히 무거우면 잔선이 많다는 뜻이다. 화풍이 섞이면 대개 여기 걸린다.
  if (width > 0 && bytes / (width * height) > 0.55) {
    styleReview.push({
      id: item.id,
      name: label,
      note: `${(bytes / (width * height)).toFixed(2)} B/px`,
    })
  }
}

/**
 * 캐릭터 모습.
 *
 * 여기에 fallback 이 있다고 해서 없는 걸 통과시키지 않는다.
 * 그림이 없으면 목록에 스물넷 중 하나가 대신 서 있게 되는데,
 * 그건 앱이 안 깨지게 하는 장치지 "있다" 는 뜻이 아니다.
 */
const skinMissing: Row[] = []
const skinNoThumb: Row[] = []
const skinOddSize: Row[] = []
let skinCanvas = ''

for (const skin of SKINS) {
  const pack = findPack(skin.packId)
  const where = pack ? `${pack.id}팩 · ${pack.name}` : '처음 스물넷'
  const file = path.join(PUBLIC, skinArt(skin).replace(/^\//, ''))

  if (!existsSync(file)) {
    skinMissing.push({ id: skin.id, name: skin.name, note: where })
    continue
  }

  const size = webpSize(file)
  const box = `${size.width}x${size.height}`
  if (skinCanvas === '') skinCanvas = box
  else if (box !== skinCanvas) {
    skinOddSize.push({ id: skin.id, name: skin.name, note: `${box} — 나머지는 ${skinCanvas}` })
  }

  if (!existsSync(path.join(PUBLIC, skinThumb(skin).replace(/^\//, '')))) {
    skinNoThumb.push({ id: skin.id, name: skin.name, note: where })
  }
}

// 스킨 id 중복 · 순서 중복
const skinIds = SKINS.map((s) => s.id)
const dupSkinIds = skinIds.filter((id, i) => skinIds.indexOf(id) !== i)
const skinOrders = SKINS.map((s) => s.sortOrder)
const dupSkinOrders = skinOrders.filter((o, i) => skinOrders.indexOf(o) !== i)

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
  `| 캐릭터 모습 | ${SKINS.length} |`,
  `| 모습 그림 없음 | ${skinMissing.length} |`,
  `| 모습 작은 그림 없음 | ${skinNoThumb.length} |`,
  `| 모습 캔버스 다름 | ${skinOddSize.length} |`,
  `| 모습 id 중복 | ${dupSkinIds.length} |`,
  `| 모습 순서 중복 | ${dupSkinOrders.length} |`,
  `| 테두리까지 꽉 참 (POSSIBLE_CROP) | ${possibleCrop.length} |`,
  `| 유난히 촘촘함 (STYLE_REVIEW) | ${styleReview.length} |`,
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
  '## 그림이 없는 캐릭터 모습',
  '',
  `캔버스 기준 ${skinCanvas || '알 수 없음'}. fallback 이 있어도 여기 남은 건 없는 것이다.`,
  '',
  table(skinMissing),
  '## 작은 그림이 없는 캐릭터 모습',
  '',
  '`npm run assets:thumbs` 로 만든다. 없으면 목록에서 원본을 그대로 받는다.',
  '',
  table(skinNoThumb),
  '## 캔버스가 다른 캐릭터 모습',
  '',
  '같은 캔버스가 아니면 화면에서 한 벌만 몸 크기가 달라 보인다.',
  '',
  table(skinOddSize),
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
  '## 테두리까지 꽉 찬 그림 (POSSIBLE_CROP)',
  '',
  `테두리가 ${Math.round(EDGE_RATIO * 100)}% 넘게 차 있는 것.`,
  '',
  '**네모난 물건은 원래 여기 걸린다.** 잘렸다는 판정이 아니라 한 번 보라는 목록이다.',
  '',
  table(possibleCrop),
  '## 유난히 촘촘한 그림 (STYLE_REVIEW)',
  '',
  '같은 크기인데 파일이 무겁다 — 잔선이 많다는 뜻이다.',
  '다른 화풍이 섞이면 대개 여기 먼저 걸리지만, 잎이 많은 화분처럼 원래 촘촘한 것도 걸린다.',
  '',
  table(styleReview),
]

mkdirSync(path.dirname(REPORT), { recursive: true })
writeFileSync(REPORT, `${lines.join('\n')}\n`)

console.log(`도감 ${CATALOG.length} · 연결 ${mapped} · 이모지 ${emojiOnly.length} · 실루엣 ${silhouetteOnly.length}`)
console.log(`깨진 경로 ${brokenPath.length} · 주인 없는 파일 ${orphans.length} · 중복 ${dupIds.length + dupPaths.length}`)
console.log(`볼 것: 테두리 꽉 참 ${possibleCrop.length} · 촘촘함 ${styleReview.length}`)
console.log(
  `모습 ${SKINS.length} · 그림 없음 ${skinMissing.length} · 작은 그림 없음 ${skinNoThumb.length} · 캔버스 다름 ${skinOddSize.length}`,
)
console.log(`리포트: reports/asset-audit.md`)

// 깨진 경로나 중복은 그냥 넘어가면 안 된다
if (brokenPath.length > 0 || dupIds.length > 0 || dupPaths.length > 0) process.exit(1)
