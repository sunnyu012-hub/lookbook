import type { AreaId, CityEvent, NpcDef, NpcDialogue, TimeBand } from '@/types'
import { friendshipLevel, friendshipLevelIndex } from './npcs'
import { pickLivingLine } from './living'

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
  /** 정원을 아직 못 찾았으면 0 */
  gardenLevel = 0,
  /** 지금까지 읽은 이야기 장. 모르는 사람에게는 그 얘기를 안 꺼낸다. */
  readChapterIds: readonly string[] = [],
): NpcDialogue[] {
  const level = friendshipLevel(friendship)
  const eventIds = new Set(events.map((e) => e.id))

  const usable = npc.dialogues.filter((d) => {
    if (d.eventId && !eventIds.has(d.eventId)) return false
    if (d.band && d.band !== band) return false
    if (d.minLevel && friendshipLevelIndex(level) < friendshipLevelIndex(d.minLevel)) return false
    if (d.minGardenLevel && gardenLevel < d.minGardenLevel) return false
    if (d.afterChapterId && !readChapterIds.includes(d.afterChapterId)) return false
    return true
  })

  const eventLines = usable.filter((d) => d.eventId)
  if (eventLines.length > 0) return eventLines

  // 정원 얘기는 시간대 얘기보다 먼저 한다. 어쩌다 한 번 열리는 말이라
  // 뒤로 밀리면 평생 안 나올 수도 있다.
  const gardenLines = usable.filter((d) => d.minGardenLevel)
  if (gardenLines.length > 0) return gardenLines

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
  gardenLevel = 0,
  random: () => number = Math.random,
  /** 지금 이 사람이 있는 자리. 넘기면 생활 대사가 같이 후보에 들어간다. */
  living?: { areaId: AreaId | null; now: Date },
  /** 읽은 이야기 장 */
  readChapterIds: readonly string[] = [],
): string {
  const lines = eligibleDialogues(npc, friendship, band, events, gardenLevel, readChapterIds)

  /*
   * 오늘만 참인 말(이벤트·정원)이 있으면 그게 먼저다. 생활 대사는 늘
   * 할 수 있는 말이라 미뤄도 아무것도 잃지 않는다.
   */
  const special = lines.some((d) => d.eventId || d.minGardenLevel)

  /*
   * 이야기를 읽고 나서 열린 말은 생활 대사보다 먼저 나온다 — 한 번쯤은
   * 들려야 읽은 보람이 있다. 후보가 늘 있는 게 아니라 자주 튀지도 않는다.
   */
  const afterStory = lines.filter((d) => d.afterChapterId)
  if (afterStory.length > 0 && random() < 0.5) {
    return afterStory[Math.floor(random() * afterStory.length) % afterStory.length].text
  }

  if (living && !special) {
    const line = pickLivingLine({ npc, areaId: living.areaId, now: living.now }, random)
    if (line) {
      /*
       * 친해져서 열린 말과 섞는다. 생활 대사만 내보내면 "이제 친구야"
       * 쪽 대사가 영영 안 나오고, 그러면 친해지는 게 화면에서 사라진다.
       * 반대로 친밀도 대사만 내보내면 어디서 만나든 같은 말을 한다.
       */
      const levelLines = lines.filter((d) => d.minLevel)
      if (levelLines.length === 0) return line.text

      const pool = [line.text, ...levelLines.map((d) => d.text)]
      return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
    }
  }

  if (lines.length === 0) return '...'
  return lines[Math.floor(random() * lines.length) % lines.length].text
}
