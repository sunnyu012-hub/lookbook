import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALL_COLLECTION_ITEMS, CATALOG } from '@/lib/collection/catalog'
import { DRAWN_BY_HAND, HAS_ART } from '@/lib/collection/assets'
import { LAYER } from '@/lib/collection/placement'
import manifest from '@/data/asset-manifest.json'

/**
 * 그림이 실제로 거기 있는지.
 *
 * 카탈로그가 가리키는 파일이 없으면 앱에서는 조용히 fallback 으로 넘어가서
 * 눈치채기 어렵다. 그래서 빌드 전에 여기서 잡는다.
 */

const PUBLIC = path.resolve(__dirname, '../../../public')

describe('그림 파일', () => {
  it('카탈로그가 가리키는 파일이 전부 있다', () => {
    const broken = ALL_COLLECTION_ITEMS.filter(
      (item) => item.assetKey && !existsSync(path.join(PUBLIC, item.assetKey)),
    ).map((item) => `${item.id} → ${item.assetKey}`)

    expect(broken).toEqual([])
  })

  it('그림이 있다고 표시된 것에는 전부 경로가 붙는다', () => {
    const noPath = ALL_COLLECTION_ITEMS.filter((i) => HAS_ART.has(i.id) && !i.assetKey)
    expect(noPath.map((i) => i.id)).toEqual([])
  })

  it('폴더에 주인 없는 파일이 남아 있지 않다', () => {
    const known = new Set(
      ALL_COLLECTION_ITEMS.filter((i) => i.assetKey).map((i) => path.join(PUBLIC, i.assetKey!)),
    )

    const found: string[] = []
    const walk = (dir: string) => {
      if (!existsSync(dir)) return
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (full.endsWith('.webp') && !known.has(full)) {
          found.push(path.relative(PUBLIC, full))
        }
      }
    }
    walk(path.join(PUBLIC, 'assets/items'))

    expect(found).toEqual([])
  })

  it('같은 파일을 두 물건이 쓰지 않는다', () => {
    const paths = ALL_COLLECTION_ITEMS.filter((i) => i.assetKey).map((i) => i.assetKey!)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('매니페스트가 카탈로그와 맞는다', () => {
    const entries = Object.entries(manifest as Record<string, { file: string }>)
    expect(entries.length).toBe(HAS_ART.size)

    for (const [id, entry] of entries) {
      const item = ALL_COLLECTION_ITEMS.find((i) => i.id === id)
      expect(item, id).toBeDefined()
      expect(item!.assetKey, id).toBe(entry.file)
    }
  })
})

describe('배치 정보', () => {
  it('모든 물건에 놓는 자리와 크기가 있다', () => {
    for (const item of ALL_COLLECTION_ITEMS) {
      expect(item.placementType, item.id).toBeDefined()
      expect(item.placement, item.id).toBeDefined()
      expect(item.defaultScale, item.id).toBeGreaterThan(0)
      expect(item.defaultScale, item.id).toBeLessThan(0.6)
    }
  })

  it('러그는 늘 가구보다 아래 층이다', () => {
    expect(LAYER.RUG).toBeLessThan(LAYER.FLOOR)
    expect(LAYER.FLOOR).toBeLessThan(LAYER.TABLETOP)
    expect(LAYER.TABLETOP).toBeLessThan(LAYER.HANGING)

    const rugs = CATALOG.filter((i) => i.placementType === 'RUG')
    expect(rugs.length).toBeGreaterThan(5)
    for (const rug of rugs) expect(rug.layer, rug.id).toBe(LAYER.RUG)
  })

  it('재료는 방에 놓을 수 없다', () => {
    const materials = ALL_COLLECTION_ITEMS.filter((i) => i.category === 'MATERIAL')
    expect(materials.length).toBeGreaterThan(0)
    for (const m of materials) {
      expect(m.placement, m.id).toBe('MATERIAL_ONLY')
      expect(m.placeable, m.id).toBe(false)
    }
  })

  it('먹을 것은 대부분 도감에만 둔다', () => {
    const food = CATALOG.filter((i) => i.category === 'FOOD')
    const display = food.filter((i) => i.placement === 'DISPLAY_ONLY').length
    expect(display).toBeGreaterThan(food.length / 2)
  })

  it('트로피는 전부 방에 놓을 수 있다', () => {
    for (const t of ALL_COLLECTION_ITEMS.filter((i) => i.category === 'TROPHY')) {
      expect(t.placement, t.id).toBe('PLACEABLE')
    }
  })

  it('벽에 거는 것은 가운데를 기준으로 잡는다', () => {
    for (const item of CATALOG.filter((i) => i.placementType === 'WALL')) {
      expect(item.anchor, item.id).toBe('CENTER')
    }
  })

  it('도감 240개에 그림이 하나도 안 빠졌다', () => {
    expect(CATALOG.filter((i) => !i.assetKey).map((i) => i.id)).toEqual([])
  })

  it('직접 그린 것에도 원본 SVG 가 남아 있다', () => {
    for (const id of DRAWN_BY_HAND) {
      const svg = path.resolve(__dirname, '../../../assets/drawn', `${id}.svg`)
      expect(existsSync(svg), id).toBe(true)
    }
    expect(DRAWN_BY_HAND.size).toBeGreaterThan(0)
  })

  it('놓을 수 있는 물건이 절반은 넘는다', () => {
    const placeable = CATALOG.filter((i) => i.placement === 'PLACEABLE').length
    expect(placeable).toBeGreaterThan(120)
  })
})
