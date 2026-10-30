import { read, useStored, write } from "./storage";

// Progression de la formation, gardée sur le téléphone (comme l'atelier).
// Règles du jeu : 100 points au départ ; bonne réponse du premier coup +10, au deuxième essai +5 ;
// erreur −5 ; indice −3 ; défi rédigé +15 (une fois par étape). Une étape est réussie à 70 % de maîtrise
// et ouvre la suivante. À 0 point, la série s'arrête : l'élève reprend l'étape avec 30 points.

export const POINTS_DEPART = 100;
export const POINTS_REPRISE = 30;
export const GAIN_PREMIER = 10;
export const GAIN_SECOND = 5;
export const PERTE_ERREUR = 5;
export const COUT_INDICE = 3;
export const GAIN_DEFI = 15;
export const SEUIL = 70;

export interface EtatEtape {
  /** Meilleure maîtrise obtenue, en %. */
  maitrise: number;
  reussie: boolean;
  /** Le défi a été rédigé et vérifié avec la grille. */
  defi?: boolean;
}
export interface EtatFormation {
  points: number;
  etapes: Record<string, EtatEtape>;
  /** L'élève a lu l'écran d'entrée et commencé. */
  commencee: boolean;
}

const CLE = "formation";
const VIDE: EtatFormation = { points: POINTS_DEPART, etapes: {}, commencee: false };

export const etatFormation = () => read<EtatFormation>(CLE, VIDE);
export const useFormation = () => useStored<EtatFormation>(CLE, VIDE);

function modifier(fn: (e: EtatFormation) => EtatFormation) {
  write(CLE, fn(etatFormation()));
}

export const commencerFormation = () => modifier(e => ({ ...e, commencee: true }));

/** Ajoute (ou retire) des points ; jamais sous 0. Renvoie le nouveau total. */
export function ajouterPoints(n: number): number {
  let total = 0;
  modifier(e => { total = Math.max(0, e.points + n); return { ...e, points: total }; });
  return total;
}

export const reprendreAvecPoints = () => modifier(e => ({ ...e, points: Math.max(e.points, POINTS_REPRISE) }));

/** Enregistre la fin d'une série ; la meilleure maîtrise est gardée. */
export function finirSerie(id: string, maitrise: number) {
  modifier(e => {
    const avant = e.etapes[id];
    const meilleure = Math.max(avant?.maitrise ?? 0, maitrise);
    return { ...e, etapes: { ...e.etapes, [id]: { ...avant, maitrise: meilleure, reussie: meilleure >= SEUIL } } };
  });
}

/** Défi rédigé : les points ne sont donnés qu'une fois par étape. */
export function validerDefi(id: string): boolean {
  const deja = !!etatFormation().etapes[id]?.defi;
  if (!deja) modifier(e => ({ ...e, points: e.points + GAIN_DEFI, etapes: { ...e.etapes, [id]: { ...e.etapes[id], defi: true } } }));
  return !deja;
}

/** Rang selon le nombre d'étapes réussies. */
export function rang(reussies: number): string {
  if (reussies >= 13) return "Bachelier";
  if (reussies >= 9) return "Rédacteur";
  if (reussies >= 6) return "Argumentateur";
  if (reussies >= 2) return "Lecteur";
  return "Apprenti";
}
