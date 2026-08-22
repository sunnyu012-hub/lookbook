import { describe, expect, it } from 'vitest'
import { MONSTERS } from '@/lib/rpg/content'
import { applyBattleAction, createBattle, remainingDamage, undoBattleAction } from '../rpg/battle'
import { findBattleDef } from '../rpg/content'

let seq = 0
const makeId = () => `b${(seq += 1)}`
const dishSlime = () => createBattle(findBattleDef('dish_slime')!, makeId)

describe('createBattle', () => {
  it('원본 정의대로 만든다', () => {
    const b = dishSlime()
    expect(b).toMatchObject({ name: MONSTERS[0].name, hp: 40, maxHp: 40, status: 'ACTIVE' })
    expect(b.actions).toHaveLength(3)
    expect(b.actions.every((a) => a.doneAt === null)).toBe(true)
  })

  it('보스도 같은 방식으로 만들어진다', () => {
    const boss = createBattle(findBattleDef('deadline_dragon')!, makeId)
    expect(boss.kind).toBe('BOSS')
    expect(boss.maxHp).toBe(300)
    expect(boss.actions.reduce((s, a) => s + a.damage, 0)).toBe(300)
  })
})

describe('applyBattleAction', () => {
  it('행동만큼 HP 가 깎인다', () => {
    const b = dishSlime()
    const r = applyBattleAction(b, b.actions[0].id)
    expect(r?.battle.hp).toBe(30)
    expect(r?.cleared).toBe(false)
  })

  it('이미 끝낸 행동은 다시 세지 않는다', () => {
    const b = dishSlime()
    const once = applyBattleAction(b, b.actions[0].id)!
    expect(applyBattleAction(once.battle, b.actions[0].id)).toBeNull()
  })

  it('HP 가 0 이 되면 클리어', () => {
    let b = dishSlime()
    for (const action of b.actions) {
      const r = applyBattleAction(b, action.id)!
      b = r.battle
    }
    expect(b.hp).toBe(0)
    expect(b.status).toBe('CLEARED')
    expect(b.clearedAt).not.toBeNull()
  })

  it('HP 는 0 아래로 안 내려간다', () => {
    const b = { ...dishSlime(), hp: 5 }
    const r = applyBattleAction(b, b.actions[1].id)! // damage 15
    expect(r.battle.hp).toBe(0)
    expect(r.cleared).toBe(true)
  })

  it('클리어된 판에는 더 못 때린다', () => {
    const b = { ...dishSlime(), status: 'CLEARED' as const }
    expect(applyBattleAction(b, b.actions[0].id)).toBeNull()
  })
})

describe('undoBattleAction', () => {
  it('HP 를 되돌린다', () => {
    const b = dishSlime()
    const hit = applyBattleAction(b, b.actions[0].id)!.battle
    const undone = undoBattleAction(hit, b.actions[0].id)!

    expect(undone.hp).toBe(40)
    expect(undone.actions[0].doneAt).toBeNull()
  })

  it('클리어를 되돌리면 다시 진행 중이 된다', () => {
    let b = dishSlime()
    for (const action of b.actions) b = applyBattleAction(b, action.id)!.battle
    expect(b.status).toBe('CLEARED')

    const undone = undoBattleAction(b, b.actions[2].id)!
    expect(undone.status).toBe('ACTIVE')
    expect(undone.clearedAt).toBeNull()
    expect(undone.hp).toBe(15)
  })

  it('안 한 행동은 되돌릴 게 없다', () => {
    const b = dishSlime()
    expect(undoBattleAction(b, b.actions[0].id)).toBeNull()
  })

  it('최대 HP 를 넘지 않는다', () => {
    const b = { ...dishSlime(), hp: 38, actions: dishSlime().actions.map((a) => ({ ...a, doneAt: '2026-01-01T00:00:00Z' })) }
    const undone = undoBattleAction(b, b.actions[1].id)! // damage 15
    expect(undone.hp).toBe(40)
  })
})

describe('remainingDamage', () => {
  it('남은 행동의 합', () => {
    const b = dishSlime()
    expect(remainingDamage(b)).toBe(40)

    const hit = applyBattleAction(b, b.actions[0].id)!.battle
    expect(remainingDamage(hit)).toBe(30)
  })
})

describe('시간이 지나도 진행도가 사라지지 않는다', () => {
  it('며칠 전에 시작한 판도 HP 가 그대로다', () => {
    const b = dishSlime()
    const hit = applyBattleAction(b, b.actions[0].id, new Date('2026-01-01T10:00:00Z'))!.battle

    // 회복 로직 자체가 없다. 다음에 때릴 때도 이어서 깎인다.
    const later = applyBattleAction(hit, b.actions[1].id, new Date('2026-01-20T10:00:00Z'))!
    expect(later.battle.hp).toBe(15)
  })
})
