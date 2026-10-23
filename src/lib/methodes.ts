/**
 * Les méthodologies de Litterae. Chacune aura sa propre clé Chariow ;
 * tant qu'une méthode n'a pas de contenu, elle reste « Bientôt » dans le choix de méthode.
 */
export interface Methode {
  id: string;
  nom: string;
  /** Couleur de la méthode (pastille, bouton de choix). */
  couleur: string;
  prete: boolean;
}

export const METHODES: Methode[] = [
  { id: "dissertation", nom: "Dissertation littéraire", couleur: "var(--green)", prete: true },
  { id: "commentaire", nom: "Commentaire composé", couleur: "var(--orange)", prete: false },
  { id: "philosophie", nom: "Dissertation philosophique", couleur: "var(--ochre)", prete: false }
];

/** La méthode affichée : la seule prête pour l'instant. */
export const METHODE_ACTIVE = METHODES[0];
