import type { AppState, CharacterSkin, SkinCategory, SkinId, SkinUnlock, SkinView } from '@/types'
import { CHARACTER } from '@/lib/assets'
import type { CharacterMood } from '@/components/character/types'

/**
 * 열두 가지 모습.
 *
 * ── 조건을 정하면서 지킨 것 ────────────────────────────
 *
 * 하나. 전부 이미 하고 있는 것에서 나온다. 모습을 얻으려고 따로 해야 하는 일이 없다.
 * 둘.  숫자를 미리 알려주지 않는다. 힌트는 분위기만 말한다 —
 *      "몸 퀘스트 30개" 를 적어두면 그건 발견이 아니라 과제 목록이다.
 * 셋.  능력치가 없다. 오늘 마음에 드는 걸 입으면 된다.
 */

export const SKINS: CharacterSkin[] = [
  {
    id: 'basic_day',
    name: '베이직 데이',
    category: 'DAILY',
    rarity: 'COMMON',
    description: '아무 계획 없는 날에도 잘 어울리는 기본 모습.',
    tags: ['any', 'default'],
    unlock: { kind: 'DEFAULT' },
    hint: '',
    sortOrder: 1,
    // 처음부터 있던 네 자세를 그대로 쓴다. 기뻐하는 그림과 레벨업 그림이
    // 이 모습에만 있는 이유다 — 나머지 열한 벌은 아직 서 있는 한 장뿐이라
    // 그 순간에도 같은 그림으로 폴짝 뛴다.
    poses: {
      questClear: CHARACTER.questClear,
      levelUp: CHARACTER.levelUp,
      resting: CHARACTER.resting,
    },
  },
  {
    id: 'cozy_home',
    name: '코지 홈',
    category: 'DAILY',
    rarity: 'COMMON',
    description: '오늘은 집이 제일 좋은 날.',
    tags: ['home', 'rest', 'evening'],
    unlock: { kind: 'CATEGORY_QUESTS', category: 'LIFE', count: 10 },
    hint: '집안일을 자주 하는 사람에게 어울리는 모습.',
    sortOrder: 2,
  },
  {
    id: 'weekend_casual',
    name: '위켄드 캐주얼',
    category: 'DAILY',
    rarity: 'COMMON',
    description: '정해진 건 없고, 일단 나가보는 날.',
    tags: ['weekend', 'walk', 'day'],
    unlock: { kind: 'SHOP', price: 400 },
    hint: '어디 가게에서 본 것 같기도 하다.',
    sortOrder: 3,
  },
  {
    id: 'cafe_work',
    name: '카페 워크',
    category: 'DAILY',
    rarity: 'RARE',
    description: '커피 한 잔과 작은 집중.',
    tags: ['work', 'cafe', 'day'],
    unlock: { kind: 'AREA_REPUTATION', areaId: 'CAFE_STREET', value: 20 },
    hint: '카페 거리에 자주 가는 사람에게서 보이는 모습.',
    sortOrder: 4,
  },
  {
    id: 'climbing_day',
    name: '클라이밍 데이',
    category: 'ACTIVITY',
    rarity: 'RARE',
    description: '오늘은 벽을 조금 올라가볼까.',
    tags: ['body', 'outdoor', 'day'],
    unlock: { kind: 'CATEGORY_QUESTS', category: 'BODY', count: 30 },
    hint: '몸을 많이 움직이는 날에 어울리는 모습.',
    sortOrder: 5,
  },
  {
    id: 'creative_day',
    name: '크리에이티브 데이',
    category: 'ACTIVITY',
    rarity: 'RARE',
    description: '뭔가 만들고 싶은 기분.',
    tags: ['make', 'study', 'day'],
    unlock: { kind: 'AREA_REPUTATION', areaId: 'CREATIVE_DISTRICT', value: 25 },
    hint: '창작 골목에서 시간을 보내다 보면 보이는 모습.',
    sortOrder: 6,
  },
  {
    id: 'rainy_day',
    name: '레이니 데이',
    category: 'MOOD',
    rarity: 'RARE',
    description: '비 오는 날엔 천천히.',
    tags: ['rain', 'quiet', 'mind'],
    unlock: { kind: 'CATEGORY_QUESTS', category: 'MIND', count: 20 },
    hint: '생각을 정리하는 시간이 쌓이면 어느 날 보인다.',
    sortOrder: 7,
  },
  {
    id: 'night_owl',
    name: '나이트 아울',
    category: 'MOOD',
    rarity: 'EPIC',
    description: '도시가 조용해진 뒤의 모습.',
    tags: ['night', 'quiet', 'home'],
    unlock: { kind: 'BAND_QUESTS', band: 'NIGHT', count: 25 },
    hint: '도시가 조용해질 때 자주 보이는 모습.',
    sortOrder: 8,
  },
  {
    id: 'date_day',
    name: '데이트 데이',
    category: 'SPECIAL',
    rarity: 'EPIC',
    description: '누굴 만나러 가는 날은 조금 더 신경 쓰게 된다.',
    tags: ['heart', 'meet', 'day'],
    unlock: { kind: 'FRIENDSHIP_TOTAL', value: 60 },
    hint: '도시 사람들과 가까워질수록 가까워지는 모습.',
    sortOrder: 9,
  },
  {
    id: 'spring_picnic',
    name: '스프링 피크닉',
    category: 'SEASON',
    rarity: 'EPIC',
    description: '바람이 좋아서 조금 더 걷고 싶은 날.',
    tags: ['spring', 'outdoor', 'day'],
    unlock: { kind: 'SEASON', months: [3, 4, 5], count: 15 },
    hint: '봄에 지내다 보면 생기는 모습.',
    sortOrder: 10,
  },
  {
    id: 'winter_cozy',
    name: '윈터 코지',
    category: 'SEASON',
    rarity: 'EPIC',
    description: '손은 차갑고 옷은 포근하다.',
    tags: ['winter', 'outdoor', 'day'],
    unlock: { kind: 'SEASON', months: [12, 1, 2], count: 15 },
    hint: '겨울에 지내다 보면 생기는 모습.',
    sortOrder: 11,
  },
  {
    id: 'moon_alley',
    name: '문 앨리',
    category: 'SPECIAL',
    rarity: 'SECRET',
    description: '어쩐지 평소와 다른 밤.',
    tags: ['night', 'secret'],
    unlock: { kind: 'SECRET', secretId: 'MOON_ALLEY' },
    hint: '평소에는 보이지 않는 골목과 관련이 있다.',
    hiddenUntilOwned: true,
    sortOrder: 12,
  },
]

/** 그림이 없거나 이상한 id 가 들어와도 여기로 돌아온다 */
export const DEFAULT_SKIN_ID: SkinId = 'basic_day'

export function findSkin(id: string): CharacterSkin | null {
  return SKINS.find((s) => s.id === id) ?? null
}

/**
 * 이 모습의 그림 한 장.
 *
 * 화면마다 경로를 조합하지 않는다. 새 모습이 늘어도 여기만 안다.
 */
export function skinArt(def: CharacterSkin, pose: CharacterMood = 'idle'): string {
  if (pose !== 'idle') {
    const special = def.poses?.[pose]
    if (special) return special
  }
  return `/assets/characters/${def.id}.webp`
}

/** 이 모습에 이 자세 그림이 따로 있는지 */
export function hasPose(def: CharacterSkin, pose: CharacterMood): boolean {
  if (pose === 'idle') return true
  return def.poses?.[pose] !== undefined
}

/** 처음부터 가지고 있는 것 */
export function defaultOwnedSkinIds(): SkinId[] {
  return SKINS.filter((s) => s.unlock.kind === 'DEFAULT').map((s) => s.id)
}

// ── 조건에 얼마나 왔는지 ─────────────────────────────────

/**
 * 전부 이미 있는 기록에서 센다.
 *
 * 발견 층(lib/discovery)이 세는 것과 같은 자리를 본다.
 * 같은 사실을 두 군데서 따로 세면 언젠가 어긋난다.
 */
export function skinProgress(state: AppState, unlock: SkinUnlock): number {
  switch (unlock.kind) {
    case 'DEFAULT':
      return 1
    case 'SHOP':
      // 코인으로 데려오는 건 조건이 아니라 선택이다. 가는 중이라는 게 없다.
      return 0
    case 'CATEGORY_QUESTS':
      return clamp((state.categoryCompleted[unlock.category] ?? 0) / unlock.count)
    case 'BAND_QUESTS': {
      const done = Object.values(state.usageProfiles).reduce(
        (sum, profile) => sum + (profile.completedByBand[unlock.band] ?? 0),
        0,
      )
      return clamp(done / unlock.count)
    }
    case 'AREA_REPUTATION':
      return clamp((state.reputation[unlock.areaId] ?? 0) / unlock.value)
    case 'FRIENDSHIP_TOTAL': {
      const total = Object.values(state.npcs).reduce((sum, npc) => sum + npc.friendship, 0)
      return clamp(total / unlock.value)
    }
    case 'SEASON':
      return clamp(seasonCompleted(state, unlock.months) / unlock.count)
    case 'SECRET':
      return state.discovery.foundSecretIds.includes(unlock.secretId) ? 1 : 0
  }
}

/** 그 계절에 끝낸 퀘스트 수. 날짜 열쇠에서 달을 읽는다. */
function seasonCompleted(state: AppState, months: number[]): number {
  let total = 0
  for (const [day, stat] of Object.entries(state.dailyLog)) {
    const month = Number(day.slice(5, 7))
    if (months.includes(month)) total += stat.completed
  }
  return total
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * 지금 조건을 채워서 새로 얻게 된 모습들.
 *
 * 가게에서 파는 것은 여기서 주지 않는다 — 그건 조건이 아니라 사는 것이다.
 */
export function newlyUnlocked(state: AppState): CharacterSkin[] {
  const owned = new Set(state.user.ownedSkinIds)
  return SKINS.filter(
    (def) =>
      !owned.has(def.id) &&
      def.unlock.kind !== 'SHOP' &&
      skinProgress(state, def.unlock) >= 1,
  )
}

// ── 화면에서 보는 모양 ───────────────────────────────────

export function skinViews(state: AppState): SkinView[] {
  const owned = new Set(state.user.ownedSkinIds)

  return [...SKINS]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((def) => {
      const has = owned.has(def.id)
      return {
        def,
        owned: has,
        active: state.user.selectedSkinId === def.id,
        progress: has ? 1 : skinProgress(state, def.unlock),
        hidden: !has && def.hiddenUntilOwned === true,
      }
    })
}

export function ownedSkinCount(state: AppState): number {
  return SKINS.filter((s) => state.user.ownedSkinIds.includes(s.id)).length
}

export function skinsInCategory(views: SkinView[], category: SkinCategory | 'ALL'): SkinView[] {
  if (category === 'ALL') return views
  return views.filter((v) => v.def.category === category)
}

export const SKIN_CATEGORY_LABEL: Record<SkinCategory, string> = {
  DAILY: '일상',
  ACTIVITY: '활동',
  MOOD: '기분',
  SEASON: '계절',
  SPECIAL: '특별',
}
