import type { AreaDef, BattleDef, ClassDef, ItemDef } from '@/types'

/**
 * 이번 업데이트의 모든 밸런스 값이 여기 모여 있다.
 * 숫자를 고칠 일이 생기면 이 파일만 열면 된다.
 *
 * 검·갑옷·성 대신 머그컵·헤드폰·운동화·카페·공원으로 만든다.
 */

// ── 지역 ────────────────────────────────────────────────
export const AREAS: AreaDef[] = [
  {
    id: 'HOME_BASE',
    name: 'Home Base',
    icon: '🏠',
    description: '쉬고, 정리하고, 하루를 다시 시작하는 나의 작은 자리.',
    categories: ['LIFE', 'MIND'],
    buffName: 'HOME COMFORT',
    buffLabel: 'LIFE · MIND EXP +5%',
    bonuses: { expPctByCategory: { LIFE: 5, MIND: 5 } },
  },
  {
    id: 'CAFE_STREET',
    name: 'Cafe Street',
    icon: '☕',
    description: '커피 한 잔 놓고 집중이 잘 붙는 거리.',
    categories: ['WORK', 'MIND'],
    buffName: 'DEEP FOCUS',
    buffLabel: 'WORK EXP +10%',
    bonuses: { expPctByCategory: { WORK: 10 } },
  },
  {
    id: 'GREEN_PARK',
    name: 'Green Park',
    icon: '🌳',
    description: '바람이 통하는 곳. 몸을 움직이거나 사람을 만나기 좋다.',
    categories: ['BODY', 'HEART'],
    buffName: 'FRESH AIR',
    buffLabel: 'BODY EXP +10%',
    bonuses: { expPctByCategory: { BODY: 10 } },
  },
  {
    id: 'CREATIVE_DISTRICT',
    name: 'Creative District',
    icon: '🎨',
    description: '뭔가 만들고 싶어지는 동네. 좋은 게 자주 굴러다닌다.',
    categories: ['PLAY', 'MIND'],
    buffName: 'INSPIRATION',
    buffLabel: 'PLAY EXP +10% · Rare Drop +3%',
    bonuses: { expPctByCategory: { PLAY: 10 }, rareDropChancePct: 3 },
  },
  {
    id: 'TRAINING_ZONE',
    name: 'Training Zone',
    icon: '👟',
    description: '몸 쓰는 일에만 집중하는 공간.',
    categories: ['BODY'],
    buffName: 'TRAINING MODE',
    buffLabel: 'BODY 보상 +15%',
    bonuses: { rewardPctByCategory: { BODY: 15 } },
  },
  {
    id: 'NIGHT_TOWN',
    name: 'Night Town',
    icon: '🌙',
    description: '조용해진 도시. 생각을 정리하기 좋은 시간.',
    categories: ['MIND', 'LIFE', 'HEART'],
    buffName: 'NIGHT CALM',
    buffLabel: 'MIND EXP +10%',
    bonuses: { expPctByCategory: { MIND: 10 } },
    nightOnly: true,
  },
]

export function findArea(id: string): AreaDef {
  return AREAS.find((a) => a.id === id) ?? AREAS[0]
}

// ── 직업 ────────────────────────────────────────────────
export const CLASSES: ClassDef[] = [
  {
    id: 'PLANNER',
    name: 'Planner',
    icon: '🗓️',
    description: '큰 일을 쪼개서 끝까지 가는 사람.',
    passiveName: 'STEADY PLAN',
    passiveLabel: 'Hard 퀘스트 EXP +5%',
    bonuses: { hardExpPct: 5 },
  },
  {
    id: 'MAKER',
    name: 'Maker',
    icon: '🛠️',
    description: '만들면서 배우는 사람. 좋은 걸 잘 주워온다.',
    passiveName: 'GOOD EYE',
    passiveLabel: 'Rare 이상 드롭 +3%',
    bonuses: { rareDropChancePct: 3 },
  },
  {
    id: 'EXPLORER',
    name: 'Explorer',
    icon: '🧭',
    description: '어디든 한번 가보는 사람. 주머니가 잘 찬다.',
    passiveName: 'SOUVENIR',
    // 명세의 "Random Quest reward +10%" 를 지금 구조에 맞게 옮겼다 (README 에 적어둠)
    passiveLabel: '모든 퀘스트 Coin +10%',
    bonuses: { coinPct: 10 },
  },
  {
    id: 'CARETAKER',
    name: 'Caretaker',
    icon: '🧺',
    description: '나와 주변을 돌보는 사람.',
    passiveName: 'WARM HANDS',
    passiveLabel: 'LIFE · MIND EXP +3%',
    bonuses: { expPctByCategory: { LIFE: 3, MIND: 3 } },
  },
  {
    id: 'MOVER',
    name: 'Mover',
    icon: '🏃',
    description: '일단 몸을 움직이고 보는 사람.',
    passiveName: 'WARMED UP',
    passiveLabel: 'BODY EXP +10%',
    bonuses: { expPctByCategory: { BODY: 10 } },
  },
]

export function findClass(id: string | null): ClassDef | null {
  return CLASSES.find((c) => c.id === id) ?? null
}

// ── 아이템 ──────────────────────────────────────────────
export const ITEMS: ItemDef[] = [
  // COMMON
  {
    id: 'favorite_mug',
    name: 'Favorite Mug',
    description: '손에 익은 머그컵. 이걸로 마셔야 생각이 정리된다.',
    type: 'EQUIPMENT',
    rarity: 'COMMON',
    icon: '☕',
    equipSlot: 'CHARM',
    effectLabel: 'MIND EXP +3%',
    bonuses: { expPctByCategory: { MIND: 3 } },
  },
  {
    id: 'tiny_hair_clip',
    name: 'Tiny Hair Clip',
    description: '앞머리를 넘길 때 쓰는 작은 핀. 왠지 운이 좋다.',
    type: 'EQUIPMENT',
    rarity: 'COMMON',
    icon: '🎀',
    equipSlot: 'ACCESSORY',
    effectLabel: 'Luck +1',
    bonuses: { luck: 1 },
  },
  {
    id: 'cozy_hoodie',
    name: 'Cozy Hoodie',
    description: '집에서 제일 많이 입는 후드. 입으면 일단 편하다.',
    type: 'EQUIPMENT',
    rarity: 'COMMON',
    icon: '🧥',
    equipSlot: 'TOP',
    effectLabel: 'LIFE EXP +3%',
    bonuses: { expPctByCategory: { LIFE: 3 } },
  },
  {
    id: 'daily_sneakers',
    name: 'Daily Sneakers',
    description: '아무 데나 신고 나가는 운동화.',
    type: 'EQUIPMENT',
    rarity: 'COMMON',
    icon: '👟',
    equipSlot: 'SHOES',
    effectLabel: 'BODY EXP +3%',
    bonuses: { expPctByCategory: { BODY: 3 } },
  },
  {
    id: 'soft_cap',
    name: 'Soft Cap',
    description: '머리 안 감은 날의 친구.',
    type: 'EQUIPMENT',
    rarity: 'COMMON',
    icon: '🧢',
    equipSlot: 'HEAD',
    effectLabel: 'PLAY EXP +2%',
    bonuses: { expPctByCategory: { PLAY: 2 } },
  },
  {
    id: 'comfort_shorts',
    name: 'Comfort Shorts',
    description: '집안일 할 때 제일 편한 반바지.',
    type: 'EQUIPMENT',
    rarity: 'COMMON',
    icon: '🩳',
    equipSlot: 'BOTTOM',
    effectLabel: 'LIFE EXP +2%',
    bonuses: { expPctByCategory: { LIFE: 2 } },
  },

  // RARE
  {
    id: 'noise_cancelling_headphones',
    name: 'Noise Cancelling Headphones',
    description: '쓰는 순간 세상이 조용해진다.',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    icon: '🎧',
    equipSlot: 'ACCESSORY',
    effectLabel: 'WORK EXP +5%',
    bonuses: { expPctByCategory: { WORK: 5 } },
  },
  {
    id: 'lucky_sneakers',
    name: 'Lucky Sneakers',
    description: '이걸 신은 날은 이상하게 더 걷게 된다.',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    icon: '✨',
    equipSlot: 'SHOES',
    effectLabel: 'BODY EXP +5%',
    bonuses: { expPctByCategory: { BODY: 5 } },
  },
  {
    id: 'adventure_tote',
    name: 'Adventure Tote',
    description: '뭐든 일단 담아오는 가방.',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    icon: '👜',
    equipSlot: 'ACCESSORY',
    effectLabel: '드롭 확률 +2%',
    bonuses: { dropChancePct: 2 },
  },
  {
    id: 'focus_watch',
    name: 'Focus Watch',
    description: '남은 시간을 보면 이상하게 더 집중된다.',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    icon: '⌚',
    equipSlot: 'ACCESSORY',
    effectLabel: 'Hard 퀘스트 EXP +5%',
    bonuses: { hardExpPct: 5 },
  },

  // EPIC
  {
    id: 'lucky_keyring',
    name: 'Lucky Keyring',
    description: '언제 생겼는지 모를 키링. 좋은 일이 자주 따라온다.',
    type: 'EQUIPMENT',
    rarity: 'EPIC',
    icon: '🔑',
    equipSlot: 'CHARM',
    effectLabel: 'Rare 이상 드롭 +4%',
    bonuses: { rareDropChancePct: 4 },
  },
  {
    id: 'perfect_work_headset',
    name: 'Perfect Work Headset',
    description: '쓰면 오늘 할 일이 갑자기 할 만해 보인다.',
    type: 'EQUIPMENT',
    rarity: 'EPIC',
    icon: '🎙️',
    equipSlot: 'HEAD',
    effectLabel: 'WORK EXP +8%',
    bonuses: { expPctByCategory: { WORK: 8 } },
  },

  // LEGENDARY — 구조만 열어두고 실제 드롭은 이번 버전에 없다
  {
    id: 'star_fragment',
    name: 'Star Fragment',
    description: '어느 밤 주머니에 들어와 있던 별 조각.',
    type: 'COLLECTIBLE',
    rarity: 'LEGENDARY',
    icon: '⭐',
    equipSlot: null,
    effectLabel: '아직 쓸 곳이 없다',
    bonuses: {},
  },

  // MATERIAL — placeholder
  {
    id: 'spare_button',
    name: 'Spare Button',
    description: '언젠가 쓸 것 같아서 모아둔 단추.',
    type: 'MATERIAL',
    rarity: 'COMMON',
    icon: '🔘',
    equipSlot: null,
    effectLabel: '아직 쓸 곳이 없다',
    bonuses: {},
  },
]

export function findItem(id: string): ItemDef | null {
  return ITEMS.find((i) => i.id === id) ?? null
}

// ── 몬스터 ──────────────────────────────────────────────
export const MONSTERS: BattleDef[] = [
  {
    id: 'dish_slime',
    kind: 'MONSTER',
    name: 'Dish Slime',
    description: '싱크대에서 조금씩 자라는 녀석.',
    category: 'LIFE',
    icon: '🍽️',
    maxHp: 40,
    actions: [
      { label: '컵 씻기', damage: 10 },
      { label: '접시 정리', damage: 15 },
      { label: '프라이팬 씻기', damage: 15 },
    ],
    rewardExp: 40,
    rewardCoins: 20,
    guaranteedRarity: 'COMMON',
  },
  {
    id: 'laundry_blob',
    kind: 'MONSTER',
    name: 'Laundry Blob',
    description: '빨래 바구니에서 부풀어 오른 덩어리.',
    category: 'LIFE',
    icon: '🧺',
    maxHp: 60,
    actions: [
      { label: '세탁기 돌리기', damage: 20 },
      { label: '널기', damage: 20 },
      { label: '개서 넣기', damage: 20 },
    ],
    rewardExp: 60,
    rewardCoins: 30,
    guaranteedRarity: 'COMMON',
  },
  {
    id: 'mail_goblin',
    kind: 'MONSTER',
    name: 'Mail Goblin',
    description: '읽씹한 메일함에 사는 고블린.',
    category: 'WORK',
    icon: '✉️',
    maxHp: 50,
    actions: [
      { label: '급한 것부터 답장', damage: 25 },
      { label: '나머지 훑기', damage: 15 },
      { label: '정리·보관', damage: 10 },
    ],
    rewardExp: 50,
    rewardCoins: 25,
    guaranteedRarity: 'COMMON',
  },
  {
    id: 'task_hydra',
    kind: 'MONSTER',
    name: 'Task Hydra',
    description: '하나 끝내면 두 개가 생기는 그 일.',
    category: 'WORK',
    icon: '🐉',
    maxHp: 120,
    actions: [
      { label: '할 일 쪼개 적기', damage: 20 },
      { label: '제일 작은 것 하나', damage: 25 },
      { label: '중간 것 하나', damage: 35 },
      { label: '남은 것 마무리', damage: 40 },
    ],
    rewardExp: 120,
    rewardCoins: 60,
    guaranteedRarity: 'RARE',
  },
  {
    id: 'clutter_mimic',
    kind: 'MONSTER',
    name: 'Clutter Mimic',
    description: '열어보기 전까진 뭐가 들었는지 모르는 서랍.',
    category: 'LIFE',
    icon: '📦',
    maxHp: 100,
    actions: [
      { label: '전부 꺼내기', damage: 30 },
      { label: '버릴 것 버리기', damage: 40 },
      { label: '자리 정해 넣기', damage: 30 },
    ],
    rewardExp: 100,
    rewardCoins: 50,
    guaranteedRarity: 'RARE',
    bonusRarity: 'EPIC',
  },
]

// ── 보스 ────────────────────────────────────────────────
export const BOSSES: BattleDef[] = [
  {
    id: 'deadline_dragon',
    kind: 'BOSS',
    name: 'Deadline Dragon',
    description: '달력에 빨갛게 표시해둔 그날의 주인.',
    category: 'WORK',
    icon: '🔥',
    maxHp: 300,
    actions: [
      { label: '자료 조사', damage: 50 },
      { label: '초안 작성', damage: 80 },
      { label: '수정', damage: 70 },
      { label: '최종 검수', damage: 100 },
    ],
    rewardExp: 300,
    rewardCoins: 120,
    guaranteedRarity: 'RARE',
    bonusRarity: 'EPIC',
  },
  {
    id: 'cleaning_golem',
    kind: 'BOSS',
    name: 'Cleaning Golem',
    description: '집 전체가 한 덩어리로 뭉친 것.',
    category: 'LIFE',
    icon: '🧹',
    maxHp: 250,
    actions: [
      { label: '바닥 치우기', damage: 60 },
      { label: '먼지 닦기', damage: 60 },
      { label: '욕실', damage: 60 },
      { label: '마지막 정리', damage: 70 },
    ],
    rewardExp: 250,
    rewardCoins: 100,
    guaranteedRarity: 'RARE',
    bonusRarity: 'EPIC',
  },
  {
    id: 'monday_shadow',
    kind: 'BOSS',
    name: 'Monday Shadow',
    description: '일요일 밤부터 따라오는 그림자.',
    category: 'MIND',
    icon: '🌑',
    maxHp: 180,
    actions: [
      { label: '이번 주 할 일 적기', damage: 60 },
      { label: '우선순위 정하기', damage: 60 },
      { label: '첫 한 개 시작', damage: 60 },
    ],
    rewardExp: 180,
    rewardCoins: 80,
    guaranteedRarity: 'COMMON',
    bonusRarity: 'RARE',
  },
]

export const BATTLE_DEFS = [...MONSTERS, ...BOSSES]

export function findBattleDef(id: string): BattleDef | null {
  return BATTLE_DEFS.find((b) => b.id === id) ?? null
}
