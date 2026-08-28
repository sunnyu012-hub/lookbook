import type { FriendshipLevel, NpcDef, NpcId } from '@/types'
import { FRIENDSHIP_LEVELS } from '@/types'

/**
 * 도시 사람들.
 *
 * 대사는 짧고 현대 생활 말투로 쓴다. 과한 판타지 문체는 쓰지 않는다.
 * 아무도 재촉하지 않는다 — 며칠 만에 와도 "어디 갔었어" 라고 묻지 않는다.
 *
 * ── 이름은 캐릭터 바이블을 따른다 ────────────────────────
 *
 * id 는 처음 만든 그대로 두고 사람만 바꿨다. 진행 중인 저장이
 * 친밀도 · 읽은 이야기 · 비밀 장소 · 던전 입구를 전부 npc id 로 붙잡고
 * 있어서, id 를 바꾸면 하던 사람들이 그걸 통째로 잃는다.
 *
 *   MINA → 윤하루 · 31 · 카페 사장
 *   HARU → 윤태오 · 34 · 스포츠 회사원 / 러닝
 *   LULU → 오미래 · 61 · 공방 주인
 *   JUNE → 서이안 · 빈티지숍 사장
 *   RIO  → 한도윤 · 클라이밍장
 *   NOA  → 차세라 · 35 · BAR 사장
 *
 * 성격과 이야기는 `docs/direction/06_NPC_CHARACTER_BIBLE.md` 쪽이 맞다.
 * 직업이 사람을 정하지 않는다 — 여섯 다 플레이어를 만나기 전부터
 * 가족과 과거와 습관이 있었고, 대사는 그게 가끔 비치는 정도로만 쓴다.
 */

export const NPCS: NpcDef[] = [
  {
    id: 'MINA',
    name: '윤하루',
    areaId: 'CAFE_STREET',
    role: '카페 사장',
    description: '서른한 살. 사람도 취향도 잘 기억하는데 자기 이야기는 거의 안 한다.',
    avatar: '☕',
    likes: ['coffee', 'book', 'sweet'],
    shopId: 'MINA_CAFE',
    dialogues: [
      { text: '어서 와. 오늘은 창가 자리가 비었어.' },
      { text: '지난번엔 시럽 빼고 마셨지? 오늘도 그렇게 줄까.' },
      { text: '원두를 바꿔봤는데, 물어보면 다들 좋다고만 해서 잘 모르겠어.' },
      { text: '바쁜 사람들이 많이 다녀갔어. 다들 뭔가 하고 있더라.' },
      { text: '한 가지만 끝내고 가도 충분한 하루야.' },
      { text: '아침엔 조용해서 좋아. 뭐 마실래?', band: 'MORNING' },
      { text: '저녁엔 조명을 낮춰. 그게 더 편하더라.', band: 'EVENING' },
      { text: '태오는 아침마다 공원 돈대. 우리 남매인 거, 말했었나?', minLevel: 'FRIEND' },
      { text: '오늘 뭐 할지 모르겠으면, 여기 앉아서 정하고 가.', minLevel: 'FRIEND' },
      { text: '이안? 알지. 예전에 한 번… 아니다, 그 얘긴 됐어.', minLevel: 'CLOSE_FRIEND' },
      { text: '네 자리는 늘 비워둘게.', minLevel: 'CLOSE_FRIEND' },
      {
        text: '남 얘기 듣는 건 잘하는데, 내 얘기는 어디서부터 해야 할지 모르겠어.',
        minLevel: 'SPECIAL_BOND',
      },
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
        intro: '가끔은 아무것도 안 하는 시간도 필요하더라. 나는 잘 안 되지만.',
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
    name: '윤태오',
    areaId: 'GREEN_PARK',
    role: '아침에 뛰는 회사원',
    description: '서른네 살. 스포츠 회사에 다니고 아침마다 공원을 돈다. 예전엔 안 그랬다고 한다.',
    avatar: '🏃',
    likes: ['healthy', 'nature', 'sport'],
    shopId: null,
    dialogues: [
      { text: '오, 왔네. 오늘 날씨 괜찮지?' },
      { text: '한 바퀴만 돌아도 기분이 달라져.' },
      { text: '나도 매일 나오는 건 아니야. 그래도 괜찮아.' },
      { text: '벤치에 앉아 있다 가도 돼. 그것도 나온 거야.' },
      { text: '하루 종일 앉아 있다가 나오면 이게 제일 나아.' },
      { text: '아침 공기 맡으러 나온 거지? 잘했어.', band: 'MORNING' },
      { text: '해 질 때 여기가 제일 예뻐.', band: 'EVENING' },
      { text: '같이 걸을래? 말 안 해도 돼.', minLevel: 'FRIEND' },
      { text: '하루 가게 가봤어? 내 동생인데, 커피는 걔가 훨씬 잘해.', minLevel: 'FRIEND' },
      { text: '나 원래 이런 사람 아니었어. 스물아홉까지는 말도 잘 못 붙였고.', minLevel: 'CLOSE_FRIEND' },
      { text: '처음엔 생각 안 하려고 뛴 거였어. 지금은 아니고.', minLevel: 'SPECIAL_BOND' },
      { text: '네가 오면 나도 하루 시작한 것 같아.', minLevel: 'SPECIAL_BOND' },
      { text: '오늘 빛이 좋다. 사진이라도 찍어둘 걸.', eventId: 'golden_hour' },
      {
        text: '거기 오래 비어 있던 곳인데. 네가 가끔 들러주면 다시 예뻐질지도 모르겠다.',
        minGardenLevel: 1,
      },
      { text: '생각보다 꽤 잘 자라고 있네.', minGardenLevel: 2 },
      { text: '이제 진짜 네 정원 같아.', minGardenLevel: 3 },
    ],
    chains: [
      {
        id: 'haru_start',
        npcId: 'HARU',
        name: '가볍게 시작하기',
        intro: '거창하게 시작하면 오래 못 가. 나도 처음엔 십 분이었어.',
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
        intro: '사람 만나는 건 이제 쉬운데, 먼저 연락하는 건 아직도 어렵더라.',
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
    name: '오미래',
    areaId: 'CREATIVE_DISTRICT',
    role: '공방 주인',
    description: '예순한 살. 공방을 오래 했다. 오는 사람마다 밥은 먹었는지부터 묻는다.',
    avatar: '🧶',
    likes: ['art', 'collectible', 'sweet'],
    shopId: null,
    dialogues: [
      { text: '이거 봐, 어제 만든 건데 아직 마음에 안 들어.' },
      { text: '밥은 먹었어? 저기 사탕 있으니까 하나 집어 가.' },
      { text: '잘 만들려고 하면 손이 안 움직여. 일단 해.' },
      { text: '망한 것도 다 남겨둬. 나중에 쓰이더라.' },
      { text: '오늘은 아무것도 안 나왔어. 그런 날도 있지.' },
      { text: '재미없으면 그만해도 돼. 진짜로.' },
      { text: '나이 먹으니 잠이 줄어서, 밤에 손이 더 잘 가.', band: 'NIGHT' },
      { text: '너 요즘 뭐 만들어? 궁금해서.', minLevel: 'FRIEND' },
      { text: '이안? 걔 옛날부터 봤지. 아직도 밥은 안 챙겨 먹더라.', minLevel: 'FRIEND' },
      { text: '네가 만든 거 언젠가 꼭 보여줘.', minLevel: 'CLOSE_FRIEND' },
      { text: '오늘 시장 나왔어? 좋은 거 많더라.', eventId: 'tiny_flea_market' },
    ],
    chains: [
      {
        id: 'lulu_make',
        npcId: 'LULU',
        name: '아무거나 하나 만들기',
        intro: '잘 만들려고 하지 마. 오늘은 하나 끝내는 걸로 하자.',
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
    name: '서이안',
    areaId: 'CREATIVE_DISTRICT',
    role: '빈티지숍 사장',
    description: '툴툴대지만 물건도 사람도 잘 기억한다. 나이를 물으면 그냥 넘어간다.',
    avatar: '🧥',
    likes: ['collectible', 'cozy'],
    shopId: 'JUNE_CLOSET',
    dialogues: [
      { text: '천천히 봐. 아무것도 안 사도 되고.' },
      { text: '이건 누가 오래 입던 거야. 그래서 더 편해.' },
      { text: '새 물건보다 손 탄 물건이 몸에 잘 맞아.' },
      { text: '뭘 찾는지 모르겠으면 그냥 눈에 들어오는 걸로 해.' },
      { text: '지난달에 네가 만지작거리던 거, 아직 안 팔았어.' },
      { text: '문 닫기 전에 왔네. 급한 거 아니면 천천히 봐.', band: 'EVENING' },
      { text: '너한테 어울릴 것 같아서 빼놨어.', minLevel: 'FRIEND' },
      { text: '미래 어르신이 또 반찬을 들고 왔어. 나 밥 잘 먹는데.', minLevel: 'FRIEND' },
      { text: '남 얘기는 안 해. 네 얘기도 마찬가지고.', minLevel: 'CLOSE_FRIEND' },
      { text: '이 가게? 생각보다 오래 했어. 얼마나인지는 됐고.', minLevel: 'CLOSE_FRIEND' },
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
    name: '한도윤',
    areaId: 'TRAINING_ZONE',
    role: '클라이밍장 코치',
    description: '벽에 붙일 루트를 짜는 사람. 하나에 빠지면 오래 간다. 절대 몰아붙이지 않는다.',
    avatar: '🧗',
    likes: ['sport', 'healthy'],
    shopId: 'MOVE_STORE',
    dialogues: [
      { text: '왔네. 오늘은 몸이 어때?' },
      { text: '오늘 안 되면 내일 해. 벽은 도망 안 가.' },
      { text: '힘으로 당기지 말고 발부터 봐. 그게 먼저야.' },
      { text: '쉬는 날도 훈련의 일부야. 진짜로.' },
      { text: '숨이 차면 멈춰. 그게 실패가 아니야.' },
      { text: '새 루트 짜다가 밤을 샜어. 이게 재밌어서 큰일이야.' },
      { text: '아침에 하면 하루가 길어져.', band: 'MORNING' },
      { text: '너 자세 좋아졌어. 눈에 보여.', minLevel: 'FRIEND' },
      { text: '태오랑은 예전 회사에서 알던 사이야. 그땐 둘 다 지금 같지 않았고.', minLevel: 'FRIEND' },
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
          { title: '플랭크 30초', category: 'BODY', difficulty: 'EASY' },
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
    name: '차세라',
    areaId: 'NIGHT_TOWN',
    role: 'BAR 사장',
    description: '밤거리 안쪽에서 바를 한다. 밤 시장 가판도 자기 몫이다. 능숙한데 가까워지긴 어렵다.',
    avatar: '🌙',
    likes: ['moon', 'book', 'tea'],
    shopId: 'NIGHT_MARKET',
    nightOnly: true,
    dialogues: [
      { text: '아직 안 잤네. 나도.' },
      { text: '가게는 저 안쪽이야. 이 가판은 늦게 열어.' },
      { text: '밤 손님은 낮 손님이랑 아예 다른 사람이야. 같은 사람이어도 그래.' },
      { text: '오늘 하루, 뭐 하나는 괜찮았을 거야.' },
      { text: '못 한 건 내일 몫으로 넘겨. 그래도 돼.' },
      { text: '별 보고 가. 오늘은 잘 보여.' },
      { text: '늦게까지 있지 마. 그 말 하려고 기다렸어.', minLevel: 'FRIEND' },
      { text: '새로 생긴 데 있으면 알려줘. 안 가본 데를 제일 좋아해.', minLevel: 'FRIEND' },
      { text: '나는 사람을 오래 보는 걸 잘 못해. 그래서 밤에 하는 걸지도.', minLevel: 'CLOSE_FRIEND' },
      { text: '너 오면 밤이 좀 덜 길어.', minLevel: 'SPECIAL_BOND' },
      { text: '오늘 하늘 봤어? 하나 떨어질지도 몰라.', eventId: 'late_night_star' },
    ],
    chains: [
      {
        id: 'noa_close',
        npcId: 'NOA',
        name: '하루 닫기',
        intro: '자기 전에 하나만 정리하고 가면 잠이 잘 와. 나는 그게 일이라 매일 하고.',
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
        intro: '전하지 못한 말이 있으면, 오늘 보내도 괜찮아. 나는 늦게 배웠거든.',
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
  STRANGER: '아직 서먹',
  FAMILIAR: '얼굴 아는 사이',
  FRIEND: '친구',
  CLOSE_FRIEND: '가까운 친구',
  SPECIAL_BOND: '특별한 사이',
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
