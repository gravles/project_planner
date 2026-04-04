/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0d1117',
          surface: '#111827',
          elevated: '#1a2030',
        },
        border: {
          DEFAULT: '#1f2937',
          hover: '#374151',
        },
        text: {
          primary: '#f9fafb',
          secondary: '#9ca3af',
          muted: '#4b5563',
        },
        accent: '#f59e0b',
        success: '#22c55e',
        danger: '#ef4444',
        info: '#60a5fa',
        property: {
          'king-george': '#818cf8',
          'coach-house': '#34d399',
          olmstead: '#fb923c',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
