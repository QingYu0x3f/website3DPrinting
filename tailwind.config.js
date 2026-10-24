/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: "#0b0e13",
        panel: "#151a22",
        panel2: "#1c232e",
        line: "#273040",
        "line-soft": "#1f2733",
        text: "#dce3ec",
        muted: "#8794a6",
        accent: "#35d0c0",
        "accent-dim": "#1f9e92",
        amber: "#ff8a3d",
        danger: "#ff5470",
      },
      fontFamily: {
        display: ['"Chakra Petch"', '"Bahnschrift"', "sans-serif"],
        sans: ['"IBM Plex Sans"', '"Segoe UI"', "sans-serif"],
        mono: ['"IBM Plex Mono"', '"Cascadia Code"', "monospace"],
      },
    },
  },
  plugins: [],
};
