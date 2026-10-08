import { FONCTIONS, type Fonction, type Oeuvre, type QuestionQuiz } from "../data/types";
import { OEUVRES, oeuvre } from "./data";
import { contenuLibre } from "./libre";
import { motsPublics } from "./dictionnaire";
import { historique } from "./historique";
import { cles } from "./storage";
import { sujetsEntrainement } from "./entrainement";
import { fonctionsDuSujet } from "./defi";
import { fichesGratuites, fichesOuvertes } from "./fiches";
import { licence } from "./licence";
import { jourLocal } from "./progres";
import { graine, melanger, questionOeuvre } from "./revisions";
import { read, write } from "./storage";
import { sansEtoiles } from "./text";
import { CATEGORIES, categorie, formules as toutesLesFormules, type Formule } from "./formules";
import { ARGUMENTS, PAR_FONCTION } from "./arguments";
import { decouvertes, prochaineAction, suggestions, type Suggestion } from "./suggestions";
import {
  auteursDebloques, badgeProche, initialiserCollection, nouveauxBadges, oeuvresLues, surpriseDispo, TOUS_LES_AUTEURS, type Badge
} from "./collection";

/**
 * Fil « Pour toi » : les suggestions personnelles, mêlées à des cartes à jouer tout de suite
 * (question éclair, citation à classer, mot de sujet, où va cette phrase), à lire (œuvre en 30 secondes, formule)
 * et à collectionner (auteurs, badges, surprises). Calculé sur le téléphone, différent chaque jour,
 * et fini : une fois tout vu, l'élève revient le lendemain.
 */
export type CarteFil = { cle: string; type: string } & (
  | { t: "suggestion"; s: Suggestion }
  | { t: "question"; w: Oeuvre; q: QuestionQuiz }
  | { t: "citation"; num: string; citation: string; auteur: string; bonne: Fonction; choix: Fonction[] }
  | { t: "oeuvre"; w: Oeuvre; extrait: string | null; ouvrable: boolean }
  | { t: "formule"; f: Formule }
  | { t: "placer"; f: Formule; choix: string[]; bonne: number }
  | { t: "mot"; mot: string; nature: string; bonne: Fonction; choix: Fonction[] }
  | { t: "badge"; badge: Badge; gagne: boolean }
  | { t: "auteur"; nom: string }
  | { t: "collection"; n: number; total: number }
  | { t: "surprise" }
  | { t: "duel" }
  | { t: "nouveau"; titre: string; detail: string; lien: string }
  | { t: "devine"; w: Oeuvre; indices: string[]; choix: Oeuvre[] }
  | { t: "these"; num: string; citation: string; auteur: string; fonction: Fonction; argument: string; argFonction: Fonction; partie: 1 | 2 }
  | { t: "vraifaux"; w: Oeuvre; phrase: string; vrai: boolean; correction: string }
  | { t: "plan"; num: string; citation: string; auteur: string; fonction: Fonction; plans: [string, string][]; bon: number; opposee: Fonction }
  | { t: "pays"; w: Oeuvre; pays: string; choix: string[] }
);

const JOUR = 864e5;
const premium = () => !!licence();

/** Fiche que l'élève peut ouvrir sans clé : déjà choisie, ou fiche gratuite restante. */
function ouvrable(id: string) {
  if (premium()) return true;
  const o = fichesOuvertes();
  return !!o[id] || Object.keys(o).length < fichesGratuites();
}

/** Choix mélangés pour une question sur la fonction : la bonne et deux qui ne vont pas. */
function choixFonctions(bonnes: Fonction[], g: number): { bonne: Fonction; choix: Fonction[] } | null {
  const bonne = bonnes[0];
  const fausses = FONCTIONS.filter(f => !bonnes.includes(f));
  if (!bonne || fausses.length < 2) return null;
  return { bonne, choix: melanger([bonne, ...melanger(fausses, g).slice(0, 2)], g + 1) };
}

/* ---------- Nouveautés publiées depuis le tableau de bord ---------- */

const VUES = "nouveautes";
/** Ce que l'éditeur a ajouté depuis la dernière visite (fiches, leçons, sujets) : « Nouveau » pendant une semaine. */
function nouveautes(maintenant: number): CarteFil[] {
  const libre = contenuLibre();
  const tout = [
    ...(libre?.ajouts?.oeuvres ?? []).map(w => ({ id: `o:${w.id}`, titre: `« ${w.titre} »`, detail: `Nouvelle fiche : ${w.auteur}`, lien: `#/oeuvres/${encodeURIComponent(w.id)}` })),
    ...(libre?.ajouts?.lecons ?? []).map(l => ({ id: `l:${l.id}`, titre: l.titre, detail: "Nouvelle leçon", lien: `#/cours/${l.id}` })),
    ...(libre?.entrainement ?? []).map(e => ({ id: `e:${e.id}`, titre: `« ${e.citation.length > 60 ? e.citation.slice(0, 58).trimEnd() + "…" : e.citation} »`, detail: "Nouveau sujet d'entraînement", lien: `#/entrainement/${e.id}` }))
  ];
  const vues = read<Record<string, number> | null>(VUES, null);
  // Première fois : tout ce qui existe déjà n'est pas « nouveau ».
  if (!vues) { write(VUES, Object.fromEntries(tout.map(x => [x.id, 0]))); return []; }
  let change = false;
  for (const x of tout) if (!(x.id in vues)) { vues[x.id] = maintenant; change = true; }
  if (change) write(VUES, vues);
  // Dès que l'élève l'a ouvert (depuis le fil ou ailleurs), ce n'est plus une nouveauté pour lui.
  const h = historique();
  const ouvert = (id: string) => {
    const [t, v] = [id.slice(0, 1), id.slice(2)];
    return t === "o" ? h.some(x => x.t === "oeuvre" && x.id === v) : t === "l" ? h.some(x => x.t === "lecon" && x.id === v) : cles(`atelier:${v}`).length > 0;
  };
  return tout.filter(x => vues[x.id] > 0 && maintenant - vues[x.id] < 7 * JOUR && !ouvert(x.id))
    .map(x => ({ cle: `nouveau-${x.id}`, type: "nouveau", t: "nouveau", titre: x.titre, detail: x.detail, lien: x.lien }));
}

/** Nouveauté touchée dans le fil : elle n'y revient plus. */
export function nouveauteOuverte(cle: string) {
  const vues = read<Record<string, number>>(VUES, {});
  vues[cle.replace(/^nouveau-/, "")] = -1;
  write(VUES, vues);
}

/* ---------- Cartes du jour ---------- */

function questions(g: number, n: number): CarteFil[] {
  const lues = oeuvresLues().map(id => oeuvre(id)).filter((w): w is Oeuvre => !!w?.detaillee);
  // Fiches au programme d'abord, puis toutes les autres fiches complètes (y compris celles ajoutées depuis le tableau de bord).
  const autres = [...melanger(OEUVRES.filter(w => w.detaillee && w.niveaux?.length), g), ...melanger(OEUVRES.filter(w => w.detaillee && !w.niveaux?.length), g)];
  const out: CarteFil[] = [];
  for (const [i, w] of [...melanger(lues, g), ...autres].entries()) {
    if (out.length >= n) break;
    if (out.some(c => c.t === "question" && c.w.id === w.id)) continue;
    const q = questionOeuvre(w, (g + i) % 2);
    if (q) out.push({ cle: `question-${w.id}`, type: "question", t: "question", w, q });
  }
  return out;
}

function citations(g: number, n: number): CarteFil[] {
  const out: CarteFil[] = [];
  for (const s of melanger(sujetsEntrainement().filter(s => !s.perso), g)) {
    if (out.length >= n) break;
    const c = choixFonctions(fonctionsDuSujet(s.num), g + out.length);
    if (c) out.push({ cle: `citation-${s.num}`, type: "citation", t: "citation", num: s.num, citation: s.citation, auteur: s.auteur, ...c });
  }
  return out;
}

function oeuvres30(g: number, n: number): CarteFil[] {
  // D'abord les fiches que l'élève peut lire en entier, puis des fiches au programme qu'il peut ouvrir.
  const lisibles = OEUVRES.filter(w => w.detaillee && w.resume && (premium() || fichesOuvertes()[w.id]));
  const autres = OEUVRES.filter(w => w.detaillee && !lisibles.includes(w) && ouvrable(w.id));
  return [...melanger(lisibles, g), ...melanger(autres.filter(w => w.niveaux?.length), g), ...melanger(autres.filter(w => !w.niveaux?.length), g)].slice(0, n).map(w => ({
    cle: `oeuvre30-${w.id}`, type: "oeuvre30", t: "oeuvre", w, ouvrable: ouvrable(w.id),
    extrait: w.resume ? extraitDe(w.resume) : null
  }));
}

/** Les premières phrases d'un résumé, coupées à la fin d'une phrase. */
function extraitDe(resume: string) {
  const t = sansEtoiles(resume.split(/\n+/)[0]);
  if (t.length <= 260) return t;
  const fin = t.slice(0, 260).lastIndexOf(". ");
  return fin > 120 ? t.slice(0, fin + 1) : t.slice(0, 250).trimEnd() + "…";
}

function formules(g: number, n: number): CarteFil[] {
  // Une formule de chaque moment du devoir avant d'en revoir un : généralité, transition, ouverture…
  const parCat = CATEGORIES.map((c, i) => melanger(toutesLesFormules().filter(f => f.cat === c.id), g + i));
  const tour = melanger(parCat.filter(l => l.length), g).map(l => l[0]);
  return tour.slice(0, n).map(f => ({ cle: `formule-${f.id}`, type: "formule", t: "formule", f }));
}

/** « Où va cette phrase ? » : un exemple rédigé, et trois moments du devoir au choix. */
function placer(g: number, n: number): CarteFil[] {
  const liste = melanger(toutesLesFormules().filter(f => categorie(f.cat)?.partie !== "partout"), g + 41);
  const out: CarteFil[] = [];
  for (const [i, f] of liste.entries()) {
    if (out.length >= n) break;
    if (out.some(c => c.t === "placer" && c.f.cat === f.cat)) continue;
    const c = categorie(f.cat)!;
    // Un leurre de la même partie et un d'une autre : généralité ou ouverture ? transition ou bilan ?
    const autres = CATEGORIES.filter(x => x.id !== c.id && x.partie !== "partout");
    const meme = melanger(autres.filter(x => x.partie === c.partie), g + i)[0];
    const loin = melanger(autres.filter(x => x.partie !== c.partie), g + i + 1)[0];
    const leurres = [meme, loin].filter(Boolean).map(x => x!.id);
    const choix = melanger([c.id, ...leurres], g + i + 2);
    out.push({ cle: `placer-${f.id}`, type: "placer", t: "placer", f, choix, bonne: choix.indexOf(c.id) });
  }
  return out;
}

function mots(g: number, n: number): CarteFil[] {
  const out: CarteFil[] = [];
  // Liste publique des mots, avec ceux ajoutés depuis le tableau de bord.
  for (const e of melanger(motsPublics(), g)) {
    if (out.length >= n) break;
    const c = choixFonctions(e.fonctions ?? [], g + out.length);
    if (c) out.push({ cle: `mot-${e.mot}`, type: "mot", t: "mot", mot: e.mot, nature: e.nature, ...c });
  }
  return out;
}


/* ---------- Devine l'œuvre, thèse ou antithèse, vrai ou faux, le bon plan, tour du monde ---------- */

const NOM_F: Record<Fonction, string> = { Engagement: "d'engagement", Sociale: "sociale", Esthétique: "esthétique", Évasion: "d'évasion", Lyrique: "lyrique" };
/** Fonctions qui montrent les limites d'une autre : de quoi nourrir l'antithèse. */
const OPPOSEES: Record<Fonction, Fonction[]> = {
  Engagement: ["Évasion", "Esthétique"], Sociale: ["Évasion", "Lyrique"], Évasion: ["Engagement", "Sociale"],
  Lyrique: ["Sociale", "Engagement"], Esthétique: ["Engagement", "Sociale"]
};
/** Arguments qui relèvent sans ambiguïté d'une seule fonction. */
const ARGS_F: Record<Fonction, string[]> = {
  Engagement: ["Dénonciation", "Éveil des consciences", "Défense des opprimés"].map(k => ARGUMENTS[k]),
  Sociale: [ARGUMENTS["Peinture de la réalité sociale"], PAR_FONCTION.Sociale],
  Esthétique: ["Culte de la forme", "Célébration de la beauté"].map(k => ARGUMENTS[k]),
  Lyrique: ["Expression des sentiments", "Expression du vécu"].map(k => ARGUMENTS[k]),
  Évasion: ["Voyage imaginaire", "Imagination", "Divertissement"].map(k => ARGUMENTS[k])
};
const unArg = (f: Fonction, g: number) => ARGS_F[f][g % ARGS_F[f].length];
const GENRE_NOM: Record<string, string> = { Roman: "un roman", Théâtre: "une pièce de théâtre", Poésie: "un recueil de poèmes", Nouvelle: "un recueil de nouvelles", Essai: "un essai", Conte: "un recueil de contes" };
const fiches = () => OEUVRES.filter(w => w.detaillee);
const DU = new Set(["Sénégal", "Cameroun", "Congo", "Mali", "Nigeria", "Burkina Faso", "Maroc", "Chili", "Kenya", "Royaume-Uni", "Niger", "Bénin", "Togo", "Gabon", "Tchad", "Canada", "Portugal", "Mexique", "Japon", "Liban"]);
/** « de France », « du Sénégal », « des États-Unis », « d'Algérie ». */
export function dePays(p: string) {
  if (p === "États-Unis") return "des États-Unis";
  if (DU.has(p)) return `du ${p}`;
  return /^[AEÉIOUY]/i.test(p) ? `d'${p}` : `de ${p}`;
}

function devinettes(g: number, n: number): CarteFil[] {
  const out: CarteFil[] = [];
  for (const w of melanger(fiches().filter(w => w.paysTexte && w.themes.length >= 2), g)) {
    if (out.length >= n) break;
    const mots = new Set(w.titre.toLowerCase().split(/\W+/).filter(m => m.length > 3));
    const themes = w.themes.filter(t => !t.toLowerCase().split(/\W+/).some(m => mots.has(m))).slice(0, 3);
    if (themes.length < 2) continue;
    const autres = melanger(fiches().filter(x => x.genre === w.genre && x.id !== w.id && x.auteur !== w.auteur), g + out.length).slice(0, 2);
    if (autres.length < 2) continue;
    out.push({ cle: `devine-${w.id}`, type: "devine", t: "devine", w, choix: melanger([w, ...autres], g + 1),
      indices: [GENRE_NOM[w.genre] ?? w.genre, `une œuvre ${w.pays?.length === 1 ? dePays(w.pays[0]) : `de ${w.paysTexte}`}`, `thèmes : ${themes.join(", ").toLowerCase()}`] });
  }
  return out;
}

/** Sujets dont on connaît la fonction défendue par l'auteur (corrigés, banque, ajoutés). */
function sujetsAvecFonction(g: number) {
  return melanger(sujetsEntrainement().filter(s => !s.perso), g)
    .map(s => ({ s, f: fonctionsDuSujet(s.num) })).filter(x => x.f.length > 0 && x.s.citation.length <= 220);
}

function theses(g: number, n: number): CarteFil[] {
  return sujetsAvecFonction(g).slice(0, n).map(({ s, f }, i) => {
    const partie: 1 | 2 = (g + i) % 2 ? 1 : 2;
    const argFonction = partie === 1 ? f[0] : OPPOSEES[f[0]].find(o => !f.includes(o)) ?? OPPOSEES[f[0]][0];
    return { cle: `these-${s.num}`, type: "these", t: "these" as const, num: s.num, citation: s.citation, auteur: s.auteur, fonction: f[0], argument: unArg(argFonction, g + i), argFonction, partie };
  });
}

function plans(g: number, n: number): CarteFil[] {
  return sujetsAvecFonction(g + 13).slice(0, n).map(({ s, f }, i) => {
    const [o1, o2] = OPPOSEES[f[0]].filter(o => !f.includes(o)).concat(OPPOSEES[f[0]]);
    const bon: [string, string] = [unArg(f[0], g + i), unArg(o1, g + i + 1)];
    const faux: [string, string] = [unArg(o1, g + i + 2), unArg(o2 ?? o1, g + i + 3)];
    const b = (g + i) % 2;
    return { cle: `plan-${s.num}`, type: "plan", t: "plan" as const, num: s.num, citation: s.citation, auteur: s.auteur, fonction: f[0], opposee: o1, plans: b ? [faux, bon] : [bon, faux], bon: b };
  });
}

function vraisFaux(g: number, n: number): CarteFil[] {
  const out: CarteFil[] = [];
  const liste = fiches();
  for (const [i, w] of melanger(liste, g).entries()) {
    if (out.length >= n) break;
    const vrai = (g + i) % 2 === 0;
    const sorte = (g + i * 3) % 4;
    const titre = `« ${w.titre} »`;
    let phrase = "", correction = "";
    if (sorte === 0) {
      const autre = melanger(liste.filter(x => x.genre === w.genre && x.auteur !== w.auteur), g + i)[0];
      if (!autre) continue;
      phrase = `${titre} a été écrit par ${vrai ? w.auteur : autre.auteur}.`;
      correction = `${titre} est de ${w.auteur}.`;
    } else if (sorte === 1) {
      const faux = Object.keys(GENRE_NOM).filter(x => x !== w.genre && x !== "Conte" && x !== "Essai")[(g + i) % 3];
      if (!GENRE_NOM[w.genre]) continue;
      phrase = `${titre} est ${GENRE_NOM[vrai ? w.genre : faux]}.`;
      correction = `${titre} est ${GENRE_NOM[w.genre]}.`;
    } else if (sorte === 2) {
      if (w.pays?.length !== 1) continue;
      const autre = melanger([...new Set(liste.flatMap(x => x.pays ?? []))].filter(p => p !== w.pays[0]), g + i)[0];
      phrase = `${titre} est une œuvre ${dePays(vrai ? w.pays[0] : autre)}.`;
      correction = `${titre} est une œuvre ${dePays(w.pays[0])}.`;
    } else {
      const f = w.fonctions[0];
      const faux = FONCTIONS.filter(x => !w.fonctions.includes(x))[(g + i) % 3];
      if (!f || !faux) continue;
      phrase = `${titre} illustre surtout la fonction ${NOM_F[vrai ? f : faux]}.`;
      correction = `${titre} illustre surtout la fonction ${NOM_F[f]}.`;
    }
    out.push({ cle: `vraifaux-${w.id}`, type: "vraifaux", t: "vraifaux", w, phrase, vrai, correction });
  }
  return out;
}

function voyages(g: number, n: number): CarteFil[] {
  const tous = [...new Set(fiches().flatMap(w => w.pays ?? []))];
  const vus = new Set(paysDecouverts());
  // D'abord les pays pas encore découverts : la carte du monde de l'élève s'agrandit.
  const liste = fiches().filter(w => w.pays?.length === 1);
  return [...melanger(liste.filter(w => !vus.has(w.pays[0])), g), ...melanger(liste.filter(w => vus.has(w.pays[0])), g)].slice(0, n).map((w, i) => ({
    cle: `pays-${w.id}`, type: "pays", t: "pays" as const, w, pays: w.pays[0],
    choix: melanger([w.pays[0], ...melanger(tous.filter(p => p !== w.pays[0]), g + i).slice(0, 2)], g + i + 1)
  }));
}

/* ---------- Tour du monde littéraire ---------- */

const PAYS = "pays-decouverts";
export const paysDecouverts = () => read<string[]>(PAYS, []);
export const TOUS_LES_PAYS = [...new Set(OEUVRES.filter(w => w.detaillee).flatMap(w => w.pays ?? []))].sort((a, b) => a.localeCompare(b, "fr"));
/** Pays ajouté au tour du monde ; vrai s'il est nouveau. */
export function decouvrirPays(p: string) {
  const l = paysDecouverts();
  if (l.includes(p)) return false;
  write(PAYS, [...l, p]);
  return true;
}

/** Auteurs débloqués depuis hier : la nouvelle carte de la collection. */
function auteursRecents(maintenant: number): CarteFil[] {
  return Object.entries(auteursDebloques()).filter(([, v]) => maintenant - v.d < JOUR).slice(0, 2)
    .map(([nom]) => ({ cle: `auteur-${nom}`, type: "auteur", t: "auteur", nom }));
}

/** Le fil du jour, dans l'ordre d'affichage. */
export function filDuJour(maintenant = Date.now()): CarteFil[] {
  initialiserCollection();
  const jour = jourLocal(maintenant);
  const g = graine(jour);
  // La première suggestion est déjà en tête de l'accueil (« Ta prochaine action »).
  const p = prochaineAction(maintenant).cle;
  const sugg: CarteFil[] = [...suggestions(maintenant), ...decouvertes()].filter(s => !s.horsAccueil && s.cle !== p)
    .map(s => ({ cle: s.cle, type: s.type ?? "suggestion", t: "suggestion", s }));
  const tete: CarteFil[] = [
    ...nouveautes(maintenant),
    ...nouveauxBadges().map(b => ({ cle: `badge-${b.id}`, type: "badge", t: "badge" as const, badge: b, gagne: true })),
    ...(surpriseDispo() ? [{ cle: `surprise-${jour}`, type: "surprise", t: "surprise" as const }] : []),
    ...auteursRecents(maintenant)
  ];
  const proche = badgeProche();
  const nAuteurs = Object.keys(auteursDebloques()).length;
  const extras: CarteFil[] = [
    ...(proche ? [{ cle: `badge-proche-${proche.id}`, type: "badge", t: "badge" as const, badge: proche, gagne: false }] : []),
    { cle: `duel-${jour}`, type: "duel", t: "duel" },
    ...(nAuteurs ? [{ cle: "collection", type: "collection", t: "collection" as const, n: nAuteurs, total: TOUS_LES_AUTEURS.length }] : [])
  ];
  // Les cartes à jouer et à lire s'intercalent entre les suggestions, sans deux du même genre à la suite.
  const files = [
    questions(g, 4), theses(g + 17, 3), citations(g + 3, 3), devinettes(g + 19, 3), oeuvres30(g + 5, 3), vraisFaux(g + 23, 4),
    mots(g + 7, 3), plans(g + 29, 2), voyages(g + 31, 3), formules(g + 11, 2), placer(g + 37, 2), extras
  ];
  const jeux: CarteFil[] = [];
  for (let i = 0; files.some(f => f.length); i++) {
    const f = files[i % files.length];
    const c = f.shift();
    if (c) jeux.push(c);
  }
  const fil: CarteFil[] = [...tete];
  while (sugg.length || jeux.length) {
    if (sugg.length) fil.push(sugg.shift()!);
    if (jeux.length) fil.push(jeux.shift()!);
    if (jeux.length && fil.length > 6) fil.push(jeux.shift()!);
  }
  // Les cartes déjà jouées ou passées aujourd'hui ne reviennent pas.
  const vus = new Set<string>([...Object.keys(reponsesDuJour()), ...ecarteesDuJour()]);
  return fil.filter(c => !vus.has(c.cle) && !!vus.add(c.cle));
}

/* ---------- Cartes passées d'un geste ---------- */

const ECARTEES = "fil-ecartees";
export function ecarteesDuJour(): string[] {
  const e = read<{ jour: string; cles: string[] } | null>(ECARTEES, null);
  return e?.jour === jourLocal() ? e.cles : [];
}
/** Carte glissée sur le côté : elle quitte le fil pour aujourd'hui (une nouveauté, pour de bon). */
export function ecarterCarte(cle: string) {
  write(ECARTEES, { jour: jourLocal(), cles: [...ecarteesDuJour(), cle] });
  if (cle.startsWith("nouveau-")) nouveauteOuverte(cle);
  write("fil-glisse", true);
}
export const dejaGlisse = () => read<boolean>("fil-glisse", false);

/* ---------- Réponses du jour ---------- */

const REPONSES = "fil-reponses";
type Reponses = { jour: string; r: Record<string, number> };
export function reponsesDuJour(): Record<string, number> {
  const r = read<Reponses | null>(REPONSES, null);
  return r?.jour === jourLocal() ? r.r : {};
}
export function noterReponse(cle: string, choix: number) {
  write(REPONSES, { jour: jourLocal(), r: { ...reponsesDuJour(), [cle]: choix } });
}

/* ---------- Carte envoyée en notification ---------- */

const CARTES_NOTIF = "notif-cartes";
type CartesNotif = Record<string, { jour: string; c: CarteFil }>;

/**
 * Carte à jouer annoncée par la notification d'un jour (vrai ou faux, devine l'œuvre, tour du monde).
 * Elle est gardée sur le téléphone : en touchant la notification, l'élève la retrouve en tête de « Pour toi ».
 */
export function carteNotification(jour: string, sorte: "question" | "pays"): CarteFil | null {
  const g = graine(`notif-${jour}`);
  const c = (sorte === "pays" ? voyages(g, 1) : g % 2 ? devinettes(g, 1) : vraisFaux(g, 1))[0];
  if (!c) return null;
  const limite = jourLocal(Date.now() - 7 * JOUR);
  const gardees = Object.entries(read<CartesNotif>(CARTES_NOTIF, {})).filter(([, v]) => v.jour >= limite);
  write(CARTES_NOTIF, { ...Object.fromEntries(gardees), [c.cle]: { jour, c } });
  return c;
}

/** Carte d'une notification touchée, avec ses œuvres relues dans le contenu actuel ; rien si elle est déjà jouée aujourd'hui. */
export function carteDemandee(cle: string | null): CarteFil | null {
  const c = cle ? read<CartesNotif>(CARTES_NOTIF, {})[cle]?.c : null;
  if (!c || cle! in reponsesDuJour()) return null;
  const w = "w" in c ? oeuvre(c.w.id) : null;
  if (!w) return null;
  if (c.t === "devine") {
    const choix = c.choix.map(x => oeuvre(x.id)).filter((x): x is Oeuvre => !!x);
    return choix.length === c.choix.length ? { ...c, w, choix } : null;
  }
  return { ...c, w } as CarteFil;
}
