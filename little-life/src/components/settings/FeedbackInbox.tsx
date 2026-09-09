import { useEffect, useState } from 'react'
import { getClient, readableError } from '@/lib/sync/client'
import { fetchFeedback, type FeedbackRow } from '@/lib/sync/feedback'
import { isSyncConfigured } from '@/lib/sync/config'
import { buildLabel } from '@/lib/build'

/**
 * 쌓인 의견을 한 번에 보는 자리 (`?dev=feedback`).
 *
 * ── 왜 화면 안에 길을 안 두나 ───────────────────────────
 *
 * 다른 Lab 과 같다. 주소를 아는 사람만 연다 — 설정에 "받은 의견" 이
 * 있으면 테스터가 남이 뭘 보냈는지 궁금해서 누른다. 눌러도 RLS 가
 * 막아서 아무것도 안 보이지만, 있는 줄 모르는 편이 낫다.
 *
 * ── 막는 건 이 화면이 아니다 ────────────────────────────
 *
 * 진짜 자물쇠는 서버의 RLS 다 (`supabase/feedback.sql`). 만든 사람이
 * 아닌 계정으로 열면 오류가 아니라 **빈 목록**이 온다 — RLS 는 못 읽는
 * 줄을 없는 것처럼 다룬다. 그래서 "권한 없음" 이라고 말해줄 수 없고,
 * 아는 척하지도 않는다. 비었을 때 로그인 얘기를 한 줄 곁들이는 게 전부다.
 */
export function FeedbackInbox() {
  const [rows, setRows] = useState<FeedbackRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      const clientPromise = getClient()
      if (!clientPromise) {
        setError('환경변수(VITE_SUPABASE_URL · ANON_KEY)가 없어서 못 읽어.')
        return
      }
      try {
        const client = await clientPromise
        const found = await fetchFeedback(client)
        if (alive) setRows(found)
      } catch (e) {
        if (alive) setError(readableError(e))
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="min-h-[100dvh] bg-canvas px-4 py-6">
      <div className="mx-auto w-full max-w-[560px]">
        <h1 className="text-[20px] font-bold text-ink">받은 의견</h1>
        <p className="mt-1 text-[12px] text-inkdim">
          최근 것부터 200개. 이 판은 {buildLabel()}.
          {!isSyncConfigured() && ' · 서버 설정이 없다'}
        </p>

        {error && (
          <p className="mt-4 rounded-card bg-coral-soft px-4 py-3 text-[13px] leading-relaxed text-coral-deep">
            {error}
          </p>
        )}

        {!error && rows === null && (
          <p className="mt-6 text-[13px] text-inkfaint">읽는 중…</p>
        )}

        {rows !== null && rows.length === 0 && (
          <div className="mt-6 rounded-card border border-line bg-surface px-5 py-6 text-center">
            <p className="text-[14px] font-medium text-ink">아직 한 줄도 없어.</p>
            <p className="mt-2 text-[12px] leading-relaxed text-inkdim">
              정말 안 온 것일 수도 있고, 읽을 수 있는 계정으로 로그인이 안 된 것일
              수도 있어. 서버는 못 읽는 줄을 없는 것처럼 다뤄서 둘을 구분해
              알려주지 못해.
            </p>
          </div>
        )}

        {rows !== null && rows.length > 0 && (
          <>
            <p className="mt-4 text-[12px] text-inkdim">{rows.length}개</p>
            <ul className="mt-2 space-y-2.5">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-card border border-line bg-surface px-4 py-3.5"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[13.5px] font-semibold text-ink">
                      {row.nickname ?? '이름 없음'}
                    </span>
                    {row.level !== null && (
                      <span className="text-[11px] text-inkfaint">LV.{row.level}</span>
                    )}
                    {row.days !== null && (
                      <span className="text-[11px] text-inkfaint">{row.days}일</span>
                    )}
                    <span className="ml-auto text-[11px] text-inkfaint">
                      {stamp(row.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                    {row.body}
                  </p>

                  <p className="mt-2.5 flex flex-wrap gap-x-3 text-[10.5px] text-inkfaint">
                    <span>판 {row.buildId ? buildLabel(row.buildId) : '모름'}</span>
                    <span>{row.userId ? '로그인' : '익명'}</span>
                    {row.ua && <span className="min-w-0 truncate">{device(row.ua)}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

/** `2026-09-09T05:11:00Z` → `09-09 14:11` (보는 사람 시간대로) */
function stamp(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

/**
 * user agent 에서 기기만 골라낸다.
 *
 * 통째로 깔면 한 줄이 화면을 넘고, 정작 궁금한 건 "아이폰이냐 안드로이드냐"
 * 하나다. 못 알아보면 그냥 안 보여준다 — 틀린 걸 자신 있게 적느니 낫다.
 */
function device(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return /CriOS|FxiOS/i.test(ua) ? 'iOS · 크롬' : 'iOS · 사파리'
  if (/Android/i.test(ua)) return 'Android'
  if (/Macintosh/i.test(ua)) return 'Mac'
  if (/Windows/i.test(ua)) return 'Windows'
  return ''
}
