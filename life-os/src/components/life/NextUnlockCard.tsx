/**
 * NEXT UNLOCK — 다음에 열릴 것 몇 개.
 *
 * "0 / 45" 만 있으면 답답하다. 손에 잡히는 것 세 개만 보여 준다.
 */
import type { NextUnlock } from '@/lib/analytics/nextUnlock'
import { SOURCE_LABEL } from '@/lib/analytics/nextUnlock'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { icons } from '@/lib/pixelAssets'

export function NextUnlockCard({ unlocks }: { unlocks: NextUnlock[] }) {
  if (unlocks.length === 0) return null

  return (
    <PixelPanel title="Next unlock" icon={icons.xp} sparkle>
      <p className="ko mb-2.5 text-inkdim">곧 열릴 것들이에요. 서두르지 않아도 괜찮아요.</p>
      <ul className="space-y-2.5">
        {unlocks.map((u) => (
          <li key={u.id} className="flex items-center gap-2.5">
            <PixelImage asset={u.icon} height={18} className="shrink-0 opacity-45 saturate-0" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-pixel text-[9.5px] uppercase tracking-[0.02em]">
                  {u.title}
                </span>
                <span className="plabel shrink-0">{SOURCE_LABEL[u.source]}</span>
              </span>
              <span className="mt-1 block truncate text-[11.5px] text-inkdim">{u.hint}</span>
              <span className="mt-1.5 block h-[4px] overflow-hidden rounded-full bg-border/50">
                <span
                  className="block h-full rounded-full bg-pink"
                  style={{ width: `${Math.min(1, u.ratio) * 100}%` }}
                />
              </span>
            </span>
            <span className="shrink-0 font-pixel text-[10px] tabular-nums text-inkdim">
              {u.have}/{u.need}
            </span>
          </li>
        ))}
      </ul>
    </PixelPanel>
  )
}
