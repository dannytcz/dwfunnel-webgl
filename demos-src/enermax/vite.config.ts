import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/assets/demos/enermax/build/",
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  build: {
    outDir: "../../assets/demos/enermax/build",
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        entryFileNames: "index-[hash].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "[name]-[hash][extname]",
      },
    },
  },
});
