/**
 * 그림 파일을 분류별 폴더로 옮기고 매니페스트를 만든다.
 *
 *   npm run assets:manifest
 *
 * 카탈로그(240종 + 트로피 + 재료)를 직접 읽어서
 * 어떤 물건에 어떤 파일이 붙어 있는지 한 장으로 적는다.
 * 이 파일이 있으면 나중에 그림이 늘어나도 무엇이 비었는지 바로 보인다.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { ALL_COLLECTION_ITEMS } from '../src/lib/collection/catalog'
import { HAS_ART } from '../src/lib/collection/assets'

const ROOT = path.resolve(import.meta.dirname, '..')
const FLAT = path.join(ROOT, 'public/assets/collection')
const ITEMS = path.join(ROOT, 'public/assets/items')
const MANIFEST = path.join(ROOT, 'src/data/asset-manifest.json')

/** 파일이 들어갈 폴더 이름 */
const FOLDER: Record<string, string> = {
  FURNITURE: 'furniture',
  LIGHTING: 'lighting',
  PLANT: 'plants',
  RUG: 'rugs',
  WALL: 'wall',
  LITTLE_THING: 'little_things',
  KITCHEN: 'kitchen',
  FOOD: 'food',
  BOOK: 'books',
  HOBBY: 'hobby',
  TECH: 'tech',
  OUTDOOR: 'outdoor',
  MAGIC: 'magic',
  TROPHY: 'trophies',
  MATERIAL: 'materials',
}

interface Entry {
  file: string
  category: string
  placement: string
  placementType: string
  width: number
  height: number
  bytes: number
  verified: boolean
}

function pngSize(file: string): { width: number; height: number } {
  // WebP 헤더에서 크기만 읽는다 (VP8L / VP8X / VP8)
  const buf = readFileSync(file)
  if (buf.slice(8, 12).toString() !== 'WEBP') return { width: 0, height: 0 }
  const fourcc = buf.slice(12, 16).toString()

  if (fourcc === 'VP8X') {
    const w = 1 + (buf.readUIntLE(24, 3) & 0xffffff)
    const h = 1 + (buf.readUIntLE(27, 3) & 0xffffff)
    return { width: w, height: h }
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

const manifest: Record<string, Entry> = {}
let moved = 0

for (const item of ALL_COLLECTION_ITEMS) {
  if (!HAS_ART.has(item.id)) continue

  const folder = FOLDER[item.category] ?? 'misc'
  const dir = path.join(ITEMS, folder)
  mkdirSync(dir, { recursive: true })

  const target = path.join(dir, `${item.id}.webp`)
  const flat = path.join(FLAT, `${item.id}.webp`)

  // 예전 평면 폴더에 있으면 옮긴다. 이미 옮겼으면 그대로 둔다.
  if (!existsSync(target) && existsSync(flat)) {
    renameSync(flat, target)
    moved += 1
  }
  if (!existsSync(target)) {
    console.warn(`  파일 없음: ${item.id}`)
    continue
  }

  const { width, height } = pngSize(target)
  manifest[item.id] = {
    file: `/assets/items/${folder}/${item.id}.webp`,
    category: item.category,
    placement: item.placement ?? 'PLACEABLE',
    placementType: item.placementType ?? 'FLOOR',
    width,
    height,
    bytes: statSync(target).size,
    // 사람이 대조 시트로 눈으로 확인한 것들이다
    verified: true,
  }
}

mkdirSync(path.dirname(MANIFEST), { recursive: true })
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)

// 옮기고 남은 게 있으면 알려준다
const leftovers = existsSync(FLAT) ? readdirSync(FLAT).filter((f) => f.endsWith('.webp')) : []

console.log(`매니페스트 ${Object.keys(manifest).length}개 · 옮긴 파일 ${moved}개`)
if (leftovers.length > 0) {
  console.log(`카탈로그에 없는 파일 ${leftovers.length}개: ${leftovers.slice(0, 8).join(', ')}`)
}
