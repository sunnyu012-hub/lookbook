import { useState } from 'react'
import type { AppState } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { exportFileName, exportText } from '@/lib/sync/file'
import { saveTextFile } from '@/lib/sync/download'
import { summarize } from '@/lib/sync/merge'
import { clearLocalData } from '@/lib/reset'

interface ResetCardProps {
  state: AppState
  /** 지우기 전에 세션도 끊는다. 안 끊으면 클라우드가 곧바로 되돌려놓는다. */
  onSignOut: () => Promise<void>
  /** 클라우드를 쓰는 사람에게만 "다시 로그인하면 돌아온다" 가 참이다. */
  signedIn: boolean
}

/**
 * 처음부터 다시.
 *
 * ── 왜 설정 맨 아래인가 ─────────────────────────────────
 *
 * 베타 테스터는 반드시 "리셋하고 싶어요" 라고 한다. 그 길이 없으면
 * 브라우저 설정에서 사이트 데이터를 지우라고 안내해야 하는데, 그건
 * 앱이 할 말이 아니다. 그렇다고 눈에 잘 띄는 자리에 둘 것도 아니다 —
 * 찾으면 있고, 찾지 않으면 안 보이는 정도.
 *
 * ── 지우기 전에 한 벌 챙기게 한다 ───────────────────────
 *
 * 확인 시트에서 제일 먼저 보이는 건 "지운다" 가 아니라 지금 여기 있는
 * 기록이다 (레벨 · 끝낸 것 · 도감 · 기록한 날). 숫자로 보고 나면
 * 생각보다 많이 쌓였다는 걸 알게 되고, 그때 내보내기 버튼이 옆에 있다.
 *
 * ── 두 번 묻지 않는다 ───────────────────────────────────
 *
 * "정말요?" 를 두 번 겹치면 사람은 읽지 않고 두 번 누른다.
 * 한 번만 묻되, 그 한 번에 무엇이 사라지는지를 다 적는다.
 */
export function ResetCard({ state, onSignOut, signedIn }: ResetCardProps) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const here = summarize(state)

  const handleExport = async () => {
    setBusy(true)
    setNote(null)
    const outcome = await saveTextFile(exportFileName(), exportText(state))
    setBusy(false)
    if (outcome === 'SHARED') setNote('보냈어. "파일에 저장"을 고르면 나중에 다시 꺼낼 수 있어.')
    else if (outcome === 'DOWNLOADED') setNote('내려받았어. 이 파일로 언제든 되돌아올 수 있어.')
    else if (outcome === 'FAILED') setNote('파일을 만들지 못했어. 잠시 뒤에 다시 해볼래?')
  }

  const handleReset = async () => {
    setBusy(true)
    // 순서가 중요하다. 로그아웃이 sync 기록을 다시 쓰기 때문에
    // 먼저 끊고 그다음에 지운다. 반대로 하면 방금 지운 자리가 되살아난다.
    try {
      await onSignOut()
    } catch {
      // 인터넷이 없어도 이 기기에서 지우는 건 그대로 한다
    }
    clearLocalData(window.localStorage)
    // 메모리에 남은 상태가 다시 저장되기 전에 판을 새로 연다.
    window.location.reload()
  }

  return (
    <>
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-[16px]">
            🧹
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-ink">처음부터 다시</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-inkdim">
              이 기기에 저장된 걸 지우고 첫 화면부터 시작해.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setNote(null)
            setAsking(true)
          }}
          className="min-h-[44px] w-full rounded-btn bg-sunken px-3 text-[12.5px] font-medium text-inkdim active:scale-[0.97]"
        >
          처음부터 다시 하기
        </button>
      </Card>

      <BottomSheet open={asking} onClose={() => setAsking(false)} title="처음부터 다시 할까">
        <h2 className="text-[20px] font-semibold text-ink">처음부터 다시 할까</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
          이 기기에 있는 게 지워지고 이름을 정하는 첫 화면으로 돌아가.
        </p>

        <div className="mt-4 rounded-card border border-line bg-surface px-4 py-3.5">
          <p className="text-[14.5px] font-semibold text-ink">지금 여기 쌓인 것</p>
          <dl className="mt-2.5 grid grid-cols-4 gap-1.5">
            <Cell label="레벨" value={here.level} />
            <Cell label="끝낸 것" value={here.completed} />
            <Cell label="도감" value={here.discovered} />
            <Cell label="기록한 날" value={here.days} />
          </dl>
        </div>

        <p className="mt-3 rounded-btn bg-sunken px-3.5 py-2.5 text-[11.5px] leading-relaxed text-inkdim">
          {signedIn
            ? '클라우드에 올려둔 건 그대로 남아. 다시 로그인하면 돌아올 수 있어.'
            : '되돌리려면 지우기 전에 파일로 한 벌 내보내 두는 게 좋아.'}
        </p>

        {note && (
          <p className="mt-2 rounded-btn bg-sage-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-sage-deep">
            {note}
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleExport()}
          className="mt-4 min-h-[48px] w-full rounded-btn bg-sunken px-3 text-[13px] font-medium text-ink active:scale-[0.97] disabled:opacity-40"
        >
          {busy ? '잠깐만…' : '먼저 파일로 내보내기'}
        </button>

        <Button
          variant="danger"
          disabled={busy}
          className="mt-2 w-full"
          onClick={() => void handleReset()}
        >
          지우고 처음부터
        </Button>

        <button
          type="button"
          onClick={() => setAsking(false)}
          className="mt-2 w-full rounded-btn py-3 text-[12.5px] text-inkdim active:scale-[0.98]"
        >
          그만둘래
        </button>
      </BottomSheet>
    </>
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
