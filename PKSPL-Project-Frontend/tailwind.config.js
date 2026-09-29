/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ocean: {
          50: '#e0f2fe',
          100: '#bae6fd',
          200: '#7dd3fc',
          300: '#38bdf8',
          400: '#0ea5e9',
          500: '#0284c7',
          600: '#0369a1',
          700: '#1d4ed8',
          800: '#0f4c81',
          900: '#0a2540',
        },
        background: '#f4f6f8',
        foreground: '#0f1b2d',
        card: '#ffffff',
        primary: {
          DEFAULT: '#1a5cd6',
          50: '#eaf1fd',
          100: '#d5e3fb',
          600: '#1750bd',
        },
        muted: {
          DEFAULT: '#f0f4f8',
          foreground: '#5a6b80',
        },
        border: '#e2e8f0',
        eco: {
          DEFAULT: '#157a5b',
          50: '#e6f4ee',
        },
        provisioning: '#0891b2',
        regulating: '#2563eb',
        supporting: '#7c3aed',
        cultural: '#db7f0c',
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          ground: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
}
