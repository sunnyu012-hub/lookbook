/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 목업에서 뽑아낸 색
        canvas: '#FDF1E3',
        surface: '#FFFBF4',
        sunken: '#F5E7D6',

        // 주 액센트 — 코랄 핑크
        coral: { soft: '#FCE1DC', DEFAULT: '#F7A096', deep: '#D96C61' },
        // 완료 표시
        leaf: { soft: '#E9F0E0', DEFAULT: '#7DA465', deep: '#5C7F48' },

        // 글자 — 따뜻한 진갈색
        ink: '#4A3B33',
        inkdim: '#7C6A5F',
        inkfaint: '#A9998C',
        line: '#F0DFCB',

        // 카테고리 — 배지 그림과 어울리는 아주 연한 파스텔
        sage: { soft: '#E8F0E0', DEFAULT: '#B7CDA6', deep: '#4F6B3E' }, // LIFE
        dusty: { soft: '#E6EBF2', DEFAULT: '#AFC0D6', deep: '#4C6180' }, // WORK
        pink: { soft: '#F8E6E4', DEFAULT: '#E9B7B2', deep: '#8A544E' }, // BODY
        butter: { soft: '#FCF1D8', DEFAULT: '#F2D98E', deep: '#7A6018' }, // PLAY
        lavender: { soft: '#EDEAF4', DEFAULT: '#C4BBDC', deep: '#5A4C7C' }, // MIND
        rose: { soft: '#FBE6E9', DEFAULT: '#F0B4BC', deep: '#93505B' }, // HEART
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
        // LV / EXP / QUEST 같은 게임 요소에만 쓴다
        game: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '22px',
        btn: '18px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 2px 10px -5px rgba(47, 44, 42, 0.12)',
        lift: '0 10px 28px -14px rgba(47, 44, 42, 0.24)',
        nav: '0 6px 24px -10px rgba(47, 44, 42, 0.18)',
        sheet: '0 -12px 44px -20px rgba(47, 44, 42, 0.32)',
      },
      keyframes: {
        breathe: {
          '0%,100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-3px) scale(1.008)' },
        },
        bouncesm: {
          '0%,100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-9px)' },
          '55%': { transform: 'translateY(-2px)' },
          '75%': { transform: 'translateY(-5px)' },
        },
        bouncelg: {
          '0%,100%': { transform: 'translateY(0) scale(1)' },
          '25%': { transform: 'translateY(-16px) scale(1.04)' },
          '50%': { transform: 'translateY(-4px) scale(1)' },
          '72%': { transform: 'translateY(-10px) scale(1.02)' },
        },
        blink: {
          '0%,93%,100%': { transform: 'scaleY(1)' },
          '96%': { transform: 'scaleY(0.08)' },
        },
        pop: {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '60%': { transform: 'scale(1.07)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        risein: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        expfloat: {
          '0%': { opacity: '0', transform: 'translate(-50%, 8px) scale(0.85)' },
          '20%': { opacity: '1', transform: 'translate(-50%, 0) scale(1.06)' },
          '34%': { transform: 'translate(-50%, -3px) scale(1)' },
          '72%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translate(-50%, -26px) scale(1)' },
        },
        toastin: {
          '0%': { opacity: '0', transform: 'translate(-50%, -10px)' },
          '12%': { opacity: '1', transform: 'translate(-50%, 0)' },
          '82%': { opacity: '1', transform: 'translate(-50%, 0)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -8px)' },
        },
        sheetup: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadein: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        checkdraw: { '0%': { strokeDashoffset: '26' }, '100%': { strokeDashoffset: '0' } },
        sparkle: {
          '0%,100%': { opacity: '0', transform: 'scale(0.6)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
        settle: {
          '0%': { opacity: '1', maxHeight: '120px' },
          '100%': { opacity: '0', maxHeight: '0px', transform: 'translateY(-4px)' },
        },
        // 방의 공기 — 전부 아주 느리게. 눈에 띄면 그때부터 방해가 된다.
        rain: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(50%)' },
        },
        drift: {
          '0%,100%': { opacity: '0.15', transform: 'translate(0, 0)' },
          '35%': { opacity: '0.9', transform: 'translate(6px, -10px)' },
          '70%': { opacity: '0.4', transform: 'translate(-4px, -18px)' },
        },
        twinkle: {
          '0%,100%': { opacity: '0.35' },
          '50%': { opacity: '0.9' },
        },
        sway: {
          '0%,100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
        bouncesm: 'bouncesm 900ms cubic-bezier(0.3, 1.2, 0.5, 1) 1',
        bouncelg: 'bouncelg 1400ms cubic-bezier(0.3, 1.2, 0.5, 1) 1',
        blink: 'blink 5.5s ease-in-out infinite',
        pop: 'pop 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        risein: 'risein 300ms ease-out both',
        expfloat: 'expfloat 1200ms ease-out both',
        toastin: 'toastin 1800ms ease-out both',
        sheetup: 'sheetup 300ms cubic-bezier(0.22, 1, 0.36, 1) both',
        fadein: 'fadein 200ms ease-out both',
        checkdraw: 'checkdraw 320ms ease-out 60ms both',
        sparkle: 'sparkle 1200ms ease-in-out infinite',
        rain: 'rain 900ms linear infinite',
        drift: 'drift 7s ease-in-out infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        sway: 'sway 9s ease-in-out infinite',
        settle: 'settle 320ms ease-in 240ms both',
      },
    },
  },
  plugins: [],
}
