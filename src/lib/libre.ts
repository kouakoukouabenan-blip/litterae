import { SERVEUR_URL } from "./site";
import { read, write } from "./storage";
import type { IdeeIllustration } from "../data/types";

/**
 * Fiches gratuites choisies par l'éditeur depuis son tableau de bord, avec leurs éventuelles corrections.
 * Gardées sur l'appareil ; une nouvelle liste est prise en compte à l'ouverture suivante.
 */
export interface ContenuLibre {
  revision: number;
  gratuites: string[];
  oeuvres: Record<string, { resume: string | null; idees: IdeeIllustration[]; exemple: string | null }>;
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
