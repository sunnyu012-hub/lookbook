import { describe, expect, it } from 'vitest'
import type { Battle } from '@/types'
import { BATTLE_DEFS, BOSSES, MONSTERS } from '@/lib/rpg/content'
import { ALL_PRESETS } from '@/lib/library/packs'
import { applyBattleAction, createBattle, remainingDamage, undoBattleAction } from '../rpg/battle'
import { findBattleDef } from '../rpg/content'
import { linkQuestToBattles, unlinkQuestFromBattles } from '../rpg/link'
import {
  LINEUP_COUNT,
  categoriesIn,
  libraryOrder,
  startableDefs,
  todaysLineup,
} from '../rpg/lineup'

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

// ── 퀘스트 연동 ─────────────────────────────────────────
describe('퀘스트로 몬스터·보스 깎기', () => {
  const battleOf = (defId: string) => createBattle(findBattleDef(defId)!, makeId)

  it('제목에 걸리는 행동 하나가 대신 눌린다', () => {
    const b = battleOf('dish_slime')
    const r = linkQuestToBattles([b], { title: '설거지 끝내기' })

    expect(r.progress).toHaveLength(1)
    expect(r.progress[0]).toMatchObject({
      name: '설거지 슬라임',
      actionLabel: '프라이팬 씻기',
      before: 0,
      after: 1,
      total: 3,
      cleared: false,
    })
    expect(r.battles[0].hp).toBe(25)
  })

  it('안 걸리면 아무것도 안 바뀐다 — 배열도 그대로다', () => {
    const battles = [battleOf('dish_slime')]
    const r = linkQuestToBattles(battles, { title: '좋아하는 노래 한 곡 듣기' })

    expect(r.progress).toEqual([])
    // 참조까지 그대로여야 위쪽에서 "바뀌었나" 를 싸게 판단할 수 있다
    expect(r.battles).toBe(battles)
  })

  it('한 번 완료에 배틀 하나당 행동 하나만 — 파밍이 안 된다', () => {
    const b = battleOf('reply_ghost')
    // '밀린답장' 과 '답장' 이 둘 다 걸리는 제목
    const r = linkQuestToBattles([b], { title: '밀린 답장 하나' })
    expect(r.progress).toHaveLength(1)
  })

  it('더 구체적으로 적힌 행동이 이긴다 — 파일 순서에 안 달린다', () => {
    const b = battleOf('reply_ghost')
    const r = linkQuestToBattles([b], { title: '밀린 답장 하나' })
    expect(r.progress[0].actionLabel).toBe('제일 오래된 것 하나')
  })

  it('같은 말에 걸리는 배틀이 여럿이면 다 같이 줄어든다', () => {
    const blob = battleOf('laundry_blob')
    const boss = battleOf('laundry_overlord')
    const r = linkQuestToBattles([blob, boss], { title: '빨래 돌리기' })

    expect(r.progress.map((p) => p.name)).toEqual(['빨래 덩어리', '빨래 대마왕'])
  })

  it('이미 끝낸 행동은 건너뛰고 다음 것으로 가지 않는다', () => {
    const b = battleOf('dish_slime')
    const once = linkQuestToBattles([b], { title: '설거지 끝내기' })
    const twice = linkQuestToBattles(once.battles, { title: '설거지 끝내기' })

    // 같은 퀘스트를 또 완료해도 이 배틀에서는 더 나올 게 없다
    expect(twice.progress).toEqual([])
    expect(twice.battles[0].hp).toBe(25)
  })

  it('마지막 행동이 걸리면 그 자리에서 쓰러진다', () => {
    let battles = [battleOf('night_scroll')]
    for (const title of ['화면 잠시 내려놓기', '잘 때 폰 손 안 닿는 곳에 두기']) {
      battles = linkQuestToBattles(battles, { title }).battles
    }
    const last = linkQuestToBattles(battles, { title: '정한 시간에 눕기' })

    expect(last.progress[0]).toMatchObject({ after: 3, total: 3, cleared: true })
    expect(last.clearedBattles).toHaveLength(1)
    expect(last.battles[0].status).toBe('CLEARED')
  })

  it('클리어되지 않은 판은 되돌리면 정확히 원래대로', () => {
    const b = battleOf('dish_slime')
    const hit = linkQuestToBattles([b], { title: '설거지 끝내기' })
    const back = unlinkQuestFromBattles(hit.battles, [
      { battleId: hit.progress[0].battleId, actionId: hit.progress[0].actionId },
    ])

    expect(back[0].hp).toBe(40)
    expect(back[0].actions.every((a) => a.doneAt === null)).toBe(true)
  })

  it('이미 쓰러진 판은 되돌리기가 건드리지 않는다', () => {
    let battles = [battleOf('night_scroll')]
    for (const title of ['화면 잠시 내려놓기', '잘 때 폰 손 안 닿는 곳에 두기']) {
      battles = linkQuestToBattles(battles, { title }).battles
    }
    const last = linkQuestToBattles(battles, { title: '정한 시간에 눕기' })
    const back = unlinkQuestFromBattles(last.battles, [
      { battleId: last.progress[0].battleId, actionId: last.progress[0].actionId },
    ])

    expect(back[0].status).toBe('CLEARED')
    expect(back[0].hp).toBe(0)
  })

  it('제목이 비어 있으면 아무것도 안 한다', () => {
    const battles = [battleOf('dish_slime')]
    expect(linkQuestToBattles(battles, { title: '   ' }).battles).toBe(battles)
  })
})

describe('몬스터·보스 콘텐츠', () => {
  it('id 와 아이콘이 전부 다르다', () => {
    const ids = BATTLE_DEFS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    const icons = BATTLE_DEFS.map((b) => b.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('HP 는 행동을 다 하면 정확히 0 이 된다', () => {
    for (const def of BATTLE_DEFS) {
      const total = def.actions.reduce((s, a) => s + a.damage, 0)
      expect(total, def.id).toBeGreaterThanOrEqual(def.maxHp)
    }
  })

  it('보스는 3~5개의 행동으로 끝난다 — 체크리스트가 길어지면 그건 부담이다', () => {
    for (const boss of BOSSES) {
      expect(boss.actions.length, boss.id).toBeGreaterThanOrEqual(3)
      expect(boss.actions.length, boss.id).toBeLessThanOrEqual(5)
    }
  })

  it('모든 몬스터·보스가 준비된 퀘스트로 진행된다', () => {
    // 어느 하나라도 준비된 퀘스트와 안 이어져 있으면, 그건 시트를 따로 열어
    // 손으로만 체크해야 하는 배틀이라는 뜻이다.
    for (const def of BATTLE_DEFS) {
      const reachable = ALL_PRESETS.some(
        (e) =>
          linkQuestToBattles([createBattle(def, makeId)], { title: e.preset.title }).progress
            .length > 0,
      )
      expect(reachable, def.id).toBe(true)
    }
  })

  it('준비된 퀘스트 하나가 한 배틀에서 두 행동을 건드리지 않는다', () => {
    for (const def of BATTLE_DEFS) {
      for (const entry of ALL_PRESETS) {
        const r = linkQuestToBattles([createBattle(def, makeId)], {
          title: entry.preset.title,
        })
        expect(r.progress.length, `${def.id} ← ${entry.preset.title}`).toBeLessThanOrEqual(1)
      }
    }
  })
})

// ── 목록에 뭘 먼저 보여줄지 ──────────────────────────────
describe('오늘의 노출 목록', () => {
  const started = (defId: string, status: 'ACTIVE' | 'CLEARED' = 'ACTIVE'): Battle => ({
    ...createBattle(findBattleDef(defId)!, makeId),
    status,
    clearedAt: status === 'CLEARED' ? '2026-08-20T10:00:00.000Z' : null,
  })
  const day = new Date('2026-08-24T09:00:00')

  it('몬스터는 4개, 보스는 3개만 내민다', () => {
    expect(todaysLineup(MONSTERS, [], 'MONSTER', day)).toHaveLength(LINEUP_COUNT.MONSTER)
    expect(todaysLineup(BOSSES, [], 'BOSS', day)).toHaveLength(LINEUP_COUNT.BOSS)
  })

  it('같은 날에는 순서가 요동치지 않는다', () => {
    const morning = todaysLineup(MONSTERS, [], 'MONSTER', new Date('2026-08-24T07:00:00'))
    const night = todaysLineup(MONSTERS, [], 'MONSTER', new Date('2026-08-24T23:30:00'))
    expect(night.map((d) => d.id)).toEqual(morning.map((d) => d.id))
  })

  it('날이 바뀌면 다른 것도 올라온다', () => {
    const today = todaysLineup(MONSTERS, [], 'MONSTER', day).map((d) => d.id)
    const week = ['25', '26', '27', '28', '29', '30'].map((d) =>
      todaysLineup(MONSTERS, [], 'MONSTER', new Date(`2026-08-${d}T09:00:00`)).map((x) => x.id),
    )
    expect(week.some((ids) => ids.join() !== today.join())).toBe(true)
  })

  it('분야가 겹치지 않게 고른다', () => {
    const picked = todaysLineup(MONSTERS, [], 'MONSTER', day)
    expect(new Set(picked.map((d) => d.category)).size).toBe(picked.length)
  })

  it('진행 중인 것은 안 내민다 — 위에 이미 있다', () => {
    const first = todaysLineup(MONSTERS, [], 'MONSTER', day)[0]
    const picked = todaysLineup(MONSTERS, [started(first.id)], 'MONSTER', day)
    expect(picked.map((d) => d.id)).not.toContain(first.id)
    expect(picked).toHaveLength(LINEUP_COUNT.MONSTER)
  })

  it('하나 시작해도 나머지 자리는 그대로 있다', () => {
    // 고른 벌로 안 고른 것들까지 바뀌면, 그건 누르기 싫어지는 화면이다
    const before = todaysLineup(MONSTERS, [], 'MONSTER', day)
    const after = todaysLineup(MONSTERS, [started(before[0].id)], 'MONSTER', day)
    expect(after.map((d) => d.id).slice(0, 3)).toEqual(before.slice(1).map((d) => d.id))
  })

  it('방금 끝낸 것은 다시 안 내민다', () => {
    const first = todaysLineup(MONSTERS, [], 'MONSTER', day)[0]
    const picked = todaysLineup(MONSTERS, [started(first.id, 'CLEARED')], 'MONSTER', day)
    expect(picked.map((d) => d.id)).not.toContain(first.id)
  })

  it('남은 게 모자라면 있는 만큼만 낸다 — 없는 걸 지어내지 않는다', () => {
    const two = MONSTERS.slice(0, 2)
    expect(todaysLineup(two, [], 'MONSTER', day)).toHaveLength(2)
  })
})

describe('전체 보기 목록', () => {
  const battleOf = (defId: string, status: 'ACTIVE' | 'CLEARED', clearedAt?: string): Battle => ({
    ...createBattle(findBattleDef(defId)!, makeId),
    status,
    clearedAt: clearedAt ?? null,
  })

  it('진행 중인 것만 빠지고 나머지는 전부 있다', () => {
    const battles = [battleOf('dish_slime', 'ACTIVE')]
    const ids = libraryOrder(MONSTERS, battles).map((e) => e.def.id)

    expect(ids).toHaveLength(MONSTERS.length - 1)
    expect(ids).not.toContain('dish_slime')
  })

  it('끝낸 것도 남는다 — 설거지는 다음 주에 또 쌓인다', () => {
    const battles = [battleOf('dish_slime', 'CLEARED', '2026-08-20T10:00:00.000Z')]
    const entry = libraryOrder(MONSTERS, battles).find((e) => e.def.id === 'dish_slime')

    expect(entry).toBeTruthy()
    expect(entry!.clearedAt).toBe('2026-08-20T10:00:00.000Z')
  })

  it('안 해본 것이 먼저, 끝낸 것은 오래된 순으로 뒤에', () => {
    const battles = [
      battleOf('dish_slime', 'CLEARED', '2026-08-22T10:00:00.000Z'),
      battleOf('mail_goblin', 'CLEARED', '2026-08-20T10:00:00.000Z'),
    ]
    const entries = libraryOrder(MONSTERS, battles)
    const done = entries.filter((e) => e.clearedAt)

    expect(entries.slice(0, entries.length - 2).every((e) => e.clearedAt === null)).toBe(true)
    expect(done.map((e) => e.def.id)).toEqual(['mail_goblin', 'dish_slime'])
  })

  it('노출 목록에 없는 몬스터도 전체 보기에서는 전부 닿는다', () => {
    // 앞 화면에 몇 개만 보이는 건 표시일 뿐이고 접근 제한이 아니다
    const lineup = todaysLineup(MONSTERS, [], 'MONSTER', new Date('2026-08-24T09:00:00'))
    const all = libraryOrder(MONSTERS, []).map((e) => e.def.id)

    expect(all).toHaveLength(MONSTERS.length)
    for (const def of MONSTERS) expect(all, def.id).toContain(def.id)
    expect(lineup.every((d) => all.includes(d.id))).toBe(true)
  })

  it('필터 칩은 목록에 실제로 있는 분야만 만든다', () => {
    const categories = categoriesIn(libraryOrder(MONSTERS, []))
    const real = new Set(MONSTERS.map((m) => m.category))
    expect(new Set(categories)).toEqual(real)
  })

  it('시작할 수 있는 것에서 진행 중인 것만 뺀다', () => {
    const battles = [battleOf('dish_slime', 'ACTIVE'), battleOf('mail_goblin', 'CLEARED', 'x')]
    const ids = startableDefs(MONSTERS, battles).map((d) => d.id)

    expect(ids).not.toContain('dish_slime')
    expect(ids).toContain('mail_goblin')
  })
})
