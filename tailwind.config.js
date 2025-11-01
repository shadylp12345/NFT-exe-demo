/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Adjust the path as necessary
  ],
  theme: {
    extend: {
      colors: {
        aurora: {
          cyan: "#00FFF0",
          blue: "#0080FF",
          purple: "#8000FF",
          pink: "#FF00FF",
          green: "#00FF80",
        },
      },
      backgroundImage: {
        "aurora-gradient":
          "linear-gradient(135deg, #00FFF0 0%, #0080FF 25%, #8000FF 50%, #FF00FF 75%, #00FF80 100%)",
        "aurora-dark":
          "linear-gradient(135deg, #001a1a 0%, #001440 25%, #1a0040 50%, #2d0033 75%, #001a0f 100%)",
      },
    },
  },
  plugins: [],
};
