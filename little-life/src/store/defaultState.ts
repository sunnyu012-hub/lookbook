import type { AppState, Quest, QuestDraft } from '@/types'
import { emptyCategoryStats } from '@/lib/stats'
import { expForDifficulty } from '@/lib/difficulty'
import { createId } from '@/lib/id'
import { emptyReputation } from '@/lib/city/reputation'
import { emptyCollection } from '@/lib/collection/progress'
import { emptyDiscovery } from '@/lib/discovery/derive'
import { DEFAULT_SKIN_ID, defaultOwnedSkinIds } from '@/lib/character/skins'
import { emptyGarden } from '@/lib/garden/derive'
import { emptyKitchen } from '@/lib/kitchen/derive'
import { emptyDungeon } from '@/lib/dungeon/derive'
import { emptyQuarry } from '@/lib/quarry/derive'
import { MAX_ADVENTURE_ENERGY } from '@/lib/garden/quest'
import {
  STATE_VERSION,
  defaultRecommendSettings,
  defaultStats,
  emptyEquipped,
  emptyNpcStates,
} from './migrate'

export { STATE_VERSION } from './migrate'

/**
 * 첫 실행 때 넣어주는 예시 퀘스트.
 * 빈 화면부터 시작하면 뭘 적어야 할지 막막하니까 결을 보여주는 용도다.
 * 사용자가 지울 수 있다.
 */
const SAMPLE_QUESTS: QuestDraft[] = [
  { title: '책상 위 물건 하나 정리하기', category: 'LIFE', difficulty: 'EASY' },
  { title: '오늘 가장 중요한 일 20분 하기', category: 'WORK', difficulty: 'NORMAL' },
  { title: '가볍게 몸 풀기', category: 'BODY', difficulty: 'EASY' },
]

function buildQuest(draft: QuestDraft, createdAt: string): Quest {
  return {
    id: createId(),
    title: draft.title,
    category: draft.category,
    difficulty: draft.difficulty,
    exp: expForDifficulty(draft.difficulty),
    completed: false,
    createdAt,
    completedAt: null,
  }
}

export function createDefaultState(): AppState {
  const now = Date.now()

  return {
    version: STATE_VERSION,
    // 새로 시작하는 사람은 옛 표로 받은 적이 없다
    coinRebalanceGiven: true,
    claimedWeeklyGoals: [],
    user: {
      name: 'Yuli',
      level: 1,
      currentExp: 0,
      totalExp: 0,
      totalCompletedQuests: 0,
      coins: 0,
      classId: null,
      stats: defaultStats(),
      equippedItems: emptyEquipped(),
      currentAreaId: 'HOME_BASE',
      skillPoints: 0,
      unlockedSkills: [],
      activeBuffs: [],
      selectedSkinId: DEFAULT_SKIN_ID,
      ownedSkinIds: defaultOwnedSkinIds(),
      seenSkinIds: [],
      adventureEnergy: 0,
      maxAdventureEnergy: MAX_ADVENTURE_ENERGY,
    },
    // 목록에 적어둔 순서대로 보이도록 생성 시각을 1ms 씩 어긋나게 준다.
    quests: SAMPLE_QUESTS.map((draft, i) =>
      buildQuest(draft, new Date(now - i).toISOString()),
    ),
    routines: [],
    inventory: [],
    battles: [],
    categoryStats: emptyCategoryStats(),
    dailyLog: {},
    welcomeGiftGiven: false,
    npcs: emptyNpcStates(),
    reputation: emptyReputation(),
    usageProfiles: {},
    recommendSettings: defaultRecommendSettings(),
    categoryCompleted: emptyCategoryStats(),
    bossClears: 0,
    collection: emptyCollection(),
    discovery: emptyDiscovery(),
    guideSeenAt: null,
    garden: emptyGarden(),
    kitchen: emptyKitchen(),
    quarry: emptyQuarry(),
    dungeon: emptyDungeon(),
  }
}
