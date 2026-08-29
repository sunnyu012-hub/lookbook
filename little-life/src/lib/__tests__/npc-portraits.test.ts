import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { NPC_IDS } from '@/types'
import { NPCS } from '@/lib/city/npcs'
import { npcPortrait, npcsWithoutPortrait } from '@/lib/city/portraits'

/**
 * 얼굴이 있다고 적어놓고 파일이 없으면 화면에 깨진 그림 자리가 남는다.
 * 이모지로 떨어지지도 않는다 — `npcPortrait` 이 경로를 돌려줬으니까.
 */
describe('사람 얼굴 그림', () => {
  for (const npc of NPCS) {
    const src = npcPortrait(npc.id)
    if (!src) continue
    it(`${npc.id} (${npc.name})`, () => {
      const path = `public${src}`
      expect(existsSync(path), path).toBe(true)
      // 도시 시트에서 64px 로 쓴다. 너무 작으면 뭉개지고 너무 크면 폰에서 낭비다.
      expect(statSync(path).size).toBeLessThan(60 * 1024)
    })
  }

  it('그림 폴더에 주인 없는 파일이 남아 있지 않다', () => {
    const files = readdirSync('public/assets/npcs').filter((f) => f.endsWith('.webp'))
    const orphans = files.filter((f) => !npcPortrait(f.replace('.webp', '') as never))
    expect(orphans).toEqual([])
  })

  it('스물넷 모두 얼굴이 있거나 이모지가 있다', () => {
    for (const npc of NPCS) {
      expect(npcPortrait(npc.id) ?? npc.avatar).toBeTruthy()
    }
  })

  /**
   * 사람을 새로 들이면 여기서 먼저 걸린다. 그림 없이 도시에 세워도
   * 앱은 이모지로 멀쩡히 돌아가니까, 깨졌다고 사람을 빼는 게 아니라
   * 그림을 요청하거나 이 줄을 고치면 된다.
   */
  it('스물넷 다 얼굴이 있다', () => {
    expect(npcsWithoutPortrait()).toEqual([])
    expect(NPC_IDS).toHaveLength(24)
  })
})
