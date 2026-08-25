/** NOVELTY — 처음 겪는 것. */
import { defineTags } from './define'

export const NOVELTY_TAGS = defineTags('novelty', [
  { key: 'new_place', displayName: '처음 가본 곳', phrases: ['처음 가', '새로운 곳', '처음 와'], defaultConfidence: 0.85 },
  { key: 'new_food', displayName: '처음 먹어본 것', phrases: ['처음 먹어', '새로운 음식'], defaultConfidence: 0.85 },
  { key: 'new_activity', displayName: '처음 해본 것', phrases: ['처음 해봤', '처음 해 봤'], defaultConfidence: 0.85 },
  { key: 'new_person', displayName: '처음 만난 사람', phrases: ['처음 만난', '새로 알게 된'], defaultConfidence: 0.85 },
  { key: 'new_experience', displayName: '새로운 경험', keywords: ['새로운 경험'], defaultConfidence: 0.85 },
  { key: 'first_time', displayName: '처음', keywords: ['처음으로', '난생처음'], defaultConfidence: 0.8 },
  { key: 'change_of_routine', displayName: '평소와 다른 하루', phrases: ['평소랑 다르', '루틴이 깨'], defaultConfidence: 0.8 },
  { key: 'exploration', displayName: '둘러보기', keywords: ['탐험', '구경', '돌아다녔'] },
])
