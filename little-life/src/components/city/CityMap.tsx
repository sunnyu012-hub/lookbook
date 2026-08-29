import type { CityMapRegionView, PctPoint } from '@/lib/city/map'
import { CITY_MAP_BASE_SRC, MAP_CANVAS, clampAnchor } from '@/lib/city/map'
import { cn } from '@/components/ui/cn'
import { NpcFace } from '@/components/city/NpcFace'

interface CityMapProps {
  views: CityMapRegionView[]
  /** ?dev=map 일 때 누르는 자리를 눈에 보이게 그린다 */
  debug?: boolean
  onSelect: (view: CityMapRegionView) => void
  /** 배경 그림이 아직 없을 때. 화면은 예전 목록으로 되돌아간다. */
  onBaseMissing: () => void
}

/**
 * 그림 지도.
 *
 * ── 지도는 세계, 상세는 시트 ────────────────────────────
 *
 * 여기서는 아무것도 하지 않는다. 동네를 하나 고르면 끝이고, 사람을
 * 만나는 것도 가게에 들어가는 것도 전부 시트에서 한다. 지도 위에서
 * 다 되게 만들면 작은 그림 안에서 작은 것들을 조준하게 된다.
 *
 * ── 누르는 건 동네 단위뿐 ───────────────────────────────
 *
 * 건물 하나하나를 못 누르게 한 건 일부러다. 그림에서 카페 문짝을
 * 정확히 찍는 건 폰에서 어렵고, 못 찍으면 지도가 고장난 것처럼 느껴진다.
 * 그래서 동네 한 덩어리가 통째로 하나의 버튼이다.
 *
 * ── 얹은 것은 전부 그림 위 ──────────────────────────────
 *
 * 이름 · 상태 · 얼굴은 pointer-events 를 끄고 그림처럼만 올려둔다.
 * 그래서 얼굴을 눌러도 밑에 깔린 동네 버튼이 받는다 — 어디를 눌러도
 * 같은 곳이 열린다.
 */
export function CityMap({ views, debug = false, onSelect, onBaseMissing }: CityMapProps) {
  return (
    // 비율은 그림에서 읽는다. 여기에 숫자를 박아두면 그림을 바꿨을 때
    // 잘리고, 잘린 만큼 누르는 자리가 건물과 어긋난다.
    <div
      className="relative mx-auto w-full overflow-hidden rounded-card bg-canvas ring-1 ring-line"
      style={{ aspectRatio: `${MAP_CANVAS.width} / ${MAP_CANVAS.height}` }}
    >
      <img
        src={CITY_MAP_BASE_SRC}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        onError={onBaseMissing}
      />

      {/* 누르는 자리. 보이지 않지만 여기가 전부다. */}
      {views.map((view) => (
        <button
          key={view.def.id}
          type="button"
          aria-label={`${view.label} — ${view.statusLine}`}
          onClick={() => onSelect(view)}
          className={cn(
            'absolute rounded-card transition-transform duration-150 ease-out active:scale-[0.98]',
            debug && 'ring-2 ring-inset ring-coral/70',
          )}
          style={{
            left: `${view.def.hitBoxPct.x * 100}%`,
            top: `${view.def.hitBoxPct.y * 100}%`,
            width: `${view.def.hitBoxPct.w * 100}%`,
            height: `${view.def.hitBoxPct.h * 100}%`,
          }}
        />
      ))}

      {views.map((view) => (
        <RegionOverlay key={view.def.id} view={view} />
      ))}
    </div>
  )
}

/**
 * 동네 하나에 얹는 것들 — 이름 · 한 줄 · 얼굴.
 *
 * ── 세로는 쌓고 가로만 자리표를 따른다 ──────────────────
 *
 * 자리표는 1024 × 1536 캔버스에서 쟀는데, 폰에서 지도는 390 × 585 로
 * 그려진다. 그래서 초안의 세로 간격 0.03 은 46px 이 아니라 **17px** 이
 * 되고, 이름 한 줄(26) 밑에 상태 한 줄(20)과 얼굴 한 칸(44)이 그 안에
 * 못 들어간다. 실제로 처음 그렸을 때 얼굴이 상태 글씨를 덮었다.
 *
 * 그래서 세 조각을 한 세로줄로 쌓고, 자리표에서는 **가로 위치만** 읽는다.
 * 창작 골목처럼 얼굴만 왼쪽으로 밀어둔 자리도 그대로 살아난다.
 * 폭이 얼마든 겹치지 않고, 최종 그림이 와도 세로 간격을 다시 잴 일이 없다.
 */
function RegionOverlay({ view }: { view: CityMapRegionView }) {
  const label = clampAnchor(view.def.labelAnchorPct)
  const status = clampAnchor(view.def.statusAnchorPct)
  const npcAnchor = view.def.npcAnchorPct ? clampAnchor(view.def.npcAnchorPct) : null

  return (
    // 지도 폭을 그대로 쓰는 줄이라, 안에서 왼쪽으로 몇 % 미는지가
    // 곧 지도에서의 가로 자리가 된다.
    <span
      className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1"
      style={{ top: `${label.y * 100}%` }}
    >
      <span
        className={cn(
          'relative inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2.5 py-1 shadow-soft',
          view.current ? 'bg-coral text-surface' : 'bg-surface/90 text-ink',
        )}
        style={shiftX(label)}
      >
        <span className="text-[13px] leading-none">{view.icon}</span>
        <span className="text-[12.5px] font-semibold leading-none">{view.label}</span>
        {/* 오늘 여기 뭔가 있다는 표시. 숫자도 글자도 쓰지 않는다. */}
        {view.dot && <span className="h-1.5 w-1.5 rounded-full bg-coral-deep" />}
      </span>

      <span
        className={cn(
          'relative inline-flex whitespace-nowrap rounded-pill bg-surface/85 px-2 py-0.5 text-[10.5px] leading-[1.4]',
          view.tone === 'CURRENT' ? 'text-coral-deep' : 'text-inkfaint',
          view.tone === 'OPEN' && 'text-inkdim',
        )}
        style={shiftX(status)}
      >
        {view.statusLine}
      </span>

      {npcAnchor && (view.npcs.length > 0 || view.overflow > 0) && (
        <span className="relative flex items-center gap-2" style={shiftX(clampRow(npcAnchor))}>
          {view.npcs.map((npc) => (
            <span key={npc.id} className={chipClass} title={npc.name}>
              <NpcFace id={npc.id} avatar={npc.avatar} size={40} shape="round" className="bg-transparent" />
            </span>
          ))}
          {view.overflow > 0 && (
            <span className={cn(chipClass, 'text-[12px] font-semibold text-inkdim')}>
              +{view.overflow}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

/**
 * 가운데에서 얼마나 옆으로 밀지.
 *
 * `left` 를 퍼센트로 주면 지도 폭 기준이 된다 — 줄 안에서도 자리표의
 * 가로 위치가 그대로 지켜진다. `position: relative` 라 밀어도 옆 조각의
 * 자리를 뺏지 않는다.
 */
function shiftX(anchor: PctPoint) {
  return { left: `${(anchor.x - 0.5) * 100}%` }
}

/**
 * 얼굴 줄은 조금 더 안쪽으로.
 *
 * 넷이 서면 줄이 200px 쯤 된다. 자리표가 가장자리에 가까우면 (운동 구역이
 * 0.771) 마지막 얼굴이 지도 밖으로 나가서 잘린다. 그림 위 자리보다
 * **다 보이는 것**이 먼저라 가로만 안쪽으로 당긴다.
 *
 * 0.30~0.70 은 제일 좁은 폰(320)에서 넷이 다 들어오는 폭이다.
 */
function clampRow(anchor: PctPoint): PctPoint {
  return { x: Math.min(Math.max(anchor.x, 0.3), 0.7), y: anchor.y }
}

/**
 * 얼굴 한 칸. 44 가 기본이고 좁은 폰에서는 40 으로 줄인다.
 *
 * 안쪽 그림은 40px 로 고정하고 칸만 늘린다 — 그림을 칸에 꽉 채우면
 * 동그라미 테두리에 머리가 잘려서 지도에서 누군지 못 알아본다.
 */
const chipClass =
  'inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface/95 shadow-soft ring-1 ring-line min-[380px]:h-11 min-[380px]:w-11'
