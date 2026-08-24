import type { Category, Recommendation, UsageProfiles } from '@/types'
import { seededRandom } from '@/lib/city/seed'
import { ALL_PRESETS, type PresetEntry } from './packs'
import type { RecommendContext } from './recommend'

/**
 * 오늘 처음 해볼 것.
 *
 * 추천은 원래 내가 예전에 한 것을 점수순으로 세운다. 그게 대부분의 날에는 맞다 —
 * 아침에 물 마시는 걸 매일 다시 찾아 적고 싶은 사람은 없다.
 *
 * 그런데 그것만 하면 기록이 예닐곱 개만 쌓여도 여섯 칸이 전부 예전에 한 것으로 찬다.
 * 그때부터 이 앱은 **구조적으로 새로운 것을 못 보여준다.**
 * "퀘스트가 다 비슷비슷하다" 는 기분이 아니라 산수였다.
 *
 * 그래서 한 칸은 늘 비워둔다. 예전에 안 해봤거나 오래 안 한 것에서 고른다.
 *
 * 안 했다고 말하지 않는다. 그냥 내밀 뿐이다 —
 * "요즘 운동 안 했네" 는 이 앱이 절대 하지 않기로 한 말이다.
 */

/** 여섯 칸 중 몇 칸을 새것에 내줄지 */
export const FRESH_SLOTS = 2

/** 이 정도 지났으면 다시 처음 같다 */
const STALE_DAYS = 30

/**
 * 요즘 무엇을 하고 있는지 셀 때 며칠을 볼지.
 *
 * 너무 짧으면 어제 하루 쉰 것만으로 편식했다고 판단하고,
 * 너무 길면 지난달에 한 번 한 것 때문에 계속 안 내민다.
 */
const RECENT_WINDOW_DAYS = 14

/**
 * 요즘 손대고 있는 분야.
 *
 * 개수가 아니라 **며칠 손댔는지**로 센다. 하루에 청소를 다섯 개 한 것과
 * 닷새에 걸쳐 하나씩 한 것은 다른 이야기다. (주간 목표도 같은 방식으로 센다)
 */
export function recentCategoryDays(
  profiles: UsageProfiles,
  ctx: RecommendContext,
): Record<Category, number> {
  const since = new Date(ctx.now)
  since.setDate(since.getDate() - RECENT_WINDOW_DAYS)
  const from = since.toISOString().slice(0, 10)

  const days: Partial<Record<Category, Set<string>>> = {}
  for (const p of Object.values(profiles)) {
    for (const day of p.recentCompletionDates) {
      if (day < from) continue
      ;(days[p.category] ??= new Set()).add(day)
    }
  }

  return Object.fromEntries(
    (Object.keys(days) as Category[]).map((c) => [c, days[c]!.size]),
  ) as Record<Category, number>
}

/**
 * 이 분야를 얼마나 반가워할지.
 *
 * 요즘 손댄 날이 적을수록 크다. 0 일이면 제일 크고, 매일 했으면 1 에 가깝다.
 * 완전히 0 으로 만들지는 않는다 — 좋아하는 걸 계속 하는 사람에게
 * "그건 이제 그만" 이라고 할 이유가 없다.
 */
export function categoryHunger(category: Category, recent: Record<string, number>): number {
  const touched = recent[category] ?? 0
  return 1 / (1 + touched)
}

/** 이 준비된 퀘스트를 예전에 해봤는지 · 언제 */
function lastTouched(entry: PresetEntry, profiles: UsageProfiles): string | null {
  const p = profiles[entry.key]
  if (!p) return null
  return p.lastCompletedAt ?? p.lastAddedAt ?? null
}

interface Candidate {
  entry: PresetEntry
  weight: number
}

/**
 * 새것 후보와 무게.
 *
 * - 한 번도 안 해본 것이 제일 무겁다
 * - 오래 안 한 것이 그다음
 * - 요즘 손 안 댄 분야면 더 무거워진다
 * - 시간대가 맞으면 조금 더 (거르지는 않는다 — 거르면 목록 절반이 영영 안 보인다)
 */
function candidates(
  profiles: UsageProfiles,
  ctx: RecommendContext,
  exclude: Set<string>,
): Candidate[] {
  const recent = recentCategoryDays(profiles, ctx)
  const out: Candidate[] = []

  for (const entry of ALL_PRESETS) {
    if (exclude.has(entry.key)) continue

    const profile = profiles[entry.key]
    // 덜 보겠다고 한 것은 새것으로도 안 내민다
    if (profile && profile.dismissCount > 0) continue
    if (profile?.hiddenOn === ctx.dayKey) continue

    const touched = lastTouched(entry, profiles)
    let weight: number
    if (!touched) {
      // 한 번도 안 해본 것
      weight = 3
    } else {
      const days = Math.floor((ctx.now.getTime() - new Date(touched).getTime()) / 86_400_000)
      if (days < STALE_DAYS) continue
      weight = 1.5
    }

    weight *= categoryHunger(entry.preset.category, recent)

    // 지금 시간대에 어울리면 조금 더. 밤에 "커튼 열기" 가 뜨면 이상하니까.
    const bands = entry.pack.bands
    if (bands) weight *= bands.includes(ctx.band) ? 1.6 : 0.5
    if (entry.pack.weekend === true) weight *= ctx.weekend ? 1.6 : 0.35

    out.push({ entry, weight })
  }
  return out
}

/**
 * 오늘의 새것 고르기.
 *
 * 날짜가 씨앗이라 하루 동안은 같은 것이 나온다.
 * 화면을 다시 그릴 때마다 바뀌면 고르는 중에 사라져서 누를 수가 없다.
 * 내일이면 저절로 다른 것이 온다.
 */
export function pickFresh(
  profiles: UsageProfiles,
  ctx: RecommendContext,
  exclude: Set<string>,
  count: number = FRESH_SLOTS,
): Recommendation[] {
  const pool = candidates(profiles, ctx, exclude)
  if (pool.length === 0) return []

  const random = seededRandom(`${ctx.dayKey}:fresh`)
  const picked: Recommendation[] = []
  const usedCategories = new Set<Category>()

  for (let i = 0; i < count && pool.length > 0; i += 1) {
    // 두 칸이 같은 분야면 새로울 것이 절반으로 준다
    const eligible = pool.filter((c) => !usedCategories.has(c.entry.preset.category))
    const from = eligible.length > 0 ? eligible : pool

    const total = from.reduce((sum, c) => sum + c.weight, 0)
    let roll = random() * total

    let chosen = from[from.length - 1]
    for (const c of from) {
      roll -= c.weight
      if (roll <= 0) {
        chosen = c
        break
      }
    }

    picked.push({
      questKey: chosen.entry.key,
      title: chosen.entry.preset.title,
      category: chosen.entry.preset.category,
      difficulty: chosen.entry.preset.difficulty,
      presetId: chosen.entry.key,
      score: 0,
      reason: 'FRESH',
      parts: {},
    })
    usedCategories.add(chosen.entry.preset.category)
    pool.splice(pool.indexOf(chosen), 1)
  }

  return picked
}
