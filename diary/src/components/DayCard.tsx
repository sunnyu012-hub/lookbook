import { formatDay, relativeDay } from '../lib/date'
import { moodOf, PROMPT_META } from '../lib/prompts'
import { PROMPTS, type DayEntry } from '../lib/types'
import { PhotoThumb } from './PhotoThumb'

type Props = {
  entry: DayEntry
  onOpen: () => void
  /** '한 달 전 오늘' 처럼 왜 여기 있는지 알려주는 말 */
  badge?: string
}

/** 목록에 서는 하루 한 장. 눌러서 그날로 들어간다. */
export function DayCard({ entry, onOpen, badge }: Props) {
  const mood = moodOf(entry.mood)
  const written = PROMPTS.filter((key) => entry[key].trim())

  return (
    <button
      type="button"
      onClick={onOpen}
      className="card w-full space-y-2.5 text-left active:bg-sunken/40"
    >
      <div className="flex items-center gap-2">
        <span className="font-date text-[13px] text-inkdim">{formatDay(entry.date)}</span>
        {badge ? (
          <span className="chip bg-plum-soft px-2 py-1 text-[11px] text-plum-deep">{badge}</span>
        ) : (
          <span className="text-[12px] text-inkfaint">{relativeDay(entry.date)}</span>
        )}
        {mood && <span className="ml-auto text-[17px] leading-none">{mood.emoji}</span>}
      </div>

      {entry.did.length > 0 && (
        <p className="text-[14px] leading-relaxed text-ink">
          {entry.did.slice(0, 3).join(' · ')}
          {entry.did.length > 3 && <span className="text-inkfaint"> +{entry.did.length - 3}</span>}
        </p>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.slice(0, 6).map((tag) => (
            <span key={tag} className="chip bg-sunken/70 px-2 py-1 text-[11px] text-inkdim">
              {tag}
            </span>
          ))}
        </div>
      )}

      {entry.note.trim() && (
        <p className="line-clamp-3 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-inkdim">
          {entry.note.trim()}
        </p>
      )}

      {entry.photos.length > 0 && (
        <div className="flex gap-1.5">
          {entry.photos.slice(0, 4).map((id) => (
            <PhotoThumb key={id} id={id} className="h-16 w-16 rounded-[12px]" />
          ))}
        </div>
      )}

      {/* 어느 칸을 채웠는지 점으로. 숫자로 재촉하지 않고 모양만 보여준다 */}
      {written.length > 0 && (
        <div className="flex items-center gap-1.5 pt-0.5">
          {PROMPTS.map((key) => (
            <span
              key={key}
              title={PROMPT_META[key].label}
              className={`h-1.5 w-1.5 rounded-full ${
                entry[key].trim() ? PROMPT_META[key].dot : 'bg-line'
              }`}
            />
          ))}
        </div>
      )}
    </button>
  )
}
