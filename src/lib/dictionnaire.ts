import type { EntreeDico } from "../data/types";
import { licence } from "./licence";
import { read, useStored, write } from "./storage";
import { SERVEUR_URL } from "./site";

/**
 * Dictionnaire littéraire : le site public ne contient que la liste des mots.
 * Sans clé, on peut en consulter 10 (demandés un par un au serveur puis gardés sur l'appareil) ;
 * avec une clé, le dictionnaire complet arrive avec le contenu payant.
 */
export const DICO_GRATUITS = 10;
const CLE = "dico-consultes";

type Consultes = Record<string, EntreeDico>;
export const useConsultes = () => useStored<Consultes>(CLE, {})[0];
export const dicoComplet = (): EntreeDico[] | null => licence()?.contenu.dictionnaire ?? null;

export type EchecConsultation = "limite" | "hors-ligne" | "erreur";

export async function consulter(mot: string): Promise<EntreeDico | EchecConsultation> {
  const vus = read<Consultes>(CLE, {});
  if (vus[mot]) return vus[mot];
  if (!licence() && Object.keys(vus).length >= DICO_GRATUITS) return "limite";
  if (!navigator.onLine || !SERVEUR_URL) return "hors-ligne";
  try {
    const r = await fetch(`${SERVEUR_URL}/dictionnaire?mot=${encodeURIComponent(mot)}`);
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.entree) return "erreur";
    write(CLE, { ...vus, [mot]: d.entree });
    return d.entree as EntreeDico;
  } catch {
    return "erreur";
  }
}
