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
  // ── 벽 (뒤쪽)
  { key: 'lights-l', asset: effects.stringLights, x: 0, bottom: 88, width: 25, layer: 'wall' },
  { key: 'lights-r', asset: effects.stringLights, x: 70, bottom: 88, width: 25, layer: 'wall' },
  { key: 'window', asset: furniture.windowDay, x: 4, bottom: 52, width: 24, layer: 'wall' },
  { key: 'clock', asset: furniture.clock, x: 31, bottom: 79, width: 7, layer: 'wall' },
  { key: 'poster', asset: furniture.posterSky, x: 30, bottom: 58, width: 9, layer: 'wall' },
  { key: 'frames', asset: furniture.photoFrames, x: 41, bottom: 60, width: 12, layer: 'wall' },
  { key: 'pinboard', asset: furniture.pinboard, x: 56, bottom: 58, width: 15, layer: 'wall' },
  { key: 'hanging', asset: furniture.hangingPlant, x: 86, bottom: 58, width: 12, layer: 'wall', sway: true },

  // ── 뒷줄 가구 (캐릭터 뒤)
  { key: 'rack', asset: furniture.clothingRack, x: 0, bottom: 24, width: 20, layer: 'furniture' },
  { key: 'mirror', asset: furniture.mirror, x: 18, bottom: 22, width: 10, layer: 'furniture' },
  { key: 'shelf', asset: furniture.bookshelf, x: 28, bottom: 22, width: 10, layer: 'furniture' },
  { key: 'lamp', asset: furniture.lamp, x: 37, bottom: 22, width: 7, layer: 'furniture' },
  { key: 'desk', asset: furniture.desk, x: 44, bottom: 18, width: 27, layer: 'furniture' },
  { key: 'plant', asset: furniture.plant, x: 72, bottom: 20, width: 8, layer: 'furniture' },
  { key: 'basket', asset: furniture.laundryBasket, x: 86, bottom: 17, width: 10, layer: 'furniture' },

  // ── 앞줄 (캐릭터가 서는 바닥)
  { key: 'rug', asset: furniture.rug, x: 10, bottom: 0, width: 33, layer: 'furniture' },
  { key: 'bed', asset: furniture.bed, x: 64, bottom: 2, width: 34, layer: 'furniture' },
  { key: 'beanbag', asset: furniture.beanbag, x: 1, bottom: 5, width: 18, layer: 'furniture' },

  // ── 생활 소품 (취미가 보이는 물건들)
  { key: 'climbing', asset: gear.climbingShoes, x: 47, bottom: 2, width: 11, layer: 'props' },
  { key: 'sneakers', asset: gear.sneakers, x: 57, bottom: 1, width: 9, layer: 'props' },
  { key: 'tote', asset: fashion.toteClimb, x: 21, bottom: 15, width: 8, layer: 'props' },
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
  RECOVERY: { x: 1, bottom: 2, width: 32, hides: ['beanbag'], motion: 'breathe' },
  EASY: { x: 3, bottom: 3, width: 27, hides: ['beanbag'], motion: 'floaty' },
  NORMAL: { x: 45, bottom: 8, width: 28, hides: ['desk'], motion: 'breathe' },
  POWER: { x: 24, bottom: 3, width: 21, hides: [], motion: 'hop' },
}

export interface PetPlacement {
  asset: PixelAsset
  x: number
  bottom: number
  width: number
}

export const PET_PLACEMENT: Record<EnergyMode, PetPlacement> = {
  RECOVERY: { asset: pets.catBox, x: 35, bottom: 2, width: 13 },
  EASY: { asset: pets.catLying, x: 31, bottom: 2, width: 13 },
  NORMAL: { asset: pets.catCurl, x: 20, bottom: 2, width: 13 },
  POWER: { asset: pets.catWalk, x: 11, bottom: 2, width: 12 },
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
