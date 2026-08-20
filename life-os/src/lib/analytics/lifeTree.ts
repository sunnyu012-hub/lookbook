/**
 * MY LIFE TREE — 내 삶의 지도.
 *
 * Skill Tree 가 아니다.
 *   · 공략해서 능력치를 올리는 게 아니라, 살아온 기록에 따라 저절로 발견된다.
 *   · Node 는 XP 로 열리지 않는다. 그 영역의 기록이 실제로 쌓였을 때 열린다.
 *   · 단계는 실력이 아니라 "이 영역에 기록이 얼마나 쌓였나" 를 뜻한다.
 *
 * My Manual 과의 관계:
 *   Life Tree 는 지도, My Manual 은 그 지도에서 발견한 나에 대한 설명이다.
 *   Pattern 이 충분히 쌓인 Node 는 manualKey 로 Manual 챕터를 가리킨다.
 */
import type { Checkin, LifeEvent, MounjaroLog, NightCheckout, WeightLog } from '@/types'
import { DOMAIN_META, type LifeDomain } from '../domains'
import { domainsOfQuest } from '../quests/domains'
import { questById, type DayQuests } from '../quests/master'
import type { Quest } from '../quests/types'
import type { PixelAsset } from '../pixelAssets'
import { effects as fx, gear, icons, items, pets } from '../pixelAssets'

export type NodeStatus = 'HIDDEN' | 'DISCOVERED' | 'GROWING' | 'KNOWN' | 'DEEP'

/** 단계가 올라가는 기준 배수 — need 의 몇 배가 쌓였는가 */
export const STAGE_STEPS = { growing: 2.5, known: 6, deep: 12 } as const

export const STATUS_LABEL: Record<NodeStatus, string> = {
  HIDDEN: '???',
  DISCOVERED: 'DISCOVERED',
  GROWING: 'GROWING',
  KNOWN: 'KNOWN',
  DEEP: 'DEEP',
}

export const STATUS_KO: Record<NodeStatus, string> = {
  HIDDEN: '아직 발견 전',
  DISCOVERED: '막 발견했어요',
  GROWING: '기록이 쌓이는 중',
  KNOWN: '이제 꽤 알겠어요',
  DEEP: '아주 많이 쌓였어요',
}

/** 무엇을 세서 이 Node 를 열 것인가 */
export type CountKind =
  | 'quest-domain' // 이 영역의 퀘스트 완료 횟수
  | 'event-tag' // 특정 이벤트 태그를 적은 날
  | 'checkin-field' // 체크인의 어떤 값을 적은 날
  | 'checkin-flag' // 체크인의 boolean 이 켜진 날
  | 'night' // 밤 기록
  | 'life-category' // 라이프 이벤트 카테고리
  | 'weight'
  | 'mounjaro'
  | 'context-note'
  | 'weekly-reset'

export interface TreeNodeDef {
  key: string
  /** 최상위 8개 영역은 parent 가 없다 */
  parent: string | null
  domain: LifeDomain
  title: string
  ko: string
  icon: PixelAsset
  /** 열리기까지 필요한 개수 */
  need: number
  count: CountKind
  /** count 종류에 따른 대상 (태그 이름, 필드 이름 등) */
  target?: string
  /** 이 Node 에 연결된 My Manual 챕터 key */
  manualKey?: string
}

/** 8개 가지 — 영역 자체는 첫 기록이 생기면 바로 보인다 */
const BRANCHES: TreeNodeDef[] = (
  [
    ['recovery', icons.sleep],
    ['body', icons.body],
    ['nourish', icons.food],
    ['mind', icons.mood],
    ['home', icons.home],
    ['create', icons.work],
    ['connect', fx.heartBubble],
    ['joy', fx.rainbow],
  ] as [LifeDomain, PixelAsset][]
).map(([domain, icon]) => ({
  key: domain,
  parent: null,
  domain,
  title: DOMAIN_META[domain].label,
  ko: DOMAIN_META[domain].ko,
  icon,
  need: 3,
  count: 'quest-domain' as CountKind,
  target: domain,
}))

/** 가지에 달리는 잎들 */
const LEAVES: TreeNodeDef[] = [
  // ── RECOVERY
  { key: 'sleep', parent: 'recovery', domain: 'recovery', title: 'SLEEP', ko: '잠', icon: icons.sleep, need: 8, count: 'checkin-field', target: 'sleepHours', manualKey: 'sleep' },
  { key: 'rest', parent: 'recovery', domain: 'recovery', title: 'REST', ko: '쉬는 시간', icon: pets.catCurl, need: 6, count: 'quest-domain', target: 'recovery' },
  { key: 'evening', parent: 'recovery', domain: 'recovery', title: 'EVENING', ko: '저녁', icon: fx.zzzBubble, need: 8, count: 'night' },
  { key: 'recovery-pattern', parent: 'recovery', domain: 'recovery', title: 'MY RECOVERY PATTERN', ko: '내 회복 패턴', icon: fx.sparkle01, need: 14, count: 'checkin-field', target: 'sleepHours', manualKey: 'sleep' },

  // ── BODY
  { key: 'movement', parent: 'body', domain: 'body', title: 'MOVEMENT', ko: '움직임', icon: gear.sneakers, need: 5, count: 'checkin-flag', target: 'exercise', manualKey: 'activity' },
  { key: 'climbing', parent: 'body', domain: 'body', title: 'CLIMBING', ko: '클라이밍', icon: icons.climbing, need: 3, count: 'event-tag', target: '클라이밍' },
  { key: 'walking', parent: 'body', domain: 'body', title: 'WALKING', ko: '걷기', icon: gear.sneakers, need: 3, count: 'event-tag', target: '걷기' },
  { key: 'stretch', parent: 'body', domain: 'body', title: 'STRETCH', ko: '스트레칭', icon: icons.exercise, need: 3, count: 'event-tag', target: '스트레칭' },
  { key: 'body-awareness', parent: 'body', domain: 'body', title: 'BODY AWARENESS', ko: '몸 감각', icon: icons.body, need: 12, count: 'checkin-field', target: 'bodyPain', manualKey: 'body' },

  // ── NOURISH
  { key: 'meals', parent: 'nourish', domain: 'nourish', title: 'MEALS', ko: '끼니', icon: items.onigiri, need: 8, count: 'checkin-field', target: 'mealsCount', manualKey: 'food' },
  { key: 'water', parent: 'nourish', domain: 'nourish', title: 'WATER', ko: '물', icon: icons.water, need: 6, count: 'quest-domain', target: 'nourish' },
  { key: 'appetite', parent: 'nourish', domain: 'nourish', title: 'APPETITE', ko: '식욕', icon: icons.appetite, need: 10, count: 'checkin-field', target: 'appetite', manualKey: 'food' },
  { key: 'fuel-pattern', parent: 'nourish', domain: 'nourish', title: 'MY FUEL PATTERN', ko: '내 연료 패턴', icon: fx.sparkle02, need: 16, count: 'checkin-field', target: 'appetite', manualKey: 'food' },

  // ── MIND
  { key: 'mood', parent: 'mind', domain: 'mind', title: 'MOOD', ko: '기분', icon: icons.mood, need: 8, count: 'checkin-field', target: 'mood', manualKey: 'mind' },
  { key: 'focus', parent: 'mind', domain: 'mind', title: 'FOCUS', ko: '집중', icon: icons.focus, need: 8, count: 'checkin-field', target: 'focus' },
  { key: 'stress', parent: 'mind', domain: 'mind', title: 'STRESS', ko: '스트레스', icon: fx.cloud, need: 8, count: 'checkin-field', target: 'stress', manualKey: 'mind' },
  { key: 'journal', parent: 'mind', domain: 'mind', title: 'JOURNAL', ko: '한 줄 일기', icon: icons.log, need: 5, count: 'night' },
  { key: 'self-reflection', parent: 'mind', domain: 'mind', title: 'SELF REFLECTION', ko: '돌아보기', icon: fx.sparkle01, need: 3, count: 'weekly-reset' },
  { key: 'mind-pattern', parent: 'mind', domain: 'mind', title: 'MY MIND PATTERN', ko: '내 마음 패턴', icon: fx.flower, need: 14, count: 'checkin-field', target: 'mood', manualKey: 'mind' },

  // ── HOME
  { key: 'cleaning', parent: 'home', domain: 'home', title: 'CLEANING', ko: '청소', icon: icons.clean, need: 5, count: 'quest-domain', target: 'home' },
  { key: 'organizing', parent: 'home', domain: 'home', title: 'ORGANIZING', ko: '정리', icon: icons.save, need: 10, count: 'quest-domain', target: 'home' },
  { key: 'cozy-home', parent: 'home', domain: 'home', title: 'COZY HOME', ko: '포근한 집', icon: fx.stringLights, need: 18, count: 'quest-domain', target: 'home' },

  // ── CREATE
  { key: 'ideas', parent: 'create', domain: 'create', title: 'IDEAS', ko: '아이디어', icon: fx.sparkle02, need: 5, count: 'quest-domain', target: 'create' },
  { key: 'work', parent: 'create', domain: 'create', title: 'WORK', ko: '일', icon: icons.work, need: 5, count: 'checkin-field', target: 'workHours' },
  { key: 'projects', parent: 'create', domain: 'create', title: 'PROJECTS', ko: '프로젝트', icon: icons.log, need: 4, count: 'life-category', target: 'work' },
  { key: 'style', parent: 'create', domain: 'create', title: 'STYLE', ko: '스타일', icon: icons.outfit, need: 5, count: 'event-tag', target: '옷 꾸밈' },
  { key: 'content', parent: 'create', domain: 'create', title: 'CONTENT', ko: '만든 것', icon: icons.camera, need: 3, count: 'event-tag', target: '콘텐츠 제작' },

  // ── CONNECT
  { key: 'love', parent: 'connect', domain: 'connect', title: 'LOVE', ko: '사랑', icon: fx.heart, need: 4, count: 'life-category', target: 'love' },
  { key: 'date', parent: 'connect', domain: 'connect', title: 'DATE', ko: '데이트', icon: fx.heartBubble, need: 3, count: 'event-tag', target: '데이트' },
  { key: 'friends', parent: 'connect', domain: 'connect', title: 'FRIENDS', ko: '친구', icon: icons.camera, need: 3, count: 'event-tag', target: '친구 만남' },
  { key: 'family', parent: 'connect', domain: 'connect', title: 'FAMILY', ko: '가족', icon: icons.home, need: 3, count: 'event-tag', target: '가족' },
  { key: 'memories', parent: 'connect', domain: 'connect', title: 'MEMORIES', ko: '기억', icon: fx.sparkle01, need: 8, count: 'life-category', target: 'love' },

  // ── JOY
  { key: 'hobby', parent: 'joy', domain: 'joy', title: 'HOBBY', ko: '취미', icon: icons.music, need: 3, count: 'event-tag', target: '취미' },
  { key: 'game', parent: 'joy', domain: 'joy', title: 'GAME', ko: '게임', icon: icons.energy, need: 3, count: 'event-tag', target: '게임' },
  { key: 'photo', parent: 'joy', domain: 'joy', title: 'PHOTO', ko: '사진', icon: icons.camera, need: 3, count: 'event-tag', target: '사진 찍음' },
  { key: 'new-place', parent: 'joy', domain: 'joy', title: 'NEW PLACE', ko: '새로운 곳', icon: fx.rainbow, need: 2, count: 'event-tag', target: '새로운 장소' },
  { key: 'small-joy', parent: 'joy', domain: 'joy', title: 'SMALL JOY', ko: '작은 즐거움', icon: fx.flower, need: 10, count: 'quest-domain', target: 'joy' },
]

export const TREE_NODES: TreeNodeDef[] = [...BRANCHES, ...LEAVES]

// ─────────────────────────────────────────────
// 계산
// ─────────────────────────────────────────────

export interface TreeInput {
  checkins: Checkin[]
  nights: NightCheckout[]
  lifeEvents: LifeEvent[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  eventLog: Record<string, string[]>
  questLog: Record<string, DayQuests>
  customQuests?: Quest[]
  weeklyResets?: { weekStart: string }[]
}

export interface TreeNode extends TreeNodeDef {
  have: number
  status: NodeStatus
  /** 0~1 — 다음 단계까지 */
  progress: number
  children: TreeNode[]
}

export interface LifeTree {
  branches: TreeNode[]
  discovered: number
  total: number
  /** 이번에 새로 열린 Node (알림에 쓴다) */
  newlyDiscovered: string[]
}

/** count 종류별로 실제 개수를 센다 */
function countFor(def: TreeNodeDef, input: TreeInput): number {
  switch (def.count) {
    case 'quest-domain': {
      const custom = input.customQuests ?? []
      let n = 0
      for (const day of Object.values(input.questLog)) {
        for (const [id, times] of Object.entries(day.completions)) {
          const quest = questById(id, custom)
          if (!quest) continue
          const w = domainsOfQuest(quest)
          if (w[def.target as LifeDomain]) n += times
        }
      }
      return n
    }
    case 'event-tag':
      return Object.values(input.eventLog).filter((tags) => tags.includes(def.target ?? '')).length
    case 'checkin-field':
      return input.checkins.filter(
        (c) => (c as unknown as Record<string, unknown>)[def.target ?? ''] != null,
      ).length
    case 'checkin-flag':
      return input.checkins.filter(
        (c) => (c as unknown as Record<string, unknown>)[def.target ?? ''] === true,
      ).length
    case 'night':
      return input.nights.length
    case 'life-category':
      return input.lifeEvents.filter((e) => e.category === def.target).length
    case 'weight':
      return input.weights.length
    case 'mounjaro':
      return input.mounjaro.length
    case 'context-note':
      return input.checkins.filter((c) => Boolean(c.contextNote?.trim())).length
    case 'weekly-reset':
      return input.weeklyResets?.length ?? 0
  }
}

export function statusOf(have: number, need: number): NodeStatus {
  if (have < need) return 'HIDDEN'
  if (have >= need * STAGE_STEPS.deep) return 'DEEP'
  if (have >= need * STAGE_STEPS.known) return 'KNOWN'
  if (have >= need * STAGE_STEPS.growing) return 'GROWING'
  return 'DISCOVERED'
}

/** 다음 단계까지 얼마나 왔는지 0~1 */
function progressOf(have: number, need: number, status: NodeStatus): number {
  if (status === 'HIDDEN') return Math.min(1, have / need)
  if (status === 'DEEP') return 1
  const next =
    status === 'DISCOVERED'
      ? need * STAGE_STEPS.growing
      : status === 'GROWING'
        ? need * STAGE_STEPS.known
        : need * STAGE_STEPS.deep
  const prev =
    status === 'DISCOVERED'
      ? need
      : status === 'GROWING'
        ? need * STAGE_STEPS.growing
        : need * STAGE_STEPS.known
  return Math.max(0, Math.min(1, (have - prev) / (next - prev)))
}

export function buildLifeTree(input: TreeInput): LifeTree {
  const byKey = new Map<string, TreeNode>()

  for (const def of TREE_NODES) {
    const have = countFor(def, input)
    const status = statusOf(have, def.need)
    byKey.set(def.key, {
      ...def,
      have,
      status,
      progress: progressOf(have, def.need, status),
      children: [],
    })
  }

  const branches: TreeNode[] = []
  for (const node of byKey.values()) {
    if (node.parent === null) branches.push(node)
    else byKey.get(node.parent)?.children.push(node)
  }

  // 가지는 자기 기록이 없어도 잎이 하나라도 열렸으면 같이 열어 준다
  for (const branch of branches) {
    if (branch.status === 'HIDDEN' && branch.children.some((c) => c.status !== 'HIDDEN')) {
      branch.status = 'DISCOVERED'
      branch.progress = 1
    }
  }

  const all = [...byKey.values()]
  return {
    branches,
    discovered: all.filter((n) => n.status !== 'HIDDEN').length,
    total: all.length,
    newlyDiscovered: [],
  }
}

/** 열린 Node key 만 (새로 열린 것 알림용) */
export const openKeys = (tree: LifeTree): string[] =>
  tree.branches.flatMap((b) => [b, ...b.children]).filter((n) => n.status !== 'HIDDEN').map((n) => n.key)

const SEEN_KEY = 'life-os:tree-seen:v1'

/** 지난번에 본 뒤로 새로 열린 Node */
export function newlyOpened(tree: LifeTree): TreeNode[] {
  let seen: string[] = []
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
  } catch {
    seen = []
  }
  const set = new Set(seen)
  return tree.branches
    .flatMap((b) => [b, ...b.children])
    .filter((n) => n.status !== 'HIDDEN' && !set.has(n.key))
}

export function markTreeSeen(tree: LifeTree) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(openKeys(tree)))
  } catch {
    // 저장 실패는 그냥 넘어간다 — 다음에 다시 알려 주면 된다
  }
}
