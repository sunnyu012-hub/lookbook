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
  // ── 하루 · 카페 거리 ──────────────────────────────
  {
    id: 'MINA_1',
    npcId: 'MINA',
    order: 1,
    title: '늘 같은 자리',
    lockedHint: '하루와 몇 번 더 이야기하면.',
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
    lockedHint: '하루가 아직 안 한 말이 있는 것 같다.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'MINA', value: 30 },
      { kind: 'AREA_REPUTATION', areaId: 'CAFE_STREET', value: 40 },
    ],
    lines: [
      '"사실 뒤쪽에 작은 방이 하나 있어."',
      '"손님한테는 잘 안 알려주는데."',
      '"나도 가끔 거기 들어가 있어. 웃는 게 힘든 날에."',
      '"거긴 오래 앉아 있어도 아무도 안 봐. 필요할 때 써."',
    ],
    rewardItemId: null,
    rewardFriendship: 5,
    unlocksSecret: 'BACKROOM_CAFE',
  },

  // ── 태오 · 초록 공원 ──────────────────────────────
  {
    id: 'HARU_1',
    npcId: 'HARU',
    order: 1,
    title: '자기 속도',
    lockedHint: '태오와 몇 번 더 마주치면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'HARU', value: 6 }],
    lines: [
      '"빨리 뛰는 사람이 부럽지 않냐고? 예전엔 그랬지."',
      '"처음엔 나도 남들 속도로 뛰었어. 그땐 뭘 잊으려고 뛴 거라."',
      '"지금은 이 길 보려고 나와. 그게 더 오래 가더라."',
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
    lockedHint: '태오가 요즘 다른 데를 다니는 것 같다.',
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
  {
    // 다섯 번째 장은 채석장에서 뭘 주웠는지를 본다.
    // 친밀도만으로 열면 채석장에 한 번도 안 가본 사람이 먼저 문 이야기를
    // 듣게 된다 — 그러면 "어? 나 그거 본 적 있는데" 가 아니라
    // "그게 뭔데" 가 된다. 이야기가 뒤에서 앞으로 오면 안 된다.
    id: 'HARU_5',
    npcId: 'HARU',
    order: 5,
    title: '열쇠는 아무도 못 찾았대',
    lockedHint: '주운 돌조각을 태오한테 보여주면 뭔가 알 것 같다.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'HARU', value: 34 },
      { kind: 'QUARRY_FIND', itemId: 'mineral_strange_fragment', count: 1 },
    ],
    lines: [
      '"그거… 예전에 본 적 있는 것 같은데."',
      '"공원 바깥쪽에 오래된 문이 하나 있었다고 들었거든."',
      '"문은 있는데 열쇠는 아무도 못 찾았대. 그 무늬가 딱 그거야."',
    ],
    rewardItemId: null,
    rewardFriendship: 4,
  },

  /**
   * ── 정시우 · 「뜨거운 철판이 식은 뒤에도」 ──────────
   *
   * 개인 이야기 시범 한 사람. 스물넷에게 펼치기 전에 이 틀이
   * 실제로 재미있는지 보려고 시우 한 명만 만들었다.
   *
   * 여기서 하는 일은 "사실 이 사람에게 엄청난 비밀이 있었다" 가 아니다.
   * 지금 타코야끼를 굽고 옷을 좋아하고 클라이밍을 하는 시우에게
   * 예전에 좋아했던 시간이 하나 있었다는 것 — 과거가 현재를 설명하는
   * 작은 맥락이고, 그 반대가 아니다.
   *
   * 그래서 마지막 장에서도 시우는 밴드로 돌아가지 않는다.
   * 타이머가 울리고 철판으로 돌아간다. 다음 날 밤에도 트럭에 있다.
   * 달라지는 건 그 사람이 아니라, 내가 몰랐던 시간을 안다는 것뿐이다.
   *
   * ── 여섯 장뿐이고 보상이 없다 ──────────────────────
   *
   * `rewardFriendship: 0` 이다. 앞의 열다섯 장은 3~5를 주는데,
   * 여기서 같이 주면 "이야기를 읽으면 친밀도가 오른다" 가 되고 그때부터
   * 읽는 게 아니라 여는 게 목적이 된다. 읽는 것 자체가 관계의 결과다.
   * (앞 열다섯의 값을 어떻게 할지는 코어 1.0 점검에서 볼 일이지
   *  이번에 같이 손댈 일이 아니다.)
   *
   * ── 선물도 리빙신도 열쇠가 아니다 ──────────────────
   *
   * 조건은 친밀도와 그 동네에 얼마나 있었나 둘뿐이다. LOVE 선물 몇 개나
   * 리빙신 관람을 조건으로 걸면 그 순간 선물과 장면이 이야기를 여는
   * 티켓이 된다 — 둘 다 그러라고 만든 게 아니다.
   */
  {
    id: 'SIWOO_1',
    npcId: 'SIWOO',
    order: 1,
    title: '오늘은 여기까지',
    lockedHint: '시우와 몇 번 더 이야기하면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'SIWOO', value: 6 }],
    lines: [],
    scene: [
      { kind: 'NARRATION', text: '철판 위에 마지막 한 판이 남아 있다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '오늘은 이게 끝이에요.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '많이 남았죠. 그러니까 문제고.' },
      { kind: 'NARRATION', text: '시우가 하나를 집어 든다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '하나 드실래요?' },
      { kind: 'NARRATION', text: '잠깐 생각하더니 다시 말한다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '아, 잠깐. 이건 제가 먹을게요.' },
    ],
    rewardItemId: null,
    rewardFriendship: 0,
  },
  {
    id: 'SIWOO_2',
    npcId: 'SIWOO',
    order: 2,
    title: '애매한 아침',
    lockedHint: '낮에도 한 번쯤 마주치면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'SIWOO', value: 14 }],
    lines: [],
    scene: [
      { kind: 'NARRATION', text: '카페 창가 쪽에 시우가 앉아 있다. 평소보다 조용하다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '밤에 일하면 아침이 좀 애매해요.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '일어나 있으면 아침이고, 자면 아직 어제 같고.' },
      { kind: 'NARRATION', text: '컵을 한 번 돌린다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '그래서 그냥 커피 마시러 와요.' },
      { kind: 'SAY', npcId: 'MINA', text: '오늘은 시럽 넣을까?' },
      { kind: 'SAY', npcId: 'SIWOO', text: '오늘은 됐어요. 오늘은 좀 깨어 있어야 해서.' },
    ],
    rewardItemId: null,
    rewardFriendship: 0,
  },
  {
    id: 'SIWOO_3',
    npcId: 'SIWOO',
    order: 3,
    title: '마지막 한 번',
    lockedHint: '운동 구역에 얼굴이 좀 익으면.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'SIWOO', value: 22 },
      { kind: 'AREA_REPUTATION', areaId: 'TRAINING_ZONE', value: 14 },
    ],
    lines: [],
    scene: [
      { kind: 'NARRATION', text: '시우가 매트에 앉아서 손을 털고 있다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '사실 처음엔 두 번만 가려고 했어요.' },
      { kind: 'SAY', npcId: 'RIO', text: '두 번이요?' },
      { kind: 'SAY', npcId: 'SIWOO', text: '무료 체험 같은 마음으로.' },
      { kind: 'SAY', npcId: 'RIO', text: '무료 아니었는데요.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '그러니까 더 억울하죠.' },
      { kind: 'NARRATION', text: '도윤이 벽 쪽을 본다.' },
      { kind: 'SAY', npcId: 'RIO', text: '금방 그만두실 줄 알았어요.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '저도요.' },
    ],
    rewardItemId: null,
    rewardFriendship: 0,
  },
  {
    id: 'SIWOO_4',
    npcId: 'SIWOO',
    order: 4,
    title: '오래 아는 사람',
    lockedHint: '시우와 조금 더 가까워지면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'SIWOO', value: 28 }],
    lines: [],
    scene: [
      { kind: 'NARRATION', text: '은채가 트럭 옆에 작은 화분 하나를 놓고 간다.' },
      { kind: 'SAY', npcId: 'EUNCHAE', text: '이건 물 조금만 줘도 돼.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '고마워요. 근데 제가 이런 거 잘 못 키워요.' },
      { kind: 'SAY', npcId: 'EUNCHAE', text: '알아. 그래서 이걸로 가져온 거야.' },
      { kind: 'NARRATION', text: '잠깐 뒤,' },
      { kind: 'SAY', npcId: 'EUNCHAE', text: '너 예전 일도 나는 나중에 알았잖아.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '……그건 뭐.' },
      { kind: 'SAY', npcId: 'EUNCHAE', text: '그게 좀 그랬어. 그 얘기 하려던 건 아닌데.' },
      { kind: 'NARRATION', text: '은채가 화분 방향을 한 번 고쳐놓고 간다.' },
    ],
    rewardItemId: null,
    rewardFriendship: 0,
  },
  {
    id: 'SIWOO_5',
    npcId: 'SIWOO',
    order: 5,
    title: '남아 있던 것',
    lockedHint: '창작 골목을 좀 더 돌아다니면.',
    conditions: [
      { kind: 'FRIENDSHIP', npcId: 'SIWOO', value: 34 },
      { kind: 'AREA_REPUTATION', areaId: 'CREATIVE_DISTRICT', value: 20 },
    ],
    lines: [],
    scene: [
      { kind: 'NARRATION', text: '시우가 진열대 앞에서 멈춘다. 재킷 하나를 보고 있다.' },
      { kind: 'SAY', npcId: 'JUNE', text: '그거 아직 있었네요.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '그러게요.' },
      { kind: 'SAY', npcId: 'JUNE', text: '버릴 줄 알았습니다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '저도요.' },
      { kind: 'NARRATION', text: '잠깐 뒤,' },
      { kind: 'SAY', npcId: 'SIWOO', text: '근데 막상 보면 또 그렇네요.' },
      { kind: 'NARRATION', text: '이안은 아무것도 묻지 않는다.' },
      { kind: 'SAY', npcId: 'JUNE', text: '거기 그냥 두겠습니다.' },
    ],
    rewardItemId: null,
    rewardFriendship: 0,
  },
  {
    id: 'SIWOO_6',
    npcId: 'SIWOO',
    order: 6,
    title: '철판으로 돌아가서',
    lockedHint: '시우가 언젠가 얘기할 것 같다.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'SIWOO', value: 40 }],
    lines: [],
    scene: [
      { kind: 'NARRATION', text: '손님이 다 빠진 시간이다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '예전에 노래했어요. 밴드에서.' },
      { kind: 'NARRATION', text: '별일 아니라는 얼굴로 말한다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '생각보다 오래 했고, 생각보다 갑자기 그만뒀고.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '싫어진 건 아니었어요.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '그냥 계속 그걸로 살아야 하나 싶었어요.' },
      { kind: 'NARRATION', text: '트럭 쪽에서 타이머 소리가 난다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '아.' },
      { kind: 'NARRATION', text: '시우가 자리에서 일어난다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '얘기하다가 태울 뻔했네.' },
      { kind: 'NARRATION', text: '철판 쪽으로 돌아가며 웃는다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '그때도 이것보단 덜 긴장했는데.' },
    ],
    rewardItemId: null,
    rewardFriendship: 0,
  },

  // ── 미래 · 창작 지구 ──────────────────────────────
  {
    id: 'LULU_1',
    npcId: 'LULU',
    order: 1,
    title: '안 끝낸 것들',
    lockedHint: '미래와 몇 번 더 이야기하면.',
    conditions: [{ kind: 'FRIENDSHIP', npcId: 'LULU', value: 6 }],
    lines: [
      '"저기 쌓인 거? 전부 하다 만 거야."',
      '"끝내야 된다고 생각하면 시작을 못 하겠더라고. 예순 넘어도 똑같아."',
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
      '"옛날에 오락실이었어. 문 닫는 것도 내가 봤는데."',
      '"그런데 요즘도 소리가 나. 혼자 가보긴 좀 그렇고."',
    ],
    rewardItemId: 'small_radio',
    rewardFriendship: 4,
  },

  // ── 세라 · 밤거리 ─────────────────────────────────
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
    lockedHint: '세라와 조금 더 가까워지면.',
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

/**
 * 시우가 예전에 노래했다는 걸 아는가.
 *
 * 저장하지 않는다 — 마지막 장을 읽었는지로 계산한다.
 * `siwooPastKnown` 같은 boolean 을 굳혀두면 나중에 조건이 바뀌었을 때
 * 굳은 값과 진짜 기록이 어긋난다.
 *
 * 지금은 시우의 생활 대사 두 줄이 이걸 쓴다 (`afterChapterId`).
 * 다른 사람들의 반응은 이번에 만들지 않았다 — 시범은 한 사람으로 끝낸다.
 */
export const SIWOO_PAST_CHAPTER_ID = 'SIWOO_6'

export function knowsSiwooBandPast(state: AppState): boolean {
  return state.discovery.readChapterIds.includes(SIWOO_PAST_CHAPTER_ID)
}

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
