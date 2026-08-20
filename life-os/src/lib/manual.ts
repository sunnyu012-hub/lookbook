/**
 * MY MANUAL — 나 사용설명서.
 *
 * 기록이 쌓이면 한 장씩 열린다. 데이터가 모자라면 억지로 분석하지 않고 잠가 둔다.
 *
 * 말투 규칙 (반드시 지킨다)
 *   · "기록상", "함께 나타나는 경향", "평균적으로", "현재 데이터에서는" 만 쓴다
 *   · 원인이다 / 문제다 / 치료해야 한다 로 말하지 않는다
 *   · 이 앱은 의료 앱이 아니다
 */
import type { Checkin, LifeEvent, MounjaroLog, NightCheckout, Preferences, WeightLog } from '@/types'
import type { PixelAsset } from './pixelAssets'
import { effects as fx, gear, icons, items, pets } from './pixelAssets'
import { compareGroups, mean, mounjaroCycle, weightSummary } from './analytics'
import { scoreCheckin, type ScoreContext } from './scoring'
import { ddayFrom } from './dday'
import { withParticle } from './korean'
import type { Insight } from './analytics/insightEntity'

export interface ManualLine {
  text: string
  /** 몇 개의 기록에서 나온 이야기인지 */
  sample?: string
  /** 공용 Insight 에서 온 줄이면 그 id — 화면에서 같은 관찰인지 알 수 있다 */
  fromInsight?: string
}

export interface Chapter {
  no: number
  key: string
  title: string
  ko: string
  icon: PixelAsset
  /** 열리는 데 필요한 기록 수 */
  need: number
  have: number
  unlocked: boolean
  lines: ManualLine[]
}

export interface ManualInput {
  checkins: Checkin[]
  nights: NightCheckout[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  lifeEvents: LifeEvent[]
  /** date → 이벤트 태그 */
  eventLog: Record<string, string[]>
  prefs: Preferences
  scoreContext?: ScoreContext
  /** 공용 Insight 목록 — 여기서 다시 계산하지 않고 받아서 얹는다 */
  insights?: Insight[]
}

/** 두 그룹을 비교하려면 각각 이만큼은 필요하다 */
const MIN_GROUP = 4

const round = (v: number) => Math.round(v * 10) / 10
const scored = (list: Checkin[]) => list.filter((c) => c.energyScore != null)
const scoreOf = (c: Checkin) => c.energyScore as number

/** 태그가 있던 날 vs 없던 날 비교 한 줄 */
function tagLine(
  input: ManualInput,
  tag: string,
  pick: (c: Checkin) => number | null | undefined,
  label: string,
  unit = '점',
): ManualLine | null {
  const list = input.checkins
  const withTag: number[] = []
  const without: number[] = []
  list.forEach((c) => {
    const v = pick(c)
    if (v == null) return
    ;(input.eventLog[c.date]?.includes(tag) ? withTag : without).push(v)
  })
  const cmp = compareGroups(withTag, without, tag, '그 외', MIN_GROUP)
  if (!cmp.enough || Math.abs(cmp.diff) < (unit === '점' ? 4 : 0.4)) return null

  const dir = cmp.diff > 0 ? '높게' : '낮게'
  return {
    text: `${tag} 기록이 있는 날에는 ${label}이 평균 ${Math.abs(cmp.diff)}${unit} ${dir} 나타나는 경향이 있어요.`,
    sample: `${cmp.nA}일 vs ${cmp.nB}일`,
  }
}

/** 다음 날에 영향을 보는 비교 (예: 클라이밍 다음날 몸) */
function nextDayLine(
  input: ManualInput,
  tag: string,
  pick: (c: Checkin) => number | null | undefined,
  label: string,
): ManualLine | null {
  const byDate = new Map(input.checkins.map((c) => [c.date, c]))
  const after: number[] = []
  const other: number[] = []

  input.checkins.forEach((c) => {
    const v = pick(c)
    if (v == null) return
    const prev = new Date(c.date)
    prev.setDate(prev.getDate() - 1)
    const key = prev.toISOString().slice(0, 10)
    const hadTag = input.eventLog[key]?.includes(tag) ?? false
    if (!byDate.has(key)) return
    ;(hadTag ? after : other).push(v)
  })

  const cmp = compareGroups(after, other, `${tag} 다음날`, '그 외', MIN_GROUP)
  if (!cmp.enough || Math.abs(cmp.diff) < 4) return null
  const dir = cmp.diff > 0 ? '높은' : '낮은'
  return {
    text: `${tag} 기록 다음 날에는 ${label}가 평균적으로 ${Math.abs(cmp.diff)}점 ${dir} 경향이 있어요.`,
    sample: `${cmp.nA}일 vs ${cmp.nB}일`,
  }
}

export function buildManual(input: ManualInput): Chapter[] {
  const { checkins, nights, prefs } = input
  /**
   * 발견(Insight)은 여기서 다시 계산하지 않는다.
   * Patterns · Life Tree · Archive 와 같은 목록을 받아서 챕터에 얹기만 한다.
   * 같은 관찰이 화면마다 조금씩 다르게 나오는 걸 막기 위해서다.
   */
  const insights = input.insights ?? []
  const list = scored(checkins)
  const results = checkins.map((c) => ({ c, r: scoreCheckin(c, input.scoreContext) }))

  const dimAvg = (key: 'recovery' | 'body' | 'mind' | 'fuel') => {
    const xs = results.map((x) => x.r.dimensions[key]).filter((v): v is number => v !== null)
    return xs.length >= 5 ? Math.round(mean(xs)) : null
  }

  const chapters: Chapter[] = []
  const add = (
    no: number,
    key: string,
    title: string,
    ko: string,
    icon: PixelAsset,
    need: number,
    have: number,
    lines: ManualLine[],
  ) => {
    const attached = insights
      .filter((i) => i.manualKey === key && i.category !== 'STILL_LEARNING')
      .map((i) => ({ text: i.body, sample: `${i.sampleSize}일 기록`, fromInsight: i.id }))
    chapters.push({
      no,
      key,
      title,
      ko,
      icon,
      need,
      have,
      unlocked: have >= need,
      lines: [...lines, ...attached],
    })
  }

  // ── 01 MY ENERGY
  const energyLines: ManualLine[] = []
  if (list.length >= 7) {
    const avg = Math.round(mean(list.map(scoreOf)))
    energyLines.push({ text: `기록상 평균 Overall Energy 는 ${avg}점이에요.`, sample: `${list.length}일` })
    const best = list.reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a))
    const worst = list.reduce((a, b) => (scoreOf(b) < scoreOf(a) ? b : a))
    energyLines.push({ text: `가장 높았던 날은 ${scoreOf(best)}점, 가장 낮았던 날은 ${scoreOf(worst)}점이었어요.` })
  }
  if (nights.length >= 5) {
    const pairs = nights
      .map((n) => {
        const c = checkins.find((x) => x.date === n.date)
        if (!c?.energyScore || !n.actualEnergy) return null
        // 밤 기록은 1~5 라 100점으로 맞춰서 본다
        return ((n.actualEnergy - 1) / 4) * 100 - c.energyScore
      })
      .filter((v): v is number => v !== null)
    if (pairs.length >= 5) {
      const d = Math.round(mean(pairs))
      energyLines.push({
        text:
          Math.abs(d) < 5
            ? '아침에 예상한 상태와 밤에 적은 실제 하루가 대체로 비슷하게 나타나요.'
            : d > 0
              ? `밤에 적은 실제 하루가 아침 예상보다 평균 ${d}점 높게 나타나는 경향이 있어요.`
              : `밤에 적은 실제 하루가 아침 예상보다 평균 ${-d}점 낮게 나타나는 경향이 있어요.`,
        sample: `${pairs.length}일`,
      })
    }
  }
  add(1, 'energy', 'MY ENERGY', '내 에너지', icons.energy, 7, list.length, energyLines)

  // ── 02 MY SLEEP
  const sleepLines: ManualLine[] = []
  const withSleep = checkins.filter((c) => c.sleepHours != null)
  if (withSleep.length >= 8) {
    sleepLines.push({
      text: `평균 수면 시간은 ${round(mean(withSleep.map((c) => c.sleepHours as number)))}시간이에요.`,
      sample: `${withSleep.length}일`,
    })
    const goal = prefs.sleepGoalHours - 1
    const long = results
      .filter((x) => (x.c.sleepHours ?? 0) >= goal)
      .map((x) => x.r.dimensions.recovery)
      .filter((v): v is number => v !== null)
    const short = results
      .filter((x) => x.c.sleepHours != null && (x.c.sleepHours as number) < goal)
      .map((x) => x.r.dimensions.recovery)
      .filter((v): v is number => v !== null)
    const cmp = compareGroups(long, short, '충분히 잔 날', '그 외', MIN_GROUP)
    if (cmp.enough && Math.abs(cmp.diff) >= 4) {
      sleepLines.push({
        text: `${goal}시간 이상 잔 날에는 Recovery 가 평균 ${Math.abs(cmp.diff)}점 ${cmp.diff > 0 ? '높게' : '낮게'} 나타났어요.`,
        sample: `${cmp.nA}일 vs ${cmp.nB}일`,
      })
    }
    const late = tagLine(input, '늦은 카페인', (c) => c.sleepQuality, '수면의 질', '')
    if (late) sleepLines.push(late)
  }
  add(2, 'sleep', 'MY SLEEP', '내 잠', icons.sleep, 8, withSleep.length, sleepLines)

  // ── 03 MY BODY
  const bodyLines: ManualLine[] = []
  const bodyAvg = dimAvg('body')
  if (bodyAvg !== null) bodyLines.push({ text: `Body 점수는 평균 ${bodyAvg}점이에요.` })
  const climbNext = nextDayLine(input, '클라이밍', (c) => scoreCheckin(c, input.scoreContext).dimensions.body, 'Body 점수')
  if (climbNext) bodyLines.push(climbNext)
  const soreLine = tagLine(input, '근육통', (c) => c.energyScore, 'Overall')
  if (soreLine) bodyLines.push(soreLine)
  add(3, 'body', 'MY BODY', '내 몸', icons.body, 10, checkins.filter((c) => c.bodyPain != null).length, bodyLines)

  // ── 04 MY MIND
  const mindLines: ManualLine[] = []
  const mindAvg = dimAvg('mind')
  if (mindAvg !== null) mindLines.push({ text: `Mind 점수는 평균 ${mindAvg}점이에요.` })
  const dateLine = tagLine(input, '데이트', (c) => c.mood, 'Mood', '')
  if (dateLine) mindLines.push(dateLine)
  const aloneLine = tagLine(input, '혼자 시간', (c) => c.stress, 'Stress', '')
  if (aloneLine) mindLines.push(aloneLine)
  const busyLine = tagLine(input, '바쁜 날', (c) => c.energyScore, 'Overall')
  if (busyLine) mindLines.push(busyLine)
  add(4, 'mind', 'MY MIND', '내 마음', icons.mood, 10, checkins.filter((c) => c.mood != null).length, mindLines)

  // ── 05 MY FOOD
  const foodLines: ManualLine[] = []
  const fuelAvg = dimAvg('fuel')
  if (fuelAvg !== null) foodLines.push({ text: `Fuel 점수는 평균 ${fuelAvg}점이에요.` })
  const properMeal = tagLine(input, '제대로 먹음', (c) => c.energyScore, 'Overall')
  if (properMeal) foodLines.push(properMeal)
  const skipMeal = tagLine(input, '끼니 부족', (c) => c.energyScore, 'Overall')
  if (skipMeal) foodLines.push(skipMeal)
  add(5, 'food', 'MY FOOD', '내 끼니', icons.food, 10, checkins.filter((c) => c.appetite != null).length, foodLines)

  // ── 06 MY ACTIVITY
  const actLines: ManualLine[] = []
  const moved = checkins.filter((c) => c.exercise === true)
  if (moved.length >= MIN_GROUP) {
    const cmp = compareGroups(
      moved.map(scoreOf).filter(Boolean) as number[],
      checkins.filter((c) => c.exercise === false).map(scoreOf).filter(Boolean) as number[],
      '움직인 날',
      '그 외',
      MIN_GROUP,
    )
    if (cmp.enough && Math.abs(cmp.diff) >= 4) {
      actLines.push({
        text: `몸을 움직인 날에는 Overall 이 평균 ${Math.abs(cmp.diff)}점 ${cmp.diff > 0 ? '높게' : '낮게'} 나타났어요.`,
        sample: `${cmp.nA}일 vs ${cmp.nB}일`,
      })
    }
  }
  const outLine = tagLine(input, '외출', (c) => c.mood, 'Mood', '')
  if (outLine) actLines.push(outLine)
  const homeLine = tagLine(input, '집콕', (c) => c.energyScore, 'Overall')
  if (homeLine) actLines.push(homeLine)
  add(6, 'activity', 'MY ACTIVITY', '내 움직임', gear.sneakers, 10, checkins.filter((c) => c.exercise != null).length, actLines)

  // ── 07 MY MOUNJARO CYCLE
  const mjLines: ManualLine[] = []
  if (prefs.mounjaroEnabled && input.mounjaro.length >= 2) {
    const cycle = mounjaroCycle(input.mounjaro, prefs)
    mjLines.push({ text: `지금까지 ${cycle.totalDoses}번 적어 뒀어요. 주기는 ${cycle.intervalDays}일로 설정돼 있어요.` })
    mjLines.push({
      text: '이 앱은 의료 앱이 아니에요. 여기 숫자는 내가 적어 둔 기록일 뿐이고, 용량이나 투약 여부는 담당 의료진과 정할 일이에요.',
    })
  }
  add(7, 'mounjaro', 'MY CYCLE', '내 사이클', icons.log, 4, input.mounjaro.length, mjLines)

  // ── 08 MY GOOD DAYS
  const goodLines: ManualLine[] = []
  if (list.length >= 12) {
    const sortedScores = list.map(scoreOf).sort((a, b) => b - a)
    const threshold = sortedScores[Math.max(0, Math.floor(sortedScores.length * 0.3) - 1)]
    const good = list.filter((c) => scoreOf(c) >= threshold)
    const traits: string[] = []
    const rate = (test: (c: Checkin) => boolean) => good.filter(test).length / good.length
    if (rate((c) => (c.sleepHours ?? 0) >= prefs.sleepGoalHours - 1) >= 0.5) traits.push('충분한 수면')
    if (rate((c) => (c.mealsCount ?? 0) >= 2 || c.appetite != null && c.appetite >= 4) >= 0.5) traits.push('제대로 된 식사')
    if (rate((c) => (c.stress ?? 5) <= 2) >= 0.4) traits.push('낮은 스트레스')
    if (rate((c) => c.exercise === true) >= 0.4) traits.push('몸을 움직인 것')
    if (rate((c) => (c.bodyPain ?? 5) <= 1) >= 0.5) traits.push('통증이 적은 몸')
    if (traits.length > 0) {
      goodLines.push({
        text: `Energy 가 높은 날에는 ${traits.join(' · ')} 이(가) 함께 기록되는 경우가 많았어요.`,
        sample: `상위 ${good.length}일`,
      })
    }
    const goodTags = Object.entries(
      good.reduce<Record<string, number>>((acc, c) => {
        ;(input.eventLog[c.date] ?? []).forEach((t) => (acc[t] = (acc[t] ?? 0) + 1))
        return acc
      }, {}),
    )
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    if (goodTags.length > 0) {
      goodLines.push({ text: `그런 날에 자주 적혀 있던 태그: ${goodTags.map(([t]) => t).join(' · ')}` })
    }
  }
  add(8, 'good', 'MY GOOD DAYS', '좋았던 날', fx.sparkle01, 12, list.length, goodLines)

  // ── 09 MY HARD DAYS
  const hardLines: ManualLine[] = []
  if (list.length >= 12) {
    const sortedScores = list.map(scoreOf).sort((a, b) => a - b)
    const threshold = sortedScores[Math.max(0, Math.floor(sortedScores.length * 0.3) - 1)]
    const low = list.filter((c) => scoreOf(c) <= threshold)
    const traits: string[] = []
    const rate = (test: (c: Checkin) => boolean) => low.filter(test).length / low.length
    if (rate((c) => (c.sleepHours ?? 9) < prefs.sleepGoalHours - 1) >= 0.5) traits.push('수면 부족')
    if (rate((c) => (c.fatigue ?? 0) >= 4) >= 0.4) traits.push('높은 피로')
    if (rate((c) => (c.bodyPain ?? 0) >= 3) >= 0.35) traits.push('몸의 통증')
    if (rate((c) => (c.stress ?? 0) >= 4) >= 0.35) traits.push('높은 스트레스')
    if (traits.length > 0) {
      hardLines.push({
        text: `Energy 가 낮은 날에는 ${traits.join(' · ')} 기록이 함께 나타나는 경우가 많았어요.`,
        sample: `하위 ${low.length}일`,
      })
    }
    hardLines.push({ text: '이건 원인을 알려 주는 값이 아니에요. 같이 적혀 있었다는 뜻이에요.' })
  }
  add(9, 'hard', 'MY HARD DAYS', '힘들었던 날', fx.cloud, 12, list.length, hardLines)

  // ── 10 MY LIFE
  const lifeLines: ManualLine[] = []
  const w = weightSummary(input.weights, prefs)
  if (w.smoothed !== null && w.count >= 5) {
    lifeLines.push({ text: `체중 7일 평균은 ${w.smoothed}kg 이에요. 하루하루의 숫자는 원래 오르내려요.` })
  }
  if (prefs.relationshipEnabled && prefs.relationshipStartDate) {
    const d = ddayFrom(prefs.relationshipStartDate)
    const who = prefs.partnerName ? `${withParticle(prefs.partnerName, '와')}는` : '우리는'
    lifeLines.push({ text: `${who} 오늘로 ${d.countLabel}이에요.` })
  }
  const tagCounts = Object.entries(
    Object.values(input.eventLog).flat().reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  if (tagCounts.length > 0) {
    lifeLines.push({
      text: `가장 자주 적은 태그: ${tagCounts.map(([t, n]) => `${t}(${n})`).join(' · ')}`,
    })
  }
  if (input.lifeEvents.length > 0) {
    lifeLines.push({ text: `직접 적어 둔 순간이 ${input.lifeEvents.length}개 쌓였어요.` })
  }
  add(10, 'life', 'MY LIFE', '내 생활', pets.catSit, 5, checkins.length, lifeLines)

  return chapters
}

export const MANUAL_LOCKED_HINT = '조금만 더 기록하면 열려요'
export const MANUAL_ICON = items.coffeeMug
