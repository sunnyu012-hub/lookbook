import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { WARDROBE, AVATAR_BASE, findWardrobeItem, defaultOutfit, emptyOutfit } from '@/lib/wardrobe/catalog'
import { LAYER_ORDER, LAYER_BY_CATEGORY, ACTIVE_CATEGORIES } from '@/lib/wardrobe/layers'
import {
  defaultWardrobe,
  dressed,
  hiddenByOnePiece,
  ownedInCategory,
  ownsItem,
  randomOutfit,
  sanitizeWardrobe,
  takeOff,
  wearItem,
  wornIn,
} from '@/lib/wardrobe/state'

const PUBLIC = path.resolve(__dirname, '../../../public')

describe('옷장 목록', () => {
  it('상의와 하의가 다 있다', () => {
    const tops = WARDROBE.filter((i) => i.category === 'TOP')
    const bottoms = WARDROBE.filter((i) => i.category === 'BOTTOM')
    expect(tops.length).toBe(16)
    expect(bottoms.length).toBe(16)
  })

  it('그림 파일이 전부 실제로 있다', () => {
    const broken = WARDROBE.filter((i) => i.assetKey && !existsSync(path.join(PUBLIC, i.assetKey)))
    expect(broken.map((i) => i.id)).toEqual([])
    expect(existsSync(path.join(PUBLIC, AVATAR_BASE.file))).toBe(true)
  })

  it('모든 옷에 이름과 놓을 자리가 있다', () => {
    for (const item of WARDROBE) {
      expect(item.name.trim().length, item.id).toBeGreaterThan(0)
      expect(item.layer, item.id).toBe(LAYER_BY_CATEGORY[item.category])
      expect(item.scale, item.id).toBeGreaterThan(0)
      expect(item.w, item.id).toBeGreaterThan(0)
    }
  })

  it('성별로 가르지 않는다', () => {
    for (const item of WARDROBE) expect(item.genderRestriction, item.id).toBeNull()
  })

  it('옷은 베이스 안에 들어온다', () => {
    // 좌표는 베이스 픽셀이다. 밖으로 크게 벗어나면 정렬이 깨진 것이다.
    for (const item of WARDROBE) {
      expect(item.offsetX, item.id).toBeGreaterThan(-AVATAR_BASE.width * 0.3)
      expect(item.offsetY, item.id).toBeGreaterThan(-AVATAR_BASE.height * 0.1)
      expect(item.offsetY + item.h * item.scale, item.id).toBeLessThan(AVATAR_BASE.height * 1.1)
    }
  })

  it('하의는 신발 밑창이 발끝에 온다', () => {
    // 하의 그림에 다리와 신발까지 들어 있어서, 밑창이 바닥에 안 닿으면 맨발이 삐져나온다
    const feet = AVATAR_BASE.landmarks.feetY
    for (const item of WARDROBE.filter((i) => i.category === 'BOTTOM')) {
      const sole = item.offsetY + item.h * item.scale
      expect(sole, item.id).toBeGreaterThanOrEqual(feet)
      expect(sole, item.id).toBeLessThan(feet + 30)
    }
  })

  it('상의는 어깨 위로 지나치게 올라가지 않는다', () => {
    // 올라가면 얼굴을 덮는다. 그런 것 셋은 손으로 내려뒀다.
    const neck = AVATAR_BASE.landmarks.neckY
    for (const item of WARDROBE.filter((i) => i.category === 'TOP')) {
      expect(item.offsetY, `${item.id} ${item.adjusted ?? ''}`).toBeGreaterThan(neck - 90)
    }
  })
})

describe('레이어', () => {
  it('러그처럼 순서가 한 곳에서만 정해진다', () => {
    expect(LAYER_ORDER.BASE).toBeLessThan(LAYER_ORDER.BOTTOM)
    expect(LAYER_ORDER.BOTTOM).toBeLessThan(LAYER_ORDER.TOP)
    expect(LAYER_ORDER.TOP).toBeLessThan(LAYER_ORDER.ONE_PIECE)
    expect(LAYER_ORDER.HAIR_BACK).toBeLessThan(LAYER_ORDER.BASE)
    expect(LAYER_ORDER.FACE).toBeLessThan(LAYER_ORDER.HAIR)
  })

  it('Phase 1 에서 여는 칸은 넷이다', () => {
    expect(ACTIVE_CATEGORIES).toEqual(['TOP', 'BOTTOM', 'ONE_PIECE', 'SHOES'])
  })

  it('다음에 붙일 자리도 미리 열려 있다', () => {
    for (const layer of ['HAIR', 'HEAD', 'BAG', 'FACE'] as const) {
      expect(LAYER_ORDER[layer]).toBeGreaterThan(0)
    }
    expect(emptyOutfit()).toHaveProperty('hairId')
    expect(emptyOutfit()).toHaveProperty('faceId')
  })
})

describe('갈아입기', () => {
  it('한 번 누르면 입는다', () => {
    const after = wearItem(emptyOutfit(), 'brown_knit')
    expect(after.topId).toBe('brown_knit')
  })

  it('같은 걸 다시 누르면 벗는다', () => {
    const on = wearItem(emptyOutfit(), 'brown_knit')
    expect(wearItem(on, 'brown_knit').topId).toBeNull()
  })

  it('다른 상의를 누르면 갈아입는다', () => {
    const on = wearItem(emptyOutfit(), 'brown_knit')
    expect(wearItem(on, 'grey_hoodie').topId).toBe('grey_hoodie')
  })

  it('상의를 갈아입어도 하의는 그대로다', () => {
    let outfit = wearItem(emptyOutfit(), 'blue_jeans')
    outfit = wearItem(outfit, 'brown_knit')
    expect(outfit.bottomId).toBe('blue_jeans')
    expect(outfit.topId).toBe('brown_knit')
  })

  it('없는 옷은 아무 일도 일으키지 않는다', () => {
    const before = emptyOutfit()
    expect(wearItem(before, '없는옷')).toEqual(before)
  })

  it('벗기가 먹는다', () => {
    const on = wearItem(emptyOutfit(), 'blue_jeans')
    expect(takeOff(on, 'BOTTOM').bottomId).toBeNull()
  })

  it('지금 뭘 입고 있는지 알 수 있다', () => {
    const outfit = wearItem(emptyOutfit(), 'brown_knit')
    expect(wornIn(outfit, 'TOP')).toBe('brown_knit')
    expect(wornIn(outfit, 'BOTTOM')).toBeNull()
  })
})

describe('원피스 충돌', () => {
  const withOnePiece = () => ({
    ...emptyOutfit(),
    topId: 'brown_knit',
    bottomId: 'blue_jeans',
    onePieceId: 'x',
  })

  it('원피스를 입으면 상·하의는 가려지기만 한다', () => {
    const outfit = withOnePiece()
    expect(hiddenByOnePiece(outfit, 'TOP')).toBe(true)
    expect(hiddenByOnePiece(outfit, 'BOTTOM')).toBe(true)
    // 선택은 살아 있다
    expect(outfit.topId).toBe('brown_knit')
    expect(outfit.bottomId).toBe('blue_jeans')
  })

  it('벗으면 입고 있던 게 그대로 돌아온다', () => {
    const off = takeOff(withOnePiece(), 'ONE_PIECE')
    expect(off.onePieceId).toBeNull()
    expect(hiddenByOnePiece(off, 'TOP')).toBe(false)
    expect(off.topId).toBe('brown_knit')
    expect(off.bottomId).toBe('blue_jeans')
  })

  it('신발은 원피스에 가려지지 않는다', () => {
    expect(hiddenByOnePiece(withOnePiece(), 'SHOES')).toBe(false)
  })
})

describe('가진 것', () => {
  it('기본 옷은 목록에 없어도 늘 입을 수 있다', () => {
    const empty = { owned: [], outfit: emptyOutfit() }
    expect(ownsItem(empty, 'cream_tee')).toBe(true)
    expect(ownsItem(empty, 'sage_cable_knit')).toBe(false)
  })

  it('칸별로 가진 것만 보여준다', () => {
    const only = { owned: ['brown_knit'], outfit: emptyOutfit() }
    const tops = ownedInCategory(only, 'TOP').map((i) => i.id)
    expect(tops).toContain('brown_knit')
    expect(tops).toContain('cream_tee') // 기본 옷
    expect(tops).not.toContain('grey_hoodie')
  })
})

describe('아무거나 입기', () => {
  it('가진 것 중에서만 고른다', () => {
    const wardrobe = defaultWardrobe()
    for (let i = 0; i < 30; i += 1) {
      const outfit = randomOutfit(wardrobe)
      if (outfit.topId) expect(ownsItem(wardrobe, outfit.topId)).toBe(true)
      if (outfit.bottomId) expect(ownsItem(wardrobe, outfit.bottomId)).toBe(true)
    }
  })

  it('원피스가 없으면 원피스를 입히지 않는다', () => {
    const wardrobe = defaultWardrobe()
    for (let i = 0; i < 20; i += 1) {
      expect(randomOutfit(wardrobe).onePieceId).toBeNull()
    }
  })
})

describe('저장된 값', () => {
  it('옷장이 없던 세이브에는 기본 한 벌을 입혀준다', () => {
    const fresh = sanitizeWardrobe(undefined)
    expect(fresh.outfit.topId).toBe(defaultOutfit().topId)
    expect(fresh.outfit.bottomId).toBe(defaultOutfit().bottomId)
    expect(fresh.owned.length).toBeGreaterThan(0)
  })

  it('없어진 옷 id 는 조용히 비운다', () => {
    const cleaned = sanitizeWardrobe({
      owned: ['brown_knit', '없어진옷'],
      outfit: { ...emptyOutfit(), topId: '없어진옷', bottomId: 'blue_jeans' },
    })
    expect(cleaned.owned).toEqual(['brown_knit'])
    expect(cleaned.outfit.topId).toBeNull()
    expect(cleaned.outfit.bottomId).toBe('blue_jeans')
  })

  it('벗어둔 것을 열 때마다 다시 입히지 않는다', () => {
    const stripped = sanitizeWardrobe({
      owned: ['blue_jeans'],
      outfit: { ...emptyOutfit(), bottomId: 'blue_jeans' },
    })
    expect(stripped.outfit.topId).toBeNull()
  })

  it('다 벗은 채로 시작하지는 않는다', () => {
    expect(dressed(emptyOutfit()).topId).not.toBeNull()
  })

  it('입고 있는 게 하나라도 있으면 건드리지 않는다', () => {
    const only = { ...emptyOutfit(), bottomId: 'blue_jeans' }
    expect(dressed(only)).toEqual(only)
  })
})

describe('찾기', () => {
  it('없는 id 는 null', () => {
    expect(findWardrobeItem('없음')).toBeNull()
    expect(findWardrobeItem(null)).toBeNull()
    expect(findWardrobeItem(undefined)).toBeNull()
  })
})
