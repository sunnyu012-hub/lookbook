/**
 * MENTAL STATE — 머리가 어떻게 돌아가고 있었나.
 * 감정(emotion)과 나눠 둔다. "집중이 안 된다" 는 감정이 아니라 상태다.
 */
import { defineTags } from './define'

export const MENTAL_TAGS = defineTags('mental', [
  {
    key: 'focused',
    displayName: '집중됨',
    keywords: ['집중', '집중돼', '집중된', '집중 잘'],
    phrases: ['집중 잘 됐', '집중이 잘'],
    defaultConfidence: 0.8,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'deep_focus',
    displayName: '깊이 몰입함',
    parentId: 'mental:focused',
    keywords: ['몰입', '푹 빠져', '시간 가는 줄'],
    phrases: ['시간 가는 줄 몰랐'],
    defaultConfidence: 0.85,
  },
  {
    key: 'flow',
    displayName: '흐름 탐',
    parentId: 'mental:deep_focus',
    keywords: ['플로우', '술술 풀', '막힘없이'],
    phrases: ['술술 됐', '술술 풀렸'],
    defaultConfidence: 0.85,
  },
  {
    key: 'hyperfocus',
    displayName: '과몰입',
    parentId: 'mental:deep_focus',
    keywords: ['과몰입', '빠져서 못 나오'],
  },
  {
    key: 'engaged',
    displayName: '푹 빠져 있음',
    keywords: ['빠져들', '흥미롭', '몰두'],
  },
  {
    key: 'motivated',
    displayName: '의욕 있음',
    keywords: ['의욕', '하고 싶어', '동기부여', '열정'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'unmotivated',
    displayName: '의욕 없음',
    keywords: ['의욕 없', '하기 싫', '귀찮', '무기력'],
    phrases: ['아무것도 하기 싫', '의욕이 없', '의욕이 하나도 없', '의욕 하나도 없'],
    defaultConfidence: 0.8,
  },
  {
    key: 'distracted',
    displayName: '산만함',
    keywords: ['산만', '집중 안', '딴생각', '딴 생각'],
    phrases: [
      '집중이 안', '집중이 하나도 안', '집중 하나도 안',
      '집중이 전혀 안', '집중이 잘 안', '자꾸 딴',
    ],
    defaultConfidence: 0.8,
  },
  {
    key: 'brain_fog',
    displayName: '머리가 멍함',
    keywords: ['멍하', '멍함', '멍때', '띵하'],
    phrases: ['머리 안 돌아', '머리가 안 돌아', '생각이 안 나', '머리가 하얘'],
    defaultConfidence: 0.85,
  },
  {
    key: 'overwhelmed',
    displayName: '벅참',
    keywords: ['버겁', '과부하', '멘붕'],
    phrases: ['멘탈 갈림', '멘탈갈림', '정신 없', '정신없', '감당이 안'],
    defaultConfidence: 0.85,
  },
  {
    key: 'mentally_tired',
    displayName: '머리가 지침',
    keywords: ['머리 아프', '뇌 피로', '생각하기 싫'],
    phrases: ['머리가 지쳤', '머리 쓰기 싫'],
  },
  {
    key: 'clear_headed',
    displayName: '머리가 맑음',
    keywords: ['맑', '또렷'],
    phrases: ['머리가 맑', '정신이 또렷'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'restless',
    displayName: '안절부절',
    keywords: ['안절부절', '가만 못', '들썩'],
  },
  {
    key: 'decisive',
    displayName: '결정이 잘 됨',
    keywords: ['결정했', '정했', '결단'],
  },
  {
    key: 'indecisive',
    displayName: '결정을 못 함',
    keywords: ['못 정하', '결정 못', '고민만', '망설'],
    phrases: ['어떻게 할지 모르'],
  },
  {
    key: 'productive_feeling',
    displayName: '많이 한 느낌',
    keywords: ['생산적', '많이 했', '알차'],
    phrases: ['많이 한 것 같'],
  },
  {
    key: 'stuck',
    displayName: '막힘',
    keywords: ['막혔', '막힘', '안 풀리', '진도 안'],
    phrases: ['안 풀린', '어디서 막혔'],
    defaultConfidence: 0.8,
  },
  {
    key: 'creative',
    displayName: '머리가 잘 돌아감',
    keywords: ['아이디어 잘', '창의적'],
    phrases: ['머리가 잘 돌아'],
  },
  {
    key: 'ruminating',
    displayName: '생각이 맴돎',
    keywords: ['계속 생각', '맴돌', '곱씹'],
    phrases: ['생각이 안 떠나', '자꾸 생각나'],
  },
  {
    key: 'mentally_relaxed',
    displayName: '머리가 쉬는 중',
    keywords: ['생각 안 하', '머리 비우'],
    phrases: ['아무 생각 없'],
  },
  {
    key: 'pressure',
    displayName: '압박감',
    keywords: ['압박', '부담', '쫓기'],
    phrases: ['쫓기는 느낌', '부담스러'],
    defaultConfidence: 0.8,
  },
  {
    key: 'avoidance',
    displayName: '피하고 있음',
    keywords: ['피하고', '외면', '미루고 싶'],
  },
  {
    key: 'procrastination',
    displayName: '미룸',
    parentId: 'mental:avoidance',
    keywords: ['미뤘', '미룸', '나중에 하자', '딴짓'],
    defaultConfidence: 0.8,
  },
  {
    key: 'satisfied_with_progress',
    displayName: '진도에 만족',
    keywords: ['진도 잘', '많이 나갔'],
    phrases: ['생각보다 많이 했'],
  },
])
