/**
 * TEMPORAL — 시간대·요일.
 *
 * 이 태그들은 실제로 저장하지 않는다.
 * quick_logs 에 이미 logged_at · day_part · day_of_week 가 있어서,
 * 태그로 또 저장하면 같은 사실이 두 벌 생긴다.
 * 분석할 때 deriveTemporalTags() 로 그때그때 만들어 쓴다.
 */
import { defineTags } from './define'

export const TEMPORAL_TAGS = defineTags('time', [
  { key: 'early_morning', displayName: '이른 아침' },
  { key: 'morning', displayName: '아침' },
  { key: 'late_morning', displayName: '늦은 아침' },
  { key: 'afternoon', displayName: '낮' },
  { key: 'late_afternoon', displayName: '늦은 오후' },
  { key: 'evening', displayName: '저녁' },
  { key: 'night', displayName: '밤' },
  { key: 'late_night', displayName: '늦은 밤' },
  { key: 'weekday', displayName: '평일' },
  { key: 'weekend', displayName: '주말' },
  { key: 'workday', displayName: '일하는 날' },
  { key: 'day_off', displayName: '쉬는 날' },
])
