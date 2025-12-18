/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'text-theme-light',
    'bg-theme',
    'bg-theme/20',
    'bg-theme/90',
    'border-theme',
    'hover:text-theme-light',
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          primary: 'rgb(var(--tc) / <alpha-value>)',
          dark: '#1a1a1a',
          darker: '#0f0f0f',
          light: 'rgb(var(--tc-light) / <alpha-value>)',
        },
        theme: {
          DEFAULT: 'rgb(var(--tc) / <alpha-value>)',
          light: 'rgb(var(--tc-light) / <alpha-value>)',
        },
        brand: {
          gold: '#F59E0B',
          orange: '#EA580C',
          amber: '#D97706',
          dark: '#0f0f0f',
          darker: '#0a0a0a',
        }
      }
    },
  },
  plugins: [],
}
