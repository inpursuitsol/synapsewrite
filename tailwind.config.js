// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Poppins"', 'Inter', 'system-ui'],
        inter: ['"Inter"', 'system-ui'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Roboto Mono', 'monospace']
      },
      colors: {
        brand: {
          DEFAULT: "#4f46e5"
        }
      }
    },
  },
  plugins: [],
};
