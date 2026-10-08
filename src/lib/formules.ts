import base from "../data/formules.json";
import { contenuLibre } from "./libre";

/**
 * Formules pour la copie, rangées par moment du devoir (généralité, problématique, transition, ouverture…).
 * Chaque formule a des passages à adapter entre crochets, un exemple rédigé sur un même sujet, et parfois un conseil.
 * L'éditeur peut en modifier, en retirer ou en ajouter depuis le tableau de bord (contenu-libre `formules`).
 */
export type Partie = "introduction" | "developpement" | "conclusion" | "partout";
export interface CategorieFormule { id: string; nom: string; partie: Partie; place: string; role: string }
export interface Formule { id: string; cat: string; nom: string; texte: string; exemple: string; conseil?: string }

export const PARTIES: { id: Partie; nom: string }[] = [
  { id: "introduction", nom: "Introduction" },
  { id: "developpement", nom: "Développement" },
  { id: "conclusion", nom: "Conclusion" },
  { id: "partout", nom: "Style" }
];
export const CATEGORIES = base.categories as CategorieFormule[];
/** Le sujet sur lequel sont rédigés tous les exemples. */
export const SUJET_EXEMPLES = base.sujet;

export const categorie = (id: string) => CATEGORIES.find(c => c.id === id);
export const nomPartie = (p: Partie) => PARTIES.find(x => x.id === p)?.nom ?? "";

/** Formules du livre, avec les changements de l'éditeur (null : formule retirée). */
export function formules(): Formule[] {
  const changes = contenuLibre()?.formules ?? {};
  const liste = (base.formules as Formule[]).filter(f => changes[f.id] !== null).map(f => changes[f.id] ?? f);
  const ajoutees = Object.entries(changes).filter(([id, f]) => f && !liste.some(x => x.id === id)).map(([, f]) => f as Formule);
  return [...liste, ...ajoutees].filter(f => categorie(f.cat));
}

export const formulesDe = (cat: string) => formules().filter(f => f.cat === cat);

/** Texte coupé en morceaux : les passages entre crochets sont à remplacer par l'élève. */
export const morceaux = (t: string) => t.split(/(\[[^\]]+\])/).filter(Boolean).map(m => ({ texte: m, trou: /^\[.*\]$/.test(m) }));
