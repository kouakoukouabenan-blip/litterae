import { LECONS as LECONS_GUIDE } from "../data/lecons";
import type { Lecon } from "../data/types";
import { contenuLibre } from "./libre";
import { licence } from "./licence";

/**
 * Leçons du guide (éventuellement modifiées), suivies de celles ajoutées depuis le tableau de bord.
 * Une leçon payante n'a son texte qu'une fois la clé d'accès validée.
 */
const payant = licence()?.contenu.lecons;

export const LECONS: Lecon[] = [
  // Leçons du guide, avec les modifications faites depuis le tableau de bord.
  ...LECONS_GUIDE.map(l => {
    const m = contenuLibre()?.lecons?.[l.id];
    if (!m) return l;
    return { id: l.id, titre: m.titre, duree: m.duree, blocs: m.libre ? m.blocs : payant?.[l.id] ?? [], payante: !m.libre };
  }),
  ...(contenuLibre()?.ajouts?.lecons ?? []).filter(l => l?.id && l.titre).map(l => ({
    id: l.id,
    titre: l.titre,
    duree: l.duree,
    blocs: l.libre ? l.blocs : payant?.[l.id] ?? [],
    payante: !l.libre
  }))
];
