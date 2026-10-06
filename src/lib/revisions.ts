import libres from "../data/quiz-libre.json";
import type { EntreeDico, QuestionQuiz } from "../data/types";
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
  marquer(`revision:${cle}`);
}

export function seanceTerminee() {
  noter({ t: "progres", ref: "revision" });
}

/** Contenu d'une carte, s'il est sur l'appareil (accès complet, mot gratuit ouvert, quiz offert). */
function contenu(cle: string): Carte | null {
  const [type, a, b] = cle.split("|");
  if (type === "mot") {
    const entree = dicoComplet()?.find(e => e.mot === a) ?? read<Record<string, EntreeDico>>("dico-consultes", {})[a];
    return entree?.sens ? { cle, type: "mot", entree } : null;
  }
  if (type === "quiz") {
    const question = (licence()?.contenu.quiz?.[a] ?? (libres as Record<string, QuestionQuiz[]>)[a])?.[Number(b)];
    return question ? { cle, type: "quiz", lecon: a, question } : null;
  }
  return null;
}

export const cleMot = (mot: string) => `mot|${mot}`;
export const cleQuiz = (lecon: string, n: number) => `quiz|${lecon}|${n}`;

/** Cartes à revoir aujourd'hui (les plus en retard d'abord). */
export function cartesDuJour(s: Suivis = suivis()): Carte[] {
  const auj = jourLocal();
  return Object.entries(s)
    .filter(([, v]) => v.prochaine <= auj)
    .sort((a, b) => a[1].prochaine.localeCompare(b[1].prochaine) || a[1].boite - b[1].boite)
    .map(([k]) => contenu(k))
    .filter((c): c is Carte => !!c);
}

/** Cartes connues (boîte 3 ou plus : revue avec succès au moins trois fois). */
export const nbCartes = (s: Suivis = suivis()) => ({ total: Object.keys(s).length, sues: Object.values(s).filter(v => v.boite >= 3).length });
