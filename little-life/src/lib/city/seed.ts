/**
 * 날짜로 고정되는 무작위.
 *
 * 오늘의 이벤트와 상점 진열은 저장하지 않는다.
 * 날짜를 씨앗 삼아 그때그때 계산하면, 새로고침해도 같은 결과가 나오고
 * 자정이 지나면 알아서 바뀐다. 저장할 게 없으니 어긋날 것도 없다.
 */

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 같은 씨앗이면 늘 같은 수열을 낸다 (mulberry32) */
export function seededRandom(seed: string): () => number {
  let a = hash(seed)
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 목록에서 n 개를 겹치지 않게 고른다. 순서도 씨앗에 따라 정해진다. */
export function pickSome<T>(items: T[], count: number, seed: string): T[] {
  if (count >= items.length) return [...items]

  const random = seededRandom(seed)
  const pool = [...items]
  const picked: T[] = []

  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const index = Math.floor(random() * pool.length) % pool.length
    picked.push(pool[index])
    pool.splice(index, 1)
  }
  return picked
}

/** 0 이상 max 미만의 정수 하나 */
export function pickCount(min: number, max: number, seed: string): number {
  const random = seededRandom(seed)
  return min + Math.floor(random() * (max - min + 1))
}
