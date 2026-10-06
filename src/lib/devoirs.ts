import { useStored, read, write } from "./storage";
import { normalize } from "./text";

/** Devoirs que l'élève a gardés depuis « J'ai un devoir » : sur son téléphone seulement, dans Mon espace. */
export interface DevoirGarde { id: string; texte: string; auteur: string; garde: number }

const CLE = "devoirs-gardes";
const MAX = 50;

export const useDevoirs = () => useStored<DevoirGarde[]>(CLE, []);

const meme = (a: string, b: string) => normalize(a) === normalize(b);
export const estGarde = (liste: DevoirGarde[], texte: string) => liste.some(d => meme(d.texte, texte));

/** Garde le devoir (le même énoncé n'est gardé qu'une fois, remonté en tête avec son auteur à jour). */
export function garderDevoir(texte: string, auteur: string) {
  const liste = read<DevoirGarde[]>(CLE, []).filter(d => !meme(d.texte, texte));
  write(CLE, [{ id: Date.now().toString(36), texte: texte.trim(), auteur: auteur.trim(), garde: Date.now() }, ...liste].slice(0, MAX));
}

export function retirerDevoir(id: string) {
  write(CLE, read<DevoirGarde[]>(CLE, []).filter(d => d.id !== id));
}
