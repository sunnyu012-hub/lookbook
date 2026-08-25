/**
 * 자동 태깅 QA 자료.
 *
 * 실제로 사람이 쓸 법한 한국어 기록들이다 — 반말, 줄임말, 오타, 이모지 섞임.
 * 여기서 보는 건 두 가지다.
 *   want   이건 꼭 붙어야 한다
 *   never  이건 절대 붙으면 안 된다  ← 이쪽이 더 중요하다
 *
 * 틀린 태그 하나가 안 붙은 태그 열 개보다 나쁘다.
 * 내가 안 한 운동이 기록에 남으면 그 통계는 통째로 못 믿게 된다.
 */
import type { TemporalContext } from '@/lib/os2/types'

export interface Fixture {
  text: string
  /** 반드시 붙어야 하는 태그 */
  want?: string[]
  /** 절대 붙으면 안 되는 태그 */
  never?: string[]
  /** 붙는다면 이 시제여야 한다 */
  when?: Record<string, TemporalContext>
  mood?: number
  energy?: number
  myTagNames?: string[]
  /** 이 케이스가 보는 함정 */
  trap?: string
}

/**
 * 반드시 통과해야 하는 열 가지 오분류 함정.
 * 하나라도 깨지면 배포하지 않는다.
 */
export const TRAP_CASES: Fixture[] = [
  {
    trap: 'A. 부정 — 안 아팠다를 아팠다로 읽지 않는다',
    text: '오늘은 하나도 안 아팠어',
    never: ['body:pain', 'body:headache'],
  },
  {
    trap: 'A2. 뒤에 오는 부정 — 좋지 않았다',
    text: '기분이 좋지 않았다',
    never: ['emotion:joy', 'emotion:happiness'],
  },
  {
    trap: 'B. 미래 — 내일 할 일을 오늘 한 것으로 세지 않는다',
    text: '내일 클라이밍 갈 거야',
    want: ['sport:climbing'],
    when: { 'sport:climbing': 'future' },
  },
  {
    trap: 'C. 가정 — 하고 싶다는 한 것이 아니다',
    text: '운동 갔으면 좋겠다',
    never: ['activity:exercise'],
  },
  {
    trap: 'D. 과거 — 어제 일은 어제 일로 남긴다',
    text: '어제 러닝했다',
    want: ['sport:running'],
    when: { 'sport:running': 'past' },
  },
  {
    trap: 'E. 남의 감정 — 친구가 슬픈 것은 내 슬픔이 아니다',
    text: '친구가 요즘 너무 슬프대',
    never: ['emotion:sadness'],
  },
  {
    trap: 'F. 남의 몸 — 엄마가 아픈 것은 내 통증이 아니다',
    text: '엄마가 계속 머리 아프시대',
    never: ['body:headache', 'body:pain'],
  },
  {
    trap: 'G. 감정 과잉 — 밥 먹었다는 말에 행복을 붙이지 않는다',
    text: '점심 먹음',
    never: [
      'emotion:joy', 'emotion:happiness', 'emotion:contentment',
      'emotion:calm', 'emotion:comfortable',
    ],
  },
  {
    trap: 'H. 체중 — 숫자가 오르내린 것에 잘함/못함을 붙이지 않는다',
    text: '체중 500g 늘었네',
    never: ['outcome:improved', 'outcome:failure', 'outcome:success'],
  },
  {
    trap: 'I. 진단 금지 — 증상은 적되 병명은 만들지 않는다',
    text: '허리가 계속 아픈데 디스크인가 싶다',
    // 증상은 남기되 병명은 만들지 않는다 — 사전에 진단 태그 자체가 없다
    want: ['body:pain'],
  },
  {
    trap: 'J. 내 태그 우선 — 사람 이름은 내가 만든 태그가 먼저다',
    text: '하은이랑 카페 갔다',
    myTagNames: ['하은'],
    want: ['place:cafe'],
  },
]

/** 평소 기록들 */
export const EVERYDAY_CASES: Fixture[] = [
  { text: '오늘 클라이밍 갔다 진짜 재밌었음', want: ['sport:climbing', 'emotion:amusement'] },
  { text: '아침에 러닝 5km 뛰었다', want: ['sport:running'] },
  { text: '헬스장 가서 하체 했음', want: ['sport:gym'] },
  { text: '요가 하고 나니 몸이 개운하다', want: ['sport:yoga'] },
  { text: '등산 갔는데 다리 아파 죽는 줄', want: ['sport:hiking'] },
  { text: '자전거 타고 한강 갔다옴', want: ['sport:cycling'] },
  { text: '스트레칭만 겨우 했다', want: ['sport:stretching'] },
  { text: '오늘은 그냥 많이 걸었다', want: ['sport:walking'] },

  { text: '회의 세 개 연속... 진짜 기빨림', want: ['work:meeting', 'energy:drained'] },
  { text: '야근했다 일이 너무 많아', want: ['work:overtime', 'work:high_workload'] },
  { text: '오늘 일 다 끝냈다 후련해', want: ['work:finished_work', 'emotion:relief'] },
  { text: '한가한 하루였음', want: ['work:low_workload'] },
  { text: '마감 이틀 남았는데 손도 못 댔다', want: ['work:deadline'] },
  { text: '발표 무사히 끝났다 다행', want: ['work:presentation', 'emotion:relief'] },
  { text: '이슈 터져서 하루 날림', want: ['work:work_problem'] },
  { text: '문서 작성만 계속했다', want: ['work:writing'] },

  { text: '카페에서 세 시간 집중해서 작업함', want: ['place:cafe', 'mental:focused'] },
  { text: '집중이 하나도 안 됐다', want: ['mental:distracted'], never: ['mental:focused'] },
  { text: '집중이 안 됐다', want: ['mental:distracted'], never: ['mental:focused'] },
  { text: '몰입해서 시간 가는 줄 몰랐다', want: ['mental:deep_focus'] },
  { text: '머리가 멍하다', want: ['mental:brain_fog'] },
  { text: '멘탈 갈림', want: ['mental:overwhelmed'] },
  { text: '의욕이 하나도 없다', want: ['mental:unmotivated'] },
  { text: '계속 미뤘다 딴짓만 함', want: ['mental:procrastination'] },
  { text: '자꾸 생각나서 잠을 못 잤다', want: ['mental:ruminating'] },
  { text: '결정을 못 하겠다 고민만 하는 중', want: ['mental:indecisive'] },
  { text: '머리가 맑다 오랜만에', want: ['mental:clear_headed'] },

  { text: '기분 좋았다', want: ['emotion:joy'] },
  { text: '진짜 행복했어', want: ['emotion:happiness'] },
  { text: '설레서 잠이 안 온다', want: ['emotion:excitement'] },
  { text: '뿌듯하다 내가 해냈어', want: ['emotion:pride'] },
  { text: '너무 짜증났다', want: ['emotion:irritation'] },
  { text: '불안해서 아무것도 못 했다', want: ['emotion:anxiety'] },
  { text: '외로웠다', want: ['emotion:loneliness'] },
  { text: '답답해 진짜', want: ['emotion:frustration'] },
  { text: '실망스러웠다', want: ['emotion:disappointment'] },
  { text: '고맙다는 말을 들었다', want: ['emotion:gratitude'] },
  { text: '민망했다 진짜 창피', want: ['emotion:embarrassment'] },
  { text: '노잼이었다', want: ['emotion:boredom'] },
  { text: '마음이 편안했다', want: ['emotion:comfortable'] },
  { text: '그냥 그랬다', want: ['emotion:neutral'] },

  { text: '피곤해 죽겠다', want: ['energy:physically_tired'] },
  { text: '완전 방전됐다', want: ['energy:very_low'] },
  { text: '졸려', want: ['energy:sleepy'] },
  { text: '에너지 넘치는 하루였다', want: ['energy:very_high'] },
  { text: '몸은 피곤한데 잠이 안 온다', want: ['energy:wired'] },
  { text: '늘어져 있었다', want: ['energy:sluggish'] },

  { text: '머리가 아파서 아무것도 못 했다', want: ['body:headache'] },
  { text: '어깨가 뭉쳤다', want: ['body:shoulder_tension'] },
  { text: '목이 뻐근하다', want: ['body:neck_tension'] },
  { text: '근육통 심함', want: ['body:muscle_soreness'] },
  { text: '속이 안 좋다', want: [] },

  { text: '커피 두 잔 마셨다', want: ['food:coffee'] },
  { text: '친구랑 술 마시고 늦게 들어옴', want: ['food:alcohol', 'relationship:friend'] },
  { text: '저녁 안 먹었다', never: ['food:dinner'] },
  { text: '디저트 먹었다 달아서 좋았음', want: ['food:dessert'] },
  { text: '물을 많이 마셨다', want: [] },
  { text: '과식했다', want: ['food:overeating'] },

  { text: '푹 잤다', want: ['recovery:sleep'] },
  { text: '낮잠 잤다', want: ['recovery:nap'] },
  { text: '아무것도 안 하고 쉬었다', want: ['recovery:rest'] },

  { text: '엄마랑 통화했다', want: ['relationship:family'] },
  { text: '친구 만나서 수다 떨었다', want: ['relationship:friend'] },
  { text: '혼자 있는 시간이 좋았다', want: ['social:alone'] },
  { text: '사람 많은 곳에 있었더니 지친다', want: ['social:crowd'] },
  { text: '오랜만에 깊은 얘기 했다', want: ['social:deep_conversation'] },

  { text: '집에만 있었다', want: ['place:home'] },
  { text: '사무실 나갔다 왔다', want: ['place:workplace'] },
  { text: '공원 산책했다', want: ['place:park'] },
  { text: '지하철에서 한 시간', want: ['activity:commute'] },

  { text: '처음 가보는 곳이었다', want: ['novelty:new_place'] },
  { text: '새로운 거 배웠다', want: ['outcome:learned'] },

  { text: '내가 하고 싶어서 한 일이다', want: ['agency:chosen'] },
  { text: '어쩔 수 없이 했다', want: ['agency:forced'] },

  { text: '방 청소했다', want: ['activity:cleaning'] },
  { text: '요리했다', want: ['activity:cooking'] },
  { text: '장 봤다', want: ['activity:shopping'] },
  { text: '책 읽었다', want: ['activity:reading'] },
  { text: '넷플릭스 봤다', want: ['activity:watching'] },
  { text: '게임했다', want: ['activity:gaming'] },
  { text: '코딩했다 버그 잡느라 하루 감', want: ['creative:coding'] },
  { text: '그림 그렸다', want: ['creative:drawing'] },
  { text: '일기 썼다', want: ['creative:writing'] },

  { text: '비 왔다', want: ['environment:rainy'] },
  { text: '너무 시끄러웠다', want: ['environment:noisy'] },
  { text: '조용한 곳이라 좋았다', want: ['environment:quiet'] },

  { text: '드디어 끝냈다', want: ['emotion:relief'] },
  { text: '잘 안 풀렸다', want: ['outcome:failure'] },
]

/** 애매하거나 짧아서 아무것도 안 붙는 게 맞는 것들 */
export const QUIET_CASES: Fixture[] = [
  { text: 'ㅇㅇ', want: [] },
  { text: '오늘', want: [] },
  { text: '...', want: [] },
  { text: '음', want: [] },
  { text: '3시', want: [] },
  { text: '👍', want: [] },
  { text: '메모', want: [] },
]

/** 함정 케이스 몇 개 더 */
export const EDGE_CASES: Fixture[] = [
  {
    trap: '말버릇 인용 — 남의 말을 옮긴 것',
    text: '팀장이 힘들다고 계속 말했다',
    never: ['energy:physically_tired'],
  },
  {
    trap: '이제는 안 한다',
    text: '이제 안 짜증나',
    never: ['emotion:irritation'],
  },
  {
    trap: '별로 — 약한 부정',
    text: '별로 재미없었다',
    never: ['emotion:amusement'],
  },
  {
    trap: '술술 은 술이 아니다',
    text: '오늘 일이 술술 풀렸다',
    never: ['food:alcohol'],
    want: ['mental:flow'],
  },
  {
    trap: '안아 는 안 아팠다가 아니다 — 붙어 있는 글자에 속지 않는다',
    text: '안 아팠어',
    never: ['relationship:affection'],
  },
  {
    trap: '사용자가 고른 기운이 본문보다 세다',
    text: '좀 피곤하긴 했는데',
    energy: 5,
    never: ['energy:physically_tired'],
  },
  {
    trap: '기분을 골랐다고 감정 태그를 지어내지 않는다',
    text: '장 보고 왔다',
    mood: 5,
    never: ['emotion:joy', 'emotion:happiness'],
  },
  {
    trap: '같은 줄기면 아래쪽만 남긴다',
    text: '진짜 행복했다',
    want: ['emotion:happiness'],
    never: ['emotion:joy'],
  },
  {
    trap: '한 글자 낱말에 기대지 않는다',
    text: '배 타고 섬에 갔다',
    never: ['body:pain', 'body:stomach_discomfort'],
  },
  {
    trap: '앞뒤가 다른 문장 — 절마다 따로 본다',
    text: '어제는 힘들었는데 오늘은 클라이밍 갔다',
    want: ['sport:climbing'],
    when: { 'sport:climbing': 'present' },
  },
]

export const ALL_FIXTURES: Fixture[] = [
  ...TRAP_CASES,
  ...EVERYDAY_CASES,
  ...QUIET_CASES,
  ...EDGE_CASES,
]
