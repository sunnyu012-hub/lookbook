/**
 * 언제 이야기인가.
 *
 * "내일 클라이밍 갈 거야" 를 오늘 운동한 것으로 세면 통계가 통째로 틀어진다.
 * 태그를 지우지는 않는다 — 붙이되 언제 이야기인지를 같이 남기고, 분석은 present 만 센다.
 * (Inspector 에는 "내일 이야기" 라고 보인다)
 */
import type { TemporalContext } from '../types'
import { type Clause, makeView } from './normalize'

const FUTURE = [
  '내일', '모레', '다음 주', '다음주', '다음 달', '다음달', '이따', '이따가',
  '나중에', '언젠가', '앞으로', '곧',
  '할 거', '할거', '갈 거', '갈거', '올 거', '올거', '볼 거', '볼거',
  '하려고', '가려고', '려고 한', '예정', '계획',
  '해야지', '가야지', '해야겠', '가야겠',
  '할까', '갈까', '볼까', '먹을까',
  '하고 싶', '가고 싶', '먹고 싶', '보고 싶',
  '하기로', '가기로',
]

const HYPOTHETICAL = [
  '만약', '면 좋겠', '으면 하', '였으면', '이라면', '라면 어떨',
  '면 어떨까', '했더라면', '그랬으면', '면 어떨',
]

const PAST = [
  '어제', '그저께', '엊그제', '지난주', '지난 주', '지난달', '지난 달',
  '저번', '예전', '옛날', '작년', '재작년', '그때', '아까 전에',
]

/**
 * 한 절이 언제 이야기인지.
 *
 * 섞여 있으면 가정 > 미래 > 과거 순으로 본다.
 * "내일 갔으면 좋겠다" 는 계획이라기보다 바람이라서 가정으로 두는 게 덜 틀린다.
 */
export function contextOfClause(clause: Clause): TemporalContext {
  const view = makeView(clause.text)
  const has = (list: readonly string[]) =>
    list.some((cue) => view.dense.includes(cue.replace(/\s+/g, '')))

  if (has(HYPOTHETICAL)) return 'hypothetical'
  if (has(FUTURE)) return 'future'
  if (has(PAST)) return 'past'
  return 'present'
}

/** 분석에 셀 수 있는 것 — 지금 일어난 일만 */
export const countsAsHappened = (ctx: TemporalContext | undefined) =>
  ctx === undefined || ctx === 'present'

/** Inspector 에 보여 줄 말. 영문 key 를 그대로 내보내지 않는다 */
export const temporalLabel = (ctx: TemporalContext | undefined): string | null => {
  switch (ctx) {
    case 'future':
      return '앞으로 할 이야기'
    case 'past':
      return '지난 이야기'
    case 'hypothetical':
      return '가정하는 이야기'
    default:
      return null
  }
}
