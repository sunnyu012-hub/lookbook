import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }

/**
 * 글에 맞춰 늘어나는 칸.
 *
 * 일기 칸에 스크롤바가 생기면 쓴 걸 한눈에 못 본다.
 * 그래서 높이를 내용에 맞춰 매번 다시 잰다.
 */
export function AutoTextarea({ value, className = '', ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return <textarea ref={ref} value={value} rows={2} className={`field ${className}`} {...rest} />
}
