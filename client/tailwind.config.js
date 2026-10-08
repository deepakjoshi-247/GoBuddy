/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          light: '#818CF8',
          glow: 'rgba(99, 102, 241, 0.4)',
          dim: 'rgba(99, 102, 241, 0.15)',
        },
        neon: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          glow: 'rgba(99, 102, 241, 0.4)',
          dim: 'rgba(99, 102, 241, 0.15)',
        },
        slate: {
          DEFAULT: '#0F1117',
          card: '#161822',
          border: '#222634',
          muted: '#94A3B8',
        },
        oled: {
          black: '#0F1117',
          card: '#161822',
          border: '#222634',
          muted: '#94A3B8',
        },
        // Re-route amber to Electric Indigo
        amber: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        obsidian: {
          DEFAULT: '#0F1117',
          hover: '#161822',
          subtle: '#222634',
        },
        charcoal: {
          DEFAULT: '#0F1117',
          muted: '#222634',
          light: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
      },
      boxShadow: {
        indigo: '0 0 15px rgba(99, 102, 241, 0.4)',
        neon: '0 0 15px rgba(99, 102, 241, 0.4)',
        'neon-sm': '0 0 8px rgba(99, 102, 241, 0.3)',
      },
    },
  },
  plugins: [],
}
