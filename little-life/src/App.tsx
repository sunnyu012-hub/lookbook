import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppState,
  AreaId,
  Battle,
  BattleDef,
  CollectionShopDef,
  DiscoveryResult,
  CompanionId,
  NpcDef,
  NpcQuestChainDef,
  Quest,
  QuestDraft,
  QuestPackDef,
  Routine,
  ShopDef,
} from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { BottomNavigation, type TabKey } from '@/components/navigation/BottomNavigation'
import { QuestCreationSheet } from '@/components/quest/QuestCreationSheet'
import { AddQuestHub } from '@/components/quest/AddQuestHub'
import { PackDetailSheet } from '@/components/quest/PackDetailSheet'
import { BattleSheet } from '@/components/rpg/BattleSheet'
import { NpcSheet } from '@/components/city/NpcSheet'
import { ShopSheet } from '@/components/city/ShopSheet'
import { CollectionShopSheet } from '@/components/collection/CollectionShopSheet'
import { DiscoverySheet } from '@/components/discovery/DiscoverySheet'
import { storyProgress, unreadChapters } from '@/lib/discovery/stories'
import { StorySheet } from '@/components/discovery/StorySheet'
import { ConflictSheet } from '@/components/sync/ConflictSheet'
import { GuideSheet } from '@/components/guide/GuideSheet'
import { MyLookSheet } from '@/components/character/MyLookSheet'
import { NewSkinOverlay } from '@/components/character/NewSkinOverlay'
import { SkinGallery } from '@/components/character/SkinGallery'
import { GardenScreen } from '@/components/garden/GardenScreen'
import { gardenLevel, gardenXp, isGardenUnlocked } from '@/lib/garden/derive'
import { KITCHEN_RECIPES } from '@/lib/kitchen/recipes'
import { GardenLab } from '@/components/garden/GardenLab'
import { KitchenScreen } from '@/components/kitchen/KitchenScreen'
import { QuarryScreen } from '@/components/quarry/QuarryScreen'
import { DungeonScreen } from '@/components/dungeon/DungeonScreen'
import { KitchenLab } from '@/components/kitchen/KitchenLab'
import { WorkshopLab } from '@/components/collection/WorkshopLab'
import { QuarryLab } from '@/components/quarry/QuarryLab'
import { DungeonLab } from '@/components/dungeon/DungeonLab'
import { CityLab } from '@/components/city/CityLab'
import type { CookedNote } from '@/components/kitchen/CookedOverlay'
import type { HarvestNote } from '@/components/garden/HarvestOverlay'
import { WorkshopSheet } from '@/components/collection/WorkshopSheet'
import { DiscoveryOverlay } from '@/components/collection/DiscoveryOverlay'
import { DecorateMode } from '@/components/room/DecorateMode'
import { LevelUpOverlay } from '@/components/feedback/LevelUpOverlay'
import { RewardSummaryOverlay } from '@/components/feedback/RewardSummaryOverlay'
import { BattleClearOverlay } from '@/components/feedback/BattleClearOverlay'
import { DropRevealOverlay } from '@/components/feedback/DropRevealOverlay'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Toast } from '@/components/ui/Toast'
import { useGameState } from '@/hooks/useGameState'
import { useSync } from '@/hooks/useSync'
import { useFeedback } from '@/hooks/useFeedback'
import { WELCOME_GIFT } from '@/store/migrate'
import { findArea } from '@/lib/rpg/content'
import { activeEvents } from '@/lib/city/events'
import { emptyNpcState } from '@/lib/city/friendship'
import { isShopOpen, shopInArea } from '@/lib/city/shops'
import { findSkill } from '@/lib/city/skills'
import { collectionProgress, ownedCount } from '@/lib/collection/progress'
import { findCollectionItem } from '@/lib/collection/catalog'
import { TIME_TINT, isNightOpen, timeBand } from '@/lib/rpg/time'
import { HomeScreen } from '@/screens/HomeScreen'
import { QuestScreen } from '@/screens/QuestScreen'
import { MapScreen } from '@/screens/MapScreen'
import { BagScreen } from '@/screens/BagScreen'
import { MeScreen } from '@/screens/MeScreen'

export default function App() {
  const {
    ready,
    state,
    justGifted,
    justRebalanced,
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
    newSkins,
    dismissNewSkins,
    enterGarden,
    enterQuarry,
    exploreQuarrySpot,
    enterDungeon,
    goDeeperInDungeon,
    searchDungeonSpot,
    takeCreatureStep,
    seeBlockedPath,
    plantSeed,
    harvestPlot,
    useDew,
    devGarden: runDevGarden,
    enterKitchen,
    cookRecipe,
    eatFood,
    toggleRecipeFavorite,
    devKitchen: runDevKitchen,
    devWorkshop: runDevWorkshop,
    devQuarry: runDevQuarry,
    devDungeon: runDevDungeon,
    replaceState,
  } = useGameState()
  const feedback = useFeedback()

  // 클라우드 백업. 환경변수가 없으면 아무것도 하지 않고 화면에도 안 나온다.
  const sync = useSync({ state, ready, onReplace: replaceState })

  const [tab, setTab] = useState<TabKey>('home')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Quest | null>(null)
  const [pendingRoutineDelete, setPendingRoutineDelete] = useState<Routine | null>(null)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)
  // id 로만 들고 있는다. 상태에서 매번 다시 찾아야 HP 가 깎이는 게 시트에 바로 보인다.
  const [openBattleId, setOpenBattleId] = useState<string | null>(null)
  const [hubOpen, setHubOpen] = useState(false)
  const [discoveryOpen, setDiscoveryOpen] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [lookOpen, setLookOpen] = useState(false)
  const [gardenOpen, setGardenOpen] = useState(false)
  const [kitchenOpen, setKitchenOpen] = useState(false)
  const [quarryOpen, setQuarryOpen] = useState(false)
  const [dungeonOpen, setDungeonOpen] = useState(false)

  /**
   * 개발용 갤러리. 주소에 ?dev=skins 를 붙였을 때만.
   * 화면 어디에도 들어가는 길을 두지 않는다 — 검수용이다.
   */
  const devParam =
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('dev')
  const devGallery = devParam === 'skins'
  const devGarden = devParam === 'garden'
  const devKitchen = devParam === 'kitchen'
  const devWorkshop = devParam === 'workshop'
  const devQuarry = devParam === 'quarry'
  const devDungeon = devParam === 'dungeon'
  const devCity = devParam === 'city'

  /**
   * 처음 여는 사람에게 한 번.
   *
   * 동료도 비밀 장소도 "조건을 채우면 알아서 나타나는" 구조라, 그런 게
   * 있다는 걸 아무도 말해주지 않으면 발견이 아니라 그냥 없는 것이 된다.
   * 닫으면 본 것으로 치고 다시 조르지 않는다.
   */
  useEffect(() => {
    if (!ready || state.guideSeenAt) return
    setGuideOpen(true)
  }, [ready, state.guideSeenAt])

  const closeGuide = useCallback(() => {
    setGuideOpen(false)
    markGuideSeen()
  }, [markGuideSeen])
  // 갈라진 걸 알아챘으면 한 번은 띄운다. 설정 화면에만 두면
  // 백업이 멈춰 있는 걸 모른 채로 며칠이 지난다.
  useEffect(() => {
    if (sync.status === 'CONFLICT') setConflictOpen(true)
  }, [sync.status])
  const [storyNpc, setStoryNpc] = useState<NpcDef | null>(null)
  const [openPack, setOpenPack] = useState<QuestPackDef | null>(null)
  const [openNpc, setOpenNpc] = useState<NpcDef | null>(null)
  const [openShop, setOpenShop] = useState<ShopDef | null>(null)
  const [openCollectionShop, setOpenCollectionShop] = useState<CollectionShopDef | null>(null)
  const [workshopOpen, setWorkshopOpen] = useState(false)
  const [decorating, setDecorating] = useState(false)
  const [discoveries, setDiscoveries] = useState<DiscoveryResult[]>([])
  /** BAG 을 열 때 도감부터 보여줄지 */
  const [bagView, setBagView] = useState<'BAG' | 'BOOK'>('BAG')

  // 오늘의 이벤트는 저장하지 않고 날짜에서 계산한다. 한 번만 구해서 화면 전체가 같은 걸 본다.
  const events = useMemo(() => activeEvents(), [])

  /**
   * 만들어둔 음식 중 지금 줄 수 있는 것.
   *
   * 친밀도가 오르는 식은 하나뿐이라 (giftGainForTags) 여기서는
   * "좋아할지" 만 미리 본다 — 계산을 다시 하지 않는다.
   */
  const giftableFoods = useCallback(
    (s: AppState, npc: NpcDef) =>
      KITCHEN_RECIPES.map((recipe) => ({
        itemId: recipe.outputItemId,
        name: recipe.name,
        icon: recipe.icon,
        count: ownedCount(s.collection, recipe.outputItemId),
        liked: recipe.giftTags.some((tag) => npc.likes.includes(tag)),
      }))
        .filter((f) => f.count > 0)
        .sort((a, b) => Number(b.liked) - Number(a.liked)),
    [],
  )

  // 정원을 못 찾았으면 0. 도시 사람들이 그 얘기를 먼저 꺼내지 않게.
  const gardenTalkLevel = useMemo(
    () => (isGardenUnlocked(state) ? gardenLevel(gardenXp(state.garden)) : 0),
    [state],
  )

  const equippedIds = useMemo(
    () => new Set(Object.values(state.user.equippedItems).filter((v): v is string => v !== null)),
    [state.user.equippedItems],
  )

  // 이 사람 가게가 지금 문을 열었는지. 가게가 없으면 null.
  const openNpcShopOpen = useMemo(() => {
    if (!openNpc?.shopId) return null
    const shop = shopInArea(openNpc.areaId)
    return shop ? isShopOpen(shop) : null
  }, [openNpc])

  const openBattle = useMemo(
    () => state.battles.find((b) => b.id === openBattleId) ?? null,
    [state.battles, openBattleId],
  )

  /**
   * 방금 손에 들어온 것들.
   *
   * 처음 만난 것만 NEW DISCOVERY 로 띄운다. 두 번째부터는 작은 줄 하나면 충분하다 —
   * 같은 연출을 매번 보면 그때부터는 닫아야 하는 창이 된다.
   */
  const showCollected = useCallback(
    (collected: DiscoveryResult[]) => {
      if (collected.length === 0) return
      const fresh = collected.filter((c) => c.isNew)
      if (fresh.length > 0) {
        setDiscoveries(fresh)
        return
      }
      const names = collected
        .map((c) => findCollectionItem(c.itemId)?.nameKo)
        .filter((name): name is string => !!name)
      if (names.length > 0) feedback.notify(`${names.join(' · ')} ×1`)
    },
    [feedback],
  )

  const handleComplete = useCallback(
    (id: string) => {
      // 제목은 완료 전에 챙긴다 — 완료 뒤에는 목록에서 자리가 바뀔 수 있다
      const title = state.quests.find((q) => q.id === id)?.title ?? ''
      const result = completeQuest(id)
      if (!result) return

      // 무엇이 얼마나 늘었는지는 보상 요약 한 장이 전부 말한다.
      // 요약이 닫히고 나서야 새 발견을 띄운다 — 겹치면 둘 다 안 읽힌다.
      feedback.celebrate(result, title, () => showCollected(result.collected))

      // 잘못 눌렀을 때 바로 되돌릴 수 있게. 레벨업까지 정확히 되감긴다.
      feedback.notify('완료했어', {
        label: '되돌리기',
        onClick: () => uncompleteQuest(id),
      })
    },
    [state.quests, completeQuest, uncompleteQuest, feedback, showCollected],
  )

  const openEditor = useCallback((quest: Quest) => {
    setEditingQuest(quest)
    setSheetOpen(true)
  }, [])

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    setEditingQuest(null)
  }, [])

  const handleSnooze = useCallback(
    (id: string) => {
      snoozeQuest(id)
      feedback.notify('내일 다시 보여줄게', {
        label: '되돌리기',
        onClick: () => unsnoozeQuest(id),
      })
    },
    [snoozeQuest, unsnoozeQuest, feedback],
  )

  const handleCreate = useCallback(
    (draft: QuestDraft) => {
      const created = addQuest(draft)
      // 오늘 해당하지 않는 요일이면 오늘 퀘스트는 안 생긴다. 그걸 그대로 말해준다.
      feedback.notify(created ? 'Quest added ✦' : '반복만 저장했어 · 해당 요일에 생겨')
    },
    [addQuest, feedback],
  )

  /** 추천·빠른 추가·검색에서 하나 넣기 */
  const handleQuickAdd = useCallback(
    (draft: QuestDraft) => {
      const created = addQuest(draft)
      if (!created) return
      feedback.notify('퀘스트를 넣었어 ✦', {
        label: '실행 취소',
        onClick: () => deleteQuest(created.id),
      })
    },
    [addQuest, deleteQuest, feedback],
  )

  /** 세트에서 고른 것들을 한 번에 */
  const handlePackAdd = useCallback(
    (drafts: QuestDraft[]) => {
      const made = drafts.map((d) => addQuest(d)).filter((q): q is Quest => q !== null)
      setOpenPack(null)
      setHubOpen(false)

      const routine = drafts.some((d) => d.repeat)
      const message = routine
        ? `루틴 ${drafts.length}개를 만들었어 ✦`
        : `퀘스트 ${made.length}개를 넣었어 ✦`

      feedback.notify(
        message,
        made.length > 0
          ? { label: '실행 취소', onClick: () => made.forEach((q) => deleteQuest(q.id)) }
          : undefined,
      )
    },
    [addQuest, deleteQuest, feedback],
  )

  const confirmDelete = useCallback(() => {
    if (pendingDelete) deleteQuest(pendingDelete.id)
    setPendingDelete(null)
  }, [pendingDelete, deleteQuest])

  const confirmRoutineDelete = useCallback(() => {
    if (pendingRoutineDelete) deleteRoutine(pendingRoutineDelete.id)
    setPendingRoutineDelete(null)
  }, [pendingRoutineDelete, deleteRoutine])

  // ── RPG ────────────────────────────────────────────────
  const handleStartBattle = useCallback(
    (def: BattleDef) => {
      const battle = startBattle(def)
      setOpenBattleId(battle.id)
    },
    [startBattle],
  )

  const handleBattleAction = useCallback(
    (battleId: string, actionId: string) => {
      // 클리어되면 상태에서 사라지는 값이 아니라서 미리 잡아둔다
      const battle = state.battles.find((b) => b.id === battleId)
      const result = doBattleAction(battleId, actionId)
      if (!result || !battle) return

      if (result.cleared) {
        setOpenBattleId(null)
        feedback.celebrateBattleClear(battle, result)
        // 보스를 넘고 나온 것은 클리어 연출이 끝난 뒤에 보여준다
        window.setTimeout(() => showCollected(result.collected), 1500)
      }
    },
    [state.battles, doBattleAction, feedback, showCollected],
  )

  const handleRemoveBattle = useCallback(
    (battleId: string) => {
      removeBattle(battleId)
      setOpenBattleId(null)
    },
    [removeBattle],
  )

  const handleSelectArea = useCallback(
    (areaId: Parameters<typeof setArea>[0]) => {
      setArea(areaId)
      const area = findArea(areaId)
      feedback.notify(`${area.icon} ${area.name} · ${area.buffLabel}`)
    },
    [setArea, feedback],
  )

  const handleEquip = useCallback(
    (itemId: string) => {
      equipItem(itemId)
      feedback.notify('장착했어 ✦')
    },
    [equipItem, feedback],
  )

  // ── 도시 ────────────────────────────────────────────────
  const handleTalk = useCallback(() => {
    if (!openNpc) return
    const result = talkToNpc(openNpc.id)
    if (!result) return

    if (result.gained > 0) {
      feedback.notify(
        result.leveledUp
          ? `${openNpc.name} 와 조금 더 가까워졌어 💗`
          : `💗 +${result.gained}`,
      )
    }
  }, [openNpc, talkToNpc, feedback])

  const handleGift = useCallback(
    (itemId: string) => {
      if (!openNpc) return
      const result = giftToNpc(openNpc.id, itemId)
      if (!result) return
      feedback.notify(
        result.liked ? `좋아하는 것 같아 · 💗 +${result.gained}` : `💗 +${result.gained}`,
      )
    },
    [openNpc, giftToNpc, feedback],
  )

  const handleAcceptChain = useCallback(
    (chain: NpcQuestChainDef) => {
      const quest = acceptChain(chain)
      if (!quest) return
      setOpenNpc(null)
      setTab('quest')
      feedback.notify(`의뢰를 받았어 · ${chain.name}`)
    },
    [acceptChain, feedback],
  )

  const handleOpenShopForArea = useCallback((areaId: AreaId) => {
    const shop = shopInArea(areaId)
    if (shop) setOpenShop(shop)
  }, [])

  const handleBuy = useCallback(
    (itemId: string) => {
      if (!openShop) return
      const result = buyItem(openShop, itemId)

      if (result.ok) {
        feedback.notify(`샀어 · 🪙 -${result.price}`)
        return
      }
      // 혼내지 않는다. 왜 안 됐는지만 짧게 말한다.
      if (result.reason === 'NOT_ENOUGH_COINS') feedback.notify('Coin 이 조금 모자라')
      else if (result.reason === 'ALREADY_OWNED') feedback.notify('이미 가지고 있어')
    },
    [openShop, buyItem, feedback],
  )

  const handleUseConsumable = useCallback(
    (itemId: string) => {
      const buff = useConsumable(itemId)
      if (!buff) return
      feedback.notify(`${buff.name} · 다음 ${buff.category ?? '아무'} 퀘스트 EXP +${buff.expPct}%`)
    },
    [useConsumable, feedback],
  )

  // ── 수집 · 방 ──────────────────────────────────────────
  const handleCollectionBuy = useCallback(
    (itemId: string) => {
      if (!openCollectionShop) return
      const result = buyCollectionItem(openCollectionShop.id, itemId)

      if (result.ok) {
        if (result.isNew) showCollected(result.discoveries)
        else feedback.notify(`샀어 · 🪙 -${result.price}`)
        result.notes.forEach((note) => feedback.notify(note))
        return
      }
      // 혼내지 않는다. 왜 안 됐는지만 짧게 말한다.
      if (result.reason === 'NOT_ENOUGH_COINS') feedback.notify('Coin 이 조금 모자라')
      else if (result.reason === 'SOLD_OUT') feedback.notify('오늘 것은 다 나갔어')
      else if (result.reason === 'LOCKED') feedback.notify('몇 번 더 오면 꺼내준대')
      else if (result.reason === 'CLOSED') feedback.notify('지금은 닫혀 있어')
    },
    [openCollectionShop, buyCollectionItem, feedback, showCollected],
  )

  /** 가게에 들어갔다고 적어둔다. 조용히 지나간다 — 알림을 띄울 일이 아니다. */
  const handleShopVisit = useCallback(
    (itemIds: string[]) => {
      if (!openCollectionShop) return
      visitShop(openCollectionShop.id, itemIds)
    },
    [openCollectionShop, visitShop],
  )

  /**
   * 문 앞에 온 것을 받는다.
   *
   * 안 받고 넘겨도 뭐라 하지 않는다. 다음 날이면 그냥 없어진다.
   */
  const handleClaimDelivery = useCallback(() => {
    const claimed = claimDelivery()
    if (!claimed) return

    if (claimed.isNew) showCollected(claimed.discoveries)
    else {
      const item = findCollectionItem(claimed.itemId)
      feedback.notify(`${item?.nameKo ?? '무언가'} 받았어`)
    }
    claimed.notes.forEach((note) => feedback.notify(note))
  }, [claimDelivery, feedback, showCollected])

  /** 이야기 한 장을 읽는다 */
  const handleReadChapter = useCallback(
    (chapterId: string) => {
      const result = readChapter(chapterId)
      if (!result) return
      if (result.isNew) showCollected(result.discoveries)
      if (result.unlockedSecretName) {
        feedback.notify(`${result.unlockedSecretName} — 새로운 곳을 알게 됐어`)
      }
    },
    [readChapter, feedback, showCollected],
  )

  /** 동료에게 인사한다 */
  const handlePlayWithCompanion = useCallback(
    (id: CompanionId) => {
      const result = playWithCompanion(id)
      if (!result) return
      if (result.memoryTitle) feedback.notify(`${result.memoryTitle} — 기억이 하나 남았어`)
      else if (result.gained > 0) feedback.notify(`${result.name}와 조금 더 친해졌어`)
      else feedback.notify(`${result.name}는 오늘도 잘 있어`)
    },
    [playWithCompanion, feedback],
  )

  const handleCraft = useCallback(
    (recipeId: string) => {
      const result = craftItem(recipeId)
      if (result.ok) {
        if (result.isNew) showCollected(result.discoveries)
        else {
          const name = findCollectionItem(result.itemId)?.nameKo ?? '하나'
          feedback.notify(`${name} 만들었어 ✦`)
        }
        result.notes.forEach((note) => feedback.notify(note))
        return
      }
      if (result.reason === 'MISSING') feedback.notify('재료가 조금 모자라')
      else if (result.reason === 'LOCKED') feedback.notify('아직 만드는 법을 몰라')
    },
    [craftItem, feedback, showCollected],
  )

  /** 도감·발견 연출에서 바로 방에 놓기 */
  const handlePlace = useCallback(
    (itemId: string) => {
      const placed = placeInRoom(itemId)
      if (!placed) {
        feedback.notify('지금은 방에 놓을 수 없어')
        return
      }
      setDecorating(true)
    },
    [placeInRoom, feedback],
  )

  const handleToggleWishlist = useCallback(
    (itemId: string) => {
      const wished = state.collection.wishlist.includes(itemId)
      toggleWishlist(itemId)
      feedback.notify(wished ? '찾는 물건에서 뺐어' : '♥ 찾는 물건에 넣었어')
    },
    [state.collection.wishlist, toggleWishlist, feedback],
  )

  const handleUnlockSkill = useCallback(
    (skillId: string) => {
      if (!unlockSkill(skillId)) return
      feedback.notify(`${findSkill(skillId)?.name ?? '스킬'} 배웠어 ✦`)
    },
    [unlockSkill, feedback],
  )

  // Night Town 에 있는데 밤이 지났으면 조용히 집으로 돌려보낸다.
  // 닫힌 곳의 버프를 계속 받게 두면 지도의 규칙이 거짓말이 된다.
  useEffect(() => {
    if (!ready) return
    if (state.user.currentAreaId === 'NIGHT_TOWN' && !isNightOpen()) setArea('HOME_BASE')
  }, [ready, state.user.currentAreaId, setArea])

  // Welcome Gift 안내는 한 번만.
  const giftNotified = useRef(false)
  useEffect(() => {
    if (!ready || !justGifted || giftNotified.current) return
    giftNotified.current = true
    feedback.notify(WELCOME_GIFT.message)
  }, [ready, justGifted, feedback])

  // 벌이를 올리면서 지난 몫을 채워준 것도 한 번만 알려준다.
  // 코인이 갑자기 늘어난 걸 말없이 두면 버그처럼 보인다.
  const rebalanceNotified = useRef(false)
  useEffect(() => {
    if (!ready || justRebalanced <= 0 || rebalanceNotified.current) return
    rebalanceNotified.current = true
    feedback.notify(`퀘스트 값이 올랐어. 그동안 한 몫으로 ${justRebalanced} 코인 ✨`)
  }, [ready, justRebalanced, feedback])

  // 저장된 데이터를 읽기 전에 LV.1 을 잠깐 보여주면 깜빡이는 것처럼 보인다.
  if (!ready) {
    return <div className="min-h-[100dvh] bg-canvas" />
  }

  if (devGallery) {
    return <SkinGallery state={state} onGrantAll={devGrantAllSkins} onWear={selectSkin} />
  }

  if (devGarden) {
    return <GardenLab state={state} onRun={runDevGarden} />
  }

  if (devCity) {
    return <CityLab />
  }

  if (devDungeon) {
    return <DungeonLab state={state} onRun={runDevDungeon} />
  }

  if (devQuarry) {
    return <QuarryLab state={state} onRun={runDevQuarry} />
  }

  if (devWorkshop) {
    return <WorkshopLab state={state} onRun={runDevWorkshop} />
  }

  if (devKitchen) {
    return <KitchenLab state={state} onRun={runDevKitchen} />
  }

  return (
    <>
      <AppShell
        tint={TIME_TINT[timeBand()]}
        tabBar={
          <BottomNavigation
            active={tab}
            onChange={(next) => {
              // 아래에서 직접 가방을 누른 거면 가방부터 보여준다.
              // 도감은 발견 연출에서 넘어올 때만 먼저 열린다.
              if (next === 'bag') setBagView('BAG')
              setTab(next)
            }}
          />
        }
      >
        {tab === 'home' && (
          <HomeScreen
            state={state}
            mood={feedback.mood}
            onComplete={handleComplete}
            onAddQuest={() => setHubOpen(true)}
            onSeeAll={() => setTab('quest')}
            onOpenMap={() => setTab('map')}
            onDecorate={() => setDecorating(true)}
            onOpenLook={() => setLookOpen(true)}
            onClaimDelivery={handleClaimDelivery}
            discoveryNotes={discoveryNotes}
            onDismissDiscovery={dismissDiscoveryNotes}
            onOpenDiscovery={() => setDiscoveryOpen(true)}
            onOpenGarden={() => setGardenOpen(true)}
            onOpenQuarry={() => setQuarryOpen(true)}
            onOpenKitchen={() => setKitchenOpen(true)}
            onOpenCollection={() => {
              setBagView('BOOK')
              setTab('bag')
            }}
            events={events}
          />
        )}
        {tab === 'quest' && (
          <QuestScreen
            quests={state.quests}
            routines={state.routines}
            battles={state.battles}
            onComplete={handleComplete}
            onRequestDelete={setPendingDelete}
            onEdit={openEditor}
            onSnooze={handleSnooze}
            onUncomplete={uncompleteQuest}
            onAddQuest={() => setHubOpen(true)}
            onToggleRoutinePause={toggleRoutinePause}
            onRequestDeleteRoutine={setPendingRoutineDelete}
            onStartBattle={handleStartBattle}
            onOpenBattle={(battle: Battle) => setOpenBattleId(battle.id)}
          />
        )}
        {tab === 'map' && (
          <MapScreen
            currentAreaId={state.user.currentAreaId}
            reputation={state.reputation}
            npcs={state.npcs}
            events={events}
            state={state}
            onSelectArea={handleSelectArea}
            onOpenNpc={setOpenNpc}
            onOpenShop={handleOpenShopForArea}
            onOpenCollectionShop={setOpenCollectionShop}
            onOpenWorkshop={() => setWorkshopOpen(true)}
            onOpenGarden={() => setGardenOpen(true)}
            onOpenQuarry={() => setQuarryOpen(true)}
            onOpenDungeon={() => setDungeonOpen(true)}
          />
        )}
        {tab === 'bag' && (
          <BagScreen
            state={state}
            inventory={state.inventory}
            equipped={state.user.equippedItems}
            coins={state.user.coins}
            activeBuffs={state.user.activeBuffs}
            onEquip={handleEquip}
            onUnequip={unequipSlot}
            onUse={handleUseConsumable}
            onToggleWishlist={handleToggleWishlist}
            onPlace={handlePlace}
            onOpenWorkshop={() => setWorkshopOpen(true)}
            onOpenLook={() => setLookOpen(true)}
            initialView={bagView}
          />
        )}
        {tab === 'me' && (
          <MeScreen
            state={state}
            onRename={renameUser}
            onSelectClass={setClass}
            onOpenBag={() => setTab('bag')}
            onUnlockSkill={handleUnlockSkill}
            onTogglePersonalized={setPersonalized}
            onResetUsage={resetUsageProfiles}
            sync={sync}
            onOpenConflict={() => setConflictOpen(true)}
            onOpenGuide={() => setGuideOpen(true)}
          />
        )}
      </AppShell>

      <AddQuestHub
        open={hubOpen}
        state={state}
        onClose={() => setHubOpen(false)}
        onAdd={handleQuickAdd}
        onOpenPack={setOpenPack}
        onOpenCustom={() => {
          setHubOpen(false)
          setSheetOpen(true)
        }}
        onFavorite={toggleQuestFavorite}
        onHideToday={hideRecommendationToday}
        onDismiss={dismissRecommendation}
      />

      <PackDetailSheet
        pack={openPack}
        quests={state.quests}
        onClose={() => {
          setOpenPack(null)
          setHubOpen(false)
        }}
        // 세트를 잘못 골랐으면 허브로 돌아간다. 처음부터 다시 열지 않아도 된다.
        onBack={() => {
          setOpenPack(null)
          setHubOpen(true)
        }}
        onAdd={handlePackAdd}
      />

      <QuestCreationSheet
        open={sheetOpen}
        onClose={closeSheet}
        onCreate={handleCreate}
        onUpdate={updateQuest}
        editing={editingQuest}
        history={state.quests}
      />

      <BattleSheet
        battle={openBattle}
        onClose={() => setOpenBattleId(null)}
        onAction={handleBattleAction}
        onUndo={undoBattleActionById}
        onRemove={handleRemoveBattle}
      />

      <NpcSheet
        gardenLevel={gardenTalkLevel}
        foods={openNpc ? giftableFoods(state, openNpc) : []}
        npc={openNpc}
        npcState={(openNpc && state.npcs[openNpc.id]) || emptyNpcState()}
        quests={state.quests}
        inventory={state.inventory}
        equippedIds={equippedIds}
        events={events}
        shopOpen={openNpcShopOpen}
        story={openNpc ? storyProgress(state, openNpc.id) : null}
        storyReady={openNpc ? unreadChapters(state).some((c) => c.npcId === openNpc.id) : false}
        onOpenStory={() => {
          const npc = openNpc
          setOpenNpc(null)
          setStoryNpc(npc)
        }}
        onClose={() => setOpenNpc(null)}
        onTalk={handleTalk}
        onAcceptChain={handleAcceptChain}
        onGift={handleGift}
        onOpenShop={() => {
          if (!openNpc?.shopId) return
          const shop = shopInArea(openNpc.areaId)
          setOpenNpc(null)
          if (shop) setOpenShop(shop)
        }}
      />

      <ShopSheet
        shop={openShop}
        coins={state.user.coins}
        inventory={state.inventory}
        onClose={() => setOpenShop(null)}
        onBuy={handleBuy}
      />

      <CollectionShopSheet
        shop={openCollectionShop}
        state={state}
        onClose={() => setOpenCollectionShop(null)}
        onBuy={handleCollectionBuy}
        onToggleWishlist={toggleWishlist}
        onVisit={handleShopVisit}
      />

      <DiscoverySheet
        open={discoveryOpen}
        state={state}
        onClose={() => setDiscoveryOpen(false)}
        onSetCompanion={setActiveCompanion}
        onPlay={handlePlayWithCompanion}
      />

      <StorySheet
        npc={storyNpc}
        state={state}
        onClose={() => setStoryNpc(null)}
        onRead={handleReadChapter}
      />

      <WorkshopSheet
        open={workshopOpen}
        state={state}
        onClose={() => setWorkshopOpen(false)}
        onCraft={handleCraft}
        onPlace={handlePlace}
      />

      <DecorateMode
        open={decorating}
        state={state}
        onClose={() => setDecorating(false)}
        onPlace={placeInRoom}
        onMove={movePlaced}
        onUpdate={updatePlaced}
        onRemove={removePlaced}
        onSelectRoom={setCurrentRoom}
        onSelectEffect={setRoomEffect}
        onNotify={feedback.notify}
      />

      <DiscoveryOverlay
        discoveries={discoveries}
        progress={collectionProgress(state.collection)}
        onClose={() => setDiscoveries([])}
        onOpenCollection={() => {
          setBagView('BOOK')
          setTab('bag')
        }}
        onPlace={handlePlace}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="이 퀘스트를 지울까?"
        description="이미 받은 EXP 는 그대로 남아 있어."
        confirmLabel="지우기"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingRoutineDelete !== null}
        title="이 반복을 그만둘까?"
        description="오늘 이미 만들어진 퀘스트는 그대로 남아 있어."
        confirmLabel="지우기"
        onConfirm={confirmRoutineDelete}
        onCancel={() => setPendingRoutineDelete(null)}
      />

      <QuarryScreen
        open={quarryOpen}
        state={state}
        onClose={() => setQuarryOpen(false)}
        onEnter={enterQuarry}
        onExplore={exploreQuarrySpot}
        onSeeBlockedPath={seeBlockedPath}
        onOpenDungeon={() => {
          setQuarryOpen(false)
          setDungeonOpen(true)
        }}
        onOpenBook={() => {
          setBagView('BOOK')
          setTab('bag')
        }}
      />

      <DungeonScreen
        open={dungeonOpen}
        state={state}
        onClose={() => setDungeonOpen(false)}
        onEnter={enterDungeon}
        onGoDeeper={goDeeperInDungeon}
        onSearch={searchDungeonSpot}
        onTakeStep={takeCreatureStep}
        onOpenBook={() => {
          setBagView('BOOK')
          setTab('bag')
        }}
      />

      <KitchenScreen
        open={kitchenOpen}
        state={state}
        onClose={() => setKitchenOpen(false)}
        onEnter={enterKitchen}
        onCook={(recipeId): CookedNote | null => {
          const result = cookRecipe(recipeId)
          if (!result.ok) {
            feedback.notify(result.reason === 'MISSING' ? '재료가 모자라' : '아직 모르는 요리야')
            return null
          }
          return { def: result.def, firstTime: result.firstTime }
        }}
        onEat={(recipeId) => eatFood(recipeId) !== null}
        onToggleFavorite={toggleRecipeFavorite}
        onOpenBook={() => {
          setBagView('BOOK')
          setTab('bag')
        }}
        onOpenGarden={() => setGardenOpen(true)}
        onNotify={feedback.notify}
      />

      <GardenScreen
        open={gardenOpen}
        state={state}
        onClose={() => setGardenOpen(false)}
        onEnter={enterGarden}
        onPlant={(plotIndex, cropId) => {
          const result = plantSeed(plotIndex, cropId)
          if (!result.ok) {
            feedback.notify(result.reason === 'NO_SEED' ? '그 씨앗이 없어' : '지금은 못 심어')
            return false
          }
          feedback.notify(`${result.crop.name} 씨앗을 심었어 🌱`)
          return true
        }}
        onHarvest={(plotIndex): HarvestNote | null => {
          const result = harvestPlot(plotIndex)
          if (!result.ok) return null
          return {
            crop: result.crop,
            count: result.count,
            isNew: result.isNew,
            leveledUp: result.leveledUp,
            variant: result.variant,
            variantIsNew: result.variantIsNew,
          }
        }}
        onUseDew={useDew}
        onOpenBook={() => {
          setBagView('BOOK')
          setTab('bag')
        }}
        onNotify={feedback.notify}
      />

      <MyLookSheet
        open={lookOpen}
        state={state}
        onClose={() => setLookOpen(false)}
        onSelect={selectSkin}
        onBuy={buySkin}
      />

      {/* 새 모습은 얻은 자리에서 한 번 보여준다. 자동으로 갈아입히지는 않는다. */}
      <NewSkinOverlay
        skins={newSkins}
        onWear={(id) => {
          selectSkin(id)
          dismissNewSkins()
          feedback.notify('이 모습으로 지낼게 ✦')
        }}
        onClose={dismissNewSkins}
      />

      <GuideSheet
        open={guideOpen}
        state={state}
        firstRun={!state.guideSeenAt}
        onClose={closeGuide}
      />

      <ConflictSheet
        open={conflictOpen && sync.status === 'CONFLICT'}
        conflict={sync.conflict}
        onClose={() => setConflictOpen(false)}
        onKeep={(keep) => {
          setConflictOpen(false)
          void sync.resolveConflict(keep)
        }}
      />

      <RewardSummaryOverlay summary={feedback.rewardSummary} onClose={feedback.dismissReward} />
      <BattleClearOverlay banner={feedback.battleClear} />
      <LevelUpOverlay level={feedback.levelUp} />
      <DropRevealOverlay drops={feedback.drops} onClose={feedback.dismissDrops} />
      <Toast message={feedback.toast} action={feedback.toastAction} />
    </>
  )
}
