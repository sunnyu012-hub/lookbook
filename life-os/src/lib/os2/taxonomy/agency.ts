/** AGENCY — 내가 고른 일인가 떠맡은 일인가. */
import { defineTags } from './define'

export const AGENCY_TAGS = defineTags('agency', [
  { key: 'chosen', displayName: '내가 고른 것', phrases: ['내가 하고 싶어서', '스스로 골랐'], defaultConfidence: 0.8 },
  { key: 'obligated', displayName: '해야 해서', keywords: ['해야 해서', '해야 하니까', '의무'], defaultConfidence: 0.8 },
  { key: 'spontaneous', displayName: '즉흥적으로', keywords: ['즉흥', '갑자기 하게', '그냥 나갔'], defaultConfidence: 0.8 },
  { key: 'planned', displayName: '계획한 것', keywords: ['계획', '예정', '하기로 했'], defaultConfidence: 0.8 },
  { key: 'forced', displayName: '어쩔 수 없이', phrases: ['어쩔 수 없이', '억지로'], defaultConfidence: 0.85 },
  { key: 'avoided', displayName: '안 하고 넘김', keywords: ['안 했', '패스했', '건너뛰'] },
  { key: 'initiated', displayName: '내가 먼저 시작', keywords: ['먼저 시작', '내가 먼저'] },
  { key: 'cancelled', displayName: '취소됨', keywords: ['취소', '엎어졌', '무산'], defaultConfidence: 0.85 },
  { key: 'delayed', displayName: '미뤄짐', keywords: ['미뤄졌', '연기'], defaultConfidence: 0.8 },
  { key: 'changed_mind', displayName: '마음이 바뀜', phrases: ['마음이 바뀌', '생각이 바뀌'] },
])
