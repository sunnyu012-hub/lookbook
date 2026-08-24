import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { sinceLabel } from '@/lib/sync/format'
import type { SyncApi } from '@/hooks/useSync'
import { SignInSheet } from './SignInSheet'
import { PasswordSheet } from './PasswordSheet'

interface SyncCardProps {
  sync: SyncApi
  /** 갈라졌을 때 고르는 화면을 연다 (App 에서 띄운다) */
  onOpenConflict: () => void
}

/**
 * 설정 화면의 백업 칸.
 *
 * ── 말투 ───────────────────────────────────────────────
 *
 * "동기화 실패", "마지막 동기화 3일 전" 같은 말은 안 쓴다.
 * 그건 안 하고 있는 걸 지적하는 말이다. 여기서는 지금 어떤 상태인지만
 * 담담하게 적는다 — 며칠 안 열었다고 뭐라고 하지 않는다.
 */
export function SyncCard({ sync, onOpenConflict }: SyncCardProps) {
  const [signInOpen, setSignInOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  if (!sync.configured) return null

  const signedIn = sync.status !== 'SIGNED_OUT'

  return (
    <>
      <Card className="space-y-3">
        {signedIn ? (
          <>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-soft text-[16px]">
                ☁️
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{sync.email ?? '로그인됨'}</p>
                <p className="mt-0.5 text-[12px] text-inkdim">
                  {sync.status === 'SYNCING'
                    ? '올리는 중…'
                    : `마지막 백업 ${sinceLabel(sync.lastSyncedAt)}`}
                </p>
              </div>
            </div>

            {sync.status === 'CONFLICT' && (
              <button
                type="button"
                onClick={onOpenConflict}
                className="w-full rounded-btn bg-butter-soft px-3.5 py-3 text-left text-[12.5px] leading-relaxed text-butter-deep active:scale-[0.98]"
              >
                이 기기와 클라우드가 서로 달라. 어느 쪽을 남길지 골라줘 →
              </button>
            )}

            {sync.error && (
              <button
                type="button"
                onClick={sync.dismissError}
                className="w-full rounded-btn bg-coral-soft px-3.5 py-3 text-left text-[12.5px] leading-relaxed text-coral-deep active:scale-[0.98]"
              >
                {sync.error}
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Action
                label={sync.status === 'SYNCING' ? '올리는 중…' : '지금 백업'}
                disabled={sync.status === 'SYNCING' || sync.status === 'CONFLICT'}
                onClick={() => void sync.syncNow()}
              />
              <Action
                label={sync.hasPassword ? '비밀번호 바꾸기' : '비밀번호 설정'}
                onClick={() => setPasswordOpen(true)}
              />
            </div>

            <button
              type="button"
              onClick={() => void sync.signOut()}
              className="w-full rounded-btn py-2.5 text-[12px] text-inkfaint active:scale-[0.98]"
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-[16px]">
                ☁️
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-ink">클라우드 백업</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-inkdim">
                  지금은 이 폰 안에만 저장돼. 로그인해두면 폰을 바꿔도 그대로 이어져.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSignInOpen(true)}
              className="w-full rounded-btn bg-sunken py-3 text-[13px] font-medium text-ink active:scale-[0.98]"
            >
              로그인하고 백업하기
            </button>
          </>
        )}
      </Card>

      <SignInSheet
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        defaultEmail={sync.lastEmail}
        preferPassword={sync.hasPassword}
        onMagicLink={sync.sendMagicLink}
        onVerifyCode={sync.verifyCode}
        onPassword={sync.signInWithPassword}
      />

      <PasswordSheet
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        existing={sync.hasPassword}
        onSubmit={sync.setPassword}
      />
    </>
  )
}

function Action({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-[44px] rounded-btn bg-sunken px-3 text-[12.5px] font-medium text-ink transition-opacity active:scale-[0.97]',
        disabled && 'opacity-40',
      )}
    >
      {label}
    </button>
  )
}
