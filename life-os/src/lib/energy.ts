/**
 * 모드(RECOVERY / EASY / NORMAL / POWER) 메타데이터.
 *
 * 점수 계산 자체는 lib/scoring 으로 옮겨 갔다 — 이 파일은 "점수를 어떻게 보여줄지" 만 담당한다.
 * 예전 import 경로를 유지하려고 계산 함수도 그대로 다시 내보낸다.
 */
import type { CheckinInput, EnergyMode } from '@/types'
import type { PixelAsset } from './pixelAssets.generated'
import { MODE_ICON, MODE_PILL } from './pixelAssets'
import { DEFAULT_SCORE_CONTEXT, scoreCheckin, scoreToMode, type ScoreContext } from './scoring'

export { scoreToMode, sleepHoursScore } from './scoring'

/** 0~100 정수. 적은 항목이 하나도 없으면 null */
export function calcEnergyScore(
  input: CheckinInput,
  ctx: ScoreContext = DEFAULT_SCORE_CONTEXT,
): number | null {
  return scoreCheckin(input, ctx).overall
}

export interface ModeMeta {
  key: EnergyMode
  /** 화면에 그대로 찍는 라틴 라벨 */
  label: string
  /** 모드를 상징하는 픽셀 아이템 */
  icon: PixelAsset
  /** 시트에서 잘라온 상태 배지 */
  pill: PixelAsset
  /** 게임 말투의 짧은 한 줄 */
  message: string
  /** 강조 색 (숫자·바) */
  hex: string
  /** 옅은 배경색 (배지·아이콘 뒤) */
  soft: string
  /** 아주 옅은 띠 색 (넓은 면적에 쓰는 색) */
  band: string
}

export const MODE_META: Record<EnergyMode, ModeMeta> = {
  RECOVERY: {
    key: 'RECOVERY',
    label: 'RECOVERY',
    icon: MODE_ICON.RECOVERY,
    pill: MODE_PILL.RECOVERY,
    message: '오늘은 HP를 천천히 채워봐요.',
    hex: '#8B76C9',
    soft: '#EFE9FB',
    band: '#F8F5FD',
  },
  EASY: {
    key: 'EASY',
    label: 'EASY',
    icon: MODE_ICON.EASY,
    pill: MODE_PILL.EASY,
    message: '천천히 움직여도 충분한 하루!',
    hex: '#7DB994',
    soft: '#E6F4EA',
    band: '#F3FAF5',
  },
  NORMAL: {
    key: 'NORMAL',
    label: 'NORMAL',
    icon: MODE_ICON.NORMAL,
    pill: MODE_PILL.NORMAL,
    message: '평범하지만 좋은 모험의 날.',
    hex: '#6FA8CE',
    soft: '#E5F1FA',
    band: '#F2F8FC',
  },
  POWER: {
    key: 'POWER',
    label: 'POWER',
    icon: MODE_ICON.POWER,
    pill: MODE_PILL.POWER,
    message: '에너지가 가득 찼어요!',
    hex: '#E79A66',
    soft: '#FDEBDC',
    band: '#FDF6EA',
  },
}

export const modeMeta = (mode: EnergyMode) => MODE_META[mode]
export const modeOf = (score: number) => MODE_META[scoreToMode(score)]

/** 점수가 없는 날(아직 안 적은 날)도 안전하게 다루기 위한 헬퍼 */
export const modeMetaOrNull = (mode: EnergyMode | null | undefined) =>
  mode ? MODE_META[mode] : null
