import { useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { buildBackup, downloadText, restoreBackup } from '../lib/backup'
import { formatDay, todayKey } from '../lib/date'
import { diaryStats } from '../lib/messages'
import type { Diary } from '../hooks/useDiary'

type Props = {
  open: boolean
  diary: Diary
  onClose: () => void
}

/** 설정 — 내보내기 · 가져오기 · 전부 지우기. 기록은 전부 이 기기 안에 있다. */
export function SettingsSheet({ open, diary, onClose }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [withPhotos, setWithPhotos] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const stats = diaryStats(diary.entries, todayKey())

  async function exportAll() {
    setBusy(true)
    setMessage(null)
    try {
      const text = await buildBackup(diary.entries, withPhotos)
      // 파일 이름은 로마자로 둔다 — 한글 이름을 붙이면 브라우저에 따라
      // 확장자까지 잃은 'download' 로 저장돼서 다시 가져올 때 헤맨다.
      downloadText(`oneday-${todayKey()}.json`, text)
      setMessage('파일로 내보냈어요.')
    } catch {
      setMessage('내보내기가 안 됐어요. 사진을 빼고 다시 해 보세요.')
    }
    setBusy(false)
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await restoreBackup(await file.text(), diary.entries)
      diary.replaceAll(result.entries)
      setMessage(
        `${result.days}일치를 합쳤어요${result.photos > 0 ? ` · 사진 ${result.photos}장` : ''}.`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '파일을 읽지 못했어요.')
    }
    setBusy(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <Sheet open={open} onClose={onClose} title="설정">
      <div className="space-y-3 pb-6">
        <section className="card space-y-1.5">
          <h3 className="text-[15px] font-semibold">쌓인 기록</h3>
          <p className="text-[13px] leading-relaxed text-inkdim">
            {stats.days === 0
              ? '아직 없어요.'
              : `${stats.days}일 · 첫 기록 ${formatDay(stats.first!)}`}
          </p>
          <p className="text-[12px] leading-relaxed text-inkfaint">
            기록은 이 브라우저 안에만 있어요. 서버로 보내지 않습니다. 폰을 바꾸거나
            브라우저 데이터를 지우면 사라지니, 가끔 내보내 두세요.
          </p>
        </section>

        <section className="card space-y-3">
          <h3 className="text-[15px] font-semibold">내보내기</h3>
          <label className="flex items-center gap-2 text-[13px] text-inkdim">
            <input
              type="checkbox"
              checked={withPhotos}
              onChange={(event) => setWithPhotos(event.target.checked)}
              className="h-4 w-4 accent-peach-deep"
            />
            사진도 함께 (파일이 커져요)
          </label>
          <button
            type="button"
            onClick={() => void exportAll()}
            disabled={busy || stats.days === 0}
            className="w-full rounded-btn bg-ink py-3 text-[14px] font-medium text-canvas disabled:bg-sunken disabled:text-inkfaint"
          >
            파일로 내보내기
          </button>
        </section>

        <section className="card space-y-3">
          <h3 className="text-[15px] font-semibold">가져오기</h3>
          <p className="text-[12px] leading-relaxed text-inkfaint">
            지금 기록을 덮어쓰지 않고 합쳐요. 같은 날짜는 나중에 고친 쪽이 남습니다.
          </p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="w-full rounded-btn bg-sunken py-3 text-[14px] font-medium text-ink disabled:text-inkfaint"
          >
            파일 고르기
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
        </section>

        {message && (
          <p className="rounded-card bg-mint-soft px-4 py-3 text-[13px] text-mint-deep">
            {message}
          </p>
        )}

        <section className="card space-y-3">
          <h3 className="text-[15px] font-semibold">전부 지우기</h3>
          {confirmingReset ? (
            <div className="space-y-2">
              <p className="text-[13px] leading-relaxed text-peach-deep">
                {stats.days}일치 기록과 사진이 모두 사라져요. 되돌릴 수 없어요.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="flex-1 rounded-btn bg-sunken py-3 text-[14px] text-ink"
                >
                  그대로 두기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    diary.replaceAll({})
                    setConfirmingReset(false)
                    setMessage('전부 지웠어요.')
                  }}
                  className="flex-1 rounded-btn bg-peach-deep py-3 text-[14px] font-medium text-white"
                >
                  지우기
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              disabled={stats.days === 0}
              className="w-full rounded-btn bg-surface py-3 text-[14px] text-inkfaint shadow-soft disabled:opacity-50"
            >
              처음으로 되돌리기
            </button>
          )}
        </section>

        <p className="pb-2 text-center font-date text-[11px] text-inkfaint">
          오늘 하루 · {__APP_BUILD_ID__}
        </p>
      </div>
    </Sheet>
  )
}
