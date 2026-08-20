/**
 * Room Base 그림이 아직 없을 때 대신 깔아 두는 빈 방.
 *
 * 가구를 조립하지 않는다 — 벽·바닥·창문·조명만 CSS 로 그려서
 * 캐릭터가 어디에 서 있는지 알아볼 수 있을 정도의 무대만 만든다.
 * public/assets/pixel/room/room-base-day.png 를 넣는 순간 이 화면은 사라진다.
 */
import { FLOOR_LINE } from '@/lib/room/anchors'

export function RoomPlaceholder() {
  return (
    <div className="absolute inset-0" aria-hidden>
      {/* 벽 */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: `${FLOOR_LINE}%`,
          background: 'linear-gradient(180deg, #F3E2CE 0%, #EFDAC3 62%, #E7CDB2 100%)',
        }}
      />

      {/* 창문 */}
      <div
        className="absolute overflow-hidden rounded-[6px] border-[3px] border-[#D9B694]"
        style={{
          left: '38%',
          top: '12%',
          width: '24%',
          height: '32%',
          background: 'linear-gradient(180deg, #BEE0F5 0%, #D8EDF8 62%, #EAF5E4 100%)',
          boxShadow: 'inset 0 -6px 12px rgba(255, 255, 255, 0.6)',
        }}
      >
        <span
          className="absolute rounded-full bg-white/85"
          style={{ left: '18%', top: '22%', width: '26%', height: '16%' }}
        />
        <span
          className="absolute rounded-full bg-white/70"
          style={{ left: '52%', top: '40%', width: '32%', height: '14%' }}
        />
        <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[#D9B694]/80" />
      </div>

      {/* 커튼 */}
      {[36, 60].map((left) => (
        <div
          key={left}
          className="absolute rounded-b-[4px]"
          style={{
            left: `${left}%`,
            top: '10%',
            width: '5%',
            height: '38%',
            background: 'linear-gradient(180deg, #FBD3DC 0%, #F5BCC9 100%)',
          }}
        />
      ))}

      {/* 전구 줄 */}
      <div
        className="absolute inset-x-[6%] top-[6%] h-[1px]"
        style={{ background: 'rgba(217, 182, 148, 0.85)' }}
      />
      {[10, 24, 38, 52, 66, 80, 92].map((left, i) => (
        <span
          key={left}
          className="absolute h-[6px] w-[6px] rounded-full"
          style={{
            left: `${left}%`,
            top: '6.5%',
            background: '#FBE08A',
            boxShadow: '0 0 6px 2px rgba(251, 224, 138, 0.55)',
            animation: `twinkle 3.2s ease-in-out ${i * 260}ms infinite`,
          }}
        />
      ))}

      {/* 걸레받이 */}
      <div
        className="absolute inset-x-0"
        style={{ top: `${FLOOR_LINE - 2}%`, height: '2%', background: '#D9B694' }}
      />

      {/* 바닥 */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: `${FLOOR_LINE}%`,
          background: 'linear-gradient(180deg, #DFC0A0 0%, #E9D0B4 55%, #EFDAC3 100%)',
        }}
      />
      {[16, 34, 54, 74, 90].map((top) => (
        <div
          key={top}
          className="absolute inset-x-0"
          style={{
            top: `${FLOOR_LINE + (top / 100) * (100 - FLOOR_LINE)}%`,
            height: '1px',
            background: 'rgba(160, 118, 84, 0.16)',
          }}
        />
      ))}

      {/* 창문에서 들어오는 빛 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 50% 30%, rgba(255, 246, 224, 0.55) 0%, rgba(255, 246, 224, 0) 62%)',
        }}
      />
    </div>
  )
}
