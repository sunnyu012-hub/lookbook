import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { richer, type StateSummary } from '@/lib/sync/merge'
import { sinceLabel } from '@/lib/sync/format'
import type { ConflictInfo } from '@/hooks/useSync'

interface ConflictSheetProps {
  open: boolean
  conflict: ConflictInfo | null
  onClose: () => void
  onKeep: (keep: 'LOCAL' | 'REMOTE') => void
}

/**
 * 어느 쪽을 남길지 고르는 자리.
 *
 * ── 왜 자동으로 안 고르는가 ────────────────────────────
 *
 * 숫자가 큰 쪽이 늘 남겨야 할 쪽은 아니다. 폰에서 며칠 몰아서 했다고
 * 노트북에서 어제 한 것을 버려도 되는 건 아니다. 우리가 아는 건
 * "양쪽이 다르다" 까지고, 무엇이 소중한지는 사람이 안다.
 *
 * 대신 고를 수 있게는 해줘야 한다. "기기 / 클라우드" 라고만 쓰면
 * 아무도 못 고른다. 안에 뭐가 들었는지 숫자로 보여준다.
 *
 * 어느 쪽을 골라도 반대쪽은 이 기기에 사본으로 남는다.
 */
export function ConflictSheet({ open, conflict, onClose, onKeep }: ConflictSheetProps) {
  const [picked, setPicked] = useState<'LOCAL' | 'REMOTE' | null>(null)

  if (!open || !conflict) return null

  const bigger = richer(conflict.local, conflict.remote)
  const reasonLine =
    conflict.reason === 'FIRST_LINK'
      ? '이 기기에서 처음 연결했는데, 클라우드에도 기록이 있어.'
      : '맞춰본 뒤로 이 기기와 클라우드 양쪽에서 뭔가 바뀌었어.'

  return (
    <BottomSheet open onClose={onClose} title="어느 쪽을 남길까">
      <h2 className="text-[20px] font-semibold text-ink">어느 쪽을 남길까</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{reasonLine}</p>

      <div className="mt-4 space-y-2.5">
        <Side
          label="이 기기"
          sub="지금 이 폰에 있는 것"
          summary={conflict.local}
          hint={bigger === 'A' ? '더 많아 보여' : null}
          selected={picked === 'LOCAL'}
          onSelect={() => setPicked('LOCAL')}
        />
        <Side
          label="클라우드"
          sub={`마지막 백업 ${sinceLabel(conflict.remoteUpdatedAt)}`}
          summary={conflict.remote}
          hint={bigger === 'B' ? '더 많아 보여' : null}
          selected={picked === 'REMOTE'}
          onSelect={() => setPicked('REMOTE')}
        />
      </div>

      <p className="mt-3 rounded-btn bg-sunken px-3.5 py-2.5 text-[11.5px] leading-relaxed text-inkdim">
        어느 쪽을 고르든 반대쪽은 이 기기에 한 벌 남겨둬. 설정에서 되돌릴 수 있어.
      </p>

      {/* 아직 안 골랐는데 한쪽 이름을 적어두면, 누르면 그게 될 것처럼 보인다 */}
      <Button className="mt-4 w-full" disabled={picked === null} onClick={() => picked && onKeep(picked)}>
        {picked === null
          ? '위에서 하나 골라줘'
          : picked === 'REMOTE'
            ? '클라우드 것으로 이어가기'
            : '이 기기 것으로 이어가기'}
      </Button>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-btn py-3 text-[12.5px] text-inkdim active:scale-[0.98]"
      >
        나중에 고를래
      </button>
    </BottomSheet>
  )
}

function Side({
  label,
  sub,
  summary,
  hint,
  selected,
  onSelect,
}: {
  label: string
  sub: string
  summary: StateSummary
  hint: string | null
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'w-full rounded-card px-4 py-3.5 text-left transition-colors duration-200',
        selected ? 'border-2 border-coral bg-coral-soft/40' : 'border border-line bg-surface',
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[14.5px] font-semibold text-ink">{label}</span>
        {hint && (
          <span className="rounded-pill bg-sage-soft px-2 py-0.5 font-game text-[9.5px] text-sage-deep">
            {hint}
          </span>
        )}
        <span className="ml-auto text-[11.5px] text-inkfaint">{sub}</span>
      </div>

      <dl className="mt-2.5 grid grid-cols-4 gap-1.5">
        <Cell label="레벨" value={summary.level} />
        <Cell label="끝낸 것" value={summary.completed} />
        <Cell label="도감" value={summary.discovered} />
        <Cell label="기록한 날" value={summary.days} />
      </dl>

      {summary.lastActiveOn && (
        <p className="mt-2 text-[11px] text-inkfaint">마지막 기록 {summary.lastActiveOn}</p>
      )}
    </button>
  )
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-btn bg-canvas px-2 py-1.5 text-center">
      <dt className="text-[10px] text-inkfaint">{label}</dt>
      <dd className="mt-0.5 font-game text-[13px] text-ink">{value}</dd>
    </div>
  )
}
