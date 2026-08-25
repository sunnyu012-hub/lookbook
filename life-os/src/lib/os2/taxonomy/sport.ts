/**
 * SPORT — 구체적인 운동 종목.
 * activity:exercise 의 하위다. 종목이 잡히면 이쪽이 우선한다.
 */
import { defineTags } from './define'

export const SPORT_TAGS = defineTags('sport', [
  { key: 'climbing', displayName: '클라이밍', parentId: 'activity:exercise', keywords: ['클라이밍', '클밍', '암장'], defaultConfidence: 0.9, ruleHints: { futureSensitive: true } },
  { key: 'bouldering', displayName: '볼더링', parentId: 'sport:climbing', keywords: ['볼더링', '볼더'], defaultConfidence: 0.9, ruleHints: { futureSensitive: true } },
  { key: 'walking', displayName: '걷기 운동', parentId: 'activity:walking', keywords: ['많이 걸었', '걷기 운동', '오래 걸었'], ruleHints: { futureSensitive: true } },
  { key: 'running', displayName: '달리기', parentId: 'activity:exercise', keywords: ['러닝', '달렸', '조깅', '뛰었'], defaultConfidence: 0.85, ruleHints: { futureSensitive: true } },
  { key: 'gym', displayName: '헬스장', parentId: 'activity:exercise', keywords: ['헬스', '헬스장', '피티'], ruleHints: { futureSensitive: true } },
  { key: 'strength_training', displayName: '근력 운동', parentId: 'activity:exercise', keywords: ['웨이트', '근력', '데드리프트', '스쿼트'], ruleHints: { futureSensitive: true } },
  { key: 'stretching', displayName: '스트레칭', parentId: 'activity:exercise', keywords: ['스트레칭', '몸 풀었'], ruleHints: { futureSensitive: true } },
  { key: 'yoga', displayName: '요가', parentId: 'activity:exercise', keywords: ['요가', '필라테스'], ruleHints: { futureSensitive: true } },
  { key: 'cycling', displayName: '자전거', parentId: 'activity:exercise', keywords: ['자전거', '싸이클', '라이딩'], ruleHints: { futureSensitive: true } },
  { key: 'hiking', displayName: '등산', parentId: 'activity:exercise', keywords: ['등산', '산 탔', '트래킹'], ruleHints: { futureSensitive: true } },
  { key: 'dance', displayName: '춤', parentId: 'activity:exercise', keywords: ['춤', '댄스'], ruleHints: { futureSensitive: true } },
  { key: 'other_exercise', displayName: '그 밖의 운동', parentId: 'activity:exercise', keywords: ['수영', '테니스', '배드민턴', '복싱'], ruleHints: { futureSensitive: true } },
])
