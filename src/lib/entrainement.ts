import { SUJETS } from "./data";
import { contenuLibre } from "./libre";
import { read, write } from "./storage";

/** Énoncé d'un sujet à rédiger dans l'atelier : un sujet corrigé (sans son corrigé) ou un sujet ajouté par l'éditeur. */
export interface SujetEntrainement {
  num: string;
  citation: string;
  auteur: string;
  consigne: string;
  ajoute?: boolean;
  /** Sujet de devoir collé par l'élève (« J'ai un devoir »), gardé seulement sur son téléphone. */
  perso?: boolean;
}

const PERSO = "sujets-perso";
type SujetPerso = { num: string; citation: string; auteur: string; consigne: string; cree: number };
export const sujetsPerso = () => read<SujetPerso[]>(PERSO, []);

/** Ajoute le sujet d'un devoir de l'élève (M1, M2…) ; le même énoncé redonne le même numéro. */
export function ajouterSujetPerso(citation: string, auteur: string, consigne: string): string {
  const liste = sujetsPerso();
  const deja = liste.find(s => s.citation === citation);
  if (deja) return deja.num;
  const n = Math.max(0, ...liste.map(s => Number(s.num.slice(1)) || 0)) + 1;
  const num = `m${n}`;
  write(PERSO, [{ num, citation, auteur, consigne, cree: Date.now() }, ...liste].slice(0, 30));
  return num;
}

export const CONSIGNE = "Expliquez et discutez.";

/** Numéro affiché : 01, 02… pour les sujets corrigés, E1, E2… pour les sujets ajoutés. */
export const numero = (num: string) => num.toUpperCase();

/** Les sujets de devoir de l'élève, puis ceux ajoutés depuis le tableau de bord (les plus récents en tête), puis les sujets corrigés. */
export function sujetsEntrainement(): SujetEntrainement[] {
  const ajoutes = (contenuLibre()?.entrainement ?? []).map(e => ({ num: e.id, citation: e.citation, auteur: e.auteur, consigne: e.consigne || CONSIGNE, ajoute: true }));
  const perso = sujetsPerso().map(e => ({ num: e.num, citation: e.citation, auteur: e.auteur, consigne: e.consigne || CONSIGNE, perso: true }));
  return [...perso, ...ajoutes, ...SUJETS.map(s => ({ num: s.num, citation: s.citation, auteur: s.auteur, consigne: CONSIGNE }))];
}
