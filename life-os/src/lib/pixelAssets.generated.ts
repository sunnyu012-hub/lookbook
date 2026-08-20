// 이 파일은 scripts/process-pixel-assets.py 가 생성한다. 직접 고치지 말 것.
// 에셋 원본: assets-source/asset-sheet-v3.png (없는 것만 asset-sheet.png)

export interface PixelAsset {
  src: string
  width: number
  height: number
}

export const characters = {
  backBag: { src: '/assets/pixel/characters/back-bag.png', width: 104, height: 203 },
  backCoat: { src: '/assets/pixel/characters/back-coat.png', width: 96, height: 177 },
  easy: { src: '/assets/pixel/characters/easy.png', width: 96, height: 188 },
  idle: { src: '/assets/pixel/characters/idle.png', width: 105, height: 188 },
  normal: { src: '/assets/pixel/characters/normal.png', width: 121, height: 127 },
  power: { src: '/assets/pixel/characters/power.png', width: 145, height: 151 },
  recovery: { src: '/assets/pixel/characters/recovery.png', width: 147, height: 102 },
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
  backpack: { src: '/assets/pixel/fashion/backpack.png', width: 91, height: 100 },
  bagBlack: { src: '/assets/pixel/fashion/bag-black.png', width: 80, height: 100 },
  cap: { src: '/assets/pixel/fashion/cap.png', width: 74, height: 51 },
  jeans: { src: '/assets/pixel/fashion/jeans.png', width: 75, height: 130 },
  shortsBlack: { src: '/assets/pixel/fashion/shorts-black.png', width: 86, height: 59 },
  shortsDenim: { src: '/assets/pixel/fashion/shorts-denim.png', width: 85, height: 59 },
  toteClimb: { src: '/assets/pixel/fashion/tote-climb.png', width: 62, height: 89 },
  toteMake: { src: '/assets/pixel/fashion/tote-make.png', width: 62, height: 89 },
  tshirtBow: { src: '/assets/pixel/fashion/tshirt-bow.png', width: 70, height: 83 },
  tshirtPink: { src: '/assets/pixel/fashion/tshirt-pink.png', width: 80, height: 84 },
} as const satisfies Record<string, PixelAsset>

export const furniture = {
  beanbag: { src: '/assets/pixel/furniture/beanbag.png', width: 82, height: 77 },
  bed: { src: '/assets/pixel/furniture/bed.png', width: 147, height: 120 },
  bookshelf: { src: '/assets/pixel/furniture/bookshelf.png', width: 54, height: 92 },
  clock: { src: '/assets/pixel/furniture/clock.png', width: 61, height: 60 },
  clothingRack: { src: '/assets/pixel/furniture/clothing-rack.png', width: 89, height: 108 },
  desk: { src: '/assets/pixel/furniture/desk.png', width: 196, height: 107 },
  hangingPlant: { src: '/assets/pixel/furniture/hanging-plant.png', width: 79, height: 197 },
  lamp: { src: '/assets/pixel/furniture/lamp.png', width: 36, height: 70 },
  laundryBasket: { src: '/assets/pixel/furniture/laundry-basket.png', width: 69, height: 82 },
  mirror: { src: '/assets/pixel/furniture/mirror.png', width: 56, height: 101 },
  nightstand: { src: '/assets/pixel/furniture/nightstand.png', width: 46, height: 63 },
  photoFrames: { src: '/assets/pixel/furniture/photo-frames.png', width: 118, height: 68 },
  pinboard: { src: '/assets/pixel/furniture/pinboard.png', width: 101, height: 78 },
  plant: { src: '/assets/pixel/furniture/plant.png', width: 99, height: 133 },
  posterPink: { src: '/assets/pixel/furniture/poster-pink.png', width: 86, height: 113 },
  posterSky: { src: '/assets/pixel/furniture/poster-sky.png', width: 64, height: 71 },
  rug: { src: '/assets/pixel/furniture/rug.png', width: 96, height: 67 },
  windowDay: { src: '/assets/pixel/furniture/window-day.png', width: 95, height: 74 },
  windowMorning: { src: '/assets/pixel/furniture/window-morning.png', width: 93, height: 74 },
  windowNight: { src: '/assets/pixel/furniture/window-night.png', width: 98, height: 73 },
  windowSunset: { src: '/assets/pixel/furniture/window-sunset.png', width: 94, height: 73 },
} as const satisfies Record<string, PixelAsset>

export const gear = {
  climbingShoes: { src: '/assets/pixel/gear/climbing-shoes.png', width: 96, height: 74 },
  dumbbell: { src: '/assets/pixel/gear/dumbbell.png', width: 48, height: 41 },
  headphones: { src: '/assets/pixel/gear/headphones.png', width: 106, height: 81 },
  sneakers: { src: '/assets/pixel/gear/sneakers.png', width: 92, height: 53 },
  yogaMat: { src: '/assets/pixel/gear/yoga-mat.png', width: 108, height: 81 },
} as const satisfies Record<string, PixelAsset>

export const icons = {
  appetite: { src: '/assets/pixel/icons/appetite.png', width: 40, height: 38 },
  body: { src: '/assets/pixel/icons/body.png', width: 38, height: 38 },
  caffeine: { src: '/assets/pixel/icons/caffeine.png', width: 62, height: 61 },
  camera: { src: '/assets/pixel/icons/camera.png', width: 53, height: 44 },
  clean: { src: '/assets/pixel/icons/clean.png', width: 36, height: 55 },
  climbing: { src: '/assets/pixel/icons/climbing.png', width: 67, height: 69 },
  energy: { src: '/assets/pixel/icons/energy.png', width: 27, height: 33 },
  exercise: { src: '/assets/pixel/icons/exercise.png', width: 92, height: 53 },
  fatigue: { src: '/assets/pixel/icons/fatigue.png', width: 58, height: 47 },
  focus: { src: '/assets/pixel/icons/focus.png', width: 39, height: 37 },
  food: { src: '/assets/pixel/icons/food.png', width: 69, height: 56 },
  home: { src: '/assets/pixel/icons/home.png', width: 42, height: 39 },
  log: { src: '/assets/pixel/icons/log.png', width: 95, height: 50 },
  mood: { src: '/assets/pixel/icons/mood.png', width: 35, height: 31 },
  music: { src: '/assets/pixel/icons/music.png', width: 30, height: 30 },
  outfit: { src: '/assets/pixel/icons/outfit.png', width: 70, height: 83 },
  save: { src: '/assets/pixel/icons/save.png', width: 37, height: 37 },
  shower: { src: '/assets/pixel/icons/shower.png', width: 59, height: 57 },
  sleep: { src: '/assets/pixel/icons/sleep.png', width: 36, height: 35 },
  water: { src: '/assets/pixel/icons/water.png', width: 28, height: 33 },
  work: { src: '/assets/pixel/icons/work.png', width: 101, height: 70 },
  xp: { src: '/assets/pixel/icons/xp.png', width: 46, height: 43 },
} as const satisfies Record<string, PixelAsset>

export const items = {
  apple: { src: '/assets/pixel/items/apple.png', width: 48, height: 54 },
  banana: { src: '/assets/pixel/items/banana.png', width: 41, height: 48 },
  chocolate: { src: '/assets/pixel/items/chocolate.png', width: 40, height: 48 },
  coffeeMug: { src: '/assets/pixel/items/coffee-mug.png', width: 63, height: 62 },
  croissant: { src: '/assets/pixel/items/croissant.png', width: 54, height: 42 },
  fruitBowl: { src: '/assets/pixel/items/fruit-bowl.png', width: 69, height: 56 },
  icedCoffee: { src: '/assets/pixel/items/iced-coffee.png', width: 40, height: 69 },
  milk: { src: '/assets/pixel/items/milk.png', width: 34, height: 78 },
  onigiri: { src: '/assets/pixel/items/onigiri.png', width: 46, height: 47 },
  peach: { src: '/assets/pixel/items/peach.png', width: 42, height: 39 },
  sandwich: { src: '/assets/pixel/items/sandwich.png', width: 54, height: 56 },
  smoothie: { src: '/assets/pixel/items/smoothie.png', width: 40, height: 69 },
  toast: { src: '/assets/pixel/items/toast.png', width: 40, height: 38 },
  waterBottle: { src: '/assets/pixel/items/water-bottle.png', width: 35, height: 78 },
} as const satisfies Record<string, PixelAsset>

export const pets = {
  catBox: { src: '/assets/pixel/pets/cat-box.png', width: 100, height: 87 },
  catCurl: { src: '/assets/pixel/pets/cat-curl.png', width: 123, height: 73 },
  catLying: { src: '/assets/pixel/pets/cat-lying.png', width: 123, height: 92 },
  catSit: { src: '/assets/pixel/pets/cat-sit.png', width: 70, height: 94 },
  catStand: { src: '/assets/pixel/pets/cat-stand.png', width: 128, height: 95 },
  catWalk: { src: '/assets/pixel/pets/cat-walk.png', width: 155, height: 93 },
  catWhite: { src: '/assets/pixel/pets/cat-white.png', width: 89, height: 100 },
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
