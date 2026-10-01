import { SUJETS } from "./data";
import { contenuLibre } from "./libre";

/** Énoncé d'un sujet à rédiger dans l'atelier : un sujet corrigé (sans son corrigé) ou un sujet ajouté par l'éditeur. */
export interface SujetEntrainement {
  num: string;
  citation: string;
  auteur: string;
  consigne: string;
  ajoute?: boolean;
}

export const CONSIGNE = "Expliquez et discutez.";

/** Numéro affiché : 01, 02… pour les sujets corrigés, E1, E2… pour les sujets ajoutés. */
export const numero = (num: string) => num.toUpperCase();

/** Les sujets ajoutés depuis le tableau de bord d'abord (les plus récents en tête), puis les sujets corrigés. */
export function sujetsEntrainement(): SujetEntrainement[] {
  const ajoutes = (contenuLibre()?.entrainement ?? []).map(e => ({ num: e.id, citation: e.citation, auteur: e.auteur, consigne: e.consigne || CONSIGNE, ajoute: true }));
  return [...ajoutes, ...SUJETS.map(s => ({ num: s.num, citation: s.citation, auteur: s.auteur, consigne: CONSIGNE }))];
}
