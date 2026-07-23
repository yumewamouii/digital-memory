import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Для GitHub Pages: /<repo-name>/
// Локально Vite подставит "/" если не задан VITE_BASE
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  server: {
    port: 5173,
  },
});
