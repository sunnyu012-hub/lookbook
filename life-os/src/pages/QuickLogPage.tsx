/**
 * Quick Log 하나를 자세히 보고 고치는 화면.
 *
 * App.tsx 의 overlay 방식을 그대로 쓴다 — 라우터를 새로 넣지 않는다.
 */
import { useState } from 'react'
import type { QuickLog, QuickLogInput } from '@/lib/os2/types'
import type { MyTagStore } from '@/hooks/useMyTags'
import { MOOD_BY_VALUE } from '@/components/quicklog/MoodPicker'
import { QuickLogComposer } from '@/components/quicklog/QuickLogComposer'
import { timeOf } from '@/components/quicklog/TodayFlow'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { formatShort } from '@/lib/date'
import { haptic } from '@/hooks/useHaptic'

interface Props {
  log: QuickLog
  tagStore: MyTagStore
  onSave: (input: QuickLogInput, photo: File | null) => Promise<void>
  onRemove: () => Promise<void>
  onClose: () => void
}

export function QuickLogPage({ log, tagStore, onSave, onRemove, onClose }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const mood = MOOD_BY_VALUE[log.mood]
  const photoUrl = usePhotoUrl(log.photoPath)

  const tags = (log.myTagIds ?? [])
    .map((id) => tagStore.resolve(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))

  // 만든 직후의 저장은 "고침" 이 아니다. 문자열 비교 대신 시간 차이로 본다
  const edited =
    new Date(log.updatedAt).getTime() - new Date(log.createdAt).getTime() > 1_000

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
            Quick log
          </h1>
          <p className="plabel mt-1.5">
            {formatShort(log.date)} · {timeOf(log.loggedAt)}
          </p>
        </div>
      </header>

      {editing ? (
        <QuickLogComposer
          mood={log.mood}
          existing={log}
          tagStore={tagStore}
          saveLabel="고쳐서 저장"
          onCancel={() => setEditing(false)}
          onSave={async (value, photo) => {
            await onSave(value, photo)
            setEditing(false)
          }}
        />
      ) : (
        <>
          <div
            className="rounded-px4 border-[1.5px] px-3.5 py-4 shadow-hard"
            style={{ borderColor: `${mood.accent}66`, backgroundColor: mood.tint }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[38px] leading-none" aria-label={mood.label}>
                <span aria-hidden>{mood.emoji}</span>
              </span>
              <span className="flex-1">
                <span className="plabel block">{mood.label}</span>
                {log.energy != null && (
                  <span className="mt-1 block font-pixel text-[11px] text-peachdeep">
                    ENERGY {log.energy}
                  </span>
                )}
              </span>
            </div>

            {log.text && <p className="mt-3 text-[14px] leading-relaxed">{log.text}</p>}
          </div>

          {photoUrl && (
            <img
              src={photoUrl}
              alt="이 기록에 남긴 사진"
              className="w-full rounded-px4 border-[1.5px] border-border object-cover"
            />
          )}

          {tags.length > 0 && (
            <PixelPanel title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border-[1.5px] border-border bg-cream px-2.5 py-1.5 text-[12px] text-inkdim"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </PixelPanel>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                haptic()
                setEditing(true)
              }}
              className="press flex-1 rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[11px] uppercase text-white shadow-hard"
            >
              고치기
            </button>
            <button
              type="button"
              onClick={() => {
                haptic()
                setConfirming(true)
              }}
              className="press rounded-px4 border-[1.5px] border-border bg-ivory px-4 py-3 font-pixel text-[11px] uppercase text-inkdim"
            >
              지우기
            </button>
          </div>

          {confirming && (
            <div className="rounded-px4 border-[1.5px] border-pinkdeep bg-pinksoft px-3.5 py-3">
              <p className="ko">이 기록을 지울까요? 되돌릴 수 없어요.</p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="press flex-1 rounded-px3 border-[1.5px] border-border bg-ivory py-2.5 font-pixel text-[10px] uppercase text-inkdim"
                >
                  그냥 두기
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    haptic()
                    setBusy(true)
                    void onRemove().finally(() => setBusy(false))
                  }}
                  className="press flex-1 rounded-px3 border-[1.5px] border-pinkdeep bg-pink py-2.5 font-pixel text-[10px] uppercase text-white disabled:opacity-60"
                >
                  지우기
                </button>
              </div>
            </div>
          )}

          {edited && (
            <p className="px-1 text-[11px] text-inkfaint">
              {formatShort(log.updatedAt.slice(0, 10))}에 고쳤어요.
            </p>
          )}
        </>
      )}
    </div>
  )
}
