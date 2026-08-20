/**
 * 한국어 조사 처리.
 * 이름은 사람마다 받침이 다르니까, "성현와" 같은 문장이 나오지 않게 여기서 맞춰 준다.
 */

/** 마지막 글자에 받침이 있는지 */
export function hasFinalConsonant(word: string): boolean {
  const ch = word.trim().slice(-1)
  if (!ch) return false
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글이 아니면 없는 것으로 본다
  return (code - 0xac00) % 28 !== 0
}

type Pair = [withFinal: string, withoutFinal: string]

const PAIRS: Record<string, Pair> = {
  '와': ['과', '와'],
  '은': ['은', '는'],
  '이': ['이', '가'],
  '을': ['을', '를'],
  '으로': ['으로', '로'],
  '이랑': ['이랑', '랑'],
}

/** withParticle('성현', '와') → '성현과' */
export function withParticle(word: string, particle: keyof typeof PAIRS): string {
  const pair = PAIRS[particle]
  if (!pair) return `${word}${particle}`
  return `${word}${hasFinalConsonant(word) ? pair[0] : pair[1]}`
}
