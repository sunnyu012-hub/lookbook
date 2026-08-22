import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AreaId,
  Battle,
  BattleDef,
  CollectionShopDef,
  DiscoveryResult,
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
import { WorkshopSheet } from '@/components/collection/WorkshopSheet'
import { DiscoveryOverlay } from '@/components/collection/DiscoveryOverlay'
import { DecorateMode } from '@/components/room/DecorateMode'
import { LevelUpOverlay } from '@/components/feedback/LevelUpOverlay'
import { BattleClearOverlay } from '@/components/feedback/BattleClearOverlay'
import { DropRevealOverlay } from '@/components/feedback/DropRevealOverlay'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Toast } from '@/components/ui/Toast'
import { useGameState } from '@/hooks/useGameState'
import { useFeedback } from '@/hooks/useFeedback'
import { WELCOME_GIFT } from '@/store/migrate'
import { findArea } from '@/lib/rpg/content'
import { activeEvents } from '@/lib/city/events'
import { emptyNpcState } from '@/lib/city/friendship'
import { isShopOpen, shopInArea } from '@/lib/city/shops'
import { findSkill } from '@/lib/city/skills'
import { collectionProgress } from '@/lib/collection/progress'
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
    placeInRoom,
    movePlaced,
    updatePlaced,
    removePlaced,
    setCurrentRoom,
    setRoomEffect,
  } = useGameState()
  const feedback = useFeedback()

  const [tab, setTab] = useState<TabKey>('home')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Quest | null>(null)
  const [pendingRoutineDelete, setPendingRoutineDelete] = useState<Routine | null>(null)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)
  // id 로만 들고 있는다. 상태에서 매번 다시 찾아야 HP 가 깎이는 게 시트에 바로 보인다.
  const [openBattleId, setOpenBattleId] = useState<string | null>(null)
  const [hubOpen, setHubOpen] = useState(false)
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
      const result = completeQuest(id)
      if (!result) return

      feedback.celebrate(result)
      // 잘못 눌렀을 때 바로 되돌릴 수 있게. 레벨업까지 정확히 되감긴다.
      const coins = result.gainedCoins > 0 ? ` · 🪙 +${result.gainedCoins}` : ''
      feedback.notify(`+${result.gainedExp} EXP${coins}`, {
        label: '되돌리기',
        onClick: () => uncompleteQuest(id),
      })

      // 처음 만난 것만 크게 보여주고, 이미 아는 건 한 줄로 지나간다
      showCollected(result.collected)
    },
    [completeQuest, uncompleteQuest, feedback, showCollected],
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

  // 저장된 데이터를 읽기 전에 LV.1 을 잠깐 보여주면 깜빡이는 것처럼 보인다.
  if (!ready) {
    return <div className="min-h-[100dvh] bg-canvas" />
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
            expToasts={feedback.expToasts}
            onComplete={handleComplete}
            onAddQuest={() => setHubOpen(true)}
            onSeeAll={() => setTab('quest')}
            onOpenMap={() => setTab('map')}
            onOpenBag={() => {
              setBagView('BAG')
              setTab('bag')
            }}
            onOpenMe={() => setTab('me')}
            onDecorate={() => setDecorating(true)}
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
            quests={state.quests}
            reputation={state.reputation}
            npcs={state.npcs}
            events={events}
            onSelectArea={handleSelectArea}
            onOpenNpc={setOpenNpc}
            onOpenShop={handleOpenShopForArea}
            onOpenCollectionShop={setOpenCollectionShop}
            onOpenWorkshop={() => setWorkshopOpen(true)}
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
        onClose={() => setOpenPack(null)}
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
        npc={openNpc}
        npcState={(openNpc && state.npcs[openNpc.id]) || emptyNpcState()}
        quests={state.quests}
        inventory={state.inventory}
        equippedIds={equippedIds}
        events={events}
        shopOpen={openNpcShopOpen}
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
      />

      <WorkshopSheet
        open={workshopOpen}
        state={state}
        onClose={() => setWorkshopOpen(false)}
        onCraft={handleCraft}
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

      <BattleClearOverlay banner={feedback.battleClear} />
      <LevelUpOverlay level={feedback.levelUp} />
      <DropRevealOverlay drops={feedback.drops} onClose={feedback.dismissDrops} />
      <Toast message={feedback.toast} action={feedback.toastAction} />
    </>
  )
}
