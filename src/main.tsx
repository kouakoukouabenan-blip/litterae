import "./lib/compat";
// Avant tout le reste : range ce qui arrive de l'ancienne adresse avant que l'appli ne lise quoi que ce soit.
import { cleRecue, nouvelleAdressePrete, surAncienneAdresse, rappelDu } from "./lib/passage";
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
import "./styles/formation.css";
import "./lib/install";
import { App } from "./app";
import { conserverDonnees } from "./lib/storage";
import { registerSW } from "virtual:pwa-register";
import { PassageArrivee, PassageDepart, afficherRappel, demoPassage } from "./components/Passage";

conserverDonnees();

// Nouvelle version en ligne : elle s'installe et la page se recharge seule, pour ne jamais garder
// un ancien code avec de nouvelles images. Vérifie aussi toutes les heures si l'appli reste ouverte,
// et chaque fois que l'élève revient dans l'appli laissée en arrière-plan (téléphone : elle n'est pas relancée).
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    let derniere = Date.now();
    const verifier = () => { if (navigator.onLine && Date.now() - derniere > 60_000) { derniere = Date.now(); reg.update().catch(() => {}); } };
    setInterval(verifier, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") verifier(); });
  }
});

const racine = document.getElementById("app")!;
if (cleRecue() && navigator.onLine) render(<PassageArrivee />, racine);
else if (demoPassage() && !location.hash.includes("rappel")) { document.getElementById("splash")?.remove(); render(<PassageDepart />, racine); }
else {
  render(<App />, racine);
  // Ancienne adresse : l'appli marche comme avant. Le passage est dans Mon espace, et un petit rappel
  // (une fois par semaine au plus) propose la nouvelle adresse dès qu'elle répond.
  if ((surAncienneAdresse() && rappelDu()) || (demoPassage() && location.hash.includes("rappel"))) nouvelleAdressePrete().then(ok => { if (ok || demoPassage()) afficherRappel(); });
}

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
