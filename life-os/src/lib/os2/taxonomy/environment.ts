/**
 * ENVIRONMENT — 주변이 어땠나.
 * "카페" 만으로 시끄럽다·아늑하다를 추측하지 않는다. 사용자가 적었을 때만 붙인다.
 * 날씨도 API 없이 추측하지 않는다.
 */
import { defineTags } from './define'

export const ENVIRONMENT_TAGS = defineTags('environment', [
  { key: 'quiet', displayName: '조용함', keywords: ['조용'], defaultConfidence: 0.85, ruleHints: { negationSensitive: true } },
  { key: 'noisy', displayName: '시끄러움', keywords: ['시끄러', '소음', '시끌'], defaultConfidence: 0.85, ruleHints: { negationSensitive: true } },
  { key: 'crowded', displayName: '붐빔', keywords: ['붐비', '복잡했', '사람 많'], defaultConfidence: 0.8, ruleHints: { negationSensitive: true } },
  { key: 'uncrowded', displayName: '한산함', keywords: ['한산', '사람 없', '텅'], ruleHints: { negationSensitive: true } },
  { key: 'bright', displayName: '밝음', keywords: ['밝'], defaultConfidence: 0.7 },
  { key: 'dark', displayName: '어두움', keywords: ['어둡', '어두운'], defaultConfidence: 0.7 },
  { key: 'warm', displayName: '따뜻함', keywords: ['따뜻'], defaultConfidence: 0.7 },
  { key: 'cold', displayName: '추운 곳', keywords: ['추운 곳', '에어컨 세'], defaultConfidence: 0.7 },
  { key: 'hot', displayName: '더운 곳', keywords: ['더운 곳', '찜통'], defaultConfidence: 0.7 },
  { key: 'comfortable_temperature', displayName: '온도가 딱 좋음', phrases: ['날씨 딱', '온도 딱'] },
  { key: 'cozy', displayName: '아늑함', keywords: ['아늑'], defaultConfidence: 0.85 },
  { key: 'chaotic', displayName: '정신없음', keywords: ['어수선', '난장판'] },
  { key: 'organized', displayName: '잘 정돈됨', keywords: ['깔끔', '정돈'] },
  { key: 'messy', displayName: '어질러짐', keywords: ['지저분', '어질러'] },
  { key: 'nature', displayName: '자연', keywords: ['자연', '나무', '바다', '산이'], defaultConfidence: 0.75 },
  { key: 'indoors', displayName: '실내', keywords: ['실내'] },
  { key: 'outdoors', displayName: '야외', keywords: ['야외', '바깥 공기'] },
  { key: 'rainy', displayName: '비', keywords: ['비 왔', '비가', '비 옴', '장마'], defaultConfidence: 0.85 },
])
