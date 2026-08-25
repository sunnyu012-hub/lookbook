/**
 * 어떤 말을 배울 것인가.
 *
 * 형태소 분석기를 새로 넣지 않는다. 라이브러리 하나 붙이면 앱이 두 배로 무거워지고,
 * 그렇게까지 해서 얻을 정확도가 여기서는 필요 없다.
 * 조사·어미를 뒤에서 조금 떼어 내는 정도로 충분하다 —
 * "원트를 / 원트가 / 원트함" 을 같은 말로 볼 수만 있으면 된다.
 *
 * 그리고 배우면 안 되는 말을 걸러 내는 게 여기서 더 중요한 일이다 (계획서 50).
 */

/** 뒤에 붙는 조사·어미. 긴 것부터 떼어 낸다 */
const SUFFIXES = [
  '했었다', '하겠다', '이었다', '였었다',
  '했다', '한다', '했어', '했음', '했네', '하다', '이다', '였다', '이야', '이라',
  '에서', '으로', '에게', '한테', '까지', '부터', '보다', '처럼', '만큼',
  '들이', '들을', '들은',
  '을', '를', '이', '가', '은', '는', '도', '만', '의', '에', '로', '와', '과', '랑', '님',
  '함', '됨', '임', '음', '기', '고', '며', '서',
]

/** 이 정도는 남아야 말이라고 본다 */
const MIN_TRIGGER = 2
/** 이보다 길면 문장이지 표현이 아니다 (계획서 50) */
const MAX_TRIGGER = 12

/**
 * 조사·어미를 떼어 낸다.
 * 떼고 나서 너무 짧아지면 원래대로 둔다 — '가다' 에서 '가' 만 남기면 아무 데나 걸린다.
 */
export function normalizeTrigger(raw: string): string {
  let out = raw.trim().toLowerCase().replace(/\s+/g, ' ')

  // 두 번까지만 떼어 낸다. 계속 떼면 '원트했었다' → '원' 까지 간다
  for (let round = 0; round < 2; round += 1) {
    const hit = SUFFIXES.find(
      (suffix) => out.endsWith(suffix) && out.length - suffix.length >= MIN_TRIGGER,
    )
    if (!hit) break
    out = out.slice(0, out.length - hit.length).trim()
  }

  return out
}

/** 같은 말인가 — '기빨림' 과 '기 빨림' 은 같다 */
export const sameTrigger = (a: string, b: string) =>
  normalizeTrigger(a).replace(/\s+/g, '') === normalizeTrigger(b).replace(/\s+/g, '')

// ─────────────────────────────────────────────
// 배우면 안 되는 말
// ─────────────────────────────────────────────

/** 이런 것만으로는 규칙을 만들지 않는다 */
const TOO_COMMON = new Set([
  '오늘', '어제', '내일', '지금', '아까', '이따', '그냥', '진짜', '너무', '되게',
  '조금', '많이', '약간', '계속', '다시', '아직', '벌써', '역시', '그래도',
  '이거', '저거', '그거', '뭔가', '이제', '다음', '하루', '것', '거', '수',
])

export interface TriggerCheck {
  ok: boolean
  reason?:
    | 'too-short'
    | 'too-long'
    | 'numeric'
    | 'too-common'
    | 'punctuation-only'
}

/**
 * 이 말로 규칙을 만들어도 되는가.
 *
 * 여기서 막는 것들:
 *   숫자·날짜   "3시" "500g" — 다음에 또 나올 리 없다
 *   흔한 말     "오늘" "그냥" — 아무 문장에나 있어서 문맥이 안 된다
 *   긴 문장     통째로 외우는 건 규칙이 아니라 똑같은 문장 기억이 할 일이다
 */
export function checkTrigger(raw: string): TriggerCheck {
  const value = normalizeTrigger(raw)

  if (!value || !/[가-힣a-z]/.test(value)) return { ok: false, reason: 'punctuation-only' }
  if (value.replace(/\s/g, '').length < MIN_TRIGGER) return { ok: false, reason: 'too-short' }
  if (value.replace(/\s/g, '').length > MAX_TRIGGER) return { ok: false, reason: 'too-long' }
  // 숫자가 섞인 말은 그 날 그 순간에만 쓰인 말이다
  if (/\d/.test(value)) return { ok: false, reason: 'numeric' }
  // 낱말 하나가 흔한 말이거나, 여러 낱말이 전부 흔한 말이면 배울 게 없다.
  // "오늘 그냥" 같은 것은 아무 문장에나 있어서 규칙이 되면 온 기록에 붙는다.
  const words = value.split(/\s+/).filter(Boolean)
  if (words.every((word) => TOO_COMMON.has(word))) return { ok: false, reason: 'too-common' }
  if (TOO_COMMON.has(value.replace(/\s/g, ''))) return { ok: false, reason: 'too-common' }

  return { ok: true }
}

export const isLearnableTrigger = (raw: string) => checkTrigger(raw).ok

// ─────────────────────────────────────────────
// 본문에서 후보 말 뽑기
// ─────────────────────────────────────────────

/**
 * 사용자가 직접 태그를 넣은 경우에는 built-in 이 잡은 말이 없다.
 * 그럴 때 본문에서 후보를 뽑아야 하는데, 여기서도 복잡한 것은 하지 않는다 —
 * 띄어쓰기로 자른 뒤 1~3개씩 붙여 본다.
 *
 * 이 후보들은 그 자리에서 규칙이 되지 않는다.
 * 여러 번 반복돼서 같은 말만 남았을 때 비로소 뜻이 생긴다 (candidates.ts).
 */
export function candidatePhrases(text: string, maxGram = 3): string[] {
  const words = text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[.,!?…·;:'"()\[\]]/g, ''))
    .filter(Boolean)

  const out: string[] = []
  for (let size = 1; size <= maxGram; size += 1) {
    for (let at = 0; at + size <= words.length; at += 1) {
      const phrase = words.slice(at, at + size).join(' ')
      if (isLearnableTrigger(phrase)) out.push(normalizeTrigger(phrase))
    }
  }
  return [...new Set(out)]
}

/** 여러 문장에 공통으로 나오는 말 — 반복된 표현을 찾아낸다 */
export function commonPhrases(texts: readonly string[], minShare = 2): string[] {
  if (texts.length < minShare) return []

  const seen = new Map<string, number>()
  for (const text of texts) {
    for (const phrase of candidatePhrases(text)) {
      seen.set(phrase, (seen.get(phrase) ?? 0) + 1)
    }
  }

  return [...seen]
    .filter(([, count]) => count >= minShare)
    // 긴 말이 더 뜻이 분명하다. 같은 길이면 자주 나온 것
    .sort((a, b) => b[0].length - a[0].length || b[1] - a[1])
    .map(([phrase]) => phrase)
}
