/**
 * ENERGY — 기운.
 *
 * 사용자가 Quick Log 에서 Energy 를 직접 골랐으면 그게 텍스트보다 세다.
 * 다만 숫자 하나로 태그를 자동 생성하지는 않는다 —
 * 이미 energy 컬럼에 있는 값을 태그로 또 저장하면 같은 사실이 두 번 세어진다.
 * (engine.ts 의 structured signal 참고)
 */
import { defineTags } from './define'

export const ENERGY_TAGS = defineTags('energy', [
  {
    key: 'very_high',
    displayName: '기운이 아주 많음',
    keywords: ['에너지 넘치', '기운 넘치', '팔팔'],
    defaultConfidence: 0.8,
  },
  {
    key: 'high',
    displayName: '기운이 좋음',
    keywords: ['기운 나', '쌩쌩', '컨디션 좋'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'stable',
    displayName: '기운이 그럭저럭',
    keywords: ['무난', '평소 같'],
  },
  {
    key: 'low',
    displayName: '기운이 없음',
    keywords: ['기운 없', '힘없', '축 처'],
    phrases: ['기운이 없'],
    defaultConfidence: 0.8,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'very_low',
    displayName: '기운이 바닥',
    parentId: 'energy:low',
    keywords: ['방전', '녹초', '탈진'],
    phrases: ['아무것도 못 하겠'],
    defaultConfidence: 0.85,
  },
  {
    key: 'drained',
    displayName: '기 빨림',
    parentId: 'energy:low',
    keywords: ['기빨', '진 빠지', '소진'],
    phrases: ['기 빨림', '기 빨렸', '기가 빨'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'sleepy',
    displayName: '졸림',
    keywords: ['졸려', '졸림', '졸리', '하품', '눈 감기'],
    defaultConfidence: 0.85,
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'wired',
    displayName: '피곤한데 잠이 안 옴',
    keywords: ['각성', '잠 안 와', '잠이 안'],
    phrases: ['피곤한데 잠', '몸은 피곤한데'],
  },
  {
    key: 'sluggish',
    displayName: '늘어짐',
    keywords: ['늘어지', '늘어져', '늘어짐', '처지', '굼뜨'],
    ruleHints: { negationSensitive: true },
  },
  {
    key: 'recovered',
    displayName: '기운이 돌아옴',
    keywords: ['회복됐', '살아났', '기운 차'],
    phrases: ['좀 나아졌', '살 만해'],
  },
  {
    key: 'crash',
    displayName: '갑자기 떨어짐',
    keywords: ['급 피로', '갑자기 피곤', '뚝 떨어'],
    phrases: ['갑자기 확 피곤'],
  },
  {
    key: 'second_wind',
    displayName: '다시 기운이 남',
    keywords: ['다시 기운', '갑자기 잘 되'],
  },
  {
    key: 'physically_tired',
    displayName: '몸이 피곤함',
    keywords: ['피곤', '피곤해', '피곤함', '피곤하', '개피곤', '넘피곤', '피곤쓰', '지쳤', '지침', '힘들'],
    phrases: ['너무 피곤', '몸이 피곤'],
    defaultConfidence: 0.8,
    ruleHints: { negationSensitive: true },
  },
])
