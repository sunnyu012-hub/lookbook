import { useMemo, useState } from 'react'
import type { Battle, BattleDef, BattleKind } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryFilter, type CategoryFilterValue } from '@/components/quest/CategoryFilter'
import { BattleDefCard } from '@/components/rpg/BattleCard'
import { categoriesIn, libraryOrder } from '@/lib/rpg/lineup'
import { CHARACTER_FACE } from '@/lib/assets'

interface BattleLibrarySheetProps {
  open: boolean
  kind: BattleKind
  defs: BattleDef[]
  battles: Battle[]
  onClose: () => void
  onStart: (def: BattleDef) => void
}

/**
 * 몬스터·보스 전체 목록.
 *
 * 앞 화면에는 몇 개만 내밀어 두고, 나머지는 전부 여기 있다.
 * 앞에 안 뜬다고 못 하는 건 하나도 없다 — 이 시트가 그 약속을 지키는 자리다.
 *
 * 진행 중인 것만 빠져 있다 (그건 앞 화면 "진행 중" 에 있다).
 * 전에 끝낸 것도 남겨둔다. 설거지는 다음 주에 또 쌓인다.
 */
export function BattleLibrarySheet({
  open,
  kind,
  defs,
  battles,
  onClose,
  onStart,
}: BattleLibrarySheetProps) {
  const [filter, setFilter] = useState<CategoryFilterValue>('ALL')

  const entries = useMemo(() => libraryOrder(defs, battles), [defs, battles])
  const categories = useMemo(() => categoriesIn(entries), [entries])
  const visible = useMemo(
    () => (filter === 'ALL' ? entries : entries.filter((e) => e.def.category === filter)),
    [entries, filter],
  )

  const isBoss = kind === 'BOSS'

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isBoss ? '모든 보스' : '모든 몬스터'}
      fill
    >
      <h2 className="text-[19px] font-bold text-ink">{isBoss ? '모든 보스' : '모든 몬스터'}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
        {isBoss
          ? '언젠가 해야지 싶은 것들. 지금 붙잡을 게 있으면 하나 골라도 좋아.'
          : '앞 화면에 안 보였어도 전부 여기 있어. 언제든 골라도 돼.'}
      </p>

      {/*
        보스는 열세 종이라 칩까지 얹으면 목록보다 머리말이 길어진다.
        몬스터만 필터를 둔다.
      */}
      {!isBoss && categories.length > 1 && (
        <div className="mt-4">
          <CategoryFilter value={filter} onChange={setFilter} only={categories} />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            face={CHARACTER_FACE.surprised}
            title="이 분야는 지금 다 붙잡고 있어."
            hint="진행 중인 것부터 하나 끝내고 오면 여기 다시 생겨."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {visible.map(({ def, clearedAt }) => (
            <li key={def.id}>
              <BattleDefCard
                def={def}
                onStart={(picked) => {
                  onStart(picked)
                  onClose()
                }}
                note={clearedAt ? '전에 끝냈어' : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  )
}
