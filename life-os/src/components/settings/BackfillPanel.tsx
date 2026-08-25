/**
 * 예전 기록에 태그 붙이기.
 *
 * 저절로 돌지 않는다. 여기 버튼을 누를 때만 돈다.
 * 기록 수백 개가 나도 모르는 사이에 고쳐지면, 좋은 일이라도 무섭기 때문이다.
 *
 * 고쳐 놓은 태그("맞아요" / "이 태그 제외")는 건드리지 않는다.
 */
import { useRef, useState } from 'react'
import type { QuickLog } from '@/lib/os2/types'
import type { BackfillResult } from '@/lib/os2/tagging/backfill'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'

interface Props {
  pending: QuickLog[]
  run: (options: {
    onProgress?: (done: number, total: number) => void
  }) => Promise<BackfillResult>
}

export function BackfillPanel({ pending, run }: Props) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [result, setResult] = useState<BackfillResult | null>(null)
  const stopped = useRef(false)

  const total = pending.length

  const start = async () => {
    if (busy) return
    haptic()
    stopped.current = false
    setBusy(true)
    setResult(null)
    setProgress([0, total])

    try {
      const out = await run({
        onProgress: (done, all) => setProgress([done, all]),
      })
      setResult(out)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <PixelPanel title="Life tags" icon={icons.log}>
      {total === 0 && !result ? (
        <p className="text-[12.5px] leading-relaxed text-inkdim">
          모든 기록에 지금 사전으로 태그가 붙어 있어요.
        </p>
      ) : (
        <>
          <p className="text-[12.5px] leading-relaxed text-inkdim">
            아직 태그가 안 붙은 기록이 <b>{total}개</b> 있어요.
            <br />
            글에 나온 말을 사전과 맞춰서 붙여요. 고쳐 두신 태그는 그대로 둡니다.
          </p>

          {busy && progress && (
            <div className="mt-2.5">
              <div className="h-2 w-full overflow-hidden rounded-full border-[1.5px] border-border bg-cream">
                <div
                  className="h-full bg-sky transition-[width] duration-200"
                  style={{ width: `${Math.round((progress[0] / Math.max(1, progress[1])) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 font-pixel text-[9.5px] uppercase text-inkfaint">
                {progress[0]} / {progress[1]}
              </p>
            </div>
          )}

          {total > 0 && (
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy}
              className="press mt-2.5 min-h-[44px] w-full rounded-px3 border-[1.5px] border-skydeep bg-skysoft font-pixel text-[10px] uppercase text-skydeep disabled:opacity-60"
            >
              {busy ? '붙이는 중…' : `예전 기록 ${total}개에 태그 붙이기`}
            </button>
          )}
        </>
      )}

      {result && (
        <p className="mt-2.5 rounded-px3 border-[1.5px] border-mintdeep bg-mintsoft px-2.5 py-2 text-[12.5px] text-ink">
          {result.updated}개에 태그를 붙였어요.
          {result.unchanged > 0 && ` ${result.unchanged}개는 그대로였고요.`}
          {result.failed > 0 && (
            <span className="text-pinkdeep">
              {' '}
              {result.failed}개는 저장이 안 됐어요. 다시 눌러 주세요.
            </span>
          )}
        </p>
      )}
    </PixelPanel>
  )
}
