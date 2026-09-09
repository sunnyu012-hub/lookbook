import { useState } from 'react'
import type { AppState } from '@/types'
import { FeedbackSheet } from './FeedbackSheet'

interface FeedbackCardProps {
  state: AppState
}

/**
 * 의견 보내기 줄.
 *
 * ── 왜 앱 안에 있어야 하나 ──────────────────────────────
 *
 * 베타에서 제일 많이 잃는 건 버그가 아니라 제보다. 뭔가 이상한 걸 본
 * 사람이 앱을 닫고, 다른 앱을 열고, 어디에 말해야 하나 생각하는 사이에
 * 그 마음이 식는다. 이상하다고 느낀 그 자리에서 한 번에 가야 한다.
 *
 * ── 밖으로 내보내지 않는다 ──────────────────────────────
 *
 * 처음엔 오픈카톡·구글폼 링크 한 줄이었다. 그런데 링크는 앱을 나가는
 * 일이고, 나가는 순간 무엇이 이상했는지도 · 어느 판이었는지도 흐려진다.
 * 지금은 이미 붙어 있는 Supabase 로 바로 보낸다 — 백업이 쓰는 그 프로젝트다.
 */
export function FeedbackCard({ state }: FeedbackCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
        <span className="shrink-0 text-[11px] text-inkfaint">›</span>
      </button>

      <FeedbackSheet open={open} state={state} onClose={() => setOpen(false)} />
    </>
  )
}
