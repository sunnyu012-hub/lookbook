import { useEffect, useState } from 'react'
import type { Category, Difficulty, QuestDraft } from '@/types'
import { CATEGORIES, DIFFICULTIES } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { DIFFICULTY_EXP, DIFFICULTY_LABEL } from '@/lib/difficulty'
import { categoryStyle } from '@/lib/categories'
import { cn } from '@/components/ui/cn'

interface AddQuestSheetProps {
  open: boolean
  onClose: () => void
  onCreate: (draft: QuestDraft) => void
}

const DEFAULT_CATEGORY: Category = 'LIFE'
const DEFAULT_DIFFICULTY: Difficulty = 'NORMAL'

export function AddQuestSheet({ open, onClose, onCreate }: AddQuestSheetProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY)
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY)

  // 시트를 닫았다 다시 열면 늘 깨끗한 상태에서 시작한다.
  useEffect(() => {
    if (!open) return
    setTitle('')
    setCategory(DEFAULT_CATEGORY)
    setDifficulty(DEFAULT_DIFFICULTY)
  }, [open])

  const canSubmit = title.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    onCreate({ title: title.trim(), category, difficulty })
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="새 퀘스트">
      <div className="space-y-6">
        <div>
          <label htmlFor="quest-name" className="mb-2 block text-[13px] font-medium text-inkdim">
            Quest name
          </label>
          <input
            id="quest-name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            placeholder="오늘 뭘 해볼까요?"
            autoComplete="off"
            className="h-12 w-full rounded-2xl border border-line bg-ivory px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-inkfaint focus:border-inkfaint"
          />
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-inkdim">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const style = categoryStyle(c)
              const active = c === category
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-pill px-3.5 font-game text-[12px] tracking-[0.1em] transition-all duration-150 ease-out active:scale-[0.96]',
                    active
                      ? cn(style.chip, style.text, 'ring-[1.5px] ring-inset ring-current')
                      : 'bg-ivory text-inkfaint ring-1 ring-inset ring-line',
                  )}
                >
                  {c}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[12px] text-inkfaint">{categoryStyle(category).hint}</p>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-inkdim">Difficulty</p>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => {
              const active = d === difficulty
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    'rounded-2xl border py-3 text-center transition-all duration-150 ease-out active:scale-[0.97]',
                    active ? 'border-ink bg-ink text-milk' : 'border-line bg-ivory text-inkdim',
                  )}
                >
                  <span className="block text-[14px] font-medium">{DIFFICULTY_LABEL[d]}</span>
                  <span
                    className={cn(
                      'mt-0.5 block font-game text-[11px] tracking-[0.06em]',
                      active ? 'text-milk/70' : 'text-inkfaint',
                    )}
                  >
                    {DIFFICULTY_EXP[d]} EXP
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <Button size="lg" className="w-full" disabled={!canSubmit} onClick={submit}>
          Create Quest
        </Button>
      </div>
    </BottomSheet>
  )
}
