import type { Category, Difficulty, Quest, QuestDraft } from '@/types'
import { CATEGORIES } from '@/types'
import { daypart, type Daypart } from './date'

/**
 * 퀘스트를 만들 때 손을 덜 쓰게 해주는 것들.
 *
 * AI 는 쓰지 않는다. 규칙과 내 기록만으로 맞춘다.
 * 그래야 즉시 뜨고, 오프라인에서도 되고, 쓸수록 내 말투에 맞아간다.
 *
 * 여기서 고른 값은 어디까지나 초안이다.
 * 사용자가 직접 고르는 순간 자동 채우기는 멈춘다 (QuestCreationSheet 참고).
 */

/** 제목 비교용. 띄어쓰기와 대소문자 차이는 무시한다. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * 카테고리 판단에 쓰는 한국어 단어들.
 *
 * 긴 단어일수록 구체적이라 점수를 더 준다.
 * ("생각정리" 가 "정리" 보다 강해야 MIND 로 간다)
 */
const KEYWORDS: Record<Category, string[]> = {
  LIFE: [
    '분리수거', '장보기', '장 보', '설거지', '빨래', '세탁', '청소', '정돈', '치우', '버리',
    '쓰레기', '요리', '반찬', '식사', '밥', '이불', '침대', '수납', '서랍', '냉장고',
    '주방', '화장실', '샤워', '씻', '머리감', '머리 감', '택배', '은행', '공과금', '집안일',
  ],
  WORK: [
    '보고서', '이메일', '메일', '회의', '미팅', '마감', '제출', '발표', '기획', '견적',
    '정산', '계약', '거래처', '고객', '업무', '작업', '문서', '자료', '코딩', '개발',
    '과제', '공부', '시험', '강의', '수업', '출근', '이력서', '면접', '리서치', '일하',
  ],
  BODY: [
    '스트레칭', '필라테스', '플랭크', '스쿼트', '달리기', '조깅', '러닝', '운동', '산책',
    '걷기', '걸으', '요가', '헬스', '자전거', '수영', '등산', '근력', '몸풀', '몸 풀',
    '물마시', '물 마시', '물한잔', '물 한 잔', '수면', '낮잠', '일찍자', '일찍 자', '잠',
    '병원', '약먹', '약 먹', '영양제', '체중', '다이어트',
  ],
  PLAY: [
    '넷플릭스', '유튜브', '드라마', '영화', '게임', '예능', '웹툰', '만화', '음악', '노래',
    '기타', '피아노', '노래방', '취미', '그림', '드로잉', '사진', '여행', '나들이', '카페',
    '쇼핑', '전시', '공연', '콘서트', '덕질', '놀기', '딴짓',
  ],
  MIND: [
    '생각정리', '생각 정리', '감사일기', '감사 일기', '글쓰기', '글 쓰', '독서', '일기',
    '회고', '명상', '기록', '메모', '다이어리', '저널', '스크랩', '아이디어', '돌아보',
    '계획', '책', '읽기', '읽고', '단어', '외우',
  ],
  HEART: [
    '안부', '연락', '전화', '문자', '카톡', '친구', '가족', '엄마', '아빠', '부모',
    '동생', '언니', '오빠', '누나', '선물', '감사', '편지', '데이트', '약속', '축하',
    '생일', '챙기', '고맙', '만나',
  ],
}

/** 난이도를 낮춰 잡게 하는 말들 */
const EASY_HINTS = ['하나', '한개', '한 개', '한잔', '한 잔', '잠깐', '조금', '가볍게', '살짝', '한줄', '한 줄']

/** 난이도를 높여 잡게 하는 말들 */
const HARD_HINTS = ['대청소', '끝내기', '끝내', '완성', '마무리', '몰아서', '밀린', '전부', '싹']

/** 제목에서 "30분", "1시간 30분" 같은 표현을 분 단위로 읽는다. */
export function readMinutes(title: string): number | null {
  const hour = title.match(/(\d+)\s*시간/)
  const minute = title.match(/(\d+)\s*분/)
  if (!hour && !minute) return null

  return (hour ? Number(hour[1]) * 60 : 0) + (minute ? Number(minute[1]) : 0)
}

function difficultyFromMinutes(minutes: number): Difficulty {
  if (minutes >= 60) return 'HARD'
  if (minutes >= 25) return 'NORMAL'
  return 'EASY'
}

/** 키워드 점수로 카테고리를 고른다. 짚이는 게 없으면 null. */
function categoryFromKeywords(title: string): Category | null {
  const text = title.toLowerCase()
  let best: Category | null = null
  let bestScore = 0

  for (const category of CATEGORIES) {
    let score = 0
    for (const word of KEYWORDS[category]) {
      // 긴 단어가 더 구체적이니 가중치를 더 준다
      if (text.includes(word)) score += word.length
    }
    if (score > bestScore) {
      bestScore = score
      best = category
    }
  }

  return best
}

function difficultyFromKeywords(title: string): Difficulty | null {
  const minutes = readMinutes(title)
  if (minutes !== null) return difficultyFromMinutes(minutes)

  const text = title.toLowerCase()
  if (HARD_HINTS.some((w) => text.includes(w))) return 'HARD'
  if (EASY_HINTS.some((w) => text.includes(w))) return 'EASY'
  return null
}

export interface Classification {
  category: Category | null
  difficulty: Difficulty
  /** 어디서 왔는지 — 화면에서 "기억해둔 것" 인지 표시할 때 쓴다 */
  from: 'history' | 'keyword' | 'default'
}

/**
 * 제목을 보고 카테고리와 난이도를 추측한다.
 *
 * 예전에 같은 제목으로 만든 적이 있으면 그때 고른 값을 그대로 쓴다.
 * 사전보다 내 손으로 고른 기록이 늘 정확하다.
 */
export function classifyQuest(title: string, history: Quest[] = []): Classification {
  const trimmed = title.trim()
  if (!trimmed) return { category: null, difficulty: 'NORMAL', from: 'default' }

  const key = normalizeTitle(trimmed)
  // 최근에 만든 것부터 본다
  const remembered = [...history]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find((q) => normalizeTitle(q.title) === key)

  if (remembered) {
    return { category: remembered.category, difficulty: remembered.difficulty, from: 'history' }
  }

  const category = categoryFromKeywords(trimmed)
  const difficulty = difficultyFromKeywords(trimmed)

  if (category || difficulty) {
    return { category, difficulty: difficulty ?? 'NORMAL', from: 'keyword' }
  }

  return { category: null, difficulty: 'NORMAL', from: 'default' }
}

export interface Suggestion extends QuestDraft {
  /** 목록에서 구분하는 키 */
  id: string
  /** 왜 추천했는지 */
  reason: 'often' | 'seed'
}

/**
 * 기록이 없을 때 보여줄 기본 추천.
 * 처음 쓰는 사람이 빈 입력창 앞에서 막막해지지 않게 하는 용도다.
 */
const SEEDS: Record<Daypart | 'any', QuestDraft[]> = {
  morning: [
    { title: '물 한 잔 마시기', category: 'BODY', difficulty: 'EASY' },
    { title: '이불 정리하기', category: 'LIFE', difficulty: 'EASY' },
    { title: '오늘 할 일 하나 정하기', category: 'MIND', difficulty: 'EASY' },
  ],
  afternoon: [
    { title: '가장 중요한 일 20분 하기', category: 'WORK', difficulty: 'NORMAL' },
    { title: '잠깐 산책하기', category: 'BODY', difficulty: 'EASY' },
    { title: '책상 위 정리하기', category: 'LIFE', difficulty: 'EASY' },
  ],
  evening: [
    { title: '설거지하기', category: 'LIFE', difficulty: 'EASY' },
    { title: '책 10쪽 읽기', category: 'MIND', difficulty: 'EASY' },
    { title: '가볍게 스트레칭', category: 'BODY', difficulty: 'EASY' },
  ],
  any: [
    { title: '고마운 사람에게 연락하기', category: 'HEART', difficulty: 'EASY' },
    { title: '일기 한 줄 쓰기', category: 'MIND', difficulty: 'EASY' },
    { title: '좋아하는 노래 한 곡 듣기', category: 'PLAY', difficulty: 'EASY' },
  ],
}

const MAX_SUGGESTIONS = 8

/**
 * 지금 눌러서 바로 만들 만한 퀘스트들.
 *
 * 1) 전에 완료한 적 있는 것 (많이 한 순서)  2) 기본 추천
 *
 * 아직 안 끝낸 퀘스트는 추천하지 않는다. 눌러봤자 같은 게 두 개가 될 뿐이다.
 * 그래서 "완료한 적 없는 것" 이라는 갈래는 따로 두지 않았다 —
 * 완료한 적이 없다는 건 지금 목록에 남아 있다는 뜻이라 어차피 걸러진다.
 */
export function suggestQuests(quests: Quest[], now: Date = new Date()): Suggestion[] {
  const openToday = new Set(
    quests.filter((q) => !q.completed).map((q) => normalizeTitle(q.title)),
  )

  // 제목별로 완료 횟수와 마지막에 쓴 설정을 모은다
  interface Tally {
    draft: QuestDraft
    completions: number
    lastCreatedAt: string
  }
  const tally = new Map<string, Tally>()

  for (const quest of quests) {
    const key = normalizeTitle(quest.title)
    if (!key) continue

    const draft: QuestDraft = {
      title: quest.title,
      category: quest.category,
      difficulty: quest.difficulty,
    }
    const prev = tally.get(key)

    if (!prev) {
      tally.set(key, {
        draft,
        completions: quest.completed ? 1 : 0,
        lastCreatedAt: quest.createdAt,
      })
      continue
    }

    prev.completions += quest.completed ? 1 : 0
    // 가장 최근에 고른 카테고리·난이도를 남긴다
    if (quest.createdAt > prev.lastCreatedAt) {
      prev.draft = draft
      prev.lastCreatedAt = quest.createdAt
    }
  }

  const often = [...tally.entries()]
    .filter(([key, t]) => !openToday.has(key) && t.completions > 0)
    .sort(
      (a, b) =>
        b[1].completions - a[1].completions ||
        b[1].lastCreatedAt.localeCompare(a[1].lastCreatedAt),
    )
    .map(([key, t]): Suggestion => ({ ...t.draft, id: `often:${key}`, reason: 'often' }))

  const seeds = [...SEEDS[daypart(now)], ...SEEDS.any]
    .filter((draft) => !openToday.has(normalizeTitle(draft.title)))
    .map((draft): Suggestion => ({
      ...draft,
      id: `seed:${normalizeTitle(draft.title)}`,
      reason: 'seed',
    }))

  const result: Suggestion[] = []
  const seen = new Set<string>()

  for (const suggestion of [...often, ...seeds]) {
    const key = normalizeTitle(suggestion.title)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(suggestion)
    if (result.length >= MAX_SUGGESTIONS) break
  }

  return result
}
