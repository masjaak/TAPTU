import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "app-icon.svg", "splash-screen.svg"],
      manifest: {
        name: "Hadiri by TAPTU",
        short_name: "Hadiri",
        theme_color: "#0e1f1b",
        background_color: "#f7f8f4",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/app-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/app-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  server: {
    port: 5173
  }
});
