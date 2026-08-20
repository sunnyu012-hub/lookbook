/** 지원되는 기기에서만 아주 짧은 진동. iOS Safari 에서는 무시된다. */
export function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* 무시 */
    }
  }
}
