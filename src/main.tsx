import { render } from "preact";
import "@fontsource-variable/literata/wght.css";
import "@fontsource-variable/literata/wght-italic.css";
import "@fontsource-variable/dm-sans/index.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/screens.css";
import "./styles/theme-melange.css";
import "./lib/install";
import { App } from "./app";
import { conserverDonnees } from "./lib/storage";
import { registerSW } from "virtual:pwa-register";

conserverDonnees();

// Nouvelle version en ligne : elle s'installe et la page se recharge seule, pour ne jamais garder
// un ancien code avec de nouvelles images. Vérifie aussi toutes les heures si l'appli reste ouverte.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) { if (reg) setInterval(() => { if (navigator.onLine) reg.update(); }, 60 * 60 * 1000); }
});

render(<App />, document.getElementById("app")!);

// Retire l'écran d'ouverture : il reste au moins le temps de son animation, jamais plus (environ 2 s).
const splash = document.getElementById("splash");
if (splash) {
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reste = calme ? 0 : Math.max(0, 1900 - performance.now());
  setTimeout(() => {
    splash.classList.add("fin");
    setTimeout(() => splash.remove(), 400);
  }, reste);
}
