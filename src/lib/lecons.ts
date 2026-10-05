import { LECONS as LECONS_GUIDE } from "../data/lecons";
import type { Lecon } from "../data/types";
import { contenuLibre } from "./libre";
import { licence } from "./licence";
import { leconsOuvertes } from "./lecons-libres";

/**
 * Leçons du guide (éventuellement modifiées), suivies de celles ajoutées depuis le tableau de bord.
 * Le site public n'a que leurs titres : le texte vient du contenu payant, ou des leçons
 * gratuites déjà ouvertes sur l'appareil (5 au choix).
 */
const payant = licence()?.contenu.lecons;
const ouvertes = leconsOuvertes();
const texte = (id: string) => payant?.[id] ?? ouvertes[id] ?? [];

export const LECONS: Lecon[] = [
  // Leçons du guide, avec les modifications faites depuis le tableau de bord.
  ...LECONS_GUIDE.map(l => {
    const m = contenuLibre()?.lecons?.[l.id];
    return { id: l.id, titre: m?.titre ?? l.titre, duree: m?.duree ?? l.duree, blocs: texte(l.id) };
  }),
  ...(contenuLibre()?.ajouts?.lecons ?? []).filter(l => l?.id && l.titre).map(l => ({
    id: l.id,
    titre: l.titre,
    duree: l.duree,
    blocs: texte(l.id)
  }))
];
