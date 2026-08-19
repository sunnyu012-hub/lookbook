/**
 * Buff / Debuff — Energy Score 가 왜 그 숫자인지 게임 언어로 보여준다.
 * 점수 계산 자체는 energy.ts 그대로 쓰고, 여기서는 각 항목의 기여도만 풀어낸다.
 */
import type { CheckinInput } from '@/types'
import type { PixelAsset } from './pixelAssets.generated'
import { icons } from './pixelAssets'
import { WEIGHTS, energyBreakdown } from './energy'

export interface Effect {
  key: string
  /** 화면에 찍는 라틴 라벨 */
  label: string
  icon: PixelAsset
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
  buff: { label: string; icon: PixelAsset; note: string }
  debuff: { label: string; icon: PixelAsset; note: string }
}

const SPECS: Spec[] = [
  {
    key: 'sleep',
    weight: WEIGHTS.sleep,
    buff: { label: 'WELL SLEPT', icon: icons.sleep, note: '푹 잘 잤어요' },
    debuff: { label: 'SLEEP DEBT', icon: icons.sleep, note: '잠이 모자라…' },
  },
  {
    key: 'fatigue',
    weight: WEIGHTS.fatigue,
    buff: { label: 'FRESH', icon: icons.energy, note: '기운이 남아 있어요' },
    debuff: { label: 'WORN OUT', icon: icons.fatigue, note: '피로가 쌓였어요' },
  },
  {
    key: 'body',
    weight: WEIGHTS.body,
    buff: { label: 'BODY OK', icon: icons.body, note: '몸이 가벼워요' },
    debuff: { label: 'BODY SORE', icon: icons.body, note: '온몸이 뻐근해' },
  },
  {
    key: 'focus',
    weight: WEIGHTS.focus,
    buff: { label: 'SHARP MIND', icon: icons.focus, note: '집중이 잘 돼요' },
    debuff: { label: 'FOGGY HEAD', icon: icons.focus, note: '머리가 멍해요' },
  },
  {
    key: 'mood',
    weight: WEIGHTS.mood,
    buff: { label: 'GOOD MOOD', icon: icons.mood, note: '오늘 좀 괜찮은데?' },
    debuff: { label: 'LOW MOOD', icon: icons.mood, note: '기분이 가라앉았어요' },
  },
  {
    key: 'sleepQuality',
    weight: WEIGHTS.sleepQuality,
    buff: { label: 'DEEP SLEEP', icon: icons.sleep, note: '푹 잔 밤' },
    debuff: { label: 'RESTLESS', icon: icons.sleep, note: '자다 깬 밤' },
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
