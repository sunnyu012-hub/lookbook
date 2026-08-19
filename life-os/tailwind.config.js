/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0B',
        surface: '#131316',
        elevated: '#1A1A1F',
        line: '#26262C',
        paper: '#F2F0EB',
        muted: '#8B8B93',
        faint: '#55555E',
        recovery: '#8B7CF6',
        easy: '#45D0C0',
        normal: '#F4C25E',
        power: '#C8F04A',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        hero: ['5.5rem', { lineHeight: '0.86', letterSpacing: '-0.055em' }],
        giant: ['7.5rem', { lineHeight: '0.82', letterSpacing: '-0.06em' }],
      },
      letterSpacing: {
        label: '0.22em',
      },
      borderRadius: {
        card: '20px',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        fade: 'fade 0.4s ease both',
      },
    },
  },
  plugins: [],
}
