/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0D1117",
        darkCard: "#1A1F2E",
        darkBorder: "#2D3748",
        safeGreen: "#1D9E75",
        warnAmber: "#F59E0B",
        dangerRed: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
}
