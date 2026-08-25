/**
 * 오늘의 흐름 — 오늘 남긴 순간들을 시간순으로.
 *
 * Phase 2 에서는 나열까지만 한다.
 * "저녁으로 갈수록 좋아졌어요" 같은 해석은 분석 엔진(Phase 5)의 일이다.
 * 근거 없이 말부터 만들면 나중에 진짜 분석이 들어올 자리가 없어진다.
 */
import type { QuickLog } from '@/lib/os2/types'
import type { MyTagStore } from '@/hooks/useMyTags'
import { MOOD_BY_VALUE } from './MoodPicker'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

/** 흐름 줄에 붙이는 태그는 두 개까지. 넘치면 +n */
const MAX_CHIPS = 2

export const timeOf = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function TodayFlow({
  logs,
  tagStore,
  onOpen,
  title = '오늘의 흐름',
}: {
  logs: QuickLog[]
  tagStore: MyTagStore
  onOpen: (log: QuickLog) => void
  title?: string
}) {
  return (
    <PixelPanel
      title={title}
      icon={icons.log}
      right={logs.length > 0 ? <span className="plabel">{logs.length}</span> : undefined}
    >
      {logs.length === 0 ? (
        <p className="text-[12.5px] text-inkfaint">아직 남긴 순간이 없어요.</p>
      ) : (
        <>
          {/* 이모지만 훑어보는 줄 */}
          {logs.length > 1 && (
            <div className="no-scrollbar -mx-1 mb-3 flex items-center gap-1 overflow-x-auto px-1 pb-1">
              {logs.map((log, i) => (
                <span key={log.id} className="flex shrink-0 items-center gap-1">
                  <span className="text-[17px]" aria-hidden>
                    {MOOD_BY_VALUE[log.mood].emoji}
                  </span>
                  <span className="plabel">{timeOf(log.loggedAt)}</span>
                  {i < logs.length - 1 && (
                    <span aria-hidden className="px-0.5 text-[11px] text-inkfaint">
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          <ul className="space-y-1">
            {logs.map((log) => (
              <FlowRow key={log.id} log={log} tagStore={tagStore} onOpen={onOpen} />
            ))}
          </ul>
        </>
      )}
    </PixelPanel>
  )
}

function FlowRow({
  log,
  tagStore,
  onOpen,
}: {
  log: QuickLog
  tagStore: MyTagStore
  onOpen: (log: QuickLog) => void
}) {
  const mood = MOOD_BY_VALUE[log.mood]
  const photoUrl = usePhotoUrl(log.photoPath)

  const tags = (log.myTagIds ?? [])
    .map((id) => tagStore.resolve(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          haptic()
          onOpen(log)
        }}
        className="press flex w-full items-start gap-2.5 rounded-px3 px-1 py-2 text-left"
      >
        <span
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-px3 text-[19px]"
          style={{ backgroundColor: mood.tint }}
          aria-label={mood.label}
        >
          <span aria-hidden>{mood.emoji}</span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="plabel">{timeOf(log.loggedAt)}</span>
            {log.energy != null && (
              <span className="plabel text-peachdeep">E{log.energy}</span>
            )}
          </span>

          {log.text && (
            <span className="mt-0.5 block text-[13px] leading-relaxed">{log.text}</span>
          )}

          {tags.length > 0 && (
            <span className="mt-1 flex flex-wrap items-center gap-1">
              {tags.slice(0, MAX_CHIPS).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-cream px-1.5 py-[2px] text-[11px] text-inkdim"
                >
                  {tag.name}
                </span>
              ))}
              {tags.length > MAX_CHIPS && (
                <span className="plabel">+{tags.length - MAX_CHIPS}</span>
              )}
            </span>
          )}
        </span>

        {photoUrl && (
          <img
            src={photoUrl}
            alt=""
            className={cn('h-[34px] w-[34px] shrink-0 rounded-px2 border border-border object-cover')}
          />
        )}
      </button>
    </li>
  )
}
