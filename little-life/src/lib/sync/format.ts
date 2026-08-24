/**
 * 시각을 사람이 읽는 말로.
 *
 * "2026-08-24T03:22:41.000Z" 를 그대로 보여주면 언제인지 감이 안 온다.
 * 방금인지 어제인지만 알면 되는 자리라서 거칠게 끊는다.
 */
export function sinceLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '아직 없음'

  const then = new Date(iso)
  const ms = now.getTime() - then.getTime()
  if (!Number.isFinite(ms)) return '아직 없음'

  // 기기 시계가 조금 앞서 있으면 음수가 나온다. 그것도 "방금" 이다.
  if (ms < 60_000) return '방금'

  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  const days = Math.floor(hours / 24)
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`

  return then.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}
