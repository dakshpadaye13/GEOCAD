/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Override font-sans to always use Inter
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#060911',
          panel: '#0d1322',
          accent: '#06b6d4',
        }
      }
    },
  },
  plugins: [],
}
