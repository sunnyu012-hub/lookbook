import { useMemo } from 'react'
import { DayCard } from '../components/DayCard'
import { DayEditor } from '../components/DayEditor'
import { LetterCard } from '../components/LetterCard'
import { formatDay } from '../lib/date'
import { echoesForToday, letterForToday } from '../lib/messages'
import { PROMPTS } from '../lib/types'
import type { Diary } from '../hooks/useDiary'

type Props = {
  diary: Diary
  today: string
  onOpenDay: (date: string) => void
  onOpenSettings: () => void
  onOpenPhoto: (photos: { id: string; date: string }[], index: number) => void
}

/** 앱을 켜면 나오는 화면. 오늘 하루를 적는다. */
export function TodayScreen({ diary, today, onOpenDay, onOpenSettings, onOpenPhoto }: Props) {
  const entry = diary.entryOf(today)
  const letter = useMemo(() => letterForToday(diary.entries, today), [diary.entries, today])
  const echoes = useMemo(() => echoesForToday(diary.entries, today), [diary.entries, today])
  const filled = PROMPTS.filter((key) => entry[key].trim()).length

  return (
    <div className="space-y-3 px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
      <header className="flex items-end justify-between px-1 pb-1">
        <div>
          <p className="text-[12px] text-inkfaint">오늘</p>
          <h1 className="mt-0.5 text-[21px] font-semibold leading-tight">{formatDay(today)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <SaveMark savedAt={diary.savedAt} />
          <button
            type="button"
            aria-label="설정"
            onClick={onOpenSettings}
            className="h-9 w-9 rounded-pill bg-surface text-[15px] shadow-soft"
          >
            ⚙︎
          </button>
        </div>
      </header>

      {diary.storageBlocked && (
        <p className="rounded-card bg-peach-soft px-4 py-3 text-[13px] leading-relaxed text-peach-deep">
          이 브라우저에 저장을 못 하고 있어요. 사생활 보호 모드라면 일반 창에서 열어 주세요.
        </p>
      )}

      {/* 처음 켠 사람에게만 한 번. 기록이 하나라도 있으면 사라진다 */}
      {Object.keys(diary.entries).length === 0 && (
        <p className="rounded-card bg-surface px-4 py-3 text-[13px] leading-relaxed text-inkdim shadow-soft">
          한 칸만 채워도 돼요. 저장 버튼은 없고, 쓰는 동안 저장돼요.
        </p>
      )}

      {letter && <LetterCard letter={letter} />}

      <DayEditor
        entry={entry}
        entries={diary.entries}
        onPatch={(change) => diary.patch(today, change)}
        onOpenPhoto={(id) =>
          onOpenPhoto(
            entry.photos.map((photoId) => ({ id: photoId, date: today })),
            entry.photos.indexOf(id),
          )
        }
      />

      {filled === PROMPTS.length && (
        <p className="animate-fadein px-1 pt-1 text-center text-[13px] text-inkdim">
          오늘 하루, 잘 닫았어요. 🌙
        </p>
      )}

      {echoes.length > 0 && (
        <section className="space-y-2 pt-4">
          <h2 className="px-1 text-[13px] text-inkdim">그때의 오늘</h2>
          {echoes.map((echo) => (
            <DayCard
              key={echo.date}
              entry={diary.entries[echo.date]!}
              badge={echo.label}
              onOpen={() => onOpenDay(echo.date)}
            />
          ))}
        </section>
      )}
    </div>
  )
}

/** 방금 저장됐다는 표시. 저장 버튼이 없는 앱에서 이게 유일한 안심거리다. */
function SaveMark({ savedAt }: { savedAt: number | null }) {
  if (!savedAt) return null
  return (
    <span key={savedAt} className="animate-fadein text-[12px] text-inkfaint">
      저장됨
    </span>
  )
}
