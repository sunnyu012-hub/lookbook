import { useEffect, useState } from 'react'
import type { AppState } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { getClient, isOfflineError, readableError } from '@/lib/sync/client'
import { sendFeedback } from '@/lib/sync/feedback'
import { buildLabel } from '@/lib/build'

const MAX = 2000

interface FeedbackSheetProps {
  open: boolean
  state: AppState
  onClose: () => void
}

type Phase = 'WRITING' | 'SENDING' | 'SENT'

/**
 * 의견 한 줄 보내는 자리.
 *
 * ── 칸이 하나다 ─────────────────────────────────────────
 *
 * 분류(버그/건의/기타) · 제목 · 연락처를 받고 싶은 마음이 들지만,
 * 칸이 늘어날수록 안 보낸다. "이상한데 뭐라고 분류해야 하지" 에서
 * 멈추는 사람이 실제로 있다. 분류는 받은 다음에 내가 하면 된다.
 *
 * ── 무엇이 같이 가는지 적어둔다 ─────────────────────────
 *
 * 이름 · 판 번호 · 레벨 · 기기 종류가 조용히 따라간다. 그걸 안 적어두면
 * 나중에 알았을 때 속은 기분이 든다. 작게라도 화면에 적고, 그 이상은
 * 안 보낸다 — 게임 기록 전체는 딸려가지 않는다.
 *
 * ── 실패해도 쓴 글을 안 지운다 ──────────────────────────
 *
 * 지하철에서 길게 쓰고 보냈는데 인터넷이 안 닿아서 글이 사라지면,
 * 그 사람은 다시 안 쓴다. 오류가 나도 글은 칸에 그대로 남는다.
 */
export function FeedbackSheet({ open, state, onClose }: FeedbackSheetProps) {
  const [body, setBody] = useState('')
  const [phase, setPhase] = useState<Phase>('WRITING')
  const [error, setError] = useState<string | null>(null)

  // 닫았다 다시 열면 새로 쓴다. 보내고 나서도 마찬가지 —
  // 다음에 열었을 때 지난번 글이 남아 있으면 잘못 보내기 쉽다.
  useEffect(() => {
    if (!open) return
    setBody('')
    setPhase('WRITING')
    setError(null)
  }, [open])

  const ok = body.trim().length > 0 && body.length <= MAX

  const submit = async () => {
    if (!ok || phase === 'SENDING') return
    setPhase('SENDING')
    setError(null)

    const clientPromise = getClient()
    if (!clientPromise) {
      // 환경변수가 없으면 애초에 이 칸이 안 뜬다. 여기 오면 설정이 빠진 것이다.
      setPhase('WRITING')
      setError('지금은 보낼 수가 없어. 잠시 뒤에 다시 해볼래?')
      return
    }

    try {
      const client = await clientPromise
      await sendFeedback(client, { body: body.trim(), state })
      setPhase('SENT')
    } catch (e) {
      setPhase('WRITING')
      setError(
        isOfflineError(e)
          ? '인터넷이 안 닿아. 쓴 건 그대로 있으니까 잠시 뒤에 다시 눌러줘.'
          : readableError(e),
      )
    }
  }

  if (!open) return null

  return (
    <BottomSheet open onClose={onClose} title="의견 보내기">
      {phase === 'SENT' ? (
        <div className="py-6 text-center">
          <span className="block text-[40px] leading-none">🌱</span>
          <p className="mt-4 text-[17px] font-semibold text-ink">잘 받았어. 고마워.</p>
          <p className="mt-2 text-[13px] leading-relaxed text-inkdim">
            답을 바로 못 줄 수도 있지만 전부 읽어.
          </p>
          <Button className="mt-6 w-full" onClick={onClose}>
            닫기
          </Button>
        </div>
      ) : (
        <>
          <h2 className="text-[20px] font-semibold text-ink">의견 보내기</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
            이상한 것 · 불편한 것 · 하고 싶은 말. 한 줄이어도 좋아.
          </p>

          <textarea
            value={body}
            autoFocus
            maxLength={MAX}
            rows={7}
            onChange={(e) => setBody(e.target.value)}
            aria-label="보낼 내용"
            placeholder="여기 적어줘."
            className="mt-4 w-full resize-none rounded-card border border-line bg-surface px-4 py-3.5 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-inkfaint focus:border-coral"
          />

          {error && (
            <p className="mt-2 rounded-btn bg-coral-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-coral-deep">
              {error}
            </p>
          )}

          {/* 조용히 따라가는 걸 적어둔다. 나중에 알면 속은 기분이 든다. */}
          <p className="mt-3 rounded-btn bg-sunken px-3.5 py-2.5 text-[11.5px] leading-relaxed text-inkdim">
            이름({state.user.name}) · 판 번호({buildLabel()}) · 레벨 · 기기 종류가 같이 가.
            게임 기록은 안 보내.
          </p>

          <Button
            className="mt-4 w-full"
            disabled={!ok || phase === 'SENDING'}
            onClick={() => void submit()}
          >
            {phase === 'SENDING' ? '보내는 중…' : '보내기'}
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-btn py-3 text-[12.5px] text-inkdim active:scale-[0.98]"
          >
            그만둘래
          </button>
        </>
      )}
    </BottomSheet>
  )
}
