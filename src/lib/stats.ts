import { ACHAT_URL, SERVEUR_URL } from "./site";
import { parseHash } from "./router";
import { appareil } from "./licence";
import { isInstalled, platform } from "./install";
import { read, write } from "./storage";

/**
 * Statistiques anonymes pour l'éditeur : un identifiant d'appareil tiré au hasard, les parties ouvertes,
 * les fiches consultées et les messages de l'accueil vus ou cliqués. Aucun nom, aucune adresse.
 * Les événements sont regroupés et envoyés en une fois pour économiser les données mobiles.
 */
export type Evenement = { t: "ecran" | "oeuvre" | "vue" | "clic" | "notif" | "sujet" | "lecon" | "mot" | "recherche" | "vide" | "verrou" | "achat" | "parcours" | "partage" | "gratuit" | "progres" | "suggestion"; ref: string };

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

/**
 * Parcours anonyme : l'appareil signale seulement qu'il franchit un palier (1re fiche ouverte, sujet commencé…),
 * une seule fois. Le détail de ce que l'élève ouvre reste sur son téléphone.
 */
function palier(ref: string) {
  const faits = read<string[]>("parcours", []);
  if (faits.includes(ref)) return;
  write("parcours", [...faits, ref]);
  noter({ t: "parcours", ref });
}

const PALIERS_FICHES = [1, 2, 6];

export function noterFiche(id: string) {
  const vues = read<string[]>("parcours-fiches", []);
  if (!vues.includes(id)) write("parcours-fiches", [...vues, id]);
  const n = vues.includes(id) ? vues.length : vues.length + 1;
  for (const p of PALIERS_FICHES) if (n >= p) palier(`fiches:${p}`);
}

/**
 * Fiche, leçon ou mot gratuit ouvert sans clé : seulement son rang (« fiche:3 » = 3e fiche gratuite de l'appareil),
 * pour savoir chaque jour combien de contenus gratuits sont ouverts et combien d'élèves arrivent au bout.
 */
export function noterGratuit(type: "fiche" | "lecon" | "mot", rang: number) {
  noter({ t: "gratuit", ref: `${type}:${rang}` });
}

/** Sujet de l'atelier commencé, terminé, copie envoyée. */
export function noterAtelier(num: string, pct: number, envoye: boolean) {
  if (pct > 0) palier(`debut:${num}`);
  if (pct === 100) palier(`fini:${num}`);
  if (envoye) palier(`envoye:${num}`);
}

/** Partie de l'appli où se trouve l'élève, pour savoir d'où viennent les achats (entonnoir du tableau de bord). */
export function endroit(): string {
  const [section = "accueil", id] = parseHash().path;
  const noms: Record<string, string> = { oeuvres: id ? "oeuvre" : "oeuvres", sujets: "sujet", cours: id ? "lecon" : "accueil", outils: "dico", acces: "acces", carnet: "espace", devoirs: "espace", "a-propos": "a-propos", cgu: "a-propos" };
  return noms[section] ?? "autre";
}

/** Recherche faite par l'élève (œuvres ou dictionnaire), notée si elle reste affichée 2 secondes. */
export function noterRecherche(ou: "oeuvres" | "dico", q: string, trouves: number) {
  const nette = q.trim().toLowerCase();
  if (nette.length < 3) return () => {};
  const t = setTimeout(() => {
    noter({ t: "recherche", ref: `${ou}:${nette}` });
    if (!trouves) noter({ t: "vide", ref: `${ou}:${nette}` });
  }, 2000);
  return () => clearTimeout(t);
}

/** Compte la visite dès l'ouverture, puis envoie le reste quand l'élève quitte ou met l'appli en arrière-plan. */
export function demarrerStats() {
  // Tout lien vers la page d'achat Chariow, où qu'il soit.
  document.addEventListener("click", e => {
    const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
    if (a && ACHAT_URL && a.href.startsWith(ACHAT_URL)) { noter({ t: "achat", ref: endroit() }); envoyer(); }
  });
  setTimeout(envoyer, 3000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") envoyer(); });
}
