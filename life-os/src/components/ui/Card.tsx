import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('card p-5', className)}>{children}</section>
}

export function CardLabel({ children }: { children: ReactNode }) {
  return <p className="label-strong mb-4">{children}</p>
}
