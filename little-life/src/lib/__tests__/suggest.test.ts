import { describe, expect, it } from 'vitest'
import type { Category, Difficulty, Quest } from '@/types'
import { classifyQuest, normalizeTitle, readMinutes, suggestQuests } from '../suggest'
import { withJosa } from '@/lib/labels'

let seq = 0
function quest(partial: Partial<Quest> & { title: string }): Quest {
  seq += 1
  return {
    id: `q${seq}`,
    category: 'LIFE',
    difficulty: 'NORMAL',
    exp: 20,
    completed: false,
    // 순서가 드러나게 생성 시각을 하나씩 밀어준다
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString(),
    completedAt: null,
    ...partial,
  }
}

describe('classifyQuest — 카테고리', () => {
  const cases: Array<[string, Category]> = [
    ['설거지하기', 'LIFE'],
    ['빨래 돌리기', 'LIFE'],
    ['분리수거 하기', 'LIFE'],
    ['냉장고 정리하기', 'LIFE'],
    ['보고서 마감하기', 'WORK'],
    ['이메일 정리하기', 'WORK'],
    ['팀 회의 준비', 'WORK'],
    ['시험 공부하기', 'WORK'],
    ['30분 산책하기', 'BODY'],
    ['스트레칭 하기', 'BODY'],
    ['물 한 잔 마시기', 'BODY'],
    ['일찍 자기', 'BODY'],
    ['영화 한 편 보기', 'PLAY'],
    ['좋아하는 노래 듣기', 'PLAY'],
    ['게임 한 판', 'PLAY'],
    ['책 10쪽 읽기', 'MIND'],
    ['일기 쓰기', 'MIND'],
    ['명상 하기', 'MIND'],
    ['엄마한테 전화하기', 'HEART'],
    ['친구에게 안부 연락', 'HEART'],
    ['생일 선물 사기', 'HEART'],
  ]

  it.each(cases)('%s → %s', (title, expected) => {
    expect(classifyQuest(title).category).toBe(expected)
  })

  it('"생각 정리" 는 살림이 아니라 MIND 로 간다', () => {
    // "정리" 만 보면 LIFE 지만 "생각 정리" 가 더 구체적이라 이겨야 한다
    expect(classifyQuest('생각 정리하기').category).toBe('MIND')
  })

  it('짚이는 단어가 없으면 비워둔다 — 아무거나 찍지 않는다', () => {
    const result = classifyQuest('음 뭐더라')
    expect(result.category).toBeNull()
    expect(result.from).toBe('default')
  })

  it('빈 제목이면 비워둔다', () => {
    expect(classifyQuest('   ').category).toBeNull()
  })
})

describe('classifyQuest — 난이도', () => {
  const cases: Array<[string, Difficulty]> = [
    ['10분 스트레칭', 'EASY'],
    ['20분 걷기', 'EASY'],
    ['30분 산책하기', 'NORMAL'],
    ['45분 공부하기', 'NORMAL'],
    ['1시간 운동하기', 'HARD'],
    ['2시간 집중해서 일하기', 'HARD'],
    ['1시간 30분 청소', 'HARD'],
    ['물 한 잔 마시기', 'EASY'],
    ['잠깐 산책하기', 'EASY'],
    ['가볍게 몸 풀기', 'EASY'],
    ['집 대청소', 'HARD'],
    ['밀린 설거지 끝내기', 'HARD'],
  ]

  it.each(cases)('%s → %s', (title, expected) => {
    expect(classifyQuest(title).difficulty).toBe(expected)
  })

  it('힌트가 없으면 NORMAL', () => {
    expect(classifyQuest('보고서 쓰기').difficulty).toBe('NORMAL')
  })
})

describe('readMinutes', () => {
  it('시간과 분을 함께 읽는다', () => {
    expect(readMinutes('1시간 30분 운동')).toBe(90)
    expect(readMinutes('2시간')).toBe(120)
    expect(readMinutes('15분 정리')).toBe(15)
    expect(readMinutes('띄어쓰기 없이 30분')).toBe(30)
  })

  it('시간 표현이 없으면 null', () => {
    expect(readMinutes('설거지하기')).toBeNull()
  })
})

describe('classifyQuest — 내 기록 우선', () => {
  it('예전에 고른 카테고리를 사전보다 우선한다', () => {
    // 사전대로면 WORK 지만, 이 사람은 전에 MIND 로 골랐다
    const history = [quest({ title: '공부하기', category: 'MIND', difficulty: 'HARD' })]
    const result = classifyQuest('공부하기', history)

    expect(result).toEqual({ category: 'MIND', difficulty: 'HARD', from: 'history' })
  })

  it('띄어쓰기가 달라도 같은 퀘스트로 본다', () => {
    const history = [quest({ title: '설거지 하기', category: 'HEART' })]
    expect(classifyQuest('설거지하기', history).category).toBe('HEART')
  })

  it('같은 제목이 여러 번이면 가장 최근에 고른 값을 쓴다', () => {
    const history = [
      quest({ title: '정리하기', category: 'LIFE' }),
      quest({ title: '정리하기', category: 'MIND' }), // 나중에 만든 것
    ]
    expect(classifyQuest('정리하기', history).category).toBe('MIND')
  })
})

describe('suggestQuests', () => {
  it('기록이 없으면 기본 추천을 준다', () => {
    const result = suggestQuests([], new Date(2026, 0, 1, 9))
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((s) => s.reason === 'seed')).toBe(true)
  })

  it('자주 완료한 것이 맨 앞에 온다', () => {
    const history = [
      quest({ title: '설거지', completed: true, completedAt: '2026-01-01T00:00:00Z' }),
      quest({ title: '설거지', completed: true, completedAt: '2026-01-02T00:00:00Z' }),
      quest({ title: '설거지', completed: true, completedAt: '2026-01-03T00:00:00Z' }),
      quest({ title: '빨래', completed: true, completedAt: '2026-01-03T00:00:00Z' }),
    ]
    const result = suggestQuests(history)

    expect(result[0].title).toBe('설거지')
    expect(result[0].reason).toBe('often')
  })

  it('지금 남아 있는 퀘스트는 추천하지 않는다 — 중복으로 만들면 안 된다', () => {
    const history = [
      quest({ title: '설거지', completed: true, completedAt: '2026-01-01T00:00:00Z' }),
      quest({ title: '설거지', completed: false }), // 아직 안 한 게 남아 있다
    ]
    const result = suggestQuests(history)

    expect(result.some((s) => normalizeTitle(s.title) === '설거지')).toBe(false)
  })

  it('같은 제목을 두 번 추천하지 않는다', () => {
    const history = [
      quest({ title: '산책', completed: true, completedAt: '2026-01-01T00:00:00Z' }),
      quest({ title: '산책', completed: true, completedAt: '2026-01-02T00:00:00Z' }),
    ]
    const titles = suggestQuests(history).map((s) => normalizeTitle(s.title))

    expect(new Set(titles).size).toBe(titles.length)
  })

  it('마지막에 고른 카테고리·난이도를 그대로 들고 온다', () => {
    const history = [
      quest({ title: '산책', category: 'LIFE', difficulty: 'EASY', completed: true }),
      quest({ title: '산책', category: 'BODY', difficulty: 'HARD', completed: true }),
    ]
    const found = suggestQuests(history).find((s) => s.title === '산책')

    expect(found).toMatchObject({ category: 'BODY', difficulty: 'HARD' })
  })

  it('아직 안 끝낸 퀘스트는 추천하지 않는다', () => {
    // 완료한 적 없다는 건 지금 목록에 남아 있다는 뜻이라 추천할 이유가 없다
    const history = [quest({ title: '한 번도 안 한 일' })]
    const found = suggestQuests(history).find((s) => s.title === '한 번도 안 한 일')

    expect(found).toBeUndefined()
  })
})

describe('조사', () => {
  it('받침이 있으면 은 · 없으면 는', () => {
    expect(withJosa('책상', '은', '는')).toBe('책상은')
    expect(withJosa('의자', '은', '는')).toBe('의자는')
    expect(withJosa('러그', '은', '는')).toBe('러그는')
    expect(withJosa('플로어 체어', '은', '는')).toBe('플로어 체어는')
    expect(withJosa('별빛 화분', '은', '는')).toBe('별빛 화분은')
  })

  it('이/가 도 된다', () => {
    expect(withJosa('모빌', '이', '가')).toBe('모빌이')
    expect(withJosa('의자', '이', '가')).toBe('의자가')
  })

  it('한글이 아니면 받침 없는 쪽', () => {
    expect(withJosa('Moon Globe', '은', '는')).toBe('Moon Globe는')
  })
})
