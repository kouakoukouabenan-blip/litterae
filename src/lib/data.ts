import oeuvres from "../data/oeuvres.json";
import sujets from "../data/sujets.json";
import dico from "../data/dictionnaire.json";
import type { ContenuPayant, Oeuvre, Sujet, SujetApercu } from "../data/types";
import { licence } from "./licence";
import { contenuLibre } from "./libre";
import { fichesOuvertes } from "./fiches";

// Données publiques (partie gratuite), complétées par le contenu payant si une clé a été validée.
const payant = licence()?.contenu;
// Corrections et fiches ajoutées depuis le tableau de bord.
const libre = contenuLibre();
// Fiches gratuites que l'élève a déjà ouvertes (10 au choix) : leur texte est gardé sur l'appareil.
const ouvertes = fichesOuvertes();

const ajoutees = (libre?.ajouts?.oeuvres ?? []).filter(w => w?.id && w.titre);

/** Texte de la fiche quand l'élève y a accès : contenu payant, sinon fiche gratuite déjà ouverte. */
const avecTexte = (w: Oeuvre): Oeuvre => {
  const p = payant?.oeuvres[w.id] ?? ouvertes[w.id];
  return p ? { ...w, resume: p.resume, idees: p.idees, exemple: p.exemple ?? w.exemple ?? null, libre: false } : { ...w, libre: false };
};

export const OEUVRES: Oeuvre[] = [
  ...(oeuvres as Oeuvre[]).map(o => avecTexte({ ...o, ...libre?.corrections?.[o.id] })),
  // Fiches ajoutées depuis le tableau de bord, classées avec les autres par titre.
  ...ajoutees.map(avecTexte)
].sort((a, b) => a.titre.localeCompare(b.titre, "fr"));

export const SUJETS: (Sujet | SujetApercu)[] = (sujets as (Sujet | SujetApercu)[]).map(
  s => payant?.sujets.find(p => p.num === s.num) ?? s
);

export const estComplet = (s: Sujet | SujetApercu): s is Sujet => "intro" in s;

/**
 * Le contenu payant gardé sur l'appareil est plus ancien que le site : un sujet, une œuvre
 * ou des mots du dictionnaire publiés depuis la validation de la clé n'y figurent pas.
 */
export const contenuEnRetard = (c: ContenuPayant) =>
  (sujets as (Sujet | SujetApercu)[]).some(s => !estComplet(s) && !c.sujets.some(p => p.num === s.num)) ||
  (c.dictionnaire?.length ?? 0) < dico.entrees.length ||
  (oeuvres as Oeuvre[]).some(w => w.resume === null && !(w.id in c.oeuvres));

/** Nombre de fiches avec résumé complet et idées d'illustration rédigées. */
export const NB_DETAILLEES = OEUVRES.filter(w => w.detaillee).length;

const byId = new Map(OEUVRES.map(w => [w.id, w]));
export const oeuvre = (id: string) => byId.get(id);

/** Référence prête à coller dans une copie : titre, auteur, pays. */
export const reference = (w: Oeuvre) => `${w.titre}, ${w.auteur}${w.paysTexte ? ` (${w.paysTexte})` : ""}`;

/** Sans accents ni ponctuation, casse conservée : un titre cité commence par une majuscule. */
const fold = (s: string) => ` ${s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, " ").trim()} `;

/**
 * Œuvres citées dans les exemples d'un sujet corrigé : le titre (avec sa majuscule) et le nom
 * de l'auteur doivent figurer dans le même exemple. Cela écarte « des poèmes » ou « l'œuvre ».
 */
function cited(text: string): Oeuvre[] {
  const raw = fold(text), low = raw.toLowerCase();
  return OEUVRES.filter(w => {
    const titre = fold(w.titre).toLowerCase();
    const nom = fold(w.auteur).toLowerCase().trim().split(" ").pop()!;
    let i = low.indexOf(titre);
    while (i > -1 && raw[i + 1] === low[i + 1]) i = low.indexOf(titre, i + 1);
    return i > -1 && low.includes(` ${nom} `);
  });
}

const citations = new Map<string, Oeuvre[]>();
for (const s of SUJETS) {
  if (!estComplet(s)) continue;
  const found = new Map<string, Oeuvre>();
  for (const a of [...s.axe1.args, ...s.axe2.args]) for (const w of cited(a.ex)) found.set(w.id, w);
  citations.set(s.num, [...found.values()]);
}

export const oeuvresCitees = (s: Sujet | SujetApercu) => citations.get(s.num) ?? [];
export const sujetsCitant = (id: string) => SUJETS.filter(s => citations.get(s.num)?.some(w => w.id === id));
