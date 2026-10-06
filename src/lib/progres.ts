import { read, useStored, write } from "./storage";
import { noter } from "./stats";

/**
 * Activité de l'élève, jour par jour, gardée seulement sur son téléphone :
 * série de jours d'affilée, objectif du jour et bilan de la semaine.
 * Chaque action utile (ouvrir une fiche, réviser une carte, relever le défi…) compte une fois par jour.
 */
export const OBJECTIF_DU_JOUR = 3;
/** Tous les 7 jours d'affilée, l'élève sans clé gagne une fiche d'œuvre gratuite en plus (voir fiches.ts). */
export const PALIER_RECOMPENSE = 7;
const CLE = "activite";
const HEURES = "heures-activite";
const RECOMPENSES = "fiches-bonus";
const RECOMPENSE_A_VOIR = "recompense-a-voir";
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
  if (!faites.length) noterHeure();
  // Série qui franchit un palier : seulement le total pour le tableau de bord.
  if (!faites.length) {
    const s = bilan(nouvelle).serie;
    if ([3, 7, 14, 30].includes(s)) noter({ t: "progres", ref: `serie:${s}` });
    if (s > 0 && s % PALIER_RECOMPENSE === 0) recompenser(j, s);
  }
}

// ---- Heure habituelle : le rappel part à l'heure où l'élève vient d'habitude ----

/** Heure (UTC, heure d'Abidjan) de la première action de chaque jour, sur les 14 derniers jours actifs. */
function noterHeure(t = Date.now()) {
  write(HEURES, [new Date(t).getUTCHours(), ...read<number[]>(HEURES, [])].slice(0, 14));
}

/**
 * L'heure la plus fréquente parmi les dernières venues (la plus récente en cas d'égalité), entre 7 h et 21 h.
 * Moins de 3 venues : on ne sait pas encore, le serveur garde 18 h.
 */
export function heureHabituelle(heures = read<number[]>(HEURES, [])): number | null {
  if (heures.length < 3) return null;
  const n = new Map<number, number>();
  for (const h of heures) n.set(h, (n.get(h) ?? 0) + 1);
  const meilleure = heures.reduce((m, h) => ((n.get(h) ?? 0) > (n.get(m) ?? 0) ? h : m), heures[0]);
  return Math.min(21, Math.max(7, meilleure));
}

// ---- Récompense de série : une fiche gratuite en plus tous les 7 jours d'affilée ----

/** Paliers déjà gagnés (« 2026-10-06:7 ») : une même série ne rapporte qu'une fois par palier. */
export const fichesBonus = () => read<string[]>(RECOMPENSES, []).length;

function recompenser(jour: string, serie: number) {
  const gagnes = read<string[]>(RECOMPENSES, []);
  const cle = `${jour}:${serie}`;
  if (gagnes.includes(cle)) return;
  write(RECOMPENSES, [...gagnes, cle]);
  write(RECOMPENSE_A_VOIR, { jour, serie });
  noter({ t: "progres", ref: "recompense" });
}

/** Récompense pas encore vue par l'élève (affichée en tête de l'accueil), valable 3 jours. */
export function recompenseAVoir(): { jour: string; serie: number } | null {
  const r = read<{ jour: string; serie: number } | null>(RECOMPENSE_A_VOIR, null);
  return r && r.jour >= decaler(jourLocal(), -3) ? r : null;
}
export const recompenseVue = () => write(RECOMPENSE_A_VOIR, null);

export interface Bilan {
  /** Jours d'affilée avec au moins une action, jusqu'à aujourd'hui (ou hier si l'élève n'est pas encore venu aujourd'hui). */
  serie: number;
  /** Jours manqués pardonnés dans la série (un par semaine au plus) : la flamme ne s'éteint pas. */
  protegees: string[];
  /** La protection de cette semaine n'a pas encore servi. */
  protectionDispo: boolean;
  record: number;
  actifAujourdhui: boolean;
  faitesAujourdhui: number;
  /** Lundi → dimanche de la semaine en cours : nombre d'actions par jour (null = jour pas encore arrivé). */
  semaine: (number | null)[];
  /** Dates (2026-10-06) des jours de la semaine en cours, du lundi au dimanche. */
  jours: string[];
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
  // Semaine (du lundi) d'un jour : un seul jour manqué pardonné par semaine.
  const lundiDe = (k: string) => { const [y, m, dd] = k.split("-").map(Number); return decaler(k, -((new Date(y, m - 1, dd, 12).getDay() + 6) % 7)); };
  let serie = 0;
  const protegees: string[] = [];
  let j = n(auj) ? auj : decaler(auj, -1);
  for (;;) {
    if (n(j)) { serie++; j = decaler(j, -1); continue; }
    // Jour manqué entre deux jours actifs : pardonné si la semaine n'a pas déjà eu le sien.
    const avant = decaler(j, -1);
    if (n(avant) && !protegees.some(p => lundiDe(p) === lundiDe(j))) { protegees.push(j); j = avant; continue; }
    break;
  }
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
    serie, protegees, protectionDispo: !protegees.some(p => p >= lundi), jours,
    record: Math.max(record, serie), actifAujourdhui: n(auj) > 0, faitesAujourdhui: n(auj), semaine,
    joursActifs: semaine.filter(x => x).length,
    objectifsAtteints: semaine.filter(x => (x ?? 0) >= OBJECTIF_DU_JOUR).length,
    joursActifsAvant: jours.map(k => decaler(k, -7)).filter(k => n(k)).length,
    defis: actions.filter(x => x === "defi").length,
    revisions: actions.filter(x => x.startsWith("revision:")).length,
    lectures: actions.filter(x => /^(oeuvre|lecon|sujet|mot):/.test(x)).length
  };
}

export const useBilan = () => bilan(useActivite());
