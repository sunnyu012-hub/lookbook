import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from '@/types'
import { getClient, isOfflineError, readableError } from '@/lib/sync/client'
import { isSyncConfigured } from '@/lib/sync/config'
import { fingerprint, patchSyncLocal, readSyncLocal } from '@/lib/sync/local'
import { clearBackup, readBackup, saveBackup, type LocalBackup } from '@/lib/sync/backup'
import { decide, isPristine, summarize, type AskReason, type StateSummary } from '@/lib/sync/merge'
import { fetchRemote, forcePush, pushRemote } from '@/lib/sync/remote'

/**
 * 클라우드 백업.
 *
 * ── 무엇을 하지 않는가 ─────────────────────────────────
 *
 * 이 훅은 게임 규칙을 하나도 모른다. 상태 한 덩어리를 올리고 받아올 뿐이다.
 * 퀘스트를 합치거나 코인을 더하지 않는다 — 그런 걸 시작하면
 * 보상 계산이 두 벌이 되고, 어느 쪽이 맞는지 아무도 모르게 된다.
 *
 * ── 무엇을 지키는가 ────────────────────────────────────
 *
 * 하나. 확실할 때만 자동으로 덮어쓴다. 애매하면 물어본다.
 * 둘.  덮어쓰기 전에는 늘 이 기기에 사본을 남긴다.
 * 셋.  환경변수가 없으면 아무것도 안 한다. 앱은 예전 그대로 돈다.
 */

export type SyncStatus =
  /** 설정이 안 돼 있다. 화면에도 안 나온다. */
  | 'OFF'
  | 'SIGNED_OUT'
  | 'IDLE'
  | 'SYNCING'
  /** 어느 쪽을 남길지 사용자가 골라야 한다 */
  | 'CONFLICT'
  | 'ERROR'

export interface ConflictInfo {
  reason: AskReason
  local: StateSummary
  remote: StateSummary
  remoteUpdatedAt: string
}

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string }

export interface SyncApi {
  configured: boolean
  status: SyncStatus
  email: string | null
  lastSyncedAt: string | null
  /** 이 계정에 비밀번호를 걸어둔 적이 있는지 (이 기기가 기억하는 값) */
  hasPassword: boolean
  /** 다음 로그인 화면에 미리 채워둘 이메일 */
  lastEmail: string | null
  conflict: ConflictInfo | null
  error: string | null
  backup: LocalBackup | null

  sendMagicLink: (email: string) => Promise<ActionResult>
  verifyCode: (email: string, code: string) => Promise<ActionResult>
  signInWithPassword: (email: string, password: string) => Promise<ActionResult>
  setPassword: (password: string) => Promise<ActionResult>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  resolveConflict: (keep: 'LOCAL' | 'REMOTE') => Promise<void>
  /** 파일에서 가져온 기록을 이 기기에 앉힌다. 앉히기 전에 사본을 남긴다. */
  applyImport: (next: AppState) => void
  restoreBackup: () => void
  dismissBackup: () => void
  dismissError: () => void
}

interface Options {
  state: AppState
  ready: boolean
  /** 클라우드 것을 이 기기에 앉힌다. 부르기 전에 사본을 남긴다. */
  onReplace: (next: AppState) => void
}

/** 상태가 바뀌고 이만큼 조용하면 올린다. 글자 칠 때마다 올리지 않으려고. */
const PUSH_DELAY_MS = 6_000
/** 화면으로 돌아왔을 때, 마지막 확인이 이보다 오래됐으면 다시 본다. */
const RECHECK_MS = 60_000

export function useSync({ state, ready, onReplace }: Options): SyncApi {
  const configured = isSyncConfigured()

  const [status, setStatus] = useState<SyncStatus>(configured ? 'SIGNED_OUT' : 'OFF')
  const [email, setEmail] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [lastEmail, setLastEmail] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backup, setBackup] = useState<LocalBackup | null>(null)

  /** 화면 밖에서 최신 상태를 읽어야 한다 — 올릴 때 렌더 시점 값이 아니라 지금 값을 보내야 하니까 */
  const stateRef = useRef(state)
  stateRef.current = state

  /** 충돌 화면에서 "클라우드 쪽" 을 고르면 앉힐 것. 크기가 커서 React 상태로 안 들고 있는다. */
  const remoteStateRef = useRef<AppState | null>(null)
  const remoteRevRef = useRef(0)

  /** 방금 받아온 것을 앉히는 중 — 그 변화는 "이 기기가 바꾼 것" 이 아니다 */
  const adopting = useRef(false)
  /** 한 번에 하나만 돈다. StrictMode 가 effect 를 두 번 불러도 두 번 돌지 않게. */
  const running = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkedAt = useRef(0)

  /** 이 기기가 기억하는 것들을 화면 상태로 옮긴다 */
  const syncFromLocal = useCallback(() => {
    const local = readSyncLocal()
    setLastSyncedAt(local.lastSyncedAt)
    setHasPassword(local.hasPassword)
    setLastEmail(local.lastEmail)
  }, [])

  useEffect(() => {
    // 사본은 클라우드를 안 쓰는 사람에게도 생긴다 (파일에서 가져오기).
    // 그래서 이건 설정 여부와 상관없이 읽는다.
    setBackup(readBackup())
    if (!configured) return
    syncFromLocal()
  }, [configured, syncFromLocal])

  // ── 로그인 상태 따라가기 ─────────────────────────────

  useEffect(() => {
    if (!configured) return
    const client = getClient()
    if (!client) return

    let alive = true
    let unsubscribe: (() => void) | null = null

    client
      .then(async (c) => {
        const { data } = await c.auth.getSession()
        if (!alive) return

        const session = data.session
        if (session?.user) {
          setEmail(session.user.email ?? null)
          setStatus('IDLE')
        } else {
          setStatus('SIGNED_OUT')
        }

        const listener = c.auth.onAuthStateChange((event, next) => {
          if (!alive) return
          if (next?.user) {
            // 막 들어왔으면 아직 한 번도 안 맞춰본 셈으로 돌린다.
            // 안 그러면 로그인해도 다음에 뭔가 바뀔 때까지 백업이 안 올라간다.
            if (event === 'SIGNED_IN') checkedAt.current = 0
            setEmail(next.user.email ?? null)
            setStatus((prev) => (prev === 'CONFLICT' ? prev : 'IDLE'))
            if (next.user.email) patchSyncLocal({ lastEmail: next.user.email })
            syncFromLocal()
          } else if (event === 'SIGNED_OUT') {
            setEmail(null)
            setStatus('SIGNED_OUT')
          }
        })
        unsubscribe = () => listener.data.subscription.unsubscribe()
      })
      .catch((e) => {
        if (alive) setError(readableError(e))
      })

    return () => {
      alive = false
      unsubscribe?.()
    }
  }, [configured, syncFromLocal])

  // ── 올리고 받기 ──────────────────────────────────────

  /** 클라우드 것을 이 기기에 앉힌다 */
  const adopt = useCallback(
    (next: AppState, rev: number, userId: string) => {
      // 덮이는 쪽을 먼저 챙긴다. 이게 이 기능에서 제일 중요한 한 줄이다.
      const saved = saveBackup(stateRef.current, 'PULL')
      setBackup(saved ? readBackup() : null)

      adopting.current = true
      onReplace(next)

      const now = new Date().toISOString()
      patchSyncLocal({ userId, baseRev: rev, dirty: false, lastSyncedAt: now })
      setLastSyncedAt(now)
    },
    [onReplace],
  )

  const pushNow = useCallback(async (): Promise<void> => {
    const clientPromise = getClient()
    if (!clientPromise) return

    const c = await clientPromise
    const { data } = await c.auth.getSession()
    const user = data.session?.user
    if (!user) {
      setStatus('SIGNED_OUT')
      return
    }

    const local = readSyncLocal()
    const snapshot = stateRef.current
    const result = await pushRemote(c, user.id, snapshot, local.baseRev, local.deviceId)

    if (result.ok) {
      const now = new Date().toISOString()
      patchSyncLocal({
        userId: user.id,
        baseRev: result.rev,
        dirty: false,
        lastSyncedAt: now,
        syncedHash: fingerprint(snapshot),
      })
      setLastSyncedAt(now)
      setStatus('IDLE')
      setError(null)
      return
    }

    if (result.reason === 'CONFLICT') {
      // 그 사이 다른 기기가 올렸다. 덮어쓰지 않고 물어본다.
      const remote = await fetchRemote(c, user.id)
      if (remote?.state) {
        remoteStateRef.current = remote.state
        remoteRevRef.current = remote.rev
        setConflict({
          reason: 'DIVERGED',
          local: summarize(snapshot),
          remote: summarize(remote.state),
          remoteUpdatedAt: remote.updatedAt,
        })
        setStatus('CONFLICT')
      } else {
        setStatus('IDLE')
      }
      return
    }

    if (isOfflineError(result.error)) {
      setStatus('IDLE')
      return
    }
    setError(readableError(result.error))
    setStatus('ERROR')
  }, [])

  const syncNow = useCallback(async (): Promise<void> => {
    if (!configured || running.current) return
    const clientPromise = getClient()
    if (!clientPromise) return

    running.current = true
    try {
      const c = await clientPromise
      const { data } = await c.auth.getSession()
      const user = data.session?.user
      if (!user) {
        setStatus('SIGNED_OUT')
        return
      }

      // 아예 끊겨 있으면 굳이 던져보지 않는다
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus('IDLE')
        return
      }

      setStatus('SYNCING')
      setError(null)

      const remote = await fetchRemote(c, user.id)
      const local = readSyncLocal()
      const here = stateRef.current

      const plan = decide({
        hasRemote: remote?.state != null,
        remoteRev: remote?.rev ?? 0,
        local,
        userId: user.id,
        localPristine: isPristine(here),
      })

      switch (plan.kind) {
        case 'IN_SYNC': {
          const now = new Date().toISOString()
          patchSyncLocal({ userId: user.id, lastSyncedAt: now, syncedHash: fingerprint(here) })
          setLastSyncedAt(now)
          setStatus('IDLE')
          break
        }
        case 'PUSH': {
          // 줄은 있는데 안에 든 게 읽히지 않는 경우.
          // 못 읽는 걸 지키느라 물어볼 이유가 없다. 그냥 덮는다.
          if (remote && !remote.state) {
            const result = await forcePush(c, user.id, here, remote.rev, local.deviceId)
            if (result.ok) {
              const now = new Date().toISOString()
              patchSyncLocal({
                userId: user.id,
                baseRev: result.rev,
                dirty: false,
                lastSyncedAt: now,
                syncedHash: fingerprint(here),
              })
              setLastSyncedAt(now)
              setStatus('IDLE')
            } else {
              setError(
                result.reason === 'CONFLICT'
                  ? '다시 한 번 해볼래?'
                  : readableError(result.error),
              )
              setStatus('ERROR')
            }
            break
          }
          // 클라우드에 줄이 없으면 baseRev 가 뭐였든 처음부터 넣는다
          if (!remote) patchSyncLocal({ baseRev: 0 })
          await pushNow()
          break
        }
        case 'PULL': {
          if (remote?.state) adopt(remote.state, remote.rev, user.id)
          setStatus('IDLE')
          break
        }
        case 'ASK': {
          if (!remote?.state) {
            setStatus('IDLE')
            break
          }
          remoteStateRef.current = remote.state
          remoteRevRef.current = remote.rev
          setConflict({
            reason: plan.reason,
            local: summarize(here),
            remote: summarize(remote.state),
            remoteUpdatedAt: remote.updatedAt,
          })
          setStatus('CONFLICT')
          break
        }
      }
    } catch (e) {
      // 인터넷이 안 닿는 건 고장이 아니다. 다음에 다시 해본다.
      if (isOfflineError(e)) {
        setStatus('IDLE')
      } else {
        setError(readableError(e))
        setStatus('ERROR')
      }
    } finally {
      checkedAt.current = Date.now()
      running.current = false
    }
  }, [configured, adopt, pushNow])

  // ── 바뀌면 표시해두고, 조용해지면 올린다 ─────────────

  useEffect(() => {
    if (!configured || !ready) return

    const hash = fingerprint(state)

    // 방금 받아온 것을 앉힌 결과라면 이 기기가 바꾼 게 아니다.
    if (adopting.current) {
      adopting.current = false
      patchSyncLocal({ syncedHash: hash, dirty: false })
      return
    }

    const local = readSyncLocal()
    if (local.syncedHash === hash) {
      // 고쳤다가 도로 돌려놓은 경우. 올릴 게 없다.
      if (local.dirty) patchSyncLocal({ dirty: false })
      return
    }

    if (!local.dirty) patchSyncLocal({ dirty: true })

    if (status !== 'IDLE') return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void syncNow()
    }, PUSH_DELAY_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [state, ready, configured, status, syncNow])

  // ── 열 때 한 번, 돌아올 때 한 번 ─────────────────────

  useEffect(() => {
    if (!configured || !ready) return
    if (status !== 'IDLE') return
    if (checkedAt.current !== 0) return
    void syncNow()
  }, [configured, ready, status, syncNow])

  useEffect(() => {
    if (!configured) return

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - checkedAt.current < RECHECK_MS) return
      void syncNow()
    }
    // 인터넷이 돌아오면 미뤄뒀던 걸 바로 올린다
    const onOnline = () => {
      checkedAt.current = 0
      void syncNow()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [configured, syncNow])

  // ── 로그인 ───────────────────────────────────────────

  const sendMagicLink = useCallback(async (address: string): Promise<ActionResult> => {
    const clientPromise = getClient()
    if (!clientPromise) return { ok: false, message: '아직 연결 설정이 안 돼 있어.' }
    try {
      const c = await clientPromise
      const { error: e } = await c.auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      })
      if (e) return { ok: false, message: readableError(e) }
      patchSyncLocal({ lastEmail: address })
      setLastEmail(address)
      return { ok: true, message: '메일을 보냈어. 링크를 누르거나 숫자 여섯 자리를 여기 넣어줘.' }
    } catch (e) {
      return { ok: false, message: readableError(e) }
    }
  }, [])

  const verifyCode = useCallback(async (address: string, code: string): Promise<ActionResult> => {
    const clientPromise = getClient()
    if (!clientPromise) return { ok: false, message: '아직 연결 설정이 안 돼 있어.' }
    try {
      const c = await clientPromise
      const { error: e } = await c.auth.verifyOtp({
        email: address,
        token: code.trim(),
        type: 'email',
      })
      if (e) return { ok: false, message: readableError(e) }
      patchSyncLocal({ lastEmail: address })
      return { ok: true }
    } catch (e) {
      return { ok: false, message: readableError(e) }
    }
  }, [])

  const signInWithPassword = useCallback(
    async (address: string, password: string): Promise<ActionResult> => {
      const clientPromise = getClient()
      if (!clientPromise) return { ok: false, message: '아직 연결 설정이 안 돼 있어.' }
      try {
        const c = await clientPromise
        const { error: e } = await c.auth.signInWithPassword({ email: address, password })
        if (e) return { ok: false, message: readableError(e) }
        patchSyncLocal({ lastEmail: address, hasPassword: true })
        setHasPassword(true)
        return { ok: true }
      } catch (e) {
        return { ok: false, message: readableError(e) }
      }
    },
    [],
  )

  const setPassword = useCallback(async (password: string): Promise<ActionResult> => {
    const clientPromise = getClient()
    if (!clientPromise) return { ok: false, message: '아직 연결 설정이 안 돼 있어.' }
    try {
      const c = await clientPromise
      const { error: e } = await c.auth.updateUser({ password })
      if (e) return { ok: false, message: readableError(e) }
      patchSyncLocal({ hasPassword: true })
      setHasPassword(true)
      return { ok: true, message: '됐어. 다음부터는 비밀번호로 바로 들어올 수 있어.' }
    } catch (e) {
      return { ok: false, message: readableError(e) }
    }
  }, [])

  /**
   * 로그아웃.
   *
   * 이 기기의 기록은 그대로 둔다. 로그아웃은 "이 계정과의 연결을 끊는다" 이지
   * "여기 있는 걸 지운다" 가 아니다. 클라우드에 올려둔 것도 그대로 남는다.
   */
  const signOut = useCallback(async (): Promise<void> => {
    const clientPromise = getClient()
    if (!clientPromise) return
    try {
      const c = await clientPromise
      await c.auth.signOut()
    } catch {
      // 연결이 끊겨도 이 기기에서는 로그아웃된 것으로 다룬다
    }
    patchSyncLocal({ userId: null, baseRev: 0, dirty: false, lastSyncedAt: null, syncedHash: null })
    checkedAt.current = 0
    setLastSyncedAt(null)
    setConflict(null)
    setEmail(null)
    setStatus('SIGNED_OUT')
  }, [])

  // ── 갈라졌을 때 ──────────────────────────────────────

  const resolveConflict = useCallback(
    async (keep: 'LOCAL' | 'REMOTE'): Promise<void> => {
      const clientPromise = getClient()
      if (!clientPromise) return

      try {
        const c = await clientPromise
        const { data } = await c.auth.getSession()
        const user = data.session?.user
        if (!user) {
          setStatus('SIGNED_OUT')
          return
        }

        setStatus('SYNCING')

        if (keep === 'REMOTE') {
          const next = remoteStateRef.current
          if (!next) {
            setStatus('IDLE')
            return
          }
          const saved = saveBackup(stateRef.current, 'CONFLICT_REMOTE')
          setBackup(saved ? readBackup() : null)

          adopting.current = true
          onReplace(next)
          const now = new Date().toISOString()
          patchSyncLocal({
            userId: user.id,
            baseRev: remoteRevRef.current,
            dirty: false,
            lastSyncedAt: now,
          })
          setLastSyncedAt(now)
          setConflict(null)
          setStatus('IDLE')
          return
        }

        const snapshot = stateRef.current
        const result = await forcePush(
          c,
          user.id,
          snapshot,
          remoteRevRef.current,
          readSyncLocal().deviceId,
        )
        if (!result.ok) {
          setError(
            result.reason === 'CONFLICT' ? '다시 한 번 해볼래?' : readableError(result.error),
          )
          setStatus('ERROR')
          return
        }

        const now = new Date().toISOString()
        patchSyncLocal({
          userId: user.id,
          baseRev: result.rev,
          dirty: false,
          lastSyncedAt: now,
          syncedHash: fingerprint(snapshot),
        })
        setLastSyncedAt(now)
        setConflict(null)
        setStatus('IDLE')
      } catch (e) {
        setError(readableError(e))
        setStatus('ERROR')
      } finally {
        checkedAt.current = Date.now()
      }
    },
    [onReplace],
  )

  // ── 되돌리기 ─────────────────────────────────────────

  /**
   * 덮어쓰기 전 사본으로 되돌린다.
   *
   * 되돌린 것도 결국 "이 기기에서 바뀐 것" 이라 dirty 가 서고,
   * 잠시 뒤 클라우드로 올라간다. 되돌렸는데 다음에 열면 또 덮여 있는
   * 일이 없어야 한다.
   */
  /**
   * 파일에서 가져온 것을 앉힌다.
   *
   * 받아오기(adopt)와 다른 점 하나 — 이건 이 기기가 스스로 한 일이라
   * 클라우드에 올라가야 한다. 그래서 "바뀐 것" 으로 표시한다.
   * 로그인을 안 했으면 표시만 남고 아무 일도 안 일어난다.
   */
  const applyImport = useCallback(
    (next: AppState) => {
      const saved = saveBackup(stateRef.current, 'IMPORT')
      setBackup(saved ? readBackup() : null)
      onReplace(next)
      patchSyncLocal({ dirty: true, syncedHash: null })
    },
    [onReplace],
  )

  const restoreBackup = useCallback(() => {
    const saved = readBackup()
    if (!saved) return
    onReplace(saved.state)
    patchSyncLocal({ dirty: true, syncedHash: null })
    clearBackup()
    setBackup(null)
  }, [onReplace])

  const dismissBackup = useCallback(() => {
    clearBackup()
    setBackup(null)
  }, [])

  const dismissError = useCallback(() => {
    setError(null)
    setStatus((prev) => (prev === 'ERROR' ? 'IDLE' : prev))
  }, [])

  return {
    configured,
    status,
    email,
    lastSyncedAt,
    hasPassword,
    lastEmail,
    conflict,
    error,
    backup,
    sendMagicLink,
    verifyCode,
    signInWithPassword,
    setPassword,
    signOut,
    syncNow,
    resolveConflict,
    applyImport,
    restoreBackup,
    dismissBackup,
    dismissError,
  }
}
