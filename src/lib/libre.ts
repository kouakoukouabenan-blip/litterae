import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import type { BlocLecon, IdeeIllustration, MotDico, Oeuvre } from "../data/types";

/**
 * Fiches gratuites choisies par l'éditeur depuis son tableau de bord, avec leurs éventuelles corrections.
 * Gardées sur l'appareil ; une nouvelle liste est prise en compte à l'ouverture suivante.
 */
export interface ContenuLibre {
  revision: number;
  gratuites: string[];
  oeuvres: Record<string, { resume: string | null; idees: IdeeIllustration[]; exemple: string | null }>;
  /** Autres champs corrigés depuis le tableau de bord (titre, auteur, thèmes…), pour toutes les fiches. */
  corrections?: Record<string, Partial<Oeuvre>>;
  /** Leçons du guide modifiées ou passées en payant (texte vide si payantes). */
  lecons?: Record<string, { titre: string; duree: string; libre: boolean; blocs: BlocLecon[] }>;
  /** Fiches et leçons ajoutées depuis le tableau de bord (texte vide si payantes). */
  ajouts?: {
    oeuvres: Oeuvre[];
    lecons: { id: string; titre: string; duree: string; libre: boolean; blocs: BlocLecon[] }[];
  };
  /** Mots du dictionnaire ajoutés ou modifiés depuis le tableau de bord (sans le sens). */
  mots?: MotDico[];
  /** Sujets d'entraînement ajoutés depuis le tableau de bord (énoncé seul). */
  entrainement?: { id: string; citation: string; auteur: string; consigne: string; cree: number }[];
}

const CLE = "contenu-libre";

export const contenuLibre = () => read<ContenuLibre | null>(CLE, null);

export async function actualiserContenuLibre() {
  if (!SERVEUR_URL || !navigator.onLine) return;
  try {
    const r = await fetch(SERVEUR_URL + "/contenu-libre");
    if (!r.ok) return;
    const d = (await r.json()) as ContenuLibre;
    if (Array.isArray(d?.gratuites) && d.revision !== contenuLibre()?.revision) write(CLE, d);
  } catch {
    // Hors connexion : la liste gardée sur l'appareil reste valable.
  }
}
