import { FEEDBACK_URL } from '@/lib/build'

/**
 * 의견 보내기.
 *
 * ── 왜 앱 안에 있어야 하나 ──────────────────────────────
 *
 * 베타에서 제일 많이 잃는 건 버그가 아니라 제보다. 뭔가 이상한 걸 본
 * 사람이 앱을 닫고, 다른 앱을 열고, 어디에 말해야 하나 생각하는 사이에
 * 그 마음이 식는다. 이상하다고 느낀 그 자리에서 한 번에 가야 한다.
 *
 * ── 없으면 아예 안 뜬다 ─────────────────────────────────
 *
 * 주소는 `VITE_FEEDBACK_URL` 로 넣는다 (백업 설정과 같은 방식).
 * 없는데 버튼만 두면 눌러도 아무 데도 안 가는 버튼이 되고,
 * 그건 링크가 없는 것보다 나쁘다 — 한 번 속으면 다음엔 안 누른다.
 */
export function FeedbackCard() {
  return (
    <a
      href={FEEDBACK_URL}
      target="_blank"
      rel="noreferrer noopener"
      className="flex w-full items-center gap-3 rounded-card border border-line/70 bg-surface px-5 py-4 text-left shadow-soft active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dusty-soft text-[16px]">
        ✉️
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-ink">의견 보내기</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-inkdim">
          이상한 것 · 불편한 것 · 하고 싶은 말. 한 줄이어도 좋아.
        </span>
      </span>
      <span className="shrink-0 text-[11px] text-inkfaint">↗</span>
    </a>
  )
}
