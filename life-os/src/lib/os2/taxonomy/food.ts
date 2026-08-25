/**
 * FOOD — 먹고 마신 것.
 * 음식 이름 하나로 영양 성분을 추론하지 않는다.
 */
import { defineTags } from './define'

export const FOOD_TAGS = defineTags('food', [
  { key: 'meal', displayName: '식사', parentId: 'activity:eating', keywords: ['밥', '식사', '한 끼'], ruleHints: { futureSensitive: true } },
  { key: 'snack', displayName: '간식', parentId: 'activity:eating', keywords: ['간식', '군것질'] },
  { key: 'breakfast', displayName: '아침밥', parentId: 'food:meal', keywords: ['아침 먹', '아침밥', '조식'] },
  { key: 'lunch', displayName: '점심', parentId: 'food:meal', keywords: ['점심'], defaultConfidence: 0.85 },
  { key: 'dinner', displayName: '저녁밥', parentId: 'food:meal', keywords: ['저녁 먹', '저녁밥', '야식'] },
  { key: 'dessert', displayName: '디저트', parentId: 'food:snack', keywords: ['디저트', '케이크', '아이스크림'] },
  { key: 'sweet', displayName: '단 것', keywords: ['단 거', '달달', '초콜릿'] },
  { key: 'protein', displayName: '단백질', keywords: ['단백질', '고기', '닭가슴살'] },
  { key: 'carbohydrate', displayName: '탄수화물', keywords: ['탄수', '면', '빵', '라면'] },
  { key: 'comfort_food', displayName: '위로가 되는 음식', phrases: ['먹고 싶던 거', '위로 음식'] },
  { key: 'caffeine', displayName: '카페인', keywords: ['카페인'], defaultConfidence: 0.85 },
  { key: 'coffee', displayName: '커피', parentId: 'food:caffeine', keywords: ['커피', '아메리카노', '라떼'], defaultConfidence: 0.9 },
  { key: 'energy_drink', displayName: '에너지 드링크', parentId: 'food:caffeine', keywords: ['에너지드링크', '몬스터', '핫식스'] },
  // 마셨다는 사실만 적는다. 몸에 좋다 나쁘다는 판단은 하지 않는다.
  // '술술 풀렸다' 같은 말에 걸리지 않도록 한 글자 '술' 은 넣지 않는다.
  { key: 'alcohol', displayName: '술', keywords: ['맥주', '소주', '와인', '막걸리', '하이볼', '칵테일', '음주', '술 마시', '술마시', '술자리', '반주', '한잔했', '한 잔 했'], defaultConfidence: 0.85 },
  { key: 'hydration', displayName: '수분', keywords: ['물 마셨', '물 많이'] },
  { key: 'overeating', displayName: '많이 먹음', keywords: ['과식', '너무 많이 먹'], defaultConfidence: 0.85 },
  { key: 'not_enough_food', displayName: '제대로 못 먹음', keywords: ['못 먹었', '굶었', '끼니 걸'], defaultConfidence: 0.85 },
])
