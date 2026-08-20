import type { LevelState } from '@/lib/level'
import type { PixelAsset } from '@/lib/pixelAssets'
import { PixelImage } from './PixelImage'
import { PixelSparkle } from './PixelSparkle'

interface Props {
  level: LevelState
  character: PixelAsset
  /** 캐릭터 이름 — 바꾸고 싶으면 여기 값만 갈면 된다 */
  name?: string
}

/** 게임 캐릭터 정보 카드 — LV / EXP 바 */
export function LevelCard({ level, character, name = '유링' }: Props) {
  const segments = 12
  const filled = Math.round(level.ratio * segments)

  return (
    <section className="panel flex items-center gap-3 p-3">
      <div className="relative shrink-0">
        <PixelImage asset={character} height={64} className="animate-floaty" />
        <PixelSparkle size={11} className="absolute -right-1 top-1" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-pixel text-[18px] leading-none text-pinkdeep">
            LV.{level.level}
          </span>
          <span className="truncate text-[14px] font-medium">{name}</span>
        </div>

        <div className="mt-2 flex gap-[2px] rounded-px2 border-[1.5px] border-borderdeep bg-creamdeep p-[2px]">
          {Array.from({ length: segments }, (_, i) => (
            <span
              key={i}
              className="h-2 flex-1 rounded-[1px] transition-colors duration-300"
              style={{ backgroundColor: i < filled ? '#F7A8B8' : 'rgba(107, 74, 61, 0.10)' }}
            />
          ))}
        </div>

        <p className="plabel mt-1.5">
          EXP {level.into} / {level.need}
          <span className="ml-2 text-inkfaint">다음 레벨까지 {level.need - level.into}</span>
        </p>
      </div>
    </section>
  )
}
