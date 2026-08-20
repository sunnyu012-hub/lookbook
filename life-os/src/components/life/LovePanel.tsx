import { useMemo } from 'react'
import type { LifeEvent, Preferences } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { formatShort, todayKey } from '@/lib/date'
import { ddayFrom } from '@/lib/dday'
import { withParticle } from '@/lib/korean'
import { effects as fx, icons } from '@/lib/pixelAssets'

/** 함께한 날들 — 통계가 아니라 일기장에 가깝게 */
export function LovePanel({
  prefs,
  lifeEvents,
  onAdd,
  onOpenSettings,
}: {
  prefs: Preferences
  lifeEvents: LifeEvent[]
  onAdd: () => void
  onOpenSettings: () => void
}) {
  if (!prefs.relationshipEnabled || !prefs.relationshipStartDate) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className="press flex w-full items-center justify-center gap-2 rounded-px4 border-[1.5px] border-dashed border-borderdeep bg-cream py-3 text-[12.5px] text-inkdim"
      >
        <PixelImage asset={fx.heart} height={16} />
        기념일을 세려면 설정에서 켜 주세요
      </button>
    )
  }

  const d = ddayFrom(prefs.relationshipStartDate, 'since', todayKey())
  const name = prefs.partnerName
  const together = useMemo(
    () => lifeEvents.filter((e) => e.category === 'love').slice(0, 12),
    [lifeEvents],
  )

  return (
    <div className="space-y-3">
      <section className="rounded-px5 px-4 py-4 text-center" style={{ backgroundColor: '#FDEFF3' }}>
        <div className="flex items-center justify-center gap-1.5">
          <PixelSparkle size={10} />
          <PixelImage asset={fx.heart} height={20} />
          <PixelSparkle size={10} variant={2} delay={600} />
        </div>
        <p className="mt-2 font-pixel text-[30px] leading-none tabular-nums text-pinkdeep">
          {d.label}
        </p>
        <p className="ko mt-2">
          {name ? `${withParticle(name, '와')}는` : '우리는'} 오늘로 {d.countLabel}이에요.
        </p>
        <p className="plabel mt-2">시작한 날 {formatShort(prefs.relationshipStartDate)}</p>
      </section>

      {d.nextMilestone && (
        <PixelPanel title="Coming up" icon={fx.sparkle01}>
          <div className="flex items-center gap-2">
            <PixelImage asset={fx.sparkle02} height={17} />
            <span className="text-[13.5px]">{d.nextMilestone.label}</span>
            <span className="ml-auto text-right">
              <span className="block font-pixel text-[13px] text-peachdeep">
                {d.nextMilestone.remaining}일 뒤
              </span>
              <span className="plabel mt-1 block">{formatShort(d.nextMilestone.date)}</span>
            </span>
          </div>
        </PixelPanel>
      )}

      <PixelPanel
        title="Days together"
        icon={fx.heartBubble}
        right={
          <button
            type="button"
            onClick={onAdd}
            className="press rounded-px2 border-[1.5px] border-border bg-cream px-2 py-1 font-pixel text-[9px] uppercase text-inkdim"
          >
            + Add
          </button>
        }
      >
        {together.length === 0 ? (
          <p className="body-ko text-inkdim">
            함께한 날을 적어 두면 여기에 쌓여요. LOG 탭에서 &lsquo;사랑&rsquo;으로 적으면 돼요.
          </p>
        ) : (
          <ul className="divide-y divide-dashed divide-border/70">
            {together.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2">
                <PixelImage asset={icons.camera} height={15} />
                <span className="min-w-0 flex-1 truncate text-[13px]">{e.title}</span>
                <span className="plabel">{formatShort(e.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </PixelPanel>
    </div>
  )
}
