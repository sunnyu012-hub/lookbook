import type { Battle, BattleDef, BattleKind, Category } from '@/types'
import { seededRandom } from '@/lib/city/seed'
import { todayKey } from '@/lib/date'

/**
 * 오늘 목록에 뭘 먼저 보여줄지.
 *
 * 몬스터가 23종, 보스가 13종이 되면서 "동네에 있는 몬스터" 아래로 스무 장이
 * 그냥 이어졌다. 스크롤이 길어진 것도 문제지만, 진짜 문제는 그 길이가
 * **고르는 걸 어렵게 만든다**는 것이다. 스무 개 중 하나를 고르는 일은
 * 그 자체로 미루기 좋은 일이 된다.
 *
 * 그래서 앞에 몇 개만 내민다. 다만 **표시 방식일 뿐 접근 제한이 아니다** —
 * 여기 안 뜬 몬스터도 "다른 몬스터 보기" 에서 언제든 시작할 수 있다.
 * 하루 몇 마리 제한도, 재추첨도, 내일 다시 등장도 없다.
 *
 * 새 추천 엔진을 만들지 않았다. 날짜로 고정되는 무작위(seededRandom)와
 * 지금 배틀 상태만 본다. 저장하는 것도 없다.
 */

/** 한 번에 내밀 개수. 보스는 더 크고 수가 적어서 조금 적게 둔다. */
export const LINEUP_COUNT: Record<BattleKind, number> = {
  MONSTER: 4,
  BOSS: 3,
}

/** 이 몬스터·보스가 지금 어떤 상태인지 — 저장하지 않고 battles 에서 그때그때 읽는다. */
export interface DefState {
  /** 지금 진행 중이면 그 판 */
  active: Battle | null
  /** 끝낸 적이 있으면 그때 시각 */
  clearedAt: string | null
}

export function defStates(battles: Battle[]): Map<string, DefState> {
  const map = new Map<string, DefState>()

  for (const battle of battles) {
    const current = map.get(battle.defId) ?? { active: null, clearedAt: null }
    if (battle.status === 'ACTIVE') current.active = battle
    // 여러 번 끝냈으면 마지막 것만 들고 있으면 된다
    else if (!current.clearedAt || battle.clearedAt! > current.clearedAt) {
      current.clearedAt = battle.clearedAt
    }
    map.set(battle.defId, current)
  }
  return map
}

/**
 * 지금 시작할 수 있는 것들.
 *
 * 진행 중인 것만 뺀다. 끝낸 것은 남겨둔다 — 설거지 슬라임을 한 번 잡았다고
 * 다음 주에 다시 못 잡을 이유가 없고, 빼버리면 "치우기" 를 먼저 눌러야만
 * 다시 시작되는 숨은 규칙이 생긴다.
 */
export function startableDefs(defs: BattleDef[], battles: Battle[]): BattleDef[] {
  const states = defStates(battles)
  return defs.filter((def) => !states.get(def.id)?.active)
}

/**
 * 오늘의 순서.
 *
 * 날짜만 씨앗으로 쓴다. 지금 남은 것들을 씨앗에 섞지 않는 이유가 있다 —
 * 섞으면 몬스터 하나를 시작하는 순간 나머지 세 장이 전부 다른 것으로 바뀐다.
 * 방금 고른 것 때문에 안 고른 것들까지 사라지면, 그건 고른 벌을 받는 기분이다.
 */
function shuffledForToday(defs: BattleDef[], kind: BattleKind, dayKey: string): BattleDef[] {
  const random = seededRandom(`${dayKey}:lineup:${kind}`)
  // 값을 미리 뽑아두고 그걸로 정렬한다. 정렬 중에 비교 함수가 매번 새 수를
  // 내면 브라우저마다 결과가 달라진다.
  return defs
    .map((def) => ({ def, roll: random() }))
    .sort((a, b) => a.roll - b.roll)
    .map((entry) => entry.def)
}

/**
 * 오늘의 차례.
 *
 * 섞은 순서를 그대로 쓰지 않고, 분야가 안 겹치는 것부터 한 바퀴 끌어올린다.
 * 이 순서는 **지금 배틀 상태를 전혀 안 본다** — 그게 핵심이다.
 *
 * 상태를 섞어서 매번 다시 고르면, 몬스터 하나를 시작하는 순간 나머지 자리도
 * 같이 바뀐다. 방금 고른 것 때문에 안 고른 것들까지 사라지면 그건 고른 벌이다.
 * 순서를 미리 정해두면 하나가 빠질 때 뒤가 한 칸씩 올라올 뿐이다.
 */
function featuredOrder(defs: BattleDef[], kind: BattleKind, dayKey: string): BattleDef[] {
  const shuffled = shuffledForToday(defs, kind, dayKey)
  const used = new Set<Category>()
  const first: BattleDef[] = []
  const rest: BattleDef[] = []

  for (const def of shuffled) {
    if (used.has(def.category)) {
      rest.push(def)
      continue
    }
    used.add(def.category)
    first.push(def)
  }
  return [...first, ...rest]
}

/**
 * 지금 하기 좋은 것 몇 개.
 *
 * 오늘의 차례에서 앞에서부터 고르되 두 가지를 건너뛴다.
 *
 *  - 진행 중인 것 — 바로 위 "진행 중" 에 이미 있다
 *  - 끝낸 것 — 방금 끝낸 걸 또 내밀면 끝낸 게 맞나 싶어진다
 *    (전체 보기에는 그대로 있다. 다음 주에 또 쌓이는 일들이다)
 */
export function todaysLineup(
  defs: BattleDef[],
  battles: Battle[],
  kind: BattleKind,
  now: Date = new Date(),
  count: number = LINEUP_COUNT[kind],
): BattleDef[] {
  const states = defStates(battles)

  return featuredOrder(defs, kind, todayKey(now))
    .filter((def) => {
      const state = states.get(def.id)
      return !state?.active && !state?.clearedAt
    })
    .slice(0, count)
}

export interface LibraryEntry {
  def: BattleDef
  /** 전에 끝낸 적이 있으면 그때. 목록에서 작게 알려준다. */
  clearedAt: string | null
}

/**
 * 전체 보기의 순서.
 *
 * 1) 아직 안 해본 것 (기록이 아예 없는 것)
 * 2) 전에 끝낸 것 — 오래된 것부터
 *
 * 이 순서를 위해 저장 필드를 새로 만들지 않았다. 지금 battles 에 남아 있는
 * 기록만 본다. "목록에서 치우기" 로 지운 것은 기록이 없으니 1번으로 돌아가는데,
 * 치웠다는 건 그만 보고 싶다는 뜻이 아니라 자리를 비웠다는 뜻이라 그게 맞다.
 */
export function libraryOrder(defs: BattleDef[], battles: Battle[]): LibraryEntry[] {
  const states = defStates(battles)

  const fresh: LibraryEntry[] = []
  const done: LibraryEntry[] = []

  for (const def of defs) {
    const state = states.get(def.id)
    if (state?.active) continue
    if (state?.clearedAt) done.push({ def, clearedAt: state.clearedAt })
    else fresh.push({ def, clearedAt: null })
  }

  done.sort((a, b) => a.clearedAt!.localeCompare(b.clearedAt!))
  return [...fresh, ...done]
}

/** 목록에 실제로 들어 있는 분야들. 빈 필터 칩을 만들지 않으려고 쓴다. */
export function categoriesIn(entries: LibraryEntry[]): Category[] {
  const seen: Category[] = []
  for (const { def } of entries) {
    if (!seen.includes(def.category)) seen.push(def.category)
  }
  return seen
}
