import { NPC_IDS, type NpcId } from '@/types'

/**
 * 사람 얼굴.
 *
 * 자리표로 이모지 하나(☕ 🏃 🧶)를 세워뒀었다. 여섯 명일 때는 그걸로도
 * 구분이 됐는데 스물넷이 되니 아침 카페 거리에 컵과 책과 가방이 나란히
 * 놓일 뿐 누가 누군지 읽히지 않았다. 그림이 오면 이름을 읽기 전에
 * 사람이 먼저 보인다.
 *
 * 그림은 `assets/source-sheets/npc-face*.webp` 를 잘라 만든다.
 *
 *     npm run assets:npcs
 *
 * ── 아직 얼굴이 없는 사람 ──────────────────────────────
 *
 * 스물넷 중 강유현 한 명은 아직 그림이 없다. 그런 사람은 이모지가
 * 그대로 남는다 — 얼굴이 없다고 도시에서 빼지 않는다. 그림이 오면
 * 시트에 넣고 이 목록에 id 한 줄을 더하면 된다.
 */
const DRAWN = [
  'MINA',
  'HARU',
  'LULU',
  'JUNE',
  'RIO',
  'NOA',
  'EUNCHAE',
  'MINJI',
  'JUN',
  'HYUNWOO',
  'HARIN',
  'JAEHUI',
  'RAON',
  'JIHO',
  'WOOSIK',
  'HAEIN',
  'SUA',
  'SUNJAE',
  'YEONJU',
  'YUNA',
  'SIWOO',
  'SORA',
  'JEONGWON',
] as const satisfies readonly NpcId[]

const DRAWN_SET: ReadonlySet<string> = new Set(DRAWN)

/** 그려진 얼굴이 있으면 그 파일, 없으면 null */
export function npcPortrait(id: NpcId): string | null {
  return DRAWN_SET.has(id) ? `/assets/npcs/${id}.webp` : null
}

/** 아직 이모지로 서 있는 사람들 */
export function npcsWithoutPortrait(): NpcId[] {
  return NPC_IDS.filter((id) => !DRAWN_SET.has(id))
}
