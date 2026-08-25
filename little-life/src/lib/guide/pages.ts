import { CHARACTER, EFFECT, ROOM, UI } from '@/lib/assets'

/**
 * 처음 안내.
 *
 * ── 왜 필요했나 ────────────────────────────────────────
 *
 * 동료도 비밀 장소도 "조건을 채우면 알아서 나타나는" 구조로 만들었다.
 * 그건 발견하는 재미를 위한 선택이었는데, 그런 게 있다는 것 자체를
 * 아무도 말해주지 않으면 발견이 아니라 그냥 없는 것이 된다.
 *
 * ── 어떻게 쓰나 ────────────────────────────────────────
 *
 * 한 장에 한 가지만. 다 읽는 데 1분이면 된다.
 * 아무 때나 닫을 수 있고, 닫아도 다시 안 조른다.
 * 나중에 궁금해지면 나 › 앱 사용법에서 다시 연다.
 *
 * ── 말투 ───────────────────────────────────────────────
 *
 * "해야 한다" 를 쓰지 않는다. 여기 있는 것 중에 안 하면 손해인 건 없다.
 */

export type GuideArt =
  | { kind: 'IMAGE'; src: string }
  | { kind: 'EMOJI'; glyph: string }

/** 글 말고 따로 그려 넣는 것 */
export type GuideExtra =
  /** 동료 넷과 만나는 조건 — 코드에서 뽑아 쓴다 */
  | 'COMPANIONS'
  /** 분야 여섯 개 배지 */
  | 'CATEGORIES'

export interface GuidePage {
  id: string
  title: string
  lines: string[]
  /** 앱 어디를 보면 되는지 한 줄 */
  where?: string
  art: GuideArt
  extra?: GuideExtra
}

export const GUIDE_PAGES: GuidePage[] = [
  {
    id: 'WELCOME',
    title: '여기서 하는 건 하나야',
    lines: [
      '하고 싶은 일을 적어두고, 한 걸 표시한다. 그게 전부야.',
      '나머지는 지내다 보면 하나씩 생기는 것들이라 지금 다 외울 필요 없어.',
    ],
    art: { kind: 'IMAGE', src: CHARACTER.idle },
  },
  {
    id: 'QUEST',
    title: '퀘스트',
    lines: [
      '＋ 를 눌러 할 일을 적고, 끝내면 동그라미를 누른다.',
      '적을 게 생각 안 나면 추천 목록에서 골라도 돼. 매일 한 칸은 처음 보는 게 들어와.',
      '매번 적기 귀찮은 건 반복으로 걸어두면 아침마다 알아서 올라와.',
    ],
    where: '홈 · 퀘스트 탭',
    art: { kind: 'IMAGE', src: UI.questClear },
    extra: 'CATEGORIES',
  },
  {
    id: 'CITY',
    title: '도시와 사람들',
    lines: [
      '지도에서 지금 있을 동네를 고른다. 퀘스트를 끝내면 그 동네에 평판이 쌓여.',
      '동네마다 사람이 있어. 말을 걸고 선물을 주다 보면 의뢰를 주기도 하고, 자기 이야기를 조금씩 해줘.',
    ],
    where: '지도 탭',
    art: { kind: 'EMOJI', glyph: '🗺️' },
  },
  {
    id: 'COLLECTION',
    title: '도감 — 물건 모으기',
    lines: [
      '퀘스트를 끝내면 물건이 하나씩 떨어져. 가게에서 사기도 하고, 작업실에서 만들기도 해.',
      '가게 진열은 매일 새벽에 바뀌어. 어제 봤던 게 오늘은 없을 수도 있어.',
      '♡ 를 눌러두면 그게 들어온 날 알려줄게.',
    ],
    where: '가방 탭 › 도감',
    art: { kind: 'IMAGE', src: EFFECT.sparkle },
  },
  {
    id: 'ROOM',
    title: '내 방 꾸미기',
    lines: [
      '가진 물건은 방에 놓을 수 있어. 끌어서 옮기고, 크기를 바꾸고, 뒤집을 수도 있어.',
      '어울리는 것들을 모으면 방에 걸어둘 수 있는 공기가 하나씩 열려.',
    ],
    where: '홈 › 꾸미기',
    art: { kind: 'IMAGE', src: ROOM.beanbag },
  },
  {
    id: 'COMPANION',
    title: '같이 다니는 아이들',
    lines: [
      '넷이 도시 어딘가에 있어. 처음부터 있는 게 아니라, 그 동네에서 시간을 보내다 보면 어느 날 나타나.',
      '밥을 안 줬다고 배고파하지 않아. 며칠 안 열어봐도 그 자리에 그대로 있어.',
    ],
    where: '홈 맨 위 줄 › 발견함 › 동료',
    art: { kind: 'EMOJI', glyph: '🐾' },
    extra: 'COMPANIONS',
  },
  {
    id: 'DISCOVERY',
    title: '발견함',
    lines: [
      '앱이 네 기록을 보고 알아서 알아보는 것들이 있어 — 밤에 많이 한 사람, 주말에 움직인 사람 같은.',
      '도시 안쪽에 숨은 곳도 몇 군데 있어. 한 동네에 오래 머물다 보면 낌새가 먼저 와.',
      '따로 할 일이 생기는 건 아니야. 이미 한 것에서 나오는 거라 그냥 지내면 돼.',
    ],
    where: '홈 맨 위 줄',
    art: { kind: 'IMAGE', src: EFFECT.star },
  },
  {
    id: 'END',
    title: '천천히 해도 돼',
    lines: [
      '며칠 쉬어도 아무것도 줄어들지 않아. 연속 기록 같은 건 없어.',
      '다시 보고 싶으면 나 › 앱 사용법에서 언제든 열 수 있어.',
    ],
    art: { kind: 'IMAGE', src: CHARACTER.resting },
  },
]
