/** @type {import('tailwindcss').Config} */
function themeColor(name) {
  return `rgb(var(--${name}) / <alpha-value>)`
}

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware — flip between dark/light via CSS variables in index.css.
        white: themeColor('c-white'),
        slate: {
          100: themeColor('c-slate-100'),
          200: themeColor('c-slate-200'),
          300: themeColor('c-slate-300'),
          400: themeColor('c-slate-400'),
          500: themeColor('c-slate-500'),
          600: themeColor('c-slate-600'),
        },
        base: {
          // 950 stays a fixed, literal dark tone — used for modal scrims and
          // icon glyphs on bright gradient chips, both of which need to stay
          // dark regardless of theme (never used as a page/card background).
          950: '#05070d',
          900: themeColor('c-base-900'),
          850: themeColor('c-base-850'),
          800: themeColor('c-base-800'),
          700: themeColor('c-base-700'),
          600: themeColor('c-base-600'),
        },
        neon: {
          cyan: themeColor('c-neon-cyan'),
          purple: themeColor('c-neon-purple'),
          pink: themeColor('c-neon-pink'),
          green: themeColor('c-neon-green'),
          red: themeColor('c-neon-red'),
          amber: themeColor('c-neon-amber'),
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Orbitron"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -2px rgba(34, 211, 238, 0.35)',
        'glow-purple': '0 0 20px -2px rgba(168, 85, 247, 0.35)',
        'glow-green': '0 0 16px -2px rgba(52, 211, 153, 0.5)',
        'glow-red': '0 0 16px -2px rgba(248, 113, 113, 0.5)',
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 20% 20%, rgba(34,211,238,0.08), transparent 40%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.10), transparent 40%), radial-gradient(circle at 50% 100%, rgba(52,211,153,0.06), transparent 40%)',
      },
      animation: {
        pulseSlow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
