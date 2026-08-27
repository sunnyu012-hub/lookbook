import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Battle, CompleteResult, DropResult } from '@/types'
import type { BattleClearBanner } from '@/components/feedback/BattleClearOverlay'
import type { RewardSummary } from '@/components/feedback/RewardSummaryOverlay'
import type { CharacterMood } from '@/components/character/types'
import type { BattleClearResult } from '@/hooks/useGameState'

export interface Feedback {
  /**
   * 방금 끝낸 퀘스트 한 장. EXP·코인·스탯·주운 것·몬스터 진행이 여기 다 들어간다.
   *
   * 예전에는 +EXP 토스트와 LEVEL UP 카드와 드롭 카드가 차례로 떴다.
   * 셋을 다 보고 나서도 코인이 얼마나 늘었는지는 여전히 알 수 없었다.
   */
  rewardSummary: RewardSummary | null
  levelUp: number | null
  /** 캐릭터가 지금 지어야 할 표정 */
  mood: CharacterMood
  toast: string | null
  toastAction: { label: string; onClick: () => void } | null
  /** 방금 주운 것들 — 눌러서 닫을 때까지 떠 있는다 */
  drops: DropResult[]
  battleClear: BattleClearBanner | null
  /**
   * 퀘스트 완료 결과를 그대로 넘기면 보상 요약을 띄운다.
   * `onDone` 은 요약이 닫힌 뒤에 불린다 — 새 발견 연출을 겹쳐 띄우지 않으려는 것이다.
   */
  celebrate: (result: CompleteResult, questTitle: string, onDone?: () => void) => void
  /** 몬스터·보스를 잡았을 때. CLEAR → 레벨업 → 드롭 순서로 이어 보여준다. */
  celebrateBattleClear: (battle: Battle, result: BattleClearResult) => void
  dismissDrops: () => void
  dismissReward: () => void
  notify: (message: string, action?: { label: string; onClick: () => void }) => void
}

/**
 * 보상 요약이 떠 있는 시간.
 *
 * 눈에 잘 보여야 하지만 기다리게 만들면 그때부터는 닫아야 하는 창이 된다.
 * 아무 데나 누르면 바로 닫힌다.
 */
const REWARD_SUMMARY_MS = 2600
/** 레벨이 올랐거나 몬스터가 같이 줄었으면 읽을 게 한 줄씩 더 있다 */
const REWARD_EXTRA_MS = 600
const REWARD_MAX_MS = 4200
const LEVEL_UP_MS = 1600
const TOAST_MS = 1800
const BATTLE_CLEAR_MS = 1700
const DROP_REVEAL_MS = 2600

/** 보상 요약, LEVEL UP, 캐릭터 표정, 안내 토스트를 한군데서 관리한다. */
export function useFeedback(): Feedback {
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null)
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const [mood, setMood] = useState<CharacterMood>('idle')
  const [toast, setToast] = useState<string | null>(null)
  const [toastAction, setToastAction] = useState<Feedback['toastAction']>(null)
  const [drops, setDrops] = useState<DropResult[]>([])
  const [battleClear, setBattleClear] = useState<BattleClearBanner | null>(null)
  const timers = useRef<number[]>([])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const dismissDrops = useCallback(() => setDrops([]), [])

  /**
   * 요약이 닫힌 뒤에 할 일 (새 발견 연출).
   *
   * 타이머가 아니라 여기에 들고 있는 이유: 사람은 다 읽으면 그냥 눌러서 닫는다.
   * 그때도 뒤이어 뜰 게 바로 떠야지, 이미 닫은 카드의 타이머를 기다렸다가
   * 몇 초 뒤에 불쑥 뜨면 그건 방금 한 행동과 이어지지 않는 화면이 된다.
   */
  const pendingAfterReward = useRef<(() => void) | null>(null)
  /** 지금 떠 있는 요약이 어느 퀘스트 것인지. 타이머가 남의 카드를 닫지 않게 둔다. */
  const showingReward = useRef<string | null>(null)

  const dismissReward = useCallback(() => {
    showingReward.current = null
    setRewardSummary(null)
    setMood('idle')
    const after = pendingAfterReward.current
    pendingAfterReward.current = null
    after?.()
  }, [])

  /**
   * 드롭은 다른 연출이 끝난 뒤에 띄운다.
   * +EXP · LEVEL UP · CLEAR 와 겹쳐 뜨면 뭘 받았는지 읽을 틈이 없다.
   */
  const revealDrops = useCallback(
    (found: DropResult[], delay: number) => {
      if (found.length === 0) return
      later(() => {
        setDrops(found)
        later(() => setDrops((current) => (current === found ? [] : current)), DROP_REVEAL_MS)
      }, delay)
    },
    [later],
  )

  const celebrate = useCallback(
    (result: CompleteResult, questTitle: string, onDone?: () => void) => {
      // 배틀까지 같이 넘겼으면 그쪽에서 떨어진 것도 같은 줄에 얹는다.
      // 카드를 두 번 띄우지 않는 게 이 화면의 전부다.
      const drops = [...(result.drop ? [result.drop] : []), ...result.battleDrops]

      // 앞의 요약이 아직 안 닫혔으면 그쪽 뒷일부터 흘려보낸다.
      // 연달아 완료했을 때 앞의 발견이 조용히 사라지지 않게.
      const previous = pendingAfterReward.current
      pendingAfterReward.current = onDone ?? null
      showingReward.current = questTitle
      previous?.()

      setRewardSummary({
        questTitle,
        statKey: result.statKey,
        before: result.before,
        after: result.after,
        leveledUp: result.leveledUp,
        drops,
        collected: result.collected,
        battles: result.battleProgress,
      })

      setMood(result.leveledUp ? 'levelUp' : 'questClear')

      const extras = (result.leveledUp ? 1 : 0) + Math.min(result.battleProgress.length, 2)
      const visible = Math.min(REWARD_SUMMARY_MS + extras * REWARD_EXTRA_MS, REWARD_MAX_MS)

      later(() => {
        // 그 사이 다른 퀘스트를 끝냈으면 그쪽 요약이 떠 있다. 남의 카드를 닫지 않는다.
        if (showingReward.current !== questTitle) return
        dismissReward()
      }, visible)
    },
    [later, dismissReward],
  )

  /**
   * 몬스터·보스 클리어.
   * CLEAR 카드 → (레벨업) → 드롭 순서로 하나씩 지나간다.
   */
  const celebrateBattleClear = useCallback(
    (battle: Battle, result: BattleClearResult) => {
      setMood('levelUp')
      setBattleClear({
        kind: battle.kind,
        name: battle.name,
        icon: battle.icon,
        exp: result.exp,
        coins: result.coins,
      })
      later(() => setBattleClear(null), BATTLE_CLEAR_MS)

      if (result.leveledUp) {
        later(() => {
          setLevelUp(result.newLevel)
          later(() => setLevelUp(null), LEVEL_UP_MS)
        }, BATTLE_CLEAR_MS + 120)
      }

      const dropDelay = result.leveledUp
        ? BATTLE_CLEAR_MS + 120 + LEVEL_UP_MS + 120
        : BATTLE_CLEAR_MS + 120
      revealDrops(result.drops, dropDelay)

      later(
        () => setMood((current) => (current === 'levelUp' ? 'idle' : current)),
        dropDelay + (result.drops.length > 0 ? DROP_REVEAL_MS : 0),
      )
    },
    [later, revealDrops],
  )

  const notify = useCallback(
    (message: string, action?: { label: string; onClick: () => void }) => {
      setToast(message)
      setToastAction(action ?? null)
      later(() => {
        setToast((current) => (current === message ? null : current))
        setToastAction(null)
      }, TOAST_MS)
    },
    [later],
  )

  return useMemo(
    () => ({
      rewardSummary,
      levelUp,
      mood,
      toast,
      toastAction,
      drops,
      battleClear,
      celebrate,
      celebrateBattleClear,
      dismissDrops,
      dismissReward,
      notify,
    }),
    [
      rewardSummary,
      levelUp,
      mood,
      toast,
      toastAction,
      drops,
      battleClear,
      celebrate,
      celebrateBattleClear,
      dismissDrops,
      dismissReward,
      notify,
    ],
  )
}
