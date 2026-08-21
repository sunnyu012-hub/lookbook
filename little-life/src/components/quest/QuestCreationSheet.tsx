import { useEffect, useMemo, useState } from 'react'
import type { Category, Difficulty, Quest, QuestDraft } from '@/types'
import { CATEGORIES, DIFFICULTIES } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { DIFFICULTY_EXP, DIFFICULTY_LABEL } from '@/lib/difficulty'
import { categoryStyle } from '@/lib/categories'
import { CATEGORY_BADGE, DIFFICULTY_BADGE } from '@/lib/assets'
import { classifyQuest, suggestQuests, type Suggestion } from '@/lib/suggest'
import { cn } from '@/components/ui/cn'
import { QuestSuggestions } from './QuestSuggestions'

interface QuestCreationSheetProps {
  open: boolean
  onClose: () => void
  onCreate: (draft: QuestDraft) => void
  /** 추천과 자동 분류에 쓰는 지난 기록 */
  history: Quest[]
}

const TITLE_MAX = 60
const DEFAULT_DIFFICULTY: Difficulty = 'NORMAL'

export function QuestCreationSheet({
  open,
  onClose,
  onCreate,
  history,
}: QuestCreationSheetProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY)

  /**
   * 사용자가 직접 골랐는지.
   *
   * 한 번이라도 손대면 자동 채우기를 멈춘다.
   * 골라놓은 걸 타이핑할 때마다 앱이 되돌려버리면 그것만큼 짜증나는 게 없다.
   */
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [difficultyTouched, setDifficultyTouched] = useState(false)

  const suggestions = useMemo(
    () => (open ? suggestQuests(history) : []),
    [open, history],
  )

  // 시트를 닫았다 다시 열면 늘 깨끗한 상태에서 시작한다.
  useEffect(() => {
    if (!open) return
    setTitle('')
    setCategory(null)
    setDifficulty(DEFAULT_DIFFICULTY)
    setCategoryTouched(false)
    setDifficultyTouched(false)
  }, [open])

  // 제목을 치는 동안 카테고리·난이도를 대신 골라준다.
  useEffect(() => {
    if (!open) return
    if (categoryTouched && difficultyTouched) return

    const guess = classifyQuest(title, history)
    if (!categoryTouched) setCategory(guess.category)
    if (!difficultyTouched) setDifficulty(guess.difficulty)
  }, [open, title, history, categoryTouched, difficultyTouched])

  const guessSource = useMemo(
    () => classifyQuest(title, history).from,
    [title, history],
  )
  const autoCategory = !categoryTouched && category !== null
  const autoDifficulty = !difficultyTouched && title.trim().length > 0

  const pickSuggestion = (suggestion: Suggestion) => {
    setTitle(suggestion.title)
    setCategory(suggestion.category)
    setDifficulty(suggestion.difficulty)
    // 눌러서 고른 값이니 그대로 둔다
    setCategoryTouched(true)
    setDifficultyTouched(true)
  }

  const canSubmit = title.trim().length > 0 && category !== null

  const submit = () => {
    if (!canSubmit || !category) return
    onCreate({ title: title.trim(), category, difficulty })
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="새 퀘스트 만들기">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">새 퀘스트 만들기</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
            오늘 할 일을 작은 모험으로 만들어봐.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-inkfaint active:scale-90"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
            <path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <QuestSuggestions suggestions={suggestions} onPick={pickSuggestion} />

      <div className="space-y-6">
        <div>
          <label htmlFor="quest-name" className="mb-2 block text-[13px] font-medium text-inkdim">
            Quest name
          </label>
          <input
            id="quest-name"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            placeholder="뭘 해보고 싶어?"
            autoComplete="off"
            className="h-13 min-h-[52px] w-full rounded-btn border border-line bg-canvas px-4 text-ink outline-none transition-colors placeholder:text-inkfaint focus:border-inkfaint"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <p className="text-[13px] font-medium text-inkdim">Category</p>
            {autoCategory && <AutoTag remembered={guessSource === 'history'} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const style = categoryStyle(c)
              const active = c === category
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCategory(c)
                    setCategoryTouched(true)
                  }}
                  className={cn(
                    'inline-flex h-11 items-center gap-1 rounded-pill py-1 pl-1.5 pr-3.5 font-game text-[12px] tracking-[0.08em]',
                    'transition-transform duration-150 ease-out active:scale-[0.96]',
                    active
                      ? cn(style.chip, style.text, 'ring-[1.5px] ring-inset', style.ring)
                      : 'bg-canvas text-inkfaint ring-1 ring-inset ring-line',
                  )}
                >
                  <img
                    src={CATEGORY_BADGE[c]}
                    alt=""
                    aria-hidden
                    className={cn('h-7 w-7 object-contain', !active && 'opacity-60')}
                  />
                  {c}
                </button>
              )
            })}
          </div>
          <p className="mt-2 min-h-[18px] text-[12px] text-inkfaint">
            {category ? categoryStyle(category).hint : '어떤 결의 일인지 하나 골라줘.'}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <p className="text-[13px] font-medium text-inkdim">Difficulty</p>
            {autoDifficulty && <AutoTag remembered={guessSource === 'history'} />}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => {
              const active = d === difficulty
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDifficulty(d)
                    setDifficultyTouched(true)
                  }}
                  className={cn(
                    'min-h-[104px] rounded-btn border py-3 text-center transition-transform duration-150 ease-out active:scale-[0.97]',
                    active
                      ? 'border-coral bg-coral-soft text-ink ring-[1.5px] ring-inset ring-coral'
                      : 'border-line bg-canvas text-inkdim',
                  )}
                >
                  <img
                    src={DIFFICULTY_BADGE[d]}
                    alt=""
                    aria-hidden
                    className={cn('mx-auto h-11 w-11 object-contain', !active && 'opacity-65')}
                  />
                  <span className="mt-1 block text-[13.5px] font-medium">{DIFFICULTY_LABEL[d]}</span>
                  <span
                    className={cn(
                      'mt-1 block font-game text-[11px] tracking-[0.04em]',
                      active ? 'text-coral-deep' : 'text-inkfaint',
                    )}
                  >
                    +{DIFFICULTY_EXP[d]} EXP
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <Button size="lg" className="w-full" disabled={!canSubmit} onClick={submit}>
            Create Quest
          </Button>
          <Button variant="quiet" size="sm" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

/** 이 값은 앱이 대신 골라준 것이고, 눌러서 바꿀 수 있다는 표시. */
function AutoTag({ remembered }: { remembered: boolean }) {
  return (
    <span className="inline-flex h-5 items-center rounded-pill bg-coral-soft px-2 text-[10px] text-coral-deep">
      {remembered ? '기억해둔 것' : '자동'}
    </span>
  )
}
