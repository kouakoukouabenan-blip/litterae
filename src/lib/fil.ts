import outils from "../data/outils.json";
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
import { decouvertes, prochaineAction, suggestions, type Suggestion } from "./suggestions";
import {
  auteursDebloques, badgeProche, initialiserCollection, nouveauxBadges, oeuvresLues, surpriseDispo, TOUS_LES_AUTEURS, type Badge
} from "./collection";

/**
 * Fil « Pour toi » : les suggestions personnelles, mêlées à des cartes à jouer tout de suite
 * (question éclair, citation à classer, mot de sujet), à lire (œuvre en 30 secondes, formule)
 * et à collectionner (auteurs, badges, surprises). Calculé sur le téléphone, différent chaque jour,
 * et fini : une fois tout vu, l'élève revient le lendemain.
 */
export type CarteFil = { cle: string; type: string } & (
  | { t: "suggestion"; s: Suggestion }
  | { t: "question"; w: Oeuvre; q: QuestionQuiz }
  | { t: "citation"; num: string; citation: string; auteur: string; bonne: Fonction; choix: Fonction[] }
  | { t: "oeuvre"; w: Oeuvre; extrait: string | null; ouvrable: boolean }
  | { t: "formule"; groupe: string; label: string; texte: string }
  | { t: "mot"; mot: string; nature: string; bonne: Fonction; choix: Fonction[] }
  | { t: "badge"; badge: Badge; gagne: boolean }
  | { t: "auteur"; nom: string }
  | { t: "collection"; n: number; total: number }
  | { t: "surprise" }
  | { t: "duel" }
  | { t: "nouveau"; titre: string; detail: string; lien: string }
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

type Groupe = { title: string; items: { label: string; text: string }[] };
function formules(g: number, n: number): CarteFil[] {
  const toutes = (outils.formules as Groupe[]).flatMap(gr => gr.items.map(it => ({ groupe: gr.title, label: it.label, texte: it.text.replace(/<[^>]+>/g, "") })));
  return melanger(toutes, g).slice(0, n).map(f => ({ cle: `formule-${graine(f.texte)}`, type: "formule", t: "formule", ...f }));
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
  const files = [questions(g, 5), citations(g + 3, 4), oeuvres30(g + 5, 4), mots(g + 7, 4), formules(g + 11, 3), extras];
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
  const vus = new Set<string>();
  return fil.filter(c => !vus.has(c.cle) && !!vus.add(c.cle));
}

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
