import { useMemo, useState } from 'react'
import type { Preferences } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { QuestRow } from '@/components/quests/QuestRow'
import type { QuestStore } from '@/hooks/useQuests'
import { CATEGORIES, CATEGORY_META } from '@/lib/quests/categories'
import { QUEST_POOL } from '@/lib/quests/pool'
import { quickXpQuests, recommend, searchQuests } from '@/lib/quests/master'
import { XP_BY_DIFFICULTY, type Difficulty, type Quest, type QuestCategory } from '@/lib/quests/types'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

type Tab = 'for-you' | 'quick' | 'favorites' | 'all' | 'custom'

const TABS: { key: Tab; label: string; ko: string }[] = [
  { key: 'for-you', label: 'For you', ko: '오늘 어울리는' },
  { key: 'quick', label: 'Quick XP', ko: '1~5분' },
  { key: 'favorites', label: 'Favorites', ko: '즐겨찾기' },
  { key: 'all', label: 'All', ko: '전체' },
  { key: 'custom', label: 'Mine', ko: '내가 만든' },
]

interface Props {
  questStore: QuestStore
  prefs: Preferences
  mode: import('@/types').EnergyMode | null
  events: string[]
  onFavorite: (questId: string) => void
  onClose: () => void
}

/** QUEST BOARD — 길드 게시판처럼 골라서 오늘 목록에 넣는다 */
export function QuestBoardPage({ questStore, prefs, mode, events, onFavorite, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('for-you')
  const [category, setCategory] = useState<QuestCategory | null>(null)
  const [query, setQuery] = useState('')

  const { picks, customQuests, previewXp, countOf, addPick, removePick } = questStore
  const inToday = useMemo(() => new Set(picks), [picks])
  const favorites = prefs.favoriteQuests ?? []

  const list: Quest[] = useMemo(() => {
    if (query.trim()) return searchQuests(query, customQuests).slice(0, 60)

    switch (tab) {
      case 'for-you':
        return recommend(
          { mode, events, exclude: picks, custom: customQuests, seed: 7, favoriteCategories: [] },
          14,
        )
      case 'quick':
        return quickXpQuests(picks, 30)
      case 'favorites':
        return favorites
          .map((id) => [...QUEST_POOL, ...customQuests].find((q) => q.id === id))
          .filter((q): q is Quest => Boolean(q))
      case 'custom':
        return customQuests
      case 'all':
      default: {
        const pool = [...QUEST_POOL, ...customQuests]
        return category ? pool.filter((q) => q.category === category) : pool.slice(0, 60)
      }
    }
  }, [tab, category, query, mode, events, picks, customQuests, favorites])

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="돌아가기"
          className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard"
        >
          ‹
        </button>
        <h1 className="font-pixel text-[15px] uppercase leading-none tracking-[0.04em]">
          Quest board
        </h1>
        <PixelSparkle size={10} />
        <span className="plabel ml-auto">오늘 {picks.length}개</span>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="퀘스트 검색 (청소, 성현, 클라이밍…)"
        aria-label="퀘스트 검색"
        className="w-full rounded-px3 border-[1.5px] border-border bg-ivory px-3 py-2.5 text-[13.5px] placeholder:text-inkfaint focus:outline-none"
      />

      {!query.trim() && (
        <>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={tab === t.key}
                onClick={() => {
                  haptic()
                  setTab(t.key)
                  setCategory(null)
                }}
                className={cn(
                  'shrink-0 rounded-px3 border-[1.5px] px-2.5 py-1.5 text-center',
                  tab === t.key
                    ? 'border-pinkdeep bg-pinksoft'
                    : 'border-border bg-cream text-inkdim',
                )}
              >
                <span className="block font-pixel text-[10px] uppercase leading-none">{t.label}</span>
                <span className="mt-1 block text-[10px] leading-none text-inkdim">{t.ko}</span>
              </button>
            ))}
          </div>

          {tab === 'all' && (
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={category === c.key}
                  onClick={() => {
                    haptic()
                    setCategory(category === c.key ? null : c.key)
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-px3 border-[1.5px] px-2.5 py-1.5 text-[12px]',
                    category === c.key
                      ? 'border-pinkdeep bg-pinksoft'
                      : 'border-border bg-cream text-inkdim',
                  )}
                >
                  <PixelImage asset={c.icon} height={15} />
                  {c.ko}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'quick' && !query.trim() && (
        <p className="ko px-1">
          1~5분이면 끝나는 것들이에요. XP 조금만 더 모으고 싶을 때 골라 보세요.
        </p>
      )}

      <PixelPanel>
        {list.length === 0 ? (
          <p className="body-ko py-6 text-center text-inkdim">
            {tab === 'favorites'
              ? '아직 즐겨찾기한 퀘스트가 없어요. 하트를 눌러 저장해 두세요.'
              : tab === 'custom'
                ? '직접 만든 퀘스트가 없어요. 아래에서 만들 수 있어요.'
                : '찾는 퀘스트가 없어요.'}
          </p>
        ) : (
          <ul className="divide-y divide-dashed divide-border/60">
            {list.map((quest) => (
              <QuestRow
                key={quest.id}
                quest={quest}
                count={countOf(quest.id)}
                gain={previewXp(quest)}
                prefs={prefs}
                favorite={favorites.includes(quest.id)}
                onFavorite={() => onFavorite(quest.id)}
                onToggle={() => undefined}
                action={{
                  label: '+ Add',
                  done: inToday.has(quest.id),
                  onClick: () =>
                    inToday.has(quest.id) ? removePick(quest.id) : addPick(quest.id),
                }}
              />
            ))}
          </ul>
        )}
      </PixelPanel>

      <CustomQuestForm questStore={questStore} />
    </div>
  )
}

const DIFFICULTIES: Difficulty[] = ['tiny', 'easy', 'normal', 'big']
const DIFF_KO: Record<Difficulty, string> = {
  tiny: '1~2분',
  easy: '5분',
  normal: '10~20분',
  big: '조금 큰 일',
}

function CustomQuestForm({ questStore }: { questStore: QuestStore }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<QuestCategory>('life')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [repeatable, setRepeatable] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          haptic()
          setOpen(true)
        }}
        className="press flex w-full items-center justify-center gap-2 rounded-px3 border-[1.5px] border-dashed border-borderdeep py-2.5 text-[12.5px] text-inkdim"
      >
        <PixelImage asset={icons.save} height={15} />내 퀘스트 만들기
      </button>
    )
  }

  const submit = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      const saved = await questStore.addCustom({
        title: title.trim(),
        category,
        difficulty,
        isRepeatable: repeatable,
      })
      questStore.addPick(saved.id)
      setTitle('')
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PixelPanel title="New quest" icon={icons.save}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={40}
        placeholder="무슨 일을 하고 싶나요?"
        aria-label="퀘스트 이름"
        className="w-full border-b border-dashed border-border bg-transparent pb-1.5 text-[14px] placeholder:text-inkfaint focus:outline-none"
      />

      <p className="plabel mt-3 mb-1">Category</p>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={category === c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-px3 border-[1.5px] px-2.5 py-1.5 text-[12px]',
              category === c.key ? 'border-pinkdeep bg-pinksoft' : 'border-border bg-cream text-inkdim',
            )}
          >
            <PixelImage asset={c.icon} height={14} />
            {c.ko}
          </button>
        ))}
      </div>

      <p className="plabel mt-3 mb-1">얼마나 걸려요?</p>
      <div className="flex gap-1.5">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={difficulty === d}
            onClick={() => setDifficulty(d)}
            className={cn(
              'flex-1 rounded-px3 border-[1.5px] py-1.5 text-[11.5px]',
              difficulty === d ? 'border-pinkdeep bg-pinksoft' : 'border-border bg-cream text-inkdim',
            )}
          >
            {DIFF_KO[d]}
            <span className="mt-0.5 block font-pixel text-[9px] text-peachdeep">
              +{XP_BY_DIFFICULTY[d]}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-inkfaint">
        XP 는 걸리는 시간에 따라 정해져요. 직접 넣을 수는 없어요.
      </p>

      <label className="mt-2 flex items-center gap-2 text-[12.5px]">
        <input
          type="checkbox"
          checked={repeatable}
          onChange={(e) => setRepeatable(e.target.checked)}
          className="h-4 w-4"
        />
        하루에 여러 번 할 수 있는 퀘스트
      </label>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || !title.trim()}
          onClick={() => void submit()}
          className="press flex-1 rounded-px3 border-[1.5px] border-pinkdeep bg-pink py-2.5 font-pixel text-[11px] uppercase text-white disabled:opacity-45"
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="press rounded-px3 border-[1.5px] border-border bg-ivory px-4 py-2.5 font-pixel text-[11px] uppercase text-inkdim"
        >
          Cancel
        </button>
      </div>
    </PixelPanel>
  )
}

export { CATEGORY_META }
