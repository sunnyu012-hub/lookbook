/** 조건부 className 조합 — clsx 를 따로 넣을 만큼 복잡하지 않다. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
