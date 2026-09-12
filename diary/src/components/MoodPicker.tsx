import { MOODS } from '../lib/prompts'

type Props = {
  value: number | null
  onChange: (value: number | null) => void
}

/** 오늘 하루 기분. 안 고르고 넘어가도 되고, 다시 누르면 지워진다. */
export function MoodPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-stretch gap-1.5">
      {MOODS.map((mood) => {
        const on = value === mood.value
        return (
          <button
            key={mood.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? null : mood.value)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-btn py-2.5 transition-colors ${
              on ? 'bg-peach-soft' : 'bg-sunken/50 active:bg-sunken'
            }`}
          >
            <span className={`text-[22px] leading-none ${on ? '' : 'opacity-55 grayscale'}`}>
              {mood.emoji}
            </span>
            <span className={`text-[11px] ${on ? 'text-peach-deep' : 'text-inkfaint'}`}>
              {mood.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
