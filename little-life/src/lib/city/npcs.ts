import type { FriendshipLevel, GiftTag, NpcDef, NpcId } from '@/types'
import { ITEMS } from '@/lib/rpg/content'
import { KITCHEN_RECIPES } from '@/lib/kitchen/recipes'
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
 *   RIO  → 한도윤 · 33 · 클라이밍짐 코치
 *   NOA  → 차세라 · 35 · BAR 사장
 *
 * 뒤에 붙은 열여덟은 처음부터 이름이 확정돼 있어서 id 가 곧 이름이다.
 *
 * 성격과 이야기는 `docs/direction/06_NPC_CHARACTER_BIBLE.md` 쪽이 맞다.
 * 직업이 사람을 정하지 않는다 — 스물넷 다 플레이어를 만나기 전부터
 * 가족과 과거와 습관이 있었고, 대사는 그게 가끔 비치는 정도로만 쓴다.
 *
 * ── 퀘스트 자판기가 아니다 ──────────────────────────────
 *
 * 한 사람이 의뢰를 하나만 가진 건 일부러다. 스물넷이 두세 개씩 들고
 * 있으면 도시가 할 일 목록이 된다. 대사와 하루 동선이 먼저고,
 * 의뢰는 그 사람을 한 번 더 만날 이유 정도로만 둔다.
 */

export const NPCS: NpcDef[] = [
  {
    id: 'MINA',
    name: '윤하루',
    areaId: 'CAFE_STREET',
    role: '카페 사장',
    description: '서른한 살. 사람도 취향도 잘 기억하는데 자기 이야기는 거의 안 한다.',
    avatar: '☕',
    likes: ['cozy', 'sweet', 'book'],
    loves: ['favorite_mug', 'food_strawberry_toast'],
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
    loves: ['morning_sneakers', 'food_picnic_lunchbox'],
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
    loves: ['spare_button', 'food_pumpkin_tart'],
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
    loves: ['vintage_ribbon', 'spare_button'],
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
    role: '클라이밍짐 코치',
    description: '서른세 살. 짐을 보고 루트를 짠다. 재촉하지 않고 감이 올 때까지 기다려준다.',
    avatar: '🧗',
    likes: ['sport', 'healthy'],
    loves: ['training_band', 'food_tomato_pasta'],
    shopId: 'MOVE_STORE',
    // 혼자 존댓말을 쓴다. 코치라서 그런 것도 있지만 원래 말이 짧고 담백한 사람이다.
    // 친해져도 말을 놓지 않는다 — 대신 좋아하는 얘기가 나오면 말이 조금 길어진다.
    dialogues: [
      { text: '왔네요. 오늘 몸은 좀 어때요?' },
      { text: '힘으로 안 당겨도 돼요. 발부터 한번 바꿔봐요.' },
      { text: '한 번만 더 해봐요. 아까 거의 됐는데.' },
      { text: '오늘 안 되면 내일 해요. 벽은 안 도망가요.' },
      { text: '쉬는 날도 훈련이에요. 진짜로.' },
      { text: '숨 차면 멈춰요. 그건 실패가 아니에요.' },
      { text: '안 되던 게 어느 날 그냥 돼요. 그게 재밌어서 오래 하는 거고요.' },
      { text: '아침에 하면 하루가 길어져요.', band: 'MORNING' },
      { text: '자세 좋아졌어요. 눈에 보여요.', minLevel: 'FRIEND' },
      {
        text: '시우 씨요? 처음엔 금방 질릴 줄 알았죠. 요즘은 나보다 더 자주 와요.',
        minLevel: 'FRIEND',
      },
      { text: '태오는 원래 저렇진 않았어요. …그 얘기는 본인한테 물어봐요.', minLevel: 'FRIEND' },
      { text: '이제 내가 안 봐줘도 되겠는데요.', minLevel: 'CLOSE_FRIEND' },
      {
        text: '어제 새 루트 보다가 시간 다 갔어요. 쉬는 날에 뭐 하냐고 물으면 할 말이 없네요.',
        minLevel: 'CLOSE_FRIEND',
      },
    ],
    chains: [
      {
        id: 'rio_basic',
        npcId: 'RIO',
        name: '기초 한 세트',
        intro: '딱 한 세트만 해요. 그 이상은 오늘 안 시켜요.',
        outro: '좋아요. 이거 신고 다녀요.',
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
    loves: ['night_ticket', 'food_lavender_tea'],
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
  // ── 카페 거리 ────────────────────────────────────────
  {
    id: 'EUNCHAE',
    name: '고은채',
    areaId: 'CAFE_STREET',
    role: '꽃집 사장',
    description: '서른두 살. 조용해 보이는데 성질은 급한 편이다. 꽃보다 사람 말을 더 빨리 자른다.',
    avatar: '🌷',
    likes: ['nature', 'cozy'],
    loves: ['flower_bookmark', 'green_charm'],
    shopId: null,
    dialogues: [
      { text: '오늘 들어온 건 저쪽. 물만 갈아주면 오래 가.' },
      { text: '꽃은 오래 못 봐. 그래서 좋은 거야.' },
      { text: '누구 주려고 사는 거 아니어도 돼. 나도 내 가게 꽃 사.' },
      { text: '시들면 미련 없이 버려. 그게 안 되는 사람이 많더라.' },
      { text: '포장 안 해도 되지? 그냥 들고 가는 게 더 예뻐.' },
      { text: '아침에 물 주고 나면 하루가 시작돼.', band: 'MORNING' },
      { text: '문 닫기 전엔 남은 걸 싸게 넘겨. 어차피 내일은 안 예뻐.', band: 'EVENING' },
      { text: '시우? 어릴 때부터 알았지. 요즘은 뭐 하고 사는지 몰라.', minLevel: 'FRIEND' },
      { text: '나 사실 말이 빨라. 못됐다는 소리도 들어봤고.', minLevel: 'CLOSE_FRIEND' },
      {
        text: '오래 알았다고 지금도 가까운 건 아니더라. 그거 알기까지 오래 걸렸어.',
        minLevel: 'SPECIAL_BOND',
      },
    ],
    chains: [
      {
        id: 'eunchae_water',
        npcId: 'EUNCHAE',
        name: '물 주는 일',
        intro: '뭐 하나 키워봐. 죽여도 돼. 나도 많이 죽였어.',
        outro: '봐, 사흘 하면 그다음은 저절로 해. 이거 가져가.',
        steps: [
          { title: '집에 있는 식물이나 화분 살펴보기', category: 'LIFE', difficulty: 'EASY' },
          { title: '물 주고 자리 한 번 옮겨주기', category: 'LIFE', difficulty: 'EASY' },
        ],
        rewardCoins: 35,
        rewardFriendship: 10,
        rewardItemId: 'flower_bookmark',
      },
    ],
  },
  {
    id: 'MINJI',
    name: '서민지',
    areaId: 'CAFE_STREET',
    role: '편의점 오전',
    description: '마흔두 살. 동네 사정을 많이 아는데 입은 무겁다. 아이 엄마이자 오래된 락 팬.',
    avatar: '🏪',
    likes: ['cozy', 'collectible', 'sweet'],
    loves: ['vintage_ribbon', 'cozy_scarf'],
    shopId: null,
    dialogues: [
      { text: '어서 와요. 오늘 뭐 찾아요?' },
      { text: '이 시간엔 손님이 뜸해서 좋아요.' },
      { text: '동네 얘기는 많이 듣는데, 옮기지는 않아요.' },
      { text: '애 학교 보내고 나면 여기가 제일 조용해.' },
      { text: '카드요, 현금이요? 요즘은 다들 폰이지만.' },
      { text: '아침 삼각김밥은 일곱 시에 들어와요.', band: 'MORNING' },
      { text: '나도 예전엔 공연 보러 다녔어요. 지금도 가끔 가고.', minLevel: 'FRIEND' },
      { text: '엄마 되기 전의 나도 아직 여기 있어요. 없어진 게 아니라.', minLevel: 'CLOSE_FRIEND' },
      { text: '아는 얼굴을 알아봐도 모른 척할 때가 있어요. 그게 예의일 때가 있더라고.', minLevel: 'SPECIAL_BOND' },
    ],
    chains: [
      {
        id: 'minji_stock',
        npcId: 'MINJI',
        name: '떨어진 것 채우기',
        intro: '집에 뭐 떨어진 거 없어요? 그거 하나 때문에 하루가 꼬이잖아.',
        outro: '이제 며칠은 편할 거예요. 이거 하나 챙겨 가요.',
        steps: [
          { title: '떨어진 생필품 하나 적어두기', category: 'LIFE', difficulty: 'EASY' },
          { title: '나간 김에 사 오기', category: 'LIFE', difficulty: 'EASY' },
        ],
        rewardCoins: 30,
        rewardFriendship: 10,
        rewardItemId: 'spare_button',
      },
    ],
  },
  {
    id: 'JUN',
    name: '박준',
    areaId: 'CAFE_STREET',
    role: '편의점 오후 · 휴학생',
    description: '스물네 살. 눈을 잘 안 마주친다. 어딘가에서는 아주 유명한 것 같기도 하다.',
    avatar: '🎮',
    likes: ['collectible', 'sweet'],
    loves: ['lucky_cat_sticker', 'tiny_sketchbook'],
    shopId: null,
    dialogues: [
      { text: '...아, 네. 봉투 필요하세요?' },
      { text: '(고개만 까딱한다)' },
      { text: '그건... 저쪽 아래 칸에 있어요.' },
      { text: '봉투 오 원이에요.' },
      { text: '...데워 드릴까요?' },
      { text: '밤에 하는 게 더 잘 돼요. 뭐든.', band: 'NIGHT' },
      { text: '어제 그거 봤어요? 아, 아니에요. 됐어요.', minLevel: 'FAMILIAR' },
      { text: '온라인에서는 말 잘해요. 진짜예요. 아무도 안 믿지만.', minLevel: 'FRIEND' },
      { text: '아는 사람이 제 그림을 좋아한대요. 제 건 줄은 모르고.', minLevel: 'CLOSE_FRIEND' },
      { text: '여기서는 아무도 저를 몰라요. 그게 편할 때도 있고 아닐 때도 있고.', minLevel: 'SPECIAL_BOND' },
    ],
    chains: [
      {
        id: 'jun_one_line',
        npcId: 'JUN',
        name: '한 줄만 말 걸기',
        intro: '...저 말고요. 누구든요. 저는 그게 제일 어려워서.',
        outro: '했어요? 대단하다. 이거 드릴게요. 원래 제 거였는데.',
        steps: [
          { title: '오늘 만난 사람에게 한마디 먼저 걸기', category: 'HEART', difficulty: 'EASY' },
          { title: '오래 미룬 답장 하나 보내기', category: 'HEART', difficulty: 'NORMAL' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'lucky_cat_sticker',
      },
    ],
  },
  {
    id: 'HYUNWOO',
    name: '조현우',
    areaId: 'CAFE_STREET',
    role: '약사',
    description: '마흔여섯 살. 진지해 보이는데 아재개그를 참지 못한다. 남 일에 관심 없다면서 다 알고 있다.',
    avatar: '💊',
    likes: ['healthy', 'tea', 'cozy'],
    loves: ['lucky_cat_sticker', 'food_carrot_soup'],
    shopId: null,
    dialogues: [
      { text: '어디 아파서 온 건 아니죠? 그럼 됐어요.' },
      { text: '약보다 잠이에요. 이건 진짜예요.' },
      { text: '물 많이 드세요. 다들 그 말 흘려듣던데.' },
      { text: '약사도 감기 걸려요. 억울하죠.' },
      { text: '처방전 없으면 이쪽에서 골라야 해요. 봐드릴게요.' },
      { text: '이 시간에 오는 사람들은 대개 밤을 샜더라고요.', band: 'MORNING' },
      { text: '남 일은 관심 없어요. …그 집 이사 간다면서요?', minLevel: 'FRIEND' },
      { text: '요즘 안색이 낫네요. 뭐 바꿨어요?', minLevel: 'CLOSE_FRIEND' },
    ],
    chains: [
      {
        id: 'hyunwoo_walk',
        npcId: 'HYUNWOO',
        name: '약보다 먼저 할 것',
        intro: '약 드리기 전에 이거부터 해봐요. 순서가 그래요.',
        outro: '거봐요. 이게 제일 잘 들어요.',
        steps: [
          { title: '물 두 컵 마시기', category: 'BODY', difficulty: 'EASY' },
          { title: '동네 한 바퀴 걷기', category: 'BODY', difficulty: 'EASY' },
        ],
        rewardCoins: 35,
        rewardFriendship: 10,
        rewardItemId: 'daily_sneakers',
      },
    ],
  },
  {
    id: 'HARIN',
    name: '이하린',
    areaId: 'CAFE_STREET',
    role: '대학원생',
    description: '스물다섯 살. 늘 피곤하다. 노트북과 커피 사이에 앉아 있는 시간이 제일 길다.',
    avatar: '📓',
    likes: ['book', 'coffee'],
    loves: ['focus_coffee', 'food_strawberry_toast'],
    shopId: null,
    dialogues: [
      { text: '이 자리 콘센트 있어서요. 그것 때문에 여기 와요.' },
      { text: '오늘 안에 한 챕터는 끝내야 하는데.' },
      { text: '집에서는 못 해요. 침대가 이겨요.' },
      { text: '커피 한 잔으로 세 시간 버텨요. 좀 죄송하죠.' },
      { text: '논문은 원래 안 읽혀요. 저만 그런 게 아니래요.' },
      { text: '새벽이 제일 잘 돼요. 다음 날이 망하지만.', band: 'NIGHT' },
      { text: '이안 씨요? 그분은… 아는 게 좀 많으세요.', minLevel: 'FRIEND' },
      { text: '집안이 좀 특이해요. 설명하려면 길고요.', minLevel: 'CLOSE_FRIEND' },
      {
        text: '남들처럼 사는 게 제일 어려워요. 그건 아무도 안 가르쳐주더라고요.',
        minLevel: 'SPECIAL_BOND',
      },
    ],
    chains: [
      {
        id: 'harin_chapter',
        npcId: 'HARIN',
        name: '한 챕터만',
        intro: '같이 앉아 있을래요? 각자 거 하면서요. 그게 은근 되더라고요.',
        outro: '오늘 치는 했어요. 이거 쓰세요, 저 하나 더 있어요.',
        steps: [
          { title: '제일 미룬 일 25분만 하기', category: 'WORK', difficulty: 'NORMAL' },
          { title: '끝내고 자리 정리하기', category: 'LIFE', difficulty: 'EASY' },
        ],
        rewardCoins: 45,
        rewardFriendship: 10,
        rewardItemId: 'favorite_mug',
      },
    ],
  },
  // ── 창작 골목 ────────────────────────────────────────
  {
    id: 'JAEHUI',
    name: '김재희',
    areaId: 'CREATIVE_DISTRICT',
    role: '독립서점 사장',
    description: '서른아홉 살. 자기 리듬을 지키는 사람. 평범한 하루를 제일 좋아한다.',
    avatar: '📚',
    likes: ['book', 'tea'],
    loves: ['flower_bookmark', 'food_lavender_tea'],
    shopId: null,
    dialogues: [
      { text: '천천히 봐요. 다 읽고 안 사도 되고.' },
      { text: '요즘은 얇은 책이 잘 나가요. 다들 시간이 없나 봐요.' },
      { text: '오늘 아무 일도 없었어요. 그게 좋은 하루죠.' },
      { text: '주문한 책은 목요일에 들어와요.' },
      { text: '읽고 싶은 게 없으면 표지로 골라도 돼요. 그것도 이유예요.' },
      { text: '문 열고 커피 내리고 책 정리하고. 매일 같아요. 지겹지 않아요.', band: 'MORNING' },
      { text: '라온이랑 작업하면 꼭 싸워요. 결과는 좋고요.', minLevel: 'FRIEND' },
      { text: '한때는 다르게 살았어요. 지금이 훨씬 나아요.', minLevel: 'CLOSE_FRIEND' },
      { text: '세라랑은 여전히 잘 지내요. 같이 살 수 없었을 뿐이지.', minLevel: 'SPECIAL_BOND' },
    ],
    chains: [
      {
        id: 'jaehui_page',
        npcId: 'JAEHUI',
        name: '열 쪽만',
        intro: '다 읽으려니까 못 읽는 거예요. 열 쪽만 읽어요.',
        outro: '거봐요, 읽히죠. 이거 두르고 가요. 오늘 춥대요.',
        steps: [
          { title: '읽던 책 열 쪽 읽기', category: 'MIND', difficulty: 'EASY' },
          { title: '읽은 데까지 표시해두기', category: 'MIND', difficulty: 'EASY' },
        ],
        rewardCoins: 35,
        rewardFriendship: 10,
        rewardItemId: 'cozy_scarf',
      },
    ],
  },
  {
    id: 'RAON',
    name: '최라온',
    areaId: 'CREATIVE_DISTRICT',
    role: '사진가',
    description: '스물일곱 살. 질문이 많다. 남은 잘 찍는데 자기 사진은 한 장도 없다.',
    avatar: '📷',
    likes: ['art', 'collectible'],
    loves: ['tiny_sketchbook', 'night_ticket'],
    shopId: null,
    dialogues: [
      { text: '아, 잠깐만요. 지금 빛 좋은데.' },
      { text: '한 장만 찍어도 돼요? 얼굴 안 나오게 할게요.' },
      { text: '요즘 뭐 해요? 진짜로 궁금해서 묻는 거예요.' },
      { text: '내 사진은 안 찍어요. 그건 좀 그래요.' },
      { text: '이 골목 빛이 이상해요. 좋은 쪽으로요.' },
      { text: '해 지기 십 분 전이 제일 좋아요. 매일 십 분뿐이에요.', band: 'EVENING' },
      { text: '재희 씨 서점도 찍고 세라 씨 바도 찍고. 다들 다른 얼굴이에요.', minLevel: 'FRIEND' },
      {
        text: '남 사는 건 잘 들여다보는데 내가 어디로 가는지는 잘 모르겠어요.',
        minLevel: 'CLOSE_FRIEND',
      },
    ],
    chains: [
      {
        id: 'raon_one_shot',
        npcId: 'RAON',
        name: '오늘 한 장',
        intro: '오늘 뭐 하나 찍어봐요. 잘 찍을 필요 없어요, 진짜로.',
        outro: '좋다. 이거 들고 다녀요, 손 비니까 더 잘 찍혀요.',
        steps: [
          { title: '오늘 눈에 들어온 것 하나 찍기', category: 'PLAY', difficulty: 'EASY' },
          { title: '한 장 골라서 남겨두기', category: 'PLAY', difficulty: 'EASY' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'adventure_tote',
      },
    ],
  },
  {
    id: 'JIHO',
    name: '남지호',
    areaId: 'CREATIVE_DISTRICT',
    role: '레코드숍 직원',
    description: '서른 살. 평소엔 기운이 없다가 음악 얘기만 나오면 다른 사람이 된다.',
    avatar: '🎧',
    likes: ['art', 'collectible'],
    loves: ['vintage_ribbon', 'spare_button'],
    shopId: null,
    dialogues: [
      { text: '아 네... 편하게 보세요.' },
      { text: '지금 틀어놓은 거요? 이거 좋죠. 이거 좋아요.' },
      { text: '요즘 뭐 들어요? 아무거나 말해봐요.' },
      { text: '이 판은 이 곡 하나 때문에 사는 거예요. 그럴 만해요.' },
      { text: '틀어볼래요? 헤드폰 저쪽에 있어요.' },
      { text: '밤에 듣는 거랑 낮에 듣는 거랑 완전히 달라요.', band: 'NIGHT' },
      { text: '민지 씨랑 락페 갔다 왔어요. 목이 아직도 쉬었어요.', minLevel: 'FRIEND' },
      {
        text: '해체한 밴드가 하나 있는데요, 아직도 그거 들어요. 다시 안 나오겠죠.',
        minLevel: 'CLOSE_FRIEND',
      },
    ],
    chains: [
      {
        id: 'jiho_one_song',
        npcId: 'JIHO',
        name: '한 곡 끝까지',
        intro: '요즘 노래를 끝까지 안 듣잖아요. 한 곡만 그렇게 해봐요.',
        outro: '어땠어요? …아 됐어요, 표정 보니까 알겠다. 이거 쓰세요.',
        steps: [
          { title: '좋아하는 노래 한 곡 끝까지 듣기', category: 'PLAY', difficulty: 'EASY' },
          { title: '오늘 들은 것 중 하나 저장해두기', category: 'PLAY', difficulty: 'EASY' },
        ],
        rewardCoins: 35,
        rewardFriendship: 10,
        rewardItemId: 'noise_cancelling_headphones',
      },
    ],
  },

  // ── 초록 공원 ────────────────────────────────────────
  {
    id: 'WOOSIK',
    name: '장우식',
    areaId: 'GREEN_PARK',
    role: '공원 관리인',
    description: '쉰여덟 살. 말은 없는데 길고양이 이름은 다 안다. 이 도시가 달랐을 때를 기억한다.',
    avatar: '🧢',
    likes: ['nature', 'tea'],
    loves: ['lucky_cat_sticker', 'food_carrot_soup'],
    shopId: null,
    dialogues: [
      { text: '어. 왔나.' },
      { text: '저쪽 벤치 칠했으니까 앉지 마.' },
      { text: '노랑이는 아침에만 와. 검둥이는 아무 때나 오고.' },
      { text: '나무는 심는 것보다 그냥 두는 게 어려워.' },
      { text: '쓰레기는 저기다 버려. 여기 말고.' },
      { text: '해 뜨기 전이 제일 조용해. 나만 아는 건 아니겠지만.', band: 'MORNING' },
      { text: '저 바깥쪽 길? 옛날엔 저기까지 다 돌밭이었어.', minLevel: 'FRIEND' },
      { text: '여기 오래 있었지. 사람은 바뀌는데 나무는 그대로야.', minLevel: 'CLOSE_FRIEND' },
      { text: '해인이가 요즘 이상하다고 하더라고. 잎 색이 안 맞는다나.', minLevel: 'CLOSE_FRIEND' },
    ],
    chains: [
      {
        id: 'woosik_bench',
        npcId: 'WOOSIK',
        name: '앉았다 가는 일',
        intro: '바쁜 건 알겠는데. 십 분만 앉았다 가.',
        outro: '그래. 그거면 됐어. 이거 쓰고 다녀, 해 세다.',
        steps: [
          { title: '밖에서 10분 그냥 앉아 있기', category: 'MIND', difficulty: 'EASY' },
          { title: '눈에 들어온 것 하나 기억해두기', category: 'MIND', difficulty: 'EASY' },
        ],
        rewardCoins: 30,
        rewardFriendship: 10,
        rewardItemId: 'soft_cap',
      },
    ],
  },
  {
    id: 'HAEIN',
    name: '문해인',
    areaId: 'GREEN_PARK',
    role: '식물가게',
    description: '서른여덟 살. 사람이 싫어서가 아니라 혼자가 편한 사람. 잎 색 바뀌는 건 누구보다 빨리 안다.',
    avatar: '🪴',
    likes: ['nature', 'tea'],
    loves: ['green_charm', 'food_herb_potato_soup'],
    shopId: null,
    dialogues: [
      { text: '물 주는 날 아니에요. 오늘은 그냥 보기만.' },
      { text: '죽는 건 물을 안 줘서가 아니라 너무 줘서예요. 대개는.' },
      { text: '말 안 걸어도 돼요. 저도 안 걸게요.' },
      { text: '이 잎 색이 지난주랑 달라요. 이상하죠.' },
      { text: '흙 한번 만져봐요. 마르면 그때 주면 돼요.' },
      { text: '밤에 잎이 접히는 애가 있어요. 보면 좀 기특해요.', band: 'NIGHT' },
      { text: '우식 아저씨가 가끔 흙을 갖다줘요. 좋은 흙이에요.', minLevel: 'FRIEND' },
      { text: '혼자 있는 게 좋은 거랑 외로운 건 달라요. 저는 앞쪽이에요.', minLevel: 'CLOSE_FRIEND' },
    ],
    chains: [
      {
        id: 'haein_alone',
        npcId: 'HAEIN',
        name: '혼자 있는 시간',
        intro: '혼자 있는 시간 있어요? 없으면 하나 만들어봐요.',
        outro: '그거면 돼요. 이거 입어요, 저녁에 추워요.',
        steps: [
          { title: '30분 동안 아무한테도 연락 안 하기', category: 'MIND', difficulty: 'EASY' },
          { title: '그 시간에 하고 싶던 것 하나 하기', category: 'PLAY', difficulty: 'EASY' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'cozy_hoodie',
      },
    ],
  },
  {
    id: 'SUA',
    name: '배수아',
    areaId: 'GREEN_PARK',
    role: '대학생',
    description: '스물한 살. 사람 이름을 다 기억한다. 혼자 있는 시간만 어려워한다.',
    avatar: '🎒',
    likes: ['sweet', 'coffee'],
    loves: ['tiny_hair_clip', 'food_strawberry_milk'],
    shopId: null,
    dialogues: [
      { text: '어! 안녕하세요! 저 기억하시죠?' },
      { text: '오늘 뭐 해요? 저 지금 시간 완전 많은데.' },
      { text: '아까 저기서 누구 봤는데 이름이 기억이 안 나요. 그럴 리가 없는데.' },
      { text: '같이 걸을래요? 어디 가는지는 안 정해도 돼요.' },
      { text: '아 맞다, 이거 보여드리려고 했는데.' },
      { text: '이 시간엔 다들 집에 있잖아요. 저는 그게 좀 그래요.', band: 'NIGHT' },
      { text: '하린 언니 따라다니는 거 맞아요. 언니는 기가 빨린대요.', minLevel: 'FRIEND' },
      {
        text: '기숙사에서 혼자 남는 밤이 있어요. 그때는 저도 저 아닌 것 같아요.',
        minLevel: 'CLOSE_FRIEND',
      },
    ],
    chains: [
      {
        id: 'sua_alone_night',
        npcId: 'SUA',
        name: '혼자서도 되는 것',
        intro: '혼자 뭐 하는 거 잘해요? 저 좀 알려줘요, 진짜로.',
        outro: '어땠어요? 저도 해볼게요. 이거 하세요, 저 많아요.',
        steps: [
          { title: '혼자 할 수 있는 것 하나 정하기', category: 'MIND', difficulty: 'EASY' },
          { title: '그거 30분 해보기', category: 'PLAY', difficulty: 'NORMAL' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'tiny_hair_clip',
      },
    ],
  },
  {
    id: 'SUNJAE',
    name: '류선재',
    areaId: 'GREEN_PARK',
    role: '프리랜서 번역가',
    description: '서른세 살. 반듯해 보이는데 집에는 모아둔 게 산더미다. 오래된 글자를 읽을 줄 안다.',
    avatar: '📖',
    likes: ['book', 'collectible'],
    loves: ['star_fragment', 'tiny_sketchbook'],
    shopId: null,
    dialogues: [
      { text: '마감이라 나왔어요. 집에 있으면 더 안 돼서.' },
      { text: '이 단어는 우리말에 없어요. 그래서 재밌는 거고요.' },
      { text: '모으는 거요? 남들이 보면 좀 그래요.' },
      { text: '산책은 일이에요. 걸으면서 문장이 풀려요.' },
      { text: '안 풀리면 그냥 걸어요. 그게 제일 빨라요.' },
      { text: '밤에 하면 빨라요. 대신 다음 날이 없어지고요.', band: 'NIGHT' },
      { text: '준이랑은 동호회에서 만났어요. 그쪽 얘기는 안 할게요.', minLevel: 'FRIEND' },
      {
        text: '오래된 글자도 좀 읽어요. 할머니한테 배웠어요. 이상하죠.',
        minLevel: 'CLOSE_FRIEND',
      },
      { text: '아는 걸 다 말하지는 않아요. 굳이 판을 흔들 이유가 없어서.', minLevel: 'SPECIAL_BOND' },
    ],
    chains: [
      {
        id: 'sunjae_deadline',
        npcId: 'SUNJAE',
        name: '마감 앞에서',
        intro: '미룬 거 하나 있죠? 있는 표정인데.',
        outro: '끝냈네요. 이거 쓰세요, 저는 두 개 있어요.',
        steps: [
          { title: '미룬 일 하나 골라서 30분 하기', category: 'WORK', difficulty: 'NORMAL' },
          { title: '오늘 한 데까지 적어두기', category: 'WORK', difficulty: 'EASY' },
        ],
        rewardCoins: 45,
        rewardFriendship: 10,
        rewardItemId: 'perfect_work_headset',
      },
    ],
  },
  {
    id: 'YEONJU',
    name: '강연주',
    areaId: 'GREEN_PARK',
    role: '부동산 중개사',
    description: '쉰두 살. 동네 일은 다 안다. 말하기를 좋아하지만 옮길 말과 아닌 말은 가린다.',
    avatar: '🏡',
    likes: ['coffee', 'sweet', 'collectible'],
    loves: ['night_ticket', 'food_pumpkin_tart'],
    shopId: null,
    dialogues: [
      { text: '어유, 오랜만이네. 밥은 먹었고?' },
      { text: '저 골목 집 나왔어. 볕이 좋아, 그 집은.' },
      { text: '이 동네 십오 년 봤어. 사람이 오고 가는 것도 다 봤고.' },
      { text: '말은 많이 하는데, 할 말 못 할 말은 가려. 그게 오래 하는 비결이야.' },
      { text: '요즘은 매물이 잘 안 나와. 다들 그것부터 묻더라.' },
      { text: '아침엔 손님이 안 와. 커피 마시러 나온 거지 뭐.', band: 'MORNING' },
      { text: '현우 약사랑 민지 엄마랑은 한 동네 살아. 다 알지.', minLevel: 'FRIEND' },
      { text: '남 얘기 좋아하지. 그렇다고 사람을 함부로 버리지는 않아.', minLevel: 'CLOSE_FRIEND' },
    ],
    chains: [
      {
        id: 'yeonju_corner',
        npcId: 'YEONJU',
        name: '한 칸 치우기',
        intro: '집이 넓어지는 방법 알려줄까? 이사 말고.',
        outro: '거봐, 넓어졌지? 이거 달고 다녀. 열쇠 잘 잃어버리잖아.',
        steps: [
          { title: '한 칸 정해서 비우기', category: 'LIFE', difficulty: 'NORMAL' },
          { title: '버릴 것 내놓기', category: 'LIFE', difficulty: 'EASY' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'lucky_keyring',
      },
    ],
  },
  // ── 운동 구역 ────────────────────────────────────────
  {
    id: 'YUNA',
    name: '신유나',
    areaId: 'TRAINING_ZONE',
    role: '필라테스 강사',
    description: '서른여섯 살. 여기서는 빈틈이 없다. 집에서는 아마 아닐 것이다.',
    avatar: '🧘',
    likes: ['healthy', 'sport'],
    loves: ['training_band', 'food_carrot_soup'],
    shopId: null,
    dialogues: [
      { text: '어깨 내려요. 지금 올라가 있어요.' },
      { text: '숨을 참으면서 하는 사람이 제일 많아요. 내쉬면서 해요.' },
      { text: '많이 하는 것보다 정확히 하는 게 빨라요.' },
      { text: '거울 보라고 있는 거예요. 부끄러워할 거 없어요.' },
      { text: '수업 십 분 전에 와요. 몸이 좀 데워져야 해서.' },
      { text: '아침 수업이 제일 조용해요. 다들 말할 힘이 없어서.', band: 'MORNING' },
      { text: '집에서는 저도 늘어져 있어요. 아무한테도 말 안 했지만.', minLevel: 'FRIEND' },
      {
        text: '잘하는 사람도 누구 하나쯤 부러워해요. 저도 그래요, 좀 이상한 쪽으로.',
        minLevel: 'CLOSE_FRIEND',
      },
    ],
    chains: [
      {
        id: 'yuna_form',
        npcId: 'YUNA',
        name: '자세부터',
        intro: '오늘은 힘 빼고 자세만 봐요. 그게 다예요.',
        outro: '좋아요. 이거 신어봐요, 발이 편하면 자세가 따라와요.',
        steps: [
          { title: '앉은 자세 한 번 고쳐 앉기', category: 'BODY', difficulty: 'EASY' },
          { title: '10분 스트레칭', category: 'BODY', difficulty: 'EASY' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'lucky_sneakers',
      },
    ],
  },

  // ── 밤의 거리 ────────────────────────────────────────
  {
    id: 'SIWOO',
    name: '정시우',
    areaId: 'NIGHT_TOWN',
    role: '타코야끼 푸드트럭',
    description: '서른두 살. 농담이 많고 느긋하다. 예전 얘기는 잘 안 하지만 부끄러워하지도 않는다.',
    avatar: '🐙',
    likes: ['art', 'collectible', 'sweet'],
    loves: ['vintage_ribbon', 'training_band'],
    shopId: null,
    dialogues: [
      /*
       * 이야기를 끝까지 읽은 사람에게만 들리는 두 줄 (K).
       * 스물넷 중 시우에게만 있다 — 시범이라 여기서 멈춘다.
       */
      { text: '요즘도 가끔 들어요. 예전에 하던 것들.', afterChapterId: 'SIWOO_6' },
      { text: '그 얘기 하고 나니까 좀 이상하네요. 나쁜 쪽은 아니고.', afterChapterId: 'SIWOO_6' },
      { text: '어서 와요. 여섯 개? 열두 개?' },
      { text: '오늘 반죽이 잘 됐어요. 이런 날은 나도 기분이 좋아.' },
      { text: '천천히 드세요. 안에 뜨거워요. 진짜예요.' },
      { text: '트럭이 좋아요. 오늘 여기, 내일 저기.' },
      { text: '소스 다 뿌릴까요? 가쓰오부시도?' },
      { text: '아홉 시 넘으면 줄 서요. 지금이 딱 좋아요.', band: 'EVENING' },
      { text: '요즘 아침마다 벽 타요. 도윤 씨가 한번 해보래서 시작했는데 큰일 났어요.', minLevel: 'FRIEND' },
      { text: '예전에 밴드 했어요. 지금은 안 해요. 실패한 건 아니고요.', minLevel: 'CLOSE_FRIEND' },
      { text: '은채한테는 그때 말을 못 했어요. 그게 아직 걸려요.', minLevel: 'SPECIAL_BOND' },
    ],
    chains: [
      {
        id: 'siwoo_today_good',
        npcId: 'SIWOO',
        name: '오늘 잘 된 것',
        intro: '오늘 잘 된 거 하나 있어요? 반죽 같은 거요, 사소한 거.',
        outro: '그거면 오늘은 성공이에요. 이거 하나 서비스.',
        steps: [
          { title: '오늘 잘 된 것 하나 떠올리기', category: 'MIND', difficulty: 'EASY' },
          { title: '누구한테든 그 얘기 하기', category: 'HEART', difficulty: 'EASY' },
        ],
        rewardCoins: 35,
        rewardFriendship: 10,
        rewardItemId: 'small_dessert',
      },
    ],
  },
  {
    id: 'SORA',
    name: '임소라',
    areaId: 'NIGHT_TOWN',
    role: '심야영화관 직원',
    description: '스물여덟 살. 늘 웃는다. 커피가 늘어나는 날이 있는데 그날도 웃는다.',
    avatar: '🎬',
    likes: ['sweet', 'cozy', 'moon'],
    loves: ['night_ticket', 'cozy_scarf'],
    shopId: null,
    dialogues: [
      { text: '어서 오세요! 오늘 마지막 회차 자리 많아요.' },
      { text: '괜찮아요 괜찮아요. 진짜 괜찮아요.' },
      { text: '이거 벌써 네 잔째예요. 오늘은 좀 그런 날이라.' },
      { text: '팝콘은 옆에서 사셔야 해요. 저희는 표만 팔아요.' },
      { text: '자막 있는 거 좋아하세요? 그럼 3관이요.' },
      { text: '심야 손님들은 조용해서 좋아요. 다들 지쳐서 오시거든요.', band: 'NIGHT' },
      { text: '정원이랑은 대학 때 룸메였어요. 걔는 담배, 저는 커피. 서로 뭐라 해요.', minLevel: 'FRIEND' },
      { text: '불편하면 더 웃게 돼요. 고치려고 하는데 잘 안 돼요.', minLevel: 'CLOSE_FRIEND' },
      { text: '한 번쯤은 그냥 화내도 되는 거였는데. 그걸 이제 알았어요.', minLevel: 'SPECIAL_BOND' },
    ],
    chains: [
      {
        id: 'sora_say_no',
        npcId: 'SORA',
        name: '싫다고 말하기',
        intro: '오늘 하기 싫은 거 있죠? 그거 하나만 미뤄봐요. 저는 못 해서요.',
        outro: '와, 진짜 했어요? 이거 가져가요. 심야 회차 표예요.',
        steps: [
          { title: '오늘 안 해도 되는 일 하나 빼기', category: 'MIND', difficulty: 'EASY' },
          { title: '그 시간에 쉬기', category: 'MIND', difficulty: 'EASY' },
        ],
        rewardCoins: 40,
        rewardFriendship: 10,
        rewardItemId: 'night_ticket',
      },
    ],
  },
  {
    id: 'JEONGWON',
    name: '유정원',
    areaId: 'NIGHT_TOWN',
    role: '회사원',
    description: '서른네 살. 할 말은 하는 사람. 정작 자기가 힘들다는 말은 잘 못 한다.',
    avatar: '💼',
    likes: ['coffee', 'healthy'],
    loves: ['focus_coffee', 'food_tomato_pasta'],
    shopId: null,
    dialogues: [
      { text: '퇴근했어요. 그 말이 이렇게 좋을 일인가 싶고.' },
      { text: '할 말은 해야죠. 안 하면 그게 쌓여요.' },
      { text: '오늘은 좀 많이 폈어요. 아무 말 마세요.' },
      { text: '소라는 커피가 더 나쁘대요. 웃기지도 않아.' },
      { text: '커피는 이제 안 마셔요. 저녁이라.' },
      { text: '이 시간에 걸어 다니면 하루가 정리돼요.', band: 'NIGHT' },
      { text: '회사 얘기는 안 할게요. 하면 길어져서.', minLevel: 'FRIEND' },
      { text: '힘들다는 말이 제일 어려워요. 다른 말은 다 하는데.', minLevel: 'CLOSE_FRIEND' },
    ],
    chains: [
      {
        id: 'jeongwon_say_it',
        npcId: 'JEONGWON',
        name: '한 마디 하기',
        intro: '참고 있는 거 하나 있죠. 말로 해봐요, 한 마디면 돼요.',
        outro: '했으면 됐어요. 이거 차고 다녀요, 시간 좀 지키게.',
        steps: [
          { title: '하고 싶었던 말 한 줄로 적어보기', category: 'MIND', difficulty: 'EASY' },
          { title: '그 말 전하거나, 오늘은 접어두기', category: 'HEART', difficulty: 'NORMAL' },
        ],
        rewardCoins: 45,
        rewardFriendship: 10,
        rewardItemId: 'focus_watch',
      },
    ],
  },
  {
    id: 'YUHYEON',
    name: '강유현',
    areaId: 'NIGHT_TOWN',
    role: '편의점 야간',
    description: '스물아홉 살. 웬만한 일에는 안 놀란다. 밤에만 보인다.',
    avatar: '🌘',
    likes: ['moon', 'book', 'nature'],
    loves: ['moon_keyring', 'green_charm'],
    shopId: null,
    nightOnly: true,
    dialogues: [
      { text: '어서 오세요. …아, 그냥 구경이시구나.' },
      { text: '이 시간엔 이상한 게 좀 지나가요. 신경 안 쓰면 돼요.' },
      { text: '밤은 조용해서 좋아요. 낮에는 잘 못 자지만.' },
      { text: '창밖에 뭐 있었죠? 아니에요. 못 보셨으면 됐어요.' },
      { text: '따뜻한 거 하나 골라 가세요. 이 시간엔 그게 나아요.' },
      { text: '가끔 여기 오는 애들이 있어요. 고양이 말고요.', minLevel: 'FRIEND' },
      {
        text: '저도 제가 뭔지 잘 몰라요. 설명할 말부터 없어서요.',
        minLevel: 'CLOSE_FRIEND',
      },
      { text: '하린 씨네 모임은 안 나가요. 저랑은 결이 좀 달라서.', minLevel: 'CLOSE_FRIEND' },
    ],
    chains: [
      {
        id: 'yuhyeon_late',
        npcId: 'YUHYEON',
        name: '자기 전에',
        intro: '이 시간까지 깨 있으면 뭐 하나는 정하고 자야 돼요.',
        outro: '잘 가요. 이거 주머니에 넣어둬요. 어디서 났는지는 묻지 마시고.',
        steps: [
          { title: '오늘 안 한 일 중 하나 내일로 넘기기', category: 'MIND', difficulty: 'EASY' },
          { title: '불 끄고 십 분 안에 눕기', category: 'LIFE', difficulty: 'NORMAL' },
        ],
        rewardCoins: 45,
        rewardFriendship: 10,
        rewardItemId: 'star_fragment',
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

/**
 * 지금 실제로 쓰이고 있는 선물 결.
 *
 * 아무도 안 좋아하는 결이 아이템에만 붙어 있거나, 아무 아이템에도 없는
 * 결을 사람이 좋아하고 있으면 그건 영원히 안 맞는 취향이다.
 * 세는 건 아이템 · 음식 쪽이다 — 사람이 아니라 물건이 기준이다.
 */
export const GIFT_TAGS_IN_USE: ReadonlySet<GiftTag> = new Set([
  ...ITEMS.flatMap((item) => item.giftTags ?? []),
  ...KITCHEN_RECIPES.flatMap((recipe) => recipe.giftTags),
])

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
