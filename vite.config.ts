import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

// Chemins relatifs : le site fonctionne sous /litterae/ sur GitHub Pages comme en local.
export default defineConfig({
  base: "./",
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Litterae",
        short_name: "Litterae",
        description: "La dissertation littéraire pour les élèves de terminale : méthode, sujets corrigés et résumés d'œuvres.",
        lang: "fr",
        start_url: "./",
        scope: "./",
        display: "standalone",
        // Permet à Chrome (Android) de savoir si l'application est déjà installée.
        related_applications: [{ platform: "webapp", url: "https://kouakoukouabenan-blip.github.io/litterae/manifest.webmanifest" }],
        background_color: "#FFF8EC",
        theme_color: "#0F3D2E",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // Réception des notifications (promos, messages, astuces) : public/push-sw.js
        importScripts: ["push-sw.js"],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Polices cyrilliques, grecques et vietnamiennes : jamais utilisées, inutile de les télécharger d'avance.
        globIgnores: ["**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2"]
      }
    })
  ]
});
