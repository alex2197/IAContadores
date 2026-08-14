import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F6F1",
        ink: "#1B2521",
        inkmuted: "#5B6560",
        hairline: "#D8D5C9",
        teal: {
          DEFAULT: "#0F6E56",
          soft: "#E1F0EA",
        },
        rust: {
          DEFAULT: "#9A3324",
          soft: "#F5E6E1",
        },
        amber: {
          DEFAULT: "#8A5A0B",
          soft: "#F6ECDA",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
