/**
 * Quick Log composer — 기분을 고르면 펼쳐지는 작은 입력창.
 *
 * 기분 하나만 고르고 저장을 눌러도 끝난다. 나머지는 전부 접혀 있다.
 * 설문지처럼 보이면 다음부터 안 쓰게 되기 때문에, 처음 보이는 건 한마디 칸 하나뿐이다.
 */
import { useEffect, useRef, useState } from 'react'
import type { Mood, QuickLog, QuickLogInput } from '@/lib/os2/types'
import type { MyTagStore } from '@/hooks/useMyTags'
import { MOOD_BY_VALUE, MoodPicker } from './MoodPicker'
import { TagChip, TagPicker } from './TagPicker'
import { PhotoField } from './PhotoField'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

/** 에너지는 물어보지 않는다. 열었을 때만 나온다 */
const ENERGY_STEPS: { value: number; mark: string; label: string }[] = [
  { value: 1, mark: '▁', label: '아주 낮음' },
  { value: 2, mark: '▃', label: '낮음' },
  { value: 3, mark: '▅', label: '보통' },
  { value: 4, mark: '▇', label: '높음' },
  { value: 5, mark: '█', label: '아주 높음' },
]

export interface ComposerValue extends QuickLogInput {
  mood: Mood
}

interface Props {
  mood: Mood
  /** 고칠 때 넘어오는 기존 기록 */
  existing?: QuickLog | null
  tagStore: MyTagStore
  onCancel: () => void
  onSave: (value: ComposerValue, photo: File | null) => Promise<void>
  saveLabel?: string
}

export function QuickLogComposer({
  mood: initialMood,
  existing,
  tagStore,
  onCancel,
  onSave,
  saveLabel = '저장',
}: Props) {
  const [mood, setMood] = useState<Mood>(initialMood)
  const [text, setText] = useState(existing?.text ?? '')
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null)
  const [tagIds, setTagIds] = useState<string[]>(existing?.myTagIds ?? [])
  const [photo, setPhoto] = useState<File | null>(null)

  const [showEnergy, setShowEnergy] = useState(existing?.energy != null)
  const [showTags, setShowTags] = useState((existing?.myTagIds ?? []).length > 0)
  const [showPhoto, setShowPhoto] = useState(Boolean(existing?.photoPath))

  const [saving, setSaving] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // 기분을 고르자마자 바로 적을 수 있게 — 다만 키보드가 튀어나오면
  // 화면이 흔들려서, 새로 쓸 때만 커서를 준다
  useEffect(() => {
    if (!existing) textRef.current?.focus({ preventScroll: true })
  }, [existing])

  const meta = MOOD_BY_VALUE[mood]

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onSave(
        {
          mood,
          text: text.trim() || null,
          energy,
          myTagIds: tagIds,
          loggedAt: existing?.loggedAt,
        },
        photo,
      )
    } finally {
      setSaving(false)
    }
  }

  const selectedTags = tagIds
    .map((id) => tagStore.resolve(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))

  return (
    <div
      className="rounded-px4 border-[1.5px] px-3.5 py-3 shadow-hard"
      style={{ borderColor: `${meta.accent}66`, backgroundColor: meta.tint }}
    >
      {/* 고른 기분 — 여기서 바꿔도 된다 */}
      <div className="mb-2.5">
        <MoodPicker selected={mood} onPick={setMood} size="sm" />
      </div>

      <textarea
        ref={textRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={280}
        placeholder="한마디 남기기…"
        className="w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-inkfaint"
      />

      {/*
        고른 태그 요약 — 피커가 열려 있으면 감춘다.
        피커 안에서도 고른 게 표시되기 때문에 둘 다 두면 같은 태그가 두 번 보인다.
      */}
      {!showTags && selectedTags.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              selected
              onRemove={() => setTagIds((prev) => prev.filter((id) => id !== tag.id))}
            />
          ))}
        </div>
      )}

      {showEnergy && (
        <div className="mb-2 mt-1">
          <p className="plabel mb-1.5">ENERGY</p>
          <div role="radiogroup" aria-label="에너지" className="flex gap-1.5">
            {ENERGY_STEPS.map((step) => {
              const on = energy === step.value
              return (
                <button
                  key={step.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={step.label}
                  onClick={() => {
                    haptic()
                    setEnergy(on ? null : step.value)
                  }}
                  className={cn(
                    'press min-h-[40px] flex-1 rounded-px3 border-[1.5px] font-pixel text-[15px] leading-none',
                    on
                      ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                      : 'border-border bg-ivory/70 text-inkfaint',
                  )}
                >
                  <span aria-hidden>{step.mark}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {showPhoto && (
        <div className="mb-2 mt-1">
          <PhotoField
            file={photo}
            existingPath={existing?.photoPath ?? null}
            onPick={setPhoto}
          />
        </div>
      )}

      {showTags && (
        <div className="mb-2 mt-1">
          <TagPicker store={tagStore} selected={tagIds} onChange={setTagIds} />
        </div>
      )}

      {/* 더 붙이기 — 안 누르면 안 보인다 */}
      <div className="mt-1 flex flex-wrap gap-1.5">
        {!showPhoto && <AddButton label="+ 사진" onClick={() => setShowPhoto(true)} />}
        {!showEnergy && <AddButton label="+ 에너지" onClick={() => setShowEnergy(true)} />}
        {!showTags && <AddButton label="+ 태그" onClick={() => setShowTags(true)} />}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="press rounded-px3 border-[1.5px] border-border bg-ivory px-4 py-2.5 font-pixel text-[10px] uppercase text-inkdim"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => {
            haptic()
            void save()
          }}
          disabled={saving}
          className="press flex flex-1 items-center justify-center gap-1.5 rounded-px3 border-[1.5px] border-pinkdeep bg-pink py-2.5 font-pixel text-[11px] uppercase text-white shadow-hard disabled:opacity-70"
        >
          <PixelSparkle size={10} />
          {saveLabel}
        </button>
      </div>
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic()
        onClick()
      }}
      className="press rounded-full border-[1.5px] border-dashed border-borderdeep bg-ivory/60 px-2.5 py-1.5 text-[12px] text-inkdim"
    >
      {label}
    </button>
  )
}
