import { GREETING, daypart, subcopyForDay } from '@/lib/date'

interface GreetingHeaderProps {
  name: string
}

export function GreetingHeader({ name }: GreetingHeaderProps) {
  const now = new Date()

  return (
    <header>
      <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-ink">
        {GREETING[daypart(now)]}, {name}
      </h1>
      <p className="mt-1 text-[13px] text-inkdim">{subcopyForDay(now)}</p>
    </header>
  )
}
