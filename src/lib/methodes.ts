import { read, useStored, write } from "./storage";
import { noter } from "./stats";
import { jourLocal } from "./progres";

/**
 * Les méthodologies de Litterae. Une seule clé Chariow les ouvre toutes ;
 * tant qu'une méthode n'a pas de contenu, elle reste « Bientôt » dans le choix de méthode.
 */
export interface Methode {
  id: string;
  nom: string;
  /** Nom court, pour la barre du haut. */
  court: string;
  /** Couleur de la méthode (pastille, bouton de choix). */
  couleur: string;
  /** Couleur du texte sur fond clair (l'ocre est trop pâle pour du texte). */
  encre: string;
  prete: boolean;
}

export const METHODES: Methode[] = [
  { id: "dissertation", nom: "Dissertation littéraire", court: "Dissertation", couleur: "var(--green)", encre: "var(--green)", prete: true },
  { id: "commentaire", nom: "Commentaire composé", court: "Commentaire", couleur: "var(--orange)", encre: "var(--orange-text)", prete: true },
  { id: "philosophie", nom: "Dissertation philosophique", court: "Philosophie", couleur: "var(--ochre)", encre: "var(--ochre-text)", prete: false }
];

/** La méthode choisie par l'élève, retenue sur l'appareil. */
export function useMethode(): [Methode, (id: string) => void] {
  const [id, setId] = useStored("methode", "dissertation");
  const m = METHODES.find(x => x.id === id && x.prete) ?? METHODES[0];
  return [m, (nouvelle: string) => {
    if (nouvelle === m.id) return;
    setId(nouvelle);
    // Messages et notifications suivent la méthode ; le tableau de bord compte les élèves de chaque méthode.
    window.dispatchEvent(new Event("methode-change"));
  }];
}

/** Méthode choisie sur l'appareil, hors des écrans (messages, notifications, chiffres). */
export const methodeActive = () => (METHODES.find(x => x.id === read("methode", "dissertation") && x.prete) ?? METHODES[0]).id;

/** Une fois par jour et par méthode : le tableau de bord compte combien d'élèves sont dans chaque méthode. */
export function noterMethodeDuJour() {
  const m = methodeActive(), auj = jourLocal();
  if (read<string>(`methode-notee:${m}`, "") === auj) return;
  write(`methode-notee:${m}`, auj);
  noter({ t: "cc", ref: `jour:${m}` });
}
window.addEventListener("methode-change", () => setTimeout(noterMethodeDuJour, 0));
