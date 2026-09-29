import { SERVEUR_URL } from "./site";
import { appareil } from "./licence";
import { isInstalled, platform } from "./install";

/**
 * Statistiques anonymes pour l'éditeur : un identifiant d'appareil tiré au hasard, les parties ouvertes,
 * les fiches consultées et les messages de l'accueil vus ou cliqués. Aucun nom, aucune adresse.
 * Les événements sont regroupés et envoyés en une fois pour économiser les données mobiles.
 */
export type Evenement = { t: "ecran" | "oeuvre" | "vue" | "clic" | "notif"; ref: string };

let file: Evenement[] = [];
let minuterie: ReturnType<typeof setTimeout> | undefined;
let visiteEnvoyee = false;

function envoyer() {
  clearTimeout(minuterie);
  minuterie = undefined;
  if (!SERVEUR_URL || !navigator.onLine || (!file.length && visiteEnvoyee)) return;
  const evenements = file.splice(0, 50);
  visiteEnvoyee = true;
  const systeme = { ios: "ios", android: "android", desktop: "ordinateur" }[platform()];
  // Texte brut : le navigateur n'a pas besoin de demander d'autorisation préalable au serveur.
  fetch(SERVEUR_URL + "/stat", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify({ appareil: appareil(), systeme, installe: isInstalled(), evenements }),
    keepalive: true
  }).catch(() => {});
}

export function noter(e: Evenement) {
  if (file.some(x => x.t === e.t && x.ref === e.ref)) return;
  file.push(e);
  minuterie ??= setTimeout(envoyer, 8000);
}

/** Compte la visite dès l'ouverture, puis envoie le reste quand l'élève quitte ou met l'appli en arrière-plan. */
export function demarrerStats() {
  setTimeout(envoyer, 3000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") envoyer(); });
}
