/**
 * BODY — 몸이 어땠나.
 * 진단명은 만들지 않는다. "두통" 은 적지만 "편두통" 같은 병명은 태그가 아니다.
 */
import { defineTags } from './define'

export const BODY_TAGS = defineTags('body', [
  { key: 'good', displayName: '몸이 좋음', keywords: ['몸 좋', '컨디션 좋', '몸이 가뿐'], ruleHints: { negationSensitive: true } },
  { key: 'comfortable', displayName: '몸이 편함', keywords: ['몸 편하', '편안하'], ruleHints: { negationSensitive: true } },
  { key: 'sore', displayName: '뻐근함', keywords: ['뻐근', '쑤시', '결리'], defaultConfidence: 0.8, ruleHints: { negationSensitive: true } },
  { key: 'muscle_soreness', displayName: '근육통', parentId: 'body:sore', keywords: ['근육통', '알 배', '알배'], phrases: ['근육이 아프'], defaultConfidence: 0.85 },
  { key: 'stiff', displayName: '뻣뻣함', parentId: 'body:sore', keywords: ['뻣뻣', '굳었'] },
  { key: 'pain', displayName: '아픔', keywords: ['아프', '아파', '아픈', '아팠', '통증'], defaultConfidence: 0.8, ruleHints: { negationSensitive: true } },
  { key: 'headache', displayName: '두통', parentId: 'body:pain', keywords: ['두통', '머리 아프', '머리아프', '머리가 아프', '머리 아파', '머리가 아파', '골 아프'], defaultConfidence: 0.85 },
  { key: 'neck_tension', displayName: '목이 뻐근함', parentId: 'body:sore', keywords: ['목 뻐근', '목이 뻐근', '목이 아프', '목 아파', '목이 아파', '목 결'] },
  { key: 'shoulder_tension', displayName: '어깨가 뭉침', parentId: 'body:sore', keywords: ['어깨 뭉치', '어깨 뭉쳤', '어깨가 뭉', '어깨 결', '어깨 아프', '어깨가 아프', '어깨 아파'] },
  { key: 'back_discomfort', displayName: '허리가 불편함', parentId: 'body:pain', keywords: ['허리 아프', '허리가 아프', '허리 아파', '허리가 아파', '등이 아프', '등 아파'] },
  { key: 'joint_discomfort', displayName: '관절이 불편함', parentId: 'body:pain', keywords: ['관절', '무릎 아프', '무릎이 아프', '손목 아프', '손목이 아프'] },
  { key: 'hand_discomfort', displayName: '손이 불편함', parentId: 'body:pain', keywords: ['손가락 아프', '손목 시큰', '손이 아프', '손 아파'] },
  { key: 'leg_fatigue', displayName: '다리가 무거움', keywords: ['다리 아프', '다리가 아프', '다리 무겁', '다리가 무겁', '종아리'] },
  { key: 'heavy', displayName: '몸이 무거움', keywords: ['몸 무겁', '몸이 무거', '천근만근'], defaultConfidence: 0.8, ruleHints: { negationSensitive: true } },
  { key: 'light', displayName: '몸이 가벼움', keywords: ['몸 가볍', '몸이 가벼'], ruleHints: { negationSensitive: true } },
  { key: 'hunger', displayName: '배고픔', keywords: ['배고프', '배고파', '배고픔', '허기'], defaultConfidence: 0.85, ruleHints: { negationSensitive: true } },
  { key: 'full', displayName: '배부름', keywords: ['배불러', '배부르', '배부름', '든든'], ruleHints: { negationSensitive: true } },
  { key: 'thirst', displayName: '목마름', keywords: ['목말라', '목마르', '갈증'] },
  { key: 'nausea', displayName: '메스꺼움', keywords: ['메스껍', '울렁', '토할 것 같'] },
  { key: 'digestive_discomfort', displayName: '속이 불편함', keywords: ['속 안 좋', '소화 안', '더부룩', '체한'] },
  { key: 'cold', displayName: '추움', keywords: ['추워', '춥다', '으슬으슬'], ruleHints: { negationSensitive: true } },
  { key: 'hot', displayName: '더움', keywords: ['더워', '덥다', '땀 나'], ruleHints: { negationSensitive: true } },
  { key: 'rested', displayName: '잘 쉰 몸', keywords: ['푹 잤', '잘 잤', '개운'], phrases: ['잘 자서'], defaultConfidence: 0.85, ruleHints: { negationSensitive: true } },
  { key: 'sleep_deprived', displayName: '잠이 부족함', keywords: ['잠 부족', '못 잤', '못잤', '설쳤', '밤샜', '밤새'], phrases: ['잠을 못'], defaultConfidence: 0.85, ruleHints: { negationSensitive: true } },
  { key: 'physically_relaxed', displayName: '몸이 풀림', keywords: ['몸 풀렸', '이완', '나른'] },
])
