import { useEffect } from 'react'
import { Button } from './Button'
import { Portal } from './Portal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** 되돌릴 수 없는 동작 하나를 확인받는 자리. 지금은 퀘스트 삭제에만 쓴다. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-8">
        <div
          className="absolute inset-0 animate-fadein bg-ink/25 backdrop-blur-[2px]"
          onClick={onCancel}
          aria-hidden
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          className="relative w-full max-w-[320px] animate-pop rounded-card bg-surface px-6 py-6 shadow-lift"
        >
          <p className="text-[16px] font-semibold text-ink">{title}</p>
          {description && (
            <p className="mt-2 text-[13px] leading-relaxed text-inkdim">{description}</p>
          )}
          <div className="mt-6 flex gap-2">
            <Button variant="soft" size="sm" className="flex-1" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant="danger" size="sm" className="flex-1" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
