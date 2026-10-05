import { read, useStored, write } from "./storage";
import { noter } from "./stats";

/**
 * Activité de l'élève, jour par jour, gardée seulement sur son téléphone :
 * série de jours d'affilée, objectif du jour et bilan de la semaine.
 * Chaque action utile (ouvrir une fiche, réviser une carte, relever le défi…) compte une fois par jour.
 */
export const OBJECTIF_DU_JOUR = 3;
const CLE = "activite";
const JOURS_GARDES = 120;

type Activite = Record<string, string[]>;

/** Date du téléphone, au format 2026-10-05 (heure locale de l'élève). */
export function jourLocal(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const decaler = (jour: string, n: number) => {
  const [a, m, j] = jour.split("-").map(Number);
  return jourLocal(new Date(a, m - 1, j + n, 12).getTime());
};

export const activite = () => read<Activite>(CLE, {});
export const useActivite = () => useStored<Activite>(CLE, {})[0];

/** Note une action du jour (« oeuvre:id », « defi », « revision:mot:x »…). Une même action ne compte qu'une fois par jour. */
export function marquer(action: string) {
  const a = activite();
  const j = jourLocal();
  const faites = a[j] ?? [];
  if (faites.includes(action)) return;
  const nouvelle: Activite = { ...a, [j]: [...faites, action] };
  // Au-delà de 4 mois, l'historique ne sert plus.
  const limite = decaler(j, -JOURS_GARDES);
  for (const k of Object.keys(nouvelle)) if (k < limite) delete nouvelle[k];
  write(CLE, nouvelle);
  if (faites.length + 1 === OBJECTIF_DU_JOUR) noter({ t: "progres", ref: "objectif" });
  // Série qui franchit un palier : seulement le total pour le tableau de bord.
  if (!faites.length) {
    const s = bilan(nouvelle).serie;
    if ([3, 7, 14, 30].includes(s)) noter({ t: "progres", ref: `serie:${s}` });
  }
}

export interface Bilan {
  /** Jours d'affilée avec au moins une action, jusqu'à aujourd'hui (ou hier si l'élève n'est pas encore venu aujourd'hui). */
  serie: number;
  record: number;
  actifAujourdhui: boolean;
  faitesAujourdhui: number;
  /** Lundi → dimanche de la semaine en cours : nombre d'actions par jour (null = jour pas encore arrivé). */
  semaine: (number | null)[];
  joursActifs: number;
  objectifsAtteints: number;
  joursActifsAvant: number;
  defis: number;
  revisions: number;
  lectures: number;
}

export function bilan(a: Activite = activite(), maintenant = Date.now()): Bilan {
  const auj = jourLocal(maintenant);
  const n = (j: string) => a[j]?.length ?? 0;
  let serie = 0;
  let j = n(auj) ? auj : decaler(auj, -1);
  while (n(j)) { serie++; j = decaler(j, -1); }
  // Record : plus longue suite de jours actifs dans l'historique gardé.
  let record = 0, suite = 0, prec = "";
  for (const k of Object.keys(a).filter(k => n(k)).sort()) {
    suite = prec && decaler(prec, 1) === k ? suite + 1 : 1;
    record = Math.max(record, suite);
    prec = k;
  }
  const d = new Date(maintenant);
  const lundi = decaler(auj, -((d.getDay() + 6) % 7));
  const jours = Array.from({ length: 7 }, (_, i) => decaler(lundi, i));
  const semaine = jours.map(k => (k > auj ? null : n(k)));
  const actions = jours.flatMap(k => a[k] ?? []);
  return {
    serie, record: Math.max(record, serie), actifAujourdhui: n(auj) > 0, faitesAujourdhui: n(auj), semaine,
    joursActifs: semaine.filter(x => x).length,
    objectifsAtteints: semaine.filter(x => (x ?? 0) >= OBJECTIF_DU_JOUR).length,
    joursActifsAvant: jours.map(k => decaler(k, -7)).filter(k => n(k)).length,
    defis: actions.filter(x => x === "defi").length,
    revisions: actions.filter(x => x.startsWith("revision:")).length,
    lectures: actions.filter(x => /^(oeuvre|lecon|sujet|mot):/.test(x)).length
  };
}

export const useBilan = () => bilan(useActivite());
