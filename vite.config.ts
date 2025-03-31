import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      strategies: "injectManifest", // Changed from generateSW to injectManifest
      srcDir: "src",
      filename: "sw.js", // Your custom service worker file
      manifest: false, // Prevents automatic manifest generation
      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST',
        swSrc: './src/sw.js',  // Source service worker
        swDest: 'dist/sw.js',  // Destination after build
      }
    }),
  ],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    hmr: {
      path: "/__hmr",
      protocol: "ws",
      clientPort: 5173,
    },
  },
});