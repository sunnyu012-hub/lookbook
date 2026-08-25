import { useRef, useState } from 'react'
import type { AppState } from '@/types'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { exportFileName, exportText, parseImport } from '@/lib/sync/file'
import { readTextFile, saveTextFile } from '@/lib/sync/download'
import { summarize, type StateSummary } from '@/lib/sync/merge'
import { ImportSheet } from './ImportSheet'

interface TransferCardProps {
  state: AppState
  /** 가져온 것을 앉힌다. 앉히기 전에 사본을 남기는 건 부르는 쪽 몫이다. */
  onApply: (next: AppState) => void
}

interface Pending {
  state: AppState
  summary: StateSummary
  exportedAt: string | null
}

/**
 * 파일 한 장으로 옮기기.
 *
 * 계정이 없어도, 인터넷이 없어도 된다. 예전 폰에서 내보내고
 * 새 폰에서 가져오면 그대로 이어진다.
 *
 * 클라우드를 쓰는 사람에게도 남겨둔다 — 큰일 하기 전에
 * 손으로 한 벌 챙겨두는 자리가 있는 편이 낫다.
 */
export function TransferCard({ state, onApply }: TransferCardProps) {
  const picker = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  const handleExport = async () => {
    setBusy(true)
    setError(null)
    setNote(null)

    const outcome = await saveTextFile(exportFileName(), exportText(state))
    setBusy(false)

    if (outcome === 'SHARED') setNote('보냈어. "파일에 저장"을 고르면 나중에 다시 꺼낼 수 있어.')
    else if (outcome === 'DOWNLOADED') setNote('내려받았어. 새 기기에서 이 파일을 골라주면 돼.')
    else if (outcome === 'FAILED') setError('파일을 만들지 못했어. 잠시 뒤에 다시 해볼래?')
    // CANCELLED — 사용자가 닫은 것뿐이라 아무 말도 안 한다
  }

  const handlePick = async (file: File | null) => {
    if (!file) return
    setError(null)
    setNote(null)

    let text: string
    try {
      text = await readTextFile(file)
    } catch {
      setError('파일을 열지 못했어.')
      return
    }

    const result = parseImport(text)
    if (!result.ok) {
      setError(result.message)
      return
    }

    setPending({ state: result.state, summary: result.summary, exportedAt: result.exportedAt })
  }

  return (
    <>
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-butter-soft text-[16px]">
            📦
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-ink">파일로 옮기기</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-inkdim">
              계정 없이도 돼. 내보낸 파일을 새 기기에서 가져오면 그대로 이어져.
            </p>
          </div>
        </div>

        {note && (
          <p className="rounded-btn bg-sage-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-sage-deep">
            {note}
          </p>
        )}
        {error && (
          <p className="rounded-btn bg-coral-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-coral-deep">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExport()}
            className={cn(
              'min-h-[44px] rounded-btn bg-sunken px-3 text-[12.5px] font-medium text-ink active:scale-[0.97]',
              busy && 'opacity-40',
            )}
          >
            {busy ? '만드는 중…' : '파일로 내보내기'}
          </button>
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="min-h-[44px] rounded-btn bg-sunken px-3 text-[12.5px] font-medium text-ink active:scale-[0.97]"
          >
            파일에서 가져오기
          </button>
        </div>

        {/* accept 에 MIME 만 적으면 아이폰 파일 앱에서 json 이 회색으로 죽는다.
            확장자를 같이 적어둬야 고를 수 있다. */}
        <input
          ref={picker}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            void handlePick(e.target.files?.[0] ?? null)
            // 같은 파일을 두 번 고를 수도 있다. 비워두지 않으면 두 번째가 안 먹는다.
            e.target.value = ''
          }}
        />
      </Card>

      <ImportSheet
        open={pending !== null}
        here={summarize(state)}
        incoming={pending?.summary ?? summarize(state)}
        exportedAt={pending?.exportedAt ?? null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return
          onApply(pending.state)
          setPending(null)
          setNote('가져왔어. 이어서 하면 돼.')
        }}
      />
    </>
  )
}
