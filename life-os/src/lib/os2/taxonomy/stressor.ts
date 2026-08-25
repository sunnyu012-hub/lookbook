/**
 * STRESSOR — 무엇이 부담이었나.
 * "사람 많았다" 만으로 스트레스를 확정하지 않는다. 힘들었다고 적었을 때만이다.
 */
import { defineTags } from './define'

export const STRESSOR_TAGS = defineTags('stressor', [
  { key: 'workload', displayName: '일이 많아서', contextRequired: ['work:high_workload'], keywords: ['일이 많아서 힘'], defaultConfidence: 0.8 },
  { key: 'deadline', displayName: '마감 때문에', keywords: ['마감 때문', '마감 쫓'], defaultConfidence: 0.85 },
  { key: 'meeting', displayName: '회의 때문에', keywords: ['회의 때문', '회의가 힘'], defaultConfidence: 0.85 },
  { key: 'commute', displayName: '이동이 힘듦', keywords: ['출퇴근 힘', '지하철 힘', '길이 막'], defaultConfidence: 0.8 },
  { key: 'crowd', displayName: '사람이 많아서', phrases: ['사람 많아서 힘', '사람 많아서 지'], defaultConfidence: 0.8 },
  { key: 'noise', displayName: '시끄러워서', phrases: ['시끄러워서 힘', '소음 때문'], defaultConfidence: 0.8 },
  { key: 'conflict', displayName: '갈등 때문에', keywords: ['싸워서 힘', '갈등 때문'], defaultConfidence: 0.8 },
  { key: 'uncertainty', displayName: '모르겠어서', keywords: ['불확실', '어떻게 될지'], defaultConfidence: 0.75 },
  { key: 'time_pressure', displayName: '시간에 쫓겨서', keywords: ['시간 없', '촉박', '쫓겼'], defaultConfidence: 0.8 },
  { key: 'multitasking', displayName: '한꺼번에 여러 일', contextRequired: ['work:multitasking'], keywords: ['동시에 하느라'] },
  { key: 'interruption', displayName: '자꾸 끊겨서', keywords: ['끊겼', '방해받', '자꾸 부르'], defaultConfidence: 0.8 },
  { key: 'sleep_loss', displayName: '잠을 못 자서', contextRequired: ['body:sleep_deprived'], phrases: ['못 자서 힘'], defaultConfidence: 0.85 },
  { key: 'physical_discomfort', displayName: '몸이 불편해서', phrases: ['아파서 힘', '뻐근해서'], defaultConfidence: 0.8 },
  { key: 'hunger', displayName: '배고파서', phrases: ['배고파서 힘', '배고파서 예민'], defaultConfidence: 0.8 },
  { key: 'waiting', displayName: '기다리느라', phrases: ['기다리느라', '기다리는 게 힘'], defaultConfidence: 0.8 },
  { key: 'technical_problem', displayName: '기술 문제', keywords: ['에러', '버그 때문', '안 켜져', '오류'], defaultConfidence: 0.8 },
  { key: 'unexpected_task', displayName: '갑자기 생긴 일', keywords: ['갑자기 일이', '급하게 생긴'], defaultConfidence: 0.8 },
  { key: 'social_pressure', displayName: '눈치 보임', keywords: ['눈치', '부담스러운 자리'], defaultConfidence: 0.75 },
])
