import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,

    hmr: {
      // Usar la IP del cliente que accede, no una IP fija
      // clientPort permite que el browser use su propia IP para el WS
      clientPort: 5173,
    },
  },
});