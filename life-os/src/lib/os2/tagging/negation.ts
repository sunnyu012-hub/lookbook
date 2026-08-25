/**
 * 부정 잡기.
 *
 * "안 아팠어" 에 통증 태그를 붙이면 통계가 통째로 거짓말이 된다.
 * 한국어 부정은 앞에도 오고("안 좋아") 뒤에도 온다("좋지 않아").
 * 그래서 찾은 낱말의 앞뒤를 좁게 들여다본다.
 *
 * 넓게 보면 엉뚱한 곳의 '안' 까지 끌어와서 멀쩡한 태그를 죽인다.
 * 좁게 보면 몇 개를 놓친다. 놓치는 쪽이 낫다는 판단은 아니고 —
 * 여기서는 반대다. 부정을 놓치면 틀린 태그가 남기 때문에 부정 쪽을 조금 넉넉히 본다.
 */
import { type Span, type TextView } from './normalize'

/**
 * 앞쪽 창은 부정어 길이에 맞춘다.
 * '안' '못' 은 동사 바로 앞에 붙는다 — 멀리서 찾으면 엉뚱한 문장의 '못' 을 끌어온다.
 * ("결정을 못 하겠다 고민만 했다" 의 고민을 부정으로 읽으면 안 된다)
 * '별로' '하나도' 같은 말은 조금 떨어져 있어도 된다.
 */
const BEFORE: Array<[cue: string, window: number]> = [
  ['안 ', 3],
  ['안', 2],
  ['못 ', 3],
  ['못', 2],
  ['별로', 8],
  ['전혀', 8],
  ['하나도', 8],
  ['딱히', 8],
  ['그다지', 8],
  ['더 이상', 9],
  ['더이상', 8],
  ['이제 안', 8],
  ['거의 안', 8],
]

/** 뒤쪽은 '하나도 안 됐다' 처럼 사이에 말이 끼기 때문에 조금 넓게 본다 */
export const LOOK_AHEAD = 9
export const LOOK_BACK = 9

/** 낱말 뒤에 오는 부정 */
const AFTER = [
  '지 않',
  '지않',
  '진 않',
  '진않',
  '지는 않',
  '지 못',
  '지못',
  '치 않',
  '하지 마',
  '은 아니',
  '는 아니',
  '가 아니',
  '이 아니',
  '아니었',
  '아니야',
  '아님',
  '안 되',
  '안돼',
  '안됐',
  '안 됐',
  '안 나',
  '안나',
  '안 와',
  '안와',
  '없었',
  '없어',
  '없다',
  '없음',
  '없이',
  '하나도 안',
  '하나도 못',
  '전혀 안',
  '잘 안',
  '안 했',
  '안했',
  '안 함',
  '못 했',
  '못했',
]

export interface NegationHit {
  negated: boolean
  /** 어떤 말 때문에 부정으로 봤는지 — Inspector 에서 그대로 보여 준다 */
  cue?: string
}

const NONE: NegationHit = { negated: false }

/**
 * 이 자리의 낱말이 부정당했는가.
 *
 * 낱말 자체가 이미 부정을 품고 있으면("기운 없", "집중 안") 건드리지 않는다.
 * 그러지 않으면 '없' 이 자기 자신을 부정해서 태그가 사라진다.
 */
export function isNegated(view: TextView, span: Span, matchedTerm: string): NegationHit {
  const selfNegating = BEFORE.some(([cue]) => matchedTerm.includes(cue.trim()))
    || AFTER.some((c) => matchedTerm.includes(c.replace(/\s/g, '')))
  if (selfNegating) return NONE

  for (const [cue, window] of BEFORE) {
    const back = view.lower.slice(Math.max(0, span.start - window), span.start)
    if (back.includes(cue)) return { negated: true, cue: cue.trim() }
  }

  const ahead = view.lower.slice(span.end, span.end + LOOK_AHEAD)
  const aheadDense = ahead.replace(/\s+/g, '')
  for (const cue of AFTER) {
    if (ahead.includes(cue) || aheadDense.includes(cue.replace(/\s+/g, ''))) {
      return { negated: true, cue: cue.trim() }
    }
  }

  return NONE
}
