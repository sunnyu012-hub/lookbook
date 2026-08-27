import type { AppState, CreatureId, CreatureStage, CreatureStepDef, CreatureView } from '@/types'
import { addItem, isDiscovered } from '@/lib/collection/progress'
import { seededRandom } from '@/lib/city/seed'
import { todayKey } from '@/lib/date'
import {
  CREATURES,
  DOOR_CREATURE_IDS,
  STEPS_BY_CREATURE,
  findCreature,
  findCreatureStep,
} from './creatures'
import { isRoomDiscovered } from './derive'

/**
 * 생명체와 어디까지 왔는지.
 *
 * 저장하는 건 `dungeon.creatureLog` 배열 하나뿐이다.
 * 친해졌는지도, 문이 열렸는지도, 금속을 빼냈는지도 전부 여기서 센다 —
 * 그 값들을 따로 적어두면 언젠가 둘이 어긋난다.
 */

export function hasStep(state: AppState, stepId: string): boolean {
  return state.dungeon.creatureLog.includes(stepId)
}

/**
 * 지금 밟을 수 있는 걸음.
 *
 * 앞에서부터 아직 안 밟은 첫 번째. 전부 밟았으면 null —
 * 더 할 게 없다는 뜻이고, 그때부터 그 자리에는 ambient 만 뜬다.
 */
export function nextStep(state: AppState, creatureId: CreatureId): CreatureStepDef | null {
  return STEPS_BY_CREATURE[creatureId].find((s) => !hasStep(state, s.id)) ?? null
}

/**
 * 어느 단계까지 왔는지.
 *
 * 밟은 걸음 중 가장 나중 것의 단계다. 이 이름은 화면에 안 쓴다 —
 * 사람이 보는 건 그 애가 하는 행동이지 단계 이름이 아니다.
 */
export function creatureStage(state: AppState, creatureId: CreatureId): CreatureStage {
  const steps = STEPS_BY_CREATURE[creatureId]
  let stage: CreatureStage = 'UNKNOWN'
  for (const step of steps) {
    if (!hasStep(state, step.id)) break
    stage = step.stage
  }
  return stage
}

export function isCreatureDiscovered(state: AppState, creatureId: CreatureId): boolean {
  return isDiscovered(state.collection, creatureId)
}

export function isCreatureFriendly(state: AppState, creatureId: CreatureId): boolean {
  return creatureStage(state, creatureId) === 'FRIENDLY'
}

/**
 * 문을 여는 셋과 다 친해졌는지.
 *
 * 돌잠이는 문 안쪽에 있으니 여기 안 센다.
 */
export function allDoorCreaturesFriendly(state: AppState): boolean {
  return DOOR_CREATURE_IDS.every((id) => isCreatureFriendly(state, id))
}

/**
 * 안쪽 문이 열려 있는지.
 *
 * 따로 적어두지 않는다 — 셋과 친해졌으면 열린 것이다.
 * 한 번 열리면 다시 닫히지 않는다 (단계는 내려가지 않으니까).
 */
export function isInnerDoorOpen(state: AppState): boolean {
  return allDoorCreaturesFriendly(state)
}

/** 금속을 빼냈는지. 이야기가 끝났는지가 여기서 갈린다. */
export function isSleeperFreed(state: AppState): boolean {
  return hasStep(state, 'stone_sleeper:free')
}

/** 첫 던전 이야기가 끝났는지 */
export function isDungeonStoryDone(state: AppState): boolean {
  return isCreatureFriendly(state, 'stone_sleeper')
}

// ── 도감 기록 ───────────────────────────────────────────

/**
 * 지금까지 쌓인 기록.
 *
 * 첫 줄은 처음 만났을 때의 설명이고, 그 뒤로 걸음마다 한 줄씩 붙는다.
 * 저장하지 않는다 — 밟은 걸음에서 매번 다시 만든다.
 */
export function creatureNotes(state: AppState, creatureId: CreatureId): string[] {
  const def = findCreature(creatureId)
  if (!def || !isCreatureDiscovered(state, creatureId)) return []

  const notes = [def.description]
  for (const step of STEPS_BY_CREATURE[creatureId]) {
    if (!hasStep(state, step.id)) break
    if (step.note) notes.push(step.note)
  }
  return notes
}

/** 도감 카드에 들어가는 한 덩어리 */
export function creatureDescription(state: AppState, creatureId: CreatureId): string | null {
  const notes = creatureNotes(state, creatureId)
  return notes.length > 0 ? notes.join(' ') : null
}

// ── 한 걸음 밟기 ────────────────────────────────────────

export interface StepResult {
  state: AppState
  step: CreatureStepDef
  /** 이 걸음에서 처음 만났으면 그 생명체 */
  discovered: CreatureId | null
  /** 고른 갈래에서 읽는 줄 + 공통으로 읽는 줄 */
  lines: string[]
}

export type TakeStepResult = StepResult | { state: AppState; step: null }

/**
 * 한 걸음 밟는다.
 *
 * 모험 에너지를 쓰지 않는다. 관계가 에너지를 쓰기 시작하면
 * 그때부터는 만나는 게 아니라 자원을 쓰는 게 된다 —
 * 에너지는 처음 가는 곳을 들여다볼 때만 쓴다 (goDeeper · search).
 *
 * 실패가 없다. 고를 수 있는 자리에서 어느 쪽을 골라도 진행은 같다.
 */
export function takeCreatureStep(
  state: AppState,
  stepId: string,
  choiceIndex = 0,
  now: Date = new Date(),
): TakeStepResult {
  const step = findCreatureStep(stepId)
  if (!step) return { state, step: null }
  // 그 방에 가본 적이 있어야 한다
  if (!isRoomDiscovered(state, step.roomId)) return { state, step: null }
  // 이미 밟은 걸음은 다시 밟지 않는다 — 두 번 눌러도 한 번만 남는다
  if (hasStep(state, stepId)) return { state, step: null }
  // 순서를 건너뛸 수 없다
  if (nextStep(state, step.creatureId)?.id !== stepId) return { state, step: null }

  const choice = step.choices?.[Math.max(0, Math.min(choiceIndex, step.choices.length - 1))]
  const lines = [...(choice?.lines ?? []), ...(step.after ?? [])]

  let collection = state.collection
  let discovered: CreatureId | null = null
  if (step.discovers && !isDiscovered(collection, step.discovers)) {
    collection = addItem(collection, step.discovers, now).collection
    discovered = step.discovers
  }

  return {
    state: {
      ...state,
      collection,
      dungeon: { ...state.dungeon, creatureLog: [...state.dungeon.creatureLog, stepId] },
    },
    step,
    discovered,
    lines,
  }
}

// ── 화면이 보는 것 ──────────────────────────────────────

/** 이 방에서 지금 밟을 수 있는 걸음들 */
export function stepsInRoom(state: AppState, roomId: string): CreatureStepDef[] {
  const out: CreatureStepDef[] = []
  for (const def of CREATURES) {
    const step = nextStep(state, def.id)
    if (step && step.roomId === roomId) out.push(step)
  }
  return out
}

/**
 * 이 방에서 오늘 보이는 모습.
 *
 * 친해진 뒤에만 뜬다. 보상도 진행도 없고, 매번 뜨지도 않는다 —
 * 늘 무슨 일이 일어나면 그건 풍경이 아니라 알림이다.
 */
export function ambientInRoom(state: AppState, roomId: string, now: Date = new Date()): string[] {
  const out: string[] = []
  for (const def of CREATURES) {
    if (def.roomId !== roomId) continue
    if (!isCreatureFriendly(state, def.id)) continue
    const rng = seededRandom(`${todayKey(now)}:ambient:${def.id}`)
    // 다섯 중 셋쯤만 뜬다
    if (rng() < 0.35) continue
    out.push(`${def.name} — ${def.ambient[Math.floor(rng() * def.ambient.length)]}`)
  }
  return out
}

export function creatureViews(state: AppState): CreatureView[] {
  return CREATURES.map((def) => ({
    def,
    stage: creatureStage(state, def.id),
    step: nextStep(state, def.id),
    notes: creatureNotes(state, def.id),
  }))
}

/** 지금 만나본 생명체 수 */
export function metCreatureCount(state: AppState): number {
  return CREATURES.filter((c) => isCreatureDiscovered(state, c.id)).length
}
