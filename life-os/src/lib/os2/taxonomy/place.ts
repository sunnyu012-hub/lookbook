/**
 * PLACE — 어디에 있었나.
 * 정확한 주소나 좌표는 태그로 만들지 않는다. 큰 종류만 남긴다.
 */
import { defineTags } from './define'

export const PLACE_TAGS = defineTags('place', [
  { key: 'home', displayName: '집', keywords: ['집에', '집이', '집콕', '재택'], phrases: ['집에서'], defaultConfidence: 0.85 },
  { key: 'workplace', displayName: '일터', keywords: ['회사', '사무실', '오피스'], defaultConfidence: 0.85 },
  { key: 'cafe', displayName: '카페', keywords: ['카페', '스벅', '커피숍'], defaultConfidence: 0.9 },
  { key: 'restaurant', displayName: '식당', keywords: ['식당', '맛집', '레스토랑'], defaultConfidence: 0.85 },
  { key: 'gym', displayName: '헬스장', keywords: ['헬스장', '체육관'], defaultConfidence: 0.85 },
  { key: 'climbing_gym', displayName: '클라이밍장', parentId: 'place:gym', keywords: ['암장', '클라이밍장'], defaultConfidence: 0.9 },
  { key: 'outdoors', displayName: '바깥', keywords: ['밖에', '야외'], phrases: ['밖에서'] },
  { key: 'park', displayName: '공원', parentId: 'place:outdoors', keywords: ['공원', '한강'], defaultConfidence: 0.85 },
  { key: 'shopping_area', displayName: '쇼핑하는 곳', keywords: ['백화점', '마트', '쇼핑몰'] },
  { key: 'transit', displayName: '이동 중', keywords: ['지하철', '버스', '기차', '전철'], defaultConfidence: 0.85 },
  { key: 'car', displayName: '차 안', parentId: 'place:transit', keywords: ['차 안', '운전', '택시'] },
  { key: 'someone_elses_home', displayName: '누군가의 집', keywords: ['본가', '친구 집', '남의 집'] },
  { key: 'event_space', displayName: '행사장', keywords: ['전시', '공연장', '행사'] },
  { key: 'medical_facility', displayName: '병원', keywords: ['병원', '치과', '의원'] },
  { key: 'travel_destination', displayName: '여행지', keywords: ['여행지', '숙소', '호텔'] },
  { key: 'unknown_outside', displayName: '바깥 어딘가', keywords: ['어딘가'] },
])
