import { useMemo, useState } from 'react'
import { DayCard } from '../components/DayCard'
import { PhotoThumb } from '../components/PhotoThumb'
import { formatMonth, monthGrid, monthKeyOf, shiftMonth, todayKey } from '../lib/date'
import { moodOf } from '../lib/prompts'
import { photoStream, searchEntries } from '../lib/search'
import { sortedTags, tagCounts } from '../lib/tags'
import type { Diary } from '../hooks/useDiary'

type Props = {
  diary: Diary
  onOpenDay: (date: string) => void
  onOpenPhoto: (index: number) => void
}

type View = '목록' | '달력' | '사진'

/** 지난 기록을 다시 보는 화면. 목록 · 달력 · 사진 세 갈래로 같은 기록을 본다. */
export function LookBackScreen({ diary, onOpenDay, onOpenPhoto }: Props) {
  const [view, setView] = useState<View>('목록')
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [month, setMonth] = useState(() => monthKeyOf(todayKey()))

  const found = useMemo(
    () => searchEntries(diary.entries, query, tag),
    [diary.entries, query, tag],
  )
  const topTags = useMemo(
    () => sortedTags(tagCounts(diary.entries)).slice(0, 12),
    [diary.entries],
  )
  const photos = useMemo(() => photoStream(diary.entries), [diary.entries])
  const total = Object.keys(diary.entries).length

  return (
    <div className="space-y-3 px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))]">
      <header className="px-1">
        <h1 className="text-[21px] font-semibold leading-tight">돌아보기</h1>
        <p className="mt-1 text-[12px] text-inkfaint">
          {total > 0 ? `쌓인 하루 ${total}일` : '아직 쌓인 하루가 없어요'}
        </p>
      </header>

      <div className="flex gap-1.5">
        {(['목록', '달력', '사진'] as View[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setView(name)}
            className={`chip flex-1 py-2 ${
              view === name ? 'bg-ink text-canvas' : 'bg-surface text-inkdim shadow-soft'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {view === '목록' && (
        <>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="적어둔 말로 찾기 — 국수, 산책, 엄마"
            className="field bg-surface shadow-soft focus:bg-surface"
          />

          {topTags.length > 0 && (
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
              {topTags.map(({ tag: name, count }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTag(tag === name ? null : name)}
                  className={`chip shrink-0 ${
                    tag === name ? 'bg-peach text-white' : 'bg-surface text-inkdim shadow-soft'
                  }`}
                >
                  {name}
                  <span className={tag === name ? 'ml-1 text-white/70' : 'ml-1 text-inkfaint'}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {found.length === 0 ? (
            <Empty
              text={
                total === 0
                  ? '오늘 몇 줄만 적어두면 여기에 쌓여요.'
                  : '찾는 말이 있는 날이 없어요.'
              }
            />
          ) : (
            <div className="space-y-2.5">
              {found.map((entry) => (
                <DayCard key={entry.date} entry={entry} onOpen={() => onOpenDay(entry.date)} />
              ))}
            </div>
          )}
        </>
      )}

      {view === '달력' && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="지난 달"
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="h-8 w-8 rounded-pill bg-sunken text-inkdim"
            >
              ‹
            </button>
            <span className="text-[15px] font-semibold">{formatMonth(`${month}-01`)}</span>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="h-8 w-8 rounded-pill bg-sunken text-inkdim"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-inkfaint">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthGrid(month).map((date, index) => {
              if (!date) return <span key={`blank-${index}`} />
              const entry = diary.entries[date]
              const mood = moodOf(entry?.mood ?? null)
              const isToday = date === todayKey()
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onOpenDay(date)}
                  className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-[12px] text-[12px] ${
                    entry ? 'bg-peach-soft text-peach-deep' : 'bg-sunken/40 text-inkfaint'
                  } ${isToday ? 'ring-2 ring-ink/20' : ''}`}
                >
                  <span>{Number(date.slice(8))}</span>
                  {mood ? (
                    <span className="text-[11px] leading-none">{mood.emoji}</span>
                  ) : entry ? (
                    <span className="h-1 w-1 rounded-full bg-peach" />
                  ) : null}
                </button>
              )
            })}
          </div>

          <p className="text-center text-[12px] text-inkfaint">
            빈 날을 눌러도 돼요. 지난 하루도 그때로 적힙니다.
          </p>
        </section>
      )}

      {view === '사진' &&
        (photos.length === 0 ? (
          <Empty text="사진을 넣은 날이 아직 없어요." />
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo, index) => (
              <PhotoThumb
                key={photo.id}
                id={photo.id}
                onClick={() => onOpenPhoto(index)}
                className="aspect-square w-full rounded-[12px]"
              />
            ))}
          </div>
        ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-card bg-surface px-4 py-10 text-center text-[13px] leading-relaxed text-inkfaint shadow-soft">
      {text}
    </p>
  )
}
