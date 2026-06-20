import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      animation: {
        "spin-slow": "spin 10s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;