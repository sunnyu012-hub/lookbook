/** WORK — 일의 종류와 결. */
import { defineTags } from './define'

export const WORK_TAGS = defineTags('work', [
  { key: 'meeting', displayName: '회의', parentId: 'activity:work', keywords: ['회의', '미팅', '스탠드업'], defaultConfidence: 0.85, ruleHints: { futureSensitive: true, negationSensitive: true } },
  { key: 'long_meeting', displayName: '긴 회의', parentId: 'work:meeting', phrases: ['회의가 길', '회의 길었', '회의만 몇 시간'], defaultConfidence: 0.85 },
  { key: 'deep_work', displayName: '깊게 파고든 일', parentId: 'activity:work', keywords: ['집중 업무', '몰아서 작업'], ruleHints: { futureSensitive: true } },
  { key: 'creative_work', displayName: '만드는 일', parentId: 'activity:work', keywords: ['기획', '아이디어 회의'], ruleHints: { futureSensitive: true } },
  { key: 'admin', displayName: '잡무', parentId: 'activity:work', keywords: ['잡무', '행정', '서류'], ruleHints: { futureSensitive: true } },
  { key: 'planning', displayName: '업무 계획', parentId: 'activity:work', keywords: ['일정 짰', '스케줄 정리'], ruleHints: { futureSensitive: true } },
  { key: 'writing', displayName: '글쓰기', parentId: 'activity:work', keywords: ['문서 작성', '보고서', '글 썼'], ruleHints: { futureSensitive: true } },
  { key: 'design', displayName: '디자인', parentId: 'activity:work', keywords: ['디자인', '시안', '피그마'], defaultConfidence: 0.85, ruleHints: { futureSensitive: true } },
  { key: 'editing', displayName: '수정 작업', parentId: 'activity:work', keywords: ['편집', '다듬'], ruleHints: { futureSensitive: true } },
  { key: 'review', displayName: '검토', parentId: 'activity:work', keywords: ['리뷰', '검토'], ruleHints: { futureSensitive: true } },
  { key: 'revision', displayName: '피드백 반영', parentId: 'activity:work', keywords: ['수정 요청', '피드백 반영', '컨펌'], ruleHints: { futureSensitive: true } },
  { key: 'presentation', displayName: '발표', parentId: 'activity:work', keywords: ['발표', '프레젠', 'PT'], ruleHints: { futureSensitive: true } },
  { key: 'communication', displayName: '소통', parentId: 'activity:work', keywords: ['커뮤니케이션', '조율'], ruleHints: { futureSensitive: true } },
  { key: 'email', displayName: '메일·메신저', parentId: 'work:communication', keywords: ['메일', '이메일', '슬랙', '메신저'], ruleHints: { futureSensitive: true } },
  { key: 'deadline', displayName: '마감', parentId: 'activity:work', keywords: ['마감', '데드라인'], defaultConfidence: 0.85 },
  { key: 'overtime', displayName: '야근', parentId: 'activity:work', keywords: ['야근', '늦게까지 일'], defaultConfidence: 0.9, ruleHints: { negationSensitive: true } },
  { key: 'multitasking', displayName: '동시에 여러 일', parentId: 'activity:work', keywords: ['멀티태스킹', '동시에 여러'] },
  { key: 'context_switching', displayName: '업무 전환이 잦음', parentId: 'activity:work', phrases: ['왔다 갔다', '이것저것 하느라', '계속 바뀌'] },
  { key: 'high_workload', displayName: '일이 많음', parentId: 'activity:work', keywords: ['일 많', '업무 많', '할 게 산더미'], phrases: ['일이 너무 많'], defaultConfidence: 0.8 },
  { key: 'low_workload', displayName: '일이 적음', parentId: 'activity:work', keywords: ['일 없', '한가', '여유로'] },
  { key: 'finished_work', displayName: '일을 끝냄', parentId: 'activity:work', keywords: ['일 끝', '업무 끝', '퇴근했'], phrases: ['다 끝냈'], defaultConfidence: 0.85 },
  { key: 'work_problem', displayName: '일에서 문제', parentId: 'activity:work', keywords: ['이슈', '문제 생겼', '터졌'] },
])
