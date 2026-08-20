/**
 * MY LIFE TREE — 살아온 기록에서 발견되는 내 삶의 지도.
 *
 * 공략하는 화면이 아니다. 그래서:
 *   · 잠긴 Node 에 "필요 XP" 를 쓰지 않는다. 몇 번 더 적으면 열리는지만 쓴다.
 *   · 어두운 스킬트리처럼 만들지 않는다. 크림 바탕에 별자리처럼 이어 둔다.
 */
import { useState } from 'react'
import type { LifeTree, TreeNode } from '@/lib/analytics/lifeTree'
import { STATUS_KO, STATUS_LABEL } from '@/lib/analytics/lifeTree'
import type { Insight } from '@/lib/analytics/insightEntity'
import { insightsForDomain } from '@/lib/analytics/insightEntity'
import { DOMAIN_META } from '@/lib/domains'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

interface Props {
  tree: LifeTree
  insights: Insight[]
  onClose: () => void
  onOpenManual?: (manualKey: string) => void
}

export function LifeTreePage({ tree, insights, onClose, onOpenManual }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="돌아가기"
          className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard"
        >
          ‹
        </button>
        <div className="flex-1">
          <h1 className="font-pixel text-[15px] uppercase leading-none tracking-[0.04em]">
            My life tree
          </h1>
          <p className="plabel mt-1.5">내 삶의 지도</p>
        </div>
        <span className="plabel">
          {tree.discovered} / {tree.total}
        </span>
      </header>

      <p className="ko px-1">
        공략하는 지도가 아니에요. 기록이 쌓이면 그 영역이 저절로 열려요.
      </p>

      {/* 뿌리 */}
      <div className="flex flex-col items-center py-1">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-pinkdeep bg-pinksoft shadow-hard">
          <PixelSparkle size={10} className="absolute -right-1 -top-1" />
          <span className="font-pixel text-[10px] text-pinkdeep">ME</span>
        </span>
        <span className="h-3 w-[1.5px] bg-border" />
      </div>

      <div className="space-y-2.5">
        {tree.branches.map((branch) => (
          <Branch
            key={branch.key}
            branch={branch}
            insights={insightsForDomain(insights, branch.domain)}
            openKey={open}
            onToggle={(key) => {
              haptic()
              setOpen((prev) => (prev === key ? null : key))
            }}
            onOpenManual={onOpenManual}
          />
        ))}
      </div>

      <p className="px-2 pb-2 text-center text-[11px] leading-relaxed text-inkdim">
        단계는 실력이 아니에요. 그 영역에 기록이 얼마나 쌓였는지를 뜻해요.
      </p>
    </div>
  )
}

function Branch({
  branch,
  insights,
  openKey,
  onToggle,
  onOpenManual,
}: {
  branch: TreeNode
  insights: Insight[]
  openKey: string | null
  onToggle: (key: string) => void
  onOpenManual?: (manualKey: string) => void
}) {
  const meta = DOMAIN_META[branch.domain]
  const found = branch.children.filter((c) => c.status !== 'HIDDEN')
  const asleep = branch.status === 'HIDDEN'
  const expanded = openKey === branch.key

  return (
    <section
      className={cn(
        'overflow-hidden rounded-px4 border-[1.5px] shadow-hard',
        asleep ? 'border-border bg-cream' : 'border-border bg-ivory',
      )}
      style={asleep ? undefined : { borderColor: `${meta.accent}55` }}
    >
      <button
        type="button"
        onClick={() => onToggle(branch.key)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
        style={{ backgroundColor: asleep ? undefined : meta.tint }}
      >
        <PixelImage
          asset={meta.icon}
          height={20}
          className={asleep ? 'opacity-30 saturate-0' : undefined}
        />
        <span className="flex-1">
          <span
            className="block font-pixel text-[11.5px] uppercase tracking-[0.03em]"
            style={{ color: asleep ? undefined : meta.accent }}
          >
            {meta.label}
          </span>
          <span className="plabel mt-1 block">{meta.about}</span>
        </span>
        <span className="font-pixel text-[10px] text-inkdim">
          {found.length} / {branch.children.length}
        </span>
        <span className="text-[11px] text-inkfaint">{expanded ? '⌄' : '›'}</span>
      </button>

      {expanded && (
        <div className="space-y-1.5 px-3 pb-3 pt-1">
          {branch.children.map((node) => (
            <NodeRow key={node.key} node={node} accent={meta.accent} />
          ))}

          {insights.length > 0 && (
            <div className="mt-2.5 border-t border-dashed border-border pt-2.5">
              <p className="plabel mb-1.5">이 영역에서 발견한 것</p>
              <ul className="space-y-1.5">
                {insights.slice(0, 3).map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      disabled={!i.manualKey || !onOpenManual}
                      onClick={() => i.manualKey && onOpenManual?.(i.manualKey)}
                      className="flex w-full items-start gap-2 text-left"
                    >
                      <PixelImage asset={i.icon} height={13} className="mt-0.5 shrink-0" />
                      <span className="flex-1 text-[12.5px] leading-relaxed">{i.body}</span>
                      {i.manualKey && onOpenManual && (
                        <span className="mt-0.5 text-[11px] text-inkfaint">›</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function NodeRow({ node, accent }: { node: TreeNode; accent: string }) {
  const hidden = node.status === 'HIDDEN'
  const left = Math.max(0, node.need - node.have)

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-px3 px-2.5 py-2',
        hidden ? 'bg-cream' : 'bg-cream/70',
      )}
    >
      {hidden ? (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center font-pixel text-[11px] text-inkfaint">
          ?
        </span>
      ) : (
        <PixelImage asset={node.icon} height={18} className="shrink-0" />
      )}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate font-pixel text-[9.5px] uppercase tracking-[0.02em]',
            hidden ? 'text-inkfaint' : 'text-ink',
          )}
        >
          {hidden ? '???' : node.title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-inkdim">
          {hidden ? `${left}번 더 기록하면 열려요` : `${node.ko} · ${STATUS_KO[node.status]}`}
        </span>
      </span>

      {hidden ? (
        <span className="h-[4px] w-[38px] shrink-0 overflow-hidden rounded-full bg-border/50">
          <span
            className="block h-full rounded-full bg-border"
            style={{ width: `${node.progress * 100}%` }}
          />
        </span>
      ) : (
        <span
          className="shrink-0 rounded-full px-2 py-[3px] font-pixel text-[8.5px] uppercase"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          {STATUS_LABEL[node.status]}
        </span>
      )}
    </div>
  )
}

/** ME 화면의 작은 미리보기 */
export function LifeTreePreview({ tree, onOpen }: { tree: LifeTree; onOpen: () => void }) {
  const open = tree.branches.flatMap((b) => b.children).filter((c) => c.status !== 'HIDDEN')
  const latest = open[open.length - 1]

  return (
    <button
      type="button"
      onClick={onOpen}
      className="press w-full rounded-px4 border-[1.5px] border-border bg-ivory p-3.5 text-left shadow-hard"
    >
      <span className="flex items-center gap-1.5">
        <PixelImage asset={DOMAIN_META.joy.icon} height={16} />
        <span className="ptitle flex-1">My life tree</span>
        <span className="plabel">
          {tree.discovered} / {tree.total}
        </span>
        <span className="text-[11px] text-inkfaint">›</span>
      </span>
      <span className="ko mt-2 block">
        {latest
          ? `${latest.title} 까지 열렸어요. 기록이 쌓이면 계속 자라요.`
          : '기록이 쌓이면 내 삶의 지도가 한 칸씩 열려요.'}
      </span>
    </button>
  )
}
