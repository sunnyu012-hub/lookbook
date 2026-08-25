/**
 * Phase 4 QA 자료 — 사용자가 고치는 여러 모습.
 *
 * 여기서 보는 건 "얼마나 많이 배우나" 가 아니다.
 * "잘못 배우지 않나" 다 (계획서 65).
 *
 * 규칙 하나를 잘못 만들면 앞으로 쓰는 모든 기록이 오염된다.
 * 사용자가 몇 번 더 고쳐야 하는 쪽이 훨씬 낫다.
 */
import type { AppliedLifeTag, DayOfWeek, DayPart, QuickLog, TemporalContext } from '@/lib/os2/types'
import type { CorrectionEvent, CorrectionKind } from '@/lib/os2/learning'
import { normalizeText } from '@/lib/os2/learning'

let seq = 0
export const resetIds = () => {
  seq = 0
}
export const nextId = () => `id-${(seq += 1)}`

export interface EventSpec {
  text: string
  kind: CorrectionKind
  tagId: string
  date: string
  matchedText?: string | null
  myTagIds?: string[]
  myTagNames?: string[]
  lifeTagIds?: string[]
  temporalContext?: TemporalContext
  dayPart?: DayPart
  dayOfWeek?: DayOfWeek
}

export function makeEvent(spec: EventSpec): CorrectionEvent {
  return {
    id: nextId(),
    userId: 'u1',
    quickLogId: `log-${spec.date}-${spec.tagId}`,
    kind: spec.kind,
    tagId: spec.tagId,
    text: spec.text,
    normalizedText: normalizeText(spec.text),
    matchedText: spec.matchedText ?? null,
    sourceRuleId: null,
    context: {
      myTagIds: spec.myTagIds ?? [],
      myTagNames: spec.myTagNames ?? [],
      lifeTagIds: spec.lifeTagIds ?? [],
      dayPart: spec.dayPart ?? 'evening',
      dayOfWeek: spec.dayOfWeek ?? 3,
      temporalContext: spec.temporalContext ?? 'present',
    },
    date: spec.date,
    createdAt: `${spec.date}T12:00:00.000Z`,
    schemaVersion: 1,
  }
}

export const makeEvents = (specs: readonly EventSpec[]) => specs.map(makeEvent)

export function makeLog(over: Partial<QuickLog> = {}): QuickLog {
  return {
    id: over.id ?? 'log-1',
    userId: 'u1',
    mood: 3,
    text: '오늘 원트 세 개 했다',
    energy: null,
    focus: null,
    fatigue: null,
    photoPath: null,
    myTagIds: [],
    lifeTags: [],
    loggedAt: '2026-08-20T10:00:00.000Z',
    date: '2026-08-20',
    dayOfWeek: 4,
    dayPart: 'evening',
    schemaVersion: 1,
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    ...over,
  }
}

export const autoTag = (tagId: string, over: Partial<AppliedLifeTag> = {}): AppliedLifeTag => ({
  tagId,
  source: 'keyword',
  confidence: 0.8,
  appliedAt: '2026-08-20T10:00:00.000Z',
  temporalContext: 'present',
  ...over,
})

// ─────────────────────────────────────────────
// A. 원트 — 세 번 반복되면 배운다
// ─────────────────────────────────────────────

const CLIMB = ['sport:climbing']

export const WONT_VERIFIED = makeEvents([
  {
    text: '오늘 원트 세 개',
    kind: 'added',
    tagId: 'outcome:achievement',
    date: '2026-08-01',
    myTagIds: ['t-climb'],
    myTagNames: ['클라이밍'],
    lifeTagIds: CLIMB,
  },
  {
    text: '남색 원트 성공',
    kind: 'added',
    tagId: 'outcome:achievement',
    date: '2026-08-04',
    myTagIds: ['t-climb'],
    myTagNames: ['클라이밍'],
    lifeTagIds: CLIMB,
  },
  {
    text: '원트 했다 기분 좋음',
    kind: 'added',
    tagId: 'outcome:achievement',
    date: '2026-08-09',
    myTagIds: ['t-climb'],
    myTagNames: ['클라이밍'],
    lifeTagIds: CLIMB,
  },
])

// ─────────────────────────────────────────────
// B. 한 번만 나온 표현 — 규칙으로 만들지 않는다
// ─────────────────────────────────────────────

export const ONE_OFF = makeEvents([
  {
    text: '오늘 촬영 원트로 끝남',
    kind: 'added',
    tagId: 'outcome:achievement',
    date: '2026-08-11',
    lifeTagIds: ['creative:photography'],
  },
])

// ─────────────────────────────────────────────
// C. 기 빨림 — built-in 이 잡은 말이 매번 같다
// ─────────────────────────────────────────────

export const DRAINED_VERIFIED = makeEvents([
  {
    text: '회의 많아서 기 빨림',
    kind: 'verified',
    tagId: 'energy:drained',
    date: '2026-08-02',
    matchedText: '기 빨림',
    lifeTagIds: ['work:meeting'],
  },
  {
    text: '오늘도 기 빨림',
    kind: 'verified',
    tagId: 'energy:drained',
    date: '2026-08-05',
    matchedText: '기 빨림',
    lifeTagIds: ['work:meeting'],
  },
  {
    text: '기빨림 진짜',
    kind: 'verified',
    tagId: 'energy:drained',
    date: '2026-08-08',
    matchedText: '기빨림',
    lifeTagIds: ['work:meeting'],
  },
  {
    text: '회의 끝나고 기 빨림',
    kind: 'verified',
    tagId: 'energy:drained',
    date: '2026-08-12',
    matchedText: '기 빨림',
    lifeTagIds: ['work:meeting'],
  },
])

// ─────────────────────────────────────────────
// D. 부정문 안에서 나온 거절 — 배우면 안 된다
// ─────────────────────────────────────────────

export const NEGATED_REJECTS = makeEvents([
  {
    text: '오늘은 기 안 빨림',
    kind: 'rejected',
    tagId: 'energy:drained',
    date: '2026-08-03',
    matchedText: '기 빨림',
  },
  {
    text: '전혀 기 안 빨렸다',
    kind: 'rejected',
    tagId: 'energy:drained',
    date: '2026-08-06',
    matchedText: '기 빨림',
  },
  {
    text: '기 하나도 안 빨림',
    kind: 'rejected',
    tagId: 'energy:drained',
    date: '2026-08-10',
    matchedText: '기 빨림',
  },
  {
    text: '별로 안 빨렸어',
    kind: 'rejected',
    tagId: 'energy:drained',
    date: '2026-08-13',
    matchedText: '기 빨림',
  },
])

// ─────────────────────────────────────────────
// E. 미래 이야기 — 배우면 안 된다
// ─────────────────────────────────────────────

export const FUTURE_REJECTS = makeEvents([
  {
    text: '내일 원트하고 싶다',
    kind: 'rejected',
    tagId: 'sport:climbing',
    date: '2026-08-03',
    temporalContext: 'future',
  },
  {
    text: '다음 주에 클라이밍 갈 거야',
    kind: 'rejected',
    tagId: 'sport:climbing',
    date: '2026-08-07',
    temporalContext: 'future',
  },
  {
    text: '언젠가 클라이밍 하고 싶다',
    kind: 'rejected',
    tagId: 'sport:climbing',
    date: '2026-08-14',
    temporalContext: 'future',
  },
  {
    text: '클라이밍 갔으면 좋겠다',
    kind: 'rejected',
    tagId: 'sport:climbing',
    date: '2026-08-16',
    temporalContext: 'hypothetical',
  },
])

// ─────────────────────────────────────────────
// F. 남의 이야기 — 배우면 안 된다
// ─────────────────────────────────────────────

export const OTHER_PERSON = makeEvents([
  {
    text: '성현이가 피곤하대',
    kind: 'rejected',
    tagId: 'energy:physically_tired',
    date: '2026-08-02',
    matchedText: '피곤',
  },
  {
    text: '친구가 요즘 힘들다고 했다',
    kind: 'rejected',
    tagId: 'energy:physically_tired',
    date: '2026-08-05',
    matchedText: '힘들',
  },
  {
    text: '팀장이 피곤하다고 계속 말함',
    kind: 'rejected',
    tagId: 'energy:physically_tired',
    date: '2026-08-09',
    matchedText: '피곤',
  },
  {
    text: '동생이 피곤한가 보다',
    kind: 'rejected',
    tagId: 'energy:physically_tired',
    date: '2026-08-15',
    matchedText: '피곤',
  },
])

// ─────────────────────────────────────────────
// G. 막는 규칙 — 네 번은 쌓여야 한다
// ─────────────────────────────────────────────

const OFFICE = ['place:workplace']

export const CROWD_REJECTS = makeEvents([
  {
    text: '사무실에 사람 많았다',
    kind: 'rejected',
    tagId: 'social:crowd',
    date: '2026-08-01',
    matchedText: '사람 많',
    lifeTagIds: OFFICE,
  },
  {
    text: '오늘도 사무실 사람 많음',
    kind: 'rejected',
    tagId: 'social:crowd',
    date: '2026-08-04',
    matchedText: '사람 많',
    lifeTagIds: OFFICE,
  },
  {
    text: '사무실 사람 많아서 정신없음',
    kind: 'rejected',
    tagId: 'social:crowd',
    date: '2026-08-07',
    matchedText: '사람 많',
    lifeTagIds: OFFICE,
  },
  {
    text: '사무실 사람 많다',
    kind: 'rejected',
    tagId: 'social:crowd',
    date: '2026-08-11',
    matchedText: '사람 많',
    lifeTagIds: OFFICE,
  },
])

/** 세 번까지만 — 아직 막지 않는다 */
export const CROWD_REJECTS_THREE = CROWD_REJECTS.slice(0, 3)

// ─────────────────────────────────────────────
// H. 같은 말인데 문맥마다 뜻이 다르다
// ─────────────────────────────────────────────

export const SPLIT_CONTEXT = makeEvents([
  {
    text: '미쳤다 이거 진짜 잘 나왔어',
    kind: 'added',
    tagId: 'emotion:excitement',
    date: '2026-08-01',
    lifeTagIds: ['creative:coding'],
  },
  {
    text: '미쳤다 완전 좋아',
    kind: 'added',
    tagId: 'emotion:excitement',
    date: '2026-08-05',
    lifeTagIds: ['creative:coding'],
  },
  {
    text: '미쳤다 이거 또 됐어',
    kind: 'added',
    tagId: 'emotion:excitement',
    date: '2026-08-08',
    lifeTagIds: ['creative:coding'],
  },
  {
    text: '미쳤다 또 터졌네',
    kind: 'added',
    tagId: 'emotion:frustration',
    date: '2026-08-02',
    lifeTagIds: ['work:work_problem'],
  },
  {
    text: '미쳤다 진짜 답 없다',
    kind: 'added',
    tagId: 'emotion:frustration',
    date: '2026-08-06',
    lifeTagIds: ['work:work_problem'],
  },
  {
    text: '미쳤다 이거 왜 이래',
    kind: 'added',
    tagId: 'emotion:frustration',
    date: '2026-08-10',
    lifeTagIds: ['work:work_problem'],
  },
])

// ─────────────────────────────────────────────
// I. 하루에 몰아서 — 날짜가 모자라다
// ─────────────────────────────────────────────

export const SAME_DAY_BURST = makeEvents([
  {
    text: '원트 하나',
    kind: 'added',
    tagId: 'outcome:achievement',
    date: '2026-08-01',
    lifeTagIds: CLIMB,
  },
  {
    text: '원트 둘',
    kind: 'added',
    tagId: 'outcome:achievement',
    date: '2026-08-01',
    lifeTagIds: CLIMB,
  },
  {
    text: '원트 셋',
    kind: 'added',
    tagId: 'outcome:achievement',
    date: '2026-08-01',
    lifeTagIds: CLIMB,
  },
])

// ─────────────────────────────────────────────
// J. 방향이 오락가락한다
// ─────────────────────────────────────────────

export const INCONSISTENT = makeEvents([
  {
    text: '개운하다 오늘',
    kind: 'added',
    tagId: 'body:rested',
    date: '2026-08-01',
    lifeTagIds: ['recovery:sleep'],
  },
  {
    text: '개운하다 진짜',
    kind: 'added',
    tagId: 'body:rested',
    date: '2026-08-03',
    lifeTagIds: ['recovery:sleep'],
  },
  {
    text: '개운하다고 하기엔',
    kind: 'rejected',
    tagId: 'body:rested',
    date: '2026-08-05',
    matchedText: '개운',
    lifeTagIds: ['recovery:sleep'],
  },
  {
    text: '개운하다 못 하겠다',
    kind: 'rejected',
    tagId: 'body:rested',
    date: '2026-08-07',
    matchedText: '개운',
    lifeTagIds: ['recovery:sleep'],
  },
])

// ─────────────────────────────────────────────
// K. 문맥이 매번 달라서 공통이 없다
// ─────────────────────────────────────────────

export const NO_SHARED_CONTEXT = makeEvents([
  { text: '완전 방전됨', kind: 'added', tagId: 'energy:very_low', date: '2026-08-01', lifeTagIds: ['work:meeting'] },
  { text: '오늘 방전됨', kind: 'added', tagId: 'energy:very_low', date: '2026-08-04', lifeTagIds: ['place:home'] },
  { text: '방전됨 진짜', kind: 'added', tagId: 'energy:very_low', date: '2026-08-08', lifeTagIds: ['activity:commute'] },
])

// ─────────────────────────────────────────────
// L. 배우면 안 되는 말들
// ─────────────────────────────────────────────

export const BAD_TRIGGERS = [
  '오늘',
  '그냥',
  '진짜',
  '3시',
  '500g',
  '2026-08-01',
  '...',
  '가',
  '오늘 아침에 일어나서 밥 먹고 카페 가서 세 시간 작업하고 저녁에 클라이밍 갔다',
]

export const GOOD_TRIGGERS = ['원트', '기 빨림', '멘탈 갈림', '개운함', '방전됨']

// ─────────────────────────────────────────────
// M. 줄기 일반화 — 러닝과 자전거는 둘 다 운동이다
// ─────────────────────────────────────────────

export const HIERARCHY_CONTEXT = makeEvents([
  {
    text: '오늘 개운함 진짜',
    kind: 'added',
    tagId: 'body:rested',
    date: '2026-08-01',
    lifeTagIds: ['sport:running'],
  },
  {
    text: '끝나고 개운함',
    kind: 'added',
    tagId: 'body:rested',
    date: '2026-08-05',
    lifeTagIds: ['sport:cycling'],
  },
  {
    text: '개운함 오랜만에',
    kind: 'added',
    tagId: 'body:rested',
    date: '2026-08-09',
    lifeTagIds: ['sport:yoga'],
  },
])

// ─────────────────────────────────────────────
// N. 멘탈 갈림 — 표현 매핑 (alias)
// ─────────────────────────────────────────────

export const MENTAL_ALIAS = makeEvents([
  {
    text: '오늘 멘탈 갈림 진짜',
    kind: 'verified',
    tagId: 'mental:overwhelmed',
    date: '2026-08-02',
    matchedText: '멘탈 갈림',
    lifeTagIds: ['work:deadline'],
  },
  {
    text: '멘탈갈림 하루종일',
    kind: 'verified',
    tagId: 'mental:overwhelmed',
    date: '2026-08-06',
    matchedText: '멘탈갈림',
    lifeTagIds: ['work:deadline'],
  },
  {
    text: '또 멘탈 갈림',
    kind: 'verified',
    tagId: 'mental:overwhelmed',
    date: '2026-08-11',
    matchedText: '멘탈 갈림',
    lifeTagIds: ['work:deadline'],
  },
])

// ─────────────────────────────────────────────
// O. 흔한 말만 공통 — 배울 게 없다
// ─────────────────────────────────────────────

export const ONLY_COMMON_WORDS = makeEvents([
  { text: '오늘 그냥 진짜', kind: 'added', tagId: 'emotion:neutral', date: '2026-08-01', lifeTagIds: ['place:home'] },
  { text: '오늘 그냥 너무', kind: 'added', tagId: 'emotion:neutral', date: '2026-08-04', lifeTagIds: ['place:home'] },
  { text: '오늘 그냥 되게', kind: 'added', tagId: 'emotion:neutral', date: '2026-08-08', lifeTagIds: ['place:home'] },
])

// ─────────────────────────────────────────────
// P. 숫자만 다른 문장 — 숫자는 배울 말이 아니다
// ─────────────────────────────────────────────

export const NUMERIC_ONLY = makeEvents([
  { text: '3시에 시작', kind: 'added', tagId: 'work:deep_work', date: '2026-08-01', lifeTagIds: ['place:cafe'] },
  { text: '5시에 시작', kind: 'added', tagId: 'work:deep_work', date: '2026-08-04', lifeTagIds: ['place:cafe'] },
  { text: '7시에 시작', kind: 'added', tagId: 'work:deep_work', date: '2026-08-07', lifeTagIds: ['place:cafe'] },
])

// ─────────────────────────────────────────────
// Q. 두 번만 — 아직 한 걸음 모자라다
// ─────────────────────────────────────────────

export const ALMOST_THERE = makeEvents([
  {
    text: '오늘 텐션 좋았다',
    kind: 'added',
    tagId: 'energy:high',
    date: '2026-08-01',
    lifeTagIds: ['social:with_people'],
  },
  {
    text: '텐션 좋음 계속',
    kind: 'added',
    tagId: 'energy:high',
    date: '2026-08-05',
    lifeTagIds: ['social:with_people'],
  },
])

// ─────────────────────────────────────────────
// R. 앱 만들기 — 사용자가 직접 넣은 태그가 반복된다
// ─────────────────────────────────────────────

export const APP_BUILDING = makeEvents([
  {
    text: '앱 구조 짜는 중',
    kind: 'added',
    tagId: 'creative:building',
    date: '2026-08-01',
    lifeTagIds: ['creative:coding'],
  },
  {
    text: '앱 구조 다시 짬',
    kind: 'added',
    tagId: 'creative:building',
    date: '2026-08-05',
    lifeTagIds: ['creative:coding'],
  },
  {
    text: '앱 구조 정리했다',
    kind: 'added',
    tagId: 'creative:building',
    date: '2026-08-10',
    lifeTagIds: ['creative:coding'],
  },
])



// ─────────────────────────────────────────────
// S. 카페 작업 — 장소 문맥에서만 배운다
// ─────────────────────────────────────────────

export const CAFE_FOCUS = makeEvents([
  {
    text: '카페에서 각 잡고 함',
    kind: 'added',
    tagId: 'mental:deep_focus',
    date: '2026-08-02',
    lifeTagIds: ['place:cafe'],
  },
  {
    text: '오늘도 각 잡고 함',
    kind: 'added',
    tagId: 'mental:deep_focus',
    date: '2026-08-06',
    lifeTagIds: ['place:cafe'],
  },
  {
    text: '각 잡고 세 시간',
    kind: 'added',
    tagId: 'mental:deep_focus',
    date: '2026-08-12',
    lifeTagIds: ['place:cafe'],
  },
])

// ─────────────────────────────────────────────
// T. 되돌린 판단 — 사건으로 남기지 않는다
// ─────────────────────────────────────────────

export const FLIP_FLOP = makeEvents([
  {
    text: '오늘 살짝 처지는 느낌',
    kind: 'rejected',
    tagId: 'energy:sluggish',
    date: '2026-08-01',
    matchedText: '처지',
    lifeTagIds: ['place:home'],
  },
  {
    text: '오늘 살짝 처지는 느낌',
    kind: 'added',
    tagId: 'energy:sluggish',
    date: '2026-08-02',
    lifeTagIds: ['place:home'],
  },
])

// ─────────────────────────────────────────────
// U. 야근 뒤 — 여러 날, 여러 문맥
// ─────────────────────────────────────────────

export const AFTER_OVERTIME = makeEvents([
  {
    text: '야근하고 나면 늘 이래',
    kind: 'verified',
    tagId: 'energy:very_low',
    date: '2026-08-03',
    matchedText: '방전',
    lifeTagIds: ['work:overtime'],
  },
  {
    text: '야근 뒤라 그런가',
    kind: 'verified',
    tagId: 'energy:very_low',
    date: '2026-08-07',
    matchedText: '방전',
    lifeTagIds: ['work:overtime'],
  },
  {
    text: '야근 이틀째',
    kind: 'verified',
    tagId: 'energy:very_low',
    date: '2026-08-13',
    matchedText: '방전',
    lifeTagIds: ['work:overtime'],
  },
  {
    text: '야근 끝',
    kind: 'verified',
    tagId: 'energy:very_low',
    date: '2026-08-18',
    matchedText: '방전',
    lifeTagIds: ['work:overtime'],
  },
])

// ─────────────────────────────────────────────
// V. 애매한 한 글자 — 배우지 않는다
// ─────────────────────────────────────────────

export const SINGLE_CHAR = makeEvents([
  { text: '배 아팠다', kind: 'added', tagId: 'body:pain', date: '2026-08-01', lifeTagIds: ['place:home'] },
  { text: '배 탔다', kind: 'rejected', tagId: 'body:pain', date: '2026-08-04', matchedText: '배', lifeTagIds: ['place:transit'] },
  { text: '배 먹었다', kind: 'rejected', tagId: 'body:pain', date: '2026-08-08', matchedText: '배', lifeTagIds: ['food:snack'] },
])

/** 모든 시나리오 — 개수를 셀 때 쓴다 */
export const ALL_SCENARIOS = [
  WONT_VERIFIED,
  ONE_OFF,
  DRAINED_VERIFIED,
  NEGATED_REJECTS,
  FUTURE_REJECTS,
  OTHER_PERSON,
  CROWD_REJECTS,
  SPLIT_CONTEXT,
  SAME_DAY_BURST,
  INCONSISTENT,
  NO_SHARED_CONTEXT,
  HIERARCHY_CONTEXT,
  MENTAL_ALIAS,
  ONLY_COMMON_WORDS,
  NUMERIC_ONLY,
  ALMOST_THERE,
  APP_BUILDING,
  CAFE_FOCUS,
  FLIP_FLOP,
  AFTER_OVERTIME,
  SINGLE_CHAR,
]

export const ALL_EVENTS = ALL_SCENARIOS.flat()
