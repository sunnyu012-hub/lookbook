/** CREATIVE — 짓고 만드는 일. */
import { defineTags } from './define'

export const CREATIVE_TAGS = defineTags('creative', [
  { key: 'coding', displayName: '코딩', parentId: 'activity:creative', keywords: ['코딩', '개발', '코드', '디버깅', '버그 잡'], defaultConfidence: 0.85, ruleHints: { futureSensitive: true } },
  { key: 'app_building', displayName: '앱 만들기', parentId: 'creative:coding', keywords: ['앱 만들', '앱만들', '앱 개발'], defaultConfidence: 0.9, ruleHints: { futureSensitive: true } },
  { key: 'design', displayName: '디자인 작업', parentId: 'activity:creative', keywords: ['디자인했', '시안 만들'], ruleHints: { futureSensitive: true } },
  { key: 'drawing', displayName: '그림', parentId: 'activity:creative', keywords: ['그림', '드로잉', '스케치'], ruleHints: { futureSensitive: true } },
  { key: 'writing', displayName: '글 쓰기', parentId: 'activity:creative', keywords: ['글 쓰', '글쓰기', '일기 썼'], ruleHints: { futureSensitive: true } },
  { key: 'content_creation', displayName: '콘텐츠 만들기', parentId: 'activity:creative', keywords: ['콘텐츠', '영상 만들', '릴스'], ruleHints: { futureSensitive: true } },
  { key: 'editing', displayName: '편집', parentId: 'activity:creative', keywords: ['영상 편집', '편집했'], ruleHints: { futureSensitive: true } },
  { key: 'planning', displayName: '구상', parentId: 'activity:creative', keywords: ['구상', '설계했'], ruleHints: { futureSensitive: true } },
  { key: 'brainstorming', displayName: '아이디어 내기', parentId: 'activity:creative', keywords: ['브레인스토밍', '아이디어 냈'], ruleHints: { futureSensitive: true } },
  { key: 'prototyping', displayName: '프로토타입', parentId: 'activity:creative', keywords: ['프로토타입', '시제품', '목업'], ruleHints: { futureSensitive: true } },
  { key: 'crafting', displayName: '손으로 만들기', parentId: 'activity:creative', keywords: ['만들기', '뜨개', '공예'], ruleHints: { futureSensitive: true } },
  { key: 'photography', displayName: '사진 찍기', parentId: 'activity:creative', keywords: ['사진 찍', '촬영'], ruleHints: { futureSensitive: true } },
  { key: 'visual_creation', displayName: '보이는 것 만들기', parentId: 'activity:creative', keywords: ['이미지 만들', '그래픽'], ruleHints: { futureSensitive: true } },
  { key: 'research', displayName: '알아보기', parentId: 'activity:creative', keywords: ['리서치', '찾아봤', '조사했'], ruleHints: { futureSensitive: true } },
  { key: 'idea_generation', displayName: '아이디어 떠올리기', parentId: 'activity:creative', keywords: ['아이디어 떠', '생각났'], ruleHints: { futureSensitive: true } },
  { key: 'problem_solving', displayName: '문제 풀기', parentId: 'activity:creative', keywords: ['해결했', '풀었', '고쳤'], ruleHints: { futureSensitive: true } },
  { key: 'building', displayName: '만들어 나가기', parentId: 'activity:creative', keywords: ['구축', '세팅했'], ruleHints: { futureSensitive: true } },
  { key: 'personal_project', displayName: '내 프로젝트', parentId: 'activity:creative', keywords: ['개인 프로젝트', '사이드 프로젝트', '내 프로젝트'], ruleHints: { futureSensitive: true } },
])
