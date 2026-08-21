import type { Category, Difficulty } from '@/types'
import type { CharacterMood } from '@/components/character/types'

/**
 * 그림 에셋 경로를 한곳에 모아둔다.
 *
 * public/assets 아래 파일들이라 빌드가 손대지 않고 그대로 나간다.
 * 나중에 옷·펫·방 꾸미기가 붙으면 여기에 표를 늘리면 되고,
 * 화면 컴포넌트는 경로 문자열을 직접 알 필요가 없다.
 */
const base = '/assets'

/** 기분에 따른 캐릭터 그림. 슬픔·아픔 상태는 두지 않는다. */
export const CHARACTER: Record<CharacterMood, string> = {
  idle: `${base}/character/idle.webp`,
  questClear: `${base}/character/quest-clear.webp`,
  levelUp: `${base}/character/celebrate.webp`,
  resting: `${base}/character/resting.webp`,
}

/** ME 화면 프로필용 얼굴. */
export const CHARACTER_FACE = {
  idle: `${base}/character/face-idle.webp`,
  happy: `${base}/character/face-happy.webp`,
  surprised: `${base}/character/face-surprised.webp`,
  sulky: `${base}/character/face-sulky.webp`,
}

/**
 * 아직 화면에 쓰지 않고 남겨둔 것들.
 * 지우지 않고 표에 두는 편이 나중에 찾기 쉽다.
 */
export const CHARACTER_EXTRA = {
  /** 팔 들고 윙크하는 포즈 — 업적 같은 게 생기면 쓸 만하다 */
  cheerPose: `${base}/character/level-up.webp`,
  /** 삐친 얼굴. 캐릭터가 사용자를 탓하지 않기로 해서 화면에서는 쓰지 않는다 */
  faceSulky: `${base}/character/face-sulky.webp`,
}

export const ROOM = {
  window: `${base}/room/window.webp`,
  rug: `${base}/room/rug.webp`,
  beanbag: `${base}/room/beanbag.webp`,
  plant: `${base}/room/plant.webp`,
  shelf: `${base}/room/shelf.webp`,
  desk: `${base}/room/desk.webp`,
  lamp: `${base}/room/lamp.webp`,
  frame: `${base}/room/frame.webp`,
  cushion: `${base}/room/cushion.webp`,
  nightstand: `${base}/room/nightstand.webp`,
  cocoa: `${base}/room/cocoa.webp`,
  mobile: `${base}/room/mobile.webp`,
  slippers: `${base}/room/slippers.webp`,
}

export const CATEGORY_BADGE: Record<Category, string> = {
  LIFE: `${base}/badges/life.webp`,
  WORK: `${base}/badges/work.webp`,
  BODY: `${base}/badges/body.webp`,
  PLAY: `${base}/badges/play.webp`,
  MIND: `${base}/badges/mind.webp`,
  HEART: `${base}/badges/heart.webp`,
}

export const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  EASY: `${base}/badges/easy.webp`,
  NORMAL: `${base}/badges/normal.webp`,
  HARD: `${base}/badges/hard.webp`,
}

export const UI = {
  exp: `${base}/badges/exp.webp`,
  levelUp: `${base}/badges/level-up.webp`,
  questClear: `${base}/badges/quest-clear.webp`,
  check: `${base}/badges/check.webp`,
}

export const EFFECT = {
  sparkle: `${base}/effects/sparkle.webp`,
  hearts: `${base}/effects/hearts.webp`,
  star: `${base}/effects/star.webp`,
  pop: `${base}/effects/pop.webp`,
}
