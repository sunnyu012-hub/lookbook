/**
 * 48개 기본 DNA.
 *
 * BASIC + HIDDEN 만 여기 있다. RARE / COMPOUND 는 따로다 (rare.ts) —
 * 그것들이 48 안에 들어가면 "18 / 48" 이라는 숫자가 거짓말이 된다.
 */
import type { DiscoveryDefinition } from '../types'
import { RHYTHM_DNA } from './rhythm'
import { ENERGY_DNA } from './energy'
import { EMOTION_DNA } from './emotion'
import { FOCUS_DNA } from './focus'
import { SOCIAL_DNA } from './social'
import { BODY_DNA } from './body'
import { LIFESTYLE_DNA } from './lifestyle'

export const BASE_DNA: DiscoveryDefinition[] = [
  ...RHYTHM_DNA,
  ...ENERGY_DNA,
  ...EMOTION_DNA,
  ...FOCUS_DNA,
  ...SOCIAL_DNA,
  ...BODY_DNA,
  ...LIFESTYLE_DNA,
]

/** 사용자에게 보여 주는 전체 칸 수 */
export const BASE_COUNT = BASE_DNA.length

export const DNA_BY_ID = new Map(BASE_DNA.map((d) => [d.id, d]))

export const getDna = (id: string) => DNA_BY_ID.get(id)

export {
  RHYTHM_DNA,
  ENERGY_DNA,
  EMOTION_DNA,
  FOCUS_DNA,
  SOCIAL_DNA,
  BODY_DNA,
  LIFESTYLE_DNA,
}
