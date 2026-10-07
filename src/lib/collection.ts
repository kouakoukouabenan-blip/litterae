import type { Oeuvre } from "../data/types";
import { OEUVRES, SUJETS, oeuvre } from "./data";
import { historique } from "./historique";
import { fichesOuvertes } from "./fiches";
import { activite, bilan } from "./progres";
import { nbCartes } from "./revisions";
import { avancement, lireBrouillon } from "./atelier";
import { cles, read, write } from "./storage";

/**
 * Collection de l'élève, gardée sur son téléphone : les auteurs débloqués en lisant leurs fiches,
 * les badges gagnés et les surprises ouvertes. Rien n'est envoyé au serveur.
 */

const LUES = "oeuvres-lues";
const AUTEURS = "auteurs-debloques";
type Auteurs = Record<string, { d: number; bonus?: boolean }>;

export const oeuvresLues = () => read<string[]>(LUES, []);
export const auteursDebloques = () => read<Auteurs>(AUTEURS, {});
export const TOUS_LES_AUTEURS = [...new Set(OEUVRES.map(w => w.auteur))].sort((a, b) => a.localeCompare(b, "fr"));

/** Auteur ajouté à la collection ; vrai s'il ne l'était pas encore. */
export function debloquerAuteur(nom: string, bonus = false) {
  const a = auteursDebloques();
  if (a[nom]) return false;
  write(AUTEURS, { ...a, [nom]: { d: Date.now(), ...(bonus ? { bonus } : {}) } });
  return true;
}

/** Fiche lue : elle compte pour les badges et débloque la carte de son auteur. */
export function noterLecture(w: Oeuvre) {
  const lues = oeuvresLues();
  if (!lues.includes(w.id)) write(LUES, [w.id, ...lues]);
  debloquerAuteur(w.auteur);
}

/** Première ouverture du fil : ce que l'élève a déjà lu remplit sa collection. */
export function initialiserCollection() {
  if (read<boolean>("collection-prete", false)) return;
  const ids = new Set([...historique().filter(v => v.t === "oeuvre").map(v => v.id), ...Object.keys(fichesOuvertes()), ...read<string[]>("oeuvres-enregistrees", [])]);
  const lues = oeuvresLues();
  const a = auteursDebloques();
  for (const id of ids) {
    const w = oeuvre(id);
    if (!w) continue;
    if (!lues.includes(id)) lues.push(id);
    a[w.auteur] ??= { d: Date.now() - 864e5 };
  }
  write(LUES, lues);
  write(AUTEURS, a);
  // Les actions passées donnent droit à une seule surprise pour commencer, pas à une pile.
  write(SURPRISES, { ouvertes: Math.max(0, Math.floor(totalActions() / ACTIONS_PAR_SURPRISE) - 1), liste: [] });
  write("collection-prete", true);
}

export interface CarteAuteur { nom: string; pays: string; oeuvres: Oeuvre[]; lues: number; bonus: boolean }
export function carteAuteur(nom: string): CarteAuteur {
  const oeuvres = OEUVRES.filter(w => w.auteur === nom);
  const lues = new Set(oeuvresLues());
  return { nom, pays: oeuvres.find(w => w.paysTexte)?.paysTexte ?? "", oeuvres, lues: oeuvres.filter(w => lues.has(w.id)).length, bonus: !!auteursDebloques()[nom]?.bonus };
}

/* ---------- Questions éclair : bonnes réponses d'affilée ---------- */

const ECLAIR = "eclair";
export const eclair = () => read<{ serie: number; record: number }>(ECLAIR, { serie: 0, record: 0 });
export function repondreEclair(juste: boolean) {
  const e = eclair();
  const serie = juste ? e.serie + 1 : 0;
  write(ECLAIR, { serie, record: Math.max(e.record, serie) });
  return serie;
}

/* ---------- Badges ---------- */

export interface Badge { id: string; nom: string; texte: string; objectif: number; valeur: number; reste: (n: number) => string }

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export function badges(): Badge[] {
  const lues = oeuvresLues().map(id => oeuvre(id)).filter((w): w is Oeuvre => !!w);
  const pays = new Set(lues.flatMap(w => w.pays ?? []));
  const finis = cles("atelier:").filter(k => { const b = lireBrouillon(k.slice(8)); return b && avancement(b) >= 100; }).length;
  const defis = Object.values(activite()).filter(j => j.includes("defi")).length;
  return [
    { id: "lecteur", nom: "Lecteur", texte: "10 fiches lues", objectif: 10, valeur: lues.length, reste: n => `Plus que ${pluriel(n, "fiche", "fiches")} pour le badge Lecteur` },
    { id: "explorateur", nom: "Explorateur", texte: "Des œuvres de 5 pays", objectif: 5, valeur: pays.size, reste: n => `Lis une œuvre d'un autre pays : plus que ${n} pour le badge Explorateur` },
    { id: "collectionneur", nom: "Collectionneur", texte: "25 auteurs dans ta collection", objectif: 25, valeur: Object.keys(auteursDebloques()).length, reste: n => `Plus que ${pluriel(n, "auteur", "auteurs")} pour le badge Collectionneur` },
    { id: "eclair", nom: "Éclair", texte: "10 bonnes réponses d'affilée", objectif: 10, valeur: eclair().record, reste: n => `Encore ${pluriel(n, "bonne réponse", "bonnes réponses")} d'affilée pour le badge Éclair` },
    { id: "releve", nom: "Relève", texte: "5 défis du jour relevés", objectif: 5, valeur: defis, reste: n => `Plus que ${pluriel(n, "défi", "défis")} pour le badge Relève` },
    { id: "memoire", nom: "Mémoire", texte: "20 cartes retenues en révision", objectif: 20, valeur: nbCartes().sues, reste: n => `Plus que ${pluriel(n, "carte", "cartes")} à retenir pour le badge Mémoire` },
    { id: "fidele", nom: "Fidèle", texte: "7 jours d'affilée", objectif: 7, valeur: bilan().record, reste: n => `Plus que ${pluriel(n, "jour", "jours")} d'affilée pour le badge Fidèle` },
    { id: "plume", nom: "Plume", texte: "Un sujet terminé dans l'atelier", objectif: 1, valeur: finis, reste: () => "Termine un sujet dans l'atelier pour le badge Plume" }
  ];
}

const BADGES_VUS = "badges-vus";
export const badgeGagne = (b: Badge) => b.valeur >= b.objectif;
export const nouveauxBadges = () => { const vus = read<string[]>(BADGES_VUS, []); return badges().filter(b => badgeGagne(b) && !vus.includes(b.id)); };
export const badgeVu = (id: string) => { const vus = read<string[]>(BADGES_VUS, []); if (!vus.includes(id)) write(BADGES_VUS, [...vus, id]); };

/** Badge le plus proche d'être gagné (au moins à moitié), pour donner envie de finir. */
export function badgeProche(): Badge | null {
  return badges().filter(b => !badgeGagne(b) && b.valeur / b.objectif >= 0.5).sort((a, b) => (a.objectif - a.valeur) - (b.objectif - b.valeur))[0] ?? null;
}

/* ---------- Surprises : une toutes les trois actions ---------- */

const SURPRISES = "surprises";
const ACTIONS_PAR_SURPRISE = 3;
export type Surprise = { t: "auteur"; nom: string } | { t: "citation"; citation: string; auteur: string; num: string };
type EtatSurprises = { ouvertes: number; liste: (Surprise & { d: number })[] };

const totalActions = () => Object.values(activite()).reduce((n, j) => n + j.length, 0);
const etatSurprises = () => read<EtatSurprises>(SURPRISES, { ouvertes: 0, liste: [] });
export const surpriseDispo = () => Math.floor(totalActions() / ACTIONS_PAR_SURPRISE) > etatSurprises().ouvertes;
/** Actions qui restent avant la prochaine surprise. */
export const avantSurprise = () => ACTIONS_PAR_SURPRISE - (totalActions() % ACTIONS_PAR_SURPRISE);
export const surprisesOuvertes = () => etatSurprises().liste;

/** Ouvre la surprise : un auteur bonus pas encore dans la collection, ou une citation célèbre de sujet. */
export function ouvrirSurprise(): Surprise {
  const e = etatSurprises();
  const g = (Date.now() / 1000) >>> 0;
  const deja = auteursDebloques();
  const libres = TOUS_LES_AUTEURS.filter(a => !deja[a]);
  let s: Surprise;
  if (libres.length && g % 2 === 0) {
    s = { t: "auteur", nom: libres[g % libres.length] };
    debloquerAuteur(s.nom, true);
  } else {
    const c = SUJETS[g % SUJETS.length];
    s = { t: "citation", citation: c.citation, auteur: c.auteur, num: c.num };
  }
  write(SURPRISES, { ouvertes: e.ouvertes + 1, liste: [{ ...s, d: Date.now() }, ...e.liste].slice(0, 100) });
  return s;
}
