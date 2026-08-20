/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 바탕 — 따뜻한 아이보리 / 밀키 화이트
        ivory: '#F7F1E8',
        ivorydeep: '#EFE5D6',
        milk: '#FFFDF9',

        // 카테고리 & 포인트 — 채도 낮은 파스텔
        pink: { soft: '#F6E3E3', DEFAULT: '#E3AFB0', deep: '#C1868A' },
        sage: { soft: '#E4EDE3', DEFAULT: '#A9C3A5', deep: '#7C9B7A' },
        butter: { soft: '#F8EFD8', DEFAULT: '#E8CE8E', deep: '#C0A155' },
        dusty: { soft: '#E3EAF0', DEFAULT: '#A6BCCE', deep: '#75919F' },
        clay: { soft: '#F2E6DE', DEFAULT: '#D8B49C', deep: '#AC8467' },
        lilac: { soft: '#EAE6F1', DEFAULT: '#BDB2D2', deep: '#8C7FA6' },

        // 글자 / 선 — 차콜 계열 (순수 검정 금지)
        ink: '#3D3936',
        inkdim: '#7A736D',
        inkfaint: '#A9A19A',
        line: '#E7DECF',
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          'system-ui',
          'sans-serif',
        ],
        // 게임 요소(EXP / LV / QUEST CLEAR) 전용 — 살짝 다른 결
        game: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      boxShadow: {
        // 과하지 않은 그림자만 사용한다
        soft: '0 2px 10px -4px rgba(61, 57, 54, 0.10)',
        lift: '0 8px 24px -12px rgba(61, 57, 54, 0.20)',
        sheet: '0 -10px 40px -18px rgba(61, 57, 54, 0.30)',
      },
      keyframes: {
        breathe: {
          '0%,100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-4px) scale(1.01)' },
        },
        blink: {
          '0%,92%,100%': { transform: 'scaleY(1)' },
          '96%': { transform: 'scaleY(0.1)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        risein: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        expfloat: {
          '0%': { opacity: '0', transform: 'translate(-50%, 6px) scale(0.9)' },
          '18%': { opacity: '1', transform: 'translate(-50%, 0) scale(1)' },
          '70%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translate(-50%, -22px) scale(1)' },
        },
        sheetup: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadein: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        checkdraw: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        twinkle: {
          '0%,100%': { opacity: '0.35', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
        blink: 'blink 5.5s ease-in-out infinite',
        floaty: 'floaty 3s ease-in-out infinite',
        pop: 'pop 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        risein: 'risein 280ms ease-out both',
        expfloat: 'expfloat 1100ms ease-out both',
        sheetup: 'sheetup 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        fadein: 'fadein 200ms ease-out both',
        checkdraw: 'checkdraw 320ms ease-out 60ms both',
        twinkle: 'twinkle 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
