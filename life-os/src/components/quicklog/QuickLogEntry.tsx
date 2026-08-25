/**
 * Home 의 Quick Log 입력 자리.
 *
 * 평소엔 "지금 기분은?" 과 이모지 한 줄뿐이다.
 * 이모지를 누르면 그 자리에서 composer 가 펼쳐진다 — 화면을 옮기지 않는다.
 */
import { useState } from 'react'
import type { Mood, QuickLogInput } from '@/lib/os2/types'
import type { MyTagStore } from '@/hooks/useMyTags'
import { MoodPicker } from './MoodPicker'
import { QuickLogComposer } from './QuickLogComposer'

export function QuickLogEntry({
  tagStore,
  onSave,
}: {
  tagStore: MyTagStore
  onSave: (input: QuickLogInput, photo: File | null) => Promise<void>
}) {
  const [mood, setMood] = useState<Mood | null>(null)

  if (mood === null) {
    return (
      <section className="rounded-px4 border-[1.5px] border-border bg-ivory px-3.5 py-3 shadow-hard">
        <p className="ko mb-2">지금 기분은?</p>
        <MoodPicker onPick={setMood} />
      </section>
    )
  }

  return (
    <QuickLogComposer
      mood={mood}
      tagStore={tagStore}
      onCancel={() => setMood(null)}
      onSave={async (value, photo) => {
        await onSave(value, photo)
        setMood(null)
      }}
    />
  )
}
