// 이 파일은 scripts/process-pixel-assets.py 가 생성한다. 직접 고치지 말 것.
// 에셋 원본: assets-source/asset-sheet-v3.png (없는 것만 asset-sheet.png)

export interface PixelAsset {
  src: string
  width: number
  height: number
}

export const characters = {
  backBag: { src: '/assets/pixel/characters/back-bag.png', width: 94, height: 194 },
  backCoat: { src: '/assets/pixel/characters/back-coat.png', width: 94, height: 213 },
  easy: { src: '/assets/pixel/characters/easy.png', width: 109, height: 202 },
  idle: { src: '/assets/pixel/characters/idle.png', width: 130, height: 185 },
  normal: { src: '/assets/pixel/characters/normal.png', width: 148, height: 180 },
  power: { src: '/assets/pixel/characters/power.png', width: 127, height: 199 },
  recovery: { src: '/assets/pixel/characters/recovery.png', width: 144, height: 178 },
} as const satisfies Record<string, PixelAsset>

export const effects = {
  cloud: { src: '/assets/pixel/effects/cloud.png', width: 59, height: 39 },
  flower: { src: '/assets/pixel/effects/flower.png', width: 61, height: 65 },
  heart: { src: '/assets/pixel/effects/heart.png', width: 35, height: 31 },
  heartBubble: { src: '/assets/pixel/effects/heart-bubble.png', width: 61, height: 57 },
  rainbow: { src: '/assets/pixel/effects/rainbow.png', width: 77, height: 36 },
  sparkle01: { src: '/assets/pixel/effects/sparkle-01.png', width: 32, height: 33 },
  sparkle02: { src: '/assets/pixel/effects/sparkle-02.png', width: 33, height: 36 },
  stringLights: { src: '/assets/pixel/effects/string-lights.png', width: 67, height: 34 },
  zzzBubble: { src: '/assets/pixel/effects/zzz-bubble.png', width: 59, height: 58 },
} as const satisfies Record<string, PixelAsset>

export const fashion = {
  backpack: { src: '/assets/pixel/fashion/backpack.png', width: 116, height: 135 },
  bagBlack: { src: '/assets/pixel/fashion/bag-black.png', width: 99, height: 126 },
  cap: { src: '/assets/pixel/fashion/cap.png', width: 100, height: 69 },
  jeans: { src: '/assets/pixel/fashion/jeans.png', width: 93, height: 153 },
  shortsBlack: { src: '/assets/pixel/fashion/shorts-black.png', width: 114, height: 95 },
  shortsDenim: { src: '/assets/pixel/fashion/shorts-denim.png', width: 99, height: 80 },
  toteClimb: { src: '/assets/pixel/fashion/tote-climb.png', width: 94, height: 154 },
  toteMake: { src: '/assets/pixel/fashion/tote-make.png', width: 62, height: 89 },
  tshirtBow: { src: '/assets/pixel/fashion/tshirt-bow.png', width: 83, height: 101 },
  tshirtPink: { src: '/assets/pixel/fashion/tshirt-pink.png', width: 103, height: 90 },
} as const satisfies Record<string, PixelAsset>

export const furniture = {
  beanbag: { src: '/assets/pixel/furniture/beanbag.png', width: 160, height: 136 },
  bed: { src: '/assets/pixel/furniture/bed.png', width: 147, height: 120 },
  bookshelf: { src: '/assets/pixel/furniture/bookshelf.png', width: 54, height: 92 },
  clock: { src: '/assets/pixel/furniture/clock.png', width: 73, height: 75 },
  clothingRack: { src: '/assets/pixel/furniture/clothing-rack.png', width: 89, height: 108 },
  desk: { src: '/assets/pixel/furniture/desk.png', width: 142, height: 68 },
  hangingPlant: { src: '/assets/pixel/furniture/hanging-plant.png', width: 86, height: 230 },
  lamp: { src: '/assets/pixel/furniture/lamp.png', width: 73, height: 122 },
  laundryBasket: { src: '/assets/pixel/furniture/laundry-basket.png', width: 69, height: 82 },
  mirror: { src: '/assets/pixel/furniture/mirror.png', width: 97, height: 263 },
  nightstand: { src: '/assets/pixel/furniture/nightstand.png', width: 46, height: 63 },
  photoFrames: { src: '/assets/pixel/furniture/photo-frames.png', width: 163, height: 82 },
  pinboard: { src: '/assets/pixel/furniture/pinboard.png', width: 98, height: 144 },
  plant: { src: '/assets/pixel/furniture/plant.png', width: 64, height: 94 },
  posterPink: { src: '/assets/pixel/furniture/poster-pink.png', width: 65, height: 91 },
  posterSky: { src: '/assets/pixel/furniture/poster-sky.png', width: 75, height: 104 },
  rug: { src: '/assets/pixel/furniture/rug.png', width: 96, height: 67 },
  windowDay: { src: '/assets/pixel/furniture/window-day.png', width: 95, height: 74 },
  windowMorning: { src: '/assets/pixel/furniture/window-morning.png', width: 93, height: 74 },
  windowNight: { src: '/assets/pixel/furniture/window-night.png', width: 98, height: 73 },
  windowSunset: { src: '/assets/pixel/furniture/window-sunset.png', width: 94, height: 73 },
} as const satisfies Record<string, PixelAsset>

export const gear = {
  climbingShoes: { src: '/assets/pixel/gear/climbing-shoes.png', width: 115, height: 94 },
  dumbbell: { src: '/assets/pixel/gear/dumbbell.png', width: 42, height: 153 },
  headphones: { src: '/assets/pixel/gear/headphones.png', width: 95, height: 84 },
  sneakers: { src: '/assets/pixel/gear/sneakers.png', width: 113, height: 72 },
  yogaMat: { src: '/assets/pixel/gear/yoga-mat.png', width: 124, height: 74 },
} as const satisfies Record<string, PixelAsset>

export const icons = {
  appetite: { src: '/assets/pixel/icons/appetite.png', width: 60, height: 72 },
  body: { src: '/assets/pixel/icons/body.png', width: 38, height: 38 },
  caffeine: { src: '/assets/pixel/icons/caffeine.png', width: 66, height: 75 },
  camera: { src: '/assets/pixel/icons/camera.png', width: 53, height: 44 },
  clean: { src: '/assets/pixel/icons/clean.png', width: 171, height: 83 },
  climbing: { src: '/assets/pixel/icons/climbing.png', width: 77, height: 85 },
  energy: { src: '/assets/pixel/icons/energy.png', width: 27, height: 33 },
  exercise: { src: '/assets/pixel/icons/exercise.png', width: 113, height: 72 },
  fatigue: { src: '/assets/pixel/icons/fatigue.png', width: 92, height: 72 },
  focus: { src: '/assets/pixel/icons/focus.png', width: 116, height: 88 },
  food: { src: '/assets/pixel/icons/food.png', width: 79, height: 73 },
  home: { src: '/assets/pixel/icons/home.png', width: 42, height: 39 },
  log: { src: '/assets/pixel/icons/log.png', width: 125, height: 71 },
  mood: { src: '/assets/pixel/icons/mood.png', width: 35, height: 31 },
  music: { src: '/assets/pixel/icons/music.png', width: 30, height: 30 },
  outfit: { src: '/assets/pixel/icons/outfit.png', width: 103, height: 90 },
  save: { src: '/assets/pixel/icons/save.png', width: 37, height: 37 },
  shower: { src: '/assets/pixel/icons/shower.png', width: 59, height: 57 },
  sleep: { src: '/assets/pixel/icons/sleep.png', width: 36, height: 35 },
  water: { src: '/assets/pixel/icons/water.png', width: 43, height: 92 },
  work: { src: '/assets/pixel/icons/work.png', width: 127, height: 91 },
  xp: { src: '/assets/pixel/icons/xp.png', width: 46, height: 43 },
} as const satisfies Record<string, PixelAsset>

export const items = {
  apple: { src: '/assets/pixel/items/apple.png', width: 63, height: 66 },
  banana: { src: '/assets/pixel/items/banana.png', width: 62, height: 69 },
  chocolate: { src: '/assets/pixel/items/chocolate.png', width: 40, height: 48 },
  coffeeMug: { src: '/assets/pixel/items/coffee-mug.png', width: 70, height: 82 },
  croissant: { src: '/assets/pixel/items/croissant.png', width: 54, height: 42 },
  fruitBowl: { src: '/assets/pixel/items/fruit-bowl.png', width: 79, height: 73 },
  icedCoffee: { src: '/assets/pixel/items/iced-coffee.png', width: 47, height: 99 },
  milk: { src: '/assets/pixel/items/milk.png', width: 43, height: 101 },
  onigiri: { src: '/assets/pixel/items/onigiri.png', width: 60, height: 72 },
  peach: { src: '/assets/pixel/items/peach.png', width: 42, height: 39 },
  sandwich: { src: '/assets/pixel/items/sandwich.png', width: 54, height: 56 },
  smoothie: { src: '/assets/pixel/items/smoothie.png', width: 47, height: 99 },
  toast: { src: '/assets/pixel/items/toast.png', width: 40, height: 38 },
  waterBottle: { src: '/assets/pixel/items/water-bottle.png', width: 43, height: 92 },
} as const satisfies Record<string, PixelAsset>

export const pets = {
  catBox: { src: '/assets/pixel/pets/cat-box.png', width: 126, height: 112 },
  catCurl: { src: '/assets/pixel/pets/cat-curl.png', width: 106, height: 96 },
  catLying: { src: '/assets/pixel/pets/cat-lying.png', width: 134, height: 109 },
  catSit: { src: '/assets/pixel/pets/cat-sit.png', width: 70, height: 106 },
  catStand: { src: '/assets/pixel/pets/cat-stand.png', width: 137, height: 87 },
  catWalk: { src: '/assets/pixel/pets/cat-walk.png', width: 102, height: 112 },
  catWhite: { src: '/assets/pixel/pets/cat-white.png', width: 116, height: 116 },
} as const satisfies Record<string, PixelAsset>

export const ui = {
  logo: { src: '/assets/pixel/ui/logo.png', width: 435, height: 82 },
  mascot: { src: '/assets/pixel/ui/mascot.png', width: 57, height: 70 },
  pillEasy: { src: '/assets/pixel/ui/pill-easy.png', width: 160, height: 45 },
  pillIdle: { src: '/assets/pixel/ui/pill-idle.png', width: 112, height: 26 },
  pillNormal: { src: '/assets/pixel/ui/pill-normal.png', width: 160, height: 46 },
  pillPower: { src: '/assets/pixel/ui/pill-power.png', width: 160, height: 45 },
  pillRecovery: { src: '/assets/pixel/ui/pill-recovery.png', width: 160, height: 45 },
  saveButton: { src: '/assets/pixel/ui/save-button.png', width: 111, height: 76 },
} as const satisfies Record<string, PixelAsset>

export const pixelAssets = {
  characters,
  effects,
  fashion,
  furniture,
  gear,
  icons,
  items,
  pets,
  ui,
} as const

export type CharactersName = keyof typeof characters
export type EffectsName = keyof typeof effects
export type FashionName = keyof typeof fashion
export type FurnitureName = keyof typeof furniture
export type GearName = keyof typeof gear
export type IconsName = keyof typeof icons
export type ItemsName = keyof typeof items
export type PetsName = keyof typeof pets
export type UiName = keyof typeof ui
