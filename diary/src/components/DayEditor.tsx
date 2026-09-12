import { AutoTextarea } from './AutoTextarea'
import { DidList } from './DidList'
import { MoodPicker } from './MoodPicker'
import { PhotoRow } from './PhotoRow'
import { TagPicker } from './TagPicker'
import { PROMPT_META } from '../lib/prompts'
import { PROMPTS, type DayEntry, type Entries, type PromptKey } from '../lib/types'

type Props = {
  entry: DayEntry
  entries: Entries
  onPatch: (change: Partial<Omit<DayEntry, 'date'>>) => void
  onOpenPhoto?: (id: string) => void
}

/**
 * 하루를 적는 자리.
 *
 * 오늘도 지난날도 같은 화면으로 적는다 — 어제 못 쓴 사람이
 * "지난 건 못 쓰는 앱" 을 만나면 거기서 그만둔다.
 *
 * 순서에 뜻이 있다: 한 일 → 잘한 것 → 감사 → 기대 → 내일의 나 → 일기.
 * 사실에서 시작해서 마음으로, 오늘에서 내일로 간다.
 */
export function DayEditor({ entry, entries, onPatch, onOpenPhoto }: Props) {
  return (
    <div className="space-y-3">
      <section className="card space-y-3">
        <Label emoji="🌙" text="오늘 기분" />
        <MoodPicker value={entry.mood} onChange={(mood) => onPatch({ mood })} />
      </section>

      <section className="card space-y-3">
        <Label emoji="🧺" text="오늘 뭐 했어?" note="한 줄씩 담거나, 태그만 눌러도 돼요" />
        <DidList items={entry.did} onChange={(did) => onPatch({ did })} />
        <TagPicker
          entries={entries}
          selected={entry.tags}
          onChange={(tags) => onPatch({ tags })}
        />
      </section>

      {PROMPTS.map((key) => (
        <PromptField key={key} promptKey={key} value={entry[key]} onPatch={onPatch} />
      ))}

      <section className="card space-y-3">
        <Label emoji="📷" text="사진" note="그날을 떠올리게 하는 한두 장" />
        <PhotoRow
          photos={entry.photos}
          onChange={(photos) => onPatch({ photos })}
          onOpen={onOpenPhoto}
        />
      </section>
    </div>
  )
}

function PromptField({
  promptKey,
  value,
  onPatch,
}: {
  promptKey: PromptKey
  value: string
  onPatch: Props['onPatch']
}) {
  const meta = PROMPT_META[promptKey]
  return (
    <section className={`rounded-card p-4 ${meta.tint} space-y-2.5`}>
      <Label emoji={meta.emoji} text={meta.label} />
      <AutoTextarea
        value={value}
        onChange={(event) => onPatch({ [promptKey]: event.target.value })}
        placeholder={meta.hint}
        className="bg-surface/70 focus:bg-surface"
      />
    </section>
  )
}

function Label({ emoji, text, note }: { emoji: string; text: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <h3 className="text-[15px] font-semibold">
        <span className="mr-1.5">{emoji}</span>
        {text}
      </h3>
      {note && <span className="text-[12px] text-inkfaint">{note}</span>}
    </div>
  )
}
