/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 바탕 / 표면
        canvas: '#F8F5EF',
        surface: '#FFFDF9',
        sunken: '#F1EDE4',

        // 글자 — 순수 검정은 쓰지 않는다
        ink: '#2F2C2A',
        // 스펙의 #7A746E 는 본문 크기에서 대비가 살짝 모자라 아주 조금만 어둡게 잡았다
        inkdim: '#6F6963',
        inkfaint: '#9C958D',
        line: '#EAE4DA',

        // 카테고리 — soft 는 칩 배경, deep 은 그 위 글자(대비 4.5:1 이상)
        sage: { soft: '#E7EFE3', DEFAULT: '#C9D7C1', deep: '#4F6848' }, // LIFE
        dusty: { soft: '#E4EAF2', DEFAULT: '#BCCBDF', deep: '#45607F' }, // WORK
        pink: { soft: '#F6E9E8', DEFAULT: '#E8C9C7', deep: '#7C5350' }, // BODY
        butter: { soft: '#FBF3D9', DEFAULT: '#F3E3A1', deep: '#756019' }, // PLAY
        lavender: { soft: '#EDE9F3', DEFAULT: '#CFC7E0', deep: '#5B4E7A' }, // MIND
        rose: { soft: '#F7E7E9', DEFAULT: '#E9B8BE', deep: '#8A4B55' }, // HEART

        // 캐릭터 전용
        skin: '#F7E2D2',
        skinshade: '#EBCDB8',
        hair: '#9A7B68',
        hairdeep: '#7E6152',
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
        settle: 'settle 320ms ease-in 240ms both',
      },
    },
  },
  plugins: [],
}
