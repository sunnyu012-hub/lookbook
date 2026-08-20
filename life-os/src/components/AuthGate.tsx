import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { characters, icons, ui } from '@/lib/pixelAssets'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { cn } from '@/lib/cn'

type Mode = 'password' | 'link'

/**
 * 로그인.
 * 기본은 비밀번호 — 메일 발송에는 시간당 제한이 있어서 매번 링크를 받는 건 불편하다.
 * 처음 한 번이나 비밀번호를 잊었을 때는 메일 링크를 쓴다.
 */
export function AuthGate() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !email.trim()) return

    setBusy(true)
    setError(null)

    if (mode === 'password') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setBusy(false)
      if (authError) {
        setError(
          authError.message.includes('Invalid login credentials')
            ? '비밀번호가 맞지 않아요. 아직 만들지 않았다면 아래 “메일 링크로 로그인”을 쓰고, 들어간 뒤 Stats 화면에서 비밀번호를 만들 수 있어요.'
            : authError.message,
        )
      }
      return
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)

    if (authError) {
      setError(
        authError.message.toLowerCase().includes('rate limit')
          ? '메일을 너무 자주 보냈어요. 한 시간쯤 뒤에 다시 되는데, 이미 받은 링크가 있으면 그걸 쓰셔도 됩니다.'
          : authError.message,
      )
      return
    }
    setSent(true)
  }

  return (
    <div
      className="mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col justify-center gap-4 px-5"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <PixelImage asset={ui.logo} height={44} alt="Life OS" />
        <div className="relative">
          <PixelImage asset={characters.idle} height={112} className="animate-floaty" />
          <PixelSparkle size={14} className="absolute -right-2 top-2" />
          <PixelSparkle size={11} variant={2} delay={900} className="absolute -left-3 top-10" />
        </div>
      </div>

      {sent ? (
        <PixelPanel title="Check your mail" icon={icons.save} sparkle>
          <p className="body-ko">
            <span className="font-medium">{email}</span> 으로 로그인 링크를 보냈어요.
            <br />
            링크를 열면 이 화면으로 돌아옵니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false)
              setMode('password')
            }}
            className="press mt-3 w-full rounded-px4 border-[1.5px] border-border bg-cream py-2.5 font-pixel text-[11px] uppercase text-inkdim"
          >
            돌아가기
          </button>
        </PixelPanel>
      ) : (
        <PixelPanel title="Sign in" icon={icons.home}>
          <div className="mb-3 flex gap-1.5">
            {(
              [
                ['password', '비밀번호'],
                ['link', '메일 링크'],
              ] as [Mode, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value)
                  setError(null)
                }}
                className={cn(
                  'flex-1 rounded-px3 border-[1.5px] py-2 text-[12px] transition-colors duration-150',
                  mode === value
                    ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                    : 'border-border bg-cream text-inkdim',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-2.5">
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="이메일 주소"
              className="w-full rounded-px3 border-[1.5px] border-border bg-cream px-3 py-2.5 text-[15px] placeholder:text-inkfaint focus:border-pinkdeep focus:outline-none"
            />

            {mode === 'password' && (
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                aria-label="비밀번호"
                className="w-full rounded-px3 border-[1.5px] border-border bg-cream px-3 py-2.5 text-[15px] placeholder:text-inkfaint focus:border-pinkdeep focus:outline-none"
              />
            )}

            {error && <p className="text-[12px] leading-relaxed text-pinkdeep">{error}</p>}

            <PixelButton type="submit" icon={icons.save} full disabled={busy}>
              {busy ? '…' : mode === 'password' ? 'Sign in' : 'Send magic link'}
            </PixelButton>
          </form>

          <p className="mt-3 text-[11px] leading-relaxed text-inkfaint">
            메일 링크는 시간당 발송 수에 제한이 있어요. 한 번 들어간 뒤 Stats 화면에서 비밀번호를
            만들어두면 다음부터는 바로 로그인됩니다.
          </p>
        </PixelPanel>
      )}
    </div>
  )
}
