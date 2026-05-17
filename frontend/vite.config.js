import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,

    strictPort: true,

    allowedHosts: [
      ".gitpod.dev",
      ".gitpod.io",
    ],

    hmr: {
      clientPort: 443,
    },
  },
});