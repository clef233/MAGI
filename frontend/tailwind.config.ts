import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark mode base
        bg: {
          primary: '#0A0A0B',
          secondary: '#141416',
          tertiary: '#1C1C1F',
        },
        border: '#2A2A2E',
        text: {
          primary: '#F5F5F7',
          secondary: '#86868B',
          tertiary: '#56565A',
        },
        // Accent colors
        accent: {
          blue: '#0A84FF',
          green: '#30D158',
          orange: '#FF9F0A',
          red: '#FF453A',
          purple: '#BF5AF2',
        },
        // Actor colors
        actor: {
          casper: '#FF6B35',
          balthasar: '#4ECDC4',
          melchior: '#A855F7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        serif: ['Noto Serif JP', 'serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'flash': 'flash 0.4s steps(1, end) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flash: {
          '0%, 49.9%': { opacity: '1' },
          '50%, 100%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
}

export default config