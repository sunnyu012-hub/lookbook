/**
 * RELATIONSHIP — 누구와.
 * 특정 인물 이름은 여기 넣지 않는다. 그건 My Tag 다 (#성현).
 * 관계 종류가 확실하지 않으면 추측하지 않는다.
 */
import { defineTags } from './define'

export const RELATIONSHIP_TAGS = defineTags('relationship', [
  { key: 'partner', displayName: '연인', keywords: ['남자친구', '여자친구', '남친', '여친', '애인'], defaultConfidence: 0.85 },
  { key: 'family', displayName: '가족', keywords: ['가족', '엄마', '아빠', '부모님', '동생', '누나', '언니', '형', '오빠'], defaultConfidence: 0.85 },
  { key: 'friend', displayName: '친구', keywords: ['친구'], defaultConfidence: 0.85 },
  { key: 'coworker', displayName: '동료', keywords: ['동료', '팀원', '팀장', '상사', '회사 사람'] },
  { key: 'acquaintance', displayName: '아는 사람', keywords: ['지인', '아는 사람'] },
  { key: 'date', displayName: '데이트', keywords: ['데이트'], defaultConfidence: 0.9, ruleHints: { futureSensitive: true } },
  { key: 'affection', displayName: '애정 표현', keywords: ['안아', '뽀뽀', '애정표현'] },
  { key: 'quality_time', displayName: '함께한 좋은 시간', phrases: ['같이 있어서 좋', '함께해서 좋'] },
  { key: 'conflict', displayName: '관계 갈등', keywords: ['서운', '삐졌', '틀어졌'] },
  { key: 'care', displayName: '챙김', keywords: ['챙겨', '신경 써줬'] },
  { key: 'support', displayName: '기댐', keywords: ['의지', '기댔'] },
  { key: 'reunion', displayName: '오랜만에 만남', keywords: ['오랜만에 만', '오랜만에 봤'] },
  { key: 'missing_someone', displayName: '보고 싶음', keywords: ['보고 싶', '보고싶'] },
  { key: 'togetherness', displayName: '같이 있음', keywords: ['같이 있'] },
])
