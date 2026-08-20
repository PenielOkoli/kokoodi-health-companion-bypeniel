import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcf6",
          100: "#d5f5e6",
          500: "#0f9d63",
          600: "#0c7f50",
          700: "#0a6741",
        },
      },
    },
  },
  plugins: [],
};
export default config;
