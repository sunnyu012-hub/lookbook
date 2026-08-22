import type { FriendshipLevel, NpcDef, NpcId } from '@/types'
import { FRIENDSHIP_LEVELS } from '@/types'

/**
 * 도시 사람들.
 *
 * 대사는 짧고 현대 생활 말투로 쓴다. 과한 판타지 문체는 쓰지 않는다.
 * 아무도 재촉하지 않는다 — 며칠 만에 와도 "어디 갔었어" 라고 묻지 않는다.
 */

export const NPCS: NpcDef[] = [
  {
    id: 'MINA',
    name: 'Mina',
    areaId: 'CAFE_STREET',
    role: 'Cafe Keeper',
    description: '작은 카페를 혼자 꾸려가는 사람. 말수는 적지만 잘 본다.',
    avatar: '☕',
    likes: ['coffee', 'book'],
    shopId: 'MINA_CAFE',
    dialogues: [
      { text: '어서 와. 오늘은 창가 자리가 비었어.' },
      { text: '집중이 안 되는 날엔 그냥 앉아만 있어도 돼.' },
      { text: '원두를 바꿔봤는데, 어떤지 모르겠네.' },
      { text: '바쁜 사람들이 많이 다녀갔어. 다들 뭔가 하고 있더라.' },
      { text: '한 가지만 끝내고 가도 충분한 하루야.' },
      { text: '아침엔 조용해서 좋아. 뭐 마실래?', band: 'MORNING' },
      { text: '저녁엔 조명을 낮춰. 그게 더 편하더라.', band: 'EVENING' },
      { text: '자주 보니까 이제 얼굴만 봐도 알겠어.', minLevel: 'FRIEND' },
      { text: '오늘 뭐 할지 모르겠으면, 여기 앉아서 정하고 가.', minLevel: 'FRIEND' },
      { text: '네 자리는 늘 비워둘게.', minLevel: 'SPECIAL_BOND' },
      { text: '비 오는 날은 이상하게 잘 팔려. 다들 오래 앉아 있고.', eventId: 'rainy_cafe' },
    ],
    chains: [
      {
        id: 'mina_focus',
        npcId: 'MINA',
        name: '집중이 안 되는 날',
        intro: '오늘 집중이 잘 안 되는 손님이 많네. 너도 그래?',
        outro: '봐, 하나씩 하면 되잖아. 이거 가져가.',
        steps: [
          { title: '20분만 집중해보기', category: 'WORK', difficulty: 'EASY' },
          { title: '물 한 잔 마시기', category: 'LIFE', difficulty: 'EASY' },
          { title: '오늘 가장 중요한 일 하나 끝내기', category: 'WORK', difficulty: 'NORMAL' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'focus_coffee',
      },
      {
        id: 'mina_quiet',
        npcId: 'MINA',
        name: '조용한 오후',
        intro: '가끔은 아무것도 안 하는 시간도 필요하더라.',
        outro: '이런 날도 있어야 해. 이건 내가 주는 거야.',
        requiresLevel: 'FRIEND',
        steps: [
          { title: '10분 아무것도 안 하기', category: 'MIND', difficulty: 'EASY' },
          { title: '창밖 한 번 보기', category: 'MIND', difficulty: 'EASY' },
        ],
        rewardCoins: 30,
        rewardFriendship: 10,
        rewardItemId: 'rainy_day_tea',
      },
    ],
  },
  {
    id: 'HARU',
    name: 'Haru',
    areaId: 'GREEN_PARK',
    role: 'Morning Runner',
    description: '아침마다 공원을 도는 사람. 늘 조금 숨이 차 있다.',
    avatar: '🏃',
    likes: ['healthy', 'nature', 'sport'],
    shopId: null,
    dialogues: [
      { text: '오, 왔네. 오늘 날씨 괜찮지?' },
      { text: '한 바퀴만 돌아도 기분이 달라져.' },
      { text: '나도 매일 나오는 건 아니야. 그래도 괜찮아.' },
      { text: '벤치에 앉아 있다 가도 돼. 그것도 나온 거야.' },
      { text: '무릎이 좀 아파서 오늘은 천천히 뛰었어.' },
      { text: '아침 공기 맡으러 나온 거지? 잘했어.', band: 'MORNING' },
      { text: '해 질 때 여기가 제일 예뻐.', band: 'EVENING' },
      { text: '같이 걸을래? 말 안 해도 돼.', minLevel: 'FRIEND' },
      { text: '네가 오면 나도 하루 시작한 것 같아.', minLevel: 'SPECIAL_BOND' },
      { text: '오늘 빛이 좋다. 사진이라도 찍어둘 걸.', eventId: 'golden_hour' },
    ],
    chains: [
      {
        id: 'haru_start',
        npcId: 'HARU',
        name: '가볍게 시작하기',
        intro: '거창하게 시작하면 오래 못 가. 작게 해보자.',
        outro: '이 정도면 충분해. 신발 하나 줄게, 편할 거야.',
        steps: [
          { title: '5분 스트레칭', category: 'BODY', difficulty: 'EASY' },
          { title: '밖에 나가서 10분 걷기', category: 'BODY', difficulty: 'EASY' },
        ],
        rewardCoins: 35,
        rewardFriendship: 10,
        rewardItemId: 'morning_sneakers',
      },
      {
        id: 'haru_together',
        npcId: 'HARU',
        name: '누군가와 같이',
        intro: '혼자 하는 것도 좋은데, 가끔은 같이가 낫더라.',
        outro: '고마워. 오늘 좀 덜 외로웠어.',
        requiresLevel: 'FAMILIAR',
        steps: [
          { title: '보고 싶은 사람에게 연락하기', category: 'HEART', difficulty: 'EASY' },
          { title: '같이 산책하거나 통화하기', category: 'HEART', difficulty: 'NORMAL' },
        ],
        rewardCoins: 45,
        rewardFriendship: 10,
        rewardItemId: 'green_charm',
      },
    ],
  },
  {
    id: 'LULU',
    name: 'Lulu',
    areaId: 'CREATIVE_DISTRICT',
    role: 'Independent Designer',
    description: '작업실 겸 가게를 쓰는 사람. 늘 뭔가 만들고 있다.',
    avatar: '🎨',
    likes: ['art', 'collectible'],
    shopId: null,
    dialogues: [
      { text: '이거 봐, 어제 만든 건데 아직 마음에 안 들어.' },
      { text: '잘 만들려고 하면 손이 안 움직여. 일단 그려.' },
      { text: '망한 것도 다 남겨둬. 나중에 쓰이더라.' },
      { text: '오늘은 아무것도 안 나왔어. 그런 날도 있지.' },
      { text: '재미없으면 그만해도 돼. 진짜로.' },
      { text: '밤에 하는 작업이 제일 잘 돼. 위험한 습관이지만.', band: 'NIGHT' },
      { text: '너 요즘 뭐 만들어? 궁금해서.', minLevel: 'FRIEND' },
      { text: '네가 만든 거 언젠가 꼭 보여줘.', minLevel: 'CLOSE_FRIEND' },
      { text: '오늘 시장 나왔어? 좋은 거 많더라.', eventId: 'tiny_flea_market' },
    ],
    chains: [
      {
        id: 'lulu_make',
        npcId: 'LULU',
        name: '아무거나 하나 만들기',
        intro: '잘 만들 필요 없어. 하나만 끝내보자.',
        outro: '봤지? 끝내는 게 제일 어려운 거야.',
        steps: [
          { title: '뭘 만들지 5분 안에 정하기', category: 'PLAY', difficulty: 'EASY' },
          { title: '30분 동안 만들어보기', category: 'PLAY', difficulty: 'NORMAL' },
          { title: '완성 안 됐어도 일단 마무리하기', category: 'MIND', difficulty: 'EASY' },
        ],
        rewardCoins: 50,
        rewardFriendship: 10,
        rewardItemId: 'tiny_sketchbook',
      },
    ],
  },
  {
    id: 'JUNE',
    name: 'June',
    areaId: 'CREATIVE_DISTRICT',
    role: 'Vintage Shop Keeper',
    description: '오래된 물건만 파는 가게 주인. 물건마다 이야기를 붙인다.',
    avatar: '🧥',
    likes: ['collectible', 'cozy'],
    shopId: 'JUNE_CLOSET',
    dialogues: [
      { text: '천천히 봐. 아무것도 안 사도 돼.' },
      { text: '이건 누가 오래 입던 거야. 그래서 더 편해.' },
      { text: '새 물건보다 손 탄 물건이 몸에 잘 맞아.' },
      { text: '뭘 찾는지 모르겠으면 그냥 눈에 들어오는 걸로 해.' },
      { text: '오늘 새로 들어온 게 있는데, 안쪽에 있어.' },
      { text: '문 닫기 전에 왔네. 편하게 봐.', band: 'EVENING' },
      { text: '너한테 어울릴 것 같아서 빼놨어.', minLevel: 'FRIEND' },
      { text: '이건 안 팔려고 뒀던 건데, 가져가.', minLevel: 'SPECIAL_BOND' },
    ],
    chains: [
      {
        id: 'june_tidy',
        npcId: 'JUNE',
        name: '안 쓰는 것 정리하기',
        intro: '새로 들이기 전에 나갈 걸 정해야 해. 늘 그래.',
        outro: '자리가 생겼네. 이건 그 자리에 놔.',
        steps: [
          { title: '서랍 한 칸 비우기', category: 'LIFE', difficulty: 'NORMAL' },
          { title: '안 쓰는 것 3개 골라내기', category: 'LIFE', difficulty: 'EASY' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'vintage_ribbon',
      },
    ],
  },
  {
    id: 'RIO',
    name: 'Rio',
    areaId: 'TRAINING_ZONE',
    role: 'Coach',
    description: '기초만 반복해서 가르치는 코치. 절대 몰아붙이지 않는다.',
    avatar: '👟',
    likes: ['sport', 'healthy'],
    shopId: 'MOVE_STORE',
    dialogues: [
      { text: '왔네. 오늘은 몸이 어때?' },
      { text: '오늘 안 되면 내일 해. 몸은 도망 안 가.' },
      { text: '무게 늘리는 것보다 자세가 먼저야.' },
      { text: '쉬는 날도 훈련의 일부야. 진짜로.' },
      { text: '숨이 차면 멈춰. 그게 실패가 아니야.' },
      { text: '아침에 하면 하루가 길어져.', band: 'MORNING' },
      { text: '너 자세 좋아졌어. 눈에 보여.', minLevel: 'FRIEND' },
      { text: '이제 내가 안 봐줘도 되겠는데.', minLevel: 'CLOSE_FRIEND' },
    ],
    chains: [
      {
        id: 'rio_basic',
        npcId: 'RIO',
        name: '기초 한 세트',
        intro: '딱 한 세트만 하자. 그 이상은 오늘 안 해.',
        outro: '좋아. 이거 신고 다녀.',
        steps: [
          { title: '스쿼트 10번', category: 'BODY', difficulty: 'EASY' },
          { title: 'plank 30초', category: 'BODY', difficulty: 'EASY' },
          { title: '물 마시고 5분 쉬기', category: 'LIFE', difficulty: 'EASY' },
        ],
        rewardCoins: 45,
        rewardFriendship: 10,
        rewardItemId: 'training_band',
      },
    ],
  },
  {
    id: 'NOA',
    name: 'Noa',
    areaId: 'NIGHT_TOWN',
    role: 'Night Walker',
    description: '밤에만 보이는 사람. 어디 사는지는 아무도 모른다.',
    avatar: '🌙',
    likes: ['moon', 'book'],
    shopId: 'NIGHT_MARKET',
    nightOnly: true,
    dialogues: [
      { text: '아직 안 잤네. 나도.' },
      { text: '밤은 조용해서 생각이 잘 정리돼.' },
      { text: '오늘 하루, 뭐 하나는 괜찮았을 거야.' },
      { text: '못 한 건 내일 몫으로 넘겨. 그래도 돼.' },
      { text: '별 보고 가. 오늘은 잘 보여.' },
      { text: '늦게까지 있지 마. 그 말 하려고 기다렸어.', minLevel: 'FRIEND' },
      { text: '너 오면 밤이 좀 덜 길어.', minLevel: 'SPECIAL_BOND' },
      { text: '오늘 하늘 봤어? 하나 떨어질지도 몰라.', eventId: 'late_night_star' },
    ],
    chains: [
      {
        id: 'noa_close',
        npcId: 'NOA',
        name: '하루 닫기',
        intro: '자기 전에 하나만 정리하고 가면 잠이 잘 와.',
        outro: '잘 자. 이건 주머니에 넣어둬.',
        steps: [
          { title: '오늘 좋았던 것 하나 적기', category: 'MIND', difficulty: 'EASY' },
          { title: '내일 할 일 하나만 정하기', category: 'MIND', difficulty: 'EASY' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'moon_keyring',
      },
      {
        id: 'noa_letter',
        npcId: 'NOA',
        name: '못 보낸 말',
        intro: '전하지 못한 말이 있으면, 오늘 보내도 괜찮아.',
        outro: '용기 냈네. 이거 받아.',
        requiresLevel: 'CLOSE_FRIEND',
        steps: [
          { title: '고맙다고 말하고 싶은 사람 떠올리기', category: 'HEART', difficulty: 'EASY' },
          { title: '짧게라도 전하기', category: 'HEART', difficulty: 'NORMAL' },
        ],
        rewardCoins: 60,
        rewardFriendship: 10,
        rewardItemId: 'star_pin',
      },
    ],
  },
]

export function findNpc(id: string): NpcDef | null {
  return NPCS.find((n) => n.id === id) ?? null
}

export function npcsInArea(areaId: string): NpcDef[] {
  return NPCS.filter((n) => n.areaId === areaId)
}

export const NPC_ID_LIST: NpcId[] = NPCS.map((n) => n.id)

// ── 친밀도 ──────────────────────────────────────────────

/** 단계가 바뀌는 지점 */
export const FRIENDSHIP_THRESHOLDS = [0, 20, 45, 75, 100] as const

export const FRIENDSHIP_LABEL: Record<FriendshipLevel, string> = {
  STRANGER: 'Stranger',
  FAMILIAR: 'Familiar',
  FRIEND: 'Friend',
  CLOSE_FRIEND: 'Close Friend',
  SPECIAL_BOND: 'Special Bond',
}

export const FRIENDSHIP_KO: Record<FriendshipLevel, string> = {
  STRANGER: '아직 서먹해',
  FAMILIAR: '얼굴은 알아',
  FRIEND: '이제 친구야',
  CLOSE_FRIEND: '꽤 가까워',
  SPECIAL_BOND: '특별한 사이',
}

export function friendshipLevel(friendship: number): FriendshipLevel {
  let level: FriendshipLevel = 'STRANGER'
  for (let i = 0; i < FRIENDSHIP_THRESHOLDS.length; i += 1) {
    if (friendship >= FRIENDSHIP_THRESHOLDS[i]) level = FRIENDSHIP_LEVELS[i]
  }
  return level
}

export function friendshipLevelIndex(level: FriendshipLevel): number {
  return FRIENDSHIP_LEVELS.indexOf(level)
}

/** 다음 단계까지 얼마나 남았는지 (0~1). 최고 단계면 1. */
export function friendshipProgress(friendship: number): number {
  const index = friendshipLevelIndex(friendshipLevel(friendship))
  if (index >= FRIENDSHIP_THRESHOLDS.length - 1) return 1

  const from = FRIENDSHIP_THRESHOLDS[index]
  const to = FRIENDSHIP_THRESHOLDS[index + 1]
  return Math.min(1, Math.max(0, (friendship - from) / (to - from)))
}

/** 친밀도 상한. 넘겨도 더 쌓이지 않는다. */
export const FRIENDSHIP_MAX = 100

/** 이 정도 친해져야 열리는 의뢰인지 */
export function meetsLevel(friendship: number, required?: FriendshipLevel): boolean {
  if (!required) return true
  return friendshipLevelIndex(friendshipLevel(friendship)) >= friendshipLevelIndex(required)
}
