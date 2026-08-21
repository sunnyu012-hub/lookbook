/**
 * 내보내기 — 설정 화면에 붙는 칸.
 *
 * 기록이 안 보이는 순간이 제일 무섭다. 손에 파일이 하나 있으면 그 걱정이 없어진다.
 */
import { useMemo, useState } from 'react'
import {
  buildExport,
  countsOf,
  exportCsv,
  exportFileName,
  exportJson,
  shareFile,
  totalRecords,
  type ExportInput,
  type ShareResult,
} from '@/lib/export'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

const LABELS: Record<string, string> = {
  checkins: '아침 기록',
  nights: '밤 마무리',
  weights: '체중',
  mounjaro: '투약',
  lifeEvents: '순간',
  ddays: 'D-Day',
  eventDays: '태그를 적은 날',
  questDays: '퀘스트를 한 날',
  customQuests: '내가 만든 퀘스트',
  weeklyResets: '주간 돌아보기',
}

const MESSAGE: Record<ShareResult, string> = {
  shared: '파일을 보냈어요. 저장할 곳을 골라 주세요.',
  downloaded: '다운로드 폴더에 저장했어요.',
  copied: '내려받기가 막혀서 내용을 복사해 뒀어요. 메모장에 붙여넣어 두세요.',
  failed: '저장하지 못했어요. 잠깐 뒤에 다시 눌러 주세요.',
}

export function ExportPanel({ data }: { data: ExportInput }) {
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null)
  const [result, setResult] = useState<ShareResult | null>(null)

  const counts = useMemo(() => countsOf(data), [data])
  const total = totalRecords(counts)
  const rows = Object.entries(counts).filter(([, n]) => n > 0)

  const run = async (kind: 'json' | 'csv') => {
    haptic()
    setBusy(kind)
    setResult(null)
    try {
      const content = kind === 'json' ? exportJson(buildExport(data)) : exportCsv(data)
      const mime = kind === 'json' ? 'application/json' : 'text/csv;charset=utf-8'
      setResult(await shareFile(exportFileName(kind), content, mime))
    } finally {
      setBusy(null)
    }
  }

  return (
    <PixelPanel
      title="Export"
      icon={icons.save}
      right={<span className="plabel">{total}개</span>}
    >
      <p className="ko mb-3 text-inkdim">
        지금까지 적은 걸 전부 파일 하나로 받아 둘 수 있어요. 내 기록은 내 것이니까요.
      </p>

      {total === 0 ? (
        <p className="text-[12.5px] text-inkfaint">아직 내보낼 기록이 없어요.</p>
      ) : (
        <>
          <ul className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {rows.map(([key, n]) => (
              <li key={key} className="flex items-center gap-1.5 text-[12px]">
                <span className="flex-1 truncate text-inkdim">{LABELS[key] ?? key}</span>
                <span className="font-pixel text-[10px]">{n}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Button
              label="JSON"
              sub="전부 그대로"
              busy={busy === 'json'}
              disabled={busy !== null}
              onClick={() => void run('json')}
              primary
            />
            <Button
              label="CSV"
              sub="엑셀에서 열기"
              busy={busy === 'csv'}
              disabled={busy !== null}
              onClick={() => void run('csv')}
            />
          </div>

          {result && (
            <p
              className={cn(
                'mt-2.5 text-[12px] leading-relaxed',
                result === 'failed' ? 'text-pinkdeep' : 'text-inkdim',
              )}
            >
              {MESSAGE[result]}
            </p>
          )}

          <p className="mt-2.5 border-t border-dashed border-border pt-2.5 text-[11px] leading-relaxed text-inkdim">
            JSON 은 나중에 되돌리거나 옮길 때 쓰는 원본이에요. CSV 는 하루 한 줄로 정리돼서 엑셀이나
            구글 시트에서 바로 열려요. 내보내도 앱 안의 기록은 그대로 있어요.
          </p>
        </>
      )}
    </PixelPanel>
  )
}

function Button({
  label,
  sub,
  busy,
  disabled,
  onClick,
  primary,
}: {
  label: string
  sub: string
  busy: boolean
  disabled: boolean
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'press flex-1 rounded-px4 border-[1.5px] py-2.5 text-center shadow-hard disabled:opacity-60',
        primary ? 'border-pinkdeep bg-pink text-white' : 'border-border bg-ivory text-ink',
      )}
    >
      <span className="flex items-center justify-center gap-1.5">
        <PixelImage asset={icons.save} height={14} />
        <span className="font-pixel text-[11px] uppercase">{busy ? '…' : label}</span>
      </span>
      <span
        className={cn(
          'mt-1 block text-[10.5px]',
          primary ? 'text-white/80' : 'text-inkdim',
        )}
      >
        {sub}
      </span>
    </button>
  )
}
