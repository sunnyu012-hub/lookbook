import { useMemo, useState } from 'react'
import type {
  AppState,
  QuestDraft,
  QuestPackDef,
  QuestUsageProfile,
  Recommendation,
} from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import {
  REASON_LABEL,
  hasEnoughHistory,
  quickAdd,
  recommendQuests,
  type QuickAddKind,
} from '@/lib/library/recommend'
import { QUEST_PACKS } from '@/lib/library/packs'
import { SEARCH_KEYWORDS, searchLibrary, type SearchHit } from '@/lib/library/search'
import { questKeyOf, type ProfileSeed } from '@/lib/library/usage'
import { CATEGORY_LABEL, DIFFICULTY_KO } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

/**
 * 새 퀘스트를 고르는 자리.
 *
 * 처음에는 "지금 추천 → 자주 쓰는 것 → 세트 → 직접 만들기" 순이었다.
 * 타이핑이 제일 손이 많이 가니까 맨 아래에 둔 것인데, 쓰다 보니 반대였다 —
 * 적을 것이 이미 정해져 있을 때가 대부분이라 매번 아래까지 내려가야 했다.
 * 그래서 직접 만들기를 맨 위로 올렸다. 검색 중에도 자리를 지킨다.
 *
 * 추천은 어디까지나 추천이다. 여기서 퀘스트가 저절로 만들어지는 일은 없다.
 */

interface AddQuestHubProps {
  open: boolean
  state: AppState
  onClose: () => void
  onAdd: (draft: QuestDraft) => void
  onOpenPack: (pack: QuestPackDef) => void
  onOpenCustom: () => void
  onFavorite: (seed: ProfileSeed) => void
  onHideToday: (seed: ProfileSeed) => void
  onDismiss: (seed: ProfileSeed) => void
}

export function AddQuestHub({
  open,
  state,
  onClose,
  onAdd,
  onOpenPack,
  onOpenCustom,
  onFavorite,
  onHideToday,
  onDismiss,
}: AddQuestHubProps) {
  const [query, setQuery] = useState('')
  const [quickKind, setQuickKind] = useState<QuickAddKind>('FREQUENT')
  const [menuKey, setMenuKey] = useState<string | null>(null)

  const recommendations = useMemo(
    () =>
      recommendQuests({
        profiles: state.usageProfiles,
        quests: state.quests,
        routines: state.routines,
        personalized: state.recommendSettings.personalized,
      }),
    [state.usageProfiles, state.quests, state.routines, state.recommendSettings.personalized],
  )

  const quick = useMemo(
    () => quickAdd(state.usageProfiles, quickKind),
    [state.usageProfiles, quickKind],
  )

  const results = useMemo(
    () => searchLibrary(query, state.usageProfiles, state.routines),
    [query, state.usageProfiles, state.routines],
  )

  const personalized = state.recommendSettings.personalized && hasEnoughHistory(state.usageProfiles)
  const searching = query.trim().length > 0

  if (!open) return null

  const addFrom = (item: {
    title: string
    category: QuestDraft['category']
    difficulty: QuestDraft['difficulty']
    presetId: string | null
  }) => {
    onAdd({
      title: item.title,
      category: item.category,
      difficulty: item.difficulty,
      ...(item.presetId ? { sourcePresetId: item.presetId } : {}),
      ...(item.presetId ? { sourcePackId: item.presetId.split(':')[0] } : {}),
    })
  }

  return (
    <BottomSheet open onClose={onClose} title="새 퀘스트" fill>
      <h2 className="text-[20px] font-semibold text-ink">새 퀘스트</h2>
      <p className="mt-1 text-[13px] text-inkdim">오늘의 모험에 뭘 추가할까?</p>

      {/* 적을 것이 정해져 있으면 여기서 바로 끝난다. 검색 중에도 그대로 둔다 —
          찾다가 없으면 그 자리에서 적을 수 있어야 한다. */}
      <Button variant="soft" size="lg" className="mt-4 w-full" onClick={onOpenCustom}>
        ✏️ 직접 만들기
      </Button>

      {/* 검색.
          글자를 칠 때마다 아래 내용이 바뀌니까 입력칸은 위에 붙여둔다.
          안 붙여두면 결과가 줄어들 때 입력칸이 같이 올라가버린다. */}
      <div className="sticky top-0 z-10 -mx-5 mt-4 bg-surface px-5 pb-2 pt-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="찾아보기 — 빨래, 25분 집중 …"
          aria-label="퀘스트 검색"
          className={cn(
            'w-full rounded-btn bg-canvas px-4 py-3.5 text-[15px] text-ink',
            'outline-none ring-1 ring-inset ring-transparent placeholder:text-inkfaint',
            'focus:ring-coral',
          )}
        />
      </div>

      {!searching && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SEARCH_KEYWORDS.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => setQuery(word)}
              className="rounded-pill bg-surface px-3 py-1.5 text-[12px] text-inkdim ring-1 ring-inset ring-line"
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {searching ? (
        <SearchResults results={results} onAdd={addFrom} onOpenPack={onOpenPack} />
      ) : (
        <>
          {/* 지금 추천 */}
          <section className="mt-6">
            <SectionTitle
              title="✨ 지금 추천"
              hint={
                personalized
                  ? '자주 하던 것 몇 개랑, 아직 안 해본 것 몇 개.'
                  : '아직 취향을 알아가는 중이야 ✨'
              }
            />
            <ul className="space-y-2">
              {recommendations.map((rec) => (
                <li key={rec.questKey}>
                  <RecommendationRow
                    rec={rec}
                    menuOpen={menuKey === rec.questKey}
                    favorite={state.usageProfiles[rec.questKey]?.favorite ?? false}
                    onToggleMenu={() =>
                      setMenuKey((k) => (k === rec.questKey ? null : rec.questKey))
                    }
                    onAdd={() => addFrom(rec)}
                    onFavorite={() => {
                      onFavorite(seedOfRec(rec))
                      setMenuKey(null)
                    }}
                    onHideToday={() => {
                      onHideToday(seedOfRec(rec))
                      setMenuKey(null)
                    }}
                    onDismiss={() => {
                      onDismiss(seedOfRec(rec))
                      setMenuKey(null)
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>

          {/* 빠른 추가 */}
          <section className="mt-6">
            <SectionTitle title="⚡ 빠른 추가" />
            <div className="mb-2.5 flex gap-1 rounded-pill bg-sunken p-1">
              {(
                [
                  ['FREQUENT', '자주 사용'],
                  ['RECENT', '최근 사용'],
                  ['FAVORITE', '즐겨찾기'],
                ] as Array<[QuickAddKind, string]>
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={quickKind === kind}
                  onClick={() => setQuickKind(kind)}
                  className={cn(
                    'min-h-[36px] flex-1 rounded-pill text-[12.5px] font-medium transition-colors duration-200',
                    quickKind === kind ? 'bg-surface text-ink shadow-soft' : 'text-inkdim',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {quick.length === 0 ? (
              <p className="rounded-card border border-dashed border-line px-4 py-5 text-center text-[13px] leading-relaxed text-inkfaint">
                {quickKind === 'FAVORITE'
                  ? '★ 을 눌러두면 여기 모여.'
                  : '퀘스트를 몇 번 하다 보면 자주 쓰는 것이 여기 모여.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {quick.map((p) => (
                  <QuickChip key={p.questKey} profile={p} onAdd={() => addFrom(chipItem(p))} />
                ))}
              </div>
            )}
          </section>

          {/* 세트 */}
          <section className="mt-6">
            <SectionTitle title="📦 추천 세트" hint="고르기만 하면 한 번에 들어가." />
            <ul className="grid grid-cols-2 gap-2">
              {QUEST_PACKS.map((pack) => (
                <li key={pack.id}>
                  <button
                    type="button"
                    onClick={() => onOpenPack(pack)}
                    className={cn(
                      'flex h-full w-full flex-col items-start rounded-card border border-line bg-surface p-3 text-left',
                      'transition-transform duration-150 ease-out active:scale-[0.97]',
                    )}
                  >
                    <span className="text-[24px] leading-none">{pack.icon}</span>
                    <span className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ink">
                      {pack.name}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-inkdim">
                      {pack.description}
                    </span>
                    <span className="mt-1.5 text-[11px] text-inkfaint">{pack.items.length}개</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-6 text-center text-[11.5px] leading-relaxed text-inkfaint">
            퀘스트 사용 기록은 이 기기에서 추천 순서를 정하는 데만 써.
          </p>
        </>
      )}
    </BottomSheet>
  )
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2.5">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-0.5 text-[12px] text-inkdim">{hint}</p>}
    </div>
  )
}

function RecommendationRow({
  rec,
  favorite,
  menuOpen,
  onToggleMenu,
  onAdd,
  onFavorite,
  onHideToday,
  onDismiss,
}: {
  rec: Recommendation
  favorite: boolean
  menuOpen: boolean
  onToggleMenu: () => void
  onAdd: () => void
  onFavorite: () => void
  onHideToday: () => void
  onDismiss: () => void
}) {
  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="flex items-center gap-2 px-3.5 py-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral-soft text-[15px] text-coral-deep">
            ＋
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-medium text-ink">{rec.title}</span>
            <span className="mt-0.5 flex items-center gap-1.5">
              <span className="text-[11px] text-inkdim">{CATEGORY_LABEL[rec.category]}</span>
              <span className="text-[11px] text-inkfaint">
                {DIFFICULTY_KO[rec.difficulty]}
              </span>
              {favorite && <span className="text-[11px]">⭐</span>}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-inkfaint">{REASON_LABEL[rec.reason]}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMenu}
          aria-label={`${rec.title} 메뉴`}
          aria-expanded={menuOpen}
          className="shrink-0 rounded-full px-2 py-1 text-[16px] leading-none text-inkfaint"
        >
          ⋯
        </button>
      </div>

      {menuOpen && (
        <div className="flex flex-wrap gap-1.5 border-t border-line px-3.5 py-2.5">
          <MenuButton onClick={onFavorite}>{favorite ? '즐겨찾기 해제' : '⭐ 즐겨찾기'}</MenuButton>
          <MenuButton onClick={onHideToday}>오늘은 숨기기</MenuButton>
          <MenuButton onClick={onDismiss}>추천에서 덜 보기</MenuButton>
        </div>
      )}
    </div>
  )
}

function MenuButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-pill bg-canvas px-3 py-1.5 text-[12px] text-inkdim"
    >
      {children}
    </button>
  )
}

function QuickChip({ profile, onAdd }: { profile: QuestUsageProfile; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-pill bg-surface px-3 py-2',
        'text-[13px] text-ink ring-1 ring-inset ring-line',
        'transition-transform duration-150 ease-out active:scale-[0.96]',
      )}
    >
      <span className="text-[13px] text-coral-deep">＋</span>
      <span className="truncate">{profile.title}</span>
      {profile.favorite && <span className="text-[11px]">⭐</span>}
    </button>
  )
}

function SearchResults({
  results,
  onAdd,
  onOpenPack,
}: {
  results: ReturnType<typeof searchLibrary>
  onAdd: (item: {
    title: string
    category: QuestDraft['category']
    difficulty: QuestDraft['difficulty']
    presetId: string | null
  }) => void
  onOpenPack: (pack: QuestPackDef) => void
}) {
  const empty = results.packs.length === 0 && results.quests.length === 0

  if (empty) {
    return (
      <div className="mt-6 rounded-card border border-dashed border-line px-4 py-7 text-center">
        <p className="text-[14px] text-ink">찾는 게 없네.</p>
        <p className="mt-1 text-[12.5px] text-inkfaint">위에서 직접 만들어도 돼.</p>
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-5">
      {results.quests.length > 0 && (
        <section>
          <SectionTitle title="퀘스트" />
          <ul className="space-y-1.5">
            {results.quests.slice(0, 12).map((hit) => (
              <li key={hit.key}>
                <SearchRow hit={hit} onAdd={() => onAdd(hit)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.packs.length > 0 && (
        <section>
          <SectionTitle title="세트" />
          <ul className="space-y-1.5">
            {results.packs.map((pack) => (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => onOpenPack(pack)}
                  className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface px-3.5 py-3 text-left"
                >
                  <span className="text-[20px] leading-none">{pack.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">
                      {pack.name}
                    </span>
                    <span className="block truncate text-[11.5px] text-inkdim">
                      {pack.items.length}개
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function SearchRow({ hit, onAdd }: { hit: SearchHit; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-card border border-line bg-surface px-3.5 py-3 text-left',
        'transition-transform duration-150 ease-out active:scale-[0.98]',
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral-soft text-[13px] text-coral-deep">
        ＋
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] text-ink">{hit.title}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-inkfaint">
          {hit.kind === 'PRESET' && hit.packName}
          {hit.kind === 'HISTORY' && '전에 했던 것'}
          {hit.kind === 'ROUTINE' && '반복'}
        </span>
      </span>
      <CategoryBadge category={hit.category} />
    </button>
  )
}

function chipItem(p: QuestUsageProfile) {
  return {
    title: p.title,
    category: p.category,
    difficulty: p.difficulty,
    presetId: p.presetId,
  }
}

function seedOfRec(rec: Recommendation): ProfileSeed {
  return {
    questKey: rec.questKey,
    title: rec.title,
    category: rec.category,
    difficulty: rec.difficulty,
    presetId: rec.presetId,
    packId: rec.presetId ? rec.presetId.split(':')[0] : null,
  }
}

/** 퀘스트 하나에서 사용 기록 묶음을 뽑는다. 밖에서도 쓴다. */
export function seedOfQuest(quest: {
  title: string
  category: QuestDraft['category']
  difficulty: QuestDraft['difficulty']
  sourcePresetId?: string
  sourcePackId?: string
}): ProfileSeed {
  return {
    questKey: questKeyOf(quest),
    title: quest.title,
    category: quest.category,
    difficulty: quest.difficulty,
    presetId: quest.sourcePresetId ?? null,
    packId: quest.sourcePackId ?? null,
  }
}
