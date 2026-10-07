import libres from "../data/quiz-libre.json";
import { FONCTIONS, type EntreeDico, type Oeuvre, type QuestionQuiz } from "../data/types";
import { OEUVRES, oeuvre } from "./data";
import { licence } from "./licence";
import { dicoComplet } from "./dictionnaire";
import { read, useStored, write } from "./storage";
import { jourLocal, marquer } from "./progres";
import { noter } from "./stats";
import { noterErreurQuiz } from "./interets";

/**
 * Révisions espacées : chaque mot du dictionnaire ouvert et chaque question de quiz déjà vue
 * revient le lendemain, puis 3, 7, 15 et 30 jours plus tard tant que l'élève s'en souvient.
 * Une erreur le fait revenir dès le lendemain. Tout reste sur le téléphone.
 */
const CLE = "revisions";
const INTERVALLES = [1, 3, 7, 15, 30, 60];
export const CARTES_PAR_SEANCE = 10;

interface Suivi { boite: number; prochaine: string }
type Suivis = Record<string, Suivi>;

export type Carte =
  | { cle: string; type: "mot"; entree: EntreeDico }
  | { cle: string; type: "quiz"; lecon: string; question: QuestionQuiz };

const suivis = () => read<Suivis>(CLE, {});
export const useSuivis = () => useStored<Suivis>(CLE, {})[0];

const dans = (jours: number) => jourLocal(Date.now() + jours * 864e5);

/** Ajoute une carte la première fois que l'élève la rencontre (mot ouvert, question de quiz répondue). */
export function ajouterCarte(cle: string, reussie = true) {
  const s = suivis();
  if (s[cle]) return;
  write(CLE, { ...s, [cle]: { boite: reussie ? 1 : 0, prochaine: dans(reussie ? INTERVALLES[0] : 1) } });
}

/** Résultat d'une révision : la carte s'éloigne si l'élève s'en souvient, sinon elle revient demain. */
export function reviser(cle: string, reussie: boolean) {
  const s = suivis();
  const boite = reussie ? Math.min((s[cle]?.boite ?? 0) + 1, INTERVALLES.length - 1) : 0;
  write(CLE, { ...s, [cle]: { boite, prochaine: dans(reussie ? INTERVALLES[boite] : 1) } });
  if (!reussie && cle.startsWith("quiz|")) noterErreurQuiz(cle.split("|")[1]);
  // Une œuvre oubliée : sa fiche revient dans les suggestions de l'accueil.
  if (!reussie && cle.startsWith("oeuvre|")) noterErreurQuiz(`oeuvre:${cle.split("|")[1]}`);
  marquer(`revision:${cle}`);
}

export function seanceTerminee() {
  noter({ t: "progres", ref: "revision" });
}

/** Contenu d'une carte, s'il est sur l'appareil (accès complet, mot gratuit ouvert, quiz offert). */
function contenu(cle: string, s = suivis): Carte | null {
  const [type, a, b] = cle.split("|");
  if (type === "mot") {
    const entree = dicoComplet()?.find(e => e.mot === a) ?? read<Record<string, EntreeDico>>("dico-consultes", {})[a];
    return entree?.sens ? { cle, type: "mot", entree } : null;
  }
  if (type === "oeuvre") {
    const w = oeuvre(a);
    const question = w && questionOeuvre(w, s()[cle]?.boite ?? 0);
    return question ? { cle, type: "quiz", lecon: "oeuvres", question } : null;
  }
  if (type === "quiz") {
    const question = (licence()?.contenu.quiz?.[a] ?? (libres as Record<string, QuestionQuiz[]>)[a])?.[Number(b)];
    return question ? { cle, type: "quiz", lecon: a, question } : null;
  }
  return null;
}

export const cleMot = (mot: string) => `mot|${mot}`;
export const cleOeuvre = (id: string) => `oeuvre|${id}`;

/** Petit nombre tiré du texte : le même ordre des réponses à chaque fois pour une même œuvre. */
const NOM_FONCTION: Record<string, string> = { Engagement: "d'engagement", Sociale: "sociale", Esthétique: "esthétique", Évasion: "d'évasion", Lyrique: "lyrique" };

export const graine = (t: string) => [...t].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
export function melanger<T>(liste: T[], g: number) {
  const out = [...liste];
  for (let i = out.length - 1; i > 0; i--) { g = (g * 1103515245 + 12345) >>> 0; const j = g % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/**
 * Question sur une fiche lue, pour avoir ses exemples en tête le jour du devoir :
 * une fois l'auteur, une fois la fonction littéraire (quand une seule réponse est possible).
 */
export function questionOeuvre(w: Oeuvre, boite: number): QuestionQuiz | null {
  const g = graine(w.id);
  const fausses = FONCTIONS.filter(f => !w.fonctions.includes(f));
  if (boite % 2 === 1 && fausses.length && w.fonctions.length) {
    const choix = melanger([w.fonctions[0], ...melanger(fausses, g).slice(0, 3)], g + boite);
    const idee = w.idees.find(i => i.fonction === w.fonctions[0]) ?? w.idees[0];
    return {
      q: `Pour quelle fonction de la littérature « ${w.titre} » est-elle un bon exemple ?`,
      choix, bonne: choix.indexOf(w.fonctions[0]),
      pourquoi: `« ${w.titre} » illustre surtout la fonction ${NOM_FONCTION[w.fonctions[0]]}${idee ? ` : ${idee.argument.charAt(0).toLowerCase()}${idee.argument.slice(1).replace(/\.$/, "")}.` : "."}`
    };
  }
  const autres = melanger([...new Set(OEUVRES.filter(x => x.auteur !== w.auteur && x.genre === w.genre).map(x => x.auteur))], g).slice(0, 3);
  if (autres.length < 3) return null;
  const choix = melanger([w.auteur, ...autres], g + boite);
  return {
    q: `Qui a écrit « ${w.titre} » ?`, choix, bonne: choix.indexOf(w.auteur),
    pourquoi: `« ${w.titre} » est de ${w.auteur}${w.paysTexte || w.pays?.length ? ` (${w.paysTexte || w.pays.join(", ")})` : ""}.`
  };
}
export const cleQuiz = (lecon: string, n: number) => `quiz|${lecon}|${n}`;

/** Cartes à revoir aujourd'hui (les plus en retard d'abord). */
export function cartesDuJour(s: Suivis = suivis()): Carte[] {
  const auj = jourLocal();
  return Object.entries(s)
    .filter(([, v]) => v.prochaine <= auj)
    .sort((a, b) => a[1].prochaine.localeCompare(b[1].prochaine) || a[1].boite - b[1].boite)
    .map(([k]) => contenu(k, () => s))
    .filter((c): c is Carte => !!c);
}

/** Cartes connues (boîte 3 ou plus : revue avec succès au moins trois fois). */
export const nbCartes = (s: Suivis = suivis()) => ({ total: Object.keys(s).length, sues: Object.values(s).filter(v => v.boite >= 3).length });
