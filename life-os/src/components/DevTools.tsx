import { seedMockData } from '@/lib/mock'
import { localStore } from '@/lib/localStore'
import { storageMode } from '@/lib/repository'

interface Props {
  onChanged: () => void
}

/** 로컬 모드 전용 도구. Supabase 를 연결하면 사라진다. */
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
        className="press rounded-px2 border-2 border-ink/25 bg-ivory px-3 py-1.5 font-pixel text-[9px] uppercase text-inkdim"
      >
        Seed sample
      </button>
      <button
        type="button"
        onClick={() => {
          localStore.clear()
          onChanged()
        }}
        className="press rounded-px2 border-2 border-ink/25 bg-ivory px-3 py-1.5 font-pixel text-[9px] uppercase text-inkdim"
      >
        Clear local
      </button>
    </div>
  )
}
