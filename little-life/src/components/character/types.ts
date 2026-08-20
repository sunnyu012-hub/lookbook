/**
 * 캐릭터 표현에 필요한 값만 모아둔 타입.
 *
 * 지금은 표정만 쓰지만, 나중에 옷 / 헤어 / 아이템 / 펫이 붙을 자리를
 * 미리 열어둔다. 화면 컴포넌트는 이 타입만 넘기면 되고,
 * 실제 그림이 CSS 든 SVG 든 이미지 스프라이트든 상관하지 않는다.
 */
export type CharacterMood = 'idle' | 'happy' | 'cheer'

export interface CharacterLook {
  mood: CharacterMood
  // 향후 확장 예정
  // outfit?: string
  // hair?: string
  // item?: string
  // pet?: string
}
