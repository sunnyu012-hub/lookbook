import type { AppState, AreaId, LivingSceneDef, TimeBand } from '@/types'
import { timeBand } from '@/lib/rpg/time'
import { npcAreaNow } from './routine'

/**
 * 도시에서 한 번만 마주치는 짧은 장면.
 *
 * ── 무엇이 아닌가 ───────────────────────────────────────
 *
 * 이야기가 아니다. 여기서 과거를 밝히거나 갈등을 만들거나 관계를
 * 진전시키지 않는다 — 그건 개인 이야기(StoryChapter)가 할 일이다.
 * 한 장면은 딱 한 가지만 한다: 남매 같다 · 오래 알던 사이 같다 ·
 * 취미가 겹친다. 그 이상을 하면 그건 이미 다른 업데이트다.
 *
 * 보상도 없다. 코인도 경험치도 친밀도도 아이템도 안 준다.
 * **내가 보지 않은 시간에도 이 도시가 굴러가고 있었다**는 걸
 * 한 번 본 것 자체가 전부다.
 *
 * ── 아는 것만 말한다 ────────────────────────────────────
 *
 * 생활 대사와 같은 규칙이다. 시우의 옛 밴드도, 이안의 나이도,
 * 하린과 유현의 정체도, 준의 온라인 이름도, 세라와 재희 사이도
 * 여기서 새어 나오지 않는다. 지호가 시우 앞에서 옛 노래를 트는
 * 장면은 있어도, 지호는 끝까지 그가 누구였는지 모른다.
 *
 * ── 억지로 모으지 않는다 ────────────────────────────────
 *
 * 등장하는 사람들이 지금 **실제로** 그 동네에 있어야 한다.
 * 장면을 보여주려고 사람을 순간이동시키지 않는다. 그래서 어떤
 * 날은 조건이 안 맞고, 그건 정상이다 — 못 본 장면은 사라지지
 * 않고 다음에 조건이 맞는 날 그대로 거기 있다.
 */
export const LIVING_SCENES: LivingSceneDef[] = [
  {
    // 남매다. 그 말을 아무도 하지 않는다.
    id: 'CAFE_SIBLINGS',
    areaId: 'CAFE_STREET',
    bands: ['MORNING'],
    participants: ['MINA', 'HARU'],
    lines: [
      { kind: 'NARRATION', text: '태오가 카운터에 기대 있다.' },
      { kind: 'SAY', npcId: 'MINA', text: '아침 먹었어?' },
      { kind: 'SAY', npcId: 'HARU', text: '먹었지.' },
      { kind: 'SAY', npcId: 'MINA', text: '뭐 먹었는데.' },
      { kind: 'SAY', npcId: 'HARU', text: '……커피.' },
      { kind: 'NARRATION', text: '하루가 대답 없이 컵을 하나 내려놓는다.' },
      { kind: 'SAY', npcId: 'HARU', text: '왜 아무 말도 안 해.' },
      { kind: 'SAY', npcId: 'MINA', text: '할 말 없어서.' },
    ],
  },
  {
    // 도윤이 알려줬고, 시우가 생각보다 깊게 빠졌다.
    id: 'GYM_ONE_MORE',
    areaId: 'TRAINING_ZONE',
    bands: ['MORNING', 'DAY'],
    participants: ['SIWOO', 'RIO'],
    lines: [
      { kind: 'SAY', npcId: 'SIWOO', text: '이거 진짜 마지막이에요.' },
      { kind: 'SAY', npcId: 'RIO', text: '아까도 마지막이라고 했어요.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '그건 아까의 마지막이고.' },
      { kind: 'NARRATION', text: '도윤이 잠깐 벽을 본다.' },
      { kind: 'SAY', npcId: 'RIO', text: '그럼 이것만 하고 가요.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '봐요. 결국 시키잖아요.' },
      { kind: 'SAY', npcId: 'RIO', text: '제가요?' },
    ],
  },
  {
    // 음악이라는 공통점만. 지호는 끝까지 모른다.
    id: 'NIGHT_OLD_SONG',
    areaId: 'NIGHT_TOWN',
    bands: ['NIGHT'],
    participants: ['SIWOO', 'JIHO'],
    lines: [
      { kind: 'NARRATION', text: '트럭 안에서 오래된 노래가 작게 나온다.' },
      { kind: 'SAY', npcId: 'JIHO', text: '형, 이 노래 알아요?' },
      { kind: 'SAY', npcId: 'SIWOO', text: '알죠.' },
      { kind: 'SAY', npcId: 'JIHO', text: '역시.' },
      { kind: 'SAY', npcId: 'SIWOO', text: '뭐가 역시예요.' },
      { kind: 'SAY', npcId: 'JIHO', text: '그냥요.' },
      { kind: 'NARRATION', text: '시우가 타코야끼를 한 번 뒤집는다.' },
      { kind: 'SAY', npcId: 'SIWOO', text: "그 '그냥' 되게 수상한데." },
    ],
  },
  {
    // 잔소리를 순순히 듣는 사이.
    id: 'NIGHT_HOW_MANY_CUPS',
    areaId: 'NIGHT_TOWN',
    bands: ['EVENING', 'NIGHT'],
    participants: ['SORA', 'JEONGWON'],
    lines: [
      { kind: 'NARRATION', text: '정원이 소라 손에 든 컵을 본다.' },
      { kind: 'SAY', npcId: 'JEONGWON', text: '몇 잔째예요.' },
      { kind: 'SAY', npcId: 'SORA', text: '두 잔이요.' },
      { kind: 'SAY', npcId: 'JEONGWON', text: '진짜요?' },
      { kind: 'SAY', npcId: 'SORA', text: '……세 잔.' },
      { kind: 'SAY', npcId: 'JEONGWON', text: '물 사요.' },
      { kind: 'SAY', npcId: 'SORA', text: '네.' },
      { kind: 'SAY', npcId: 'JEONGWON', text: '왜 이렇게 순순히 들어요.' },
      { kind: 'NARRATION', text: '소라가 웃는다.' },
    ],
  },
  {
    // 편의점 오전 직원이 아니라, 음악을 오래 좋아한 사람.
    id: 'RECORD_WAITED_LONGER',
    areaId: 'CREATIVE_DISTRICT',
    bands: ['EVENING'],
    participants: ['MINJI', 'JIHO'],
    lines: [
      { kind: 'NARRATION', text: '민지가 음반 하나를 들고 있다.' },
      { kind: 'SAY', npcId: 'JIHO', text: '그거 새로 들어왔어요.' },
      { kind: 'SAY', npcId: 'MINJI', text: '알아요.' },
      { kind: 'SAY', npcId: 'JIHO', text: '어떻게 알아요?' },
      { kind: 'SAY', npcId: 'MINJI', text: '내가 지호 씨보다 오래 기다렸거든요.' },
      { kind: 'NARRATION', text: '지호가 잠깐 웃는다.' },
      { kind: 'SAY', npcId: 'JIHO', text: '그건 인정.' },
    ],
  },
  {
    // 오래 알고 지낸 사이. 나이 얘기는 한 마디도 없다.
    id: 'WORKSHOP_YOU_DIDNT_EAT',
    areaId: 'CREATIVE_DISTRICT',
    bands: ['DAY'],
    participants: ['LULU', 'JUNE'],
    lines: [
      { kind: 'SAY', npcId: 'LULU', text: '점심 먹었어?' },
      { kind: 'SAY', npcId: 'JUNE', text: '먹었습니다.' },
      { kind: 'SAY', npcId: 'LULU', text: '뭐 먹었는데.' },
      { kind: 'NARRATION', text: '잠깐 조용해진다.' },
      { kind: 'SAY', npcId: 'LULU', text: '안 먹었네.' },
      { kind: 'SAY', npcId: 'JUNE', text: '……왜 물어보셨습니까.' },
      { kind: 'SAY', npcId: 'LULU', text: '그럴 줄 알아서.' },
      { kind: 'NARRATION', text: '미래가 작은 봉투를 건넨다.' },
    ],
  },
  {
    // 활발함과 조용함이 부딪히는 업무 관계.
    id: 'BOOKSHOP_BACKGROUND',
    areaId: 'CREATIVE_DISTRICT',
    bands: ['DAY'],
    participants: ['RAON', 'JAEHUI'],
    lines: [
      { kind: 'SAY', npcId: 'RAON', text: '여기 사진 한 장만 찍으면 안 돼요?' },
      { kind: 'SAY', npcId: 'JAEHUI', text: '사람 없을 때요.' },
      { kind: 'SAY', npcId: 'RAON', text: '지금 없잖아요.' },
      { kind: 'SAY', npcId: 'JAEHUI', text: '저 있잖아요.' },
      { kind: 'NARRATION', text: '라온이 잠깐 멈춘다.' },
      { kind: 'SAY', npcId: 'RAON', text: '사장님은 배경.' },
      { kind: 'SAY', npcId: 'JAEHUI', text: '안 됩니다.' },
    ],
  },
  {
    // 같은 자리를 오래 본 사람들.
    id: 'PARK_LEAVES_FELL',
    areaId: 'GREEN_PARK',
    bands: ['MORNING', 'DAY'],
    participants: ['WOOSIK', 'HAEIN'],
    lines: [
      { kind: 'NARRATION', text: '해인이 나무 아래를 보고 있다.' },
      { kind: 'SAY', npcId: 'HAEIN', text: '여기 잎이 어제보다 많이 떨어졌네요.' },
      { kind: 'SAY', npcId: 'WOOSIK', text: '새벽에 바람 불었어.' },
      { kind: 'SAY', npcId: 'HAEIN', text: '봤어요?' },
      { kind: 'SAY', npcId: 'WOOSIK', text: '안 봐도 알아.' },
      { kind: 'NARRATION', text: '잠깐 뒤,' },
      { kind: 'SAY', npcId: 'WOOSIK', text: '고양이 밥은 줬고.' },
      { kind: 'SAY', npcId: 'HAEIN', text: '그건 물어보지도 않았는데요.' },
      { kind: 'SAY', npcId: 'WOOSIK', text: '알아.' },
    ],
  },
]

export function findScene(id: string): LivingSceneDef | null {
  return LIVING_SCENES.find((s) => s.id === id) ?? null
}

export function hasSeenScene(state: AppState, id: string): boolean {
  return state.discovery.seenSceneIds.includes(id)
}

/**
 * 지금 이 동네에서 볼 수 있는 장면.
 *
 * 조건은 저장하지 않는다 — 동네 · 시간대 · 그 사람들이 지금 어디 있는지 ·
 * 이미 봤는지, 넷을 그때그때 본다. `sceneUnlocked` 같은 걸 굳혀두면
 * 시간이 흐른 뒤 굳은 값과 진짜 상황이 어긋난다.
 *
 * 후보가 둘 이상이어도 **하나만** 돌려준다. 둘을 연달아 자동 재생하면
 * 그건 우연히 마주친 게 아니라 상영회다. 나머지는 다음에 또 온다.
 * 고르는 기준은 정의 순서라 같은 상황에서 늘 같은 장면이 나온다.
 */
export function sceneHere(
  state: AppState,
  areaId: AreaId,
  now: Date = new Date(),
): LivingSceneDef | null {
  const band = timeBand(now)
  return (
    LIVING_SCENES.find((scene) => isSceneOn(state, scene, areaId, band, now)) ?? null
  )
}

function isSceneOn(
  state: AppState,
  scene: LivingSceneDef,
  areaId: AreaId,
  band: TimeBand,
  now: Date,
): boolean {
  if (scene.areaId !== areaId) return false
  if (!scene.bands.includes(band)) return false
  if (hasSeenScene(state, scene.id)) return false
  // 등장하는 사람이 지금 정말 여기 있어야 한다. 장면 때문에 부르지 않는다.
  return scene.participants.every((npcId) => npcAreaNow(npcId, now) === areaId)
}

/** 개발용 — 지금 이 동네에서 후보가 되는 것 전부와, 왜 안 되는지 */
export function sceneCandidates(
  state: AppState,
  areaId: AreaId,
  now: Date = new Date(),
): { scene: LivingSceneDef; seen: boolean; bandOk: boolean; hereOk: boolean }[] {
  const band = timeBand(now)
  return LIVING_SCENES.filter((scene) => scene.areaId === areaId).map((scene) => ({
    scene,
    seen: hasSeenScene(state, scene.id),
    bandOk: scene.bands.includes(band),
    hereOk: scene.participants.every((npcId) => npcAreaNow(npcId, now) === areaId),
  }))
}
