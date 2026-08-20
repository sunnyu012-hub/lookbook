/**
 * Buff / Debuff — 점수가 왜 그 숫자인지 게임 언어로 풀어 준다.
 * 점수 계산은 scoring/index.ts 가 하고, 여기서는 각 지표의 기여도만 읽는다.
 * 규칙 기반이고, 어떤 조언이나 처방도 하지 않는다.
 */
import type { CheckinInput } from '@/types'
import type { PixelAsset } from '../pixelAssets.generated'
import { gear, icons, items } from '../pixelAssets'
import { scoreCheckin } from './index'
import type { MetricKey, ScoreContext } from './metrics'

export interface Effect {
  key: string
  /** 화면에 찍는 라틴 라벨 */
  label: string
  icon: PixelAsset
  /** 점수 기여도 (양수 = 버프) */
  delta: number
  note: string
}

/** 이 점수를 기준으로 위/아래를 버프·디버프로 부른다 (100점 만점의 중간대) */
const NEUTRAL = 55

/** 이보다 작은 영향은 노이즈로 보고 표시하지 않는다 */
const MIN_DELTA = 2

interface Face {
  label: string
  icon: PixelAsset
  note: string
}

const FACES: Partial<Record<MetricKey, { buff: Face; debuff: Face }>> = {
  sleepHours: {
    buff: { label: 'WELL SLEPT', icon: icons.sleep, note: '푹 잘 잤어요' },
    debuff: { label: 'SLEEP DEBT', icon: icons.sleep, note: '잠이 모자라…' },
  },
  sleepQuality: {
    buff: { label: 'DEEP SLEEP', icon: icons.sleep, note: '푹 잔 밤' },
    debuff: { label: 'RESTLESS', icon: icons.sleep, note: '자다 깬 밤' },
  },
  fatigue: {
    buff: { label: 'FRESH', icon: icons.energy, note: '기운이 남아 있어요' },
    debuff: { label: 'WORN OUT', icon: icons.fatigue, note: '피로가 쌓였어요' },
  },
  bodyPain: {
    buff: { label: 'BODY OK', icon: icons.body, note: '몸이 가벼워요' },
    debuff: { label: 'BODY SORE', icon: icons.body, note: '온몸이 뻐근해' },
  },
  headache: {
    buff: { label: 'CLEAR HEAD', icon: icons.focus, note: '머리가 맑아요' },
    debuff: { label: 'HEADACHE', icon: icons.body, note: '머리가 아파요' },
  },
  nausea: {
    buff: { label: 'SETTLED', icon: icons.food, note: '속이 편해요' },
    debuff: { label: 'QUEASY', icon: icons.appetite, note: '속이 울렁거려요' },
  },
  bloating: {
    buff: { label: 'LIGHT', icon: icons.body, note: '배가 편해요' },
    debuff: { label: 'BLOATED', icon: icons.appetite, note: '더부룩해요' },
  },
  digestion: {
    buff: { label: 'GOOD GUT', icon: icons.food, note: '소화가 잘 돼요' },
    debuff: { label: 'SLOW GUT', icon: icons.appetite, note: '소화가 더뎌요' },
  },
  focus: {
    buff: { label: 'SHARP MIND', icon: icons.focus, note: '집중이 잘 돼요' },
    debuff: { label: 'FOGGY HEAD', icon: icons.focus, note: '머리가 멍해요' },
  },
  mood: {
    buff: { label: 'GOOD MOOD', icon: icons.mood, note: '오늘 좀 괜찮은데?' },
    debuff: { label: 'LOW MOOD', icon: icons.mood, note: '기분이 가라앉았어요' },
  },
  stress: {
    buff: { label: 'CALM', icon: icons.music, note: '마음이 잔잔해요' },
    debuff: { label: 'STRESSED', icon: icons.work, note: '스트레스가 높아요' },
  },
  anxiety: {
    buff: { label: 'STEADY', icon: icons.home, note: '불안이 낮아요' },
    debuff: { label: 'ANXIOUS', icon: icons.mood, note: '마음이 불안해요' },
  },
  motivation: {
    buff: { label: 'MOTIVATED', icon: icons.energy, note: '뭔가 하고 싶어요' },
    debuff: { label: 'NO DRIVE', icon: icons.fatigue, note: '의욕이 없어요' },
  },
  socialEnergy: {
    buff: { label: 'SOCIAL', icon: icons.camera, note: '사람 만날 기운이 있어요' },
    debuff: { label: 'RECHARGING', icon: icons.home, note: '혼자 있고 싶은 날' },
  },
  appetite: {
    buff: { label: 'APPETITE', icon: icons.appetite, note: '입맛이 돌아요' },
    debuff: { label: 'NO APPETITE', icon: icons.appetite, note: '입맛이 없어요' },
  },
  mealsCount: {
    buff: { label: 'FED', icon: icons.food, note: '끼니를 챙겼어요' },
    debuff: { label: 'SKIPPED MEALS', icon: icons.food, note: '끼니를 걸렀어요' },
  },
  mealQuality: {
    buff: { label: 'GOOD FUEL', icon: items.onigiri, note: '잘 먹은 하루' },
    debuff: { label: 'THIN FUEL', icon: items.chocolate, note: '대충 먹은 하루' },
  },
}

/** 점수와 무관하지만 그날의 상태를 말해 주는 것들 */
function contextEffects(input: CheckinInput): Effect[] {
  const out: Effect[] = []
  if (input.exercise) {
    out.push({
      key: 'exercise',
      label: 'MOVED TODAY',
      icon: gear.sneakers,
      delta: 0,
      note: input.exerciseType?.trim() || '몸을 움직였어요',
    })
  }
  if (input.outdoor) {
    out.push({ key: 'outdoor', label: 'WENT OUTSIDE', icon: icons.home, delta: 0, note: '밖에 나갔어요' })
  }
  if (input.caffeineConsumed) {
    out.push({
      key: 'caffeine',
      label: 'CAFFEINE',
      icon: icons.caffeine,
      delta: 0,
      note: input.caffeineTime ? `${input.caffeineTime} 에 마심` : '카페인을 마셨어요',
    })
  }
  if (input.alcohol) {
    out.push({ key: 'alcohol', label: 'DRINKS', icon: items.smoothie, delta: 0, note: '술을 마신 날' })
  }
  return out
}

/** 영향이 큰 순서대로. 기본 4개까지만 보여준다. */
export function buildEffects(
  input: CheckinInput,
  limit = 4,
  ctx?: ScoreContext,
): Effect[] {
  const { metrics } = scoreCheckin(input, ctx)

  const scored: Effect[] = []
  for (const m of metrics) {
    const face = FACES[m.key]
    if (!face) continue
    // 가중치를 곱해 "이 항목이 총점을 얼마나 밀어 올렸는지" 로 바꾼다
    const delta = Math.round((m.score - NEUTRAL) * m.weight * 2.2)
    if (Math.abs(delta) < MIN_DELTA) continue
    const meta = delta >= 0 ? face.buff : face.debuff
    scored.push({ key: m.key, delta, ...meta })
  }
  scored.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const filler = contextEffects(input)
  return [...scored, ...filler].slice(0, limit)
}
