import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";
import { IDENTITE_PAR_DEFAUT } from "./src/lib/identite-defaut";

// Icônes d'appli et couleurs du manifeste : celles de l'identité choisie par l'interrupteur (src/lib/identite-defaut.ts).
const NOUVELLE = IDENTITE_PAR_DEFAUT !== "ancienne";
const DOSSIER = IDENTITE_PAR_DEFAUT === "nouvelle-afrique" ? "identite-afrique" : "identite";
const BARRE = IDENTITE_PAR_DEFAUT === "nouvelle" ? "#26285E" : "#0F3D2E";
const FOND = IDENTITE_PAR_DEFAUT === "nouvelle" ? "#FAF7F0" : "#FFF8EC";
const ICONES = NOUVELLE
  ? [
      { src: `${DOSSIER}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${DOSSIER}/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${DOSSIER}/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  : [
      { src: "icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ];

// Chemins relatifs : le site fonctionne sous /litterae/ sur GitHub Pages comme en local.
export default defineConfig({
  base: "./",
  // Beaucoup d'élèves ont de vieux téléphones dont Chrome n'est plus mis à jour : on vise large.
  build: { target: ["es2018", "chrome64", "safari12"], cssTarget: ["chrome64", "safari12"] },
  plugins: [
    preact(),
    {
      // index.html : identité par défaut pour le petit script du haut de page, et icônes de l'identité choisie.
      name: "identite",
      transformIndexHtml(html: string) {
        html = html.replace("__IDENTITE_PAR_DEFAUT__", IDENTITE_PAR_DEFAUT);
        return NOUVELLE
          ? html.replace('href="./favicon.svg"', `href="./${DOSSIER}/favicon.svg"`).replace('href="./icon-192.png"', `href="./${DOSSIER}/apple-touch-icon.png"`).replace('content="#0F3D2E"', `content="${BARRE}"`)
          : html;
      }
    },
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png", "identite/favicon.svg", "identite-afrique/favicon.svg"],
      manifest: {
        name: "Litterae",
        short_name: "Litterae",
        description: "La dissertation littéraire pour les élèves de terminale : méthode, sujets corrigés et résumés d'œuvres.",
        lang: "fr",
        start_url: "./",
        scope: "./",
        display: "standalone",
        // Permet à Chrome (Android) de savoir si l'application est déjà installée.
        // Cloudflare Pages (litterae.app) ou GitHub Pages (ancienne adresse).
        related_applications: [{ platform: "webapp", url: process.env.CF_PAGES ? "https://litterae.app/manifest.webmanifest" : "https://kouakoukouabenan-blip.github.io/litterae/manifest.webmanifest" }],
        background_color: FOND,
        theme_color: BARRE,
        icons: ICONES
      },
      workbox: {
        // Réception des notifications (promos, messages, astuces) : public/push-sw.js
        importScripts: ["push-sw.js"],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Polices cyrilliques, grecques et vietnamiennes : jamais utilisées, inutile de les télécharger d'avance.
        globIgnores: ["**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2"],
        // Pages publiques pour Google (scripts/pages-google.mjs) : jamais remplacées par l'appli quand elle est installée.
        navigateFallbackDenylist: [/\/(oeuvres|themes|fonctions|programme|pages)\//, /\/(sitemap\.xml|robots\.txt)$/]
      }
    })
  ]
});
