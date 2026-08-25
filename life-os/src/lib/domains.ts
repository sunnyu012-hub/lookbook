/**
 * LIFE DOMAIN — 삶의 8개 영역.
 *
 * 이건 능력치가 아니다. "최근 내가 어느 쪽에 시간을 쓰고 살았나" 를 보여 주는 분포다.
 * 그래서 여기 어디에도 목표치나 만점이 없고, 낮은 영역을 부족하다고 말하지 않는다.
 *
 * XP 와는 다른 개념이다.
 *   XP        — 앱을 쓰고 나를 돌본 것에 대한 게임 보상
 *   LIFE DOMAIN — 그날의 기록이 어느 영역에 쌓였는지에 대한 분포
 * 퀘스트를 많이 한다고 Domain 점수가 "좋아지는" 게 아니라, 그 영역의 기록이 쌓일 뿐이다.
 */
import { effects as fx, icons, type PixelAsset } from './pixelAssets'

export type LifeDomain =
  | 'recovery'
  | 'body'
  | 'nourish'
  | 'mind'
  | 'home'
  | 'create'
  | 'connect'
  | 'joy'

/** 영역 → 쌓인 값. 값이 없는 영역은 키가 없다 (0 과 "기록 없음" 을 구분한다) */
export type DomainWeights = Partial<Record<LifeDomain, number>>

export interface DomainMeta {
  key: LifeDomain
  label: string
  ko: string
  /** 이 영역이 무엇을 담는지 — 화면에서 그대로 보여 준다 */
  about: string
  icon: PixelAsset
  tint: string
  accent: string
}

export const DOMAINS: DomainMeta[] = [
  {
    key: 'recovery',
    label: 'RECOVERY',
    ko: '회복',
    about: '잠 · 휴식 · 느린 시간 · 긴장 풀기',
    icon: icons.sleep,
    tint: '#EFE9FB',
    accent: '#8B76C9',
  },
  {
    key: 'body',
    label: 'BODY',
    ko: '몸',
    about: '몸 상태 · 움직임 · 운동 · 클라이밍 · 걷기',
    icon: icons.body,
    tint: '#E6F4EA',
    accent: '#7DB994',
  },
  {
    key: 'nourish',
    label: 'NOURISH',
    ko: '채우기',
    about: '식사 · 수분 · 기본적인 몸 돌봄',
    icon: icons.food,
    tint: '#FDEBDC',
    accent: '#E79A66',
  },
  {
    key: 'mind',
    label: 'MIND',
    ko: '마음',
    about: '기분 · 스트레스 · 집중 · 돌아보기',
    icon: icons.mood,
    tint: '#FDE7EC',
    accent: '#DE7E92',
  },
  {
    key: 'home',
    label: 'HOME',
    ko: '공간',
    about: '청소 · 정리 · 집안일 · 사는 공간 돌보기',
    icon: icons.home,
    tint: '#F3EAE0',
    accent: '#9C7767',
  },
  {
    key: 'create',
    label: 'CREATE',
    ko: '만들기',
    about: '일 · 아이디어 · 프로젝트 · 스타일 · 기록',
    icon: icons.work,
    tint: '#EFF1FB',
    accent: '#7B7FC0',
  },
  {
    key: 'connect',
    label: 'CONNECT',
    ko: '연결',
    about: '연애 · 친구 · 가족 · 대화 · 함께한 기억',
    icon: fx.heartBubble,
    tint: '#FDEFF3',
    accent: '#DE7E92',
  },
  {
    key: 'joy',
    label: 'JOY',
    ko: '즐거움',
    about: '취미 · 게임 · 사진 · 새로운 곳 · 작은 재미',
    icon: fx.rainbow,
    tint: '#FDF4D6',
    accent: '#DFB63F',
  },
]

export const DOMAIN_META: Record<LifeDomain, DomainMeta> = Object.fromEntries(
  DOMAINS.map((d) => [d.key, d]),
) as Record<LifeDomain, DomainMeta>

export const DOMAIN_KEYS: LifeDomain[] = DOMAINS.map((d) => d.key)

export const isDomain = (v: string): v is LifeDomain =>
  (DOMAIN_KEYS as string[]).includes(v)

// ─────────────────────────────────────────────
// 매핑 상수
//
// 원래 quests/domains.ts 에 있었지만, 영역 매핑은 퀘스트만의 개념이 아니다.
// 이벤트 태그도, 앞으로의 Quick Log 도 같은 규칙으로 영역에 쌓인다.
// Quest 가 사라져도 Life Balance 가 살아 있어야 하므로 여기로 옮겼다.
// ─────────────────────────────────────────────

/** 주 영역 1.0 / 보조 영역 0.5 */
export const PRIMARY_VALUE = 1
export const SECONDARY_VALUE = 0.5

/** 한 행동은 최대 2개 영역까지만 연결한다 */
export interface DomainMapping {
  primary: LifeDomain
  secondary?: LifeDomain
}

/** 매핑 하나를 분포로 편다 */
export function weightsOf(m: DomainMapping): DomainWeights {
  const out: DomainWeights = { [m.primary]: PRIMARY_VALUE }
  if (m.secondary) out[m.secondary] = SECONDARY_VALUE
  return out
}

/** 두 분포를 더한다. 한쪽에만 있는 키도 살린다. */
export function addWeights(a: DomainWeights, b: DomainWeights): DomainWeights {
  const out: DomainWeights = { ...a }
  for (const [k, v] of Object.entries(b) as [LifeDomain, number][]) {
    out[k] = (out[k] ?? 0) + v
  }
  return out
}

export function sumWeights(list: DomainWeights[]): DomainWeights {
  return list.reduce<DomainWeights>((acc, w) => addWeights(acc, w), {})
}

export const totalWeight = (w: DomainWeights) =>
  Object.values(w).reduce<number>((s, n) => s + n, 0)

/** 값이 큰 순서로. 값이 0 이거나 없는 영역은 빼고 준다. */
export function rankDomains(w: DomainWeights): { key: LifeDomain; value: number }[] {
  return (Object.entries(w) as [LifeDomain, number][])
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
}

/** 한 줄로 쓰기 좋은 라벨 (RECOVERY · 회복) */
export const domainLabel = (key: LifeDomain) => DOMAIN_META[key].label
