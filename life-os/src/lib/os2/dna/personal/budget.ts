/**
 * 7G — 얼마나 부를 수 있는가.
 *
 * AI 호출은 비용이고, 비용에 상한이 없으면 언젠가 사고가 난다.
 * 그래서 세 겹으로 막는다.
 *
 *   · 발견 하나당 1회 (naming.ts)
 *   · 한 달에 MONTHLY_LIMIT 회 (여기)
 *   · 지문이 같으면 다시 부르지 않는다 (candidates.ts 의 fingerprint)
 *
 * 상한에 걸리면 아무 일도 일어나지 않는다.
 * 발견은 그대로 열리고, 이름만 우리가 만든 것으로 간다.
 */

/** 한 달에 이만큼까지 */
export const MONTHLY_LIMIT = 15

export interface NamingBudget {
  /** YYYY-MM */
  month: string
  used: number
}

export const monthOf = (iso: string): string => iso.slice(0, 7)

export const emptyBudget = (month: string): NamingBudget => ({ month, used: 0 })

export const withinBudget = (budget: NamingBudget, month: string): boolean =>
  budget.month !== month || budget.used < MONTHLY_LIMIT

/** 달이 바뀌면 0부터 다시 센다 */
export function spend(budget: NamingBudget, month: string): NamingBudget {
  if (budget.month !== month) return { month, used: 1 }
  return { month, used: budget.used + 1 }
}

// ─────────────────────────────────────────────
// 저장
// ─────────────────────────────────────────────

const KEY = 'life-os:naming-budget:v1'

export function readBudget(month: string): NamingBudget {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    if (!raw) return emptyBudget(month)
    const parsed = JSON.parse(raw) as Partial<NamingBudget>
    if (typeof parsed.month !== 'string' || typeof parsed.used !== 'number') {
      return emptyBudget(month)
    }
    return { month: parsed.month, used: parsed.used }
  } catch {
    return emptyBudget(month)
  }
}

export function writeBudget(budget: NamingBudget): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(budget))
  } catch {
    // 저장을 못 해도 앱은 돈다. 상한이 한 번 느슨해질 뿐이다
  }
}
