import type { AreaId, LivingContext, LivingLine, NpcDef, NpcId, TimeBand } from '@/types'
import { isShopOpen, findShop } from './shops'
import { timeBand } from '@/lib/rpg/time'
import { npcAreaNow } from './routine'
import { LIVING_LINES } from './living-lines'

/**
 * 어디서 언제 만났느냐에 따라 조금 다르게 말한다.
 *
 * ── 이야기가 아니다 ────────────────────────────────────
 *
 * 여기 있는 건 몇 번이고 다시 나와도 되는 생활 대사다. 비밀을 밝히거나
 * 관계를 진전시키지 않는다 — 그건 이야기 장(StoryChapter)이 할 일이고,
 * 생활 대사가 그걸 대신 소모해버리면 나중에 그 장을 읽을 때 이미 아는
 * 얘기가 된다. 그래서 정체 · 과거 · 관계의 핵심은 여기 안 적는다.
 *
 * ── 저장하지 않는다 ────────────────────────────────────
 *
 * 지금 어디 있는지도, 일하는 중인지도 전부 계산이다. 동선표(routine)와
 * 영업시간(shops)이 이미 답을 알고 있어서 여기서 다시 적어둘 이유가 없다.
 * 무엇을 봤는지도 안 남긴다 — 중요한 이야기가 아니라서 기록할 게 없다.
 */

/**
 * 지금 일하는 중인가.
 *
 * 자기 동네에 있어야 하고, 가게가 있으면 그 가게가 열려 있어야 한다.
 * 그래서 카페가 닫힌 뒤의 하루는 카페 거리에 있어도 "주문 도와드릴게요"
 * 라고 하지 않는다 — 가게 문은 닫혔는데 주인만 일하고 있으면 이상하다.
 *
 * 가게가 없는 사람은 시간대로 가른다. 밤사람(세라 · 유현)은 반대로
 * 밤이 일하는 시간이다.
 */
export function workContext(npc: NpcDef, areaId: AreaId | null, now: Date = new Date()): LivingContext {
  if (areaId !== npc.areaId) return 'OFF_WORK'

  if (npc.shopId) {
    const shop = findShop(npc.shopId)
    return shop && isShopOpen(shop, now) ? 'WORK' : 'OFF_WORK'
  }

  const band = timeBand(now)
  if (npc.nightOnly) return band === 'NIGHT' ? 'WORK' : 'OFF_WORK'
  return band === 'NIGHT' ? 'OFF_WORK' : 'WORK'
}

/**
 * 얼마나 이 상황에 딱 맞는 말인지.
 *
 * 큰 쪽이 이긴다. 같은 층 안에서만 무작위로 고른다 — 층을 섞어서 뽑으면
 * 공원에서만 하는 말이 카페에서도 나온다.
 */
function specificity(line: LivingLine): number {
  if (line.areaId && line.band) return 4
  if (line.areaId) return 3
  if (line.context) return 2
  if (line.band) return 1
  return 0
}

function matches(line: LivingLine, areaId: AreaId | null, band: TimeBand, context: LivingContext): boolean {
  if (line.areaId && line.areaId !== areaId) return false
  if (line.band && line.band !== band) return false
  if (line.context && line.context !== context) return false
  return true
}

export interface LivingInput {
  npc: NpcDef
  /** 지금 이 사람이 있는 동네. 없으면 도시에 없는 시간대다. */
  areaId?: AreaId | null
  now?: Date
}

/** 이 사람이 지금 할 수 있는 말 전부 (제일 구체적인 층만) */
export function livingCandidates({ npc, areaId, now = new Date() }: LivingInput): LivingLine[] {
  const here = areaId === undefined ? npcAreaNow(npc.id, now) : areaId
  const band = timeBand(now)
  const context = workContext(npc, here, now)

  const usable = LIVING_LINES.filter(
    (line) => line.npcId === npc.id && matches(line, here, band, context),
  )
  if (usable.length === 0) return []

  const top = Math.max(...usable.map(specificity))
  return usable.filter((line) => specificity(line) === top)
}

/**
 * 방금 한 말은 잠깐 빼둔다.
 *
 * 저장에 넣지 않는다. 앱을 껐다 켜면 잊어버려도 되는 종류다 —
 * "어제 뭐라고 했더라" 를 기억해야 할 만큼 중요한 말이 아니고,
 * 그걸 남기려고 저장 칸을 만들면 그때부터 이관과 정리가 따라온다.
 */
const RECENT_KEEP = 2
const recent = new Map<NpcId, string[]>()

export function rememberLine(npcId: NpcId, lineId: string): void {
  const kept = [lineId, ...(recent.get(npcId) ?? []).filter((id) => id !== lineId)]
  recent.set(npcId, kept.slice(0, RECENT_KEEP))
}

/** 개발용 · 테스트용 — 기억을 비운다 */
export function forgetLines(): void {
  recent.clear()
}

/**
 * 지금 할 말 한 줄.
 *
 * 방금 한 말은 빼고 고른다. 뺐더니 아무것도 안 남으면 그냥 다시 한다 —
 * 후보가 하나뿐인 사람에게 "할 말 없음" 을 만들지 않는다.
 */
export function pickLivingLine(
  input: LivingInput,
  random: () => number = Math.random,
): LivingLine | null {
  const candidates = livingCandidates(input)
  if (candidates.length === 0) return null

  const said = recent.get(input.npc.id) ?? []
  const fresh = candidates.filter((line) => !said.includes(line.id))
  const pool = fresh.length > 0 ? fresh : candidates

  const line = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
  rememberLine(input.npc.id, line.id)
  return line
}

export { LIVING_LINES }
