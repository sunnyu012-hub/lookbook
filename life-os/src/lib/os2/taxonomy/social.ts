/** SOCIAL — 혼자였나 함께였나, 어떤 자리였나. */
import { defineTags } from './define'

export const SOCIAL_TAGS = defineTags('social', [
  { key: 'alone', displayName: '혼자', keywords: ['혼자', '혼자서'], defaultConfidence: 0.85 },
  { key: 'chosen_solitude', displayName: '혼자 있고 싶어서 혼자 있음', parentId: 'social:alone', phrases: ['혼자 있고 싶', '혼자가 좋', '혼자 오니까', '혼자 있으니'], defaultConfidence: 0.85 },
  { key: 'with_people', displayName: '누군가와 함께', keywords: ['같이', '함께', '만났'], ruleHints: { futureSensitive: true } },
  { key: 'one_on_one', displayName: '둘이서', parentId: 'social:with_people', keywords: ['둘이', '단둘'] },
  { key: 'small_group', displayName: '몇 명이서', parentId: 'social:with_people', keywords: ['셋이', '넷이', '소규모'] },
  { key: 'large_group', displayName: '여러 명이서', parentId: 'social:with_people', keywords: ['다 같이', '단체', '회식'] },
  { key: 'crowd', displayName: '사람이 많은 곳', keywords: ['사람 많', '북적', '인파'], phrases: ['사람이 많'], defaultConfidence: 0.8 },
  { key: 'conversation', displayName: '대화', parentId: 'social:with_people', keywords: ['얘기', '이야기', '수다'] },
  { key: 'deep_conversation', displayName: '깊은 대화', parentId: 'social:conversation', keywords: ['진지한 얘기', '속 얘기', '깊은 얘기'] },
  { key: 'casual_conversation', displayName: '가벼운 수다', parentId: 'social:conversation', keywords: ['수다', '잡담'] },
  { key: 'socializing', displayName: '사람들과 어울림', parentId: 'social:with_people', keywords: ['모임', '어울렸'], ruleHints: { futureSensitive: true } },
  { key: 'meeting_people', displayName: '사람 만나기', parentId: 'social:with_people', keywords: ['만나기로', '만나러'], ruleHints: { futureSensitive: true } },
  { key: 'online_social', displayName: '연락으로 만남', keywords: ['카톡', '통화', '영상통화', '메신저'] },
  { key: 'quality_time', displayName: '좋은 시간', parentId: 'social:with_people', phrases: ['좋은 시간', '즐거운 시간'] },
  { key: 'conflict', displayName: '부딪힘', keywords: ['싸웠', '다퉜', '갈등', '언쟁'], defaultConfidence: 0.85 },
  { key: 'support_received', displayName: '도움 받음', keywords: ['도움 받', '위로 받', '챙겨줬'] },
  { key: 'support_given', displayName: '도움 줌', keywords: ['도와줬', '위로해줬', '챙겨줌'] },
  {
    key: 'forced_social',
    displayName: '어쩔 수 없이 만남',
    phrases: ['어쩔 수 없이', '가기 싫었는데'],
    // 사람을 만난 이야기일 때만 성립한다. "어쩔 수 없이 일했다" 는 만남이 아니다
    contextRequired: [
      'social:with_people', 'social:socializing', 'social:meeting_people',
      'social:small_group', 'social:large_group', 'relationship:coworker',
      'relationship:friend', 'relationship:family',
    ],
  },
])
