/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#F8F9FA",
        darkCard: "#FFFFFF",
        darkBorder: "#E8EAED",
        safeGreen: "#188038",
        warnAmber: "#F29900",
        dangerRed: "#D93025",
        googleBlue: "#1A73E8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
}
