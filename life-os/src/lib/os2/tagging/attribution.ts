/**
 * 누구 이야기인가.
 *
 * "친구가 요즘 너무 슬프대" 에 내 슬픔을 기록하면 안 된다.
 * 그런데 한국어는 주어를 자주 생략해서, 문장만 보고 누구 이야기인지 확신하기 어렵다.
 *
 * 그래서 확신할 수 있는 경우만 잡는다 —
 * 한 절 안에 "친구가 / 동생이 / 팀장이" 처럼 남을 주어로 세운 말이 앞에 나오고,
 * 같은 절에 "나는 / 내가" 가 없을 때.
 *
 * 이 규칙은 몇 개를 놓친다. "친구가 와서 신났다" 의 신남도 같이 지워진다.
 * 그래도 남의 감정이 내 기록에 쌓이는 것보다는 낫다고 봤다.
 * 마음·몸 상태에만 적용하고, "친구가 카페 추천해줬다" 의 카페 같은 사실 태그는 그대로 둔다.
 */
import { type Span, type TextView, makeView } from './normalize'

/** 남을 가리키는 말 */
const OTHERS = [
  '친구', '동생', '엄마', '아빠', '언니', '오빠', '누나', '형', '부모님',
  '팀장', '상사', '동료', '사장', '선배', '후배', '선생님',
  '남편', '아내', '여친', '남친', '애인',
  '걔', '쟤', '그 사람', '사람들', '애들', '고객', '클라이언트',
]

/** 주어로 세우는 조사 */
const SUBJECT_MARKERS = ['가', '이', '는', '은', '도']

/** 나를 가리키는 말 — 이게 있으면 내 이야기로 본다 */
const SELF = ['나는', '난 ', '내가', '나도', '제가', '저는', '나 ', '내 ']

/** 남의 속마음이 내 기록이 되면 곤란한 카테고리 */
const INNER = new Set(['emotion', 'mental', 'energy', 'body'])

export const isInnerState = (categoryId: string) => INNER.has(categoryId)

/**
 * 이 자리의 말이 남의 이야기인가.
 * clause 는 원문 기준 범위, span 도 원문 기준이다.
 */
export function isAboutSomeoneElse(
  view: TextView,
  clause: { start: number; end: number; text: string },
  span: Span,
): { other: boolean; cue?: string } {
  const clauseView = makeView(clause.text)
  if (SELF.some((word) => clauseView.lower.includes(word))) return { other: false }

  const before = view.lower.slice(clause.start, span.start)
  for (const person of OTHERS) {
    for (const marker of SUBJECT_MARKERS) {
      if (before.includes(`${person}${marker}`)) return { other: true, cue: `${person}${marker}` }
    }
  }
  return { other: false }
}
