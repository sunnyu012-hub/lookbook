import type { Suggestion } from '@/lib/suggest'
import { CATEGORY_BADGE } from '@/lib/assets'
import { categoryStyle } from '@/lib/categories'
import { cn } from '@/components/ui/cn'

interface QuestSuggestionsProps {
  suggestions: Suggestion[]
  onPick: (suggestion: Suggestion) => void
}

/**
 * 시트 맨 위에 놓는 한 줄 추천.
 *
 * 누르면 제목·카테고리·난이도가 한꺼번에 채워진다.
 * 타이핑이 귀찮아서 앱을 안 열게 되는 걸 막는 게 목적이라, 가장 위에 둔다.
 */
export function QuestSuggestions({ suggestions, onPick }: QuestSuggestionsProps) {
  if (suggestions.length === 0) return null

  // 내 기록에서 온 게 하나라도 있으면 그렇게 말해준다
  const fromHistory = suggestions.some((s) => s.reason === 'often')

  return (
    <div className="mb-5">
      <p className="mb-2 text-[13px] font-medium text-inkdim">
        {fromHistory ? '자주 하던 것' : '이런 건 어때?'}
      </p>

      <div
        className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="추천 퀘스트"
      >
        <div className="flex w-max gap-1.5 pb-0.5">
          {suggestions.map((suggestion) => {
            const style = categoryStyle(suggestion.category)
            return (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => onPick(suggestion)}
                className={cn(
                  'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill py-1 pl-1.5 pr-4',
                  'ring-1 ring-inset transition-transform duration-150 ease-out active:scale-[0.96]',
                  style.chip,
                  style.ring,
                )}
              >
                <img
                  src={CATEGORY_BADGE[suggestion.category]}
                  alt=""
                  aria-hidden
                  className="h-7 w-7 object-contain"
                />
                <span className="text-[13.5px] text-ink">{suggestion.title}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
