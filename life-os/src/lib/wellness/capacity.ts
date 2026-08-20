/**
 * TODAY'S CAPACITY — 오늘 내 상태를 생활 언어로 한 줄.
 *
 * 하는 일:
 *   · Recovery / Body / Mind / Fuel / 피로 / 잠을 같이 보고 오늘의 결을 정한다.
 *   · 그 결을 퀘스트 추천 비중과 방 안 캐릭터에 넘긴다.
 *
 * 하지 않는 일 (일부러 만들지 않았다):
 *   · 하루 일정 자동 설계, Energy Budget, 캘린더 자동 배치, "몇 시에 뭘 하세요".
 *   · 의학적 활동 제한 판단. 여긴 "오늘 이런 결이에요" 까지다.
 */
import type { Checkin } from '@/types'
import { icons, pets, effects as fx, type PixelAsset } from '../pixelAssets'

export type CapacityType = 'REST' | 'GENTLE' | 'STEADY' | 'OPEN'

export interface Capacity {
  type: CapacityType
  label: string
  ko: string
  /** 오늘이 어떤 결인지 한두 문장 */
  message: string
  /** 오늘 결에 잘 맞는 것들 */
  goodFor: string[]
  /** 오늘은 조금 살살 */
  goEasyOn: string[]
  icon: PixelAsset
  tint: string
  accent: string
  /** 몇 개의 값을 보고 정했는지 — 적으면 화면에서 "아직 배우는 중" 으로 쓴다 */
  basis: number
}

interface Meta {
  label: string
  ko: string
  goodFor: string[]
  goEasyOn: string[]
  icon: PixelAsset
  tint: string
  accent: string
}

export const CAPACITY_META: Record<CapacityType, Meta> = {
  REST: {
    label: 'REST DAY',
    ko: '쉬어가는 날',
    goodFor: ['누워 있기', '따뜻한 음료', '짧은 기록', '편한 옷'],
    goEasyOn: ['긴 일정', '새로 시작하는 일'],
    icon: pets.catCurl,
    tint: '#EFE9FB',
    accent: '#8B76C9',
  },
  GENTLE: {
    label: 'GENTLE DAY',
    ko: '살살 가는 날',
    goodFor: ['짧은 집중', '작은 정리', '편한 취미', '간단한 기록'],
    goEasyOn: ['한꺼번에 많은 일', '긴 일정'],
    icon: icons.sleep,
    tint: '#FDEFF3',
    accent: '#DE7E92',
  },
  STEADY: {
    label: 'STEADY DAY',
    ko: '평소 같은 날',
    goodFor: ['하던 일 이어가기', '집안일', '사람 만나기', '움직이기'],
    goEasyOn: ['무리해서 몰아치기'],
    icon: icons.home,
    tint: '#FDF6EA',
    accent: '#DFB63F',
  },
  OPEN: {
    label: 'OPEN DAY',
    ko: '여유 있는 날',
    goodFor: ['미뤄둔 일', '새로 시작하기', '조금 큰 정리', '나가 보기'],
    goEasyOn: ['다 하려고 하기'],
    icon: fx.rainbow,
    tint: '#E6F4EA',
    accent: '#7DB994',
  },
}

/** 1~5 를 0~100 으로 (5 가 나쁜 쪽인 값 — 피로 5 = 0점) */
const down = (v: number | null | undefined) => (v == null ? null : ((5 - v) / 4) * 100)

const mean = (xs: (number | null)[]) => {
  const list = xs.filter((x): x is number => x != null)
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null
}

export interface CapacityInput {
  checkin: Checkin | null
  /** 오늘 적어 둔 이벤트 태그 — 몸 쪽 태그가 있으면 한 단계 낮춘다 */
  events?: string[]
  sleepGoalHours?: number
}

/**
 * 오늘의 결을 정한다.
 * Overall 하나만 보지 않는다. 잠이 모자란데 기분만 좋은 날과
 * 잘 잤는데 몸이 무거운 날은 다른 하루이기 때문이다.
 */
export function todayCapacity({
  checkin,
  events = [],
  sleepGoalHours = 7,
}: CapacityInput): Capacity | null {
  if (!checkin) return null

  const recovery = checkin.recoveryScore ?? null
  const body = checkin.bodyScore ?? null
  const mind = checkin.mindScore ?? null
  const fuel = checkin.fuelScore ?? null

  const fatigue = down(checkin.fatigue)
  const sleep =
    checkin.sleepHours == null
      ? null
      : Math.max(0, Math.min(100, (checkin.sleepHours / sleepGoalHours) * 100))

  const parts = [recovery, body, mind, fuel, fatigue, sleep]
  const basis = parts.filter((p) => p != null).length
  if (basis === 0) return null

  // 몸 쪽(회복·몸·피로·잠)과 머리 쪽(마음·연료)을 나눠서 본다
  const physical = mean([recovery, body, fatigue, sleep])
  const mental = mean([mind, fuel])
  const overall = mean([physical, mental]) ?? 0

  // 몸이 힘들다고 적은 날은 한 단계 낮춘다 — 점수가 못 잡는 것을 태그가 잡는다
  const heavy = ['근육통', '피곤함', '두통', '어지럼', '몸이 무거움'].some((t) => events.includes(t))
  const adjusted = heavy ? overall - 12 : overall

  let type: CapacityType
  if (adjusted < 35) type = 'REST'
  else if (adjusted < 55) type = 'GENTLE'
  else if (adjusted < 75) type = 'STEADY'
  else type = 'OPEN'

  // 몸은 힘든데 머리는 괜찮은 날은 STEADY 로 올리지 않고 GENTLE 에 둔다
  if (
    type === 'STEADY' &&
    physical != null &&
    mental != null &&
    physical < 45 &&
    mental - physical > 20
  ) {
    type = 'GENTLE'
  }

  const meta = CAPACITY_META[type]
  return {
    type,
    label: meta.label,
    ko: meta.ko,
    message: messageOf(type, physical, mental),
    goodFor: meta.goodFor,
    goEasyOn: meta.goEasyOn,
    icon: meta.icon,
    tint: meta.tint,
    accent: meta.accent,
    basis,
  }
}

/** 몸과 머리의 차이를 문장으로 — 숫자를 그대로 읊지 않는다 */
function messageOf(type: CapacityType, physical: number | null, mental: number | null): string {
  const gap = physical != null && mental != null ? mental - physical : 0
  const bodyTired = gap > 18
  const mindTired = gap < -18

  if (type === 'REST') {
    if (mindTired) return '머리가 좀 지쳐 있는 것 같아요. 오늘은 아무것도 안 해도 괜찮아요.'
    return '오늘은 몸이 쉬고 싶다고 말하는 날이에요. 쉬는 것도 오늘의 할 일이에요.'
  }
  if (type === 'GENTLE') {
    if (bodyTired) return '몸은 조금 쉬어가고 싶어 하지만 집중력은 괜찮은 편이에요.'
    if (mindTired) return '몸은 움직일 만한데 머리가 조금 무거운 날이에요.'
    return '전체적으로 살살 가면 좋은 날이에요. 작은 것 하나면 충분해요.'
  }
  if (type === 'STEADY') {
    if (bodyTired) return '집중은 잘 되는 편이에요. 몸 쓰는 건 조금만 덜어 두세요.'
    return '평소 같은 결이에요. 하던 걸 이어가기 좋은 날이에요.'
  }
  if (bodyTired) return '머리가 아주 맑은 날이에요. 몸 쓰는 건 그날 컨디션대로만.'
  return '오늘은 여유가 있는 편이에요. 미뤄둔 것 하나 꺼내 보기 좋아요.'
}

/** 아직 오늘 기록이 없을 때 화면에 쓸 문구 */
export const CAPACITY_EMPTY = '오늘 기록을 남기면 오늘의 결을 알려 드려요.'
