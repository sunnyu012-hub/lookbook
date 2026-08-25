/**
 * EMOTION — 감정 그 자체.
 *
 * 여기가 제일 조심스러운 카테고리다.
 * "점심 먹음" 에 행복을 붙이거나 "카페 옴" 에 평온을 붙이면 안 된다.
 * 감정은 사용자가 실제로 그렇게 적었을 때만 붙인다.
 */
import { defineTags } from './define'

export const EMOTION_TAGS = defineTags('emotion', [
  // ── 긍정
  {
    key: 'joy',
    displayName: '기쁨',
    description: '기분이 좋았던 순간',
    keywords: ['기쁘', '기뻐', '기쁨', '행복하', '좋다', '좋음', '좋았', '개좋', '넘좋', '너무 좋'],
    phrases: ['기분 좋', '기분좋', '기분이 좋'],
    defaultConfidence: 0.8,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'happiness',
    displayName: '행복감',
    description: '충만하고 행복한 느낌',
    parentId: 'emotion:joy',
    keywords: ['행복', '행복해', '행복함'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'contentment',
    displayName: '만족감',
    keywords: ['만족', '만족스러', '흡족', '뿌듯하진', '괜찮았'],
    phrases: ['이만하면 됐', '충분하'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'excitement',
    displayName: '신남',
    parentId: 'emotion:joy',
    keywords: ['신난', '신남', '신나', '개신남', '설레', '설렘', '들뜨', '들떠', '흥분'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'anticipation_positive',
    displayName: '좋은 기대감',
    keywords: ['기대돼', '기대된', '기대중', '기다려진', '기대감'],
    phrases: ['기대 된', '기대 중'],
  },
  {
    key: 'pride',
    displayName: '뿌듯함',
    keywords: ['뿌듯', '자랑스러', '해냈', '대견'],
    phrases: ['내가 해냈', '스스로 대견'],
    defaultConfidence: 0.85,
  },
  {
    key: 'relief',
    displayName: '안도감',
    keywords: ['다행', '안도', '한시름', '후련'],
    phrases: ['살 것 같', '살것같', '숨통 트', '끝나서 좋', '드디어 끝'],
    defaultConfidence: 0.85,
  },
  {
    key: 'gratitude',
    displayName: '감사',
    keywords: ['고맙', '감사', '고마워'],
  },
  {
    key: 'affection',
    displayName: '애정',
    keywords: ['애정', '귀엽', '사랑스러', '예뻐 죽'],
  },
  {
    key: 'love',
    displayName: '사랑',
    parentId: 'emotion:affection',
    keywords: ['사랑해', '사랑한', '사랑스'],
    defaultConfidence: 0.85,
  },
  {
    key: 'amusement',
    displayName: '재미있음',
    keywords: ['재밌', '재미있', '개재밌', '웃겼', '웃김', '빵터', '꿀잼'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'curiosity',
    displayName: '호기심',
    keywords: ['궁금', '호기심', '알고 싶'],
  },
  {
    key: 'inspiration',
    displayName: '영감',
    keywords: ['영감', '아이디어 떠올', '떠올랐'],
    phrases: ['영감 받'],
  },
  {
    key: 'confidence',
    displayName: '자신감',
    keywords: ['자신 있', '자신감', '할 수 있을 것 같'],
  },
  {
    key: 'hopeful',
    displayName: '희망적',
    keywords: ['희망', '나아질 것 같', '잘 될 것 같'],
  },

  // ── 중립 / 고요
  {
    key: 'calm',
    displayName: '평온',
    keywords: ['평온', '차분', '잔잔'],
    phrases: ['마음이 편', '고요하'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'comfortable',
    displayName: '편안',
    keywords: ['편하', '편안', '편해', '아늑'],
    defaultConfidence: 0.8,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'neutral',
    displayName: '무덤덤',
    keywords: ['그저 그', '무덤덤', '별 감흥', '그냥 그렇', '그냥 그랬', '그저그랬'],
  },
  {
    key: 'peaceful',
    displayName: '마음이 고요함',
    parentId: 'emotion:calm',
    phrases: ['마음이 고요', '생각이 조용'],
  },
  {
    key: 'nostalgic',
    displayName: '그리움',
    keywords: ['그립', '그리워', '추억', '옛날 생각'],
  },

  // ── 부정
  {
    key: 'sadness',
    displayName: '슬픔',
    keywords: ['슬프', '슬퍼', '슬픔', '눈물', '울었', '서글'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'frustration',
    displayName: '답답함',
    keywords: ['답답', '막막', '갑갑'],
    phrases: ['속이 터', '뭐가 안 풀'],
    defaultConfidence: 0.8,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'irritation',
    displayName: '짜증',
    keywords: ['짜증', '거슬리', '신경 쓰여', '빡치', '빡침', '어이없'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'anger',
    displayName: '화남',
    parentId: 'emotion:irritation',
    keywords: ['화났', '화남', '화가 나', '분노', '열받'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'anxiety',
    displayName: '불안',
    keywords: ['불안', '초조', '조마조마', '안절부절'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'worry',
    displayName: '걱정',
    parentId: 'emotion:anxiety',
    keywords: ['걱정', '근심', '신경 쓰인'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'fear',
    displayName: '무서움',
    keywords: ['무섭', '무서워', '겁나', '두렵'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'disappointment',
    displayName: '실망',
    keywords: ['실망', '아쉽', '아쉬워', '허탈'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'loneliness',
    displayName: '외로움',
    keywords: ['외롭', '외로워', '외로웠', '외로움', '쓸쓸'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'guilt',
    displayName: '죄책감',
    keywords: ['미안', '죄책감', '자책'],
  },
  {
    key: 'embarrassment',
    displayName: '민망함',
    keywords: ['민망', '창피', '부끄러', '쪽팔'],
  },
  {
    key: 'boredom',
    displayName: '지루함',
    keywords: ['지루', '심심', '노잼', '재미없'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'envy',
    displayName: '부러움',
    keywords: ['부럽', '부러워', '질투'],
  },
  {
    key: 'overwhelmed_emotion',
    displayName: '감정적으로 벅참',
    keywords: ['벅차', '벅참', '감정이 북받'],
    phrases: ['감당이 안 되'],
  },
])
