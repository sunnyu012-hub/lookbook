import type { AppState, NpcId, StoryChapterDef, StoryChapterView } from '@/types'
import { conditionProgress } from './secrets'

/**
 * 도시 사람들의 짧은 이야기.
 *
 * 친밀도가 숫자로만 올라가면 그건 게이지지 관계가 아니다.
 * 그래서 사람마다 서너 장을 두고, 가까워지는 만큼 하나씩 열린다.
 *
 * ── 짧게 쓴다 ───────────────────────────────────────
 *
 * 한 장은 서너 줄이다. 폰에서 스크롤 없이 읽히는 길이.
 * 길게 쓰면 안 읽고 넘기게 되고, 그러면 안 쓴 것과 같다.
 *
 * ── 시키지 않는다 ───────────────────────────────────
 *
 * 장을 열려고 퀘스트를 억지로 시키지 않는다.
 * 조건은 이미 하고 있는 것 — 그 동네에 얼마나 있었나, 얼마나 자주 만났나 —
 * 로만 잡는다. 읽는 것 자체가 보상이다.
 */

export const STORY_CHAPTERS: StoryChapterDef[] = [
  // ── 미나 · 카페 거리 ──────────────────────────────
  {
    id: 'MINA_1',
    npcId: 'MINA',
    order: 1,
    title: '늘 같은 자리',
    lockedHint: '미나와 몇 번 더 이야기하면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'MINA', value: 6 }],
    lines: [
      '"저 자리 있잖아. 창가 두 번째."',
      '"매일 아침에 제일 먼저 닦아. 아무도 안 시켰는데."',
      '"거기 앉는 사람이 늘 같은 사람이라서 그런가 봐."',
    ],
    rewardItemId: 'my_mug',
    rewardFriendship: 3,
  },
  {
    id: 'MINA_2',
    npcId: 'MINA',
    order: 2,
    title: '쉬러 오는 사람들',
    lockedHint: '조금 더 자주 들르면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'MINA', value: 16 }],
    lines: [
      '"노트북 안 켜고 그냥 앉아 있다 가는 손님이 있어."',
      '"한 시간쯤 창밖만 보다가 가."',
      '"처음엔 뭐 하시나 했는데, 요즘은 그게 제일 부러워."',
    ],
    rewardItemId: 'warm_tea',
    rewardFriendship: 3,
  },
  {
    id: 'MINA_3',
    npcId: 'MINA',
    order: 3,
    title: '문 닫은 뒤',
    lockedHint: '이 동네에서 얼굴이 좀 알려지면.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'MINA', value: 26 },
      { kind: 'AREA_REPUTATION', areaId: 'CAFE_STREET', value: 25 },
    ],
    lines: [
      '"문 닫고 나서가 제일 좋아. 불 하나만 켜두고."',
      '"그때 마시는 게 제일 맛있어. 팔 때는 그렇게 안 되더라고."',
    ],
    rewardItemId: 'candle_light',
    rewardFriendship: 4,
  },
  {
    id: 'MINA_4',
    npcId: 'MINA',
    order: 4,
    title: '뒤쪽의 작은 방',
    lockedHint: '미나가 아직 안 한 말이 있는 것 같다.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'MINA', value: 30 },
      { kind: 'AREA_REPUTATION', areaId: 'CAFE_STREET', value: 40 },
    ],
    lines: [
      '"사실 뒤쪽에 작은 방이 하나 있어."',
      '"손님한테는 잘 안 알려주는데."',
      '"거긴 오래 앉아 있어도 아무도 안 봐. 필요할 때 써."',
    ],
    rewardItemId: null,
    rewardFriendship: 5,
    unlocksSecret: 'BACKROOM_CAFE',
  },

  // ── 하루 · 초록 공원 ──────────────────────────────
  {
    id: 'HARU_1',
    npcId: 'HARU',
    order: 1,
    title: '자기 속도',
    lockedHint: '하루와 몇 번 더 마주치면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'HARU', value: 6 }],
    lines: [
      '"빨리 뛰는 사람이 부럽지 않냐고? 예전엔 그랬지."',
      '"근데 빨리 뛰면 이 길을 못 봐."',
      '"나는 이 길 보려고 나오는 거라서."',
    ],
    rewardItemId: 'water_bottle',
    rewardFriendship: 3,
  },
  {
    id: 'HARU_2',
    npcId: 'HARU',
    order: 2,
    title: '아침의 공원',
    lockedHint: '공원에 좀 더 자주 오면.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'HARU', value: 16 },
      { kind: 'AREA_REPUTATION', areaId: 'GREEN_PARK', value: 20 },
    ],
    lines: [
      '"여섯 시 반쯤 오면 사람이 거의 없어."',
      '"그때 벤치 하나가 딱 해 드는 자리가 돼."',
      '"거기 앉아서 아무것도 안 해. 그게 다야."',
    ],
    rewardItemId: 'wood_bench',
    rewardFriendship: 4,
  },
  {
    id: 'HARU_3',
    npcId: 'HARU',
    order: 3,
    title: '옥상에 있는 것',
    lockedHint: '공원 근처를 더 알게 되면.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'HARU', value: 26 },
      { kind: 'AREA_REPUTATION', areaId: 'GREEN_PARK', value: 30 },
    ],
    lines: [
      '"저 건물 옥상 봤어? 뭐가 자라고 있더라."',
      '"누가 돌보는지는 모르겠는데 잘 크고 있어."',
      '"올라가는 계단이 어디 있긴 할 텐데."',
    ],
    rewardItemId: 'sprout_jar',
    rewardFriendship: 4,
  },
  {
    // 다음에 올 것을 여기서 한 번 흘린다.
    // 지도에 새 점을 미리 찍어두지 않는다 — 못 가는 곳이 지도에 있으면
    // 그건 기대가 아니라 잠긴 문이다. 사람이 지나가듯 말하는 게 낫다.
    id: 'HARU_4',
    npcId: 'HARU',
    order: 4,
    title: '돌이 많은 길',
    lockedHint: '하루가 요즘 다른 데를 다니는 것 같다.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'HARU', value: 30 },
      { kind: 'AREA_REPUTATION', areaId: 'GREEN_PARK', value: 40 },
    ],
    lines: [
      '"공원 바깥쪽으로 계속 걸으면 길이 좀 달라져."',
      '"흙이 없고 돌이 많아. 옛날에 뭘 캤던 자리래."',
      '"단단한 게 필요하면 거기 있을 것 같은데, 아직 안 가봤어."',
    ],
    rewardItemId: null,
    rewardFriendship: 4,
  },

  // ── 루루 · 창작 지구 ──────────────────────────────
  {
    id: 'LULU_1',
    npcId: 'LULU',
    order: 1,
    title: '안 끝낸 것들',
    lockedHint: '루루와 몇 번 더 이야기하면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'LULU', value: 6 }],
    lines: [
      '"저기 쌓인 거? 전부 하다 만 거야."',
      '"끝내야 된다고 생각하면 시작을 못 하겠더라고."',
      '"그래서 그냥 시작만 해. 요즘은 그게 편해."',
    ],
    rewardItemId: 'sketchbook',
    rewardFriendship: 3,
  },
  {
    id: 'LULU_2',
    npcId: 'LULU',
    order: 2,
    title: '잘 안 된 날',
    lockedHint: '조금 더 친해지면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'LULU', value: 16 }],
    lines: [
      '"오늘 완전 망했어. 세 시간 했는데."',
      '"근데 세 시간 동안 딴 생각을 한 번도 안 했거든."',
      '"그럼 된 거 아닌가 싶어서."',
    ],
    rewardItemId: 'yarn',
    rewardFriendship: 4,
  },
  {
    id: 'LULU_3',
    npcId: 'LULU',
    order: 3,
    title: '골목 끝의 소리',
    lockedHint: '이 동네를 더 돌아다니면.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'LULU', value: 24 },
      { kind: 'AREA_REPUTATION', areaId: 'CREATIVE_DISTRICT', value: 28 },
    ],
    lines: [
      '"골목 끝에서 가끔 소리 나는 거 들었어?"',
      '"옛날에 오락실이었대. 아직 안 닫았다는 말도 있고."',
      '"한 번 가보고 싶은데 무서워서 혼자는 못 가겠어."',
    ],
    rewardItemId: 'small_radio',
    rewardFriendship: 4,
  },

  // ── 노아 · 밤거리 ─────────────────────────────────
  {
    id: 'NOA_1',
    npcId: 'NOA',
    order: 1,
    title: '밤에 여는 이유',
    lockedHint: '밤에 몇 번 더 마주치면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'NOA', value: 6 }],
    lines: [
      '"왜 밤에만 여냐고?"',
      '"낮에 오는 사람들은 뭘 살지 정하고 오거든."',
      '"밤에 오는 사람들은 그냥 와. 나는 그쪽이 좋아."',
    ],
    rewardItemId: 'stardust_jar',
    rewardFriendship: 3,
  },
  {
    id: 'NOA_2',
    npcId: 'NOA',
    order: 2,
    title: '안 파는 것',
    lockedHint: '노아와 조금 더 가까워지면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'NOA', value: 18 }],
    lines: [
      '"이건 안 팔아."',
      '"팔 수도 있는데, 사갈 사람을 아직 못 봤어."',
      '"언젠가 보면 그때 줄게."',
    ],
    rewardItemId: 'moon_keyring_c',
    rewardFriendship: 4,
  },
  {
    id: 'NOA_3',
    npcId: 'NOA',
    order: 3,
    title: '골목 안쪽',
    lockedHint: '밤거리가 익숙해지면.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'NOA', value: 26 },
      { kind: 'AREA_REPUTATION', areaId: 'NIGHT_TOWN', value: 14 },
    ],
    lines: [
      '"저 안쪽에 길이 하나 더 있어."',
      '"아무한테나 보이지는 않더라고. 이유는 나도 몰라."',
      '"너는 이제 보일 것 같은데."',
    ],
    rewardItemId: null,
    rewardFriendship: 5,
    unlocksSecret: 'MOON_ALLEY',
  },
]

export function chaptersOf(npcId: NpcId): StoryChapterDef[] {
  return STORY_CHAPTERS.filter((c) => c.npcId === npcId).sort((a, b) => a.order - b.order)
}

export function findChapter(id: string): StoryChapterDef | null {
  return STORY_CHAPTERS.find((c) => c.id === id) ?? null
}

/**
 * 이 장이 열렸는지.
 *
 * 앞 장을 먼저 읽어야 다음 장이 열린다 — 순서 없이 열리면 이야기가 안 된다.
 */
export function isChapterUnlocked(state: AppState, def: StoryChapterDef): boolean {
  const previous = chaptersOf(def.npcId).filter((c) => c.order < def.order)
  if (!previous.every((c) => state.discovery.readChapterIds.includes(c.id))) return false
  return def.conditions.every((c) => conditionProgress(state, c) >= 1)
}

export function chapterViews(state: AppState, npcId: NpcId): StoryChapterView[] {
  return chaptersOf(npcId).map((def) => ({
    def,
    unlocked: isChapterUnlocked(state, def),
    read: state.discovery.readChapterIds.includes(def.id),
  }))
}

/** 지금 읽을 수 있는데 아직 안 읽은 장 */
export function unreadChapters(state: AppState): StoryChapterDef[] {
  return STORY_CHAPTERS.filter(
    (def) => !state.discovery.readChapterIds.includes(def.id) && isChapterUnlocked(state, def),
  )
}

/** 이 사람 이야기를 몇 장까지 읽었는지 */
export function storyProgress(
  state: AppState,
  npcId: NpcId,
): { read: number; total: number } {
  const all = chaptersOf(npcId)
  return {
    read: all.filter((c) => state.discovery.readChapterIds.includes(c.id)).length,
    total: all.length,
  }
}
