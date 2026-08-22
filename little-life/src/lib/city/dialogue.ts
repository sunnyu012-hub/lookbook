import type { CityEvent, NpcDef, NpcDialogue, TimeBand } from '@/types'
import { friendshipLevel, friendshipLevelIndex } from './npcs'

/**
 * 지금 이 사람이 할 만한 말을 고른다.
 *
 * 이벤트 대사 > 시간대 대사 > 친밀도 대사 > 아무 때나 하는 말 순으로 본다.
 * 특별한 상황이 있으면 그 얘기를 먼저 하는 게 자연스럽다.
 */
export function eligibleDialogues(
  npc: NpcDef,
  friendship: number,
  band: TimeBand,
  events: CityEvent[],
): NpcDialogue[] {
  const level = friendshipLevel(friendship)
  const eventIds = new Set(events.map((e) => e.id))

  const usable = npc.dialogues.filter((d) => {
    if (d.eventId && !eventIds.has(d.eventId)) return false
    if (d.band && d.band !== band) return false
    if (d.minLevel && friendshipLevelIndex(level) < friendshipLevelIndex(d.minLevel)) return false
    return true
  })

  const eventLines = usable.filter((d) => d.eventId)
  if (eventLines.length > 0) return eventLines

  const bandLines = usable.filter((d) => d.band)
  if (bandLines.length > 0) return bandLines

  const levelLines = usable.filter((d) => d.minLevel)
  const plain = usable.filter((d) => !d.minLevel && !d.band && !d.eventId)

  // 친해질수록 그 사람만 하는 말이 더 자주 나온다
  return levelLines.length > 0 ? [...levelLines, ...plain] : plain
}

export function pickDialogue(
  npc: NpcDef,
  friendship: number,
  band: TimeBand,
  events: CityEvent[],
  random: () => number = Math.random,
): string {
  const lines = eligibleDialogues(npc, friendship, band, events)
  if (lines.length === 0) return '...'
  return lines[Math.floor(random() * lines.length) % lines.length].text
}
