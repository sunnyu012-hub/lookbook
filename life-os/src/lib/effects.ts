/**
 * Buff / Debuff — Energy Score 가 왜 그 숫자인지 게임 언어로 보여준다.
 * 점수 계산 자체는 energy.ts 그대로 쓰고, 여기서는 각 항목의 기여도만 풀어낸다.
 */
import type { CheckinInput } from '@/types'
import type { IconName } from './sprites.generated'
import { WEIGHTS, energyBreakdown } from './energy'

export interface Effect {
  key: string
  /** 화면에 찍는 라틴 라벨 */
  label: string
  icon: IconName
  /** 에너지 점수 기여도 (양수 = 버프) */
  delta: number
  note: string
}

/** 이 점수를 기준으로 위/아래를 버프·디버프로 부른다 (100점 만점의 중간대) */
const NEUTRAL = 55

/** 이보다 작은 영향은 노이즈로 보고 표시하지 않는다 */
const MIN_DELTA = 3

interface Spec {
  key: keyof ReturnType<typeof energyBreakdown>
  weight: number
  buff: { label: string; icon: IconName; note: string }
  debuff: { label: string; icon: IconName; note: string }
}

const SPECS: Spec[] = [
  {
    key: 'sleep',
    weight: WEIGHTS.sleep,
    buff: { label: 'WELL SLEPT', icon: 'bed', note: '충분히 잔 날' },
    debuff: { label: 'SLEEP DEBT', icon: 'bed', note: '수면 시간이 모자란 날' },
  },
  {
    key: 'fatigue',
    weight: WEIGHTS.fatigue,
    buff: { label: 'FRESH', icon: 'bolt', note: '피로가 거의 없어요' },
    debuff: { label: 'WORN OUT', icon: 'zzz', note: '피로가 쌓여 있어요' },
  },
  {
    key: 'body',
    weight: WEIGHTS.body,
    buff: { label: 'BODY OK', icon: 'star', note: '몸이 가벼워요' },
    debuff: { label: 'BODY SORE', icon: 'star_off', note: '몸이 아프거나 뻐근해요' },
  },
  {
    key: 'focus',
    weight: WEIGHTS.focus,
    buff: { label: 'SHARP MIND', icon: 'gem', note: '집중이 잘 되는 날' },
    debuff: { label: 'FOGGY HEAD', icon: 'gem_off', note: '집중이 흐트러진 날' },
  },
  {
    key: 'mood',
    weight: WEIGHTS.mood,
    buff: { label: 'GOOD MOOD', icon: 'face_good', note: '기분이 좋아요' },
    debuff: { label: 'LOW MOOD', icon: 'face_tired', note: '기분이 가라앉았어요' },
  },
  {
    key: 'sleepQuality',
    weight: WEIGHTS.sleepQuality,
    buff: { label: 'DEEP SLEEP', icon: 'moon', note: '푹 잔 밤' },
    debuff: { label: 'RESTLESS', icon: 'moon', note: '자다 깬 밤' },
  },
]

/** 영향이 큰 순서대로. 기본 4개까지만 보여준다. */
export function buildEffects(input: CheckinInput, limit = 4): Effect[] {
  const b = energyBreakdown(input)

  return SPECS.map((spec) => {
    const delta = Math.round((b[spec.key] - NEUTRAL) * spec.weight)
    const meta = delta >= 0 ? spec.buff : spec.debuff
    return { key: spec.key, delta, ...meta }
  })
    .filter((e) => Math.abs(e.delta) >= MIN_DELTA)
    .sort((a, b2) => Math.abs(b2.delta) - Math.abs(a.delta))
    .slice(0, limit)
}
