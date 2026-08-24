import { Card } from '@/components/ui/Card'
import { reasonLabel, type LocalBackup } from '@/lib/sync/backup'
import { sinceLabel } from '@/lib/sync/format'

interface BackupNoticeProps {
  backup: LocalBackup | null
  onRestore: () => void
  onDismiss: () => void
}

/**
 * 덮어쓰기 전 사본.
 *
 * 클라우드에서 받아왔든 파일에서 가져왔든, 덮이기 직전 상태는 늘 한 벌 남는다.
 * 그게 남아 있다는 걸 눈에 보이게 두는 게 이 칸의 전부다 —
 * 되돌릴 수 있다는 걸 모르면 없는 것과 같다.
 *
 * 클라우드를 안 쓰는 사람에게도 보여야 해서 백업 칸 밖에 따로 뒀다.
 */
export function BackupNotice({ backup, onRestore, onDismiss }: BackupNoticeProps) {
  if (!backup) return null

  return (
    <Card className="border-dashed">
      <p className="text-[12.5px] leading-relaxed text-inkdim">
        {reasonLabel(backup.reason)} 기록이 한 벌 남아 있어 ({sinceLabel(backup.savedAt)}).
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="min-h-[44px] flex-1 rounded-btn bg-sunken text-[12.5px] font-medium text-ink active:scale-[0.97]"
        >
          되돌리기
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[44px] rounded-btn px-4 text-[12.5px] text-inkfaint active:scale-[0.97]"
        >
          지우기
        </button>
      </div>
    </Card>
  )
}
