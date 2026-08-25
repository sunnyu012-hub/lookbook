/**
 * ACTIVITY — 무엇을 했나 (큰 분류).
 * 더 구체적인 게 있으면 그쪽(sport / work / creative)을 우선한다.
 */
import { defineTags } from './define'

export const ACTIVITY_TAGS = defineTags('activity', [
  { key: 'work', displayName: '일', keywords: ['일했', '업무', 'работ'], phrases: ['일 함', '일하는'], ruleHints: { futureSensitive: true } },
  { key: 'study', displayName: '공부', keywords: ['공부', '스터디', '강의 들'], ruleHints: { futureSensitive: true } },
  { key: 'creative', displayName: '만들기', keywords: ['만들었', '만드는', '작업했'], ruleHints: { futureSensitive: true } },
  { key: 'exercise', displayName: '운동', keywords: ['운동', '헬스', '땀 뺐'], ruleHints: { futureSensitive: true, negationSensitive: true } },
  { key: 'rest', displayName: '쉬기', keywords: ['쉬었', '쉬는', '쉼', '늘어져'], ruleHints: { futureSensitive: true } },
  { key: 'sleep', displayName: '잠', keywords: ['잤', '자고', '수면', '낮잠'], ruleHints: { futureSensitive: true } },
  { key: 'commute', displayName: '이동·출퇴근', keywords: ['출근길', '퇴근길', '통근', '지하철', '버스 탔'], ruleHints: { futureSensitive: true } },
  { key: 'chores', displayName: '집안일', keywords: ['집안일', '빨래', '설거지'], ruleHints: { futureSensitive: true } },
  { key: 'cleaning', displayName: '청소', parentId: 'activity:chores', keywords: ['청소', '치웠', '정리했'], ruleHints: { futureSensitive: true } },
  { key: 'cooking', displayName: '요리', parentId: 'activity:chores', keywords: ['요리', '만들어 먹', '해 먹었'], ruleHints: { futureSensitive: true } },
  { key: 'eating', displayName: '먹기', keywords: ['먹었', '먹음', '식사했'], ruleHints: { futureSensitive: true } },
  { key: 'shopping', displayName: '쇼핑', keywords: ['쇼핑', '장 봤', '샀'], ruleHints: { futureSensitive: true } },
  { key: 'walking', displayName: '걷기', keywords: ['걸었', '산책'], ruleHints: { futureSensitive: true } },
  { key: 'travel', displayName: '여행', keywords: ['여행', '놀러 갔'], ruleHints: { futureSensitive: true } },
  { key: 'outing', displayName: '외출', keywords: ['외출', '나갔다', '나갔었'], ruleHints: { futureSensitive: true } },
  { key: 'conversation', displayName: '대화', keywords: ['얘기했', '이야기했', '대화'], ruleHints: { futureSensitive: true } },
  { key: 'planning', displayName: '계획 세우기', keywords: ['계획 세', '정리하면서 계획'], ruleHints: { futureSensitive: true } },
  { key: 'organizing', displayName: '정리', keywords: ['정리', '분류했'], ruleHints: { futureSensitive: true } },
  { key: 'reading', displayName: '읽기', keywords: ['읽었', '책 봤', '독서'], ruleHints: { futureSensitive: true } },
  { key: 'watching', displayName: '보기', keywords: ['넷플', '유튜브', '드라마 봤', '영화 봤', '영상 봤', '티비 봤', 'tv 봤'], ruleHints: { futureSensitive: true } },
  { key: 'listening', displayName: '듣기', keywords: ['음악 들', '노래 들', '팟캐', '라디오 들', '들으면서'], ruleHints: { futureSensitive: true } },
  { key: 'gaming', displayName: '게임', keywords: ['게임', '롤 했', '겜'], ruleHints: { futureSensitive: true } },
  { key: 'hobby', displayName: '취미', keywords: ['취미'], ruleHints: { futureSensitive: true } },
  { key: 'self_care', displayName: '나 돌보기', keywords: ['스킨케어', '관리했', '손톱'], ruleHints: { futureSensitive: true } },
  { key: 'waiting', displayName: '기다림', keywords: ['기다렸', '기다리는', '대기'], ruleHints: { futureSensitive: true } },
])
