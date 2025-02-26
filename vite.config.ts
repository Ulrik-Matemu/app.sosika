import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      base: '/app.sosika/',
      registerType: "autoUpdate",
      injectRegister: "auto",
      strategies: "injectManifest",
      devOptions: {
        enabled: true, // Enable PWA in development mode
      },
      manifest: {
        name: "Sosika",
        short_name: "Sosika",
        description: "An Aggregator for food delivery services in campuses",
        theme_color: "#ffffff",
        background_color: "#f8f9fa",
        display: "standalone",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icons-144x144.png",
            sizes: "144x144",
            type: "image/png",
          }
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    hmr: {
      path: "/app.sosika/__hmr", // Ensure WebSocket path aligns with your base path
    },
  },  
});
