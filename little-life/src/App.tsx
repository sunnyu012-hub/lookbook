import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Battle, BattleDef, Quest, QuestDraft, Routine } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { BottomNavigation, type TabKey } from '@/components/navigation/BottomNavigation'
import { QuestCreationSheet } from '@/components/quest/QuestCreationSheet'
import { BattleSheet } from '@/components/rpg/BattleSheet'
import { LevelUpOverlay } from '@/components/feedback/LevelUpOverlay'
import { BattleClearOverlay } from '@/components/feedback/BattleClearOverlay'
import { DropRevealOverlay } from '@/components/feedback/DropRevealOverlay'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Toast } from '@/components/ui/Toast'
import { useGameState } from '@/hooks/useGameState'
import { useFeedback } from '@/hooks/useFeedback'
import { WELCOME_GIFT } from '@/store/migrate'
import { findArea } from '@/lib/rpg/content'
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
  } = useGameState()
  const feedback = useFeedback()

  const [tab, setTab] = useState<TabKey>('home')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Quest | null>(null)
  const [pendingRoutineDelete, setPendingRoutineDelete] = useState<Routine | null>(null)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)
  // id 로만 들고 있는다. 상태에서 매번 다시 찾아야 HP 가 깎이는 게 시트에 바로 보인다.
  const [openBattleId, setOpenBattleId] = useState<string | null>(null)

  const openBattle = useMemo(
    () => state.battles.find((b) => b.id === openBattleId) ?? null,
    [state.battles, openBattleId],
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
    },
    [completeQuest, uncompleteQuest, feedback],
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
      }
    },
    [state.battles, doBattleAction, feedback],
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
        tabBar={<BottomNavigation active={tab} onChange={setTab} />}
      >
        {tab === 'home' && (
          <HomeScreen
            state={state}
            mood={feedback.mood}
            expToasts={feedback.expToasts}
            onComplete={handleComplete}
            onAddQuest={() => setSheetOpen(true)}
            onSeeAll={() => setTab('quest')}
            onOpenMap={() => setTab('map')}
            onOpenBag={() => setTab('bag')}
            onOpenMe={() => setTab('me')}
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
            onAddQuest={() => setSheetOpen(true)}
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
            onSelectArea={handleSelectArea}
          />
        )}
        {tab === 'bag' && (
          <BagScreen
            inventory={state.inventory}
            equipped={state.user.equippedItems}
            coins={state.user.coins}
            onEquip={handleEquip}
            onUnequip={unequipSlot}
          />
        )}
        {tab === 'me' && (
          <MeScreen
            state={state}
            onRename={renameUser}
            onSelectClass={setClass}
            onOpenBag={() => setTab('bag')}
          />
        )}
      </AppShell>

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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="이 퀘스트를 지울까?"
        description="이미 받은 EXP 는 그대로 남아 있어."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingRoutineDelete !== null}
        title="이 반복을 그만둘까?"
        description="오늘 이미 만들어진 퀘스트는 그대로 남아 있어."
        confirmLabel="Delete"
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
