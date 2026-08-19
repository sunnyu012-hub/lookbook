import { seedMockData } from '@/lib/mock'
import { localStore } from '@/lib/localStore'
import { storageMode } from '@/lib/repository'

interface Props {
  onChanged: () => void
}

/**
 * 로컬 모드 전용 도구. Supabase 를 연결하면 자동으로 사라진다.
 * 화면을 실제 데이터 모양으로 검증하기 위한 용도.
 */
export function DevTools({ onChanged }: Props) {
  if (storageMode !== 'local') return null

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => {
          seedMockData()
          onChanged()
        }}
        className="press rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-label text-faint"
      >
        Seed sample
      </button>
      <button
        type="button"
        onClick={() => {
          localStore.clear()
          onChanged()
        }}
        className="press rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-label text-faint"
      >
        Clear local
      </button>
    </div>
  )
}
