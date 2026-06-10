import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/vivicopa-palpite-royal/",
  root: ".",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: "dist/pages",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "github-pages/index.html"),
      },
    },
  },
});
