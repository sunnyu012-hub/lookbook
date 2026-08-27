import type { CreatureDef, CreatureId, CreatureStepDef } from '@/types'

/**
 * 잠든 돌문에 사는 것들.
 *
 * ── 얻는 게 아니다 ──────────────────────────────────────
 *
 * 잡지 않는다. 데려오지 않는다. 가방에 안 들어간다.
 * 하는 일은 보고, 알아채고, 한 번 도와주는 것뿐이다.
 *
 * ── 숫자를 올리지 않는다 ────────────────────────────────
 *
 * 호감도도 레벨도 없다. 매일 만나야 오르는 것도 없다.
 * 달라지는 건 그 애가 하는 행동이고, 그건 지나온 걸음에서 계산한다.
 *
 * ── 실패가 없다 ─────────────────────────────────────────
 *
 * 두 갈래가 나오는 자리가 있지만 어느 쪽도 틀린 쪽이 아니다.
 * 진행은 똑같이 되고 읽는 줄만 달라진다. 잘못 골라서 되돌아가는
 * 자리를 만들면 그때부터는 만나는 게 아니라 공략하는 게 된다.
 */

export const CREATURES: CreatureDef[] = [
  {
    id: 'stone_bean',
    name: '돌콩이',
    icon: '🪨',
    roomId: 'CORRIDOR',
    description: '돌처럼 웅크리고 있는 작은 생명체.',
    ambient: [
      '돌 위에서 졸고 있다.',
      '작은 돌 하나를 굴리고 있다.',
      '눈이 마주치자 고개를 조금 들었다.',
      '오늘은 복도 입구 가까이에 있다.',
    ],
  },
  {
    id: 'moss_dream',
    name: '이끼몽',
    icon: '🌿',
    roomId: 'SMALL_ROOM',
    description: '이끼 사이에 가만히 섞여 있던 작은 생명체.',
    ambient: [
      '벽 아래에서 천천히 움직이고 있다.',
      '이끼 위에 몸을 반쯤 묻고 있다.',
      '전에 없던 곳에 조그만 이끼 자국이 생겼다.',
      '옆에 앉아도 신경 쓰지 않는다.',
    ],
  },
  {
    id: 'glow_pebble',
    name: '반딧돌',
    icon: '✨',
    roomId: 'INNER_DOOR',
    description: '어두운 곳에서 희미하게 빛나는 작은 생명체.',
    ambient: [
      '복도 끝에서 작은 빛이 두 번 깜빡였다.',
      '잠깐 앞서가다 멈췄다.',
      '돌 틈 사이를 천천히 비추고 있다.',
      '오늘은 빛이 조금 옅다.',
    ],
  },
  {
    id: 'stone_sleeper',
    name: '돌잠이',
    icon: '🗿',
    roomId: 'INNER_HALL',
    description: '안쪽의 큰 방에서 오래 움직이지 못하고 있던 커다란 생명체.',
    ambient: [
      '몸을 둥글게 말고 쉬고 있다.',
      '작은 돌 몇 개가 주변에 모여 있다.',
      '눈을 감고 있는 것 같다.',
      '돌콩이가 옆에 앉아 있다.',
    ],
  },
]

// ── 돌콩이 ──────────────────────────────────────────────

const STONE_BEAN: CreatureStepDef[] = [
  {
    id: 'stone_bean:discover',
    creatureId: 'stone_bean',
    roomId: 'CORRIDOR',
    title: '조금 움직인 돌',
    icon: '🪨',
    teaser: '방금 돌 하나가 움직인 것 같다',
    stage: 'DISCOVERED',
    lines: ['방금 돌 하나가 움직인 것 같다.'],
    action: '가까이 살펴본다',
    after: ['가까이 가자 다시 조용해졌다.', '……', '돌 아래에서 작은 눈 두 개가 보였다.'],
    discovers: 'stone_bean',
  },
  {
    id: 'stone_bean:observe',
    creatureId: 'stone_bean',
    roomId: 'CORRIDOR',
    title: '돌콩이',
    icon: '🪨',
    teaser: '돌 사이에 웅크리고 있다',
    stage: 'OBSERVED',
    lines: ['시선이 마주치자 몸을 더 둥글게 말았다.'],
    action: '',
    choices: [
      {
        label: '조금 가까이 가본다',
        lines: ['한 걸음 다가가자 돌 사이로 쏙 들어갔다.', '그래도 멀리 가지는 않았다.'],
      },
      {
        label: '그 자리에 있어본다',
        lines: ['잠시 그대로 있었다.', '돌콩이가 고개만 살짝 내밀었다.'],
      },
    ],
    note: '놀라면 몸을 동그랗게 만다.',
  },
  {
    id: 'stone_bean:understand',
    creatureId: 'stone_bean',
    roomId: 'CORRIDOR',
    title: '돌콩이',
    icon: '🪨',
    teaser: '전보다 조금 옆으로 와 있다',
    stage: 'UNDERSTOOD',
    lines: ['움직이려다가 자꾸 한쪽으로 돌아온다.'],
    action: '주변을 살펴본다',
    after: [
      '작은 돌 사이에 조금 큰 돌 하나가 끼어 있다.',
      '움직일 때마다 몸이 그쪽에 걸리는 것 같다.',
    ],
    note: '돌 사이를 오가며 지낸다.',
  },
  {
    id: 'stone_bean:help',
    creatureId: 'stone_bean',
    roomId: 'CORRIDOR',
    title: '끼어 있는 돌',
    icon: '🪨',
    teaser: '한쪽에 조금 큰 돌이 끼어 있다',
    stage: 'HELPED',
    lines: ['돌콩이가 지나갈 때마다 여기에 걸린다.'],
    action: '걸린 돌을 옆으로 옮긴다',
    after: [
      '돌을 조금 옆으로 밀었다.',
      '돌콩이가 한동안 그대로 있었다.',
      '그러다 천천히 밖으로 나왔다.',
    ],
  },
  {
    id: 'stone_bean:friendly',
    creatureId: 'stone_bean',
    roomId: 'CORRIDOR',
    title: '돌콩이',
    icon: '🪨',
    teaser: '오늘은 먼저 숨지 않았다',
    stage: 'FRIENDLY',
    lines: ['돌콩이가 발밑 가까이까지 왔다.'],
    action: '가만히 바라본다',
    after: ['눈이 마주쳤다.', '이번에는 몸을 말지 않았다.'],
    note: '이제 가까이 가도 숨지 않는다.',
  },
]

// ── 이끼몽 ──────────────────────────────────────────────

const MOSS_DREAM: CreatureStepDef[] = [
  {
    id: 'moss_dream:discover',
    creatureId: 'moss_dream',
    roomId: 'SMALL_ROOM',
    title: '조금 두꺼운 이끼',
    icon: '🌿',
    teaser: '전에 봤을 때보다 조금 더 퍼져 있다',
    stage: 'DISCOVERED',
    lines: ['전에 봤을 때보다 이끼가 조금 더 퍼져 있다.'],
    action: '가까이 본다',
    after: ['가운데가 아주 천천히 들썩였다.', '이끼 사이에서 둥근 등이 올라왔다.'],
    discovers: 'moss_dream',
  },
  {
    id: 'moss_dream:observe',
    creatureId: 'moss_dream',
    roomId: 'SMALL_ROOM',
    title: '이끼몽',
    icon: '🌿',
    teaser: '이끼 사이에 가만히 있다',
    stage: 'OBSERVED',
    lines: ['가까이 가도 움직이지 않는다.'],
    action: '',
    choices: [
      {
        label: '손을 가까이 가져간다',
        lines: ['손을 가까이 가져가 봤다.', '……', '아무 일도 없었다.'],
      },
      {
        label: '주변부터 살펴본다',
        lines: ['이끼몽 주변만 유난히 촉촉하다.', '빛이 드는 쪽의 이끼는 조금 더 짙다.'],
      },
    ],
    note: '움직임이 아주 느리다.',
  },
  {
    id: 'moss_dream:understand',
    creatureId: 'moss_dream',
    roomId: 'SMALL_ROOM',
    title: '마른 바닥',
    icon: '🌫️',
    teaser: '이끼몽이 있는 쪽만 조금 다르다',
    stage: 'UNDERSTOOD',
    // 전에 주웠던 부드러운 동굴 이끼를 여기서 다시 꺼낸다.
    // 새 아이템을 요구하지 않는다 — 이미 발견한 것이 뒤늦게 뜻을 갖는다.
    lines: ['전에 발견했던 부드러운 이끼와 비슷하다.'],
    action: '주변 이끼를 살펴본다',
    after: [
      '이끼몽이 있는 곳만 바닥이 조금 말라 있다.',
      '떨어진 이끼 몇 조각이 가까이에 보인다.',
    ],
    note: '촉촉하고 부드러운 곳을 좋아하는 것 같다.',
  },
  {
    id: 'moss_dream:help',
    creatureId: 'moss_dream',
    roomId: 'SMALL_ROOM',
    title: '떨어진 이끼',
    icon: '🌿',
    teaser: '몇 조각이 바닥에 떨어져 있다',
    stage: 'HELPED',
    lines: ['조금 떨어진 곳에 이끼 몇 조각이 있다.'],
    action: '떨어진 이끼를 가까이에 놓는다',
    after: [
      '떨어져 있던 이끼를 조금 모아 가까이에 두었다.',
      '이끼몽이 아주 조금 움직였다.',
      '새로 놓인 이끼 위에 몸을 기대었다.',
    ],
  },
  {
    id: 'moss_dream:friendly',
    creatureId: 'moss_dream',
    roomId: 'SMALL_ROOM',
    title: '이끼몽',
    icon: '🌿',
    teaser: '전보다 방 가운데 쪽에 와 있다',
    stage: 'FRIENDLY',
    lines: ['가까이 가자 천천히 고개를 들었다.'],
    action: '옆에 잠깐 앉아 있는다',
    after: ['잠시 같이 있었다.', '어느 쪽도 특별히 움직이지 않았다.'],
    note: '요즘은 사람이 있어도 조금 가까이 나온다.',
  },
]

// ── 반딧돌 ──────────────────────────────────────────────

const GLOW_PEBBLE: CreatureStepDef[] = [
  {
    // 아직 발견이 아니다. 빛만 보고 지나간다.
    id: 'glow_pebble:trace',
    creatureId: 'glow_pebble',
    roomId: 'INNER_DOOR',
    title: '문 아래의 빛',
    icon: '💡',
    teaser: '문 아래에서 작은 빛이 한 번 깜빡였다',
    stage: 'UNKNOWN',
    lines: ['가까이 보려는 순간 빛이 사라졌다.'],
    action: '조금 기다린다',
    after: ['잠시 뒤 조금 떨어진 곳에서 다시 빛났다.'],
  },
  {
    id: 'glow_pebble:discover',
    creatureId: 'glow_pebble',
    roomId: 'INNER_DOOR',
    title: '또 보이는 빛',
    icon: '💡',
    teaser: '오늘도 같은 곳에서 작은 빛이 보인다',
    stage: 'DISCOVERED',
    lines: ['이번에는 금방 사라지지 않았다.'],
    action: '',
    choices: [
      {
        label: '가까이 가본다',
        lines: [
          '천천히 가까이 갔다.',
          '빛이 한 번 밝아졌다.',
          '조금 멀어졌지만 사라지지는 않았다.',
        ],
      },
      {
        label: '그 자리에서 기다린다',
        lines: ['움직이지 않고 기다렸다.', '빛이 먼저 조금 가까워졌다.'],
      },
    ],
    after: ['빛 아래에 작은 돌 같은 몸이 보였다.'],
    discovers: 'glow_pebble',
  },
  {
    id: 'glow_pebble:observe',
    creatureId: 'glow_pebble',
    roomId: 'INNER_DOOR',
    title: '반딧돌',
    icon: '✨',
    teaser: '문 근처에서 희미하게 빛난다',
    stage: 'OBSERVED',
    lines: ['몸 전체가 밝은 건 아니다.', '움직일 때마다 등에 있는 작은 무늬가 빛난다.'],
    action: '빛을 따라가 본다',
    after: ['반딧돌이 복도 쪽으로 조금 움직였다.', '어두운 바닥이 잠깐씩 보인다.'],
    note: '움직일 때 작은 빛이 길처럼 이어진다.',
  },
  {
    id: 'glow_pebble:understand',
    creatureId: 'glow_pebble',
    roomId: 'INNER_DOOR',
    title: '복도 끝의 빛',
    icon: '💡',
    teaser: '누군가 그쪽으로 가고 있다',
    stage: 'UNDERSTOOD',
    lines: [
      '복도 끝에서 반딧돌이 한 번 빛났다.',
      '잠시 뒤 돌콩이가 그쪽으로 걸어왔다.',
    ],
    action: '조금 더 본다',
    after: ['길을 비춰주는 것 같다.'],
    note: '다른 생명체들이 어두운 곳을 지날 때 앞에 서곤 한다.',
  },
  {
    id: 'glow_pebble:friendly',
    creatureId: 'glow_pebble',
    roomId: 'INNER_DOOR',
    title: '반딧돌',
    icon: '✨',
    teaser: '문 근처를 맴돌고 있다',
    stage: 'FRIENDLY',
    lines: ['반딧돌이 문 근처를 맴돌고 있다.'],
    action: '조금 떨어져 기다린다',
    after: [
      '한동안 아무 일도 없었다.',
      '반딧돌이 천천히 가까이 왔다.',
      '이번에는 바로 옆에서 빛났다.',
      '잠깐 앞서가다가 뒤를 돌아본다.',
    ],
    note: '요즘은 먼저 가까이 와서 길을 보여준다.',
  },
]

// ── 돌잠이 ──────────────────────────────────────────────

const STONE_SLEEPER: CreatureStepDef[] = [
  {
    id: 'stone_sleeper:approach',
    creatureId: 'stone_sleeper',
    roomId: 'INNER_HALL',
    // 아직 이름을 밝히지 않는다.
    title: '커다란 돌덩이',
    icon: '🪨',
    teaser: '방 한가운데에 있다',
    stage: 'UNKNOWN',
    lines: [
      '방 한가운데에 커다란 돌덩이가 있다.',
      '…움직였다.',
      '돌콩이가 뒤로 한 걸음 물러났다.',
      '반딧돌의 빛도 잠깐 작아졌다.',
    ],
    action: '조금 떨어져 살펴본다',
    after: [
      '커다란 돌덩이가 천천히 몸을 돌리려 했다.',
      '끼익.',
      '바닥에서 금속이 긁히는 소리가 났다.',
      '움직임이 중간에서 멈췄다.',
    ],
  },
  {
    id: 'stone_sleeper:watch',
    creatureId: 'stone_sleeper',
    roomId: 'INNER_HALL',
    title: '커다란 돌덩이',
    icon: '🪨',
    teaser: '같은 자리에서 멈춘다',
    stage: 'UNKNOWN',
    lines: ['다시 움직이려 했지만 같은 자리에서 멈췄다.'],
    action: '조금 더 본다',
    after: ['몸 아래쪽에서 오래된 금속 조각이 보인다.'],
  },
  {
    id: 'stone_sleeper:metal',
    creatureId: 'stone_sleeper',
    roomId: 'INNER_HALL',
    title: '몸 아래의 금속',
    icon: '⛓️',
    teaser: '몸 아래에 뭔가 끼어 있다',
    stage: 'UNDERSTOOD',
    lines: [
      '낡은 금속 조각이 몸 아래에 깊게 끼어 있다.',
      '움직일 때마다 금속이 바닥에 걸린다.',
    ],
    action: '자세히 본다',
    after: ['공격하려는 게 아니라, 움직이지 못하고 있었던 것 같다.'],
  },
  {
    id: 'stone_sleeper:free',
    creatureId: 'stone_sleeper',
    roomId: 'INNER_HALL',
    title: '끼어 있는 금속',
    icon: '⛓️',
    teaser: '작은 것들이 먼저 움직였다',
    stage: 'HELPED',
    lines: [
      '돌콩이가 몸 아래의 작은 돌 하나를 밀었다.',
      '아주 조금 공간이 생겼다.',
      '이끼몽이 그 틈 가까이 천천히 이동했다.',
      '부드러운 이끼가 금속 아래쪽으로 조금 퍼졌다.',
      '반딧돌이 틈 안쪽을 밝게 비췄다.',
      '금속이 어디에 걸려 있는지 보인다.',
    ],
    action: '금속을 조심스럽게 빼낸다',
    after: [
      '금속 조각을 천천히 당겼다.',
      '처음에는 움직이지 않았다.',
      '조금 더 힘을 주자 바닥에서 빠져나왔다.',
      '큰 생명체가 한동안 그대로 있었다.',
      '아주 천천히 몸을 일으켰다.',
      '생각했던 것보다 훨씬 크다.',
      '하지만 가까이 오지는 않았다.',
    ],
    discovers: 'stone_sleeper',
  },
  {
    id: 'stone_sleeper:friendly',
    creatureId: 'stone_sleeper',
    roomId: 'INNER_HALL',
    title: '돌잠이',
    icon: '🗿',
    teaser: '아까보다 편안해 보인다',
    stage: 'FRIENDLY',
    lines: [
      '돌잠이가 몸을 천천히 움직여 봤다.',
      '이번에는 금속 긁히는 소리가 나지 않았다.',
      '돌콩이가 조금 가까이 갔다.',
    ],
    action: '그대로 지켜본다',
    after: [
      '돌잠이가 천천히 고개를 낮췄다.',
      '잠시 뒤 세 작은 생명체가 가까이 모였다.',
      '몇 걸음 움직였다.',
      '바닥에 오래 눌려 있던 자국이 남아 있다.',
      '안쪽 벽 가까이에서 다시 몸을 낮췄다.',
      '전보다 편안해 보인다.',
    ],
    note: '처음부터 공격하려던 건 아니었던 것 같다.',
  },
]

/** 걸음 전부. 순서가 곧 진행 순서다. */
export const CREATURE_STEPS: CreatureStepDef[] = [
  ...STONE_BEAN,
  ...MOSS_DREAM,
  ...GLOW_PEBBLE,
  ...STONE_SLEEPER,
]

/** 생명체별 걸음. 앞에서부터 하나씩 밟는다. */
export const STEPS_BY_CREATURE: Record<CreatureId, CreatureStepDef[]> = {
  stone_bean: STONE_BEAN,
  moss_dream: MOSS_DREAM,
  glow_pebble: GLOW_PEBBLE,
  stone_sleeper: STONE_SLEEPER,
}

/** 문을 여는 셋. 돌잠이는 문 안쪽이라 여기 없다. */
export const DOOR_CREATURE_IDS: CreatureId[] = ['stone_bean', 'moss_dream', 'glow_pebble']

export function findCreature(id: string): CreatureDef | null {
  return CREATURES.find((c) => c.id === id) ?? null
}

export function findCreatureStep(id: string): CreatureStepDef | null {
  return CREATURE_STEPS.find((s) => s.id === id) ?? null
}
