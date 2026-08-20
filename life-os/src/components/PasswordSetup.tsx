import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { icons } from '@/lib/pixelAssets'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelPanel } from '@/components/pixel/PixelPanel'

/**
 * 비밀번호 만들기 / 바꾸기.
 * 이걸 한 번 해두면 메일 링크 없이 바로 로그인할 수 있다
 * (메일 발송에는 시간당 제한이 있어서, 기기를 여러 개 쓰면 금방 걸린다).
 */
export function PasswordSetup() {
  const client = supabase
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!client) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('6자 이상으로 정해주세요.')
      return
    }

    setSaving(true)
    setError(null)
    const { error: updateError } = await client.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setDone(true)
    setPassword('')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press w-full rounded-px4 border-[1.5px] border-border bg-ivory py-2.5 font-pixel text-[10px] uppercase text-inkdim shadow-hard"
      >
        비밀번호 만들기 · 메일 없이 로그인
      </button>
    )
  }

  return (
    <PixelPanel title="Password" icon={icons.save}>
      {done ? (
        <p className="body-ko">
          비밀번호를 저장했어요. 이제 다른 기기에서도 메일 없이 바로 로그인할 수 있습니다.
        </p>
      ) : (
        <>
          <p className="body-ko mb-3">
            한 번 정해두면 메일 링크를 기다릴 필요가 없어요. 지금 계정에 그대로 붙습니다.
          </p>
          <form onSubmit={submit} className="space-y-2.5">
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              aria-label="새 비밀번호"
              className="w-full rounded-px3 border-[1.5px] border-border bg-cream px-3 py-2.5 text-[15px] placeholder:text-inkfaint focus:border-pinkdeep focus:outline-none"
            />
            {error && <p className="text-[12px] text-pinkdeep">{error}</p>}
            <PixelButton type="submit" full disabled={saving}>
              {saving ? 'Saving…' : '저장'}
            </PixelButton>
          </form>
        </>
      )}
    </PixelPanel>
  )
}
