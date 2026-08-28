import { useEffect, useState } from 'react'
import type { CharacterMood } from './types'
import { CHARACTER } from '@/lib/assets'
import { DEFAULT_SKIN_ID, findSkin, skinArt, skinThumb } from '@/lib/character/skins'
import { cn } from '@/components/ui/cn'

interface CharacterSkinRendererProps {
  skinId: string
  /** 기분에 따라 움직임이 달라진다. 그림은 대개 같다. */
  mood?: CharacterMood
  /** 작은 썸네일에서는 숨쉬는 움직임을 끈다 */
  animated?: boolean
  /**
   * 작은 그림을 쓴다.
   *
   * 목록 한 칸은 폰에서 86px 다. 백스무 벌을 원본으로 받으면 4MB 가 넘는다.
   * 큰 미리보기에서는 그대로 원본을 쓴다 — 거기서는 크게 보인다.
   */
  small?: boolean
  /** 화면에 들어올 때 받는다. 목록처럼 한 번에 여럿 그릴 때 쓴다. */
  lazy?: boolean
  className?: string
}

const ANIMATION: Record<CharacterMood, string> = {
  idle: 'animate-breathe',
  questClear: 'animate-bouncesm',
  levelUp: 'animate-bouncelg',
  resting: 'animate-breathe',
}

/**
 * 캐릭터 그림 한 장.
 *
 * ── 여기 하나만 안다 ───────────────────────────────────
 *
 * 어떤 파일을 쓸지 아는 곳은 여기뿐이다. 홈 · 미리보기 · 목록 카드가
 * 전부 이걸 쓴다. 새 모습이 늘어도 화면 컴포넌트는 손대지 않는다.
 *
 * ── 빈 자리를 만들지 않는다 ────────────────────────────
 *
 * 그림을 못 받으면 기본 모습으로, 그것도 못 받으면 처음부터 있던
 * 캐릭터 그림으로 내려간다. 깨진 그림 아이콘은 어떤 경우에도 안 보인다.
 * 시트를 아직 안 넣었거나 배포가 반쯤 갈렸을 때 실제로 생기는 일이다.
 */
export function CharacterSkinRenderer({
  skinId,
  mood = 'idle',
  animated = true,
  small = false,
  lazy = false,
  className,
}: CharacterSkinRendererProps) {
  const def = findSkin(skinId) ?? findSkin(DEFAULT_SKIN_ID)
  const wanted = def ? (small && mood === 'idle' ? skinThumb(def) : skinArt(def, mood)) : CHARACTER.idle
  const [src, setSrc] = useState(wanted)

  // 모습이나 자세가 바뀌면 다시 처음부터 시도한다.
  // 이걸 안 하면 한 번 내려간 fallback 이 계속 붙어 있는다.
  useEffect(() => {
    setSrc(wanted)
  }, [wanted])

  const fallback = () => {
    const base = findSkin(DEFAULT_SKIN_ID)
    const full = def ? skinArt(def, mood) : CHARACTER.idle
    const backup = base ? skinArt(base) : CHARACTER.idle
    setSrc((current) => {
      // 작은 그림이 아직 안 만들어진 것이면 원본을 한 번 더 시도한다
      if (current !== full && current !== backup) return full
      if (current === backup) return CHARACTER.idle
      return backup
    })
  }

  // 자를 때 발끝과 키를 이미 맞춰뒀기 때문에 보통은 손볼 게 없다.
  // 한 장만 유난할 때 정의에서 바로잡는다 — 화면 컴포넌트마다
  // margin 을 따로 주기 시작하면 어디서 어긋났는지 못 찾는다.
  const nudged =
    def !== null &&
    (def.scale !== undefined || def.offsetX !== undefined || def.offsetY !== undefined)

  const image = (
    <img
      // key 를 바꿔야 자세가 바뀔 때 폴짝 뛰는 움직임이 처음부터 다시 돈다
      key={`${skinId}:${mood}`}
      src={src}
      onError={fallback}
      loading={lazy ? 'lazy' : undefined}
      decoding={lazy ? 'async' : undefined}
      alt="내 캐릭터"
      draggable={false}
      className={cn(
        'h-full w-full select-none object-contain object-bottom',
        animated && ANIMATION[mood],
        !nudged && className,
      )}
      style={{ transformOrigin: 'bottom center' }}
    />
  )

  if (!nudged || !def) return image

  return (
    <span
      className={cn('block', className)}
      style={{
        transform: `translate(${def.offsetX ?? 0}%, ${def.offsetY ?? 0}%) scale(${def.scale ?? 1})`,
        transformOrigin: 'bottom center',
      }}
    >
      {image}
    </span>
  )
}
