import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { characters, icons, ui } from '@/lib/pixelAssets'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'

/**
 * 로그인 화면.
 * 비밀번호 없이 메일로 오는 링크만 쓴다 — 개인용 앱이라 이게 가장 단순하고,
 * RLS 가 auth.uid() 를 기준으로 걸려 있어 내 기록에만 접근할 수 있다.
 */
export function AuthGate() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !email.trim()) return

    setSending(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setSending(false)

    if (authError) {
      setError(authError.message)
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
            메일의 링크를 열면 이 화면으로 돌아옵니다.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="press mt-3 w-full rounded-px4 border-[1.5px] border-border bg-cream py-2.5 font-pixel text-[11px] uppercase text-inkdim"
          >
            다른 메일로 다시 보내기
          </button>
        </PixelPanel>
      ) : (
        <PixelPanel title="Sign in" icon={icons.home}>
          <p className="body-ko mb-3">
            내 기록을 어디서든 이어서 쓰려면 메일 주소만 입력하면 돼요. 비밀번호는 없습니다.
          </p>
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
            {error && <p className="text-[12px] text-pinkdeep">{error}</p>}
            <PixelButton type="submit" icon={icons.save} full disabled={sending}>
              {sending ? 'Sending…' : 'Send magic link'}
            </PixelButton>
          </form>
        </PixelPanel>
      )}
    </div>
  )
}
