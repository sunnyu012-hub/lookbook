/**
 * LIFE BALANCE 상세 — 기간을 바꿔 가며 보는 화면.
 *
 * 여기서도 잘했다 못했다는 없다. 기간만 바꿔서 "그때는 어디에 시간을 썼나" 를 본다.
 */
import { useMemo, useState } from 'react'
import { computeLifeBalance, type LifeBalanceInput } from '@/lib/analytics/lifeBalance'
import { DOMAIN_META } from '@/lib/domains'
import { LifeBalanceCard } from '@/components/life/LifeBalanceCard'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

const RANGES = [7, 30, 90] as const

export function LifeBalanceDetail({
  balanceInput,
  onClose,
  onOpenTree,
}: {
  balanceInput: Omit<LifeBalanceInput, 'days' | 'today'>
  onClose: () => void
  onOpenTree: () => void
}) {
  const [days, setDays] = useState<number>(7)
  const balance = useMemo(
    () => computeLifeBalance({ ...balanceInput, days }),
    [balanceInput, days],
  )

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
            Life balance
          </h1>
          <p className="plabel mt-1.5">어디에 시간을 쓰고 있나</p>
        </div>
      </header>

      <div className="flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={r === days}
            onClick={() => {
              haptic()
              setDays(r)
            }}
            className={cn(
              'flex-1 rounded-px3 border-[1.5px] py-2 font-pixel text-[10px] uppercase',
              r === days
                ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                : 'border-border bg-cream text-inkfaint',
            )}
          >
            {r}일
          </button>
        ))}
      </div>

      <LifeBalanceCard balance={balance} />

      <PixelPanel title="What counts" icon={icons.log}>
        <p className="ko mb-2.5 text-inkdim">
          직접 입력하는 값이 아니에요. 이미 적어 둔 것들에서 저절로 모여요.
        </p>
        <ul className="space-y-1.5 text-[12.5px]">
          {[
            '완료한 퀘스트',
            '오늘 있었던 일 태그',
            '아침 기록 · 밤 마무리',
            '직접 적어 둔 순간',
            '주간 돌아보기에서 고른 영역',
          ].map((line) => (
            <li key={line} className="flex items-center gap-2">
              <span className="text-inkfaint">·</span>
              {line}
            </li>
          ))}
        </ul>
      </PixelPanel>

      <PixelPanel title="Domains" icon={icons.home}>
        <ul className="space-y-2.5">
          {balance.slices.map((s) => {
            const meta = DOMAIN_META[s.key]
            return (
              <li key={s.key} className="flex items-start gap-2.5">
                <PixelImage
                  asset={meta.icon}
                  height={18}
                  className={cn('mt-0.5 shrink-0', s.value === 0 && 'opacity-30 saturate-0')}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className="font-pixel text-[10px] uppercase tracking-[0.02em]"
                    style={{ color: s.value === 0 ? undefined : meta.accent }}
                  >
                    {meta.label}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-inkdim">
                    {meta.about}
                  </span>
                </span>
                <span className="shrink-0 font-pixel text-[11px] text-inkdim">
                  {s.value === 0 ? '·' : s.value}
                </span>
              </li>
            )
          })}
        </ul>
      </PixelPanel>

      <button
        type="button"
        onClick={onOpenTree}
        className="press flex w-full items-center gap-2.5 rounded-px4 border-[1.5px] border-dashed border-borderdeep bg-cream px-3.5 py-3 text-left"
      >
        <PixelImage asset={DOMAIN_META.joy.icon} height={20} />
        <span className="flex-1">
          <span className="ptitle block">My life tree</span>
          <span className="mt-1 block text-[11.5px] text-inkdim">
            이 영역들이 지도에서 어떻게 자랐는지 보기
          </span>
        </span>
        <span className="text-[11px] text-inkfaint">›</span>
      </button>
    </div>
  )
}
