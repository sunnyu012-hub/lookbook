import type { Preferences } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { SparkleBurst } from '@/components/pixel/PixelSparkle'
import { CATEGORY_META } from '@/lib/quests/categories'
import { mappingOfQuest } from '@/lib/quests/domains'
import { DOMAIN_META } from '@/lib/domains'
import { questTitle, type Quest } from '@/lib/quests/types'
import type { XpGain } from '@/lib/quests/master'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

/** 퀘스트 한 줄 — 체크 · 아이콘 · 이름 · XP */
export function QuestRow({
  quest,
  count,
  gain,
  prefs,
  justDone,
  favorite,
  onToggle,
  onFavorite,
  action,
  focused,
}: {
  quest: Quest
  /** 오늘 몇 번 했는지 */
  count: number
  gain: XpGain
  prefs: Preferences
  justDone?: boolean
  favorite?: boolean
  onToggle: () => void
  onFavorite?: () => void
  /** 체크 대신 다른 동작을 붙이고 싶을 때 (Quest Board 의 + ADD) */
  action?: { label: string; onClick: () => void; done?: boolean }
  /** 오늘의 목표에 도움이 되는 퀘스트 */
  focused?: boolean
}) {
  const meta = CATEGORY_META[quest.category]
  const domainMeta = DOMAIN_META[mappingOfQuest(quest).primary]
  const done = count > 0
  const repeat = quest.repeatable

  return (
    <li className="relative flex items-center gap-2.5 py-2">
      {focused && !done && (
        <span
          aria-hidden
          className="absolute -left-2 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-peachdeep"
        />
      )}
      {action ? (
        <button
          type="button"
          onClick={() => {
            haptic()
            action.onClick()
          }}
          className={cn(
            'shrink-0 rounded-px2 border-[1.5px] px-2 py-1 font-pixel text-[9px] uppercase',
            action.done
              ? 'border-mintdeep bg-mintsoft text-mintdeep'
              : 'border-pinkdeep bg-pink text-white',
          )}
        >
          {action.done ? 'Added' : action.label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            haptic()
            onToggle()
          }}
          aria-pressed={done}
          aria-label={`${questTitle(quest, prefs.partnerName)} ${done ? '취소' : '완료'}`}
          className={cn(
            'relative flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[5px]',
            'border-[1.5px] transition-all duration-150',
            done ? 'border-pinkdeep bg-pink' : 'border-borderdeep bg-ivory',
          )}
        >
          {done &&
            (repeat && count > 1 ? (
              <span className="font-pixel text-[9px] leading-none text-white">{count}</span>
            ) : (
              <Check />
            ))}
          <SparkleBurst show={Boolean(justDone)} />
        </button>
      )}

      <PixelImage asset={meta.icon} height={18} className={cn(done && !repeat && 'opacity-55')} />

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[13px] leading-tight transition-colors duration-150',
            done && !repeat ? 'text-inkdim line-through' : 'text-ink',
          )}
        >
          {questTitle(quest, prefs.partnerName)}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="plabel">
            {meta.ko}
            {repeat && ' · 반복'}
          </span>
          {/*
            XP 는 오른쪽의 주 보상이고, Domain 은 여기 작은 표시로만 둔다.
            둘을 같은 크기로 두면 화면이 복잡해지고 Domain 이 점수처럼 보인다.
          */}
          <span
            className="flex items-center gap-[3px] rounded-full px-1.5 py-[2px] font-pixel text-[8px] uppercase leading-none"
            style={{ backgroundColor: domainMeta.tint, color: domainMeta.accent }}
          >
            <PixelImage asset={domainMeta.icon} height={9} />
            {domainMeta.label}
          </span>
        </span>
      </span>

      {onFavorite && (
        <button
          type="button"
          aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기'}
          onClick={() => {
            haptic()
            onFavorite()
          }}
          className={cn('px-1 text-[13px] leading-none', favorite ? 'text-pinkdeep' : 'text-inkfaint')}
        >
          {favorite ? '♥' : '♡'}
        </button>
      )}

      <span
        className={cn(
          'shrink-0 font-pixel text-[10px] tabular-nums',
          gain.total === 0 ? 'text-inkfaint' : gain.featured ? 'text-peachdeep' : 'text-peachdeep',
        )}
      >
        {gain.total === 0 ? '—' : `+${gain.total}`}
      </span>

      {justDone && gain.total > 0 && (
        <span className="pointer-events-none absolute right-1 top-0 animate-xpfloat font-pixel text-[11px] text-pinkdeep">
          +{gain.total} XP
        </span>
      )}
    </li>
  )
}

/** 체크 표시 — 시트에 체크 아이콘이 없어 도형으로 그린다 */
function Check() {
  return (
    <span
      aria-hidden
      className="block h-[8px] w-[4px] rotate-45 border-b-[2px] border-r-[2px] border-white"
      style={{ marginTop: -2 }}
    />
  )
}
