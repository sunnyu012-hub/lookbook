import { describe, expect, it } from 'vitest'
import { applyExp, levelFromTotalExp, levelProgress, requiredExp } from '../level'

describe('requiredExp', () => {
  it('LV1 은 100, 이후 25씩 늘어난다', () => {
    expect(requiredExp(1)).toBe(100)
    expect(requiredExp(2)).toBe(125)
    expect(requiredExp(5)).toBe(200)
  })
})

describe('applyExp', () => {
  it('넘치면 다음 레벨로 넘긴다', () => {
    expect(applyExp(1, 90, 40)).toEqual({ level: 2, currentExp: 30, leveledUp: true })
  })

  it('한 번에 여러 레벨도 올라간다', () => {
    const result = applyExp(1, 0, 1000)
    expect(result.level).toBeGreaterThan(3)
    expect(result.leveledUp).toBe(true)
  })

  it('모자라면 그대로 쌓인다', () => {
    expect(applyExp(3, 10, 20)).toEqual({ level: 3, currentExp: 30, leveledUp: false })
  })
})

describe('levelFromTotalExp — applyExp 를 되짚는다', () => {
  it('0 EXP 는 LV.1', () => {
    expect(levelFromTotalExp(0)).toEqual({ level: 1, currentExp: 0 })
  })

  it('딱 떨어지는 경계', () => {
    expect(levelFromTotalExp(100)).toEqual({ level: 2, currentExp: 0 })
    expect(levelFromTotalExp(99)).toEqual({ level: 1, currentExp: 99 })
    expect(levelFromTotalExp(225)).toEqual({ level: 3, currentExp: 0 }) // 100 + 125
  })

  it('음수나 소수가 들어와도 깨지지 않는다', () => {
    expect(levelFromTotalExp(-50)).toEqual({ level: 1, currentExp: 0 })
    expect(levelFromTotalExp(10.7)).toEqual({ level: 1, currentExp: 10 })
  })

  /**
   * 이게 이 파일에서 제일 중요한 검사다.
   * 완료를 되돌릴 때 totalExp 로 레벨을 다시 계산하는데,
   * 그 값이 쌓아온 결과와 어긋나면 레벨이 조용히 틀어진다.
   */
  it('EXP 를 쭉 쌓은 결과와 언제나 일치한다', () => {
    const gains = [10, 20, 40, 10, 40, 20, 40, 40, 10, 20, 40, 40, 40, 10, 20, 40, 40, 40, 40, 40]
    let level = 1
    let currentExp = 0
    let total = 0

    for (const gain of gains) {
      const applied = applyExp(level, currentExp, gain)
      level = applied.level
      currentExp = applied.currentExp
      total += gain

      expect(levelFromTotalExp(total)).toEqual({ level, currentExp })
    }
  })

  it('되돌리면 원래 자리로 정확히 돌아온다', () => {
    // LV.2 문턱을 막 넘은 상태에서 40 을 빼면 다시 LV.1 이어야 한다
    const after = levelFromTotalExp(130)
    expect(after).toEqual({ level: 2, currentExp: 30 })

    const undone = levelFromTotalExp(130 - 40)
    expect(undone).toEqual({ level: 1, currentExp: 90 })
  })
})

describe('levelProgress', () => {
  it('0~1 사이로 잘린다', () => {
    expect(levelProgress(1, 50)).toBe(0.5)
    expect(levelProgress(1, 999)).toBe(1)
    expect(levelProgress(1, -5)).toBe(0)
  })
})
