// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    // add other paths here if you keep components elsewhere
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Poppins"', 'Inter', 'system-ui'],
        inter: ['"Inter"', 'system-ui'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Roboto Mono', 'monospace'],
      },
      colors: {
        // optional: extend brand colors if needed
      },
    },
  },
  plugins: [],
};
