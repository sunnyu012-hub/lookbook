import { useState } from 'react'
import type { EquippedOutfit, WardrobeCategory } from '@/types'
import { AvatarRenderer } from './AvatarRenderer'
import { AVATAR_BASE, WARDROBE, findWardrobeItem } from '@/lib/wardrobe/catalog'
import { ACTIVE_CATEGORIES, CATEGORY_LABEL } from '@/lib/wardrobe/layers'
import { emptyOutfit } from '@/lib/wardrobe/catalog'
import { OUTFIT_SLOT } from '@/lib/wardrobe/catalog'
import { cn } from '@/components/ui/cn'

/**
 * 개발용 정렬 검수판.
 *
 * 옷을 하나씩 갈아입혀 보면서 offset·scale 을 그 자리에서 움직여 본다.
 * 여기서 찾은 값은 `scripts/align-wardrobe.py` 의 OVERRIDES 에 적는다 —
 * **화면에서 눈대중으로 붙이지 않는다.** 그러면 다음에 다시 뽑을 때 사라진다.
 *
 * 내비게이션에는 넣지 않는다. 주소로만 들어온다 (`#avatar-lab`).
 */

type Nudge = { dx: number; dy: number; ds: number }

const ZERO: Nudge = { dx: 0, dy: 0, ds: 0 }

export function AvatarLab() {
  const [outfit, setOutfit] = useState<EquippedOutfit>(() => ({
    ...emptyOutfit(),
    topId: 'cream_tee',
    bottomId: 'blue_jeans',
  }))
  const [tab, setTab] = useState<WardrobeCategory>('TOP')
  const [nudge, setNudge] = useState<Record<string, Nudge>>({})
  const [showBase, setShowBase] = useState(true)

  const selected = outfit[OUTFIT_SLOT[tab]]
  const item = findWardrobeItem(selected)
  const n = (selected && nudge[selected]) || ZERO

  // 손으로 움직인 값을 원래 좌표에 얹어서 보여준다
  const tweaked: EquippedOutfit = outfit
  const patched = item
    ? {
        ...item,
        offsetX: item.offsetX + n.dx,
        offsetY: item.offsetY + n.dy,
        scale: item.scale + n.ds,
      }
    : null

  const set = (key: keyof Nudge, value: number) => {
    if (!selected) return
    setNudge((prev) => ({ ...prev, [selected]: { ...(prev[selected] ?? ZERO), [key]: value } }))
  }

  return (
    <div className="min-h-[100dvh] bg-canvas px-4 pb-16 pt-6">
      <h1 className="font-game text-[15px] text-ink">AVATAR LAB</h1>
      <p className="mt-1 text-[12px] text-inkdim">
        개발용. 여기서 맞춘 값은 <code>scripts/align-wardrobe.py</code> 의 OVERRIDES 에 적는다.
      </p>

      <div className="relative mx-auto mt-4 h-[46vh] max-w-[320px] rounded-card bg-surface">
        {showBase ? (
          <AvatarRenderer outfit={tweaked} animated={false} className="p-3" />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-inkdim">
            베이스 꺼둠
          </div>
        )}
        {patched && showBase && (
          // 손으로 움직인 판을 원래 것 위에 겹쳐 보여준다
          <div className="pointer-events-none absolute inset-3 flex items-end justify-center">
            <div
              className="relative h-full"
              style={{ aspectRatio: `${AVATAR_BASE.width} / ${AVATAR_BASE.height}` }}
            >
              <img
                src={patched.assetKey}
                alt=""
                className="absolute opacity-60"
                style={{
                  left: `${(patched.offsetX / AVATAR_BASE.width) * 100}%`,
                  top: `${(patched.offsetY / AVATAR_BASE.height) * 100}%`,
                  width: `${((patched.w * patched.scale) / AVATAR_BASE.width) * 100}%`,
                  height: `${((patched.h * patched.scale) / AVATAR_BASE.height) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <label className="mt-3 flex items-center gap-2 text-[12px] text-inkdim">
        <input type="checkbox" checked={showBase} onChange={(e) => setShowBase(e.target.checked)} />
        베이스와 레이어 보기
      </label>

      <div className="mt-3 flex gap-1.5">
        {ACTIVE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setTab(c)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-[12px]',
              tab === c ? 'bg-coral text-surface' : 'bg-sunken text-inkdim',
            )}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setOutfit((o) => ({ ...o, [OUTFIT_SLOT[tab]]: null }))}
          className="rounded-pill bg-sunken px-2.5 py-1 text-[11px] text-inkdim"
        >
          없음
        </button>
        {WARDROBE.filter((i) => i.category === tab).map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => setOutfit((o) => ({ ...o, [OUTFIT_SLOT[tab]]: i.id }))}
            className={cn(
              'rounded-pill px-2.5 py-1 text-[11px]',
              selected === i.id ? 'bg-coral text-surface' : 'bg-surface text-inkdim',
            )}
          >
            {i.id}
          </button>
        ))}
      </div>

      {item && (
        <div className="mt-4 space-y-2 rounded-card bg-surface p-3">
          <p className="font-game text-[11px] text-ink">
            {item.id} · scale {(item.scale + n.ds).toFixed(3)} · x{' '}
            {Math.round(item.offsetX + n.dx)} · y {Math.round(item.offsetY + n.dy)}
          </p>
          {item.adjusted && (
            <p className="text-[11px] text-dusty-deep">손으로 고침: {item.adjusted}</p>
          )}
          {(
            [
              ['dx', -120, 120, 1],
              ['dy', -160, 160, 1],
              ['ds', -0.6, 0.6, 0.01],
            ] as const
          ).map(([key, min, max, step]) => (
            <label key={key} className="flex items-center gap-2 text-[11px] text-inkdim">
              <span className="w-6 font-game">{key}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={n[key]}
                onChange={(e) => set(key, Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right font-game">{n[key]}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => selected && setNudge((p) => ({ ...p, [selected]: ZERO }))}
            className="rounded-pill bg-sunken px-2.5 py-1 text-[11px] text-inkdim"
          >
            되돌리기
          </button>
        </div>
      )}
    </div>
  )
}
