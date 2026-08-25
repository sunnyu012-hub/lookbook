import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import type { ActionResult } from '@/hooks/useSync'

interface PasswordSheetProps {
  open: boolean
  onClose: () => void
  /** 이미 걸어둔 적이 있으면 "바꾸기" 로 말이 달라진다 */
  existing: boolean
  onSubmit: (password: string) => Promise<ActionResult>
}

const FIELD =
  'h-[52px] w-full rounded-btn border border-line bg-canvas px-4 pr-16 text-ink outline-none transition-colors placeholder:text-inkfaint focus:border-inkfaint'

const MIN = 8

/**
 * 비밀번호 걸기.
 *
 * 메일 링크는 안전하지만 매번 메일함을 열어야 한다. 한 번 걸어두면
 * 다음부터는 바로 들어올 수 있다. 여기서 정한 건 Supabase 계정에 붙는 거라
 * 이 기기에 저장되지 않는다.
 */
export function PasswordSheet({ open, onClose, existing, onSubmit }: PasswordSheetProps) {
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPassword('')
    setAgain('')
    setShow(false)
    setBusy(false)
    setError(null)
    setDone(null)
  }, [open])

  if (!open) return null

  const tooShort = password.length > 0 && password.length < MIN
  const mismatch = again.length > 0 && again !== password
  const ready = password.length >= MIN && again === password && !busy

  const submit = async () => {
    setBusy(true)
    setError(null)
    const result = await onSubmit(password)
    setBusy(false)
    if (result.ok) {
      setDone(result.message ?? '됐어.')
      setPassword('')
      setAgain('')
    } else {
      setError(result.message)
    }
  }

  return (
    <BottomSheet open onClose={onClose} title={existing ? '비밀번호 바꾸기' : '비밀번호 설정'}>
      <h2 className="text-[20px] font-semibold text-ink">
        {existing ? '비밀번호 바꾸기' : '비밀번호 설정'}
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
        걸어두면 다음부터는 메일함을 안 열어도 바로 들어올 수 있어.
      </p>

      {done ? (
        <>
          <p className="mt-5 rounded-card bg-sage-soft px-4 py-5 text-center text-[13.5px] leading-relaxed text-sage-deep">
            {done}
          </p>
          <Button className="mt-4 w-full" onClick={onClose}>
            닫기
          </Button>
        </>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="pw-new" className="mb-2 block text-[13px] font-medium text-inkdim">
                새 비밀번호
              </label>
              <div className="relative">
                <input
                  id="pw-new"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`${MIN}자 이상`}
                  className={FIELD}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-pill px-2.5 py-1.5 text-[11.5px] font-medium text-inkdim active:scale-[0.96]"
                >
                  {show ? '가리기' : '보기'}
                </button>
              </div>
              {tooShort && (
                <p className="mt-1.5 text-[11.5px] text-coral-deep">{MIN}자 이상으로 해줘.</p>
              )}
            </div>

            <div>
              <label htmlFor="pw-again" className="mb-2 block text-[13px] font-medium text-inkdim">
                한 번 더
              </label>
              <input
                id="pw-again"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={again}
                onChange={(e) => setAgain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && ready) void submit()
                }}
                placeholder="같은 걸 한 번 더"
                className={cn(FIELD, 'pr-4')}
              />
              {mismatch && <p className="mt-1.5 text-[11.5px] text-coral-deep">두 개가 달라.</p>}
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-btn bg-coral-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-coral-deep">
              {error}
            </p>
          )}

          <Button className="mt-5 w-full" disabled={!ready} onClick={() => void submit()}>
            {busy ? '거는 중…' : existing ? '바꾸기' : '이걸로 걸기'}
          </Button>

          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-inkfaint">
            잊어버려도 괜찮아. 메일로 들어오는 길은 계속 열려 있어.
          </p>
        </>
      )}
    </BottomSheet>
  )
}
