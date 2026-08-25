/**
 * 같이 있을 수 없는 태그 정리.
 *
 * "기운이 넘쳤는데 저녁엔 방전됨" 처럼 하루 안에서 둘 다 사실일 때가 있다.
 * 그래서 감정처럼 섞일 수 있는 것은 건드리지 않는다 —
 * 기쁘면서 불안한 날은 실제로 있다.
 *
 * 여기서 정리하는 건 하나의 눈금 위에서 양쪽 끝을 동시에 가리키는 경우뿐이다.
 * 한 기록이 "기운이 아주 많음" 이면서 "기운이 바닥" 일 수는 없다.
 */

/** 한 줄 위에서 서로 못 만나는 무리들 */
export const CONFLICT_AXES: string[][] = [
  // 기운 — 높은 쪽과 낮은 쪽
  ['energy:very_high', 'energy:high', 'energy:recovered', 'energy:second_wind'],
  ['energy:low', 'energy:very_low', 'energy:drained', 'energy:physically_tired', 'energy:sluggish'],

  // 집중
  ['mental:focused', 'mental:deep_focus', 'mental:flow'],
  ['mental:distracted', 'mental:brain_fog'],

  // 의욕
  ['mental:motivated'],
  ['mental:unmotivated'],

  // 혼자 / 함께
  ['social:alone', 'social:chosen_solitude'],
  ['social:with_people', 'social:small_group', 'social:large_group', 'social:crowd'],

  // 일의 양
  ['work:high_workload'],
  ['work:low_workload'],

  // 머리 상태
  ['mental:clear_headed'],
  ['mental:mentally_tired'],
]

/** tagId → 이 태그가 속한 눈금들 */
const axisOf = new Map<string, number[]>()
CONFLICT_AXES.forEach((group, index) => {
  for (const tagId of group) {
    const list = axisOf.get(tagId)
    if (list) list.push(index)
    else axisOf.set(tagId, [index])
  }
})

/**
 * 두 태그가 같은 눈금의 반대쪽인가.
 * 같은 무리 안에 있으면(둘 다 낮은 쪽) 부딪히지 않는다.
 */
export function conflicts(a: string, b: string): boolean {
  if (a === b) return false
  const groupsA = groupIndexOf(a)
  const groupsB = groupIndexOf(b)
  if (groupsA === null || groupsB === null) return false
  return groupsA !== groupsB && sameAxis(groupsA, groupsB)
}

function groupIndexOf(tagId: string): number | null {
  const found = CONFLICT_AXES.findIndex((group) => group.includes(tagId))
  return found === -1 ? null : found
}

/**
 * 눈금은 짝으로 정의돼 있다 — 0/1 이 한 쌍, 2/3 이 한 쌍 …
 * 짝수 index 와 그 다음 홀수 index 가 같은 축의 양 끝이다.
 */
function sameAxis(a: number, b: number): boolean {
  return Math.floor(a / 2) === Math.floor(b / 2)
}

/** axisOf 는 지금 쓰지 않지만 규칙이 늘면 여기서 찾게 된다 */
export const axisIndexes = axisOf
