/**
 * 캐릭터 표현에 필요한 값만 모아둔 타입.
 *
 * 지금은 표정(mood)만 쓰지만, 나중에 옷 / 헤어 / 액세서리 / 펫이 붙을 자리를
 * 미리 열어둔다. 화면 컴포넌트는 이 타입만 넘기면 되고,
 * 실제 그림이 SVG 든 이미지 스프라이트든 상관하지 않는다.
 *
 * mood 에 슬픔이나 아픔은 넣지 않는다.
 * 퀘스트를 안 했다고 캐릭터가 시무룩해지는 앱은 만들지 않기로 했다.
 */
export type CharacterMood = 'idle' | 'questClear' | 'levelUp'

export interface CharacterLook {
  mood: CharacterMood
  // 향후 확장 예정
  // hair?: string
  // outfit?: string
  // accessory?: string
  // pet?: string
}
