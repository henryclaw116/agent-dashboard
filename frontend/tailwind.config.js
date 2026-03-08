/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rlt-blue': '#1e40af',
        'rlt-green': '#10b981',
        'rlt-red': '#ef4444',
        'rlt-yellow': '#f59e0b',
      }
    },
  },
  plugins: [],
}
