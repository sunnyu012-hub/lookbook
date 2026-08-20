/**
 * "지난 한 달, 나는 어떻게 지냈지?" — 기록만으로 쓰는 짧은 요약.
 *
 * 지키는 것
 *   · 없는 사실을 지어내지 않는다. 문장은 전부 실제 값에서 나온다.
 *   · 잘했다 / 못했다 로 평가하지 않는다.
 *   · 체중이 늘었다는 걸 경고처럼 말하지 않고, 줄었다는 걸 재촉이나 칭찬으로 말하지 않는다.
 *   · 기록이 적으면 문장을 만들지 않는다.
 */
import type { Checkin, LifeEvent, MounjaroLog, Preferences, WeightLog } from '@/types'
import { addDays, formatShort, todayKey } from './date'
import { ddayFrom } from './dday'
import { conditionTrend, weightSummary } from './analytics'
import { loggingStreak } from './xp'
import { withParticle } from './korean'

export interface StoryLine {
  key: string
  text: string
}

export interface StoryInput {
  checkins: Checkin[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  lifeEvents: LifeEvent[]
  prefs: Preferences
  days?: number
  today?: string
}

export function buildStory({
  checkins,
  weights,
  mounjaro,
  lifeEvents,
  prefs,
  days = 30,
  today = todayKey(),
}: StoryInput): StoryLine[] {
  const from = addDays(today, -(days - 1))
  const inRange = checkins.filter((c) => c.date >= from && c.date <= today)
  const out: StoryLine[] = []

  if (inRange.length < 3) return out

  // 얼마나 적었는지
  out.push({
    key: 'count',
    text: `지난 ${days}일 중 ${inRange.length}일을 적었어요.`,
  })

  const streak = loggingStreak(checkins.map((c) => c.date), today)
  if (streak >= 3) {
    out.push({ key: 'streak', text: `지금은 ${streak}일 연속으로 기록하는 중이에요.` })
  }

  // 컨디션 흐름
  const trend = conditionTrend(inRange, Math.floor(days / 2), today)
  if (trend.enough && trend.recent !== null && trend.previous !== null) {
    const word =
      trend.direction === 'up' ? '조금 올라왔어요' : trend.direction === 'down' ? '조금 내려갔어요' : '비슷했어요'
    out.push({
      key: 'trend',
      text: `앞쪽 ${trend.nPrevious}일 평균 ${trend.previous}점, 뒤쪽 ${trend.nRecent}일 평균 ${trend.recent}점. ${word}.`,
    })
  }

  // 가장 좋았던 날 / 가장 낮았던 날
  const scored = inRange.filter((c) => c.energyScore != null)
  if (scored.length >= 5) {
    const best = scored.reduce((a, b) => ((b.energyScore as number) > (a.energyScore as number) ? b : a))
    const worst = scored.reduce((a, b) => ((b.energyScore as number) < (a.energyScore as number) ? b : a))
    out.push({
      key: 'peak',
      text: `가장 높았던 날은 ${formatShort(best.date)} (${best.energyScore}점), 가장 낮았던 날은 ${formatShort(worst.date)} (${worst.energyScore}점)이었어요.`,
    })
  }

  // 체중 — 변화를 사실로만
  const w = weightSummary(weights.filter((x) => x.date >= from), prefs, today)
  if (w.smoothed !== null && w.count >= 4 && w.changeAll !== null) {
    const delta = w.changeAll
    const text =
      Math.abs(delta) < 0.3
        ? `체중은 이 기간 동안 거의 그대로였어요 (7일 평균 ${w.smoothed}kg).`
        : `체중 7일 평균은 ${w.smoothed}kg 이고, 이 기간 동안 ${Math.abs(delta)}kg ${delta < 0 ? '내려갔어요' : '올라갔어요'}.`
    out.push({ key: 'weight', text })
  }

  // 투약 기록
  const doses = mounjaro.filter((m) => m.date >= from && m.date <= today)
  if (prefs.mounjaroEnabled && doses.length > 0) {
    out.push({
      key: 'mounjaro',
      text: `투약 기록은 ${doses.length}번 적혀 있어요. 마지막은 ${formatShort(doses[0].date)}이에요.`,
    })
  }

  // 함께한 날
  if (prefs.relationshipEnabled && prefs.relationshipStartDate) {
    const d = ddayFrom(prefs.relationshipStartDate, 'since', today)
    const together = lifeEvents.filter(
      (e) => e.category === 'love' && e.date >= from && e.date <= today,
    ).length
    const who = prefs.partnerName ? `${withParticle(prefs.partnerName, '와')}는` : '우리는'
    out.push({
      key: 'love',
      text:
        together > 0
          ? `${who} 오늘로 ${d.countLabel}이고, 이 기간에 ${together}번 함께한 날을 적어 뒀어요.`
          : `${who} 오늘로 ${d.countLabel}이에요.`,
    })
  }

  // 기억에 남는 일
  const highlights = inRange.filter((c) => c.highlight).slice(0, 2)
  const events = lifeEvents.filter((e) => e.date >= from && e.date <= today).slice(0, 2)
  if (highlights.length + events.length > 0) {
    const bits = [
      ...events.map((e) => `${formatShort(e.date)} ${e.title}`),
      ...highlights.map((c) => `${formatShort(c.date)} ${c.highlight}`),
    ].slice(0, 3)
    out.push({ key: 'moments', text: `적어 둔 순간들: ${bits.join(' · ')}` })
  }

  return out
}
