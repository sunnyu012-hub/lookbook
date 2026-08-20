import { useMemo, useState } from 'react'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import {
  BADGE_GROUP_LABEL,
  earnedCount,
  type BadgeGroup,
  type BadgeState,
} from '@/lib/badges'
import type { Pattern } from '@/lib/analytics'
import { effects as fx, icons } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'

type Tab = 'badges' | 'discoveries' | 'memories'

interface Props {
  badges: BadgeState[]
  patterns: Pattern[]
  memories: { date: string; title: string }[]
  onClose: () => void
}

/** COLLECTION — 스티커북처럼 모아 보는 도감 */
export function CollectionPage({ badges, patterns, memories, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('badges')
  const earned = earnedCount(badges)

  const grouped = useMemo(() => {
    const map = new Map<BadgeGroup, BadgeState[]>()
    badges.forEach((b) => map.set(b.group, [...(map.get(b.group) ?? []), b]))
    return map
  }, [badges])

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="돌아가기"
          className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard"
        >
          ‹
        </button>
        <h1 className="font-pixel text-[15px] uppercase leading-none tracking-[0.04em]">
          Collection
        </h1>
        <PixelSparkle size={10} />
        <span className="plabel ml-auto">
          {earned} / {badges.length}
        </span>
      </header>

      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            ['badges', 'Badges', '배지'],
            ['discoveries', 'Discovery', '발견'],
            ['memories', 'Memories', '순간'],
          ] as [Tab, string, string][]
        ).map(([key, label, ko]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => {
              haptic()
              setTab(key)
            }}
            className={cn(
              'press rounded-px4 border-[1.5px] py-2 text-center',
              tab === key ? 'border-pinkdeep bg-pinksoft' : 'border-border bg-ivory',
            )}
          >
            <span className="block font-pixel text-[10px] uppercase leading-none">{label}</span>
            <span className="mt-1 block text-[10px] leading-none text-inkdim">{ko}</span>
          </button>
        ))}
      </div>

      {tab === 'badges' && (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([group, list]) => (
            <PixelPanel key={group} title={BADGE_GROUP_LABEL[group]} icon={icons.xp}>
              <div className="grid grid-cols-3 gap-2">
                {list.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </PixelPanel>
          ))}
        </div>
      )}

      {tab === 'discoveries' && (
        <div className="space-y-2">
          {patterns.length === 0 ? (
            <p className="body-ko py-8 text-center text-inkdim">
              아직 발견한 게 없어요. 며칠만 더 적으면 하나씩 열려요.
            </p>
          ) : (
            patterns.map((p, i) => (
              <article
                key={p.id}
                className="rounded-px4 border-[1.5px] border-border bg-ivory p-3 shadow-hard"
              >
                <div className="flex items-center gap-2">
                  <PixelSparkle size={11} />
                  <p className="plabel">Discovery #{String(i + 1).padStart(2, '0')}</p>
                  <span className="plabel ml-auto">{p.sample}</span>
                </div>
                <p className="mt-2 font-pixel text-[12px] uppercase">{p.title}</p>
                <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed">
                  <PixelImage asset={p.icon} height={19} className="mt-0.5" />
                  {p.body}
                </p>
              </article>
            ))
          )}
          <p className="px-1 text-[11px] leading-relaxed text-inkdim">
            기록 사이에서 보이는 관계일 뿐, 원인이라고 단정할 수는 없어요.
          </p>
        </div>
      )}

      {tab === 'memories' && (
        <PixelPanel title="Moments" icon={fx.heart}>
          {memories.length === 0 ? (
            <p className="body-ko text-inkdim">
              적어 둔 순간이 아직 없어요. LOG 탭에서 오늘 있었던 일을 남겨 보세요.
            </p>
          ) : (
            <ul className="divide-y divide-dashed divide-border/70">
              {memories.slice(0, 40).map((m, i) => (
                <li key={`${m.date}-${i}`} className="flex items-center gap-2 py-2">
                  <PixelImage asset={fx.sparkle02} height={14} />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{m.title}</span>
                  <span className="plabel">{m.date.slice(5).replace('-', '.')}</span>
                </li>
              ))}
            </ul>
          )}
        </PixelPanel>
      )}
    </div>
  )
}

function BadgeCard({ badge }: { badge: BadgeState }) {
  const hidden = badge.secret && !badge.earned
  const goal = badge.goal ?? 1
  const ratio = Math.min(1, badge.progress / goal)

  return (
    <div
      className={cn(
        'rounded-px3 px-2 py-2.5 text-center',
        badge.earned ? 'bg-buttersoft' : 'bg-cream',
      )}
    >
      {hidden ? (
        // 비밀 배지는 아이콘도 가린다 — 미리 보이면 비밀이 아니다
        <span className="mx-auto flex h-[26px] items-center justify-center font-pixel text-[15px] text-inkfaint">
          ?
        </span>
      ) : (
        <PixelImage
          asset={badge.icon}
          height={26}
          className={cn('mx-auto', !badge.earned && 'opacity-25 saturate-0')}
        />
      )}
      <p
        className={cn(
          'mt-1.5 font-pixel text-[8.5px] uppercase leading-tight tracking-[0.02em]',
          badge.earned ? 'text-ink' : 'text-inkfaint',
        )}
      >
        {hidden ? '???' : badge.name}
      </p>
      <p className="mt-1 text-[9.5px] leading-tight text-inkfaint">
        {hidden ? '숨겨진 배지' : badge.earned ? '열림' : badge.hint}
      </p>
      {!badge.earned && !hidden && goal > 1 && (
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-border/50">
          <div className="h-full rounded-full bg-pink" style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  )
}
