/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 저녁에 여는 앱이라 종이처럼 따뜻하고 낮은 대비로 간다
        canvas: '#FAF6F1',
        surface: '#FFFDFA',
        sunken: '#F2EBE2',

        ink: '#3D3733',
        inkdim: '#7C736C',
        inkfaint: '#AEA49C',
        line: '#EBE2D8',

        // 칸마다 자기 색 — 전부 아주 연한 파스텔
        peach: { soft: '#FCEEE3', DEFAULT: '#EEB48D', deep: '#A96E43' }, // 뭐 했어
        butter: { soft: '#FBF2DA', DEFAULT: '#E8C874', deep: '#8A6A15' }, // 잘한 거
        mint: { soft: '#E7F1EA', DEFAULT: '#93C1A5', deep: '#4C7A60' }, // 감사한 거
        sky: { soft: '#E6EEF6', DEFAULT: '#92B4D2', deep: '#4B6E8F' }, // 기대되는 거
        plum: { soft: '#EFE9F4', DEFAULT: '#AE9BC8', deep: '#6B5690' }, // 내일의 나에게
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
        date: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 2px 10px -6px rgba(61, 55, 51, 0.14)',
        lift: '0 10px 26px -16px rgba(61, 55, 51, 0.28)',
        nav: '0 -6px 22px -14px rgba(61, 55, 51, 0.22)',
      },
      keyframes: {
        risein: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadein: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        sheetup: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        risein: 'risein 300ms ease-out both',
        fadein: 'fadein 200ms ease-out both',
        pop: 'pop 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        sheetup: 'sheetup 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
