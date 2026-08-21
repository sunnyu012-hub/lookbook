/**
 * NEXT UNLOCK — 다음에 열릴 것들.
 *
 * "0 / 45" 만 보여 주면 답답하기만 하다.
 * 뭘 하면 뭐가 열리는지 보이면 잠긴 것도 기다릴 만해진다.
 *
 * 규칙
 *   · 가장 가까운 것부터 보여 준다. 멀리 있는 건 안 보여 준다.
 *   · 비밀 배지는 여기 넣지 않는다 (비밀이니까).
 *   · "몇 번 더" 만 말하고 서두르게 하지 않는다.
 */
import type { PixelAsset } from '../pixelAssets'
import type { BadgeState } from '../badges'
import type { Chapter } from '../manual'
import type { LifeTree } from './lifeTree'

export type UnlockSource = 'tree' | 'badge' | 'manual'

export interface NextUnlock {
  id: string
  source: UnlockSource
  /** 픽셀 폰트 라벨 */
  title: string
  /** 뭘 하면 열리는지 */
  hint: string
  icon: PixelAsset
  have: number
  need: number
  /** 0~1 */
  ratio: number
  /** 몇 번 더 하면 되는지 */
  left: number
}

export const SOURCE_LABEL: Record<UnlockSource, string> = {
  tree: 'LIFE TREE',
  badge: 'COLLECTION',
  manual: 'MY MANUAL',
}

export interface UnlockInput {
  tree: LifeTree
  badges: BadgeState[]
  chapters: Chapter[]
}

/** 아직 시작도 안 한 것(진행 0)은 뒤로 민다 — 눈앞에 있는 걸 먼저 보여 준다 */
function rank(u: NextUnlock): number {
  if (u.have === 0) return u.ratio - 1
  return u.ratio
}

export function nextUnlocks({ tree, badges, chapters }: UnlockInput, limit = 3): NextUnlock[] {
  const out: NextUnlock[] = []

  for (const branch of tree.branches) {
    for (const node of branch.children) {
      if (node.status !== 'HIDDEN') continue
      out.push({
        id: `tree:${node.key}`,
        source: 'tree',
        title: node.title,
        hint: `${node.ko} — ${node.need - node.have}번 더 기록하면`,
        icon: node.icon,
        have: node.have,
        need: node.need,
        ratio: node.need > 0 ? node.have / node.need : 0,
        left: Math.max(0, node.need - node.have),
      })
    }
  }

  for (const badge of badges) {
    // 비밀 배지는 미리 알려 주지 않는다
    if (badge.earned || badge.secret) continue
    const goal = badge.goal ?? 1
    out.push({
      id: `badge:${badge.id}`,
      source: 'badge',
      title: badge.name,
      hint: badge.hint,
      icon: badge.icon,
      have: badge.progress,
      need: goal,
      ratio: goal > 0 ? badge.progress / goal : 0,
      left: Math.max(0, goal - badge.progress),
    })
  }

  for (const chapter of chapters) {
    if (chapter.unlocked) continue
    out.push({
      id: `manual:${chapter.key}`,
      source: 'manual',
      title: chapter.title,
      hint: `${chapter.ko} — ${chapter.need - chapter.have}번 더 기록하면`,
      icon: chapter.icon,
      have: chapter.have,
      need: chapter.need,
      ratio: chapter.need > 0 ? chapter.have / chapter.need : 0,
      left: Math.max(0, chapter.need - chapter.have),
    })
  }

  return out.sort((a, b) => rank(b) - rank(a)).slice(0, limit)
}
