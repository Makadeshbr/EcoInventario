import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        forest: '#072D24',
        moss:   '#264C38',
        olive:  '#647A4B',
        cream:  '#F4EAD8',
        sand:   '#D9C7A6',
        gold:   '#F5B93F',
        earth:  '#6B4A32',
        dark:   '#1E2A22',
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans:  ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'radial-forest': 'radial-gradient(ellipse at 30% 50%, #0D4030 0%, #072D24 55%, #041a15 100%)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
