import type { AppState, NpcDef, StoryChapterDef } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { NpcFace } from '@/components/city/NpcFace'
import { ItemIcon } from '@/components/collection/ItemIcon'
import { findCollectionItem } from '@/lib/collection/catalog'
import { chapterViews, storyProgress } from '@/lib/discovery/stories'
import { findNpc } from '@/lib/city/npcs'
import { cn } from '@/components/ui/cn'

interface StorySheetProps {
  npc: NpcDef | null
  state: AppState
  onClose: () => void
  onRead: (chapterId: string) => void
}

/**
 * 도시 사람의 이야기.
 *
 * 친밀도 숫자만 오르면 그건 게이지지 관계가 아니라서, 사람마다 짧은 장을 뒀다.
 * 한 장은 서너 줄이다 — 폰에서 스크롤 없이 읽히는 길이.
 *
 * 아직 안 열린 장은 조건을 숫자로 알려주지 않는다.
 * "하루와 몇 번 더 이야기하면" 정도면 충분하고, 그 이상은 숙제 안내문이다.
 */
export function StorySheet({ npc, state, onClose, onRead }: StorySheetProps) {
  if (!npc) return null

  const views = chapterViews(state, npc.id)
  const progress = storyProgress(state, npc.id)
  if (views.length === 0) return null

  return (
    <BottomSheet open onClose={onClose} title={`${npc.name}의 이야기`}>
      <div className="flex items-center gap-3">
        <NpcFace id={npc.id} avatar={npc.avatar} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[18px] font-semibold text-ink">{npc.name}의 이야기</h2>
          <p className="mt-0.5 text-[12.5px] text-inkdim">
            {progress.read} / {progress.total}
          </p>
        </div>
        <span aria-hidden className="shrink-0 font-game text-[13px] tracking-widest text-lavender-deep">
          {views.map((v) => (v.read ? '■' : v.unlocked ? '▶' : '□')).join('')}
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {views.map(({ def, unlocked, read }) => (
          <li key={def.id}>
            {read ? (
              <div className="rounded-card border border-line bg-surface px-3.5 py-3">
                <p className="text-[13.5px] font-medium text-ink">{def.title}</p>
                <ChapterBody def={def} />
                {def.rewardItemId && (
                  <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
                    {(() => {
                      const item = findCollectionItem(def.rewardItemId!)
                      return item ? (
                        <>
                          <ItemIcon item={item} size="sm" />
                          <span className="text-[11.5px] text-inkfaint">{item.nameKo}</span>
                        </>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
            ) : unlocked ? (
              <button
                type="button"
                onClick={() => onRead(def.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-card border px-3.5 py-3 text-left',
                  'border-lavender-deep/25 bg-lavender-soft/50',
                  'transition-transform duration-150 ease-out active:scale-[0.98]',
                )}
              >
                <span className="text-[17px] leading-none">💬</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">
                    {def.title}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-inkdim">
                    하고 싶은 이야기가 있는 것 같다.
                  </span>
                </span>
                <span className="shrink-0 font-game text-[9.5px] text-lavender-deep">읽기</span>
              </button>
            ) : (
              <div className="rounded-card border border-dashed border-line bg-canvas px-3.5 py-3">
                <p className="text-[13.5px] text-inkfaint">???</p>
                <p className="mt-0.5 text-[11.5px] text-inkfaint">{def.lockedHint}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-inkfaint">
        읽는 게 전부야. 따로 뭘 해야 하는 건 아니야.
      </p>
    </BottomSheet>
  )
}

/**
 * 장 하나의 본문.
 *
 * 초반 열다섯 장은 그 사람이 나에게 하는 혼잣말이라 줄만 있으면 됐다.
 * 개인 이야기(K)는 옆에 다른 사람이 같이 서 있어서 누가 말했는지를
 * 보여줘야 한다 — 그 줄 모양은 리빙신(J)에서 쓰던 걸 그대로 쓴다.
 *
 * 새 화면을 만들지 않는다. 같은 시트 안에서 펼쳐진다.
 */
function ChapterBody({ def }: { def: StoryChapterDef }) {
  if (def.scene) {
    return (
      <ul className="mt-2.5 space-y-2">
        {def.scene.map((line, i) =>
          line.kind === 'NARRATION' ? (
            <li key={i} className="px-0.5 text-[12px] leading-relaxed text-inkfaint">
              {line.text}
            </li>
          ) : (
            <li key={i} className="flex items-start gap-2">
              {(() => {
                const npc = findNpc(line.npcId)
                if (!npc) return null
                return (
                  <>
                    <NpcFace id={npc.id} avatar={npc.avatar} size={26} shape="round" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10.5px] text-inkfaint">{npc.name}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink">
                        {line.text}
                      </span>
                    </span>
                  </>
                )
              })()}
            </li>
          ),
        )}
      </ul>
    )
  }

  return (
    <div className="mt-2 space-y-1.5">
      {def.lines.map((line, i) => (
        <p key={i} className="text-[12.5px] leading-relaxed text-inkdim">
          {line}
        </p>
      ))}
    </div>
  )
}
