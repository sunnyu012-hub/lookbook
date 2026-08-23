import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { COMPANIONS, companionArt, type CompanionPose } from '@/lib/discovery/companions'

/** 화면에서 부르는 자세는 파일이 실제로 있어야 한다 */
describe('동료 그림 파일', () => {
  const POSES: CompanionPose[] = ['idle', 'walk', 'sleep', 'back']

  for (const def of COMPANIONS) {
    for (const pose of POSES) {
      it(`${def.id} / ${pose}`, () => {
        const path = `public${companionArt(def, pose)}`
        expect(existsSync(path), path).toBe(true)
      })
    }
  }
})
