import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import packageJson from "./package.json";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",

      includeAssets: [
        "favicon.ico",
        "pwa-192.png",
        "apple-splash-*.png",
        "pwa-64x64.png",
        "pwa-192.png",
        "pwa-512.png",
        "maskable-icon-512x512.png",
      ],

      manifest: {
        name: "BB Match Notes",
        short_name: "BB Notes",
        description: "Fast offline match event logging for Blood Bowl tabletop games.",
        theme_color: "#111111",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      // Prod offline caching (das ist, was wir wirklich brauchen)
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: { cacheName: "pages" },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "worker",
            handler: "CacheFirst",
            options: { cacheName: "assets" },
          },
          {
            urlPattern: ({ url }) =>
              [
                "/pwa-192.png",
                "/pwa-512.png",
              ].includes(url.pathname),
            handler: "NetworkFirst",
            options: { cacheName: "icons" },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: { cacheName: "images" },
          },
        ],
      },

      // ✅ WICHTIG: dev-SW AUS, sonst kommt genau dieses glob-warning
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
