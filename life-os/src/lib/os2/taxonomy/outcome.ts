/** OUTCOME — 결과가 어땠나. */
import { defineTags } from './define'

export const OUTCOME_TAGS = defineTags('outcome', [
  { key: 'success', displayName: '잘 됨', keywords: ['성공', '잘 됐', '잘됐'], defaultConfidence: 0.8, ruleHints: { negationSensitive: true } },
  { key: 'failure', displayName: '잘 안 됨', keywords: ['실패', '폭망', '망했다', '망했어', '망했네', '망함', '안 됐', '안 풀렸', '잘 안 되', '잘 안 됐'],
    negativeKeywords: ['민망'], defaultConfidence: 0.8 },
  { key: 'completed', displayName: '끝냄', keywords: ['끝냈', '완료', '마무리했', '다 했'], defaultConfidence: 0.85 },
  { key: 'progress', displayName: '진도가 나감', keywords: ['진도', '나아갔', '진전'] },
  {
    key: 'improved',
    displayName: '나아짐',
    keywords: ['나아졌', '늘었', '좋아졌'],
    // 체중·몸무게 이야기에는 잘함/못함을 붙이지 않는다.
    // 숫자가 오르내린 것을 성취나 실패로 읽게 만들지 않기 위해서다.
    negativeKeywords: ['체중', '몸무게', '살이', '살 빠', '살빠', 'kg', '킬로'],
  },
  { key: 'learned', displayName: '배움', keywords: ['배웠', '알게 됐', '깨달'] },
  { key: 'solved', displayName: '해결함', parentId: 'outcome:success', keywords: ['해결했', '풀렸', '고쳤'], defaultConfidence: 0.85 },
  // '원트' 는 여기 없다. 클라이밍에서는 성취지만 "촬영 원트로 끝남" 에서는 아니다 —
  // 사람마다 뜻이 다른 말은 built-in 이 아니라 개인 규칙이 배울 몫이다 (Phase 4).
  { key: 'achievement', displayName: '해냄', parentId: 'outcome:success', keywords: ['해냈', '달성', '성취'], phrases: ['완등'], defaultConfidence: 0.85 },
  { key: 'milestone', displayName: '이정표', keywords: ['처음으로 성공', '드디어 됐'] },
  { key: 'stuck', displayName: '진전 없음', keywords: ['제자리', '진전 없'] },
  { key: 'mistake', displayName: '실수', keywords: ['실수', '잘못했'] },
  { key: 'retry', displayName: '다시 해봄', keywords: ['다시 했', '재도전', '또 해봤'] },
  { key: 'breakthrough', displayName: '뚫림', parentId: 'outcome:success', keywords: ['뚫렸', '드디어 풀'], defaultConfidence: 0.85 },
  { key: 'unexpected_success', displayName: '생각보다 잘 됨', phrases: ['생각보다 잘', '의외로 잘'] },
  { key: 'unfinished', displayName: '못 끝냄', keywords: ['못 끝냈', '남았', '미완'] },
])
