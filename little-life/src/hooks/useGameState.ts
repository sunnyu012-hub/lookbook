import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActiveBuff,
  AppState,
  AreaId,
  Battle,
  BattleDef,
  ClassId,
  CompleteResult,
  DayStat,
  DropResult,
  EquipSlot,
  NpcId,
  NpcQuestChainDef,
  NpcState,
  Quest,
  QuestDraft,
  Rarity,
  Routine,
  ShopDef,
} from '@/types'
import type { BuySkinResult } from '@/lib/character/derive'
import type { HarvestResult, PlantResult } from '@/lib/garden/derive'
import type { DevGardenAction } from '@/lib/garden/dev'
import type { CookResult } from '@/lib/kitchen/derive'
import type { DevKitchenAction } from '@/lib/kitchen/dev'
import {
  cookRecipe as cookRecipeIn,
  isKitchenUnlocked,
  toggleFavorite as toggleFavoriteIn,
} from '@/lib/kitchen/derive'
import { applyDevKitchen } from '@/lib/kitchen/dev'
import { foodGiftLines } from '@/lib/kitchen/gifts'
import { findKitchenRecipe as findKitchenRecipeById, recipeForFood } from '@/lib/kitchen/recipes'

import type {
  CharacterSkin,
  CollectionShopId,
  CompanionId,
  DiscoveryNote,
  DiscoveryResult,
  HomeEffectId,
  PlacedItem,
  RoomId,
} from '@/types'
import { ITEMS, findItem } from '@/lib/rpg/content'
import { findCollectionItem } from '@/lib/collection/catalog'
import { applyCollectionDerived } from '@/lib/collection/derive'
import type { DevWorkshopAction } from '@/lib/collection/devWorkshop'
import { applyDevWorkshop } from '@/lib/collection/devWorkshop'
import { rollBossDrop, rollCollectDrops } from '@/lib/collection/drops'
import { findRecipe } from '@/lib/collection/recipes'
import { timeBand } from '@/lib/rpg/time'
import {
  addItem,
  canCraft,
  isRecipeKnown,
  recipeContextOf,
  markSeen,
  markShopVisited,
  ownedCount,
  removeItem,
  spendItems,
  unlockedEffectIds,
} from '@/lib/collection/progress'
import { pendingDelivery } from '@/lib/collection/delivery'
import { applyDiscovery } from '@/lib/discovery/derive'
import { applySkinUnlocks, buySkin as buySkinIn, grantAllSkins, wearSkin } from '@/lib/character/derive'
import {
  harvestPlot as harvestPlotIn,
  isGardenUnlocked,
  plantSeed as plantSeedIn,
  useDew as useDewIn,
} from '@/lib/garden/derive'
import { applyDevGarden } from '@/lib/garden/dev'
import { FIRST_SEEDS } from '@/lib/garden/crops'
import {
  ENERGY_BOSS,
  ENERGY_BY_DIFFICULTY,
  GROWTH_BONUS_BOSS,
  GROWTH_BONUS_SECONDS,
  applyGrowthBonus,
  gainEnergy,
  revertGrowthBonus,
  rollGardenDrops,
} from '@/lib/garden/quest'
import { findChapter, isChapterUnlocked } from '@/lib/discovery/stories'
import { findSecret } from '@/lib/discovery/secrets'
import {
  PLAY_FRIENDSHIP,
  PLAY_FRIENDSHIP_FAVORITE,
  findCompanion,
  likesHere,
  unlockedMemories,
} from '@/lib/discovery/companions'
import {
  findCollectionShop,
  isCollectionShopOpen,
  todayListings,
} from '@/lib/collection/shops'
import {
  calculateQuestReward,
  collectBonuses,
  pickBuff,
  rollDrop,
  STAT_BY_CATEGORY,
} from '@/lib/rpg/rewards'
import { applyBattleAction, clearRarities, createBattle, undoBattleAction } from '@/lib/rpg/battle'
import { activeEvents } from '@/lib/city/events'
import { emptyNpcState, giftGainForTags, talkGain } from '@/lib/city/friendship'
import { FRIENDSHIP_MAX, findNpc, friendshipLevel } from '@/lib/city/npcs'
import { reputationGain } from '@/lib/city/reputation'
import { shopStock } from '@/lib/city/shops'
import { findSkill as findSkillDef, skillState } from '@/lib/city/skills'
import { expForDifficulty as npcStepExp } from '@/lib/difficulty'
import {
  hideForToday,
  questKeyOf,
  recordAdded,
  recordCompleted,
  recordDismiss,
  reverseCompleted,
  toggleFavorite,
  type ProfileSeed,
} from '@/lib/library/usage'
import {
  grantCoinRebalance,
  grantWelcomeGift,
  withSkillPoints,
  defaultRecommendSettings,
} from '@/store/migrate'
import { createDefaultState } from '@/store/defaultState'
import { repository } from '@/store/localStorage'
import { applyExp, levelFromTotalExp } from '@/lib/level'
import { expForDifficulty } from '@/lib/difficulty'
import { todayKey, toDayKey } from '@/lib/date'
import { isUsableRule, matchesToday, spawnDueQuests } from '@/lib/routines'
import { createId } from '@/lib/id'

interface GameState {
  ready: boolean
  state: AppState
  /** 이번에 Welcome Gift 를 받았는지 */
  justGifted: boolean
  /** 밸런스를 고치면서 채워준 코인 (0 이면 없었다) */
  justRebalanced: number
  addQuest: (draft: QuestDraft) => Quest | null
  completeQuest: (id: string) => CompleteResult | null
  /** 완료를 되돌린다. EXP·레벨·통계·기록까지 전부 원래대로. */
  uncompleteQuest: (id: string) => void
  /** 아직 안 끝낸 퀘스트의 제목·카테고리·난이도를 고친다. */
  updateQuest: (id: string, draft: QuestDraft) => void
  /** 오늘은 넘기고 내일 다시 보이게 한다. */
  snoozeQuest: (id: string) => void
  /** 미뤄둔 걸 도로 오늘 목록에 올린다. */
  unsnoozeQuest: (id: string) => void
  deleteQuest: (id: string) => void
  renameUser: (name: string) => void
  toggleRoutinePause: (id: string) => void
  deleteRoutine: (id: string) => void
  // ── RPG ──
  setClass: (classId: ClassId) => void
  setArea: (areaId: AreaId) => void
  equipItem: (itemId: string) => void
  unequipSlot: (slot: EquipSlot) => void
  startBattle: (def: BattleDef) => Battle
  doBattleAction: (battleId: string, actionId: string) => BattleClearResult | null
  undoBattleActionById: (battleId: string, actionId: string) => void
  removeBattle: (battleId: string) => void
  // ── 도시 ──
  /** 하루 첫 대화면 친밀도가 오른다. 오른 만큼을 돌려준다. */
  talkToNpc: (npcId: NpcId) => TalkResult | null
  /** 선물을 준다. 아이템이 하나 줄고 친밀도가 오른다. */
  giftToNpc: (npcId: NpcId, itemId: string) => GiftResult | null
  /** 의뢰를 받는다. 첫 단계 퀘스트가 생긴다. */
  acceptChain: (chain: NpcQuestChainDef) => Quest | null
  /** 상점에서 하나 산다. */
  buyItem: (shop: ShopDef, itemId: string) => BuyResult
  /** 마시거나 먹는다. 다음 퀘스트에 걸린다. */
  useConsumable: (itemId: string) => ActiveBuff | null
  /** 스킬을 찍는다. */
  unlockSkill: (skillId: string) => boolean
  // ── 퀘스트 라이브러리 ──
  /** ★ 즐겨찾기 */
  toggleQuestFavorite: (seed: ProfileSeed) => void
  /** 추천에서 덜 보기 */
  dismissRecommendation: (seed: ProfileSeed) => void
  /** 오늘만 숨기기 */
  hideRecommendationToday: (seed: ProfileSeed) => void
  /** 사용 패턴 기반 추천 켜고 끄기 */
  setPersonalized: (on: boolean) => void
  /** 추천 기록만 지운다. 퀘스트·EXP·반복·완료 기록은 그대로 둔다. */
  resetUsageProfiles: () => void
  // ── 수집 · 방 ──
  /** 도감 상점에서 하나 산다. */
  buyCollectionItem: (shopId: CollectionShopId, itemId: string) => CollectBuyResult
  /** 작은 작업실에서 하나 만든다. */
  craftItem: (recipeId: string) => CraftResult
  /** ♡ 찾는 물건에 넣고 뺀다. */
  toggleWishlist: (itemId: string) => void
  /** 가게에 들어갔다. 오늘 진열을 본 것으로 적고, 새 입고 표시를 떼어낸다. */
  visitShop: (shopId: CollectionShopId, itemIds: string[]) => void
  /** 문 앞에 온 것을 받는다. */
  claimDelivery: () => DeliveryClaim | null
  /** 도시 사람의 이야기 한 장을 읽는다. */
  readChapter: (chapterId: string) => ChapterResult | null
  /** 같이 다닐 아이를 고른다. */
  setActiveCompanion: (id: CompanionId | null) => void
  /** 동료에게 인사한다. 하루에 한 번만 친밀도가 오른다. */
  playWithCompanion: (id: CompanionId) => CompanionPlayResult | null
  /** 이번에 새로 발견한 것들 (읽고 나면 비운다) */
  discoveryNotes: DiscoveryNote[]
  dismissDiscoveryNotes: () => void
  /** 지금 보고 있는 방에 하나 놓는다. */
  placeInRoom: (itemId: string) => PlacedItem | null
  /** 놓은 것을 옮긴다. */
  movePlaced: (uid: string, x: number, y: number) => void
  /** 크기를 바꾸거나 뒤집는다. */
  updatePlaced: (uid: string, patch: { scale?: number; flipped?: boolean }) => void
  /** 방에서 거둬 가방으로 돌린다. */
  removePlaced: (uid: string) => void
  setCurrentRoom: (roomId: RoomId) => void
  /** 지금 방에 걸어둘 공기를 고른다. 세트를 완성해 열린 것 중에서만. */
  setRoomEffect: (effectId: HomeEffectId | null) => void
  /** 처음 안내를 다 봤다고 적어둔다. 두 번 뜨지 않게. */
  markGuideSeen: () => void
  // ── 캐릭터 모습 ──
  /** 가진 모습 중 하나를 입는다. 누르는 즉시 바뀌고 즉시 저장된다. */
  selectSkin: (id: string) => void
  /** 코인으로 하나 데려온다 */
  buySkin: (id: string) => BuySkinResult
  /** 개발용 — 모습을 전부 지급한다 (?dev=skins 갤러리에서만 부른다) */
  devGrantAllSkins: () => void
  /** 이번에 새로 얻은 모습들 (알려주고 나면 비운다) */
  newSkins: CharacterSkin[]
  dismissNewSkins: () => void
  // ── 작은 정원 ──
  /**
   * 정원에 처음 들어간다.
   *
   * 처음이면 첫 안내를 봤다고 적고 딸기 씨앗 두 개를 준다.
   * 적는 것과 주는 것이 한 번에 일어나서 두 번 받을 수가 없다.
   */
  enterGarden: () => void
  /** 빈 밭에 씨앗 하나를 심는다 */
  plantSeed: (plotIndex: number, cropId: string) => PlantResult
  /** 다 자란 것을 거둔다 */
  harvestPlot: (plotIndex: number) => HarvestResult
  /** 이슬 한 방울로 한 칸을 앞당긴다 */
  useDew: (plotIndex: number) => boolean
  /** 개발용 (?dev=garden 에서만 부른다) */
  devGarden: (action: DevGardenAction) => void
  // ── 작은 부엌 ──
  /** 부엌에 처음 들어간 것을 적어둔다 */
  enterKitchen: () => void
  /** 요리한다. 재료가 빠지고 음식이 손에 들어온다. */
  cookRecipe: (recipeId: string) => CookResult
  /** 만든 음식을 먹는다. 아주 작은 보너스가 다음 퀘스트 하나에 붙는다. */
  eatFood: (recipeId: string) => ActiveBuff | null
  /** 하트. 보너스는 없다 — 목록 맨 위로 올라올 뿐이다. */
  toggleRecipeFavorite: (recipeId: string) => void
  /** 개발용 (?dev=kitchen 에서만 부른다) */
  devKitchen: (action: DevKitchenAction) => void
  /** 개발용 (?dev=workshop 에서만 부른다) */
  devWorkshop: (action: DevWorkshopAction) => void
  // ── 클라우드 백업 ──
  /**
   * 상태 전체를 다른 것으로 갈아 끼운다.
   *
   * 클라우드에서 받아온 것을 앉힐 때만 쓴다. 부르는 쪽(useSync)은
   * 그 전에 반드시 이 기기에 사본을 남긴다 — 여기서는 그걸 확인하지 않는다.
   * 게임 안의 어떤 버튼도 이걸 부르지 않는다.
   */
  replaceState: (next: AppState) => void
}

export type CollectBuyResult =
  | {
      ok: true
      itemId: string
      price: number
      isNew: boolean
      discoveries: DiscoveryResult[]
      notes: string[]
    }
  | { ok: false; reason: 'NOT_ENOUGH_COINS' | 'SOLD_OUT' | 'CLOSED' | 'LOCKED' | 'UNKNOWN' }

export interface ChapterResult {
  chapterId: string
  title: string
  lines: string[]
  itemId: string | null
  isNew: boolean
  discoveries: DiscoveryResult[]
  /** 이 장을 읽어서 열린 것 */
  unlockedSecretName: string | null
}

export interface CompanionPlayResult {
  name: string
  gained: number
  friendship: number
  /** 이번에 열린 기억 */
  memoryTitle: string | null
}

export interface DeliveryClaim {
  itemId: string
  isNew: boolean
  from: string
  discoveries: DiscoveryResult[]
  notes: string[]
}

export type CraftResult =
  | { ok: true; itemId: string; isNew: boolean; discoveries: DiscoveryResult[]; notes: string[] }
  | { ok: false; reason: 'MISSING' | 'UNKNOWN' | 'LOCKED' }

export interface TalkResult {
  /** 이번에 오른 친밀도. 0 이면 오늘은 이미 인사했다는 뜻. */
  gained: number
  friendship: number
  /** 단계가 올라갔으면 */
  leveledUp: boolean
}

export interface GiftResult {
  gained: number
  friendship: number
  liked: boolean
  /** 만든 음식을 줬을 때 그 사람이 하는 말. 없으면 빈 배열. */
  lines?: string[]
  leveledUp: boolean
}

export type BuyResult =
  | { ok: true; itemId: string; price: number }
  | { ok: false; reason: 'NOT_ENOUGH_COINS' | 'ALREADY_OWNED' | 'CLOSED' | 'UNKNOWN' }

export interface BattleClearResult {
  cleared: boolean
  exp: number
  coins: number
  leveledUp: boolean
  newLevel: number
  drops: DropResult[]
  /** 보스를 넘고 나온 도감 물건 */
  collected: DiscoveryResult[]
}

/** 등급별로 얻을 수 있는 아이템 목록. 재료·수집품도 드롭 대상에 포함한다. */
function itemsByRarity(rarity: Rarity): string[] {
  return ITEMS.filter((i) => i.rarity === rarity).map((i) => i.id)
}

/** 인벤토리에 한 칸 넣는다. 이미 있으면 수량만 늘린다. */
function addToInventory(
  inventory: AppState['inventory'],
  itemId: string,
  source: string,
  now: Date,
): AppState['inventory'] {
  const found = inventory.find((e) => e.itemId === itemId)
  if (found) {
    return inventory.map((e) => (e.itemId === itemId ? { ...e, quantity: e.quantity + 1 } : e))
  }
  return [...inventory, { itemId, quantity: 1, obtainedAt: now.toISOString(), source }]
}

/** 인벤토리에서 한 개 뺀다. 되돌리기에 쓴다. */
function removeFromInventory(
  inventory: AppState['inventory'],
  itemId: string,
): AppState['inventory'] {
  return inventory
    .map((e) => (e.itemId === itemId ? { ...e, quantity: e.quantity - 1 } : e))
    .filter((e) => e.quantity > 0)
}

/** 사용 기록에 넘길 묶음. 퀘스트 하나에서 그대로 뽑는다. */
function seedOf(quest: Quest): ProfileSeed {
  return {
    questKey: questKeyOf(quest),
    title: quest.title,
    category: quest.category,
    difficulty: quest.difficulty,
    presetId: quest.sourcePresetId ?? null,
    packId: quest.sourcePackId ?? null,
  }
}

/** 선물하거나 써버린 물건이 슬롯에 남아 있으면 비운다. */
function unequipIfGone(equipped: AppState['user']['equippedItems'], itemId: string) {
  const slot = (Object.keys(equipped) as EquipSlot[]).find((s) => equipped[s] === itemId)
  return slot ? { ...equipped, [slot]: null } : equipped
}

/** 이번에 친밀도 단계가 올라갔는지 */
function crossedFriendshipLevel(before: number, after: number): boolean {
  return friendshipLevel(before) !== friendshipLevel(after)
}

/** 보상 계산에 넘길 출처 묶음. 한 군데서만 만들어 빠뜨리는 곳이 없게 한다. */
function bonusSources(state: AppState) {
  return {
    classId: state.user.classId,
    equipped: state.user.equippedItems,
    areaId: state.user.currentAreaId,
    unlockedSkills: state.user.unlockedSkills,
    events: activeEvents(),
    reputation: state.reputation,
  }
}

/** 버프를 한 번 쓴다. 다 쓴 건 목록에서 빠진다. */
function spendBuff(buffs: ActiveBuff[], used: ActiveBuff | null): ActiveBuff[] {
  if (!used) return buffs
  return buffs
    .map((b) => (b.id === used.id ? { ...b, uses: b.uses - 1 } : b))
    .filter((b) => b.uses > 0)
}

/** 되돌릴 때 버프를 도로 살린다. 이미 사라졌으면 다시 넣어준다. */
function restoreBuff(buffs: ActiveBuff[], used: ActiveBuff | undefined): ActiveBuff[] {
  if (!used) return buffs
  const found = buffs.find((b) => b.id === used.id)
  if (found) return buffs.map((b) => (b.id === used.id ? { ...b, uses: b.uses + 1 } : b))
  return [...buffs, { ...used, uses: 1 }]
}

/** 친밀도를 올린다. 상한을 넘지 않는다. */
function bumpFriendship(state: AppState, npcId: NpcId, amount: number): AppState {
  const prev = state.npcs[npcId] ?? emptyNpcState()
  return {
    ...state,
    npcs: {
      ...state.npcs,
      [npcId]: { ...prev, friendship: Math.min(FRIENDSHIP_MAX, prev.friendship + amount) },
    },
  }
}

/**
 * NPC 의뢰의 다음 단계를 연다.
 *
 * 한 번에 하나씩만 만든다. 세 개를 한꺼번에 던져주면 그 자체로 밀린 일이 된다.
 * 마지막 단계였으면 의뢰를 끝내고 약속한 것을 준다.
 */
function advanceChain(state: AppState, done: Quest, now: Date): AppState {
  const { npcId, chainId, step, totalSteps } = done
  if (!npcId || !chainId || !step || !totalSteps) return state

  const npc = findNpc(npcId)
  const chain = npc?.chains.find((c) => c.id === chainId)
  if (!npc || !chain) return state

  // 아직 남은 단계가 있으면 다음 것 하나만 만든다
  if (step < totalSteps) {
    const nextStep = chain.steps[step]
    if (!nextStep) return state

    const quest: Quest = {
      id: createId(),
      title: nextStep.title,
      category: nextStep.category,
      difficulty: nextStep.difficulty,
      exp: npcStepExp(nextStep.difficulty),
      completed: false,
      createdAt: new Date(now.getTime() + 1).toISOString(),
      completedAt: null,
      questType: 'NPC',
      npcId,
      chainId,
      step: step + 1,
      totalSteps,
    }
    return { ...state, quests: [quest, ...state.quests] }
  }

  // 마지막 단계 — 약속한 보상을 준다
  const npcState = state.npcs[npcId] ?? emptyNpcState()
  if (npcState.clearedChainIds.includes(chainId)) return state

  const inventory = chain.rewardItemId
    ? addToInventory(state.inventory, chain.rewardItemId, `${npc.name} 의뢰`, now)
    : state.inventory

  return {
    ...state,
    inventory,
    user: { ...state.user, coins: state.user.coins + chain.rewardCoins },
    npcs: {
      ...state.npcs,
      [npcId]: {
        ...npcState,
        friendship: Math.min(FRIENDSHIP_MAX, npcState.friendship + chain.rewardFriendship),
        clearedChainIds: [...npcState.clearedChainIds, chainId],
      },
    },
  }
}

/** 오늘 칸에 완료 기록을 한 건 더한다. */
function bumpDailyLog(state: AppState, quest: Quest): AppState['dailyLog'] {
  const key = todayKey()
  const prev: DayStat = state.dailyLog[key] ?? { completed: 0, exp: 0, byCategory: {} }

  return {
    ...state.dailyLog,
    [key]: {
      completed: prev.completed + 1,
      exp: prev.exp + quest.exp,
      byCategory: {
        ...prev.byCategory,
        [quest.category]: (prev.byCategory[quest.category] ?? 0) + quest.exp,
      },
    },
  }
}

/**
 * 앱의 단일 상태 소스.
 *
 * 상태 변경 로직을 전부 여기 모아둬서, 나중에 zustand 나 Supabase 로
 * 옮기더라도 화면 컴포넌트는 손대지 않아도 되게 했다.
 *
 * 다음 상태는 setState 안에서가 아니라 stateRef 를 읽어 밖에서 계산한다.
 * completeQuest 가 "몇 EXP 를 줬고 레벨이 올랐는지" 를 호출한 쪽에 돌려줘야
 * +EXP / LEVEL UP 연출을 띄울 수 있는데, 업데이터 함수는 언제 실행될지
 * 보장되지 않아서 그 안에서 값을 꺼내면 비어 있을 때가 생긴다.
 */
export function useGameState(): GameState {
  // 저장된 게 없을 때 쓸 첫 실행 상태. 아래 effect 에서도 참조해야 해서 ref 로 들고 있는다.
  const defaults = useRef<AppState | null>(null)
  if (defaults.current === null) defaults.current = createDefaultState()

  const [state, setState] = useState<AppState>(defaults.current)
  const stateRef = useRef<AppState>(defaults.current)
  const [ready, setReady] = useState(false)
  // 첫 로드가 끝나기 전에 기본값을 저장해버리면 기존 기록을 덮어쓴다.
  const loaded = useRef(false)
  /** Welcome Gift 를 방금 줬는지 — 화면에서 안내하려고 들고 있는다 */
  const giftedRef = useRef(false)
  /** 밸런스 보정으로 채워준 코인. 한 번 알려주고 끝이다. */
  const rebalancedRef = useRef(0)
  /** 이번에 새로 발견한 것들. 화면에서 읽고 나면 비운다. */
  const [discoveryNotes, setDiscoveryNotes] = useState<DiscoveryNote[]>([])
  /** 이번에 새로 얻은 캐릭터 모습. 한 번 보여주고 비운다. */
  const [newSkins, setNewSkins] = useState<CharacterSkin[]>([])

  /**
   * 모든 상태 변경은 여기를 지난다. ref 를 먼저 갱신해 연속 클릭에도 최신값을 본다.
   * 스킬 포인트는 여기서 레벨에 맞춰 다시 계산된다 — 따로 쌓지 않아 어긋날 수가 없다.
   */
  const commit = useCallback((raw: AppState) => {
    const next = withSkillPoints(raw)
    stateRef.current = next
    setState(next)
  }, [])

  useEffect(() => {
    let alive = true
    repository.load().then((saved) => {
      if (!alive) return
      if (saved) {
        // 업데이트하고 처음 열었으면 선물을 한 번 준다
        const gift = grantWelcomeGift(saved)
        // 벌이를 세 배로 올리기 전에 한 퀘스트들의 몫도 한 번 채워준다
        const fixed = grantCoinRebalance(gift.state)
        if (fixed.coins > 0) rebalancedRef.current = fixed.coins
        // 그동안 조건을 이미 넘긴 것들 — 평판으로 받는 물건, 완성해둔 세트, 트로피 —
        // 은 앱을 열 때 도착한다. 다음에 뭘 하기 전까지 기다리게 두지 않는다.
        // 발견 층도 같이 본다. 조건을 전부 기존 기록에서 세기 때문에,
        // 이 업데이트를 처음 여는 사람에게 그동안의 기록이 그대로 반영된다.
        const withCollection = applyCollectionDerived(fixed.state).state
        const discovered = applyDiscovery(withCollection)
        // 발견 보상으로 도감이 늘면 그게 다시 마일스톤·세트를 완성시킬 수 있다.
        // 한 번 더 돌려서 그 자리에서 따라오게 한다 — 안 그러면
        // 다음에 앱을 열 때까지 기다리게 된다.
        const chained = applyCollectionDerived(discovered.state)
        // 캐릭터 모습도 조건을 기존 기록에서 세기 때문에, 이 업데이트를
        // 처음 여는 사람에게 그동안의 기록만큼이 그대로 들어온다.
        // 여기서는 목록에 더하기만 한다 — 입히지는 않는다.
        const skinned = applySkinUnlocks(chained.state)
        setDiscoveryNotes(discovered.notes)
        if (skinned.unlocked.length > 0) setNewSkins(skinned.unlocked)
        commit(skinned.state)
        if (gift.given) giftedRef.current = true
      } else if (defaults.current) {
        // 첫 실행이면 샘플 데이터와 선물을 그 자리에서 저장해 둔다.
        // 안 그러면 사용자가 뭔가 하기 전까지 저장이 안 돼서,
        // 앱을 다시 열 때마다 샘플 퀘스트가 새로 만들어진다.
        const gift = grantWelcomeGift(defaults.current)
        defaults.current = gift.state
        stateRef.current = gift.state
        setState(gift.state)
        if (gift.given) giftedRef.current = true
        void repository.save(gift.state)
      }
      loaded.current = true
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [commit])

  useEffect(() => {
    if (!loaded.current) return
    void repository.save(state)
  }, [state])

  /** 오늘 몫의 반복 퀘스트를 만든다. */
  const runSpawn = useCallback(() => {
    const prev = stateRef.current
    const result = spawnDueQuests(prev.routines, prev.quests, new Date(), createId)
    if (!result) return

    commit({
      ...prev,
      quests: [...result.quests, ...prev.quests],
      routines: result.routines,
    })
  }, [commit])

  /**
   * 앱을 열 때 한 번, 그리고 켜둔 채로 날짜가 바뀌었다가 다시 볼 때 한 번 더.
   * 홈 화면에 추가해두면 며칠씩 안 닫고 두는 경우가 많다.
   */
  useEffect(() => {
    if (!ready) return
    runSpawn()

    const onVisible = () => {
      if (document.visibilityState === 'visible') runSpawn()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [ready, runSpawn])

  /**
   * 퀘스트를 만든다.
   *
   * 반복 규칙이 있으면 원본(Routine)도 같이 만든다.
   * 오늘 해당하는 요일이 아니면 오늘 것은 만들지 않고 원본만 남긴다 —
   * 토요일에 "평일 반복" 을 만들었다고 토요일에 퀘스트가 생기면 안 된다.
   */
  const addQuest = useCallback(
    (draft: QuestDraft): Quest | null => {
      const prev = stateRef.current
      const now = new Date()
      const title = draft.title.trim()
      const repeat = draft.repeat && isUsableRule(draft.repeat) ? draft.repeat : null

      // 원본 id 를 먼저 만들어 둬야 오늘 몫에도 같은 id 를 붙일 수 있다.
      // 안 그러면 첫날 퀘스트만 반복과 연결되지 않는다.
      const routineId = repeat ? createId() : null
      const dueToday = !repeat || matchesToday(repeat, now)

      const quest: Quest | null = dueToday
        ? {
            id: createId(),
            title,
            category: draft.category,
            difficulty: draft.difficulty,
            exp: expForDifficulty(draft.difficulty),
            completed: false,
            createdAt: now.toISOString(),
            completedAt: null,
            ...(routineId ? { routineId } : {}),
            ...(draft.sourcePackId ? { sourcePackId: draft.sourcePackId } : {}),
            ...(draft.sourcePresetId ? { sourcePresetId: draft.sourcePresetId } : {}),
          }
        : null

      const routines = repeat
        ? [
            {
              id: routineId!,
              title,
              category: draft.category,
              difficulty: draft.difficulty,
              rule: repeat,
              createdAt: now.toISOString(),
              // 오늘 몫을 방금 만들었으니 오늘은 또 만들지 않게 찍어둔다
              lastSpawnedOn: dueToday ? todayKey(now) : null,
              paused: false,
              ...(draft.timeOfDay ? { timeOfDay: draft.timeOfDay } : {}),
              ...(draft.sourcePackId ? { sourcePackId: draft.sourcePackId } : {}),
              ...(draft.sourcePresetId ? { sourcePresetId: draft.sourcePresetId } : {}),
            } satisfies Routine,
            ...prev.routines,
          ]
        : prev.routines

      // 추가한 것도 학습한다 — 완료까지 안 가도 "이 사람이 쓰는 퀘스트" 다
      const usageProfiles = quest
        ? recordAdded(prev.usageProfiles, seedOf(quest), now)
        : prev.usageProfiles

      if (quest) {
        commit({ ...prev, quests: [quest, ...prev.quests], routines, usageProfiles })
      } else {
        commit({ ...prev, routines })
      }
      return quest
    },
    [commit],
  )

  /**
   * 퀘스트 완료 — 이 앱의 보상 루프가 전부 여기서 돈다.
   *
   * 현실 행동 → EXP · Coin · Stat · Drop · Character Growth
   *
   * 실제로 받은 값을 quest.reward 에 적어둔다.
   * 되돌리기가 정확히 반대로 돌려면 그때 무엇을 받았는지 알아야 한다.
   */
  const completeQuest = useCallback(
    (id: string): CompleteResult | null => {
      const prev = stateRef.current
      const target = prev.quests.find((q) => q.id === id)
      if (!target || target.completed) return null

      const now = new Date()
      const sources = bonusSources(prev)

      // 마셔둔 게 있으면 이번 퀘스트에 한 번 쓴다
      const buff = pickBuff(prev.user.activeBuffs, target.category)

      const reward = calculateQuestReward({
        ...sources,
        category: target.category,
        difficulty: target.difficulty,
        baseExp: target.exp,
        buff,
      })

      const outcome = applyExp(prev.user.level, prev.user.currentExp, reward.exp)
      const statKey = STAT_BY_CATEGORY[target.category]
      const drop = rollDrop(sources, itemsByRarity)

      // 평판은 NPC 의뢰면 그 사람의 동네에, 아니면 지금 있는 동네에 쌓인다
      const npc = target.npcId ? findNpc(target.npcId) : null
      const areaId = npc ? npc.areaId : prev.user.currentAreaId
      const isNpcQuest = target.questType === 'NPC'
      const gainedReputation = reputationGain(target.difficulty, isNpcQuest)

      // NPC 의뢰는 한 단계 끝낼 때마다 조금씩 가까워진다
      const bonuses = collectBonuses(sources)
      const gainedFriendship = npc
        ? Math.max(1, Math.round(3 * (1 + bonuses.friendshipPct / 100)))
        : 0

      const earned = { ...target, exp: reward.exp }
      const withBuffUsed = spendBuff(prev.user.activeBuffs, buff)

      // 재료·수집품은 EXP·Coin 계산과 따로 굴린다. 보상 계산기는 손대지 않는다 —
      // 여기서 쓰는 건 이미 계산된 행운 값 하나뿐이다.
      const dropped = rollCollectDrops({
        category: target.category,
        luckPct: bonuses.dropChancePct,
        eventActive: sources.events.length > 0,
      })
      let collection = prev.collection
      const collectDrops: Array<{ itemId: string; wasNew: boolean }> = []
      const collected: DiscoveryResult[] = []

      for (const itemId of dropped) {
        const added = addItem(collection, itemId, now)
        collection = added.collection
        collectDrops.push({ itemId, wasNew: added.isNew })
        collected.push({ itemId, isNew: added.isNew, source: `${target.title} 완료` })
      }

      // 정원을 찾은 사람에게만, 위의 굴림과는 따로 씨앗을 굴린다.
      // 기존 재료 풀에 섞지 않는 이유는 lib/collection/catalog.ts 의 주석에 있다.
      const gardenDropped = rollGardenDrops(prev, {
        category: target.category,
        difficulty: target.difficulty,
        // 밤에만 다시 나오는 씨앗이 있다 (별빛꽃 · 달빛허브)
        night: timeBand(now) === 'NIGHT',
      })
      const gardenDrops: Array<{ itemId: string; wasNew: boolean }> = []
      for (const itemId of gardenDropped) {
        const added = addItem(collection, itemId, now)
        collection = added.collection
        gardenDrops.push({ itemId, wasNew: added.isNew })
        collected.push({ itemId, isNew: added.isNew, source: `${target.title} 완료` })
      }

      // 모험 에너지. 한도를 넘으면 넘치는 만큼은 버린다 —
      // 실제로 오른 만큼만 적어둬야 되돌릴 때 그만큼만 빠진다.
      const gainedEnergy = gainEnergy(
        prev.user.adventureEnergy,
        ENERGY_BY_DIFFICULTY[target.difficulty],
        prev.user.maxAdventureEnergy,
      )

      let next: AppState = {
        ...prev,
        user: {
          ...prev.user,
          level: outcome.level,
          currentExp: outcome.currentExp,
          totalExp: prev.user.totalExp + reward.exp,
          totalCompletedQuests: prev.user.totalCompletedQuests + 1,
          coins: prev.user.coins + reward.coins,
          stats: { ...prev.user.stats, [statKey]: prev.user.stats[statKey] + 1 },
          activeBuffs: withBuffUsed,
          adventureEnergy: prev.user.adventureEnergy + gainedEnergy,
        },
        quests: prev.quests.map((q) =>
          q.id === id
            ? {
                ...q,
                completed: true,
                completedAt: now.toISOString(),
                reward: {
                  exp: reward.exp,
                  coins: reward.coins,
                  statKey,
                  ...(drop ? { droppedItemId: drop.itemId } : {}),
                  areaId,
                  reputation: gainedReputation,
                  ...(npc ? { npcId: npc.id, friendship: gainedFriendship } : {}),
                  ...(buff ? { usedBuff: buff } : {}),
                  ...(collectDrops.length > 0 ? { collectDrops } : {}),
                  ...(gardenDrops.length > 0 ? { gardenDrops } : {}),
                  ...(gainedEnergy > 0 ? { adventureEnergy: gainedEnergy } : {}),
                },
              }
            : q,
        ),
        inventory: drop
          ? addToInventory(prev.inventory, drop.itemId, `${target.title} 완료`, now)
          : prev.inventory,
        categoryStats: {
          ...prev.categoryStats,
          [target.category]: prev.categoryStats[target.category] + reward.exp,
        },
        categoryCompleted: {
          ...prev.categoryCompleted,
          [target.category]: prev.categoryCompleted[target.category] + 1,
        },
        dailyLog: bumpDailyLog(prev, earned),
        usageProfiles: recordCompleted(prev.usageProfiles, seedOf(target), now),
        reputation: {
          ...prev.reputation,
          [areaId]: (prev.reputation[areaId] ?? 0) + gainedReputation,
        },
        collection,
      }

      if (npc) {
        next = bumpFriendship(next, npc.id, gainedFriendship)
        // 다음 단계를 열거나, 마지막이면 의뢰를 끝낸다
        next = advanceChain(next, target, now)
      }

      const gainedSkillPoints = outcome.level - prev.user.level

      // 정원에서 자라는 중인 것들이 조금 앞당겨진다. 어디까지나 덤이다 —
      // 퀘스트를 안 해도 작물은 제 시간에 다 자란다.
      const bonusSeconds = GROWTH_BONUS_SECONDS[target.difficulty]
      const grown = applyGrowthBonus(next, bonusSeconds, now)
      next = grown.state
      if (grown.applied.length > 0) {
        next = {
          ...next,
          quests: next.quests.map((q) =>
            q.id === id && q.reward ? { ...q, reward: { ...q.reward, growthBonus: grown.applied } } : q,
          ),
        }
      }

      // 평판이 오르거나 세트가 완성되면 여기서 따라온다
      const derived = applyCollectionDerived(next, now)
      // 이번 퀘스트로 새로 열린 발견이 있으면 같이 챙긴다.
      // 보상 계산은 위에서 이미 끝났다 — 여기서 EXP·코인을 다시 계산하지 않는다.
      const discovered = applyDiscovery(derived.state, now)
      // 발견 보상이 도감을 늘리면 마일스톤·세트가 따라 완성될 수 있다
      const chained = applyCollectionDerived(discovered.state, now)
      // 이번 퀘스트로 조건을 채운 모습이 있으면 같이 챙긴다.
      // 모습에는 EXP·코인이 없어서 보상 계산에 끼어들지 않는다.
      const skinned = applySkinUnlocks(chained.state)
      if (discovered.notes.length > 0) setDiscoveryNotes(discovered.notes)
      if (skinned.unlocked.length > 0) setNewSkins(skinned.unlocked)
      commit(skinned.state)

      return {
        gainedExp: reward.exp,
        gainedCoins: reward.coins,
        bonusExp: reward.bonusExp,
        leveledUp: outcome.leveledUp,
        newLevel: outcome.level,
        statKey,
        drop,
        areaId,
        gainedReputation,
        npcId: npc?.id ?? null,
        gainedFriendship,
        usedBuffName: buff?.name ?? null,
        gainedSkillPoints,
        collected: [...collected, ...derived.discoveries],
        gainedEnergy,
        growthBonusSeconds: grown.applied.length > 0 ? bonusSeconds : 0,
      }
    },
    [commit],
  )

  /**
   * 완료를 되돌린다.
   *
   * totalExp 에서 빼고 레벨을 다시 계산한다. 되돌리다 레벨이 내려가는 경우까지
   * 정확히 맞는다 — levelFromTotalExp 가 applyExp 를 쌓은 결과와 늘 같기 때문이다.
   */
  const uncompleteQuest = useCallback(
    (id: string) => {
      const prev = stateRef.current
      const target = prev.quests.find((q) => q.id === id)
      if (!target || !target.completed) return

      // 완료할 때 적어둔 값이 있으면 그걸 쓴다. 없는 옛 기록은 exp 만 되돌린다.
      const gained = target.reward ?? { exp: target.exp, coins: 0, statKey: null }
      const totalExp = Math.max(0, prev.user.totalExp - gained.exp)
      const { level, currentExp } = levelFromTotalExp(totalExp)

      // 그날 기록에서도 뺀다. 어제 완료한 걸 오늘 되돌려도 어제 칸에서 빠져야 한다.
      const dayKey = target.completedAt ? toDayKey(target.completedAt) : todayKey()
      const day = prev.dailyLog[dayKey]
      const dailyLog = { ...prev.dailyLog }

      if (day) {
        const byCategory = { ...day.byCategory }
        const left = (byCategory[target.category] ?? 0) - gained.exp
        if (left > 0) byCategory[target.category] = left
        else delete byCategory[target.category]

        const completed = Math.max(0, day.completed - 1)
        const exp = Math.max(0, day.exp - gained.exp)
        if (completed === 0 && exp === 0) delete dailyLog[dayKey]
        else dailyLog[dayKey] = { completed, exp, byCategory }
      }

      // 이 완료 때문에 열렸던 다음 단계는 도로 거둔다.
      // 안 그러면 3단계짜리 의뢰가 되돌릴 때마다 하나씩 늘어난다.
      const openedNext =
        target.chainId && target.step
          ? prev.quests.find(
              (q) =>
                q.chainId === target.chainId && q.step === target.step! + 1 && !q.completed,
            )
          : undefined

      const npcId = gained.npcId
      const npcState = npcId ? (prev.npcs[npcId] ?? emptyNpcState()) : null

      // 그때 나온 재료·수집품도 도로 가져간다.
      // 처음 본 것이었으면 도감에서도 지운다 — 안 그러면 완료·되돌리기로 도감만 채울 수 있다.
      let collection = prev.collection
      for (const drop of gained.collectDrops ?? []) {
        collection = removeItem(collection, drop.itemId, drop.wasNew)
      }
      // 그때 나온 씨앗과 이슬도 마찬가지다
      for (const drop of gained.gardenDrops ?? []) {
        collection = removeItem(collection, drop.itemId, drop.wasNew)
      }

      // 앞당겨줬던 밭은 도로 민다. 그 사이 거두고 다시 심은 칸은 건너뛴다.
      const pushedBack = revertGrowthBonus(prev, gained.growthBonus ?? [])

      commit({
        ...pushedBack,
        collection,
        categoryCompleted: {
          ...prev.categoryCompleted,
          [target.category]: Math.max(0, prev.categoryCompleted[target.category] - 1),
        },
        user: {
          ...prev.user,
          level,
          currentExp,
          totalExp,
          totalCompletedQuests: Math.max(0, prev.user.totalCompletedQuests - 1),
          coins: Math.max(0, prev.user.coins - gained.coins),
          stats: gained.statKey
            ? {
                ...prev.user.stats,
                [gained.statKey]: Math.max(0, prev.user.stats[gained.statKey] - 1),
              }
            : prev.user.stats,
          // 마셨던 건 다시 살려낸다 — 아직 안 쓴 셈이 되니까
          activeBuffs: restoreBuff(prev.user.activeBuffs, gained.usedBuff),
          // 그때 실제로 오른 만큼만 뺀다. 넘쳐서 버려졌던 몫은 애초에 안 적혀 있다.
          adventureEnergy: Math.max(0, prev.user.adventureEnergy - (gained.adventureEnergy ?? 0)),
        },
        quests: prev.quests
          .filter((q) => q.id !== openedNext?.id)
          .map((q) => {
            if (q.id !== id) return q
            const { reward: _dropped, ...rest } = q
            return { ...rest, completed: false, completedAt: null }
          }),
        // 떨어졌던 아이템도 도로 가져간다. 안 그러면 완료·되돌리기로 계속 주울 수 있다.
        inventory: gained.droppedItemId
          ? removeFromInventory(prev.inventory, gained.droppedItemId)
          : prev.inventory,
        categoryStats: {
          ...prev.categoryStats,
          [target.category]: Math.max(0, prev.categoryStats[target.category] - gained.exp),
        },
        dailyLog,
        // 되돌리기로 숫자만 불어나면 추천이 엉뚱해진다. 그때 올린 만큼만 내린다.
        usageProfiles: reverseCompleted(
          prev.usageProfiles,
          questKeyOf(target),
          target.completedAt,
        ),
        reputation: gained.areaId
          ? {
              ...prev.reputation,
              [gained.areaId]: Math.max(
                0,
                (prev.reputation[gained.areaId] ?? 0) - (gained.reputation ?? 0),
              ),
            }
          : prev.reputation,
        // 친밀도는 시간이 지나도 줄지 않지만, 잘못 누른 완료를 되돌리는 건 다른 얘기다.
        // 그때 받은 만큼만 정확히 돌려놓는다.
        npcs:
          npcId && npcState
            ? {
                ...prev.npcs,
                [npcId]: {
                  ...npcState,
                  friendship: Math.max(0, npcState.friendship - (gained.friendship ?? 0)),
                },
              }
            : prev.npcs,
      })
    },
    [commit],
  )

  /**
   * 아직 안 끝낸 퀘스트만 고칠 수 있다.
   * 이미 완료한 걸 고치면 지난 통계와 어긋나서, 그건 되돌린 뒤에 고치게 한다.
   */
  const updateQuest = useCallback(
    (id: string, draft: QuestDraft) => {
      const prev = stateRef.current
      const target = prev.quests.find((q) => q.id === id)
      if (!target || target.completed) return

      const title = draft.title.trim()
      if (!title) return

      commit({
        ...prev,
        quests: prev.quests.map((q) =>
          q.id === id
            ? {
                ...q,
                title,
                category: draft.category,
                difficulty: draft.difficulty,
                // 아직 안 받은 EXP 라 난이도에 맞춰 다시 잡아도 된다
                exp: expForDifficulty(draft.difficulty),
              }
            : q,
        ),
      })
    },
    [commit],
  )

  /** 오늘은 넘긴다. 내일 다시 보인다. */
  const snoozeQuest = useCallback(
    (id: string) => {
      const prev = stateRef.current
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      commit({
        ...prev,
        quests: prev.quests.map((q) =>
          q.id === id && !q.completed ? { ...q, snoozedUntil: todayKey(tomorrow) } : q,
        ),
      })
    },
    [commit],
  )

  const unsnoozeQuest = useCallback(
    (id: string) => {
      const prev = stateRef.current
      commit({
        ...prev,
        quests: prev.quests.map((q) => {
          if (q.id !== id) return q
          const { snoozedUntil: _dropped, ...rest } = q
          return rest
        }),
      })
    },
    [commit],
  )

  /**
   * 퀘스트만 목록에서 지운다.
   *
   * 이미 받은 EXP·통계·기록은 손대지 않는다. 한 번 한 일을 나중에 빼앗지 않으려는 것이고,
   * 통계를 quests 에서 유도하지 않고 따로 쌓아둔 이유이기도 하다.
   */
  const deleteQuest = useCallback(
    (id: string) => {
      const prev = stateRef.current
      commit({ ...prev, quests: prev.quests.filter((q) => q.id !== id) })
    },
    [commit],
  )

  const toggleRoutinePause = useCallback(
    (id: string) => {
      const prev = stateRef.current
      commit({
        ...prev,
        routines: prev.routines.map((r) => (r.id === id ? { ...r, paused: !r.paused } : r)),
      })
    },
    [commit],
  )

  /** 반복만 지운다. 오늘 이미 만들어진 퀘스트는 그대로 둔다 — 이미 내 오늘 몫이다. */
  const deleteRoutine = useCallback(
    (id: string) => {
      const prev = stateRef.current
      commit({ ...prev, routines: prev.routines.filter((r) => r.id !== id) })
    },
    [commit],
  )

  // ── RPG ────────────────────────────────────────────────
  const setClass = useCallback(
    (classId: ClassId) => {
      const prev = stateRef.current
      commit({ ...prev, user: { ...prev.user, classId } })
    },
    [commit],
  )

  const setArea = useCallback(
    (areaId: AreaId) => {
      const prev = stateRef.current
      commit({ ...prev, user: { ...prev.user, currentAreaId: areaId } })
    },
    [commit],
  )

  /** 같은 슬롯에 이미 뭔가 있으면 바꿔 낀다. */
  const equipItem = useCallback(
    (itemId: string) => {
      const prev = stateRef.current
      const def = ITEMS.find((i) => i.id === itemId)
      if (!def?.equipSlot) return
      if (!prev.inventory.some((e) => e.itemId === itemId)) return

      commit({
        ...prev,
        user: {
          ...prev.user,
          equippedItems: { ...prev.user.equippedItems, [def.equipSlot]: itemId },
        },
      })
    },
    [commit],
  )

  const unequipSlot = useCallback(
    (slot: EquipSlot) => {
      const prev = stateRef.current
      commit({
        ...prev,
        user: { ...prev.user, equippedItems: { ...prev.user.equippedItems, [slot]: null } },
      })
    },
    [commit],
  )

  const startBattle = useCallback(
    (def: BattleDef): Battle => {
      const prev = stateRef.current
      const battle = createBattle(def, createId)
      commit({ ...prev, battles: [battle, ...prev.battles] })
      return battle
    },
    [commit],
  )

  /**
   * 몬스터·보스에게 행동 하나를 쓴다.
   * HP 가 0 이 되면 그 자리에서 보상을 준다.
   */
  const doBattleAction = useCallback(
    (battleId: string, actionId: string): BattleClearResult | null => {
      const prev = stateRef.current
      const battle = prev.battles.find((b) => b.id === battleId)
      if (!battle) return null

      const now = new Date()
      const result = applyBattleAction(battle, actionId, now)
      if (!result) return null

      const battles = prev.battles.map((b) => (b.id === battleId ? result.battle : b))

      if (!result.cleared) {
        commit({ ...prev, battles })
        return {
          cleared: false,
          exp: 0,
          coins: 0,
          leveledUp: false,
          newLevel: prev.user.level,
          drops: [],
          collected: [],
        }
      }

      // 클리어 — 보장 등급을 먼저 주고, 보너스 등급이 있으면 하나 더 굴린다
      const drops: DropResult[] = []
      let inventory = prev.inventory

      for (const rarity of clearRarities(battle)) {
        const pool = itemsByRarity(rarity)
        if (pool.length === 0) continue
        const itemId = pool[Math.floor(Math.random() * pool.length)]
        drops.push({ itemId, rarity })
        inventory = addToInventory(inventory, itemId, `${battle.name} 클리어`, now)
      }

      const outcome = applyExp(prev.user.level, prev.user.currentExp, battle.rewardExp)

      // 보스를 넘으면 도감 물건도 하나 나온다. 몬스터는 기존 드롭만.
      let collection = prev.collection
      const collected: DiscoveryResult[] = []
      if (battle.kind === 'BOSS') {
        const itemId = rollBossDrop()
        if (itemId) {
          const added = addItem(collection, itemId, now)
          collection = added.collection
          collected.push({ itemId, isNew: added.isNew, source: `${battle.name} 클리어` })
        }
      }

      // 보스를 넘으면 씨앗도 반쯤 확률로 나온다. 몬스터는 기존 드롭만.
      const isBoss = battle.kind === 'BOSS'
      for (const itemId of rollGardenDrops(prev, {
        category: battle.category,
        difficulty: 'HARD',
        boss: isBoss,
      })) {
        const added = addItem(collection, itemId, now)
        collection = added.collection
        collected.push({ itemId, isNew: added.isNew, source: `${battle.name} 클리어` })
      }

      const cleared: AppState = {
        ...prev,
        battles,
        inventory,
        collection,
        bossClears: prev.bossClears + (isBoss ? 1 : 0),
        user: {
          ...prev.user,
          level: outcome.level,
          currentExp: outcome.currentExp,
          totalExp: prev.user.totalExp + battle.rewardExp,
          coins: prev.user.coins + battle.rewardCoins,
          adventureEnergy:
            prev.user.adventureEnergy +
            gainEnergy(
              prev.user.adventureEnergy,
              isBoss ? ENERGY_BOSS : ENERGY_BY_DIFFICULTY.NORMAL,
              prev.user.maxAdventureEnergy,
            ),
        },
        categoryStats: {
          ...prev.categoryStats,
          [battle.category]: prev.categoryStats[battle.category] + battle.rewardExp,
        },
      }

      // 큰 걸 하나 넘었으면 정원의 것들도 그만큼 앞당겨진다
      const grown = applyGrowthBonus(cleared, isBoss ? GROWTH_BONUS_BOSS : GROWTH_BONUS_SECONDS.HARD, now)

      const derived = applyCollectionDerived(grown.state, now)
      commit(derived.state)

      return {
        cleared: true,
        exp: battle.rewardExp,
        coins: battle.rewardCoins,
        leveledUp: outcome.leveledUp,
        newLevel: outcome.level,
        drops,
        collected: [...collected, ...derived.discoveries],
      }
    },
    [commit],
  )

  const undoBattleActionById = useCallback(
    (battleId: string, actionId: string) => {
      const prev = stateRef.current
      const battle = prev.battles.find((b) => b.id === battleId)
      if (!battle || battle.status === 'CLEARED') return

      const next = undoBattleAction(battle, actionId)
      if (!next) return
      commit({ ...prev, battles: prev.battles.map((b) => (b.id === battleId ? next : b)) })
    },
    [commit],
  )

  const removeBattle = useCallback(
    (battleId: string) => {
      const prev = stateRef.current
      commit({ ...prev, battles: prev.battles.filter((b) => b.id !== battleId) })
    },
    [commit],
  )

  // ── 도시 ────────────────────────────────────────────────

  /** 하루 첫 대화만 친밀도가 오른다. 계속 누르면 오르는 구조면 대화가 버튼이 된다. */
  const talkToNpc = useCallback(
    (npcId: NpcId): TalkResult | null => {
      const prev = stateRef.current
      const npc = findNpc(npcId)
      if (!npc) return null

      const npcState: NpcState = prev.npcs[npcId] ?? emptyNpcState()
      const dayKey = todayKey()
      const gained = talkGain(npcState, dayKey, collectBonuses(bonusSources(prev)))

      const friendship = Math.min(FRIENDSHIP_MAX, npcState.friendship + gained)
      const leveledUp = crossedFriendshipLevel(npcState.friendship, friendship)

      commit({
        ...prev,
        npcs: { ...prev.npcs, [npcId]: { ...npcState, friendship, lastTalkedOn: dayKey } },
      })

      return { gained, friendship, leveledUp }
    },
    [commit],
  )

  /** 선물. 좋아하는 결이면 두 배쯤 오른다. */
  const giftToNpc = useCallback(
    (npcId: NpcId, itemId: string): GiftResult | null => {
      const prev = stateRef.current
      const npc = findNpc(npcId)
      if (!npc) return null

      // 가방 물건인지, 부엌에서 만든 음식인지.
      // 친밀도가 오르는 식은 둘 다 하나뿐이다 (giftGainForTags).
      const item = findItem(itemId)
      const food = recipeForFood(itemId)
      const tags = item ? (item.giftTags ?? []) : (food?.giftTags ?? [])

      if (item) {
        if (!prev.inventory.some((e) => e.itemId === itemId)) return null
      } else if (food) {
        if (ownedCount(prev.collection, itemId) < 1) return null
      } else {
        return null
      }

      const bonuses = collectBonuses(bonusSources(prev))
      const gained = giftGainForTags(npc, tags, bonuses)
      const liked = tags.some((tag) => npc.likes.includes(tag))

      const npcState: NpcState = prev.npcs[npcId] ?? emptyNpcState()
      const friendship = Math.min(FRIENDSHIP_MAX, npcState.friendship + gained)

      // 음식은 도감에서 하나 빠진다. 발견 기록은 지우지 않는다 —
      // 줘버렸다고 만들어본 적이 없어지는 건 아니다.
      const collection = food
        ? (spendItems(prev.collection, [{ itemId, count: 1 }]) ?? prev.collection)
        : prev.collection

      commit({
        ...prev,
        collection,
        // 준 물건은 손에서 떠난다. 장착 중이었으면 슬롯도 비운다.
        inventory: item ? removeFromInventory(prev.inventory, itemId) : prev.inventory,
        user: { ...prev.user, equippedItems: unequipIfGone(prev.user.equippedItems, itemId) },
        npcs: { ...prev.npcs, [npcId]: { ...npcState, friendship } },
      })

      return {
        gained,
        friendship,
        liked,
        leveledUp: crossedFriendshipLevel(npcState.friendship, friendship),
        lines: food ? foodGiftLines(npcId, food.id) : [],
      }
    },
    [commit],
  )

  /** 의뢰를 받는다. 첫 단계 하나만 만들어진다. */
  const acceptChain = useCallback(
    (chain: NpcQuestChainDef): Quest | null => {
      const prev = stateRef.current
      const first = chain.steps[0]
      if (!first) return null

      // 이미 진행 중이거나 끝낸 의뢰는 다시 받지 않는다
      const running = prev.quests.some((q) => q.chainId === chain.id && !q.completed)
      const cleared = (prev.npcs[chain.npcId]?.clearedChainIds ?? []).includes(chain.id)
      if (running || cleared) return null

      const quest: Quest = {
        id: createId(),
        title: first.title,
        category: first.category,
        difficulty: first.difficulty,
        exp: npcStepExp(first.difficulty),
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        questType: 'NPC',
        npcId: chain.npcId,
        chainId: chain.id,
        step: 1,
        totalSteps: chain.steps.length,
      }

      commit({ ...prev, quests: [quest, ...prev.quests] })
      return quest
    },
    [commit],
  )

  /** 상점에서 하나 산다. Coin 은 현실에서 뭔가 해야만 생긴다. */
  const buyItem = useCallback(
    (shop: ShopDef, itemId: string): BuyResult => {
      const prev = stateRef.current
      const entry = shopStock(shop).find((e) => e.itemId === itemId)
      const def = findItem(itemId)
      if (!entry || !def) return { ok: false, reason: 'UNKNOWN' }

      // 장비는 하나면 충분하다. 소모품은 얼마든지 더 살 수 있다.
      const owned = prev.inventory.some((e) => e.itemId === itemId)
      if (owned && def.type !== 'CONSUMABLE') return { ok: false, reason: 'ALREADY_OWNED' }
      if (prev.user.coins < entry.price) return { ok: false, reason: 'NOT_ENOUGH_COINS' }

      commit({
        ...prev,
        user: { ...prev.user, coins: prev.user.coins - entry.price },
        inventory: addToInventory(prev.inventory, itemId, shop.name, new Date()),
      })

      return { ok: true, itemId, price: entry.price }
    },
    [commit],
  )

  /** 마시거나 먹는다. 다음 퀘스트 하나에만 걸린다. */
  const useConsumable = useCallback(
    (itemId: string): ActiveBuff | null => {
      const prev = stateRef.current
      const def = findItem(itemId)
      if (!def?.consumable) return null
      if (!prev.inventory.some((e) => e.itemId === itemId)) return null

      const buff: ActiveBuff = {
        id: createId(),
        itemId,
        name: def.name,
        icon: def.icon,
        category: def.consumable.category,
        expPct: def.consumable.expPct,
        uses: def.consumable.uses,
        startedAt: new Date().toISOString(),
      }

      commit({
        ...prev,
        inventory: removeFromInventory(prev.inventory, itemId),
        user: { ...prev.user, activeBuffs: [...prev.user.activeBuffs, buff] },
      })

      return buff
    },
    [commit],
  )

  /** 스킬을 찍는다. 포인트가 모자라거나 앞 단계를 안 찍었으면 아무 일도 없다. */
  const unlockSkill = useCallback(
    (skillId: string): boolean => {
      const prev = stateRef.current
      const skill = findSkillDef(skillId)
      if (!skill) return false
      if (skillState(skill, prev.user.level, prev.user.unlockedSkills) !== 'AVAILABLE') return false

      commit({
        ...prev,
        user: { ...prev.user, unlockedSkills: [...prev.user.unlockedSkills, skillId] },
      })
      return true
    },
    [commit],
  )

  // ── 퀘스트 라이브러리 ────────────────────────────────────
  const toggleQuestFavorite = useCallback(
    (seed: ProfileSeed) => {
      const prev = stateRef.current
      commit({ ...prev, usageProfiles: toggleFavorite(prev.usageProfiles, seed) })
    },
    [commit],
  )

  const dismissRecommendation = useCallback(
    (seed: ProfileSeed) => {
      const prev = stateRef.current
      commit({ ...prev, usageProfiles: recordDismiss(prev.usageProfiles, seed) })
    },
    [commit],
  )

  const hideRecommendationToday = useCallback(
    (seed: ProfileSeed) => {
      const prev = stateRef.current
      commit({ ...prev, usageProfiles: hideForToday(prev.usageProfiles, seed) })
    },
    [commit],
  )

  const setPersonalized = useCallback(
    (on: boolean) => {
      const prev = stateRef.current
      commit({ ...prev, recommendSettings: { ...prev.recommendSettings, personalized: on } })
    },
    [commit],
  )

  /** 추천 기록만 지운다. 퀘스트·EXP·반복·완료 기록은 손대지 않는다. */
  const resetUsageProfiles = useCallback(() => {
    const prev = stateRef.current
    commit({ ...prev, usageProfiles: {}, recommendSettings: defaultRecommendSettings() })
  }, [commit])

  // ── 수집 · 방 ──────────────────────────────────────────

  /**
   * 도감 상점에서 산다.
   *
   * 하나뿐인 물건은 오늘 하루 한 개까지만. 가구·소품은 여러 개 살 수 있다 —
   * 의자를 두 개 놓고 싶은 사람을 막을 이유가 없다.
   */
  const buyCollectionItem = useCallback(
    (shopId: CollectionShopId, itemId: string): CollectBuyResult => {
      const prev = stateRef.current
      const shop = findCollectionShop(shopId)
      const def = findCollectionItem(itemId)
      if (!shop || !def) return { ok: false, reason: 'UNKNOWN' }

      const now = new Date()
      if (!isCollectionShopOpen(shop, now)) return { ok: false, reason: 'CLOSED' }

      const dayKey = todayKey()
      const listing = todayListings(shop, dayKey, {
        reputation: prev.reputation[shop.areaId] ?? 0,
        playerLevel: prev.user.level,
        collection: prev.collection,
      }).find((l) => l.itemId === itemId)
      if (!listing) return { ok: false, reason: 'UNKNOWN' }
      if (listing.locked) return { ok: false, reason: 'LOCKED' }

      const key = `${dayKey}:${shopId}:${itemId}`
      const boughtToday = prev.collection.purchases[key] ?? 0
      // 남은 개수는 진열이 이미 계산해뒀다. 여기서 또 세면 두 곳이 어긋난다.
      if (listing.remaining <= 0) return { ok: false, reason: 'SOLD_OUT' }
      if (prev.user.coins < listing.price) return { ok: false, reason: 'NOT_ENOUGH_COINS' }

      const added = addItem(prev.collection, itemId, now)
      const bought: AppState = {
        ...prev,
        user: { ...prev.user, coins: prev.user.coins - listing.price },
        collection: {
          ...added.collection,
          purchases: { ...added.collection.purchases, [key]: boughtToday + 1 },
          // 찾던 물건을 샀으면 목록에서 뺀다. 계속 남아 있으면 매일 알림이 온다.
          wishlist: added.collection.wishlist.filter((id) => id !== itemId),
        },
      }

      const derived = applyCollectionDerived(bought, now)
      commit(derived.state)

      return {
        ok: true,
        itemId,
        price: listing.price,
        isNew: added.isNew,
        discoveries: [
          ...(added.isNew ? [{ itemId, isNew: true, source: shop.name }] : []),
          ...derived.discoveries,
        ],
        notes: derived.notes,
      }
    },
    [commit],
  )

  /** 작은 작업실. 재료를 쓰고 하나 만든다. */
  const craftItem = useCallback(
    (recipeId: string): CraftResult => {
      const prev = stateRef.current
      const recipe = findRecipe(recipeId)
      if (!recipe) return { ok: false, reason: 'UNKNOWN' }

      if (!isRecipeKnown(recipe, recipeContextOf(prev))) return { ok: false, reason: 'LOCKED' }
      if (!canCraft(recipe, prev.collection)) return { ok: false, reason: 'MISSING' }

      const now = new Date()
      const spent = spendItems(prev.collection, recipe.ingredients)
      if (!spent) return { ok: false, reason: 'MISSING' }

      const added = addItem(spent, recipe.resultItemId, now)
      const derived = applyCollectionDerived({ ...prev, collection: added.collection }, now)
      commit(derived.state)

      return {
        ok: true,
        itemId: recipe.resultItemId,
        isNew: added.isNew,
        discoveries: [
          ...(added.isNew
            ? [{ itemId: recipe.resultItemId, isNew: true, source: '작은 작업실' }]
            : []),
          ...derived.discoveries,
        ],
        notes: derived.notes,
      }
    },
    [commit],
  )

  const toggleWishlist = useCallback(
    (itemId: string) => {
      const prev = stateRef.current
      const list = prev.collection.wishlist
      const next = list.includes(itemId)
        ? list.filter((id) => id !== itemId)
        : [...list, itemId]
      commit({ ...prev, collection: { ...prev.collection, wishlist: next } })
    },
    [commit],
  )

  /**
   * 가게에 들렀다.
   *
   * 오늘 진열대에 있던 것을 "본 것" 으로 적는다. 도감 수는 안 는다 —
   * 본 것과 가진 것은 다르고, 봤다고 모은 게 되면 모으는 재미가 없다.
   */
  const visitShop = useCallback(
    (shopId: CollectionShopId, itemIds: string[]) => {
      const prev = stateRef.current
      const dayKey = todayKey()

      const seen = markSeen(prev.collection, itemIds)
      const visited = markShopVisited(seen, shopId, dayKey)
      if (visited === prev.collection) return

      commit({ ...prev, collection: visited })
    },
    [commit],
  )

  /**
   * 문 앞에 온 것을 받는다.
   *
   * 하루에 하나뿐이고, 받았는지는 날짜로 기억한다.
   * 안 받고 넘긴 날은 그냥 지나간다 — 놓쳤다고 알려주지 않는다.
   */
  const claimDelivery = useCallback((): DeliveryClaim | null => {
    const prev = stateRef.current
    const dayKey = todayKey()
    const delivery = pendingDelivery(prev, dayKey)
    if (!delivery) return null

    const now = new Date()
    const added = addItem(prev.collection, delivery.itemId, now)
    const claimed: AppState = {
      ...prev,
      collection: {
        ...added.collection,
        claimedDeliveries: [...added.collection.claimedDeliveries, dayKey],
      },
    }

    const derived = applyCollectionDerived(claimed, now)
    commit(derived.state)

    return {
      itemId: delivery.itemId,
      isNew: added.isNew,
      from: delivery.from,
      discoveries: [
        ...(added.isNew ? [{ itemId: delivery.itemId, isNew: true, source: delivery.from }] : []),
        ...derived.discoveries,
      ],
      notes: derived.notes,
    }
  }, [commit])


  // ── 발견 ────────────────────────────────────────────

  /**
   * 이야기 한 장을 읽는다.
   *
   * 읽는 것 자체가 전부다. 퀘스트를 시키지 않는다.
   * 읽고 나면 그 사람과 조금 더 가까워지고, 가끔 물건 하나를 준다.
   */
  const readChapter = useCallback(
    (chapterId: string): ChapterResult | null => {
      const prev = stateRef.current
      const def = findChapter(chapterId)
      if (!def) return null
      if (prev.discovery.readChapterIds.includes(chapterId)) return null
      if (!isChapterUnlocked(prev, def)) return null

      const now = new Date()
      const npc = prev.npcs[def.npcId] ?? emptyNpcState()

      let next: AppState = {
        ...prev,
        npcs: {
          ...prev.npcs,
          [def.npcId]: {
            ...npc,
            friendship: Math.min(FRIENDSHIP_MAX, npc.friendship + def.rewardFriendship),
          },
        },
        discovery: {
          ...prev.discovery,
          readChapterIds: [...prev.discovery.readChapterIds, chapterId],
        },
      }

      let isNew = false
      if (def.rewardItemId) {
        const added = addItem(next.collection, def.rewardItemId, now)
        isNew = added.isNew
        next = { ...next, collection: added.collection }
      }

      // 이 장이 비밀을 여는 장이면 바로 열어준다
      if (def.unlocksSecret && !next.discovery.foundSecretIds.includes(def.unlocksSecret)) {
        next = {
          ...next,
          discovery: {
            ...next.discovery,
            foundSecretIds: [...next.discovery.foundSecretIds, def.unlocksSecret],
          },
        }
      }

      const derived = applyCollectionDerived(next, now)
      const discovered = applyDiscovery(derived.state, now)
      setDiscoveryNotes(discovered.notes)
      commit(discovered.state)

      return {
        chapterId,
        title: def.title,
        lines: def.lines,
        itemId: def.rewardItemId,
        isNew,
        discoveries: [
          ...(isNew && def.rewardItemId
            ? [{ itemId: def.rewardItemId, isNew: true, source: def.title }]
            : []),
          ...derived.discoveries,
        ],
        unlockedSecretName: def.unlocksSecret ? (findSecret(def.unlocksSecret)?.name ?? null) : null,
      }
    },
    [commit],
  )

  /** 같이 다닐 아이를 고른다 */
  const setActiveCompanion = useCallback(
    (id: CompanionId | null) => {
      const prev = stateRef.current
      if (id !== null && prev.discovery.companions[id] === undefined) return
      commit({ ...prev, discovery: { ...prev.discovery, activeCompanionId: id } })
    },
    [commit],
  )

  /**
   * 동료에게 인사한다.
   *
   * 하루에 한 번만 친밀도가 오른다. 여러 번 눌러도 되지만 그때는 안 오른다 —
   * 눌러야 이득인 버튼을 만들면 그때부터 그건 숙제다.
   * 안 눌렀다고 줄어들지도 않는다.
   */
  const playWithCompanion = useCallback(
    (id: CompanionId): CompanionPlayResult | null => {
      const prev = stateRef.current
      const def = findCompanion(id)
      const state = prev.discovery.companions[id]
      if (!def || !state) return null

      const today = todayKey()
      // 요리가 걸린 기억도 같이 본다 — 만들어본 게 있으면 그날 열릴 수 있다
      const cooked = Object.keys(prev.kitchen.cookedRecipeCounts)
      const before = unlockedMemories(id, state.friendship, cooked).length

      if (state.lastPlayedOn === today) {
        return { name: def.name, gained: 0, friendship: state.friendship, memoryTitle: null }
      }

      // 좋아하는 동네에 같이 있으면 조금 더
      const gained = likesHere(def, prev.user.currentAreaId)
        ? PLAY_FRIENDSHIP_FAVORITE
        : PLAY_FRIENDSHIP
      const friendship = state.friendship + gained

      commit({
        ...prev,
        discovery: {
          ...prev.discovery,
          companions: {
            ...prev.discovery.companions,
            [id]: { ...state, friendship, lastPlayedOn: today },
          },
        },
      })

      const after = unlockedMemories(id, friendship, cooked)
      return {
        name: def.name,
        gained,
        friendship,
        memoryTitle: after.length > before ? after[after.length - 1].title : null,
      }
    },
    [commit],
  )

  const dismissDiscoveryNotes = useCallback(() => setDiscoveryNotes([]), [])

  /**
   * 지금 보고 있는 방에 하나 놓는다.
   *
   * 가진 개수보다 많이 놓을 수는 없다. 한가운데에서 조금씩 어긋나게 놓아서
   * 여러 개를 이어 놓아도 정확히 겹치지 않게 한다.
   */
  const placeInRoom = useCallback(
    (itemId: string): PlacedItem | null => {
      const prev = stateRef.current
      const def = findCollectionItem(itemId)
      if (!def || !def.placeable || !def.hasPlaceableAsset) return null

      const roomId = prev.collection.currentRoomId
      const placedEverywhere = Object.values(prev.collection.rooms).flat()
      const used = placedEverywhere.filter((p) => p.itemId === itemId).length
      if (used >= ownedCount(prev.collection, itemId)) return null

      const inRoom = prev.collection.rooms[roomId] ?? []
      const offset = (inRoom.length % 5) * 6

      // 종류에 맞는 자리에서 시작한다. 벽걸이가 바닥 한가운데에 놓이면
      // 놓자마자 옮겨야 하고, 그게 매번 반복되면 그것도 일이다.
      const startY: Record<string, number> = {
        RUG: 84,
        FLOOR: 66,
        TABLETOP: 58,
        DECOR: 62,
        SHELF: 52,
        WINDOW: 44,
        WALL: 28,
        HANGING: 18,
      }

      const placed: PlacedItem = {
        uid: createId(),
        itemId,
        x: Math.min(90, 32 + offset),
        y: Math.min(92, (startY[def.placementType ?? 'FLOOR'] ?? 60) + ((inRoom.length % 3) * 4)),
        scale: 1,
        flipped: false,
      }

      commit({
        ...prev,
        collection: {
          ...prev.collection,
          rooms: { ...prev.collection.rooms, [roomId]: [...inRoom, placed] },
        },
      })
      return placed
    },
    [commit],
  )

  /** 놓은 것 하나를 바꾼다 — 옮기기·크기·뒤집기·거두기가 전부 여기를 지난다 */
  const patchPlaced = useCallback(
    (uid: string, change: ((p: PlacedItem) => PlacedItem) | null) => {
      const prev = stateRef.current
      const roomId = prev.collection.currentRoomId
      const inRoom = prev.collection.rooms[roomId] ?? []
      if (!inRoom.some((p) => p.uid === uid)) return

      const next = change
        ? inRoom.map((p) => (p.uid === uid ? change(p) : p))
        : inRoom.filter((p) => p.uid !== uid)

      commit({
        ...prev,
        collection: { ...prev.collection, rooms: { ...prev.collection.rooms, [roomId]: next } },
      })
    },
    [commit],
  )

  const movePlaced = useCallback(
    (uid: string, x: number, y: number) => {
      const clamp = (v: number) => Math.min(96, Math.max(4, Math.round(v * 10) / 10))
      patchPlaced(uid, (p) => ({ ...p, x: clamp(x), y: clamp(y) }))
    },
    [patchPlaced],
  )

  const updatePlaced = useCallback(
    (uid: string, patch: { scale?: number; flipped?: boolean }) => {
      patchPlaced(uid, (p) => ({
        ...p,
        scale: patch.scale !== undefined ? Math.min(1.6, Math.max(0.6, patch.scale)) : p.scale,
        flipped: patch.flipped !== undefined ? patch.flipped : p.flipped,
      }))
    },
    [patchPlaced],
  )

  const removePlaced = useCallback((uid: string) => patchPlaced(uid, null), [patchPlaced])

  const setCurrentRoom = useCallback(
    (roomId: RoomId) => {
      const prev = stateRef.current
      commit({ ...prev, collection: { ...prev.collection, currentRoomId: roomId } })
    },
    [commit],
  )

  const setRoomEffect = useCallback(
    (effectId: HomeEffectId | null) => {
      const prev = stateRef.current
      const roomId = prev.collection.currentRoomId
      // 아직 안 열린 공기는 걸 수 없다
      if (effectId && !unlockedEffectIds(prev.collection).includes(effectId)) return

      commit({
        ...prev,
        collection: {
          ...prev.collection,
          roomEffects: { ...prev.collection.roomEffects, [roomId]: effectId },
        },
      })
    },
    [commit],
  )

  const renameUser = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const prev = stateRef.current
      commit({ ...prev, user: { ...prev.user, name: trimmed } })
    },
    [commit],
  )

  // ── 캐릭터 모습 ──────────────────────────────────────

  /**
   * 입는다.
   *
   * 고르기 → 적용 → 저장 같은 단계를 두지 않는다. 누르면 그 자리에서 바뀌고,
   * 상태가 바뀌면 저장은 알아서 따라온다.
   */
  const selectSkin = useCallback(
    (id: string) => {
      const prev = stateRef.current
      const next = wearSkin(prev, id)
      if (next === prev) return
      commit(next)
    },
    [commit],
  )

  const buySkin = useCallback(
    (id: string): BuySkinResult => {
      const prev = stateRef.current
      const { state: next, result } = buySkinIn(prev, id)
      if (result.ok) commit(next)
      return result
    },
    [commit],
  )

  const devGrantAllSkins = useCallback(() => {
    commit(grantAllSkins(stateRef.current))
  }, [commit])

  const dismissNewSkins = useCallback(() => setNewSkins([]), [])

  // ── 작은 정원 ───────────────────────────────────────────

  /**
   * 처음 들어갔을 때만 씨앗 두 개를 준다.
   *
   * tutorialSeenAt 하나로 막는다. 적는 것과 주는 것이 같은 갱신 안에서
   * 일어나서, 빠르게 두 번 눌러도 두 번 받을 수가 없다.
   */
  const enterGarden = useCallback(() => {
    const prev = stateRef.current
    if (!isGardenUnlocked(prev) || prev.garden.tutorialSeenAt !== null) return

    const now = new Date()
    let collection = prev.collection
    for (let i = 0; i < FIRST_SEEDS.count; i += 1) {
      collection = addItem(collection, FIRST_SEEDS.itemId, now).collection
    }

    commit({
      ...prev,
      collection,
      garden: { ...prev.garden, tutorialSeenAt: now.toISOString() },
    })
  }, [commit])

  const plantSeed = useCallback(
    (plotIndex: number, cropId: string): PlantResult => {
      const { state: next, result } = plantSeedIn(stateRef.current, plotIndex, cropId)
      if (result.ok) commit(next)
      return result
    },
    [commit],
  )

  /**
   * 거둔다.
   *
   * 거두면 도감이 늘고, 도감이 늘면 마일스톤·세트가 따라 완성될 수 있다.
   * 그래서 기존 사슬을 한 번 태운다 — 보상 계산을 여기서 다시 하지 않는다.
   */
  const harvestPlot = useCallback(
    (plotIndex: number): HarvestResult => {
      const prev = stateRef.current
      const now = new Date()
      const { state: harvested, result } = harvestPlotIn(prev, plotIndex, now)
      if (!result.ok) return result

      const derived = applyCollectionDerived(harvested, now)
      const discovered = applyDiscovery(derived.state, now)
      const skinned = applySkinUnlocks(discovered.state)
      if (discovered.notes.length > 0) setDiscoveryNotes(discovered.notes)
      if (skinned.unlocked.length > 0) setNewSkins(skinned.unlocked)
      commit(skinned.state)
      return result
    },
    [commit],
  )

  const useDew = useCallback(
    (plotIndex: number): boolean => {
      const { state: next, result } = useDewIn(stateRef.current, plotIndex)
      if (result.ok) commit(next)
      return result.ok
    },
    [commit],
  )

  const devGarden = useCallback(
    (action: DevGardenAction) => {
      commit(applyDevGarden(stateRef.current, action))
    },
    [commit],
  )

  // ── 작은 부엌 ───────────────────────────────────────────

  const enterKitchen = useCallback(() => {
    const prev = stateRef.current
    if (!isKitchenUnlocked(prev) || prev.kitchen.tutorialSeenAt !== null) return
    commit({
      ...prev,
      kitchen: { ...prev.kitchen, tutorialSeenAt: new Date().toISOString() },
    })
  }, [commit])

  /**
   * 요리한다.
   *
   * 만들기 자체는 작은 작업실과 같은 길이다 (재료를 빼고 결과를 넣는다).
   * 만든 음식이 도감을 늘리면 마일스톤·세트가 따라 완성될 수 있어서
   * 기존 사슬을 한 번 태운다 — 여기서 보상을 새로 계산하지 않는다.
   */
  const cookRecipe = useCallback(
    (recipeId: string): CookResult => {
      const prev = stateRef.current
      const now = new Date()
      const { state: cooked, result } = cookRecipeIn(prev, recipeId, now)
      if (!result.ok) return result

      const derived = applyCollectionDerived(cooked, now)
      const discovered = applyDiscovery(derived.state, now)
      const skinned = applySkinUnlocks(discovered.state)
      if (discovered.notes.length > 0) setDiscoveryNotes(discovered.notes)
      if (skinned.unlocked.length > 0) setNewSkins(skinned.unlocked)
      commit(skinned.state)
      return result
    },
    [commit],
  )

  /**
   * 먹는다.
   *
   * 마시는 것과 같은 얼개를 그대로 쓴다 (ActiveBuff). 보상 계산은
   * 이미 그 버프를 볼 줄 알아서 여기서 손댈 게 없다.
   */
  const eatFood = useCallback(
    (recipeId: string): ActiveBuff | null => {
      const prev = stateRef.current
      const def = findKitchenRecipeById(recipeId)
      if (!def?.buff) return null
      if (ownedCount(prev.collection, def.outputItemId) < 1) return null

      const spent = spendItems(prev.collection, [{ itemId: def.outputItemId, count: 1 }])
      if (!spent) return null

      const buff: ActiveBuff = {
        id: createId(),
        itemId: def.outputItemId,
        name: def.name,
        icon: def.icon,
        category: def.buff.category,
        expPct: def.buff.expPct,
        uses: 1,
        startedAt: new Date().toISOString(),
      }

      commit({
        ...prev,
        collection: spent,
        user: { ...prev.user, activeBuffs: [...prev.user.activeBuffs, buff] },
      })
      return buff
    },
    [commit],
  )

  const toggleRecipeFavorite = useCallback(
    (recipeId: string) => {
      commit(toggleFavoriteIn(stateRef.current, recipeId))
    },
    [commit],
  )

  const devKitchen = useCallback(
    (action: DevKitchenAction) => {
      commit(applyDevKitchen(stateRef.current, action))
    },
    [commit],
  )

  const devWorkshop = useCallback(
    (action: DevWorkshopAction) => {
      // 만들기로 얻은 것도 도감·세트·트로피·발견 사슬을 한 번 태운다.
      // 검수판만 다른 길로 가면 검수가 검수가 아니게 된다.
      const now = new Date()
      const next = applyDevWorkshop(stateRef.current, action, now)
      const derived = applyCollectionDerived(next, now)
      commit(applyDiscovery(derived.state, now).state)
    },
    [commit],
  )

  /**
   * 처음 안내를 다 봤다.
   *
   * 이미 적혀 있으면 덮어쓰지 않는다. 설정에서 다시 열어봤다고 해서
   * 날짜가 오늘로 밀리면, 이게 "본 적 있는지" 가 아니라
   * "마지막으로 본 때" 가 돼버린다.
   */
  const markGuideSeen = useCallback(() => {
    const prev = stateRef.current
    if (prev.guideSeenAt) return
    commit({ ...prev, guideSeenAt: new Date().toISOString() })
  }, [commit])

  /**
   * 상태를 통째로 갈아 끼운다 (클라우드에서 받아올 때만).
   *
   * 여기서 보상 계산을 다시 돌리지 않는다. 받아온 건 다른 기기가
   * 이미 계산을 마친 결과라서, 여기서 한 번 더 돌리면 같은 것을
   * 두 번 주게 된다. 조건이 새로 채워진 게 있으면 다음에 앱을 열 때
   * 원래 있던 자리(load effect)에서 한 번에 따라온다.
   */
  const replaceState = useCallback(
    (next: AppState) => {
      commit(next)
    },
    [commit],
  )

  return useMemo(
    () => ({
      ready,
      state,
      justGifted: giftedRef.current,
      justRebalanced: rebalancedRef.current,
      addQuest,
      completeQuest,
      uncompleteQuest,
      updateQuest,
      snoozeQuest,
      unsnoozeQuest,
      deleteQuest,
      renameUser,
      toggleRoutinePause,
      deleteRoutine,
      setClass,
      setArea,
      equipItem,
      unequipSlot,
      startBattle,
      doBattleAction,
      undoBattleActionById,
      removeBattle,
      talkToNpc,
      giftToNpc,
      acceptChain,
      buyItem,
      useConsumable,
      unlockSkill,
      toggleQuestFavorite,
      dismissRecommendation,
      hideRecommendationToday,
      setPersonalized,
      resetUsageProfiles,
      buyCollectionItem,
      craftItem,
      toggleWishlist,
      visitShop,
      claimDelivery,
      readChapter,
      setActiveCompanion,
      playWithCompanion,
      discoveryNotes,
      dismissDiscoveryNotes,
      placeInRoom,
      movePlaced,
      updatePlaced,
      removePlaced,
      setCurrentRoom,
      setRoomEffect,
      markGuideSeen,
      selectSkin,
      buySkin,
      devGrantAllSkins,
      enterGarden,
      plantSeed,
      harvestPlot,
      useDew,
      devGarden,
      enterKitchen,
      cookRecipe,
      eatFood,
      toggleRecipeFavorite,
      devKitchen,
      devWorkshop,
      newSkins,
      dismissNewSkins,
      replaceState,
    }),
    [
      ready,
      state,
      addQuest,
      completeQuest,
      uncompleteQuest,
      updateQuest,
      snoozeQuest,
      unsnoozeQuest,
      deleteQuest,
      renameUser,
      toggleRoutinePause,
      deleteRoutine,
      setClass,
      setArea,
      equipItem,
      unequipSlot,
      startBattle,
      doBattleAction,
      undoBattleActionById,
      removeBattle,
      talkToNpc,
      giftToNpc,
      acceptChain,
      buyItem,
      useConsumable,
      unlockSkill,
      toggleQuestFavorite,
      dismissRecommendation,
      hideRecommendationToday,
      setPersonalized,
      resetUsageProfiles,
      buyCollectionItem,
      craftItem,
      toggleWishlist,
      visitShop,
      claimDelivery,
      readChapter,
      setActiveCompanion,
      playWithCompanion,
      discoveryNotes,
      dismissDiscoveryNotes,
      placeInRoom,
      movePlaced,
      updatePlaced,
      removePlaced,
      setCurrentRoom,
      setRoomEffect,
      markGuideSeen,
      selectSkin,
      buySkin,
      devGrantAllSkins,
      enterGarden,
      plantSeed,
      harvestPlot,
      useDew,
      devGarden,
      enterKitchen,
      cookRecipe,
      eatFood,
      toggleRecipeFavorite,
      devKitchen,
      devWorkshop,
      newSkins,
      dismissNewSkins,
      replaceState,
    ],
  )
}
