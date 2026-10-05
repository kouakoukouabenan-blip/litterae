import type { BlocLecon } from "../data/types";
import { licence } from "./licence";
import { read, useStored, write } from "./storage";
import { SERVEUR_URL } from "./site";

/**
 * Leçons sans clé : le site public n'a que leur titre. L'élève en lit 5 de son choix
 * (demandées une à une au serveur puis gardées sur l'appareil), comme les fiches d'œuvres ;
 * avec une clé, toutes les leçons arrivent avec le contenu payant.
 */
export const LECONS_GRATUITES = 5;
const CLE = "lecons-ouvertes";

type Ouvertes = Record<string, BlocLecon[]>;

export const leconsOuvertes = () => read<Ouvertes>(CLE, {});
export const useLeconsOuvertes = () => useStored<Ouvertes>(CLE, {})[0];

export type EchecLecon = "limite" | "hors-ligne" | "trop" | "erreur";

/** Ouvre une leçon gratuite : elle compte dans les 5 dès que son texte arrive sur l'appareil. */
export async function ouvrirLecon(id: string): Promise<BlocLecon[] | EchecLecon> {
  const vues = leconsOuvertes();
  if (vues[id]) return vues[id];
  if (!licence() && Object.keys(vues).length >= LECONS_GRATUITES) return "limite";
  if (!navigator.onLine || !SERVEUR_URL) return "hors-ligne";
  try {
    const r = await fetch(`${SERVEUR_URL}/lecon?id=${encodeURIComponent(id)}`);
    const d = await r.json().catch(() => null);
    if (r.status === 429) return "trop";
    if (!r.ok || !Array.isArray(d?.blocs)) return "erreur";
    write(CLE, { ...leconsOuvertes(), [id]: d.blocs });
    return d.blocs as BlocLecon[];
  } catch {
    return "erreur";
  }
}

/** Accès aux leçons : complet avec une clé, sinon les leçons déjà ouvertes et celles qui restent à choisir. */
export function useAccesLecons() {
  const premium = !!licence();
  const ouvertes = useLeconsOuvertes();
  const nbOuvertes = Object.keys(ouvertes).length;
  const restantes = premium ? Infinity : Math.max(0, LECONS_GRATUITES - nbOuvertes);
  return {
    premium,
    ouvertes,
    nbOuvertes,
    restantes,
    ouverte: (id: string) => !premium && !!ouvertes[id],
    peutLire: (id: string) => premium || !!ouvertes[id] || restantes > 0
  };
}
