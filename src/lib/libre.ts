import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import type { BlocLecon, IdeeIllustration, MotDico, Oeuvre } from "../data/types";

/**
 * Ce que l'éditeur change depuis son tableau de bord (corrections, fiches et leçons ajoutées, mots…).
 * Gardé sur l'appareil ; une nouvelle version est prise en compte à l'ouverture suivante.
 */
export interface ContenuLibre {
  revision: number;
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
    lecons: { id: string; titre: string; duree: string; libre: boolean; blocs: BlocLecon[]; quiz?: number }[];
  };
  /** Mots du dictionnaire ajoutés ou modifiés depuis le tableau de bord (sans le sens). */
  mots?: MotDico[];
  /** Sujets d'entraînement ajoutés depuis le tableau de bord (énoncé seul). */
  entrainement?: { id: string; citation: string; auteur: string; consigne: string; cree: number }[];
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
