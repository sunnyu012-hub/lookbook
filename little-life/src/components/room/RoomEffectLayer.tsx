import type { HomeEffectId } from '@/types'

/**
 * 방의 공기.
 *
 * 전부 CSS 로만 그린다. 파티클을 수백 개 띄우면 폰이 먼저 지친다.
 * 애니메이션은 motion-reduce 에서 멈춘다 — 움직임이 불편한 사람도 방은 볼 수 있어야 한다.
 */
export function RoomEffectLayer({ effect }: { effect: HomeEffectId | null }) {
  if (!effect) return null

  switch (effect) {
    case 'SOFT_MORNING':
      return (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(115deg, rgba(255,236,190,0.55) 0%, rgba(255,246,225,0.25) 38%, transparent 62%)',
          }}
        />
      )

    case 'GOLDEN_HOUR':
      return (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(255,196,140,0.42) 0%, rgba(255,170,150,0.28) 55%, rgba(120,90,110,0.12) 100%)',
          }}
        />
      )

    case 'CAFE_AMBIENCE':
      return (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 110%, rgba(120,80,50,0.22) 0%, transparent 60%)',
          }}
        />
      )

    case 'READING_TIME':
      return (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(55% 55% at 78% 62%, rgba(255,224,160,0.55) 0%, transparent 70%), linear-gradient(0deg, rgba(60,45,40,0.14), rgba(60,45,40,0.14))',
          }}
        />
      )

    case 'GREEN_CORNER':
      return (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-sway motion-reduce:animate-none"
          style={{
            background:
              'radial-gradient(40% 60% at 12% 22%, rgba(90,140,80,0.28) 0%, transparent 70%), radial-gradient(30% 40% at 30% 8%, rgba(90,140,80,0.2) 0%, transparent 70%)',
          }}
        />
      )

    case 'NIGHT_SKY':
      return (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(40,50,95,0.42), rgba(30,35,70,0.24))' }}
          />
          <div
            className="absolute inset-0 animate-twinkle motion-reduce:animate-none"
            style={{
              backgroundImage:
                'radial-gradient(1.5px 1.5px at 18% 16%, #FFF8DC 50%, transparent 51%), radial-gradient(1.5px 1.5px at 62% 10%, #FFF8DC 50%, transparent 51%), radial-gradient(1.5px 1.5px at 82% 26%, #FFF8DC 50%, transparent 51%), radial-gradient(1.5px 1.5px at 38% 30%, #FFF8DC 50%, transparent 51%), radial-gradient(1.5px 1.5px at 74% 44%, #FFF8DC 50%, transparent 51%)',
            }}
          />
        </div>
      )

    case 'RAINY_WINDOW':
      return (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(90,110,135,0.24), transparent 55%)' }}
          />
          <div
            className="absolute inset-x-0 -top-full h-[200%] animate-rain motion-reduce:animate-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(102deg, rgba(255,255,255,0.34) 0px, rgba(255,255,255,0.34) 1px, transparent 1px, transparent 13px)',
            }}
          />
        </div>
      )

    case 'FIREFLY':
      return (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {[
            { left: '22%', top: '48%', delay: '0s' },
            { left: '58%', top: '36%', delay: '1.4s' },
            { left: '76%', top: '58%', delay: '2.6s' },
            { left: '40%', top: '64%', delay: '3.4s' },
          ].map((dot) => (
            <span
              key={dot.left + dot.top}
              className="absolute h-1.5 w-1.5 rounded-full bg-[#FFE9A8] animate-drift motion-reduce:animate-none"
              style={{ left: dot.left, top: dot.top, animationDelay: dot.delay }}
            />
          ))}
        </div>
      )

    case 'FLOATING_DUST':
      return (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(120deg, transparent 35%, rgba(255,244,214,0.4) 45%, transparent 58%)',
            }}
          />
          {[
            { left: '38%', top: '30%', delay: '0s' },
            { left: '46%', top: '44%', delay: '2s' },
            { left: '52%', top: '22%', delay: '3.5s' },
          ].map((dot) => (
            <span
              key={dot.left + dot.top}
              className="absolute h-1 w-1 rounded-full bg-white/70 animate-drift motion-reduce:animate-none"
              style={{ left: dot.left, top: dot.top, animationDelay: dot.delay }}
            />
          ))}
        </div>
      )

    default:
      return null
  }
}
