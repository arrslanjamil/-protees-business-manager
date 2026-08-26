/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#05070d',
          900: '#0a0e17',
          850: '#0d1220',
          800: '#111827',
          700: '#1a2236',
          600: '#26314a',
        },
        neon: {
          cyan: '#22d3ee',
          purple: '#a855f7',
          pink: '#f472b6',
          green: '#34d399',
          red: '#f87171',
          amber: '#fbbf24',
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
