/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-dark': '#0a0e1a',
        'cyber-surface': '#0f1729',
        'cyber-card': '#141d35',
        'cyber-border': '#1e2d4a',
        'cyber-blue': '#00d4ff',
        'threat-critical': '#ef4444',
        'threat-high': '#f97316',
        'threat-medium': '#eab308',
        'threat-low': '#22c55e',
        'threat-normal': '#6b7280',
      }
    },
  },
  plugins: [],
}
