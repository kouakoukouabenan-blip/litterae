import "./lib/compat";
// Avant tout le reste : range ce qui arrive de l'ancienne adresse avant que l'appli ne lise quoi que ce soit.
import { cleRecue, nouvelleAdressePrete, surAncienneAdresse, rappelDu } from "./lib/passage";
import { render } from "preact";
import "@fontsource-variable/literata/wght.css";
import "@fontsource-variable/literata/wght-italic.css";
import "@fontsource-variable/dm-sans/index.css";
// Polices de la nouvelle identité : le navigateur ne les télécharge que si elles servent (identité active).
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/inter/wght-italic.css";
import "@fontsource/fraunces/latin-400-italic.css";
import "@fontsource/fraunces/latin-600-italic.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/screens.css";
import "./styles/theme-melange.css";
import "./styles/formation.css";
// Nouvelle identité « La Synthèse » : tout est rangé sous html.identite-nouvelle (src/lib/identite-defaut.ts).
import "./styles/theme-identite.css";
import "./lib/install";
import { App } from "./app";
import { conserverDonnees } from "./lib/storage";
import { appliquerIdentite } from "./lib/identite";
import { registerSW } from "virtual:pwa-register";
import { PassageArrivee, PassageDepart, afficherRappel, demoPassage } from "./components/Passage";

conserverDonnees();
appliquerIdentite();

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

// Retire l'écran d'ouverture : 3 secondes à la première ouverture de la journée (le temps de son animation,
// demande d'Atikan), 1 seconde ensuite (classe posée par index.html), jamais plus.
const splash = document.getElementById("splash");
if (splash) {
  const duree = document.documentElement.classList.contains("ouverture-rapide") ? 1000 : 3000;
  const reste = Math.max(0, duree - performance.now());
  setTimeout(() => {
    splash.classList.add("fin");
    setTimeout(() => splash.remove(), 400);
  }, reste);
}
