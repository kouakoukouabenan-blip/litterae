import type { IdeeIllustration } from "../data/types";
import { licence } from "./licence";
import { read, useStored, write } from "./storage";
import { SERVEUR_URL } from "./site";

/**
 * Fiches d'œuvres sans clé : le site public n'a que de quoi chercher et filtrer.
 * L'élève ouvre 10 fiches de son choix (demandées une à une au serveur puis gardées sur l'appareil),
 * comme les 10 mots du dictionnaire ; avec une clé, toutes les fiches arrivent avec le contenu payant.
 */
export const FICHES_GRATUITES = 10;
const CLE = "fiches-ouvertes";

export type TexteFiche = { resume: string | null; idees: IdeeIllustration[]; exemple: string | null };
type Ouvertes = Record<string, TexteFiche>;

export const fichesOuvertes = () => read<Ouvertes>(CLE, {});
export const useFichesOuvertes = () => useStored<Ouvertes>(CLE, {})[0];

export type EchecFiche = "limite" | "hors-ligne" | "trop" | "erreur";

/** Ouvre une fiche gratuite : elle compte dans les 10 dès qu'elle arrive sur l'appareil. */
export async function ouvrirFiche(id: string): Promise<TexteFiche | EchecFiche> {
  const vues = fichesOuvertes();
  if (vues[id]) return vues[id];
  if (!licence() && Object.keys(vues).length >= FICHES_GRATUITES) return "limite";
  if (!navigator.onLine || !SERVEUR_URL) return "hors-ligne";
  try {
    const r = await fetch(`${SERVEUR_URL}/fiche?id=${encodeURIComponent(id)}`);
    const d = await r.json().catch(() => null);
    if (r.status === 429) return "trop";
    if (!r.ok || !d?.fiche) return "erreur";
    // Relu juste avant d'écrire : une autre fiche a pu être ouverte entre-temps.
    write(CLE, { ...fichesOuvertes(), [id]: d.fiche });
    return d.fiche as TexteFiche;
  } catch {
    return "erreur";
  }
}
