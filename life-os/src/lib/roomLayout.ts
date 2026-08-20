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
  /** 바닥에 놓인 물건에는 그림자를 깔아 스티커처럼 뜨지 않게 한다 */
  grounded?: boolean
}

/** 방의 가로:세로 — 파노라마에 가깝게 잡아야 한 화면에서 방이 넓어 보인다 */
export const ROOM_ASPECT = '16 / 11'

/** 벽/바닥 경계선 (방 높이 기준 %) */
export const FLOOR_LINE = 44

export const ROOM_ITEMS: RoomItem[] = [
  // ── 벽: 왼쪽 클라이밍 홀드보드 · 가운데 창문 · 오른쪽 액자와 화분
  { key: 'lights', asset: effects.stringLights, x: 6, bottom: 88, width: 20, layer: 'wall' },
  { key: 'lights-r', asset: effects.stringLights, x: 62, bottom: 90, width: 20, layer: 'wall' },
  { key: 'holds', asset: furniture.pinboard, x: 2, bottom: 58, width: 17, layer: 'wall' },
  { key: 'poster', asset: furniture.posterSky, x: 22, bottom: 55, width: 10, layer: 'wall' },
  { key: 'window', asset: furniture.windowDay, x: 35, bottom: 50, width: 26, layer: 'wall' },
  { key: 'clock', asset: furniture.clock, x: 64, bottom: 72, width: 7, layer: 'wall' },
  { key: 'frames', asset: furniture.photoFrames, x: 71, bottom: 55, width: 12, layer: 'wall' },
  { key: 'hanging', asset: furniture.hangingPlant, x: 86, bottom: 58, width: 11, layer: 'wall', sway: true },

  // ── 뒷줄 가구: 바닥선을 하나로 맞춘다
  { key: 'rack', asset: furniture.clothingRack, x: 0, bottom: 22, width: 17, layer: 'furniture', grounded: true },
  { key: 'mirror', asset: furniture.mirror, x: 18, bottom: 22, width: 8, layer: 'furniture', grounded: true },
  { key: 'shelf', asset: furniture.bookshelf, x: 60, bottom: 21, width: 10, layer: 'furniture', grounded: true },

  // ── 앞줄: 왼쪽 빈백 · 가운데 러그 · 오른쪽 침대와 낮은 책상
  { key: 'beanbag', asset: furniture.beanbag, x: 4, bottom: 6, width: 14, layer: 'furniture', grounded: true },
  { key: 'rug', asset: furniture.rug, x: 20, bottom: 2, width: 26, layer: 'furniture' },
  { key: 'bed', asset: furniture.bed, x: 69, bottom: 4, width: 27, layer: 'furniture', grounded: true },
  { key: 'desk', asset: furniture.desk, x: 48, bottom: 3, width: 24, layer: 'furniture', grounded: true },
  { key: 'basket', asset: furniture.laundryBasket, x: 90, bottom: 2, width: 8, layer: 'furniture', grounded: true },

  // ── 취미가 보이는 소품
  { key: 'tote', asset: fashion.toteClimb, x: 11, bottom: 26, width: 6, layer: 'props' },
  { key: 'climbing', asset: gear.climbingShoes, x: 13, bottom: 3, width: 9, layer: 'props', grounded: true },
  { key: 'backpack', asset: fashion.backpack, x: 2, bottom: 4, width: 8, layer: 'props', grounded: true },
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
  // 캐릭터가 가장 먼저 보이도록 가운데(러그 위)에 크게 세운다
  RECOVERY: { x: 16, bottom: 3, width: 32, hides: ['rug'], motion: 'breathe' },
  EASY: { x: 20, bottom: 4, width: 27, hides: [], motion: 'floaty' },
  NORMAL: { x: 44, bottom: 4, width: 29, hides: ['desk'], motion: 'breathe' },
  POWER: { x: 25, bottom: 5, width: 23, hides: [], motion: 'hop' },
}

export interface PetPlacement {
  asset: PixelAsset
  x: number
  bottom: number
  width: number
}

export const PET_PLACEMENT: Record<EnergyMode, PetPlacement> = {
  RECOVERY: { asset: pets.catCurl, x: 62, bottom: 5, width: 10 },
  EASY: { asset: pets.catLying, x: 33, bottom: 2, width: 12 },
  NORMAL: { asset: pets.catCurl, x: 26, bottom: 3, width: 11 },
  POWER: { asset: pets.catWalk, x: 62, bottom: 5, width: 10 },
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
    { key: 'zzz', asset: effects.zzzBubble, x: 34, bottom: 26, width: 11, animation: 'animate-zzzrise' },
  ],
  EASY: [
    { key: 'heart', asset: effects.heartBubble, x: 41, bottom: 30, width: 11, animation: 'animate-floaty' },
  ],
  NORMAL: [
    { key: 'sparkle', asset: effects.sparkle01, x: 40, bottom: 32, width: 4, animation: 'animate-twinkle' },
  ],
  POWER: [
    { key: 'sp1', asset: effects.sparkle01, x: 23, bottom: 30, width: 5, animation: 'animate-twinkle' },
    { key: 'sp2', asset: effects.sparkle02, x: 46, bottom: 24, width: 4, animation: 'animate-twinkle', delay: 700 },
    { key: 'sp3', asset: effects.sparkle01, x: 35, bottom: 38, width: 4, animation: 'animate-twinkle', delay: 1300 },
  ],
}
