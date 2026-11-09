import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Minhas Figurinhas",
        short_name: "Figurinhas",
        description: "Seu jeito de dizer. Crie figurinhas no seu celular.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f7f7ff",
        theme_color: "#f7f7ff",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,png,woff2,wasm}"],
        globIgnores: ["model-runtime/**", "assets/ort-*.wasm"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/model-runtime/"),
            handler: "CacheFirst",
            options: {
              cacheName: "styckerweb-runtime-v1",
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 8_000_000,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  worker: { format: "es" },
  build: { chunkSizeWarningLimit: 1500 },
});
