import { useMemo, useState } from 'react'
import type { AreaDef, AreaId, Quest } from '@/types'
import { AREAS } from '@/lib/rpg/content'
import { TIME_ICON, TIME_LABEL, isNightOpen, timeBand } from '@/lib/rpg/time'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { isTodayQuest } from '@/lib/stats'
import { cn } from '@/components/ui/cn'

interface MapScreenProps {
  currentAreaId: AreaId
  quests: Quest[]
  onSelectArea: (areaId: AreaId) => void
}

/**
 * 작은 도시.
 *
 * 자유 이동형 맵이 아니라 카드로 된 지도다.
 * 지금 어디에 있는지, 거기서 뭐가 잘 되는지만 분명하게 보여준다.
 */
export function MapScreen({ currentAreaId, quests, onSelectArea }: MapScreenProps) {
  const [openArea, setOpenArea] = useState<AreaDef | null>(null)
  const now = new Date()
  const band = timeBand(now)
  const nightOpen = isNightOpen(now)

  const todayQuests = useMemo(
    () => quests.filter((q) => !q.completed && isTodayQuest(q)),
    [quests],
  )

  return (
    <div className="animate-risein">
      <ScreenHeader
        title="MAP"
        trailing={
          <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1.5 ring-1 ring-line">
            <span className="text-[13px]">{TIME_ICON[band]}</span>
            <span className="font-game text-[11px] leading-none text-inkdim">
              {TIME_LABEL[band]}
            </span>
          </span>
        }
      />

      <p className="-mt-1 mb-4 text-[13px] text-inkdim">오늘은 어디서 지내볼까?</p>

      <ul className="space-y-2.5">
        {AREAS.map((area) => {
          const isCurrent = area.id === currentAreaId
          const closed = area.nightOnly && !nightOpen
          const related = todayQuests.filter((q) => area.categories.includes(q.category)).length

          return (
            <li key={area.id}>
              <button
                type="button"
                onClick={() => setOpenArea(area)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border px-3.5 py-3.5 text-left',
                  'transition-transform duration-150 ease-out active:scale-[0.98]',
                  isCurrent
                    ? 'border-coral bg-coral-soft/40 ring-[1.5px] ring-inset ring-coral'
                    : 'border-line bg-surface shadow-soft',
                  closed && !isCurrent && 'opacity-65',
                )}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-canvas text-[24px]">
                  {area.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold text-ink">{area.name}</span>
                    {isCurrent && (
                      <span className="shrink-0 rounded-pill bg-coral px-2 py-0.5 font-game text-[9px] tracking-[0.06em] text-surface">
                        CURRENT
                      </span>
                    )}
                    {closed && (
                      <span className="shrink-0 rounded-pill bg-sunken px-2 py-0.5 text-[10px] text-inkdim">
                        Opens at night
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-inkdim">
                    {area.buffLabel}
                  </span>
                  {related > 0 && (
                    <span className="mt-0.5 block text-[11px] text-inkfaint">
                      여기 어울리는 오늘 퀘스트 {related}개
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <AreaSheet
        area={openArea}
        isCurrent={openArea?.id === currentAreaId}
        closed={openArea?.nightOnly === true && !nightOpen}
        quests={todayQuests}
        onClose={() => setOpenArea(null)}
        onSelect={(id) => {
          onSelectArea(id)
          setOpenArea(null)
        }}
      />
    </div>
  )
}

interface AreaSheetProps {
  area: AreaDef | null
  isCurrent: boolean
  /** 지금은 문을 닫은 곳 */
  closed: boolean
  quests: Quest[]
  onClose: () => void
  onSelect: (id: AreaId) => void
}

function AreaSheet({ area, isCurrent, closed, quests, onClose, onSelect }: AreaSheetProps) {
  if (!area) return null
  const related = quests.filter((q) => area.categories.includes(q.category))

  return (
    <BottomSheet open onClose={onClose} title={area.name}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card bg-canvas text-[32px]">
          {area.icon}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-[20px] font-semibold text-ink">{area.name}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{area.description}</p>
        </div>
      </div>

      <div className="rounded-card bg-coral-soft/50 px-4 py-3.5">
        <p className="font-game text-[10px] tracking-[0.14em] text-coral-deep">
          {area.buffName}
        </p>
        <p className="mt-1 text-[14px] text-ink">{area.buffLabel}</p>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[13px] font-medium text-inkdim">잘 맞는 분야</p>
        <div className="flex flex-wrap gap-1.5">
          {area.categories.map((c) => (
            <CategoryBadge key={c} category={c} />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[13px] font-medium text-inkdim">여기 어울리는 오늘 퀘스트</p>
        {related.length === 0 ? (
          <p className="text-[13px] text-inkfaint">아직 없어. 하나 만들어도 좋고.</p>
        ) : (
          <ul className="space-y-1.5">
            {related.slice(0, 5).map((q) => (
              <li
                key={q.id}
                className="flex items-center gap-2 rounded-btn bg-canvas px-3 py-2.5 text-[13.5px] text-ink"
              >
                <CategoryBadge category={q.category} />
                <span className="truncate">{q.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 나중에 NPC 가 설 자리 */}
      <div className="mt-5 rounded-card border border-dashed border-line px-4 py-3.5 text-center">
        <p className="text-[12.5px] text-inkfaint">언젠가 여기서 누군가를 만나게 될지도.</p>
      </div>

      <div className="mt-6">
        <Button
          size="lg"
          className="w-full"
          disabled={isCurrent || closed}
          onClick={() => onSelect(area.id)}
        >
          {isCurrent ? '지금 여기 있어' : closed ? '아직 문을 안 열었어' : '여기로 가기'}
        </Button>
        {closed && !isCurrent && (
          <p className="mt-2 text-center text-[12px] text-inkfaint">밤 9시가 지나면 열려.</p>
        )}
      </div>
    </BottomSheet>
  )
}
