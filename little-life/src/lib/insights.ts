import type { Category, DailyLog } from '@/types'
import { CATEGORIES } from '@/types'
import { weekCategoryExp } from './stats'

/**
 * 이번 주 한 줄. 규칙 기반이고 AI 는 쓰지 않는다.
 *
 * 어떤 경우에도 사용자를 탓하지 않는다.
 * "안 한 것" 을 지적하는 대신 "해볼 만한 것" 을 제안한다.
 */
export function weeklyInsight(log: DailyLog, now: Date = new Date()): string {
  const byCategory = weekCategoryExp(log, now)
  const total = CATEGORIES.reduce((sum, c) => sum + byCategory[c], 0)

  if (total === 0) {
    return '이번 주 기록은 아직 비어 있어. 작은 퀘스트 하나면 시작이야.'
  }

  const top = CATEGORIES.reduce<Category>(
    (best, c) => (byCategory[c] > byCategory[best] ? c : best),
    CATEGORIES[0],
  )

  // 한 분야에 절반 넘게 쏠려 있으면, 아직 비어 있는 분야를 가볍게 권해본다.
  if (byCategory[top] / total > 0.5) {
    const resting = CATEGORIES.filter((c) => byCategory[c] === 0)
    const suggestion = resting.includes('PLAY')
      ? 'PLAY'
      : resting.includes('BODY')
        ? 'BODY'
        : resting[0]

    if (suggestion) {
      return `이번 주는 ${top} 쪽에 많이 머물렀네. ${suggestion} 퀘스트 하나 끼워 넣어도 좋겠어.`
    }
  }

  return `이번 주엔 ${top}에서 EXP를 가장 많이 모았어. (${byCategory[top]} EXP)`
}
