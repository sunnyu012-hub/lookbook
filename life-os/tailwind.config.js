/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 종이 / 잉크
        cream: '#F6EFE2',
        creamdeep: '#EDE3D2',
        ivory: '#FFFBF2',
        ink: '#5A4B3E',
        inkdim: '#8A7A6B',
        inkfaint: '#B3A48F',

        // 역할이 정해진 소프트 게임 컬러
        sage: '#A8C69F',
        sagedeep: '#7A9E74',
        lavender: '#C4B8E8',
        lavenderdeep: '#9A8AD1',
        butter: '#F5D57C',
        butterdeep: '#E0B34E',
        blush: '#E9A9B0',
        blushdeep: '#D3848E',
        sky: '#AED4EC',
        skydeep: '#7FB3D8',
        bark: '#D8B087',
        barkdeep: '#A87C56',
      },
      fontFamily: {
        // 픽셀 폰트는 라틴/숫자 전용. 한글 본문은 시스템 산세리프.
        pixel: ['Silkscreen', 'ui-monospace', 'monospace'],
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        px: '2px',
        px2: '4px',
        px3: '6px',
        px4: '8px',
      },
      boxShadow: {
        hard: '2px 2px 0 0 rgba(90, 75, 62, 0.25)',
        hardlg: '3px 3px 0 0 rgba(90, 75, 62, 0.25)',
        inset: 'inset 0 2px 0 0 rgba(90, 75, 62, 0.12)',
      },
      keyframes: {
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-2px)' } },
        float: {
          '0%': { opacity: '0', transform: 'translate(0, 0) scale(0.9)' },
          '25%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translate(6px, -18px) scale(1)' },
        },
        twinkle: { '0%,100%': { opacity: '0.15', transform: 'scale(0.85)' }, '50%': { opacity: '1', transform: 'scale(1)' } },
        pop: { '0%': { transform: 'scale(0.7)' }, '60%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        blinkfade: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
        drift: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(6px)' } },
      },
      animation: {
        bob: 'bob 2s steps(2) infinite',
        float: 'float 2.6s ease-out infinite',
        twinkle: 'twinkle 1.4s steps(3) infinite',
        pop: 'pop 220ms cubic-bezier(0.3, 1.4, 0.6, 1) both',
        rise: 'rise 260ms ease-out both',
        blinkfade: 'blinkfade 1.2s steps(2) infinite',
        drift: 'drift 6s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
}
