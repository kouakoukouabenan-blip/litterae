import { read, write } from "./storage";
import { normalize } from "./text";
import { jourLocal } from "./progres";

/**
 * Ce que l'élève cherche dans Œuvres (thème tapé ou choisi, fonction, argument), gardé sur son téléphone :
 * même sans ouvrir de fiche, une recherche dit ce qui l'intéresse. Sert aux suggestions de l'accueil.
 */
export type Interet = { type: "theme" | "fonction" | "argument"; v: string; d: number };

const CLE = "interets";
const MAX = 12;

export const interets = () => read<Interet[]>(CLE, []);

export function noterInterets(nouveaux: Omit<Interet, "d">[]) {
  if (!nouveaux.length) return;
  const d = Date.now();
  const autres = interets().filter(i => !nouveaux.some(n => n.type === i.type && normalize(n.v) === normalize(i.v)));
  write(CLE, [...nouveaux.map(n => ({ ...n, d })), ...autres].slice(0, MAX));
}

/** Thèmes connus nommés par une recherche courte (« amour », « la colonisation »). */
export function themesTapes(q: string, themes: string[]) {
  const net = normalize(q).replace(/\b(l|la|le|les|de|du|des|d)\b/g, " ").replace(/\s+/g, " ").trim();
  if (net.length < 4 || net.split(" ").length > 3) return [];
  return themes.filter(t => { const n = normalize(t); return n === net || (n.length >= 5 && (net.includes(n) || n.startsWith(net))); }).slice(0, 2);
}

/**
 * Suggestions montrées sans être ouvertes : vues trois jours différents sans clic, elles laissent
 * leur place pendant une semaine. Un clic remet le compteur à zéro.
 */
type Vues = Record<string, { jours: string[]; jusqua?: number }>;
const VUES = "suggestions-vues";
const JOUR = 864e5;

export function suggestionsVues(cles: string[], maintenant = Date.now()): string[] {
  const v = read<Vues>(VUES, {});
  const auj = jourLocal(maintenant);
  const nouvelles: string[] = [];
  for (const c of cles) {
    const s = v[c] ?? { jours: [] };
    if (s.jusqua && s.jusqua > maintenant) continue;
    delete s.jusqua;
    if (!s.jours.includes(auj)) { s.jours = [...s.jours, auj].slice(-3); nouvelles.push(c); }
    if (s.jours.length >= 3) { s.jours = []; s.jusqua = maintenant + 7 * JOUR; }
    v[c] = s;
  }
  // Vieilles entrées retirées pour que la liste reste petite.
  for (const [c, s] of Object.entries(v)) if (!(s.jusqua && s.jusqua > maintenant) && !s.jours.some(j => Date.parse(j) > maintenant - 30 * JOUR)) delete v[c];
  write(VUES, v);
  return nouvelles;
}

export function suggestionOuverte(cle: string) {
  const v = read<Vues>(VUES, {});
  if (!v[cle]) return;
  delete v[cle];
  write(VUES, v);
}

export function estEcartee(cle: string, maintenant = Date.now()) {
  const s = read<Vues>(VUES, {})[cle];
  return !!s?.jusqua && s.jusqua > maintenant;
}

/** Leçons dont une question de quiz a été ratée (au quiz ou en révision), avec le moment de l'erreur. */
const ERREURS = "erreurs-quiz";
export const erreursQuiz = () => read<Record<string, number>>(ERREURS, {});
export function noterErreurQuiz(lecon: string) {
  write(ERREURS, { ...erreursQuiz(), [lecon]: Date.now() });
}
