import type { Fonction, Oeuvre } from "../data/types";
import { OEUVRES, SUJETS } from "./data";
import { sujetsEntrainement, type SujetEntrainement } from "./entrainement";
import { contenuLibre } from "./libre";
import { normalize } from "./text";
import { jourLocal, marquer } from "./progres";
import { read, useStored, write } from "./storage";
import { noter } from "./stats";

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
  const sujets = sujetsEntrainement();
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
  const themes = new Set((SUJETS.find(x => x.num === num)?.themes ?? contenuLibre()?.entrainement?.find(e => e.id === num)?.themes ?? []).map(normalize));
  const fonctions = fonctionsDuSujet(num);
  return OEUVRES.filter(w => w.detaillee)
    .map(w => ({ w, score: w.themes.filter(t => themes.has(normalize(t))).length * 2 + w.fonctions.filter(f => fonctions.includes(f)).length + (w.niveaux?.length ? 0.5 : 0) }))
    .filter(x => x.score >= 3)
    .sort((a, b) => b.score - a.score || a.w.titre.localeCompare(b.w.titre, "fr"))
    .slice(0, combien)
    .map(x => x.w);
}
