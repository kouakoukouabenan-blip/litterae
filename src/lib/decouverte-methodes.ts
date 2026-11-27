import { read, write, cles } from "./storage";
import { jourLocal } from "./progres";
import { METHODES } from "./methodes";

/**
 * Faire découvrir les autres méthodes (demande d'Atikan, 2026-11-27 : beaucoup d'élèves ne savent pas
 * que le Commentaire composé est aussi dans Litterae).
 * - Tout premier lancement : l'appli s'ouvre sur le choix de la méthode.
 * - Ensuite, un petit repère sous le bouton de méthode de la barre du haut montre où changer.
 *   Il apparaît une fois à tous les élèves (à la prochaine ouverture avec connexion), puis encore
 *   après JOURS_AVANT_RAPPEL jours d'utilisation sans avoir jamais ouvert une autre méthode,
 *   MAX_REPERES fois en tout au plus.
 */
export const JOURS_AVANT_RAPPEL = 5;
export const MAX_REPERES = 3;

const CHOIX = "premier-choix-methode";      // "a-faire" | "fait"
const ESSAYEES = "methodes-essayees";       // méthodes que l'élève a déjà ouvertes
const REPERE = "repere-methode";            // { vus, jours, dernierJour }

interface Repere { vus: number; jours: number; dernierJour: string }

// Au chargement : un élève tout neuf (première visite, aucune méthode retenue) commence par le choix.
// Le drapeau reste posé tant qu'il n'a pas choisi, même s'il installe l'appli entre-temps.
(() => {
  if (read<string>(CHOIX, "")) return;
  const neuf = read<number>("visites", 0) <= 1 && read<string | null>("methode", null) === null;
  write(CHOIX, neuf ? "a-faire" : "fait");
})();

// Méthodes déjà ouvertes : la méthode retenue, et le Commentaire si l'élève y a déjà travaillé.
(() => {
  if (read<string[] | null>(ESSAYEES, null)) return;
  const deja = new Set<string>([read<string>("methode", "dissertation")]);
  if (cles("cc-").length) deja.add("commentaire");
  write(ESSAYEES, [...deja]);
})();

// Un jour d'utilisation de plus (une fois par jour).
(() => {
  const r = read<Repere>(REPERE, { vus: 0, jours: 0, dernierJour: "" });
  const auj = jourLocal();
  if (r.dernierJour !== auj) write(REPERE, { ...r, jours: r.jours + 1, dernierJour: auj });
})();

window.addEventListener("methode-change", () => {
  const m = read<string>("methode", "dissertation");
  const deja = read<string[]>(ESSAYEES, []);
  if (!deja.includes(m)) write(ESSAYEES, [...deja, m]);
});

export const choixAFaire = () => read<string>(CHOIX, "fait") === "a-faire";
export function choixFait() { write(CHOIX, "fait"); window.dispatchEvent(new Event("choix-methode-fait")); }

const pretes = () => METHODES.filter(m => m.prete).map(m => m.id);

/** Le repère doit-il apparaître maintenant ? */
export function repereAMontrer(): boolean {
  if (choixAFaire()) return false;
  const r = read<Repere>(REPERE, { vus: 0, jours: 0, dernierJour: "" });
  if (r.vus === 0) return true;
  if (r.vus >= MAX_REPERES) return false;
  const essayees = read<string[]>(ESSAYEES, []).filter(id => pretes().includes(id));
  return essayees.length < 2 && r.jours >= JOURS_AVANT_RAPPEL;
}

/** Le repère vient d'apparaître : on repart de zéro pour compter les jours. */
export function repereVu() {
  const r = read<Repere>(REPERE, { vus: 0, jours: 0, dernierJour: "" });
  write(REPERE, { ...r, vus: r.vus + 1, jours: 0 });
}
