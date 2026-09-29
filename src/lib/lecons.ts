import { LECONS as LECONS_GUIDE } from "../data/lecons";
import type { Lecon } from "../data/types";
import { contenuLibre } from "./libre";
import { licence } from "./licence";

/**
 * Leçons du guide, suivies de celles ajoutées depuis le tableau de bord.
 * Une leçon payante n'a son texte qu'une fois la clé d'accès validée.
 */
const payant = licence()?.contenu.lecons;

export const LECONS: Lecon[] = [
  ...LECONS_GUIDE,
  ...(contenuLibre()?.ajouts?.lecons ?? []).filter(l => l?.id && l.titre).map(l => ({
    id: l.id,
    titre: l.titre,
    duree: l.duree,
    blocs: l.libre ? l.blocs : payant?.[l.id] ?? [],
    payante: !l.libre
  }))
];
