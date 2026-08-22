import { useMemo, useState } from 'react'
import type { EquippedOutfit, WardrobeItem } from '@/types/wardrobe'
import { AVATAR_BASE, findWardrobeItem } from '@/lib/wardrobe/catalog'
import { LAYER_ORDER } from '@/lib/wardrobe/layers'
import { CHARACTER } from '@/lib/assets'
import type { CharacterMood } from './types'
import { cn } from '@/components/ui/cn'

/**
 * 캐릭터 한 명.
 *
 * 여러 장을 같은 틀 위에 겹쳐 그린다. 좌표는 베이스 그림의 픽셀이고,
 * 틀 전체를 %로 환산해서 얹기 때문에 화면 크기가 달라져도 어긋나지 않는다.
 * **화면마다 margin 을 눈대중으로 붙이지 않는다** — 어긋나면 정렬 스크립트를 고친다.
 *
 * 홈·옷장·프로필·상점 미리보기가 전부 이 컴포넌트를 쓴다.
 * 같은 캐릭터를 화면마다 따로 그리면 언젠가 서로 달라진다.
 */

interface AvatarRendererProps {
  outfit: EquippedOutfit
  /** 숨 쉬는 듯한 움직임. 작은 썸네일에서는 끈다. */
  mood?: CharacterMood
  animated?: boolean
  className?: string
  /** 옷장에서 미리 볼 때처럼, 아직 안 산 옷을 잠깐 입혀볼 때 */
  preview?: Partial<EquippedOutfit>
}

const ANIMATION: Record<CharacterMood, string> = {
  idle: 'animate-breathe',
  questClear: 'animate-bouncesm',
  levelUp: 'animate-bouncelg',
  resting: 'animate-breathe',
}

/**
 * 원피스를 입으면 상·하의는 **가리기만 한다.**
 * 골라둔 것을 지우지 않는다 — 벗으면 입고 있던 게 그대로 돌아와야 한다.
 */
function visibleItems(outfit: EquippedOutfit): WardrobeItem[] {
  const onePiece = findWardrobeItem(outfit.onePieceId)

  const ids = [
    outfit.onePieceId,
    onePiece ? null : outfit.topId,
    onePiece ? null : outfit.bottomId,
    outfit.shoesId,
    outfit.hairId,
    outfit.headId,
    outfit.accessoryId,
    outfit.bagId,
    outfit.faceId,
  ]

  return ids
    .map(findWardrobeItem)
    .filter((item): item is WardrobeItem => item !== null && item.assetKey !== undefined)
    .sort((a, b) => LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer])
}

export function AvatarRenderer({
  outfit,
  mood = 'idle',
  animated = true,
  className,
  preview,
}: AvatarRendererProps) {
  const [baseBroken, setBaseBroken] = useState(false)

  const worn = useMemo(
    () => visibleItems(preview ? { ...outfit, ...preview } : outfit),
    [outfit, preview],
  )

  // 베이스가 없으면 예전 캐릭터 그림으로 내려간다.
  // 옷이 안 보이는 건 아쉬운 일이지만, 빈 화면은 고장이다.
  if (baseBroken) {
    return (
      <img
        src={CHARACTER[mood]}
        alt="내 캐릭터"
        draggable={false}
        className={cn(
          'h-full w-full select-none object-contain object-bottom',
          animated && ANIMATION[mood],
          className,
        )}
        style={{ transformOrigin: 'bottom center' }}
      />
    )
  }

  const { width, height } = AVATAR_BASE
  const pct = (v: number, total: number) => `${(v / total) * 100}%`

  return (
    // 바깥은 그냥 자리다. 안쪽 상자가 베이스 그림과 **정확히 같은 비율**을 갖고,
    // 옷은 그 상자를 기준으로 %로 얹힌다.
    // 이렇게 하지 않으면 카드 비율이 바뀔 때마다 목이 어긋난다.
    <div className={cn('flex h-full w-full items-end justify-center select-none', className)}>
      <div
        className={cn('relative h-full', animated && ANIMATION[mood])}
        style={{ aspectRatio: `${width} / ${height}`, transformOrigin: 'bottom center' }}
        role="img"
        aria-label="내 캐릭터"
      >
        <img
          src={AVATAR_BASE.file}
          alt=""
          aria-hidden
          draggable={false}
          onError={() => setBaseBroken(true)}
          className="absolute inset-0 h-full w-full"
        />

        {worn.map((item) => (
          <img
            key={item.id}
            src={item.assetKey}
            alt=""
            aria-hidden
            draggable={false}
            // 그림 한 장이 없어도 나머지는 그대로 입고 있어야 한다
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
            className="absolute"
            style={{
              left: pct(item.offsetX, width),
              top: pct(item.offsetY, height),
              width: pct(item.w * item.scale, width),
              height: pct(item.h * item.scale, height),
            }}
          />
        ))}
      </div>
    </div>
  )
}
