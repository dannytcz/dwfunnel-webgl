/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        outfit: ["var(--font-outfit)"],
        fustat: ["var(--font-fustat)"],
        sans: ["var(--font-sans)"],
      },
      colors: {
        brand: {
          DEFAULT: "#0084FF",
          hover: "#0074E0",
          deep: "#0066CC",
        },
      },
    },
  },
  plugins: [],
};
