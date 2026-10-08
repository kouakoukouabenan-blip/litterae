import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import { normalize } from "./text";
import type { BlocLecon, Fonction, IdeeIllustration, MotDico, Oeuvre } from "../data/types";

/**
 * Ce que l'éditeur change depuis son tableau de bord (corrections, fiches et leçons ajoutées, mots…).
 * Gardé sur l'appareil ; une nouvelle version est prise en compte à l'ouverture suivante.
 */
/** Prix en francs CFA ; la promo vaut jusqu'à la date incluse (sans date : jusqu'à ce qu'on l'enlève). */
export interface Prix { normal: number; promo: number | null; jusqua: string | null }

export interface ContenuLibre {
  revision: number;
  /** Prix de l'accès complet réglé dans le tableau de bord. */
  prix?: Prix;
  /** Anciennes fiches gratuites imposées : toujours vide (l'élève choisit ses 10 fiches), ignoré. */
  gratuites: string[];
  oeuvres: Record<string, { resume: string | null; idees: IdeeIllustration[]; exemple: string | null }>;
  /** Autres champs corrigés depuis le tableau de bord (titre, auteur, thèmes…), pour toutes les fiches. */
  corrections?: Record<string, Partial<Oeuvre>>;
  /** Leçons du guide modifiées ou passées en payant (texte vide si payantes). */
  lecons?: Record<string, { titre: string; duree: string; libre: boolean; blocs: BlocLecon[] }>;
  /** Fiches et leçons ajoutées depuis le tableau de bord (texte vide si payantes). */
  ajouts?: {
    oeuvres: Oeuvre[];
    /** `quiz` : nombre de questions du quiz écrit dans le tableau de bord (les questions viennent avec le contenu payant). */
    lecons: { id: string; titre: string; duree: string; libre: boolean; blocs: BlocLecon[]; quiz?: number; etape?: string }[];
  };
  /** Mots du dictionnaire ajoutés ou modifiés depuis le tableau de bord (sans le sens). */
  mots?: MotDico[];
  /** Sujets d'entraînement ajoutés depuis le tableau de bord (énoncé seul). */
  entrainement?: { id: string; citation: string; auteur: string; consigne: string; cree: number; themes?: string[]; fonctions?: Fonction[] }[];
  /** Recherches sans résultat reliées par l'éditeur : recherche (normalisée) → ce qu'il faut chercher à la place. */
  renvois?: { oeuvres: Record<string, string>; dico: Record<string, string> };
  /** Formules pour la copie modifiées, ajoutées (ids « ajout-… ») ou retirées (null) depuis le tableau de bord. */
  formules?: Record<string, { id: string; cat: string; nom: string; texte: string; exemple: string; conseil?: string } | null>;
}

const CLE = "contenu-libre";

export const contenuLibre = () => read<ContenuLibre | null>(CLE, null);

/** Récupère la dernière version ; vrai si elle a changé depuis celle gardée sur l'appareil. */
export async function actualiserContenuLibre() {
  if (!SERVEUR_URL || !navigator.onLine) return false;
  try {
    const r = await fetch(SERVEUR_URL + "/contenu-libre", { cache: "no-store" });
    if (!r.ok) return false;
    const d = (await r.json()) as ContenuLibre;
    if (Array.isArray(d?.gratuites) && d.revision !== contenuLibre()?.revision) { write(CLE, d); return true; }
  } catch {
    // Hors connexion : la liste gardée sur l'appareil reste valable.
  }
  return false;
}

/** Ce qu'il faut chercher à la place d'une recherche que l'éditeur a reliée (« sengor » → « Senghor ») ; sinon la recherche telle quelle. */
export function renvoi(ou: "oeuvres" | "dico", q: string) {
  return contenuLibre()?.renvois?.[ou]?.[normalize(q)] ?? q;
}
