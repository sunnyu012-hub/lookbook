import type { GrowthStage } from '@/types'

/**
 * 정원에서 쓰는 말들.
 *
 * 남은 시간은 크게, 정확하게 보여주지 않는다.
 * 초 단위로 줄어드는 숫자를 띄우면 그때부터 그건 기다림이 아니라 카운트다운이다.
 */

/** "2시간 14분" · "14분" · "곧" */
export function remainingLabel(seconds: number): string {
  if (seconds <= 0) return '다 자랐어'
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 1) return '곧'
  if (minutes < 60) return `${minutes}분`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}

/** 자라는 데 걸리는 시간 — 씨앗을 고를 때 보여준다 */
export function growthLabel(seconds: number): string {
  const hours = Math.round(seconds / 3600)
  return `${hours}시간`
}

/**
 * 자라는 모습.
 *
 * 작물마다 그림이 따로 없어서 지금은 이 한 벌을 같이 쓴다.
 * 다 자라기 전에는 무엇이 될지 굳이 감추지 않는다 —
 * 뭘 심었는지는 심은 사람이 아니까.
 */
export const STAGE_ICON: Record<GrowthStage, string> = {
  0: '·',
  1: '🌱',
  2: '🌿',
  3: '🌾',
  4: '',
}

export const STAGE_LABEL: Record<GrowthStage, string> = {
  0: '심은 지 얼마 안 됐어',
  1: '싹이 났어',
  2: '자라는 중',
  3: '거의 다 됐어',
  4: '다 자랐어',
}
