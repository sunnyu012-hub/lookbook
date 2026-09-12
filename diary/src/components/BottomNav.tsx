type Tab = '오늘' | '돌아보기'

type Props = {
  tab: Tab
  onTab: (tab: Tab) => void
}

export type { Tab }

/** 아래 두 칸. 쓰는 곳과 보는 곳, 그 둘뿐이다. */
export function BottomNav({ tab, onTab }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-nav backdrop-blur">
      <div className="mx-auto flex max-w-md gap-2 px-6">
        {(['오늘', '돌아보기'] as Tab[]).map((name) => {
          const on = tab === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => onTab(name)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-btn py-1.5 text-[12px] ${
                on ? 'text-ink' : 'text-inkfaint'
              }`}
            >
              <span className="text-[19px] leading-none">{name === '오늘' ? '🖊' : '📖'}</span>
              <span className={on ? 'font-medium' : ''}>{name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
