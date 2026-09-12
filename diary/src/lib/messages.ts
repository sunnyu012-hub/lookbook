import { daysBetween, shiftKey, shiftMonth } from './date'
import type { Entries } from './types'

export type Letter = { date: string; text: string }

const LOOK_BACK = 7

/**
 * 오늘 열었을 때 위에 뜰 쪽지 — 지난날의 내가 "내일의 나에게" 남긴 글.
 *
 * 어제만 보면 하루 건너뛴 사람의 쪽지가 영영 안 읽힌다.
 * 그래서 이레 전까지 거슬러 가장 가까운 쪽지를 찾는다.
 */
export function letterForToday(entries: Entries, today: string): Letter | null {
  for (let back = 1; back <= LOOK_BACK; back += 1) {
    const date = shiftKey(today, -back)
    const text = entries[date]?.toTomorrow.trim()
    if (text) return { date, text }
  }
  return null
}

export type Echo = { label: string; date: string }

/**
 * "한 달 전 오늘 · 1년 전 오늘" 에 뭘 썼는지.
 *
 * 일기를 쓰는 재미는 대개 다시 읽을 때 온다. 찾아 들어가지 않아도
 * 오늘 화면에서 한 번 스치게 둔다.
 */
export function echoesForToday(entries: Entries, today: string): Echo[] {
  const day = today.slice(8)
  const candidates: { label: string; monthKey: string }[] = [
    { label: '한 달 전 오늘', monthKey: shiftMonth(today.slice(0, 7), -1) },
    { label: '반년 전 오늘', monthKey: shiftMonth(today.slice(0, 7), -6) },
    { label: '1년 전 오늘', monthKey: shiftMonth(today.slice(0, 7), -12) },
  ]

  return candidates
    .map(({ label, monthKey }) => ({ label, date: `${monthKey}-${day}` }))
    .filter(({ date }) => Boolean(entries[date]))
}

/** 오늘까지 며칠치가 쌓였는지, 마지막으로 쓴 날이 언제인지. 재촉하지 않고 세기만 한다. */
export function diaryStats(entries: Entries, today: string) {
  const dates = Object.keys(entries).sort()
  const last = dates[dates.length - 1]
  return {
    days: dates.length,
    first: dates[0] ?? null,
    last: last ?? null,
    /** 마지막 기록이 며칠 전인지. 오늘 쓴 게 있으면 0 */
    sinceLast: last ? daysBetween(last, today) : null,
  }
}
