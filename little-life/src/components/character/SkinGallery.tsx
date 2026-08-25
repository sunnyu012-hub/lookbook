import { useEffect, useState } from 'react'
import type { AppState } from '@/types'
import { SKINS, skinArt, skinProgress } from '@/lib/character/skins'
import { CharacterSkinRenderer } from './CharacterSkinRenderer'

interface SkinGalleryProps {
  state: AppState
}

interface Measured {
  width: number
  height: number
  ok: boolean
}

/**
 * 개발용 — 열두 장을 한 줄에 세워놓고 크기와 정렬을 눈으로 본다.
 *
 * 주소에 ?dev=skins 를 붙이면 나온다. 화면 어디에도 들어가는 길은 없다.
 * 자르는 스크립트가 발끝과 서 있는 자리를 맞춰주긴 하는데,
 * 한 장이라도 유난히 크면 여기서 바로 보인다. 그럴 때만 scale 을 손본다.
 *
 * 바닥에 그은 선이 기준이다. 열두 발끝이 그 선에 닿아 있어야 한다.
 */
export function SkinGallery({ state }: SkinGalleryProps) {
  const [sizes, setSizes] = useState<Record<string, Measured>>({})

  useEffect(() => {
    let alive = true
    for (const skin of SKINS) {
      const image = new Image()
      image.onload = () => {
        if (!alive) return
        setSizes((prev) => ({
          ...prev,
          [skin.id]: { width: image.naturalWidth, height: image.naturalHeight, ok: true },
        }))
      }
      image.onerror = () => {
        if (!alive) return
        setSizes((prev) => ({ ...prev, [skin.id]: { width: 0, height: 0, ok: false } }))
      }
      image.src = skinArt(skin)
    }
    return () => {
      alive = false
    }
  }, [])

  const missing = SKINS.filter((s) => sizes[s.id]?.ok === false)

  return (
    <div className="min-h-dvh bg-canvas px-4 py-6">
      <h1 className="text-[18px] font-bold text-ink">Skin Gallery (dev)</h1>
      <p className="mt-1 text-[12px] text-inkdim">
        {SKINS.length}장 · 그림 없음 {missing.length}장 · 바닥 선에 발끝이 닿아야 한다
      </p>

      <div className="-mx-4 mt-5 overflow-x-auto px-4">
        <div className="flex w-max items-end gap-3 border-b-2 border-dashed border-coral pb-0">
          {SKINS.map((skin) => (
            <div key={skin.id} className="w-[104px]">
              <div className="flex h-[168px] items-end justify-center">
                <CharacterSkinRenderer skinId={skin.id} animated={false} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-6 space-y-1.5">
        {SKINS.map((skin) => {
          const size = sizes[skin.id]
          return (
            <li
              key={skin.id}
              className="rounded-btn border border-line bg-surface px-3 py-2 font-game text-[10.5px] text-inkdim"
            >
              <span className="text-ink">{skin.id}</span>
              {'  '}
              {skin.name} · {skin.category} · {skin.rarity} · {skin.unlock.kind}
              <br />
              {skinArt(skin)}
              <br />
              {size
                ? size.ok
                  ? `${size.width}x${size.height}  scale ${skin.scale ?? 1}  offset ${skin.offsetX ?? 0},${skin.offsetY ?? 0}`
                  : '그림 없음 → 기본으로 대체'
                : '재는 중…'}
              {'  '}
              진행 {Math.round(skinProgress(state, skin.unlock) * 100)}%
            </li>
          )
        })}
      </ul>
    </div>
  )
}
