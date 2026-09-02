import type { AppState, DiscoveryNote, DiscoveryState } from '@/types'
import { addItem } from '@/lib/collection/progress'
import { AUTO_COLLECTIONS, autoProgress, claimableCollections, newlyRevealed } from './collections'
import { SECRETS, newlyFound, newlyHinted, secretProgress } from './secrets'
import { unreadChapters } from './stories'
import { COMPANIONS, hasMet, hintedCompanions, newlyMeetable } from './companions'
import { applyGardenUnlock, applyRareSeeds, isGardenUnlocked } from '@/lib/garden/derive'
import { applyQuarryUnlock, isQuarryUnlocked } from '@/lib/quarry/derive'
import { applyOldKey, isGateFound } from '@/lib/dungeon/derive'
import { isDungeonStoryDone } from '@/lib/dungeon/creatureDerive'
import { applyKitchenUnlock, newlyDiscovered } from '@/lib/kitchen/derive'

/**
 * 발견을 한 번에 정리한다.
 *
 * 퀘스트를 끝내거나 앱을 열 때마다 여기를 한 번 지난다.
 * 새로 눈에 띈 것을 기록하고, 다 채운 것의 보상을 넣어주고,
 * 알려줄 것을 목록으로 돌려준다.
 *
 * ── 한꺼번에 쏟지 않는다 ────────────────────────────
 *
 * 업데이트 직후에는 예전 기록 덕분에 여러 개가 동시에 열린다.
 * 팝업을 열 개 연속으로 띄우면 그건 축하가 아니라 사고다.
 * 그래서 화면에는 하루 두세 개까지만 올리고, 나머지는 발견함에 쌓아둔다.
 */

/** 하루에 화면으로 올릴 수 있는 최대 */
export const NOTES_PER_DAY = 3

/**
 * ── 알림은 조건이 아니라 **기록**을 보고 낸다 ───────────
 *
 * 예전에는 "이번에 새로 열린 것" 만 pending 에 넣었다. 그런데 그 판단이
 * 곧 상태 쓰기이기도 했다 — newlyMeetable 로 보리를 찾으면 그 자리에서
 * companions 에 넣어버린다. 그래서 그 알림이 하루 세 개 제한에 밀리면,
 * **보리는 이미 만난 걸로 저장됐는데 알림은 영영 못 뜬다.**
 * 방에 강아지가 갑자기 나타나 있고 만났다는 말은 어디에도 없다.
 * 실제로 그렇게 됐다.
 *
 * 그래서 조건과 알림을 갈라놨다. 상태를 바꾸는 쪽은 그대로 두고,
 * pending 에는 **지금 참인 것을 전부** 넣는다 (이미 만난 동료 전부,
 * 이미 찾은 비밀 전부). 무엇을 이미 말해줬는지는 seenNoteKeys 하나가
 * 정한다 — 그게 원래 그 필드가 하려던 일이다.
 *
 * 밀려서 못 띄운 알림은 seenNoteKeys 에 안 들어가니 다음에 다시 온다.
 * 조용해지는 것도 그대로다 — 한 번 띄우면 그때 적힌다.
 *
 * (알림 열쇠는 전부 합쳐도 백 개가 안 되고 SEEN_KEYS_KEPT 는 200 이라,
 *  다 말해준 사람의 열쇠가 밀려나서 다시 뜨는 일은 없다.)
 *
 * 새 장소 알림은 **가볼 때까지 안 사라진다.**
 *
 * 나머지 알림은 한 번 띄우면 seenNoteKeys 에 들어가고 다시 안 뜬다.
 * 읽고 지우는 게 전부인 것들이라 그래도 됐다. 그런데 정원·채석장·부엌·
 * 돌문은 다르다 — **영구히 늘어난 장소**인데, 알려주는 건 홈에 잠깐
 * 얹혔다 사라지는 카드 한 장뿐이었다. 그 순간에 화면을 안 보고 있었으면
 * 새 장소가 생긴 줄도 모르고 지나간다. 실제로 부엌이 그렇게 됐다.
 *
 * 그래서 이 넷은 seenNoteKeys 를 안 쓴다. 대신 **거기 첫 안내를 봤는지**로
 * 판단한다 — 들어가 봤으면 안 띄우고, 아직이면 계속 띄운다.
 * 새로 저장할 것이 없다. 이미 있는 값이다.
 */
const PLACE_VISITED: Record<string, (s: AppState) => boolean> = {
  'garden:opened': (s) => s.garden.tutorialSeenAt !== null,
  'quarry:opened': (s) => s.quarry.tutorialSeenAt !== null,
  'kitchen:opened': (s) => s.kitchen.tutorialSeenAt !== null,
  'dungeon:gate': (s) => s.dungeon.tutorialSeenAt !== null,
}

/** 이 알림이 "아직 안 가본 새 장소" 인가 */
export function isPlaceNote(key: string): boolean {
  return key in PLACE_VISITED
}

/** 알림 열쇠를 몇 개까지 기억할지 */
const SEEN_KEYS_KEPT = 200

export function emptyDiscovery(): DiscoveryState {
  return {
    revealedCollectionIds: [],
    claimedCollectionIds: [],
    foundSecretIds: [],
    hintedSecretIds: [],
    readChapterIds: [],
    seenSceneIds: [],
    companions: {},
    activeCompanionId: null,
    hintLevels: {},
    seenNoteKeys: [],
  }
}

export interface DiscoveryResultSet {
  state: AppState
  /** 지금 화면에 띄울 것 (최대 NOTES_PER_DAY 개) */
  notes: DiscoveryNote[]
  /** 이번에 손에 들어온 것 */
  gainedItemIds: string[]
}

/**
 * 지금 상태에서 새로 열린 것을 전부 반영한다.
 *
 * 조건은 전부 이미 있는 기록에서 계산하기 때문에,
 * 업데이트를 켜는 순간 예전 기록이 그대로 반영된다.
 * 따로 backfill 하는 코드가 없는 이유가 그거다.
 */
export function applyDiscovery(state: AppState, now: Date = new Date()): DiscoveryResultSet {
  let next = state
  const pending: DiscoveryNote[] = []
  const gainedItemIds: string[] = []

  // ── 공원 너머 ────────────────────────────────────────
  // 조건은 이미 쌓여 있는 기록에서 센다. 그래서 이 업데이트를 켜는 순간
  // 그동안 초록 공원을 다녀온 사람에게는 바로 열린다.
  const garden = applyGardenUnlock(next, now)
  next = garden.state
  // 여는 **순간**이 아니라 **열려 있는 동안** 낸다. 실제로 띄울지는
  // 아래 PLACE_VISITED 가 정한다 — 가봤으면 그때 조용해진다.
  if (isGardenUnlocked(next)) {
    pending.push({
      key: 'garden:opened',
      kind: 'GARDEN',
      icon: '🌿',
      title: '작은 정원',
      text: '울타리 너머로 작은 정원이 보인다. 오랫동안 아무도 돌보지 않은 것 같지만, 아직 살아 있다.',
    })
  }

  // ── 새로 눈에 띈 컬렉션 ──────────────────────────────
  const revealed = newlyRevealed(next)
  if (revealed.length > 0) {
    next = {
      ...next,
      discovery: {
        ...next.discovery,
        revealedCollectionIds: [
          ...next.discovery.revealedCollectionIds,
          ...revealed.map((d) => d.id),
        ],
      },
    }
  }
  // 조건이 아니라 **기록**을 보고 낸다. 아래 ANNOUNCED_BY_KEY 참고.
  for (const def of AUTO_COLLECTIONS) {
    if (!next.discovery.revealedCollectionIds.includes(def.id)) continue
    pending.push({
      key: `collection:${def.id}`,
      kind: 'AUTO_COLLECTION',
      icon: def.icon,
      title: def.name,
      text: def.description,
    })
  }

  // ── 다 채운 컬렉션의 보상 ────────────────────────────
  const claimable = claimableCollections(next)
  for (const def of claimable) {
    const added = addItem(next.collection, def.rewardItemId, now)
    next = {
      ...next,
      collection: added.collection,
      discovery: {
        ...next.discovery,
        claimedCollectionIds: [...next.discovery.claimedCollectionIds, def.id],
      },
    }
    gainedItemIds.push(def.rewardItemId)
    pending.push({
      key: `collection-done:${def.id}`,
      kind: 'AUTO_COLLECTION',
      icon: def.icon,
      title: `${def.name} — 다 모았어`,
      text: def.description,
    })
  }

  // ── 정원에서 처음 보는 것 ────────────────────────────
  // 조건은 이미 있는 기록에서 세고, 첫 씨앗을 준 적이 있는지만 저장한다.
  const rare = applyRareSeeds(next, now)
  next = rare.state
  for (const crop of rare.found) {
    pending.push({
      key: `rare-crop:${crop.id}`,
      kind: 'GARDEN',
      icon: crop.icon,
      title: `${crop.name} — 씨앗을 하나 얻었다`,
      text: crop.discovery?.reveal ?? crop.description,
    })
  }

  // ── 오래된 채석장 ────────────────────────────────────
  // 조건은 이미 쌓인 기록에서 센다 (정원에서 열 번 거뒀거나 세 가지를 만들어봤거나).
  // 그래서 이 업데이트를 켜는 순간 그동안 해온 사람에게는 바로 열린다.
  const quarry = applyQuarryUnlock(next, now)
  next = quarry.state
  if (isQuarryUnlocked(next)) {
    pending.push({
      key: 'quarry:opened',
      kind: 'QUARRY',
      icon: '⛏️',
      title: '오래된 채석장',
      text: '도시 끝에 오래된 길이 하나 남아 있었다. 예전에 돌을 캐던 자리 같다.',
    })
  }

  // ── 오래된 열쇠 ──────────────────────────────────────
  // 단서 셋(이상한 돌조각 · 낡은 금속 조각 · 태오의 이야기)이 모이면
  // 그 순간 손에 들어온다. 따로 만들거나 사러 갈 데가 없다 —
  // 셋 다 이미 하고 있던 일에서 나온 것이라, 모이면 그게 곧 획득이다.
  const key = applyOldKey(next, now)
  next = key.state
  if (key.gained) {
    pending.push({
      key: 'story:old-key',
      kind: 'DUNGEON',
      icon: '🗝️',
      title: '오래된 열쇠',
      text: '주운 것들을 늘어놓고 보니 하나로 맞춰졌다. 어디에 쓰는 건지는 이제 알 것 같다.',
    })
  }

  // ── 잠든 돌문 ────────────────────────────────────────
  // 열쇠가 있고 막힌 길을 이미 봤으면, 그 자리에 문이 있다는 걸 알게 된다.
  // 어느 쪽이 먼저였는지는 안 따진다.
  if (isGateFound(next)) {
    pending.push({
      key: 'dungeon:gate',
      kind: 'DUNGEON',
      icon: '🚪',
      title: '잠든 돌문',
      text: '돌무더기 너머에 문이 하나 있었다. 오래 닫혀 있었던 것 같다.',
    })
  }

  // ── 첫 던전 이야기가 끝났다 ──────────────────────────
  // 돌잠이와 마지막 걸음까지 갔으면 한 번만 뜬다.
  // 보상은 없다 — 달라진 건 그 방의 공기지 받은 물건이 아니다.
  if (isDungeonStoryDone(next)) {
    pending.push({
      key: 'dungeon:story-done',
      kind: 'DUNGEON',
      icon: '🕳️',
      title: '잠든 돌문',
      text: '처음에는 안쪽에 무서운 게 있을 줄 알았다. 조금 오래 들여다보니 전혀 다른 모습이었다. 이제 이곳의 조용함이 전과는 조금 다르게 느껴진다.',
    })
  }

  // ── 다음 이야기 ──────────────────────────────────────
  // 이야기가 끝난 뒤 한 번. 무엇이 열렸다고 말하지 않는다 —
  // 돌콩이가 입구까지 따라와서 바깥을 본 것뿐이다.
  if (isDungeonStoryDone(next)) {
    pending.push({
      key: 'dungeon:follow',
      kind: 'DUNGEON',
      icon: '🪨',
      title: '입구 가까이',
      text: '뒤에서 작은 돌 굴러가는 소리가 났다. 돌콩이가 입구 가까이까지 따라와 있다. 바깥쪽을 한참 바라봤다. 그러다 다시 안쪽으로 돌아갔다.',
    })
  }

  // ── 작은 부엌 ────────────────────────────────────────
  const kitchen = applyKitchenUnlock(next, now)
  next = kitchen.state
  if (next.kitchen.unlockedAt !== null) {
    pending.push({
      key: 'kitchen:opened',
      kind: 'KITCHEN',
      icon: '🍳',
      title: '작은 부엌',
      text: '정원에서 가져온 것들이 제법 모였다. 뭔가 만들어볼 수 있을 것 같다.',
    })
  }

  // ── 새로 알게 된 레시피 ──────────────────────────────
  // 조건은 정원 기록에서 세기 때문에, 거두다 보면 저절로 하나씩 떠오른다.
  if (kitchen.state.kitchen.unlockedAt !== null) {
    for (const recipe of newlyDiscovered(next, next.discovery.seenNoteKeys)) {
      pending.push({
        key: `recipe:${recipe.id}`,
        kind: 'KITCHEN',
        icon: recipe.icon,
        title: `${recipe.name} — 만들 수 있을 것 같다`,
        text: recipe.description,
      })
    }
  }

  // ── 비밀 장소 ────────────────────────────────────────
  const hinted = newlyHinted(next)
  if (hinted.length > 0) {
    next = {
      ...next,
      discovery: {
        ...next.discovery,
        hintedSecretIds: [...next.discovery.hintedSecretIds, ...hinted.map((s) => s.id)],
      },
    }
  }
  for (const def of SECRETS) {
    // 이미 찾은 곳에 낌새 얘기를 다시 꺼내지 않는다
    if (next.discovery.foundSecretIds.includes(def.id)) continue
    if (!next.discovery.hintedSecretIds.includes(def.id)) continue
    pending.push({
      key: `secret-hint:${def.id}`,
      kind: 'SECRET',
      icon: def.icon,
      title: '뭔가 더 있는 것 같다',
      text: def.hint,
    })
  }

  const found = newlyFound(next)
  if (found.length > 0) {
    next = {
      ...next,
      discovery: {
        ...next.discovery,
        foundSecretIds: [...next.discovery.foundSecretIds, ...found.map((s) => s.id)],
      },
    }
  }
  for (const def of SECRETS) {
    if (!next.discovery.foundSecretIds.includes(def.id)) continue
    pending.push({
      key: `secret:${def.id}`,
      kind: 'SECRET',
      icon: def.icon,
      title: def.name,
      text: def.reveal,
    })
  }

  // ── 읽을 수 있게 된 이야기 ───────────────────────────
  // 여기서는 알려만 준다. 읽는 건 사람이 직접 눌러야 한다.
  for (const def of unreadChapters(next)) {
    pending.push({
      key: `story:${def.id}`,
      kind: 'STORY',
      icon: '💬',
      title: def.title,
      text: '하고 싶은 이야기가 있는 것 같다.',
    })
  }

  // ── 동료 ─────────────────────────────────────────────
  for (const def of hintedCompanions(next)) {
    pending.push({
      key: `companion-hint:${def.id}`,
      kind: 'COMPANION',
      icon: '🐾',
      title: '뭔가 있다',
      text: def.hint,
    })
  }
  const met = newlyMeetable(next)
  if (met.length > 0) {
    const companions = { ...next.discovery.companions }
    for (const def of met) {
      companions[def.id] = { friendship: 0, metAt: now.toISOString(), lastPlayedOn: null }
    }
    next = {
      ...next,
      discovery: {
        ...next.discovery,
        companions,
        // 처음 만난 아이는 바로 같이 다닌다. 고르라고 또 묻지 않는다.
        activeCompanionId: next.discovery.activeCompanionId ?? met[0].id,
      },
    }
  }
  // 여기가 제일 아팠던 자리다 — 보리가 방에 나타났는데 만났다는 말이 없었다.
  for (const def of COMPANIONS) {
    if (!hasMet(next, def.id)) continue
    pending.push({
      key: `companion:${def.id}`,
      kind: 'COMPANION',
      icon: def.avatar,
      title: `${def.name}를 만났다`,
      text: def.reveal,
    })
  }

  // ── 화면에 올릴 것만 고른다 ──────────────────────────
  const unseen = pending.filter((n) => {
    const visited = PLACE_VISITED[n.key]
    // 새 장소는 seenNoteKeys 가 아니라 "가봤는지" 로 가른다
    if (visited) return !visited(next)
    return !next.discovery.seenNoteKeys.includes(n.key)
  })

  /**
   * 새 장소는 하루 세 개 제한 밖에 둔다.
   *
   * 제한은 "축하 카드를 열 장 쏟지 않는다" 는 뜻이었다. 안 가본 장소
   * 알림은 축하가 아니라 이정표다 — 계속 떠 있어야 제 일을 한다.
   * 안에 넣으면 레시피 알림 셋에 매일 가려져서, 안 사라지게 만든 의미가 없다.
   *
   * 넷뿐이고 가보는 순간 사라지니 쌓일 걱정도 없다.
   */
  const places = unseen.filter((n) => isPlaceNote(n.key))
  const rest = unseen.filter((n) => !isPlaceNote(n.key)).slice(0, NOTES_PER_DAY)
  const shown = [...places, ...rest]

  // 새 장소 열쇠는 안 적는다. 적으면 다음부터 위 filter 와 상관없이
  // 한 번 뜨고 끝나는 것으로 되돌아간다.
  const burn = shown.filter((n) => !isPlaceNote(n.key)).map((n) => n.key)
  if (burn.length > 0) {
    const keys = [...next.discovery.seenNoteKeys, ...burn]
    next = {
      ...next,
      discovery: {
        ...next.discovery,
        seenNoteKeys: keys.slice(-SEEN_KEYS_KEPT),
      },
    }
  }

  return { state: next, notes: shown, gainedItemIds }
}

/**
 * 발견함에 쌓여 있는 것.
 *
 * 화면에 안 띄운 것도 여기서는 다 볼 수 있다.
 * 하루 두세 개 제한 때문에 영영 못 보는 것이 생기면 안 된다.
 */
export function discoveryInbox(state: AppState): DiscoveryNote[] {
  const out: DiscoveryNote[] = []

  for (const def of AUTO_COLLECTIONS) {
    if (!state.discovery.revealedCollectionIds.includes(def.id)) continue
    const now = autoProgress(state, def)
    out.push({
      key: `collection:${def.id}`,
      kind: 'AUTO_COLLECTION',
      icon: def.icon,
      title: def.name,
      text: now >= def.target ? '다 모았어.' : `${def.description} (${now}/${def.target})`,
    })
  }

  for (const def of SECRETS) {
    if (state.discovery.foundSecretIds.includes(def.id)) {
      out.push({
        key: `secret:${def.id}`,
        kind: 'SECRET',
        icon: def.icon,
        title: def.name,
        text: def.description,
      })
    } else if (state.discovery.hintedSecretIds.includes(def.id)) {
      out.push({
        key: `secret-hint:${def.id}`,
        kind: 'SECRET',
        icon: def.icon,
        title: '뭔가 더 있는 것 같다',
        text: `${def.hint} (${Math.round(secretProgress(state, def) * 100)}%)`,
      })
    }
  }

  for (const def of unreadChapters(state)) {
    out.push({
      key: `story:${def.id}`,
      kind: 'STORY',
      icon: '💬',
      title: def.title,
      text: '하고 싶은 이야기가 있는 것 같다.',
    })
  }

  return out
}
