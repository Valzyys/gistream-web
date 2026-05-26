import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
// Hapus import cloudflare

export default defineConfig({
  plugins: [react(), svgr({
    svgrOptions: {
      icon: true,
      exportType: "named",
      namedExport: "ReactComponent",
    },
  })],  // Hapus cloudflare()
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
