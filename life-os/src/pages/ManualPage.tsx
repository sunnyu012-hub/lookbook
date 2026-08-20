import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import type { Chapter } from '@/lib/manual'
import { cn } from '@/lib/cn'

/** MY MANUAL — 기록이 쌓이면 한 장씩 열리는 나 사용설명서 */
export function ManualPage({ chapters, onClose }: { chapters: Chapter[]; onClose: () => void }) {
  const open = chapters.filter((c) => c.unlocked && c.lines.length > 0).length

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
            My manual
          </h1>
          <p className="plabel mt-1.5">나 사용설명서</p>
        </div>
        <span className="plabel">
          {open} / {chapters.length}
        </span>
      </header>

      <p className="ko px-1">
        내가 적은 기록에서 나온 이야기예요. 원인을 말해 주는 게 아니라, 같이 나타난 것들을 모아 둔
        거예요.
      </p>

      <div className="space-y-2.5">
        {chapters.map((chapter) => (
          <ChapterCard key={chapter.key} chapter={chapter} />
        ))}
      </div>

      <p className="px-2 pb-2 text-center text-[11px] leading-relaxed text-inkdim">
        이 앱은 의료 앱이 아니에요. 진단이나 치료 판단에는 쓰지 마세요.
      </p>
    </div>
  )
}

function ChapterCard({ chapter }: { chapter: Chapter }) {
  const ready = chapter.unlocked && chapter.lines.length > 0
  /** 기록 수는 채웠는데 아직 할 얘기가 없는 경우 — 진행바를 보여 주면 헷갈린다 */
  const empty = chapter.unlocked && chapter.lines.length === 0
  const ratio = Math.min(1, chapter.have / chapter.need)

  return (
    <PixelPanel
      title={ready ? chapter.title : `CH.${String(chapter.no).padStart(2, '0')}`}
      icon={chapter.icon}
      sparkle={ready}
    >
      {ready ? (
        <>
          <p className="plabel mb-2">
            CH.{String(chapter.no).padStart(2, '0')} · {chapter.ko}
          </p>
          <ul className="space-y-2">
            {chapter.lines.map((line, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                <PixelSparkle size={9} className="mt-1 shrink-0" />
                <span className="flex-1">
                  {line.text}
                  {line.sample && (
                    <span className="plabel ml-1.5 whitespace-nowrap">{line.sample}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : empty ? (
        <>
          <p className="plabel mb-2">
            CH.{String(chapter.no).padStart(2, '0')} · {chapter.ko}
          </p>
          <p className="ko text-inkdim">
            아직 여기에 적힐 만한 게 모이지 않았어요. 기록이 쌓이면 채워져요.
          </p>
        </>
      ) : (
        <>
          <p className={cn('font-pixel text-[13px] text-inkfaint')}>???</p>
          <p className="ko mt-2 text-inkdim">
            {chapter.ko} — 조금만 더 기록하면 열려요.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-border/50">
              <div className="h-full rounded-full bg-pink" style={{ width: `${ratio * 100}%` }} />
            </div>
            <span className="plabel">
              {Math.min(chapter.have, chapter.need)} / {chapter.need}
            </span>
          </div>
        </>
      )}
    </PixelPanel>
  )
}

/** ME 화면에서 쓰는 작은 미리보기 */
export function ManualPreview({
  chapters,
  onOpen,
}: {
  chapters: Chapter[]
  onOpen: () => void
}) {
  const open = chapters.filter((c) => c.unlocked && c.lines.length > 0)
  const first = open[0]

  return (
    <button
      type="button"
      onClick={onOpen}
      className="press w-full rounded-px4 border-[1.5px] border-border bg-ivory p-3.5 text-left shadow-hard"
    >
      <span className="flex items-center gap-1.5">
        <PixelImage asset={chapters[0].icon} height={16} />
        <span className="ptitle flex-1">My manual</span>
        <span className="plabel">
          {open.length} / {chapters.length}
        </span>
        <span className="text-[11px] text-inkfaint">›</span>
      </span>
      <span className="ko mt-2 block">
        {first?.lines[0]?.text ?? '조금만 더 기록하면 나에 대한 설명서가 열려요.'}
      </span>
    </button>
  )
}
