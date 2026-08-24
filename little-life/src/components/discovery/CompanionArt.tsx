import { useState } from 'react'
import type { CompanionDef } from '@/types'
import { companionArt, type CompanionPose } from '@/lib/discovery/companions'
import { cn } from '@/components/ui/cn'

interface CompanionArtProps {
  def: CompanionDef
  pose?: CompanionPose
  className?: string
}

/**
 * 동료 한 마리.
 *
 * 그림이 안 뜨면 이모지로 돌아간다 — 캐시가 비었거나 오프라인 첫 실행이면
 * 잠깐 그럴 수 있는데, 그때 빈칸이 남으면 자리가 무너져 보인다.
 */
export function CompanionArt({ def, pose = 'idle', className }: CompanionArtProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span aria-hidden className={cn('flex items-center justify-center', className)}>
        {def.avatar}
      </span>
    )
  }

  return (
    <img
      src={companionArt(def, pose)}
      alt=""
      aria-hidden
      onError={() => setFailed(true)}
      className={cn('select-none object-contain', className)}
    />
  )
}
