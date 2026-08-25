import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import type { Checkin, NightCheckout } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { modeMetaOrNull } from '@/lib/energy'
import { MODE_CHARACTER, characters } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'

/** 아침 기록을 마쳤을 때 뜨는 하루 시작 화면 */
export function DayStart({
  checkin,
  dayNumber,
  onClose,
}: {
  checkin: Checkin
  dayNumber: number
  onClose: () => void
}) {
  const meta = modeMetaOrNull(checkin.mode)

  return (
    <Sheet onClose={onClose}>
      <p className="plabel flex items-center justify-center gap-1.5">
        <PixelSparkle size={9} />
        Day {String(dayNumber).padStart(3, '0')} start
        <PixelSparkle size={9} variant={2} delay={500} />
      </p>

      <PixelImage
        asset={checkin.mode ? MODE_CHARACTER[checkin.mode] : characters.idle}
        height={92}
        className="mx-auto mt-3 animate-floaty"
      />

      <p
        className="mt-3 font-pixel text-[40px] leading-none tabular-nums"
        style={{ color: meta?.hex ?? '#C2A493' }}
      >
        {checkin.energyScore ?? '--'}
      </p>
      <p className="plabel mt-2">Energy</p>

      {meta && (
        <>
          <div className="mt-3 flex justify-center">
            <PixelImage asset={meta.pill} height={24} />
          </div>
          <p className="ko mt-3">{meta.message}</p>
        </>
      )}

      <Close onClose={onClose} label="오늘 시작하기" />
    </Sheet>
  )
}

/** 밤 마무리를 마쳤을 때 뜨는 하루 완료 화면 */
export function DayComplete({
  checkin,
  night,
  dayNumber,
  xpEarned,
  onClose,
}: {
  checkin: Checkin | null
  night: NightCheckout
  dayNumber: number
  xpEarned: number
  onClose: () => void
}) {
  const morning = checkin?.energyScore ?? null
  // 밤 기록은 1~5 라 같은 자로 재려고 100점으로 맞춘다
  const actual = night.actualEnergy != null ? Math.round(((night.actualEnergy - 1) / 4) * 100) : null
  const gap = morning !== null && actual !== null ? actual - morning : null

  return (
    <Sheet onClose={onClose}>
      <p className="plabel flex items-center justify-center gap-1.5">
        <PixelSparkle size={9} />
        Day {String(dayNumber).padStart(3, '0')} complete
        <PixelSparkle size={9} variant={2} delay={500} />
      </p>

      <PixelImage asset={characters.recovery} height={86} className="mx-auto mt-3 animate-breathe" />

      {/* Quest 칸이 있던 자리 — 억지로 채우지 않고 두 칸으로 둔다 */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Cell label="Morning" value={morning === null ? '—' : String(morning)} />
        <Cell label="Actual" value={actual === null ? '—' : String(actual)} />
      </div>

      {gap !== null && (
        <p
          className={cn(
            'mt-3 font-pixel text-[15px]',
            gap > 0 ? 'text-mintdeep' : gap < 0 ? 'text-pinkdeep' : 'text-inkdim',
          )}
        >
          {gap > 0 ? '+' : ''}
          {gap}
          <span className="ml-2 text-[10px] text-inkdim">아침 예상과의 차이</span>
        </p>
      )}

      <p className="mt-3 font-pixel text-[18px] text-peachdeep">+{xpEarned} XP</p>

      {night.bestThing && (
        <p className="ko mt-3 border-t border-dashed border-border pt-3">
          오늘 제일 좋았던 건 &ldquo;{night.bestThing}&rdquo;
        </p>
      )}

      <Close onClose={onClose} label="잘 자요" />
    </Sheet>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-px3 bg-cream px-2 py-2">
      <p className="plabel">{label}</p>
      <p className="mt-1 font-pixel text-[16px] leading-none tabular-nums">{value}</p>
    </div>
  )
}

function Close({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="press mt-5 w-full rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[12px] uppercase tracking-[0.04em] text-white shadow-hardpink"
    >
      {label}
    </button>
  )
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/35" />
      <div className="relative w-full max-w-[360px] animate-pop rounded-px5 border-[1.5px] border-border bg-ivory px-5 py-5 text-center shadow-hard">
        {children}
      </div>
    </div>,
    document.body,
  )
}
