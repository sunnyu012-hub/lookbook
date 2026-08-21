/** 조건부 className 을 합칠 때 쓰는 작은 헬퍼. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
