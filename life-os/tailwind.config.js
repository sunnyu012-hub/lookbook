/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 바탕 — 따뜻한 크림
        cream: '#FDF6EC',
        creamdeep: '#F7E7D4',
        ivory: '#FFFCF7',

        // 주조색 — 스트로베리 핑크
        pink: '#F7A8B8',
        pinkdeep: '#DE7E92',
        pinksoft: '#FDE7EC',

        // 보조 — 피치 / 버터 / 민트 / 베이비블루
        peach: '#FBC49B',
        peachdeep: '#E79A66',
        peachsoft: '#FDEBDC',
        butter: '#FBE08A',
        butterdeep: '#DFB63F',
        buttersoft: '#FDF4D6',
        mint: '#B9E3C6',
        mintdeep: '#7DB994',
        mintsoft: '#E6F4EA',
        sky: '#B9DCF2',
        skydeep: '#6FA8CE',
        skysoft: '#E5F1FA',

        // Sleep / Recovery 전용 포인트
        lavender: '#CDBDF0',
        lavenderdeep: '#8B76C9',
        lavendersoft: '#EFE9FB',

        // 글자 / 테두리 — 따뜻한 갈색 계열 (검정 대신)
        ink: '#6B4A3D',
        inkdim: '#9C7767',
        inkfaint: '#C2A493',
        border: '#EBD3B9',
        borderdeep: '#D9B694',
      },
      fontFamily: {
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
      borderRadius: { px: '2px', px2: '4px', px3: '6px', px4: '10px', px5: '14px' },
      boxShadow: {
        hard: '2px 2px 0 0 rgba(107, 74, 61, 0.12)',
        hardpink: '2px 2px 0 0 rgba(222, 126, 146, 0.22)',
      },
      keyframes: {
        breathe: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-2px)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-3px)' } },
        hop: { '0%,100%': { transform: 'translateY(0)' }, '40%': { transform: 'translateY(-3px)' }, '60%': { transform: 'translateY(-1px)' } },
        twinkle: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        zzzrise: {
          '0%': { opacity: '0', transform: 'translate(0,4px) scale(0.9)' },
          '30%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translate(8px,-16px) scale(1)' },
        },
        pop: { '0%': { transform: 'scale(0.6)' }, '65%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)' } },
        risein: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        xpfloat: {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '25%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-14px)' },
        },
      },
      animation: {
        breathe: 'breathe 3.4s ease-in-out infinite',
        floaty: 'floaty 2.6s ease-in-out infinite',
        hop: 'hop 1.1s ease-in-out infinite',
        twinkle: 'twinkle 2.4s ease-in-out infinite',
        zzzrise: 'zzzrise 3.2s ease-out infinite',
        pop: 'pop 220ms cubic-bezier(0.3, 1.4, 0.6, 1) both',
        risein: 'risein 240ms ease-out both',
        xpfloat: 'xpfloat 900ms ease-out both',
      },
    },
  },
  plugins: [],
}
