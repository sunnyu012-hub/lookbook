import { useEffect, useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { DaySheet } from './components/DaySheet'
import { PhotoViewer } from './components/PhotoViewer'
import { SettingsSheet } from './components/SettingsSheet'
import { useDiary } from './hooks/useDiary'
import { todayKey } from './lib/date'
import { photoStream } from './lib/search'
import { LookBackScreen } from './screens/LookBackScreen'
import { TodayScreen } from './screens/TodayScreen'

type Gallery = { photos: { id: string; date: string }[]; index: number }

export default function App() {
  const diary = useDiary()
  const [tab, setTab] = useState<Tab>('오늘')
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [settings, setSettings] = useState(false)
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const today = useToday()

  function openDay(date: string) {
    // 오늘을 목록에서 눌렀으면 판을 올리지 않고 쓰는 화면으로 보낸다
    if (date === today) {
      setTab('오늘')
      window.scrollTo({ top: 0 })
      return
    }
    setOpenDate(date)
  }

  return (
    <div className="mx-auto min-h-screen max-w-md">
      {tab === '오늘' ? (
        <TodayScreen
          diary={diary}
          today={today}
          onOpenDay={openDay}
          onOpenSettings={() => setSettings(true)}
          onOpenPhoto={(photos, index) => setGallery({ photos, index })}
        />
      ) : (
        <LookBackScreen
          diary={diary}
          onOpenDay={openDay}
          onOpenPhoto={(index) => setGallery({ photos: photoStream(diary.entries), index })}
        />
      )}

      <BottomNav tab={tab} onTab={setTab} />

      <DaySheet
        date={openDate}
        diary={diary}
        onClose={() => setOpenDate(null)}
        onOpenPhoto={(photos, index) => setGallery({ photos, index })}
      />

      <SettingsSheet open={settings} diary={diary} onClose={() => setSettings(false)} />

      {gallery && (
        <PhotoViewer
          photos={gallery.photos}
          index={gallery.index}
          onIndex={(index) => setGallery({ ...gallery, index })}
          onClose={() => setGallery(null)}
          onOpenDay={(date) => {
            setGallery(null)
            openDay(date)
          }}
        />
      )}
    </div>
  )
}

/**
 * 오늘 날짜. 앱을 켜둔 채 자정을 넘기는 사람이 있어서 한 번 재고 끝내지 않는다.
 * 화면이 다시 보일 때와 1분마다 확인해서, 날이 바뀌면 새 하루로 넘어간다.
 */
function useToday(): string {
  const [today, setToday] = useState(() => todayKey())

  useEffect(() => {
    const check = () => setToday((current) => (current === todayKey() ? current : todayKey()))
    const timer = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return today
}
