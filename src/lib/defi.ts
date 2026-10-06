import type { Fonction, Oeuvre } from "../data/types";
import { OEUVRES, SUJETS } from "./data";
import { sujetsEntrainement, type SujetEntrainement } from "./entrainement";
import { contenuLibre } from "./libre";
import { normalize } from "./text";
import { jourLocal, marquer } from "./progres";
import { read, useStored, write } from "./storage";
import { noter } from "./stats";
import { buildIndex, search, EMPTY_FILTERS, type Indexed } from "./search";
import { jetons, memeMot } from "./flou";

/**
 * Défi du jour : un sujet type bac, le même pour tous les élèves ce jour-là,
 * 5 minutes pour trouver deux arguments et deux œuvres, puis comparaison avec le corrigé.
 */
export const DUREE_DEFI = 5 * 60;
const CLE = "defis";

export interface ReponseDefi { num: string; args: string[]; oeuvres: string[]; fini: boolean }
type Defis = Record<string, ReponseDefi>;

const numeroDuJour = (jour: string) => Math.floor(Date.parse(jour + "T00:00:00Z") / 864e5);

/** Sujet du jour : on parcourt tous les sujets, un par jour, dans un ordre mélangé (pas 01, 02, 03…). */
export function sujetDuJour(jour = jourLocal()): SujetEntrainement {
  // Pas les sujets de devoir de l'élève : le défi est le même pour tous ce jour-là.
  const sujets = sujetsEntrainement().filter(s => !s.perso);
  const n = numeroDuJour(jour);
  return sujets[(n * 7) % sujets.length];
}

export const useDefis = () => useStored<Defis>(CLE, {});
export const defiFaitAujourdhui = () => !!read<Defis>(CLE, {})[jourLocal()]?.fini;

export function enregistrerDefi(r: ReponseDefi) {
  const defis = read<Defis>(CLE, {});
  const jour = jourLocal();
  const deja = defis[jour]?.fini;
  write(CLE, { ...defis, [jour]: r });
  if (r.fini && !deja) {
    marquer("defi");
    noter({ t: "progres", ref: "defi" });
  }
}

const FONCTION: Record<string, Fonction> = { engagement: "Engagement", social: "Sociale", sociale: "Sociale", esthetique: "Esthétique", evasion: "Évasion", lyrique: "Lyrique" };
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Fonctions littéraires d'un sujet, d'après son orientation (« Social / Engagement »). */
export const fonctionsDuSujet = (num: string): Fonction[] => {
  // Sujet ajouté depuis le tableau de bord : fonctions cochées par l'éditeur.
  const ajoute = contenuLibre()?.entrainement?.find(e => e.id === num);
  if (ajoute) return ajoute.fonctions ?? [];
  const o = SUJETS.find(s => s.num === num)?.orientation ?? "";
  return [...new Set(o.split(/[\/,]/).map(x => FONCTION[sansAccent(x.trim())]).filter(Boolean))];
};

/** Œuvres qui peuvent illustrer un sujet : thèmes du sujet et fonction littéraire attendue. */
export function oeuvresPourSujet(num: string, combien = 4): Oeuvre[] {
  const themes = SUJETS.find(x => x.num === num)?.themes ?? contenuLibre()?.entrainement?.find(e => e.id === num)?.themes ?? [];
  return oeuvresPour(themes, fonctionsDuSujet(num), combien);
}

/** Œuvres qui partagent des thèmes et la fonction littéraire attendue (fiches complètes seulement). */
export function oeuvresPour(themesSujet: string[], fonctions: Fonction[], combien = 4, minimum = 3, genres: string[] = [], args: string[] = []): Oeuvre[] {
  const themes = new Set(themesSujet.map(normalize));
  // Un sujet qui nomme un genre (« le poète », « le roman ») : seulement des œuvres de ce genre.
  return OEUVRES.filter(w => w.detaillee && (!genres.length || genres.includes(w.genre)))
    .map(w => ({ w, score: w.themes.filter(t => themes.has(normalize(t))).length * 2 + w.fonctions.filter(f => fonctions.includes(f)).length + (w.niveaux?.length ? 0.5 : 0) }))
    .filter(x => x.score >= minimum)
    // Celles dont la fiche illustre les arguments que le sujet annonce passent d'abord.
    .map(x => ({ ...x, rang: x.score + new Set(x.w.idees.filter(i => args.includes(i.argument)).map(i => i.argument)).size }))
    .sort((a, b) => b.rang - a.rang || a.w.titre.localeCompare(b.w.titre, "fr"))
    .slice(0, combien)
    .map(x => x.w);
}

let INDEX: Indexed[] | null = null;
/** Œuvre de la base que l'élève a tapée (« les soleil des independance » → Les Soleils des indépendances), si on la reconnaît sans doute. */
export function oeuvreTapee(t: string): Oeuvre | null {
  if (t.trim().length < 3) return null;
  INDEX ??= buildIndex(OEUVRES);
  const w = search(INDEX, t, EMPTY_FILTERS)[0];
  if (!w) return null;
  const mots = jetons(t).filter(j => !j.colle && j.cle.length >= 3).map(j => j.cle);
  const ref = jetons(`${w.titre} ${w.auteur}`).map(j => j.cle);
  const reconnus = mots.filter(m => ref.some(r => memeMot(m, r))).length;
  return mots.length && reconnus / mots.length >= 0.5 ? w : null;
}

export interface Verification { tape: string; oeuvre: Oeuvre; va: boolean; mieux?: Oeuvre }

/**
 * Les œuvres citées dans le défi vont-elles avec la fonction du sujet ? Une œuvre dont aucune des deux
 * fonctions principales n'est celle du sujet est signalée, avec une œuvre qui irait mieux.
 */
export function verifierOeuvres(r: ReponseDefi): Verification[] {
  const fonctions = fonctionsDuSujet(r.num);
  if (!fonctions.length) return [];
  const conseillees = oeuvresPourSujet(r.num, 6);
  const out: Verification[] = [];
  for (const tape of r.oeuvres) {
    const w = oeuvreTapee(tape);
    if (!w || out.some(v => v.oeuvre.id === w.id)) continue;
    const va = w.fonctions.slice(0, 2).some(f => fonctions.includes(f));
    const mieux = va ? undefined : conseillees.find(c => c.id !== w.id && !out.some(v => v.mieux?.id === c.id));
    out.push({ tape, oeuvre: w, va, mieux });
  }
  return out;
}
