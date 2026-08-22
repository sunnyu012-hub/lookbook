/**
 * 화면 위에 뜨는 것들(시트·연출·꾸미기)을 한곳에서 관리한다.
 *
 * 두 가지를 해결한다.
 *
 * 1. 스크롤 잠금
 *    시트마다 body.overflow 를 저장했다 되돌리면, 시트가 겹쳐 열렸다가
 *    닫히는 순서에 따라 'hidden' 이 그대로 남는다. 그러면 시트를 다 닫아도
 *    화면이 스크롤되지 않는다. 그래서 저장·복원 대신 열려 있는 개수를 센다.
 *
 * 2. 뒤로 가기
 *    폰에서 뒤로 가기를 누르면 앱이 꺼지는 게 아니라 맨 위 시트만 닫혀야 한다.
 *    히스토리에 표시를 하나 밀어 넣고, 뒤로 가기가 오면 맨 위 것만 닫는다.
 */

let lockCount = 0
let savedOverflow = ''

export function lockScroll(): void {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function unlockScroll(): void {
  if (typeof document === 'undefined') return
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) document.body.style.overflow = savedOverflow
}

/** 테스트에서 쓴다 */
export function scrollLockCount(): number {
  return lockCount
}

// ── 뒤로 가기 ───────────────────────────────────────────

interface Entry {
  id: number
  close: () => void
}

const stack: Entry[] = []
let seq = 0
let bound = false
/**
 * 우리가 부른 history.back() 은 다시 닫지 않는다.
 * 시트 두 개가 한꺼번에 닫히면 back() 도 두 번 불리므로 개수로 센다.
 */
let selfPops = 0

function handlePop() {
  if (selfPops > 0) {
    selfPops -= 1
    return
  }
  const top = stack.pop()
  top?.close()
}

/** 열릴 때 부른다. 돌려받은 id 로 닫을 때 정리한다. */
export function pushOverlay(close: () => void): number {
  if (typeof window === 'undefined') return -1

  if (!bound) {
    window.addEventListener('popstate', handlePop)
    bound = true
  }

  seq += 1
  const id = seq
  stack.push({ id, close })
  window.history.pushState({ llOverlay: id }, '')
  return id
}

/** 버튼이나 바깥 누르기로 닫힐 때 부른다. */
export function popOverlay(id: number): void {
  if (typeof window === 'undefined' || id < 0) return

  const index = stack.findIndex((e) => e.id === id)
  // 이미 뒤로 가기로 빠졌으면 히스토리도 이미 물러나 있다
  if (index === -1) return
  stack.splice(index, 1)

  // 우리가 밀어 넣은 표시가 아직 맨 위면 되돌린다
  const state = window.history.state as { llOverlay?: number } | null
  if (state?.llOverlay === id) {
    selfPops += 1
    window.history.back()
  }
}

/** 테스트에서 쓴다 */
export function overlayDepth(): number {
  return stack.length
}
