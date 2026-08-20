/**
 * 캐릭터가 사는 방의 배치표.
 *
 * 좌표는 방 박스를 100x100 으로 본 비율이다 (x = 왼쪽에서, bottom = 아래에서).
 * 레이어 순서: wall → furniture → props → character → pet → effects
 * 물건을 더 놓거나 컨디션에 따라 방을 바꾸고 싶으면 이 파일만 고치면 된다.
 */
import type { EnergyMode } from '@/types'
import { effects, fashion, furniture, gear, pets, type PixelAsset } from './pixelAssets'

export type RoomLayer = 'wall' | 'furniture' | 'props'

export interface RoomItem {
  key: string
  asset: PixelAsset
  x: number
  bottom: number
  /** 방 너비 대비 % */
  width: number
  layer: RoomLayer
  /** 살짝 흔들리는 장식에만 */
  sway?: boolean
}

/** 벽/바닥 경계선 (방 높이 기준 %) */
export const FLOOR_LINE = 46

export const ROOM_ITEMS: RoomItem[] = [
  // ── 벽: 창문(왼쪽 기준점) → 액자 무리(가운데, 아랫변을 맞춤) → 행잉플랜트(오른쪽)
  { key: 'lights', asset: effects.stringLights, x: 2, bottom: 86, width: 22, layer: 'wall' },
  { key: 'lights-r', asset: effects.stringLights, x: 74, bottom: 86, width: 22, layer: 'wall' },
  { key: 'window', asset: furniture.windowDay, x: 4, bottom: 52, width: 25, layer: 'wall' },
  { key: 'clock', asset: furniture.clock, x: 33, bottom: 76, width: 7, layer: 'wall' },
  { key: 'poster', asset: furniture.posterSky, x: 33, bottom: 58, width: 9, layer: 'wall' },
  { key: 'frames', asset: furniture.photoFrames, x: 45, bottom: 58, width: 12, layer: 'wall' },
  { key: 'pinboard', asset: furniture.pinboard, x: 60, bottom: 58, width: 15, layer: 'wall' },
  { key: 'hanging', asset: furniture.hangingPlant, x: 87, bottom: 60, width: 11, layer: 'wall', sway: true },

  // ── 뒷줄: 바닥에 닿는 선(bottom 20)을 모두 맞춰 한 줄로 세운다
  { key: 'rack', asset: furniture.clothingRack, x: 0, bottom: 20, width: 20, layer: 'furniture' },
  { key: 'mirror', asset: furniture.mirror, x: 21, bottom: 20, width: 9, layer: 'furniture' },
  { key: 'shelf', asset: furniture.bookshelf, x: 32, bottom: 20, width: 10, layer: 'furniture' },
  { key: 'plant', asset: furniture.plant, x: 44, bottom: 20, width: 7, layer: 'furniture' },
  { key: 'desk', asset: furniture.desk, x: 53, bottom: 20, width: 28, layer: 'furniture' },
  { key: 'basket', asset: furniture.laundryBasket, x: 88, bottom: 20, width: 9, layer: 'furniture' },

  // ── 앞줄: 왼쪽 빈백 / 가운데 러그 / 오른쪽 침대
  { key: 'beanbag', asset: furniture.beanbag, x: 1, bottom: 4, width: 17, layer: 'furniture' },
  { key: 'rug', asset: furniture.rug, x: 13, bottom: 1, width: 31, layer: 'furniture' },
  { key: 'bed', asset: furniture.bed, x: 63, bottom: 2, width: 34, layer: 'furniture' },

  // ── 소품은 둘만. 러그 오른쪽 가장자리에 나란히 둔다
  { key: 'tote', asset: fashion.toteClimb, x: 9, bottom: 27, width: 7, layer: 'props' },
  { key: 'climbing', asset: gear.climbingShoes, x: 46, bottom: 3, width: 11, layer: 'props' },
]

export interface Placement {
  x: number
  bottom: number
  width: number
  /** 캐릭터 스프라이트에 이미 포함된 가구는 겹치지 않게 숨긴다 */
  hides: string[]
  /** idle 움직임 */
  motion: 'breathe' | 'floaty' | 'hop'
}

export const CHARACTER_PLACEMENT: Record<EnergyMode, Placement> = {
  RECOVERY: { x: 0, bottom: 2, width: 31, hides: ['beanbag'], motion: 'breathe' },
  EASY: { x: 1, bottom: 3, width: 26, hides: ['beanbag'], motion: 'floaty' },
  NORMAL: { x: 52, bottom: 9, width: 29, hides: ['desk'], motion: 'breathe' },
  POWER: { x: 21, bottom: 3, width: 21, hides: [], motion: 'hop' },
}

export interface PetPlacement {
  asset: PixelAsset
  x: number
  bottom: number
  width: number
}

export const PET_PLACEMENT: Record<EnergyMode, PetPlacement> = {
  RECOVERY: { asset: pets.catBox, x: 33, bottom: 2, width: 12 },
  EASY: { asset: pets.catLying, x: 29, bottom: 2, width: 13 },
  NORMAL: { asset: pets.catCurl, x: 24, bottom: 2, width: 12 },
  POWER: { asset: pets.catWalk, x: 3, bottom: 2, width: 12 },
}

export interface RoomEffect {
  key: string
  asset: PixelAsset
  x: number
  bottom: number
  width: number
  animation: string
  delay?: number
}

export const MODE_EFFECTS: Record<EnergyMode, RoomEffect[]> = {
  RECOVERY: [
    { key: 'zzz', asset: effects.zzzBubble, x: 16, bottom: 27, width: 12, animation: 'animate-zzzrise' },
  ],
  EASY: [
    { key: 'heart', asset: effects.heartBubble, x: 22, bottom: 33, width: 12, animation: 'animate-floaty' },
  ],
  NORMAL: [
    { key: 'sparkle', asset: effects.sparkle01, x: 70, bottom: 34, width: 5, animation: 'animate-twinkle' },
  ],
  POWER: [
    { key: 'sp1', asset: effects.sparkle01, x: 22, bottom: 32, width: 6, animation: 'animate-twinkle' },
    { key: 'sp2', asset: effects.sparkle02, x: 46, bottom: 24, width: 5, animation: 'animate-twinkle', delay: 700 },
    { key: 'sp3', asset: effects.sparkle01, x: 33, bottom: 40, width: 5, animation: 'animate-twinkle', delay: 1300 },
  ],
}
