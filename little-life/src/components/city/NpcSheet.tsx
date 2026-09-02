import { useMemo, useState } from 'react'
import type {
  CityEvent,
  InventoryEntry,
  ItemDef,
  NpcDef,
  NpcQuestChainDef,
  NpcState,
  Quest,
} from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { NpcFace } from '@/components/city/NpcFace'
import { Button } from '@/components/ui/Button'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { RarityBadge } from '@/components/rpg/RarityBadge'
import { FriendshipMeter } from '@/components/city/CityBadges'
import { findItem } from '@/lib/rpg/content'
import { meetsLevel } from '@/lib/city/npcs'
import { giftedToday, isGiftable, talkedToday } from '@/lib/city/friendship'
import { pickDialogue } from '@/lib/city/dialogue'
import { npcAreaNow } from '@/lib/city/routine'
import { timeBand } from '@/lib/rpg/time'
import { todayKey } from '@/lib/date'
import { cn } from '@/components/ui/cn'

type Tab = 'TALK' | 'QUEST' | 'GIFT'

interface NpcSheetProps {
  npc: NpcDef | null
  npcState: NpcState
  quests: Quest[]
  inventory: InventoryEntry[]
  equippedIds: Set<string>
  events: CityEvent[]
  /** 이 사람 가게가 지금 문을 열었는지. 가게가 없으면 null. */
  shopOpen: boolean | null
  onClose: () => void
  onTalk: () => void
  onAcceptChain: (chain: NpcQuestChainDef) => void
  onGift: (itemId: string) => void
  /** 방금 건넨 것에 그 사람이 한 말. 아직 안 건넸으면 null. */
  giftReaction: { line: string; leveledUp: boolean } | null
  onDismissGift: () => void
  onOpenShop: () => void
  /** 이 사람 이야기를 몇 장까지 읽었는지 */
  story: { read: number; total: number } | null
  /** 지금 읽을 수 있는 장이 있는지 */
  storyReady: boolean
  onOpenStory: () => void
  /** 정원이 어디까지 열렸는지. 못 찾았으면 0 — 그 얘기는 아예 안 꺼낸다. */
  gardenLevel?: number
  /** 부엌에서 만들어둔 음식. 못 열었으면 빈 배열. */
  foods?: Array<{ itemId: string; name: string; icon: string; count: number }>
}

/**
 * 도시 사람 한 명.
 *
 * 대화 · 의뢰 · 선물을 한 시트 안에서 다 한다.
 * 화면을 더 늘리면 그때부터 이 앱이 모바일 게임처럼 무거워진다.
 */
export function NpcSheet({
  npc,
  npcState,
  quests,
  inventory,
  equippedIds,
  events,
  shopOpen,
  onClose,
  onTalk,
  onAcceptChain,
  onGift,
  giftReaction,
  onDismissGift,
  onOpenShop,
  story,
  storyReady,
  gardenLevel = 0,
  foods = [],
  onOpenStory,
}: NpcSheetProps) {
  const [tab, setTab] = useState<Tab>('TALK')
  // 시트를 여는 동안에는 같은 말을 유지한다. 리렌더마다 대사가 바뀌면 산만하다.
  const [dialogueSeed, setDialogueSeed] = useState(0)

  const line = useMemo(() => {
    if (!npc) return ''
    void dialogueSeed
    /*
     * 어디서 언제 만났는지를 같이 넘긴다. 화면이 직접 시간대를 재거나
     * 목록을 거르지 않는다 — 고르는 일은 전부 resolver 한 곳에서 한다.
     */
    const now = new Date()
    return pickDialogue(npc, npcState.friendship, timeBand(now), events, gardenLevel, Math.random, {
      areaId: npcAreaNow(npc.id, now),
      now,
    })
  }, [npc, npcState.friendship, events, dialogueSeed, gardenLevel])

  if (!npc) return null

  const alreadyTalked = talkedToday(npcState, todayKey())
  const running = quests.filter((q) => q.npcId === npc.id && !q.completed)

  return (
    <BottomSheet open onClose={onClose} title={npc.name}>
      <div className="flex items-start gap-3">
        <NpcFace id={npc.id} avatar={npc.avatar} size={64} />
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-[20px] font-semibold text-ink">{npc.name}</h2>
          <p className="text-[12px] text-inkfaint">{npc.role}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-inkdim">{npc.description}</p>
        </div>
      </div>

      <div className="mt-4">
        <FriendshipMeter friendship={npcState.friendship} />
      </div>

      {/* 이야기. 친밀도 숫자만 오르면 그건 게이지지 관계가 아니다. */}
      {story && story.total > 0 && (
        <button
          type="button"
          onClick={onOpenStory}
          className={cn(
            'mt-3 flex w-full items-center gap-2.5 rounded-card px-3.5 py-3 text-left',
            'transition-transform duration-150 ease-out active:scale-[0.98]',
            storyReady
              ? 'border border-lavender-deep/25 bg-lavender-soft/50'
              : 'border border-line bg-surface',
          )}
        >
          <span className="text-[17px] leading-none">💬</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium text-ink">{npc.name}의 이야기</span>
            <span className="mt-0.5 block text-[11.5px] text-inkdim">
              {storyReady ? '하고 싶은 이야기가 있는 것 같다.' : `${story.read} / ${story.total}`}
            </span>
          </span>
          <span aria-hidden className="shrink-0 font-game text-[12px] tracking-widest text-lavender-deep">
            {'■'.repeat(story.read)}
            {'□'.repeat(Math.max(0, story.total - story.read))}
          </span>
        </button>
      )}

      <div className="mt-4 flex gap-1 rounded-pill bg-sunken p-1" role="tablist" aria-label="NPC 메뉴">
        {(
          [
            { key: 'TALK', label: '대화' },
            { key: 'QUEST', label: '의뢰', count: running.length },
            { key: 'GIFT', label: '선물' },
          ] as Array<{ key: Tab; label: string; count?: number }>
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex min-h-[38px] flex-1 items-center justify-center gap-1 rounded-pill',
              'text-[13px] font-medium transition-colors duration-200',
              tab === t.key ? 'bg-surface text-ink shadow-soft' : 'text-inkdim',
            )}
          >
            {t.label}
            {t.count ? (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-pill bg-coral px-1 text-[9px] leading-none text-surface">
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'TALK' && (
          <TalkTab
            npc={npc}
            line={line}
            alreadyTalked={alreadyTalked}
            shopOpen={shopOpen}
            onTalk={() => {
              onTalk()
              setDialogueSeed((n) => n + 1)
            }}
            onOpenShop={onOpenShop}
          />
        )}
        {tab === 'QUEST' && (
          <QuestTab npc={npc} npcState={npcState} running={running} onAccept={onAcceptChain} />
        )}
        {tab === 'GIFT' && (
          <GiftTab
            npc={npc}
            inventory={inventory}
            equippedIds={equippedIds}
            foods={foods}
            alreadyGifted={giftedToday(npcState, todayKey())}
            reaction={giftReaction}
            onGift={onGift}
            onDismissReaction={onDismissGift}
          />
        )}
      </div>
    </BottomSheet>
  )
}

function TalkTab({
  npc,
  line,
  alreadyTalked,
  shopOpen,
  onTalk,
  onOpenShop,
}: {
  npc: NpcDef
  line: string
  alreadyTalked: boolean
  shopOpen: boolean | null
  onTalk: () => void
  onOpenShop: () => void
}) {
  return (
    <div>
      {/* 말풍선 */}
      <div className="relative rounded-card bg-canvas px-4 py-4">
        <span
          aria-hidden
          className="absolute -top-1.5 left-6 h-3 w-3 rotate-45 rounded-[2px] bg-canvas"
        />
        <p className="text-[14.5px] leading-relaxed text-ink">{line}</p>
      </div>

      <Button size="lg" className="mt-4 w-full" onClick={onTalk}>
        {alreadyTalked ? '조금 더 이야기하기' : '인사하기'}
      </Button>
      <p className="mt-2 text-center text-[12px] text-inkfaint">
        {alreadyTalked
          ? '오늘 몫은 이미 나눴어. 그냥 얘기하는 건 언제든 좋아.'
          : '오늘 한 번 인사하면 조금 가까워져.'}
      </p>

      {npc.shopId && (
        <div className="mt-5">
          <Button variant="soft" size="lg" className="w-full" disabled={shopOpen === false} onClick={onOpenShop}>
            🛍️ {shopOpen === false ? '지금은 닫혀 있어' : '가게 보기'}
          </Button>
        </div>
      )}
    </div>
  )
}

function QuestTab({
  npc,
  npcState,
  running,
  onAccept,
}: {
  npc: NpcDef
  npcState: NpcState
  running: Quest[]
  onAccept: (chain: NpcQuestChainDef) => void
}) {
  return (
    <div className="space-y-2.5">
      {running.length > 0 && (
        <div className="rounded-card border border-coral/40 bg-coral-soft/30 px-4 py-3.5">
          <p className="text-[12px] font-medium text-coral-deep">진행 중</p>
          {running.map((q) => (
            <div key={q.id} className="mt-2 flex items-center gap-2">
              <CategoryBadge category={q.category} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{q.title}</span>
              {q.step && q.totalSteps && (
                <span className="shrink-0 font-game text-[10px] text-inkfaint">
                  {q.step}/{q.totalSteps}
                </span>
              )}
            </div>
          ))}
          <p className="mt-2 text-[12px] text-inkdim">QUEST 화면에서 이어서 하면 돼.</p>
        </div>
      )}

      {npc.chains.map((chain) => {
        const cleared = npcState.clearedChainIds.includes(chain.id)
        const active = running.some((q) => q.chainId === chain.id)
        const locked = !meetsLevel(npcState.friendship, chain.requiresLevel)
        const rewardItem = chain.rewardItemId ? findItem(chain.rewardItemId) : null

        return (
          <div
            key={chain.id}
            className={cn(
              'rounded-card border px-4 py-3.5',
              cleared ? 'border-leaf-soft bg-leaf-soft/30' : 'border-line bg-surface',
            )}
          >
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  'min-w-0 flex-1 truncate text-[15px] font-semibold',
                  cleared ? 'text-inkdim' : 'text-ink',
                )}
              >
                {chain.name}
              </p>
              {cleared && (
                <span className="shrink-0 rounded-pill bg-leaf px-2 py-0.5 text-[10px] font-medium text-surface">
                  끝냈어
                </span>
              )}
              <span className="shrink-0 font-game text-[10px] text-inkfaint">
                {chain.steps.length}단계
              </span>
            </div>

            <p className="mt-1.5 text-[13px] leading-relaxed text-inkdim">
              {cleared ? chain.outro : chain.intro}
            </p>

            {!cleared && (
              <>
                <ul className="mt-2.5 space-y-1">
                  {chain.steps.map((step, i) => (
                    <li key={i} className="flex items-center gap-2 text-[12.5px] text-inkdim">
                      <span className="font-game text-[10px] text-inkfaint">{i + 1}</span>
                      <span className="truncate">{step.title}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="font-game text-[11px] text-ink">🪙 +{chain.rewardCoins}</span>
                  <span className="font-game text-[11px] text-rose-deep">
                    💗 +{chain.rewardFriendship}
                  </span>
                  {rewardItem && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[14px] leading-none">{rewardItem.icon}</span>
                      <RarityBadge rarity={rewardItem.rarity} />
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  {locked ? (
                    <p className="text-[12.5px] text-inkfaint">
                      조금 더 친해지면 이 얘기를 꺼낼 거야.
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={active}
                      onClick={() => onAccept(chain)}
                    >
                      {active ? '이미 받았어' : '의뢰 받기'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * 뭔가 하나 건네는 자리.
 *
 * ── 정답표를 보여주지 않는다 ──────────────────────────
 *
 * 예전에는 위에 "하루 — coffee · book · sweet 쪽을 좋아해" 라고 적고,
 * 물건마다 `💗 +10` / `좋아할 듯` 을 달아뒀다. 그러면 고르는 일이 아니라
 * 읽는 일이 된다 — 화면이 답을 알려주는데 누가 짐작을 하겠나.
 * 지금은 아무 힌트도 없다. 건네보고 그 사람이 하는 말로 안다.
 *
 * 하루에 한 사람당 하나만 건넨다. 두 번째부터 막는 건 아껴서가 아니라,
 * 안 오르는 걸 알면서 물건만 사라지게 두면 함정이기 때문이다.
 */
function GiftTab({
  npc,
  inventory,
  equippedIds,
  foods,
  alreadyGifted,
  reaction,
  onGift,
  onDismissReaction,
}: {
  npc: NpcDef
  inventory: InventoryEntry[]
  equippedIds: Set<string>
  /** 부엌에서 만들어둔 음식 */
  foods: Array<{ itemId: string; name: string; icon: string; count: number }>
  alreadyGifted: boolean
  reaction: { line: string; leveledUp: boolean } | null
  onGift: (itemId: string) => void
  onDismissReaction: () => void
}) {
  const rows = useMemo(
    () =>
      inventory
        .map((entry) => ({ entry, def: findItem(entry.itemId) }))
        .filter((r): r is { entry: InventoryEntry; def: ItemDef } => r.def !== null)
        .filter((r) => isGiftable(r.def))
        // 끼고 있는 건 주지 않는다. 실수로 벗겨지면 놀란다.
        .filter((r) => !equippedIds.has(r.def.id)),
    [inventory, equippedIds],
  )

  // 방금 건넨 뒤. 숫자 대신 그 사람 얼굴과 한 마디만 남긴다.
  if (reaction) {
    return (
      <div>
        <div className="flex items-start gap-3">
          <NpcFace id={npc.id} avatar={npc.avatar} size={56} />
          <div className="relative min-w-0 flex-1 rounded-card bg-canvas px-4 py-3.5">
            <span
              aria-hidden
              className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 rounded-[2px] bg-canvas"
            />
            <p className="text-[14.5px] leading-relaxed text-ink">{reaction.line}</p>
          </div>
        </div>
        <p className="mt-3 text-center text-[12.5px] text-inkdim">
          {reaction.leveledUp ? '조금 더 가까워진 것 같다.' : '조금 가까워진 것 같다.'}
        </p>
        <Button size="lg" variant="quiet" className="mt-4 w-full" onClick={onDismissReaction}>
          돌아가기
        </Button>
      </div>
    )
  }

  if (alreadyGifted) {
    return (
      <div className="rounded-card border border-dashed border-line px-4 py-6 text-center">
        <p className="text-[13.5px] text-ink">오늘은 이미 하나 받았어.</p>
        <p className="mt-1 text-[12.5px] text-inkfaint">
          다음에 또 와. 안 와도 어디 안 가고 여기 있어.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* 만들어둔 음식. 가방 물건과 나란히 두지 않고 위에 따로 둔다 —
          직접 만든 걸 주는 건 조금 다른 일이다. */}
      {foods.length > 0 && (
        <ul className="mb-3 space-y-2">
          {foods.map((food) => (
            <li key={food.itemId}>
              <button
                type="button"
                onClick={() => onGift(food.itemId)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3 text-left',
                  'transition-transform duration-150 ease-out active:scale-[0.98]',
                )}
              >
                <span className="text-[24px] leading-none">{food.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">
                    {food.name}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-inkdim">
                    직접 만든 것 · {food.count}개
                  </span>
                </span>
                <span className="shrink-0 rounded-pill bg-sunken px-2.5 py-1 text-[11px] font-medium text-inkdim">
                  건네기
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length === 0 && foods.length === 0 ? (
        <div className="rounded-card border border-dashed border-line px-4 py-6 text-center">
          <p className="text-[13.5px] text-ink">아직 줄 만한 게 없네.</p>
          <p className="mt-1 text-[12.5px] text-inkfaint">
            퀘스트를 하다 보면 하나씩 생겨. 끼고 있는 장비는 줄 수 없어.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ entry, def }) => (
            <li key={def.id}>
              <button
                type="button"
                onClick={() => onGift(def.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3 text-left',
                  'transition-transform duration-150 ease-out active:scale-[0.98]',
                )}
              >
                <span className="text-[24px] leading-none">{def.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-medium text-ink">{def.name}</span>
                    {entry.quantity > 1 && (
                      <span className="shrink-0 font-game text-[10px] text-inkfaint">
                        ×{entry.quantity}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
                    {def.description}
                  </span>
                </span>
                <span className="shrink-0 rounded-pill bg-sunken px-2.5 py-1 text-[11px] font-medium text-inkdim">
                  건네기
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
