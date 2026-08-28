import { useEffect, useState } from 'react'
import type { AppState } from '@/types'
import { CATEGORIES } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { CATEGORY_BADGE } from '@/lib/assets'
import { CATEGORY_LABEL } from '@/lib/labels'
import { GUIDE_PAGES, type GuideArt } from '@/lib/guide/pages'
import { companionViews, meetingLabel, meetingProgress } from '@/lib/discovery/companions'
import { SKINS, ownedSkinCount, skinViews } from '@/lib/character/skins'
import { todayRackIds } from '@/lib/character/rack'
import { CharacterSkinRenderer } from '@/components/character/CharacterSkinRenderer'
import { CompanionArt } from '@/components/discovery/CompanionArt'

interface GuideSheetProps {
  open: boolean
  state: AppState
  /** 처음 보는 중인지 — 마지막 장의 버튼 말이 달라진다 */
  firstRun: boolean
  onClose: () => void
}

/**
 * 처음 안내.
 *
 * ── 높이를 붙잡아 둔다 ─────────────────────────────────
 *
 * 장마다 글 길이가 달라서, 높이를 내용에 맡기면 넘길 때마다 시트 윗변이
 * 손가락 밑에서 오르락내리락한다. 여덟 번 그러면 멀미가 난다.
 * BottomSheet 의 fill 이 이 자리를 위해 있는 것이다.
 *
 * ── 언제든 닫을 수 있다 ────────────────────────────────
 *
 * 끝까지 봐야 닫히는 안내는 안내가 아니라 관문이다.
 * 닫으면 본 것으로 치고 다시 조르지 않는다. 궁금해지면 설정에서 연다.
 */
export function GuideSheet({ open, state, firstRun, onClose }: GuideSheetProps) {
  const [index, setIndex] = useState(0)

  // 다시 열면 처음부터. 지난번에 보다 만 자리에서 시작하면 뭘 봤는지 헷갈린다.
  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  if (!open) return null

  const page = GUIDE_PAGES[index]
  const last = index === GUIDE_PAGES.length - 1

  return (
    <BottomSheet open onClose={onClose} title="앱 사용법" fill>
      <div className="flex h-full flex-col">
        {/* 몇 장 중 몇 번째인지 */}
        <div className="flex shrink-0 justify-center gap-1.5 pb-4 pt-1">
          {GUIDE_PAGES.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`${i + 1}번째`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 rounded-pill transition-all duration-200',
                i === index ? 'w-5 bg-coral' : 'w-1.5 bg-line',
              )}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Art art={page.art} />

          <h2 className="mt-5 text-center text-[20px] font-semibold text-ink">{page.title}</h2>

          <div className="mt-3 space-y-2.5">
            {page.lines.map((line) => (
              <p key={line} className="text-[13.5px] leading-relaxed text-inkdim">
                {line}
              </p>
            ))}
          </div>

          {page.where && (
            <p className="mt-3.5 inline-flex rounded-pill bg-sunken px-3 py-1.5 text-[11.5px] text-inkdim">
              {page.where}
            </p>
          )}

          {page.extra === 'CATEGORIES' && <Categories />}
          {page.extra === 'COMPANIONS' && <Companions state={state} />}
          {page.extra === 'SKINS' && <Skins state={state} />}
        </div>

        <div className="shrink-0 pt-4">
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="soft" className="px-5" onClick={() => setIndex(index - 1)}>
                이전
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={() => (last ? onClose() : setIndex(index + 1))}
            >
              {last ? (firstRun ? '시작하기' : '닫기') : '다음'}
            </Button>
          </div>

          {!last && (
            <button
              type="button"
              onClick={onClose}
              className="mt-1 w-full py-2.5 text-[12px] text-inkfaint active:scale-[0.98]"
            >
              나중에 볼래
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

function Art({ art }: { art: GuideArt }) {
  return (
    <div className="flex h-[132px] items-center justify-center rounded-card bg-canvas">
      {art.kind === 'IMAGE' ? (
        <img src={art.src} alt="" aria-hidden className="h-[104px] w-[104px] object-contain" />
      ) : (
        <span className="text-[52px] leading-none">{art.glyph}</span>
      )}
    </div>
  )
}

/** 퀘스트를 나누는 여섯 갈래 */
function Categories() {
  return (
    <ul className="mt-4 grid grid-cols-3 gap-2">
      {CATEGORIES.map((c) => (
        <li key={c} className="flex items-center gap-1.5 rounded-btn bg-canvas px-2 py-2">
          <img src={CATEGORY_BADGE[c]} alt="" aria-hidden className="h-6 w-6 object-contain" />
          <span className="text-[12px] text-inkdim">{CATEGORY_LABEL[c]}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * 캐릭터 모습 몇 가지.
 *
 * 전부 보여주지 않는다 — 목록은 "내 모습" 화면에 있고, 여기서는
 * "이런 게 있다" 만 알면 된다. 아직 못 얻은 것도 실루엣으로 같이 둔다.
 * 얻을 게 남아 있다는 걸 보여주는 게 여기서 할 일이다.
 */
function Skins({ state }: { state: AppState }) {
  const views = skinViews(state, todayRackIds())
    .filter((v) => !v.hidden)
    .slice(0, 4)
  const owned = ownedSkinCount(state)

  return (
    <div className="mt-4">
      <ul className="grid grid-cols-4 gap-2">
        {views.map(({ def, owned: has }) => (
          <li key={def.id} className="rounded-btn bg-canvas px-1 py-1.5">
            <span
              className={cn(
                'mx-auto flex h-[54px] w-full items-center justify-center',
                !has && 'opacity-30 grayscale',
              )}
            >
              <CharacterSkinRenderer skinId={def.id} animated={false} className="h-[52px] w-auto" />
            </span>
            <span className="mt-1 block truncate text-center text-[9.5px] text-inkdim">
              {def.name}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-[11px] text-inkfaint">
        지금 {owned}가지 · 전부 {SKINS.length}가지
      </p>
    </div>
  )
}

/**
 * 동료 넷과 만나는 조건.
 *
 * 조건은 여기 적지 않고 정의에서 뽑아 쓴다 (meetingLabel).
 * 안내에 손으로 적어두면 조건을 바꿨을 때 안내만 옛말이 되는데,
 * 그건 안내가 없는 것보다 나쁘다.
 */
function Companions({ state }: { state: AppState }) {
  const views = companionViews(state)

  return (
    <ul className="mt-4 space-y-2">
      {views.map(({ def, met }) => {
        const progress = met ? 1 : meetingProgress(state, def.meeting)
        return (
          <li key={def.id} className="rounded-card border border-line bg-surface px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className={cn('shrink-0', !met && 'opacity-45')}>
                <CompanionArt def={def} className="h-9 w-9" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {def.name}
                  <span className="ml-1.5 text-[11px] font-normal text-inkfaint">{def.species}</span>
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
                  {met ? '이미 만났어' : meetingLabel(def.meeting)}
                </span>
              </span>
              {met && <span className="shrink-0 font-game text-[10px] text-sage-deep">만났어</span>}
            </div>

            {/* 얼마나 왔는지만 보여준다. 몇 번 남았는지는 세지 않는다. */}
            {!met && progress > 0 && (
              <div className="mt-2 h-1 overflow-hidden rounded-pill bg-sunken">
                <div
                  className="h-full rounded-pill bg-lavender"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
