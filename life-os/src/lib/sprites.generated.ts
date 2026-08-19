// 이 파일은 tools/pixel_art.py 가 생성한다. 직접 고치지 말 것.
export const ICON_SHEET = '/sprites/icons.png'
export const ICON_COLS = 8
export const ICON_ROWS = 5

export const ICON_NAMES = [
  'heart',
  'heart_off',
  'gem',
  'gem_off',
  'star',
  'star_off',
  'moon',
  'sprout',
  'sun',
  'bolt',
  'bed',
  'coffee',
  'food',
  'drop',
  'shoe',
  'dumbbell',
  'sparkle',
  'cloud',
  'flower',
  'zzz',
  'home',
  'floppy',
  'book',
  'check',
  'face_great',
  'face_good',
  'face_ok',
  'face_tired',
  'face_gone',
  'rain',
  'partly',
  'sun_bright',
  'food_off',
] as const

export type IconName = (typeof ICON_NAMES)[number]

export const CHARACTER_SHEET = '/sprites/character.png'
export const CHARACTER_SIZE = 32
export const CHARACTER_FRAMES = 2
export const CHARACTER_STATES = ['recovery', 'easy', 'normal', 'power'] as const

export const ROOM_SHEET = '/sprites/room.png'
export const ROOM_SIZE = { width: 160, height: 112 }
