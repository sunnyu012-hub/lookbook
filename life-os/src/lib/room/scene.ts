/**
 * 오늘의 방 만들기.
 *
 * 입력(오늘 기록 · 모드 · 투약 여부)을 받아서 "방 위에 무엇을 얹을지" 만 정한다.
 * 가구는 정하지 않는다 — 가구는 Room Base 그림 안에 이미 있다.
 *
 * 규칙
 *   · 캐릭터와 고양이는 정해진 자리(anchor)에만 앉는다. 매번 랜덤으로 움직이지 않는다.
 *   · 소품은 한 번에 최대 3개. 방을 데이터 대시보드로 만들지 않는다.
 *   · 효과는 아주 옅게. 화면 가득 파티클을 뿌리지 않는다.
 */
import type { Checkin, EnergyMode, Preferences } from '@/types'
import type { PixelAsset } from '../pixelAssets'
import { effects as fx, gear, icons, items, pets } from '../pixelAssets'
import { MODE_CHARACTER } from '../pixelAssets'
import { place, type AnchorName, type Placed } from './anchors'

export type RoomLayer = 'props' | 'character' | 'pet' | 'effects' | 'objects'

export type Motion = 'breathe' | 'floaty' | 'hop' | 'twinkle' | 'zzz' | 'none'

export interface Sprite extends Placed {
  key: string
  asset: PixelAsset
  layer: RoomLayer
  motion: Motion
  /** 애니메이션 시작을 어긋나게 해서 기계적으로 보이지 않게 */
  delay?: number
  /** 바닥 그림자 */
  shadow?: boolean
  /** 읽어 주는 이름 (장식이면 비워 둔다) */
  label?: string
}

/** 모드마다 캐릭터가 앉는 자리와 크기 */
const CHARACTER_SPOT: Record<EnergyMode, { anchor: AnchorName; width: number; motion: Motion }> = {
  RECOVERY: { anchor: 'bed', width: 21, motion: 'breathe' },
  EASY: { anchor: 'beanbag', width: 22, motion: 'floaty' },
  NORMAL: { anchor: 'desk', width: 23, motion: 'breathe' },
  POWER: { anchor: 'rug', width: 21, motion: 'hop' },
}

/** 고양이는 캐릭터를 피해 앉는다 */
const PET_SPOT: Record<EnergyMode, { anchor: AnchorName; asset: PixelAsset; width: number }> = {
  RECOVERY: { anchor: 'rugEdge', asset: pets.catCurl, width: 10 },
  EASY: { anchor: 'rugEdge', asset: pets.catLying, width: 11 },
  NORMAL: { anchor: 'catBed', asset: pets.catSit, width: 10 },
  POWER: { anchor: 'bedFoot', asset: pets.catWalk, width: 10 },
}

/** 모드마다 아주 옅은 효과 하나 (POWER 만 반짝임 두어 개) */
function modeEffects(mode: EnergyMode): Sprite[] {
  const at = (anchor: AnchorName, o: Parameters<typeof place>[1]) => place(anchor, o)

  switch (mode) {
    case 'RECOVERY':
      return [
        { key: 'zzz', asset: fx.zzzBubble, layer: 'effects', motion: 'zzz',
          ...at('bed', { dx: -8, dy: -14, width: 8 }) },
      ]
    case 'EASY':
      return [
        { key: 'sparkle', asset: fx.sparkle01, layer: 'effects', motion: 'twinkle',
          ...at('beanbag', { dx: 7, dy: -27, width: 4 }) },
      ]
    case 'NORMAL':
      return [
        { key: 'sparkle', asset: fx.sparkle01, layer: 'effects', motion: 'twinkle',
          ...at('desk', { dx: 10, dy: -18, width: 4 }) },
      ]
    case 'POWER':
      return [
        { key: 'sp1', asset: fx.sparkle01, layer: 'effects', motion: 'twinkle',
          ...at('rug', { dx: -10, dy: -18, width: 4 }) },
        { key: 'sp2', asset: fx.sparkle02, layer: 'effects', motion: 'twinkle', delay: 800,
          ...at('rug', { dx: 9, dy: -24, width: 4 }) },
      ]
  }
}

/** 기분이 아주 좋거나 가라앉은 날에만 하나 더 */
function moodEffect(checkin: Checkin | null): Sprite | null {
  if (!checkin?.mood) return null
  if (checkin.mood >= 5) {
    return {
      key: 'heart', asset: fx.heart, layer: 'effects', motion: 'floaty',
      ...place('wallRight', { dx: -9, dy: 2, width: 5 }),
    }
  }
  if (checkin.mood <= 2) {
    return {
      key: 'cloud', asset: fx.cloud, layer: 'effects', motion: 'floaty',
      ...place('wallRight', { dx: -9, dy: 1, width: 7 }),
    }
  }
  return null
}

export interface SceneInput {
  checkin: Checkin | null
  mode: EnergyMode | null
  prefs: Preferences
  /** 오늘 투약을 적었는지 */
  injectedToday: boolean
}

/**
 * 오늘 기록에서 방에 놓을 소품을 고른다.
 * 앞에서부터 최대 3개까지만 쓴다 — 방이 아이템 창고가 되지 않게.
 */
function dynamicProps({ checkin, mode, prefs, injectedToday }: SceneInput): Sprite[] {
  const out: Sprite[] = []
  const push = (
    key: string,
    asset: PixelAsset,
    anchor: AnchorName,
    o: Parameters<typeof place>[1] = {},
    label?: string,
  ) => {
    out.push({ key, asset, layer: 'props', motion: 'none', shadow: true, label, ...place(anchor, o) })
  }

  // 클라이밍한 날 — 신발이 바닥에 나와 있다
  if (checkin?.exercise && (checkin.exerciseType ?? '').includes('클라이밍')) {
    push('climbing', gear.climbingShoes, 'floorLeft', { width: 9 }, '클라이밍 신발')
  } else if (checkin?.exercise) {
    push('sneakers', gear.sneakers, 'floorLeft', { width: 9 }, '운동화')
  }

  // 오래 일한 날 — 책상 위에 커피
  if ((checkin?.workHours ?? 0) >= 6 || checkin?.caffeineConsumed) {
    push('coffee', items.coffeeMug, 'tableTop', { width: 5 }, '커피')
  }

  // 쉬는 날 — 따뜻한 우유 한 잔
  if (mode === 'RECOVERY') {
    push('warm', items.coffeeMug, 'bedFoot', { dx: 8, dy: 4, width: 5 }, '따뜻한 것')
  }

  // 투약을 적은 날 — 협탁 위 작은 표시 (숫자는 붙이지 않는다)
  if (prefs.mounjaroEnabled && injectedToday) {
    push('mark', icons.log, 'floorRight', { dy: -3, width: 6 }, '오늘 적어 둔 기록')
  }

  return out.slice(0, 3)
}

/**
 * 데이터를 세계관 오브젝트로만 연결한다.
 * 숫자는 방에 붙이지 않는다 — 숫자는 아래 MY LIFE 에서 본다.
 */
function worldObjects({ prefs }: SceneInput): Sprite[] {
  const out: Sprite[] = []

  if (prefs.relationshipEnabled && prefs.relationshipStartDate) {
    out.push({
      key: 'love-memo', asset: fx.heartBubble, layer: 'objects', motion: 'floaty',
      label: '핀보드에 붙여 둔 하트',
      ...place('pinboard', { width: 7 }),
    })
  }

  return out
}

export interface RoomSceneState {
  character: Sprite
  pet: Sprite
  props: Sprite[]
  effects: Sprite[]
  objects: Sprite[]
}

export function buildScene(input: SceneInput): RoomSceneState {
  const mode = input.mode ?? 'EASY'
  const spot = CHARACTER_SPOT[mode]
  const petSpot = PET_SPOT[mode]

  const character: Sprite = {
    key: 'character',
    asset: MODE_CHARACTER[mode],
    layer: 'character',
    motion: spot.motion,
    shadow: true,
    label: '오늘의 나',
    ...place(spot.anchor, { width: spot.width }),
  }

  const pet: Sprite = {
    key: 'pet',
    asset: petSpot.asset,
    layer: 'pet',
    motion: 'breathe',
    shadow: true,
    label: '고양이',
    ...place(petSpot.anchor, { width: petSpot.width }),
  }

  const mood = moodEffect(input.checkin)

  return {
    character,
    pet,
    props: dynamicProps(input),
    effects: [...modeEffects(mode), ...(mood ? [mood] : [])],
    objects: worldObjects(input),
  }
}

/** 시간대 — Room Base 를 아침/낮/저녁/밤으로 늘릴 때 쓴다 */
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'

export function timeOfDay(now: Date = new Date()): TimeOfDay {
  const h = now.getHours()
  if (h < 9) return 'morning'
  if (h < 17) return 'day'
  if (h < 21) return 'evening'
  return 'night'
}
