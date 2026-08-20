/**
 * 오늘의 방 만들기.
 *
 * 입력(오늘 기록 · 모드 · 투약 여부)을 받아서 "방 위에 무엇을 얹을지" 만 정한다.
 * 가구는 정하지 않는다 — 가구는 Room Base 그림 안에 이미 있다.
 *
 * 규칙
 *   · 캐릭터와 고양이는 정해진 자리(anchor)에만 앉는다. 매번 랜덤으로 움직이지 않는다.
 *   · 크기는 전부 키(방 높이 대비 %)로 말한다. 가로 폭은 그림 비율에서 계산된다.
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
const CHARACTER_SPOT: Record<EnergyMode, { anchor: AnchorName; height: number; motion: Motion }> = {
  RECOVERY: { anchor: 'bed', height: 23, motion: 'breathe' },
  EASY: { anchor: 'beanbag', height: 40, motion: 'floaty' },
  NORMAL: { anchor: 'desk', height: 35, motion: 'breathe' },
  POWER: { anchor: 'rug', height: 37, motion: 'hop' },
}

/** 고양이는 캐릭터를 피해 앉는다 — 사람이 침대면 고양이는 러그로 */
function pickPet(input: SceneInput, character: CharacterPick) {
  const base = PET_SPOT[input.mode ?? 'EASY']
  if (character.state === 'working') {
    return { anchor: 'catBed' as AnchorName, asset: pets.catSit, height: 15 }
  }
  if (character.state === 'cozy' || input.nightDone) {
    return { anchor: 'rugEdge' as AnchorName, asset: pets.catCurl, height: 11 }
  }
  if (character.state === 'happy' || character.state === 'climbing') {
    return { anchor: 'bedFoot' as AnchorName, asset: pets.catWalk, height: 12 }
  }
  if (character.anchor === 'bed') {
    return { anchor: 'rugEdge' as AnchorName, asset: pets.catCurl, height: 11 }
  }
  return base
}

/** 모드별 기본 자리 */
const PET_SPOT: Record<EnergyMode, { anchor: AnchorName; asset: PixelAsset; height: number }> = {
  RECOVERY: { anchor: 'rugEdge', asset: pets.catCurl, height: 11 },
  EASY: { anchor: 'rugEdge', asset: pets.catLying, height: 12 },
  NORMAL: { anchor: 'catBed', asset: pets.catSit, height: 15 },
  POWER: { anchor: 'bedFoot', asset: pets.catWalk, height: 12 },
}

/** 모드마다 아주 옅은 효과 하나 (POWER 만 반짝임 두어 개) */
function modeEffects(mode: EnergyMode): Sprite[] {
  const at = (anchor: AnchorName, o: Parameters<typeof place>[1]) => place(anchor, o)

  switch (mode) {
    case 'RECOVERY':
      return [
        { key: 'zzz', asset: fx.zzzBubble, layer: 'effects', motion: 'zzz',
          ...at('bed', { dx: -12, dy: -19, height: 9 }) },
      ]
    case 'EASY':
      return [
        { key: 'sparkle', asset: fx.sparkle01, layer: 'effects', motion: 'twinkle',
          ...at('beanbag', { dx: 9, dy: -36, height: 5 }) },
      ]
    case 'NORMAL':
      return [
        { key: 'sparkle', asset: fx.sparkle01, layer: 'effects', motion: 'twinkle',
          ...at('desk', { dx: 12, dy: -28, height: 5 }) },
      ]
    case 'POWER':
      return [
        { key: 'sp1', asset: fx.sparkle01, layer: 'effects', motion: 'twinkle',
          ...at('rug', { dx: -12, dy: -28, height: 5 }) },
        { key: 'sp2', asset: fx.sparkle02, layer: 'effects', motion: 'twinkle', delay: 800,
          ...at('rug', { dx: 11, dy: -34, height: 4.5 }) },
      ]
  }
}

/** 기분이 아주 좋거나 가라앉은 날에만 하나 더 */
function moodEffect(checkin: Checkin | null): Sprite | null {
  if (!checkin?.mood) return null
  if (checkin.mood >= 5) {
    return {
      key: 'heart', asset: fx.heart, layer: 'effects', motion: 'floaty',
      ...place('wallRight', { dx: -24, dy: 4, height: 7 }),
    }
  }
  if (checkin.mood <= 2) {
    return {
      key: 'cloud', asset: fx.cloud, layer: 'effects', motion: 'floaty',
      ...place('wallRight', { dx: -24, dy: 3, height: 8 }),
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
  /** 오늘 적어 둔 이벤트 태그 */
  events?: string[]
  /** 밤 마무리를 마쳤는지 */
  nightDone?: boolean
  /** 오늘 완료한 퀘스트 수 */
  questsDone?: number
  /** 지금 시간대 */
  time?: TimeOfDay
}

/**
 * 캐릭터가 지금 어떤 상태인지.
 * 우선순위: 강한 일시 상태 → 오늘 한 일 → 시간대 → 모드 → 기본
 */
export type CharacterState =
  | 'sleepy'
  | 'resting'
  | 'working'
  | 'climbing'
  | 'cozy'
  | 'happy'
  | 'lowEnergy'
  | 'mode'

export interface CharacterPick {
  state: CharacterState
  anchor: AnchorName
  height: number
  motion: Motion
  /** 읽어 주는 한 줄 */
  note: string
}

export function pickCharacter(input: SceneInput): CharacterPick {
  const mode = input.mode ?? 'EASY'
  const c = input.checkin
  const events = input.events ?? []
  const has = (t: string) => events.includes(t)

  // 1. 강한 일시 상태
  if (c?.sleepHours != null && c.sleepHours < 5) {
    return { state: 'sleepy', anchor: 'bed', height: 23, motion: 'breathe', note: '잠이 많이 모자란 날' }
  }
  if ((c?.fatigue ?? 0) >= 5 || has('피곤함')) {
    return { state: 'resting', anchor: 'bed', height: 23, motion: 'breathe', note: '오늘은 쉬는 중' }
  }
  if (mode === 'RECOVERY' && (c?.bodyPain ?? 0) >= 4) {
    return { state: 'lowEnergy', anchor: 'bed', height: 23, motion: 'breathe', note: '몸이 무거운 날' }
  }

  // 2. 오늘 한 일
  if (has('클라이밍')) {
    return { state: 'climbing', anchor: 'rug', height: 37, motion: 'hop', note: '클라이밍 다녀온 날' }
  }
  if (has('야근') || has('집중 업무') || ((c?.focus ?? 0) >= 4 && (has('출근') || has('재택')))) {
    return { state: 'working', anchor: 'desk', height: 35, motion: 'breathe', note: '일하는 중' }
  }
  if ((input.questsDone ?? 0) >= 10) {
    return { state: 'happy', anchor: 'rug', height: 37, motion: 'hop', note: '퀘스트를 많이 해낸 날' }
  }

  // 3. 밤 / 시간대
  if (input.nightDone || input.time === 'night') {
    return { state: 'cozy', anchor: 'bed', height: 23, motion: 'breathe', note: '하루를 닫는 중' }
  }

  // 4. 모드
  const spot = CHARACTER_SPOT[mode]
  return { state: 'mode', anchor: spot.anchor, height: spot.height, motion: spot.motion, note: '오늘의 나' }
}

/** 상태마다 어떤 캐릭터 그림을 쓸지 */
const STATE_CHARACTER: Partial<Record<CharacterState, PixelAsset>> = {
  sleepy: MODE_CHARACTER.RECOVERY,
  resting: MODE_CHARACTER.RECOVERY,
  lowEnergy: MODE_CHARACTER.RECOVERY,
  cozy: MODE_CHARACTER.RECOVERY,
  working: MODE_CHARACTER.NORMAL,
  climbing: MODE_CHARACTER.POWER,
  happy: MODE_CHARACTER.POWER,
}

/**
 * 오늘 기록에서 방에 놓을 소품을 고른다.
 * 앞에서부터 최대 3개까지만 쓴다 — 방이 아이템 창고가 되지 않게.
 */
function dynamicProps({ checkin, mode, prefs, injectedToday, events = [], nightDone }: SceneInput): Sprite[] {
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

  const has = (t: string) => events.includes(t)

  // 클라이밍한 날 — 신발이 바닥에 나와 있다
  if (has('클라이밍') || (checkin?.exercise && (checkin.exerciseType ?? '').includes('클라이밍'))) {
    push('climbing', gear.climbingShoes, 'floorLeft', { height: 7 }, '클라이밍 신발')
  } else if (checkin?.exercise) {
    push('sneakers', gear.sneakers, 'floorLeft', { height: 7 }, '운동화')
  }

  // 오래 일한 날 — 책상 위에 커피
  if ((checkin?.workHours ?? 0) >= 6 || checkin?.caffeineConsumed || has('카페인') || has('야근')) {
    push('coffee', items.coffeeMug, 'tableTop', { height: 6 }, '커피')
  }

  // 밤을 닫았거나 쉬는 날 — 따뜻한 것 한 잔
  if (mode === 'RECOVERY' || nightDone) {
    push('warm', items.coffeeMug, 'bedFoot', { dx: 8, dy: 4, height: 6 }, '따뜻한 것')
  }

  // 투약을 적은 날 — 협탁 위 작은 표시 (숫자는 붙이지 않는다)
  if (prefs.mounjaroEnabled && injectedToday) {
    push('mark', icons.log, 'floorRight', { dy: -3, height: 6 }, '오늘 적어 둔 기록')
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
      ...place('pinboard', { height: 8 }),
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
  const pick = pickCharacter(input)
  const petSpot = pickPet(input, pick)

  const character: Sprite = {
    key: 'character',
    asset: STATE_CHARACTER[pick.state] ?? MODE_CHARACTER[mode],
    layer: 'character',
    motion: pick.motion,
    // 침대 위에 있으면 바닥 그림자를 깔지 않는다
    shadow: pick.anchor !== 'bed',
    label: pick.note,
    ...place(pick.anchor, { height: pick.height }),
  }

  const pet: Sprite = {
    key: 'pet',
    asset: petSpot.asset,
    layer: 'pet',
    motion: 'breathe',
    shadow: true,
    label: '고양이',
    ...place(petSpot.anchor, { height: petSpot.height }),
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
