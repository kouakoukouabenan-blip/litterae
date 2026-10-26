import { useStored } from "./storage";

/**
 * Les méthodologies de Litterae. Une seule clé Chariow les ouvre toutes ;
 * tant qu'une méthode n'a pas de contenu, elle reste « Bientôt » dans le choix de méthode.
 */
export interface Methode {
  id: string;
  nom: string;
  /** Couleur de la méthode (pastille, bouton de choix). */
  couleur: string;
  /** Couleur du texte sur fond clair (l'ocre est trop pâle pour du texte). */
  encre: string;
  prete: boolean;
}

export const METHODES: Methode[] = [
  { id: "dissertation", nom: "Dissertation littéraire", couleur: "var(--green)", encre: "var(--green)", prete: true },
  { id: "commentaire", nom: "Commentaire composé", couleur: "var(--orange)", encre: "var(--orange-text)", prete: true },
  { id: "philosophie", nom: "Dissertation philosophique", couleur: "var(--ochre)", encre: "var(--ochre-text)", prete: false }
];

/** La méthode choisie par l'élève, retenue sur l'appareil. */
export function useMethode(): [Methode, (id: string) => void] {
  const [id, setId] = useStored("methode", "dissertation");
  const m = METHODES.find(x => x.id === id && x.prete) ?? METHODES[0];
  return [m, setId];
}
