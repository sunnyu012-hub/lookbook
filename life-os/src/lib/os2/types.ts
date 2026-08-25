/**
 * Life OS 2.0 — 데이터 모델.
 *
 * 새 핵심 루프:
 *   Mood → Quick Log → My Tags + Life Tags → 사용자 교정 → 개인 규칙
 *   → 통계 분석 → Pattern → Discovery → MY DNA
 *
 * Phase 1 은 이 모델들의 "모양" 만 만든다.
 * 태깅·학습·통계·판정은 각각 Phase 3·4·5·6 에서 붙인다.
 * 그래서 여기에는 계산 로직이 없다. 계산은 UI 가 아니라 lib/os2/ 아래 별도 모듈에 들어간다.
 *
 * 기존 CHECK-IN 과 QUICK LOG 는 합치지 않는다.
 *   CHECK-IN — 하루 한 번, 구조화된 컨디션 기록 (Checkin)
 *   QUICK LOG — 하루 여러 번, 순간 기록 (QuickLog)
 * 나중에 함께 분석하지만 저장은 끝까지 따로 둔다.
 */
import type { Versioned } from './versions'

// ─────────────────────────────────────────────
// QUICK LOG
// ─────────────────────────────────────────────

/** 기분 1(아주 나쁨) ~ 5(아주 좋음). Quick Log 의 유일한 필수값이다 */
export type Mood = 1 | 2 | 3 | 4 | 5

/** 하루를 나눈 시간대 — timestamp 에서 계산해 넣는다 */
export type DayPart = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'

/** 0=일요일 … 6=토요일 (JS Date.getDay 와 같다) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface QuickLogInput {
  /** 하나뿐인 필수값. 이모지 한 번 누르면 저장된다 */
  mood: Mood

  /** 아래는 전부 선택이다. 입력 폼을 복잡하게 만들지 않는다 */
  text?: string | null
  energy?: number | null
  focus?: number | null
  fatigue?: number | null
  /** 사진은 경로만 들고 있는다. 파일 자체는 Storage 에 둔다 */
  photoPath?: string | null

  /** 사용자가 직접 만들고 보는 태그 (MyTag.id) */
  myTagIds?: string[]

  /** 분석용 구조화 태그 — 시스템이 붙이고 사용자가 고칠 수 있다 */
  lifeTags?: AppliedLifeTag[]

  /** 사용자가 시각을 직접 고칠 수 있게 열어 둔다. 없으면 저장 시각 */
  loggedAt?: string
}

export interface QuickLog extends QuickLogInput, Versioned {
  id: string
  userId: string
  /** ISO 8601. 분석의 기준 시각 */
  loggedAt: string
  /** loggedAt 에서 계산해 저장한다 — 매번 다시 파싱하지 않으려고 */
  date: string
  dayOfWeek: DayOfWeek
  dayPart: DayPart
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// MY TAG — 사용자가 직접 만들고 보는 자유 태그
// ─────────────────────────────────────────────

export interface MyTagInput {
  name: string
  /** 목록에서 눈에 띄게 하려는 용도. 없으면 자동으로 고른다 */
  color?: string | null
  emoji?: string | null
  isFavorite?: boolean
}

export interface MyTag extends MyTagInput, Versioned {
  id: string
  userId: string
  /** 몇 번 썼는지 — 자주 쓰는 것을 위로 올린다 */
  useCount: number
  lastUsedAt: string | null
  /** 다른 태그로 합쳐진 경우 그 대상. 합쳐도 과거 기록은 지우지 않는다 */
  mergedIntoId?: string | null
  archivedAt?: string | null
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// LIFE TAG — 분석 엔진용 구조화 태그
//
// 사용자에게 완전히 숨기지 않는다. "분석 태그 보기" 로 펼쳐서 고칠 수 있다.
// Phase 3 에서 200~300개 사전을 만든다. 여기서는 담을 그릇만 정의한다.
// ─────────────────────────────────────────────

/** 태그가 어디서 붙었는지 — 사용자 교정이 언제나 가장 세다 */
export type TagSource = 'user' | 'rule' | 'keyword' | 'ai' | 'derived'

/** 사전에 정의된 태그 한 개 */
export interface LifeTagDef {
  /** 'emotion:joy' 같은 전체 키 */
  id: string
  categoryId: string
  subcategoryId?: string | null
  /** 카테고리 안에서의 키 ('joy') */
  key: string
  displayName: string
  description?: string | null
  /** 같은 뜻으로 쓰이는 말들 — 자동 태깅이 참고한다 */
  aliases?: string[]
  taxonomyVersion: number
}

/** 어떤 기록에 실제로 붙은 태그 */
export interface AppliedLifeTag {
  tagId: string
  source: TagSource
  /** 0~1. 사용자가 직접 붙였으면 1 */
  confidence: number
  /** 사용자가 "맞아요" 한 것 */
  userVerified?: boolean
  /** 사용자가 "아니에요" 한 것 — 지우지 않고 남겨서 학습에 쓴다 */
  userRejected?: boolean
  appliedAt: string
}

// ─────────────────────────────────────────────
// TAG CATEGORY — Life Tag 의 계층
//
// 카테고리를 코드 곳곳에 하드코딩하지 않는다. 여기 목록 하나만 고치면 된다.
// ─────────────────────────────────────────────

export interface TagCategory {
  id: string
  displayName: string
  ko: string
  description?: string | null
  /** 화면 정렬용 */
  sortOrder: number
  /** 상위 카테고리 — 2단계까지만 쓴다 */
  parentId?: string | null
}

// ─────────────────────────────────────────────
// USER TAG RULE — 사용자 교정에서 배운 개인 규칙
//
// 예: '원트' 가 클라이밍 문맥에서 여러 번 achievement 로 고쳐졌다면
//     다음부터 같은 문맥에서 자동으로 붙인다.
//
// Phase 1 에서는 모델만 둔다. 학습 엔진은 Phase 4.
// ─────────────────────────────────────────────

export interface RuleContext {
  /** 이 My Tag 들이 같이 있을 때만 */
  myTagIds?: string[]
  /** 이 Life Tag 들이 같이 있을 때만 */
  lifeTagIds?: string[]
  dayPart?: DayPart
  dayOfWeek?: DayOfWeek
}

export interface UserTagRule extends Versioned {
  id: string
  userId: string
  /** 무엇을 봤을 때 — 보통 본문에 나온 말 */
  trigger: string
  context: RuleContext
  /** 그래서 무슨 태그를 붙일 것인가 */
  resultingTagId: string
  /** 사용자가 같은 교정을 몇 번 했는지. 많을수록 세다 */
  correctionCount: number
  /** 0~1 */
  confidence: number
  lastUsedAt: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// ANALYSIS SNAPSHOT — 통계 결과 저장/캐시
//
// 매번 전부 다시 계산하면 기록이 수천 개가 됐을 때 느려진다.
// 계산 결과를 버전과 함께 남겨서 필요할 때만 다시 돌린다.
// Phase 1 에서는 실제 계산을 하지 않는다.
// ─────────────────────────────────────────────

export interface AnalysisPeriod {
  from: string
  to: string
  /** 이 기간에 실제로 있던 기록 수 */
  sampleCount: number
}

export interface AnalysisSnapshot extends Versioned {
  id: string
  userId: string
  /** 무엇을 봤는가 — 'mood-by-daypart' 같은 키 */
  metric: string
  /** 무엇과 비교했는가 — 'weekday-vs-weekend' 같은 키 */
  comparison?: string | null
  period: AnalysisPeriod
  /** 비교군 표본 수 */
  comparisonSampleCount?: number | null
  /** 평소값 */
  baseline: number | null
  /** 관찰된 값 */
  observedValue: number | null
  /** 차이의 크기 */
  effectSize: number | null
  /** 0~1 */
  confidence: number
  analysisVersion: number
  calculatedAt: string
}

// ─────────────────────────────────────────────
// DISCOVERY — MY DNA
// ─────────────────────────────────────────────

export type DiscoveryKind = 'BASIC' | 'HIDDEN' | 'RARE' | 'COMPOUND' | 'PERSONAL'

/**
 * LOCKED     아직 근거가 없음
 * EMERGING   경향이 나타나기 시작함
 * GROWING    여러 기간에 걸쳐 반복됨
 * ESTABLISHED 오래 안정적으로 나타남
 * CHANGING   최근에 약해지거나 뒤집힘
 */
export type DiscoveryState = 'LOCKED' | 'EMERGING' | 'GROWING' | 'ESTABLISHED' | 'CHANGING'

/** 앞으로 늘어난다. 코드에서 이 목록을 하드코딩해 분기하지 않는다 */
export type DiscoveryFamily =
  | 'rhythm'
  | 'energy'
  | 'emotion'
  | 'focus'
  | 'social'
  | 'body'
  | 'lifestyle'
  | 'compound'

/** 사전에 정의된 Discovery 한 칸 (Registry) */
export interface DiscoveryDef {
  id: string
  kind: DiscoveryKind
  family: DiscoveryFamily
  /** RARE 는 발견 전까지 존재 자체를 숨긴다 */
  hiddenUntilFound: boolean
  /** 기본 Collection 총 개수에 포함되는가 — RARE 는 빠진다 */
  countsTowardTotal: boolean
  displayName: string
  ko: string
  /** BASIC 은 잠겨 있어도 힌트를 보여 준다 */
  hint?: string | null
}

/** 사용자별 상태 */
export interface Discovery extends Versioned {
  id: string
  userId: string
  /** 사전에 없는 개인 특이 패턴이면 null (PERSONAL) */
  defId: string | null
  kind: DiscoveryKind
  family: DiscoveryFamily
  /** PERSONAL 은 이름을 따로 들고 있는다 */
  displayName: string
  description?: string | null
  state: DiscoveryState
  firstFoundAt: string | null
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 패턴이 바뀐 순간 — "예전엔 이랬는데 요즘은 이래요".
 * Discovery 를 덮어쓰지 않고 따로 남긴다. 변화 자체가 기록이기 때문이다.
 */
export interface DnaShift extends Versioned {
  id: string
  userId: string
  discoveryId: string
  fromState: DiscoveryState
  toState: DiscoveryState
  /** 무엇이 어떻게 달라졌는지 한 줄 */
  summary: string
  observedAt: string
  createdAt: string
}

// ─────────────────────────────────────────────
// DISCOVERY EVIDENCE — "왜 이렇게 분석했어요?"
//
// Discovery 와 반드시 분리해서 저장한다.
// Discovery 는 결론이고 Evidence 는 근거다. 결론이 바뀌어도 근거는 남는다.
// ─────────────────────────────────────────────

export interface DiscoveryEvidence extends Versioned {
  id: string
  userId: string
  discoveryId: string
  period: AnalysisPeriod
  comparisonSampleCount: number | null
  baseline: number | null
  observedValue: number | null
  effectSize: number | null
  /** 일부 이상치가 아니라 반복되는가 (0~1) */
  consistency: number | null
  /** 이 발견에 관련된 Life Tag */
  lifeTagIds: string[]
  /**
   * 교란 요인 확인 결과 — 시간대·요일·장소 같은 걸로 설명되는지.
   * 확인했는데 설명되지 않았다는 사실 자체가 근거다.
   */
  confounders: ConfounderCheck[]
  confidence: number
  analysisVersion: number
  calculatedAt: string
}

export interface ConfounderCheck {
  /** 'daypart' | 'weekday' | 'place' … */
  factor: string
  /** 이 요인으로 설명되는가 */
  explains: boolean
  note?: string | null
}

// ─────────────────────────────────────────────
// 공통
// ─────────────────────────────────────────────

/**
 * 표본이 모자라면 결론을 만들지 않는다.
 * 실제 판정은 Phase 5·6 에서 하지만, 기준은 한 곳에 모아 둔다.
 */
export const EVIDENCE_MINIMUM = {
  /** 관련 표본 */
  sample: 8,
  /** 비교군 표본 */
  comparisonSample: 8,
  /** 며칠에 걸쳐 관찰됐는가 */
  distinctDays: 5,
} as const
