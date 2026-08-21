import type { User } from '@/types'
import { EQUIP_SLOTS } from '@/types'
import { findArea, findClass, findItem } from '@/lib/rpg/content'
import { TIME_ICON, TIME_LABEL, timeBand } from '@/lib/rpg/time'
import { cn } from '@/components/ui/cn'

interface AdventureStatusCardProps {
  user: User
  onOpenMap: () => void
  onOpenBag: () => void
  onOpenMe: () => void
}

/**
 * 오늘의 상태 한 줄.
 *
 * 지금 어디에 있고, 뭘 하는 사람이고, 뭘 챙겨 나왔는지.
 * 각 칸은 그걸 바꿀 수 있는 화면으로 바로 넘어간다.
 */
export function AdventureStatusCard({
  user,
  onOpenMap,
  onOpenBag,
  onOpenMe,
}: AdventureStatusCardProps) {
  const area = findArea(user.currentAreaId)
  const klass = findClass(user.classId)
  const band = timeBand()

  const equippedItems = EQUIP_SLOTS.map((slot) => user.equippedItems[slot])
    .filter((id): id is string => id !== null)
    .map((id) => findItem(id))
    .filter((def): def is NonNullable<typeof def> => def !== null)

  return (
    <section className="rounded-card border border-line/70 bg-surface px-3.5 py-3.5 shadow-soft">
      <div className="flex items-center gap-2">
        <Tile
          onClick={onOpenMap}
          icon={area.icon}
          label={area.name}
          sub={`${TIME_ICON[band]} ${TIME_LABEL[band]}`}
        />
        <Tile
          onClick={onOpenMe}
          icon={klass?.icon ?? '🌱'}
          label={klass?.name ?? '아직 안 정함'}
          sub={klass ? klass.passiveName : '눌러서 고르기'}
        />
        <Tile
          onClick={onOpenBag}
          icon="🪙"
          label={user.coins.toLocaleString('ko-KR')}
          sub="Coins"
        />
      </div>

      <button
        type="button"
        onClick={onOpenBag}
        className={cn(
          'mt-2.5 flex w-full items-center gap-2 rounded-btn bg-canvas px-3 py-2.5 text-left',
          'transition-transform duration-150 ease-out active:scale-[0.98]',
        )}
      >
        <span className="font-game text-[9px] tracking-[0.1em] text-inkfaint">GEAR</span>
        {equippedItems.length === 0 ? (
          <span className="text-[12.5px] text-inkdim">아직 아무것도 안 꼈어</span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-1">
            {equippedItems.map((def) => (
              <span key={def.id} className="text-[17px] leading-none" title={def.name}>
                {def.icon}
              </span>
            ))}
          </span>
        )}
        <span className="ml-auto shrink-0 font-game text-[9px] tracking-[0.06em] text-inkfaint">
          {equippedItems.length}/{EQUIP_SLOTS.length}
        </span>
      </button>
    </section>
  )
}

function Tile({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: string
  label: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-btn bg-canvas px-2 py-2.5',
        'transition-transform duration-150 ease-out active:scale-[0.96]',
      )}
    >
      <span className="text-[20px] leading-none">{icon}</span>
      <span className="w-full truncate text-center text-[12px] font-medium text-ink">{label}</span>
      <span className="w-full truncate text-center text-[10px] text-inkfaint">{sub}</span>
    </button>
  )
}
