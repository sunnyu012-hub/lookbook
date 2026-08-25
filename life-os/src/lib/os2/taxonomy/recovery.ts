/** RECOVERY — 무엇으로 회복했나. */
import { defineTags } from './define'

export const RECOVERY_TAGS = defineTags('recovery', [
  { key: 'sleep', displayName: '잠', parentId: 'activity:sleep', keywords: ['잤다', '푹 잤', '잘 잤', '잠들', '수면', '잠을 잤'], ruleHints: { futureSensitive: true } },
  { key: 'nap', displayName: '낮잠', parentId: 'recovery:sleep', keywords: ['낮잠', '눈 붙'], defaultConfidence: 0.85 },
  { key: 'rest', displayName: '쉼', parentId: 'activity:rest', keywords: ['쉬었', '쉬는 중', '휴식'], ruleHints: { futureSensitive: true } },
  { key: 'lying_down', displayName: '누워 있기', parentId: 'recovery:rest', keywords: ['누워', '침대에'] },
  { key: 'quiet_time', displayName: '조용한 시간', parentId: 'recovery:rest', phrases: ['조용히 있었'] },
  { key: 'alone_time', displayName: '혼자 있는 시간', parentId: 'recovery:rest', phrases: ['혼자 쉬', '혼자만의 시간'] },
  { key: 'shower', displayName: '샤워', keywords: ['샤워'], defaultConfidence: 0.85 },
  { key: 'bath', displayName: '목욕', parentId: 'recovery:shower', keywords: ['반신욕', '목욕', '사우나'] },
  { key: 'stretch', displayName: '몸 풀기', keywords: ['스트레칭했', '몸 풀었'] },
  { key: 'light_activity', displayName: '가볍게 움직이기', keywords: ['가볍게 걸', '살살'] },
  { key: 'food', displayName: '먹고 회복', phrases: ['먹으니까 좀', '먹고 나니'] },
  { key: 'hydration', displayName: '물 마시기', parentId: 'food:hydration', keywords: ['물 마시니'] },
  { key: 'break', displayName: '잠깐 멈춤', keywords: ['쉬는 시간', '휴식 시간', '잠깐 쉬'], defaultConfidence: 0.8 },
  { key: 'weekend', displayName: '주말', keywords: ['주말'], defaultConfidence: 0.8 },
  { key: 'time_off', displayName: '쉬는 날', keywords: ['연차', '휴가', '쉬는 날'], defaultConfidence: 0.85 },
  { key: 'recovery_day', displayName: '회복하는 날', phrases: ['회복하는 날', '오늘은 쉬는'] },
])
