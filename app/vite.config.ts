import { defineConfig } from "vite";

export default defineConfig({
  base: "/dukkeobi/",
  build: {
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: false,
  },
});
