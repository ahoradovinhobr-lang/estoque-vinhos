import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1d1b20",
        paper: "#fbfaf8",
        blush: "#f8eef2",
        cellar: "#a51649",
        cellarDark: "#4b1227",
        olive: "#65734f",
        brass: "#b68b42"
      }
    }
  },
  plugins: []
};

export default config;
