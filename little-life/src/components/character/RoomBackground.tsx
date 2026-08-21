/**
 * 캐릭터 뒤에 깔리는 작은 생활 공간.
 *
 * 창문 / 조명 / 화분 / 러그 / 쿠션 다섯 개만 쓴다.
 * 정보(레벨·EXP)를 방해하면 안 되니 대비를 아주 낮게 잡았다.
 * v0.1 에서는 장식을 바꾸는 기능이 없다 — 나중에 방 꾸미기가 붙을 자리다.
 */
export function RoomBackground() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      {/* 벽과 바닥의 경계 */}
      <rect x="0" y="150" width="320" height="50" className="fill-sunken/70" />
      <line x1="0" y1="150" x2="320" y2="150" className="stroke-line" strokeWidth="1.5" />

      {/* 창문 */}
      <g>
        <rect x="30" y="30" width="66" height="72" rx="14" className="fill-dusty-soft" />
        <rect
          x="30"
          y="30"
          width="66"
          height="72"
          rx="14"
          className="fill-none stroke-line"
          strokeWidth="2"
        />
        <line x1="63" y1="32" x2="63" y2="100" className="stroke-line" strokeWidth="2" />
        <line x1="32" y1="66" x2="94" y2="66" className="stroke-line" strokeWidth="2" />
        {/* 창밖의 해 */}
        <circle cx="47" cy="48" r="7" className="fill-butter/70" />
      </g>

      {/* 플로어 조명 */}
      <g>
        <path d="M240 46 L272 46 L266 70 L246 70 Z" className="fill-butter/60" />
        <path
          d="M240 46 L272 46 L266 70 L246 70 Z"
          className="fill-none stroke-line"
          strokeWidth="2"
        />
        <line x1="256" y1="70" x2="256" y2="148" className="stroke-line" strokeWidth="2.5" />
        <ellipse cx="256" cy="149" rx="13" ry="4" className="fill-line" />
      </g>

      {/* 화분 */}
      <g>
        <path d="M282 118 Q282 96 292 92 Q296 108 288 120 Z" className="fill-sage" />
        <path d="M302 116 Q304 98 296 92 Q290 106 296 118 Z" className="fill-sage/70" />
        <path d="M283 118 H303 L300 146 Q300 149 297 149 H289 Q286 149 286 146 Z" className="fill-pink/60" />
        <path
          d="M283 118 H303 L300 146 Q300 149 297 149 H289 Q286 149 286 146 Z"
          className="fill-none stroke-line"
          strokeWidth="1.5"
        />
      </g>

      {/* 쿠션 */}
      <rect
        x="26"
        y="126"
        width="34"
        height="24"
        rx="10"
        className="fill-butter/50 stroke-line"
        strokeWidth="1.5"
      />

      {/* 러그 */}
      <ellipse cx="160" cy="176" rx="106" ry="20" className="fill-sage-soft" />
      <ellipse
        cx="160"
        cy="176"
        rx="106"
        ry="20"
        className="fill-none stroke-sage/60"
        strokeWidth="2"
      />
      <ellipse cx="160" cy="176" rx="86" ry="14" className="fill-none stroke-sage/40" strokeWidth="2" />
    </svg>
  )
}
