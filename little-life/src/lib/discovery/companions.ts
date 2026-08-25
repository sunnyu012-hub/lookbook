import type {
  AppState,
  CompanionDef,
  CompanionId,
  CompanionMemoryDef,
  CompanionMeeting,
  CompanionView,
} from '@/types'
import { AREA_IDS } from '@/types'
import { findArea } from '@/lib/rpg/content'
import { CATEGORY_LABEL } from '@/lib/labels'
import { conditionProgress, findSecret } from './secrets'
import { findChapter } from './stories'

/**
 * 같이 지내는 작은 것들.
 *
 * ── 키우는 게 아니다 ────────────────────────────────
 *
 * 밥을 안 줬다고 배고파하지 않는다. 병들지 않는다. 도망가지 않는다. 죽지 않는다.
 * 그런 걸 넣는 순간 이건 동료가 아니라 매일 체크해야 하는 알림이 된다.
 * 며칠 안 열어보고 돌아와도 그 자리에 그대로 있다.
 *
 * ── 친밀도는 내려가지 않는다 ────────────────────────
 *
 * 시간이 지나서 줄어드는 값이 하나도 없다.
 * 안 만나면 그냥 안 오르는 것뿐이다.
 *
 * ── 그림 ────────────────────────────────────────────
 *
 * 자세가 여덟 개씩 있다 (public/assets/companions/<art>/<자세>.webp).
 * 화면에서 쓰는 건 idle 과 walk 두 개다 — 나머지는 나중에 쓸 자리가 생기면 쓴다.
 *
 * 자세 이름은 줄마다 실제 그림을 보고 붙였다. 고양이 다섯 번째는
 * 자는 게 아니라 기지개라서 stretch 고, 자는 건 여섯 번째다.
 * (scripts/extract-companions.py)
 *
 * 이모지는 그림이 안 뜨는 동안 자리를 지킨다.
 */

export const COMPANIONS: CompanionDef[] = [
  {
    id: 'BORI',
    art: 'bori',
    name: '보리',
    species: '강아지',
    personality: '누가 오면 제일 먼저 안다.',
    avatar: '🐕',
    favoriteAreas: ['GREEN_PARK', 'HOME_BASE'],
    meeting: { kind: 'AREA_ACTIVITY', areaId: 'GREEN_PARK', count: 12 },
    hint: '공원에서 자꾸 같은 자리에 앉아 있는 애가 보인다.',
    reveal: '이번엔 도망 안 가고 그냥 옆에 앉는다.',
    collectibleIds: ['picnic_mat', 'wood_bench', 'water_bottle'],
  },
  {
    id: 'MOCHI',
    art: 'mochi',
    name: '모찌',
    species: '고양이',
    personality: '부르면 오긴 오는데 천천히 온다.',
    avatar: '🐈',
    favoriteAreas: ['HOME_BASE', 'CAFE_STREET'],
    meeting: { kind: 'CATEGORY_QUESTS', category: 'LIFE', count: 25 },
    hint: '창밖 난간에 뭐가 앉았다 간 자국이 있다.',
    reveal: '오늘은 안 도망가고 창턱에 자리를 잡았다.',
    collectibleIds: ['cat_cushion', 'cat_paw_rug', 'cat_lamp'],
  },
  {
    id: 'BEAN',
    art: 'bean',
    name: '콩',
    species: '작은 새',
    personality: '뭐든 일단 가까이 와서 본다.',
    avatar: '🐤',
    favoriteAreas: ['GREEN_PARK', 'CREATIVE_DISTRICT'],
    meeting: { kind: 'SECRET', secretId: 'ROOFTOP_GARDEN' },
    hint: '어디선가 계속 같은 소리가 난다.',
    reveal: '화분 사이에서 뭔가 폴짝 나온다.',
    collectibleIds: ['sprout_jar', 'window_ivy', 'small_frame'],
  },
  {
    id: 'LUNA',
    art: 'luna',
    name: '루나',
    species: '모르겠다',
    personality: '밤에만 보인다. 낮에는 어디 있는지 모른다.',
    avatar: '🌛',
    favoriteAreas: ['NIGHT_TOWN'],
    meeting: { kind: 'SECRET', secretId: 'MOON_ALLEY' },
    hint: '골목 안쪽에서 뭔가 이쪽을 보고 있는 것 같다.',
    reveal: '가까이 가도 안 사라진다.',
    collectibleIds: ['moondust_jar', 'stardust_jar', 'little_moon'],
  },
]

export function findCompanion(id: string): CompanionDef | null {
  return COMPANIONS.find((c) => c.id === id) ?? null
}

/**
 * 같이 지내다 남는 것.
 *
 * 친밀도가 오르면 하나씩 열린다. 읽는 것 말고 할 일은 없다.
 */
export const COMPANION_MEMORIES: CompanionMemoryDef[] = [
  {
    id: 'BORI_1',
    companionId: 'BORI',
    atFriendship: 5,
    title: '처음 공원에 간 날',
    text: '앞서 걷다가 자꾸 뒤를 돌아봤다. 따라오는지 보는 것 같았다.',
  },
  {
    id: 'BORI_2',
    companionId: 'BORI',
    atFriendship: 15,
    title: '비 오던 오후',
    text: '처마 밑에서 같이 비가 그치기를 기다렸다. 그냥 그것뿐이었다.',
  },
  {
    id: 'BORI_3',
    companionId: 'BORI',
    atFriendship: 30,
    title: '집까지 따라온 날',
    text: '문 앞까지 오더니 들어오지는 않고 앉아 있었다.',
  },
  {
    id: 'MOCHI_1',
    companionId: 'MOCHI',
    atFriendship: 5,
    title: '창턱을 내준 날',
    text: '해가 제일 잘 드는 자리를 차지하고 안 비켜줬다.',
  },
  {
    id: 'MOCHI_2',
    companionId: 'MOCHI',
    atFriendship: 15,
    title: '청소하는 걸 지켜본 날',
    text: '도와주지는 않고 계속 보고만 있었다.',
  },
  {
    id: 'MOCHI_3',
    companionId: 'MOCHI',
    atFriendship: 30,
    title: '무릎에 올라온 날',
    text: '십 분쯤 있다가 아무 일 없었다는 듯 내려갔다.',
  },
  {
    id: 'BEAN_1',
    companionId: 'BEAN',
    atFriendship: 5,
    title: '옥상에서 만난 날',
    text: '화분 사이를 뛰어다니다가 이쪽을 한참 봤다.',
  },
  {
    id: 'BEAN_2',
    companionId: 'BEAN',
    atFriendship: 15,
    title: '손에 앉은 날',
    text: '아주 잠깐이었다. 생각보다 가벼웠다.',
  },
  {
    id: 'BEAN_3',
    companionId: 'BEAN',
    atFriendship: 30,
    title: '따라나선 날',
    text: '옥상을 나와서도 한참 위에서 같이 갔다.',
  },
  {
    id: 'LUNA_1',
    companionId: 'LUNA',
    atFriendship: 5,
    title: '밤시장에 처음 간 날',
    text: '가게 사이를 앞서 걸었다. 길을 아는 것 같았다.',
  },
  {
    id: 'LUNA_2',
    companionId: 'LUNA',
    atFriendship: 15,
    title: '아무 말 없던 밤',
    text: '한참 걷다가 돌아왔다. 그날은 그게 전부였다.',
  },
  {
    id: 'LUNA_3',
    companionId: 'LUNA',
    atFriendship: 30,
    title: '낮에 한 번 본 것 같은 날',
    text: '분명 봤다고 생각했는데 다시 보니 없었다.',
  },
]

/** 이 아이를 만날 조건에 지금 얼마나 왔는지 (0~1) */
export function meetingProgress(state: AppState, m: CompanionMeeting): number {
  switch (m.kind) {
    case 'AREA_ACTIVITY':
      return Math.min(1, (state.reputation[m.areaId] ?? 0) / m.count)
    case 'SECRET':
      return state.discovery.foundSecretIds.includes(m.secretId) ? 1 : 0
    case 'STORY':
      return state.discovery.readChapterIds.includes(m.chapterId) ? 1 : 0
    case 'CATEGORY_QUESTS':
      return conditionProgress(state, {
        kind: 'CATEGORY_QUESTS',
        category: m.category,
        count: m.count,
      })
  }
}

export function hasMet(state: AppState, id: CompanionId): boolean {
  return state.discovery.companions[id] !== undefined
}

export function companionViews(state: AppState): CompanionView[] {
  return COMPANIONS.map((def) => {
    const companionState = state.discovery.companions[def.id] ?? null
    return {
      def,
      state: companionState,
      met: companionState !== null,
      active: state.discovery.activeCompanionId === def.id,
      memories: companionState ? unlockedMemories(def.id, companionState.friendship) : [],
    }
  })
}

/** 이만큼 친해져서 열린 기억들 */
export function unlockedMemories(id: CompanionId, friendship: number): CompanionMemoryDef[] {
  return COMPANION_MEMORIES.filter((m) => m.companionId === id && friendship >= m.atFriendship)
}

/** 이 아이의 기억 전부 (잠긴 것 포함) */
export function memoriesOf(id: CompanionId): CompanionMemoryDef[] {
  return COMPANION_MEMORIES.filter((m) => m.companionId === id).sort(
    (a, b) => a.atFriendship - b.atFriendship,
  )
}

/**
 * 이 아이를 어떻게 만나는지 한 줄로.
 *
 * 안내 화면에서 쓴다. 조건을 손으로 다시 적지 않고 여기서 만들어낸다 —
 * 적어두면 조건을 바꿨을 때 안내만 옛말이 되고, 그건 없는 것보다 나쁘다.
 */
export function meetingLabel(m: CompanionMeeting): string {
  switch (m.kind) {
    case 'AREA_ACTIVITY':
      return `${findArea(m.areaId).name}에서 평판 ${m.count}`
    case 'CATEGORY_QUESTS':
      return `${CATEGORY_LABEL[m.category]} 퀘스트 ${m.count}개`
    case 'SECRET':
      return `${findSecret(m.secretId)?.name ?? '어딘가'} 찾기`
    case 'STORY':
      return `${findChapter(m.chapterId)?.title ?? '어떤 이야기'} 읽기`
  }
}

/** 지금 만날 수 있게 된 아이들 (아직 안 만난) */
export function newlyMeetable(state: AppState): CompanionDef[] {
  return COMPANIONS.filter((def) => !hasMet(state, def.id) && meetingProgress(state, def.meeting) >= 1)
}

/** 낌새만 있는 아이들 — 절반쯤 왔을 때 흘린다 */
export function hintedCompanions(state: AppState): CompanionDef[] {
  return COMPANIONS.filter((def) => {
    if (hasMet(state, def.id)) return false
    const p = meetingProgress(state, def.meeting)
    return p >= 0.6 && p < 1
  })
}

/** 지금 같이 다니는 아이 */
export function activeCompanion(state: AppState): CompanionDef | null {
  const id = state.discovery.activeCompanionId
  return id ? findCompanion(id) : null
}

/**
 * 오늘 이 아이가 좋아하는 동네에 있는지.
 *
 * 좋아하는 곳에 같이 가면 조금 더 친해진다.
 * 안 간다고 줄어들지는 않는다.
 */
export function likesHere(def: CompanionDef, areaId: string): boolean {
  return def.favoriteAreas.includes(areaId as (typeof AREA_IDS)[number])
}

/**
 * 동료 그림 한 장.
 *
 * idle 은 어디에나 있고, walk 는 같이 다닐 때 쓴다.
 * 없는 자세를 부르면 idle 로 돌아간다 — 줄마다 있는 자세가 조금씩 다르다.
 */
export function companionArt(def: CompanionDef, pose: CompanionPose = 'idle'): string {
  return `/assets/companions/${def.art}/${pose}.webp`
}

/** 어느 동료에게나 있는 자세 */
export type CompanionPose = 'idle' | 'walk' | 'sleep' | 'back'

/** 인사할 때 오르는 친밀도 */
export const PLAY_FRIENDSHIP = 2
/** 좋아하는 동네에서 만나면 더 */
export const PLAY_FRIENDSHIP_FAVORITE = 3
