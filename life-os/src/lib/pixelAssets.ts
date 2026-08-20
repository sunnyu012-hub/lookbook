/**
 * 픽셀 에셋 접근점.
 *
 * 파일 경로를 컴포넌트에 직접 쓰지 않는다. 에셋을 교체할 때는
 * assets-source/asset-sheet.png 를 바꾸고 `python3 scripts/process-pixel-assets.py` 만 다시 돌리면 된다.
 */
import type { EnergyMode } from '@/types'
import {
  characters,
  effects,
  fashion,
  furniture,
  gear,
  icons,
  items,
  pets,
  ui,
  type PixelAsset,
} from './pixelAssets.generated'

export type { PixelAsset }
export { characters, effects, fashion, furniture, gear, icons, items, pets, ui }

export const pixelAssets = { characters, effects, fashion, furniture, gear, icons, items, pets, ui }

/** 모드별 캐릭터 — Energy Score 가 바뀌면 방 안의 캐릭터가 바뀐다 */
export const MODE_CHARACTER: Record<EnergyMode, PixelAsset> = {
  RECOVERY: characters.recovery,
  EASY: characters.easy,
  NORMAL: characters.normal,
  POWER: characters.power,
}

/** 모드별 상태 배지 (시트에서 잘라온 실제 픽셀 pill) */
export const MODE_PILL: Record<EnergyMode, PixelAsset> = {
  RECOVERY: ui.pillRecovery,
  EASY: ui.pillEasy,
  NORMAL: ui.pillNormal,
  POWER: ui.pillPower,
}

/** 모드를 상징하는 작은 아이템 아이콘 */
export const MODE_ICON: Record<EnergyMode, PixelAsset> = {
  RECOVERY: icons.sleep,
  EASY: items.coffeeMug,
  NORMAL: icons.work,
  POWER: icons.energy,
}

/** 체크인 항목 아이콘 */
export const STAT_ICON = {
  sleep: icons.sleep,
  fatigue: icons.fatigue,
  mood: icons.mood,
  body: icons.body,
  focus: icons.focus,
  appetite: icons.appetite,
  caffeine: icons.caffeine,
  exercise: icons.exercise,
} as const

export type StatKey = keyof typeof STAT_ICON
