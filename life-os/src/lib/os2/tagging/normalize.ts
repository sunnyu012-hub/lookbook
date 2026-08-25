/**
 * 글자 다듬기.
 *
 * 규칙 하나: 원문의 글자 위치를 잃지 않는다.
 * "왜 이 태그가 붙었어요?" 에 원문 조각을 그대로 보여 줘야 하기 때문에,
 * 다듬은 글자에서 원문 어디였는지 되짚을 수 있어야 한다.
 *
 * 그래서 두 가지 시선을 만든다.
 *   lower — 소문자만. 길이가 원문과 같아서 위치가 그대로다.
 *   dense — 공백을 뺀 것. '기분 좋' 과 '기분좋' 을 같이 잡으려고.
 *           dense 의 i 번째 글자가 원문 몇 번째였는지 표를 같이 들고 다닌다.
 */

export interface TextView {
  /** 원문 그대로 — matchedText 를 잘라낼 때 쓴다 */
  raw: string
  /** 소문자. 원문과 길이가 같다 */
  lower: string
  /** 공백을 뺀 소문자 */
  dense: string
  /** dense 의 위치 → 원문의 위치 */
  denseToRaw: number[]
}

/** 공백으로 볼 글자 */
const SPACE = /\s/

export function makeView(raw: string): TextView {
  const lower = raw.toLowerCase()
  let dense = ''
  const denseToRaw: number[] = []
  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower[i]
    if (SPACE.test(ch)) continue
    dense += ch
    denseToRaw.push(i)
  }
  return { raw, lower, dense, denseToRaw }
}

export interface Span {
  /** 원문 기준 */
  start: number
  end: number
}

/** 원문에서 잘라낸 조각 */
export const sliceOf = (view: TextView, span: Span) => view.raw.slice(span.start, span.end)

/**
 * 한 낱말이 나온 자리를 전부 찾는다.
 *
 * 띄어쓰기를 사람마다 다르게 하기 때문에 두 번 본다 —
 * 있는 그대로 한 번, 공백을 뺀 채로 한 번.
 * 같은 자리를 두 번 세지 않도록 시작 위치로 걸러 준다.
 */
export function findTerm(view: TextView, term: string, allowDense = true): Span[] {
  const needle = term.toLowerCase().trim()
  if (!needle) return []

  const found = new Map<number, Span>()

  // 1) 있는 그대로
  let at = view.lower.indexOf(needle)
  while (at !== -1) {
    found.set(at, { start: at, end: at + needle.length })
    at = view.lower.indexOf(needle, at + 1)
  }

  // 2) 공백을 뺀 채로
  //
  // 짧은 낱말은 여기서 찾지 않는다.
  // '안 아팠어' 에서 공백을 빼면 '안아팠어' 가 되고 '안아'(포옹)가 걸린다.
  // 두 글자짜리는 이렇게 남의 낱말 사이에 끼어들기 쉽다.
  const denseNeedle = allowDense ? needle.replace(/\s+/g, '') : ''
  if (denseNeedle) {
    let d = view.dense.indexOf(denseNeedle)
    while (d !== -1) {
      const start = view.denseToRaw[d]
      const lastRaw = view.denseToRaw[d + denseNeedle.length - 1]
      if (start !== undefined && lastRaw !== undefined && !found.has(start)) {
        found.set(start, { start, end: lastRaw + 1 })
      }
      d = view.dense.indexOf(denseNeedle, d + 1)
    }
  }

  return [...found.values()].sort((a, b) => a.start - b.start)
}

/** 이 낱말을 공백 무시하고 찾아도 되는가 */
export const canSearchDense = (term: string) => term.replace(/\s+/g, '').length >= 3

/** 아무 낱말이라도 들어 있으면 true */
export const hasAny = (view: TextView, terms: readonly string[]): boolean =>
  terms.some((term) => findTerm(view, term, canSearchDense(term)).length > 0)

// ─────────────────────────────────────────────
// 절 나누기
//
// "오늘은 힘들었는데 내일은 클라이밍 갈 거야" 를 통째로 보면
// 클라이밍이 오늘 일이 돼 버린다. 문장을 잘라서 각각 판단한다.
// ─────────────────────────────────────────────

export interface Clause extends Span {
  text: string
}

/**
 * 문장·쉼표·줄바꿈에서 자른다.
 *
 * 연결어미는 '는데' 와 '지만' 둘만 건드린다 — 이 둘은 앞뒤가 다른 이야기라는 표시라서
 * "어제는 힘들었는데 오늘은 클라이밍 갔다" 의 클라이밍이 어제 일이 되지 않게 해 준다.
 * 나머지 어미까지 자르기 시작하면 멀쩡한 문장이 조각나서 더 틀린다.
 */
const BOUNDARY = /[.!?…\n·;]|,\s|는데\s|지만\s|\s그리고\s|\s근데\s|\s그런데\s/g

export function splitClauses(view: TextView): Clause[] {
  const out: Clause[] = []
  let cursor = 0
  BOUNDARY.lastIndex = 0
  let hit = BOUNDARY.exec(view.lower)
  while (hit) {
    const end = hit.index + hit[0].length
    if (end > cursor) out.push({ start: cursor, end, text: view.raw.slice(cursor, end) })
    cursor = end
    hit = BOUNDARY.exec(view.lower)
  }
  if (cursor < view.raw.length) {
    out.push({ start: cursor, end: view.raw.length, text: view.raw.slice(cursor) })
  }
  return out.length ? out : [{ start: 0, end: view.raw.length, text: view.raw }]
}

/** 이 자리가 어느 절에 속하는지 */
export function clauseAt(clauses: readonly Clause[], span: Span): Clause {
  return clauses.find((c) => span.start >= c.start && span.start < c.end) ?? clauses[0]
}
