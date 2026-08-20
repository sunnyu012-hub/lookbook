/** 퀘스트 카테고리 — 아이콘은 전부 픽셀 에셋을 쓴다 (시스템 이모지 금지). */
import { effects as fx, gear, icons, items, pets } from '../pixelAssets'
import type { CategoryMeta, QuestCategory } from './types'

export const CATEGORIES: CategoryMeta[] = [
  { key: 'care', label: 'Care', ko: '나 돌보기', icon: icons.water, tint: '#E5F1FA', accent: '#6FA8CE' },
  { key: 'food', label: 'Food', ko: '먹기', icon: icons.food, tint: '#FDEBDC', accent: '#E79A66' },
  { key: 'home', label: 'Home', ko: '집', icon: icons.clean, tint: '#F3EAE0', accent: '#9C7767' },
  { key: 'mind', label: 'Mind', ko: '마음', icon: icons.mood, tint: '#FDE7EC', accent: '#DE7E92' },
  { key: 'work', label: 'Work', ko: '일', icon: icons.work, tint: '#EFF1FB', accent: '#7B7FC0' },
  { key: 'style', label: 'Style', ko: '스타일', icon: icons.outfit, tint: '#FDEFF3', accent: '#DE7E92' },
  { key: 'love', label: 'Love', ko: '사랑', icon: fx.heart, tint: '#FDEFF3', accent: '#DE7E92' },
  { key: 'social', label: 'Social', ko: '사람', icon: icons.camera, tint: '#F5F2FC', accent: '#8B76C9' },
  { key: 'fun', label: 'Fun', ko: '재미', icon: icons.music, tint: '#FDF4D6', accent: '#DFB63F' },
  { key: 'growth', label: 'Growth', ko: '배우기', icon: icons.log, tint: '#E6F4EA', accent: '#7DB994' },
  { key: 'move', label: 'Move', ko: '움직이기', icon: gear.sneakers, tint: '#E6F4EA', accent: '#7DB994' },
  { key: 'climbing', label: 'Climbing', ko: '클라이밍', icon: icons.climbing, tint: '#EFF4FB', accent: '#6FA8CE' },
  { key: 'recovery', label: 'Recovery', ko: '쉬기', icon: icons.sleep, tint: '#EFE9FB', accent: '#8B76C9' },
  { key: 'life', label: 'Life', ko: '생활', icon: icons.home, tint: '#FDF6EA', accent: '#DFB63F' },
  { key: 'memory', label: 'Memory', ko: '기억', icon: fx.sparkle01, tint: '#FDF0E4', accent: '#E79A66' },
  { key: 'cozy', label: 'Cozy', ko: '포근하게', icon: pets.catCurl, tint: '#F3EAE0', accent: '#9C7767' },
]

export const CATEGORY_META: Record<QuestCategory, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
) as Record<QuestCategory, CategoryMeta>

/** 난이도 배지에 쓰는 작은 아이콘 */
export const DIFFICULTY_ICON = {
  tiny: fx.sparkle02,
  easy: fx.sparkle01,
  normal: icons.energy,
  big: icons.xp,
} as const

export const CUSTOM_ICON = items.coffeeMug
