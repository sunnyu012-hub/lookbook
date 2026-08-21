import type { Battle, BattleDef, Rarity } from '@/types'

/**
 * 몬스터·보스 진행.
 *
 * 시간 제한이 없다. 며칠 쉬어도 HP 가 회복되거나 진행도가 사라지지 않는다.
 * 현실을 게임으로 재미있게 읽는 게 목적이지 사람을 몰아세우는 게 아니다.
 */

/** 원본 정의에서 진행 중인 한 판을 만든다. */
export function createBattle(
  def: BattleDef,
  makeId: () => string,
  now: Date = new Date(),
): Battle {
  return {
    id: makeId(),
    defId: def.id,
    kind: def.kind,
    name: def.name,
    description: def.description,
    category: def.category,
    icon: def.icon,
    hp: def.maxHp,
    maxHp: def.maxHp,
    actions: def.actions.map((action, i) => ({
      id: `${def.id}-${i}`,
      label: action.label,
      damage: action.damage,
      doneAt: null,
    })),
    rewardExp: def.rewardExp,
    rewardCoins: def.rewardCoins,
    guaranteedRarity: def.guaranteedRarity,
    ...(def.bonusRarity ? { bonusRarity: def.bonusRarity } : {}),
    status: 'ACTIVE',
    createdAt: now.toISOString(),
    clearedAt: null,
  }
}

export interface ActionResult {
  battle: Battle
  /** 이번 행동으로 쓰러졌는지 */
  cleared: boolean
}

/**
 * 행동 하나를 끝내고 HP 를 깎는다.
 * 이미 끝낸 행동은 다시 세지 않는다.
 */
export function applyBattleAction(
  battle: Battle,
  actionId: string,
  now: Date = new Date(),
): ActionResult | null {
  if (battle.status === 'CLEARED') return null

  const action = battle.actions.find((a) => a.id === actionId)
  if (!action || action.doneAt) return null

  const hp = Math.max(0, battle.hp - action.damage)
  const cleared = hp === 0

  return {
    battle: {
      ...battle,
      hp,
      actions: battle.actions.map((a) =>
        a.id === actionId ? { ...a, doneAt: now.toISOString() } : a,
      ),
      status: cleared ? 'CLEARED' : 'ACTIVE',
      clearedAt: cleared ? now.toISOString() : null,
    },
    cleared,
  }
}

/** 행동을 되돌린다. 잘못 눌렀을 때 쓴다. */
export function undoBattleAction(battle: Battle, actionId: string): Battle | null {
  const action = battle.actions.find((a) => a.id === actionId)
  if (!action || !action.doneAt) return null

  return {
    ...battle,
    hp: Math.min(battle.maxHp, battle.hp + action.damage),
    actions: battle.actions.map((a) => (a.id === actionId ? { ...a, doneAt: null } : a)),
    status: 'ACTIVE',
    clearedAt: null,
  }
}

/** 남은 행동을 다 해도 못 잡는지 — 화면에서 안내할 때 쓴다. */
export function remainingDamage(battle: Battle): number {
  return battle.actions
    .filter((a) => !a.doneAt)
    .reduce((sum, a) => sum + a.damage, 0)
}

/** 클리어 보상으로 보장되는 등급들 */
export function clearRarities(battle: Battle): Rarity[] {
  return battle.bonusRarity
    ? [battle.guaranteedRarity, battle.bonusRarity]
    : [battle.guaranteedRarity]
}
