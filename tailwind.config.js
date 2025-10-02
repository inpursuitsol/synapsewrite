/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx,mdx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      container: {
        center: true,
        padding: "1rem"
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem"
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.08)"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};
