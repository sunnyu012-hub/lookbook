/** 라이프 이벤트 카테고리 — 아이콘과 색을 한 곳에 모아 둔다. */
import type { LifeCategory } from '@/types'
import type { PixelAsset } from './pixelAssets'
import { effects as fx, gear, icons } from './pixelAssets'

export interface CategoryMeta {
  label: string
  icon: PixelAsset
  tint: string
}

export const CATEGORY_META: Record<LifeCategory, CategoryMeta> = {
  note: { label: '메모', icon: icons.log, tint: 'rgba(107, 74, 61, 0.06)' },
  love: { label: '사랑', icon: fx.heart, tint: '#FDEFF3' },
  health: { label: '건강', icon: icons.body, tint: '#F1F8F3' },
  work: { label: '일', icon: icons.work, tint: '#EFF4FB' },
  play: { label: '노는 날', icon: gear.sneakers, tint: '#FDF6EA' },
  travel: { label: '여행', icon: fx.rainbow, tint: '#F5F2FC' },
  milestone: { label: '기념일', icon: fx.sparkle01, tint: '#FDF0E4' },
}

export const CATEGORY_ORDER: LifeCategory[] = [
  'note',
  'love',
  'health',
  'work',
  'play',
  'travel',
  'milestone',
]
