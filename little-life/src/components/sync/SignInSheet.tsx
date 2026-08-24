import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import type { ActionResult } from '@/hooks/useSync'

interface SignInSheetProps {
  open: boolean
  onClose: () => void
  /** 이 기기에서 마지막으로 쓴 이메일 */
  defaultEmail: string | null
  /** 비밀번호를 걸어둔 적이 있으면 그쪽을 먼저 보여준다 */
  preferPassword: boolean
  onMagicLink: (email: string) => Promise<ActionResult>
  onVerifyCode: (email: string, code: string) => Promise<ActionResult>
  onPassword: (email: string, password: string) => Promise<ActionResult>
}

type Mode = 'MAGIC' | 'PASSWORD'

const FIELD =
  'h-[52px] w-full rounded-btn border border-line bg-canvas px-4 text-ink outline-none transition-colors placeholder:text-inkfaint focus:border-inkfaint'

/**
 * 로그인.
 *
 * ── 왜 코드 입력도 같이 두는가 ─────────────────────────
 *
 * 메일로 온 링크를 폰에서 누르면 대개 메일 앱 안의 브라우저가 열린다.
 * 거기서 로그인이 되면 정작 홈 화면에 깔아둔 앱은 그대로 로그아웃 상태다.
 * 숫자를 손으로 옮겨 적는 길을 같이 열어두면 그 문제가 사라진다.
 * (메일 서식에 {{ .Token }} 이 있어야 숫자가 온다 — README 참고)
 */
export function SignInSheet({
  open,
  onClose,
  defaultEmail,
  preferPassword,
  onMagicLink,
  onVerifyCode,
  onPassword,
}: SignInSheetProps) {
  const [mode, setMode] = useState<Mode>(preferPassword ? 'PASSWORD' : 'MAGIC')
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * 다시 열 때는 처음 상태로. 지난번 오류 문구가 남아 있으면 헷갈린다.
   *
   * 열려 있는 동안에는 절대 되돌리지 않는다. 메일을 보내면 그 순간
   * "마지막 이메일" 이 바뀌는데, 그걸 신호로 여기를 다시 채우면
   * 방금 뜬 "메일 보냈어" 와 숫자 칸이 그 자리에서 사라진다.
   */
  const opened = useRef(false)
  useEffect(() => {
    if (!open) {
      opened.current = false
      return
    }
    if (opened.current) return
    opened.current = true
    setMode(preferPassword ? 'PASSWORD' : 'MAGIC')
    setEmail(defaultEmail ?? '')
    setPassword('')
    setCode('')
    setSent(false)
    setNote(null)
    setError(null)
  }, [open, defaultEmail, preferPassword])

  if (!open) return null

  const trimmed = email.trim()
  const emailLooksOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)

  const run = async (action: () => Promise<ActionResult>, closeOnDone: boolean) => {
    setBusy(true)
    setError(null)
    setNote(null)
    const result = await action()
    setBusy(false)
    if (result.ok) {
      if (result.message) setNote(result.message)
      if (closeOnDone) onClose()
    } else {
      setError(result.message)
    }
  }

  return (
    <BottomSheet open onClose={onClose} title="로그인">
      <h2 className="text-[20px] font-semibold text-ink">로그인</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
        기록을 클라우드에 한 벌 넣어두면 폰을 바꿔도 그대로 이어져.
      </p>

      <div className="mt-4 flex gap-1 rounded-pill bg-sunken p-1">
        {(
          [
            ['MAGIC', '메일로'],
            ['PASSWORD', '비밀번호로'],
          ] as Array<[Mode, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            onClick={() => {
              setMode(key)
              setError(null)
              setNote(null)
            }}
            className={cn(
              'min-h-[36px] flex-1 rounded-pill text-[12.5px] font-medium transition-colors duration-200',
              mode === key ? 'bg-surface text-ink shadow-soft' : 'text-inkdim',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="sync-email" className="mb-2 block text-[13px] font-medium text-inkdim">
            이메일
          </label>
          <input
            id="sync-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={FIELD}
          />
        </div>

        {mode === 'PASSWORD' && (
          <div>
            <label htmlFor="sync-pw" className="mb-2 block text-[13px] font-medium text-inkdim">
              비밀번호
            </label>
            <input
              id="sync-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && emailLooksOk && password.length >= 8) {
                  void run(() => onPassword(trimmed, password), true)
                }
              }}
              placeholder="여덟 자 이상"
              className={FIELD}
            />
          </div>
        )}

        {mode === 'MAGIC' && sent && (
          <div>
            <label htmlFor="sync-code" className="mb-2 block text-[13px] font-medium text-inkdim">
              메일에 온 숫자 여섯 자리
            </label>
            <input
              id="sync-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className={cn(FIELD, 'font-game tracking-[0.3em]')}
            />
            <p className="mt-2 text-[11.5px] leading-relaxed text-inkfaint">
              링크를 눌러도 되고, 앱이 그대로 열려 있으면 숫자를 여기 넣는 게 빨라.
            </p>
          </div>
        )}
      </div>

      {note && (
        <p className="mt-3 rounded-btn bg-sage-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-sage-deep">
          {note}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-btn bg-coral-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-coral-deep">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {mode === 'PASSWORD' ? (
          <Button
            className="w-full"
            disabled={busy || !emailLooksOk || password.length < 8}
            onClick={() => void run(() => onPassword(trimmed, password), true)}
          >
            {busy ? '들어가는 중…' : '들어가기'}
          </Button>
        ) : (
          <>
            <Button
              className="w-full"
              disabled={busy || !emailLooksOk}
              onClick={() =>
                void run(async () => {
                  const result = await onMagicLink(trimmed)
                  if (result.ok) setSent(true)
                  return result
                }, false)
              }
            >
              {busy ? '보내는 중…' : sent ? '다시 보내기' : '메일 보내기'}
            </Button>

            {sent && (
              <Button
                variant="soft"
                className="w-full"
                disabled={busy || code.length < 6}
                onClick={() => void run(() => onVerifyCode(trimmed, code), true)}
              >
                숫자로 들어가기
              </Button>
            )}
          </>
        )}
      </div>

      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-inkfaint">
        처음이면 메일로 들어온 다음, 설정에서 비밀번호를 걸어두면 돼.
        <br />그 다음부터는 비밀번호로 바로 들어올 수 있어.
      </p>
    </BottomSheet>
  )
}
