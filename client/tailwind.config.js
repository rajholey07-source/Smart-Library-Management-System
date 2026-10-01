/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce7fd',
          200: '#c0d4fc',
          300: '#94b8fa',
          400: '#6192f6',
          500: '#3d6def',
          600: '#274de3',
          700: '#1f3bd0',
          800: '#2032a9',
          900: '#1f2f86',
          950: '#171f52',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
