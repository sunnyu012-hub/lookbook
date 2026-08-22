import type { EquippedOutfit, WardrobeCategory, WardrobeItem } from '@/types/wardrobe'
import manifest from '@/data/wardrobe-manifest.json'
import { LAYER_BY_CATEGORY } from './layers'
import { BASIC_OUTFIT, WARDROBE_ROWS } from './items'

/**
 * 옷장 목록을 한 장으로 조립한다.
 *
 * 좌표는 매니페스트(그림에서 계산한 것), 이름·값은 표(사람이 정한 것).
 * 둘을 여기서만 붙인다.
 */

interface ManifestEntry {
  file: string
  category: string
  w: number
  h: number
  scale: number
  offsetX: number
  offsetY: number
  adjusted?: string
}

interface ManifestShape {
  base: {
    file: string
    w: number
    h: number
    landmarks: Record<string, number>
  }
  items: Record<string, ManifestEntry>
}

const data = manifest as unknown as ManifestShape

/** 베이스 그림 한 장과 그 위의 기준점들 */
export const AVATAR_BASE = {
  file: data.base.file,
  width: data.base.w,
  height: data.base.h,
  landmarks: data.base.landmarks,
}

function build(id: string, entry: ManifestEntry): WardrobeItem {
  const row = WARDROBE_ROWS[id]
  const category = entry.category as WardrobeCategory

  return {
    id,
    // 이름을 아직 안 붙였으면 파일 이름을 그대로 쓴다.
    // 그림을 먼저 넣어보고 이름은 나중에 붙일 수 있어야 한다.
    name: row?.name ?? id.replace(/_/g, ' '),
    category,
    layer: LAYER_BY_CATEGORY[category] ?? 'TOP',
    assetKey: entry.file,
    rarity: row?.rarity ?? 'COMMON',
    styleTags: row?.tags ?? [],
    ...(row?.price !== undefined ? { price: row.price } : {}),
    ...(row?.basic ? { basic: true } : {}),
    offsetX: entry.offsetX,
    offsetY: entry.offsetY,
    scale: entry.scale,
    w: entry.w,
    h: entry.h,
    ...(entry.adjusted ? { adjusted: entry.adjusted } : {}),
    genderRestriction: null,
  }
}

export const WARDROBE: WardrobeItem[] = Object.entries(data.items)
  .map(([id, entry]) => build(id, entry))
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

const BY_ID = new Map(WARDROBE.map((item) => [item.id, item]))

export function findWardrobeItem(id: string | null | undefined): WardrobeItem | null {
  if (!id) return null
  return BY_ID.get(id) ?? null
}

export function wardrobeByCategory(category: WardrobeCategory): WardrobeItem[] {
  return WARDROBE.filter((item) => item.category === category)
}

/** 팔지 않고 늘 가지고 있는 옷 */
export const BASIC_ITEM_IDS = WARDROBE.filter((i) => i.basic).map((i) => i.id)

export function emptyOutfit(): EquippedOutfit {
  return {
    topId: null,
    bottomId: null,
    onePieceId: null,
    shoesId: null,
    hairId: null,
    headId: null,
    accessoryId: null,
    bagId: null,
    faceId: null,
  }
}

/** 새로 시작하거나 옷장이 비어 있을 때 입혀주는 한 벌 */
export function defaultOutfit(): EquippedOutfit {
  return {
    ...emptyOutfit(),
    topId: findWardrobeItem(BASIC_OUTFIT.topId) ? BASIC_OUTFIT.topId : null,
    bottomId: findWardrobeItem(BASIC_OUTFIT.bottomId) ? BASIC_OUTFIT.bottomId : null,
  }
}

/** 옷장 칸 → 지금 입고 있는 것의 id */
export const OUTFIT_SLOT: Record<WardrobeCategory, keyof EquippedOutfit> = {
  TOP: 'topId',
  BOTTOM: 'bottomId',
  ONE_PIECE: 'onePieceId',
  SHOES: 'shoesId',
  HAIR: 'hairId',
  HEAD: 'headId',
  ACCESSORY: 'accessoryId',
  BAG: 'bagId',
  FACE: 'faceId',
}
