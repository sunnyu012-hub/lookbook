import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { sinceLabel } from '@/lib/sync/format'
import type { StateSummary } from '@/lib/sync/merge'

interface ImportSheetProps {
  open: boolean
  /** 지금 이 폰에 있는 것 */
  here: StateSummary
  /** 파일 안에 든 것 */
  incoming: StateSummary
  exportedAt: string | null
  onClose: () => void
  onConfirm: () => void
}

/**
 * 가져오기 전에 한 번 보여주는 화면.
 *
 * 가져오면 지금 이 폰에 있는 게 화면에서 사라진다. 그게 어떤 기록인지
 * 모른 채로 누르게 두면 안 된다. 양쪽을 나란히 보여주고,
 * 덮이는 쪽은 한 벌 남는다는 것도 같이 적어둔다.
 */
export function ImportSheet({
  open,
  here,
  incoming,
  exportedAt,
  onClose,
  onConfirm,
}: ImportSheetProps) {
  if (!open) return null

  return (
    <BottomSheet open onClose={onClose} title="이 파일로 이어갈까">
      <h2 className="text-[20px] font-semibold text-ink">이 파일로 이어갈까</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
        가져오면 지금 이 폰에 있는 기록 자리에 파일 속 기록이 들어와.
      </p>

      <div className="mt-4 space-y-2.5">
        <Side label="지금 이 폰" sub="" summary={here} />
        <Side
          label="파일 안"
          sub={exportedAt ? `${sinceLabel(exportedAt)} 내보낸 것` : ''}
          summary={incoming}
          highlight
        />
      </div>

      <p className="mt-3 rounded-btn bg-sunken px-3.5 py-2.5 text-[11.5px] leading-relaxed text-inkdim">
        지금 이 폰에 있는 건 한 벌 남겨둘게. 아니다 싶으면 설정에서 되돌릴 수 있어.
      </p>

      <Button className="mt-4 w-full" onClick={onConfirm}>
        이 파일로 이어가기
      </Button>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-btn py-3 text-[12.5px] text-inkdim active:scale-[0.98]"
      >
        그만둘래
      </button>
    </BottomSheet>
  )
}

function Side({
  label,
  sub,
  summary,
  highlight = false,
}: {
  label: string
  sub: string
  summary: StateSummary
  highlight?: boolean
}) {
  return (
    <div
      className={
        highlight
          ? 'rounded-card border-2 border-coral bg-coral-soft/40 px-4 py-3.5'
          : 'rounded-card border border-line bg-surface px-4 py-3.5'
      }
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[14.5px] font-semibold text-ink">{label}</span>
        {sub && <span className="ml-auto text-[11.5px] text-inkfaint">{sub}</span>}
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
    </div>
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
