import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CHARACTER_FACE, EFFECT } from '@/lib/assets'
import { NICKNAME_MAX, isNicknameOk, normalizeNickname } from '@/lib/nickname'

interface NicknameGateProps {
  onDecide: (name: string) => void
}

/**
 * 이 세계에서 뭐라고 불릴지 정하는 첫 화면.
 *
 * ── 왜 화면 하나를 통째로 쓰나 ──────────────────────────
 *
 * 시트로 띄우면 뒤에 이미 시작된 앱이 비친다. 그러면 이름을 정하는 게
 * 시작이 아니라 시작한 뒤에 하는 설정처럼 보인다. 여기서는 이게 첫 줄이다.
 *
 * ── 건너뛰기가 없다 ─────────────────────────────────────
 *
 * 이 앱은 아무것도 강요하지 않는데 이것만 예외다. 건너뛰면 이름 없이
 * 시작하고, 그러면 인사 줄에 뻥 뚫린 자리를 보면서 놀게 된다.
 * 대신 부담을 없앤다 — 한 글자여도 되고, 언제든 프로필에서 바꾼다.
 *
 * ── 안내를 여기서 다 하지 않는다 ────────────────────────
 *
 * 이 뒤에 가이드가 한 번 더 뜬다. 처음 켠 사람에게 읽을 것을 두 장 겹쳐
 * 주면 둘 다 안 읽는다. 여기서는 이름만 묻는다.
 */
export function NicknameGate({ onDecide }: NicknameGateProps) {
  const [draft, setDraft] = useState('')
  const ok = isNicknameOk(draft)

  const submit = () => {
    if (!ok) return
    onDecide(normalizeNickname(draft))
  }

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-canvas px-6 py-10">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="relative mx-auto w-[124px]">
          <img
            src={EFFECT.sparkle}
            alt=""
            aria-hidden
            className="absolute -left-4 top-1 w-8 select-none"
          />
          <div className="flex h-[124px] w-[124px] items-end justify-center overflow-hidden rounded-full bg-coral-soft">
            <img
              src={CHARACTER_FACE.happy}
              alt=""
              aria-hidden
              className="w-[104px] select-none object-contain"
              draggable={false}
            />
          </div>
        </div>

        <h1 className="mt-6 text-center text-[22px] font-semibold text-ink">
          여기서 뭐라고 부를까?
        </h1>
        <p className="mt-2 text-center text-[13.5px] leading-relaxed text-inkdim">
          도시 사람들이 이 이름으로 부를 거야.
          <br />
          본명이 아니어도 돼. 나중에 바꿔도 되고.
        </p>

        <form
          className="mt-7"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            value={draft}
            autoFocus
            maxLength={NICKNAME_MAX}
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
            aria-label="이 세계에서 쓸 이름"
            placeholder="이름"
            className="min-h-[52px] w-full rounded-card border border-line bg-surface px-4 text-center text-[19px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-inkfaint focus:border-coral"
          />
          <p className="mt-2 text-center text-[11.5px] text-inkfaint">
            {NICKNAME_MAX}글자까지
          </p>

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={!ok}>
            시작하기
          </Button>
        </form>
      </div>
    </div>
  )
}
