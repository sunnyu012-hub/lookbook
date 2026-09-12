import { relativeDay } from '../lib/date'
import type { Letter } from '../lib/messages'

/** 지난날의 내가 남긴 쪽지. 오늘 화면 맨 위에 있다. */
export function LetterCard({ letter }: { letter: Letter }) {
  return (
    <section className="animate-risein rounded-card bg-plum-soft p-4">
      <p className="text-[12px] text-plum-deep">
        ✉️ {relativeDay(letter.date)}의 나에게서
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">
        {letter.text}
      </p>
    </section>
  )
}
