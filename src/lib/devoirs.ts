import { useStored, read, write } from "./storage";
import { normalize } from "./text";

/** Devoirs que l'élève a gardés depuis « J'ai un devoir » : sur son téléphone seulement, dans Mon espace. */
export interface DevoirGarde {
  id: string; texte: string; auteur: string; garde: number;
  /** Jour où le devoir est à rendre (AAAA-MM-JJ), donné par l'élève. */
  pour?: string;
  /** Sujet de l'atelier préparé pour ce devoir. */
  num?: string;
}

const CLE = "devoirs-gardes";
const MAX = 50;

export const useDevoirs = () => useStored<DevoirGarde[]>(CLE, []);

const meme = (a: string, b: string) => normalize(a) === normalize(b);
export const estGarde = (liste: DevoirGarde[], texte: string) => liste.some(d => meme(d.texte, texte));
export const devoirDe = (liste: DevoirGarde[], texte: string) => liste.find(d => meme(d.texte, texte));

/** Garde le devoir (le même énoncé n'est gardé qu'une fois, remonté en tête avec son auteur à jour). */
export function garderDevoir(texte: string, auteur: string) {
  const tous = read<DevoirGarde[]>(CLE, []);
  const avant = tous.find(d => meme(d.texte, texte));
  const liste = tous.filter(d => d !== avant);
  write(CLE, [{ ...avant, id: avant?.id ?? Date.now().toString(36), texte: texte.trim(), auteur: auteur.trim(), garde: Date.now() }, ...liste].slice(0, MAX));
}

export function retirerDevoir(id: string) {
  write(CLE, read<DevoirGarde[]>(CLE, []).filter(d => d.id !== id));
}

export function majDevoir(id: string, champs: Partial<DevoirGarde>) {
  write(CLE, read<DevoirGarde[]>(CLE, []).map(d => (d.id === id ? { ...d, ...champs } : d)));
}

/** Prochain devoir à rendre (aujourd'hui ou plus tard), le plus proche d'abord. */
export function devoirARendre(aujourdhui: string): DevoirGarde | null {
  return read<DevoirGarde[]>(CLE, []).filter(d => d.pour && d.pour >= aujourdhui).sort((a, b) => a.pour!.localeCompare(b.pour!))[0] ?? null;
}
