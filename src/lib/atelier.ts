import { read, useStored } from "./storage";

/**
 * Atelier de rédaction : le brouillon d'un sujet, gardé sur le téléphone.
 * L'élève avance de la compréhension du sujet au plan détaillé, puis à la rédaction.
 */
export interface ArgumentPlan { arg: string; expl: string; ex: string }
export interface Axe { titre: string; args: ArgumentPlan[] }

export interface Brouillon {
  theme: string;
  these: string;
  orientations: string[];
  motscles: { mot: string; def: string }[];
  reformulation: string;
  problematique: string;
  axe1: Axe;
  axe2: Axe;
  intro: string;
  phraseIntro: string;
  /** Un paragraphe rédigé par argument, dans l'ordre du plan. */
  paragraphes1: string[];
  transition: string;
  paragraphes2: string[];
  conclusion: string;
  modifie: number;
  envoye?: number;
}

export const ORIENTATIONS = ["Engagement", "Esthétique", "Évasion", "Lyrique", "Sociale"];

const argVide = (): ArgumentPlan => ({ arg: "", expl: "", ex: "" });

export const brouillonVide = (): Brouillon => ({
  theme: "", these: "", orientations: [], motscles: [{ mot: "", def: "" }], reformulation: "", problematique: "",
  axe1: { titre: "", args: [argVide(), argVide()] },
  axe2: { titre: "", args: [argVide(), argVide()] },
  intro: "", phraseIntro: "", paragraphes1: [], transition: "", paragraphes2: [], conclusion: "",
  modifie: 0
});

export const nouvelArgument = argVide;

const cle = (num: string) => `atelier:${num}`;
// Un brouillon enregistré par une version plus ancienne garde ses réponses, les champs ajoutés depuis sont vides.
const complet = (b: Partial<Brouillon> | null): Brouillon | null => b ? { ...brouillonVide(), ...b } : null;

export const lireBrouillon = (num: string) => complet(read<Partial<Brouillon> | null>(cle(num), null));

export function useBrouillon(num: string): [Brouillon, (b: Brouillon) => void] {
  const [b, ecrire] = useStored<Partial<Brouillon> | null>(cle(num), null);
  return [complet(b) ?? brouillonVide(), nb => ecrire({ ...nb, modifie: Date.now() })];
}

const rempli = (s: string | undefined) => (s ?? "").trim().length > 0;

/**
 * Part du devoir faite, en pour cent : chaque case compte pour une étape
 * (compréhension, plan, puis un paragraphe rédigé par argument du plan).
 */
export function avancement(b: Brouillon | null): number {
  if (!b) return 0;
  const cases: boolean[] = [
    rempli(b.theme), rempli(b.these), b.orientations.length > 0,
    b.motscles.some(m => rempli(m.mot) && rempli(m.def)), rempli(b.reformulation), rempli(b.problematique)
  ];
  for (const axe of [b.axe1, b.axe2]) {
    cases.push(rempli(axe.titre));
    for (const a of axe.args) cases.push(rempli(a.arg), rempli(a.expl), rempli(a.ex));
  }
  cases.push(rempli(b.intro), rempli(b.phraseIntro), rempli(b.transition), rempli(b.conclusion));
  b.axe1.args.forEach((_, i) => cases.push(rempli(b.paragraphes1[i])));
  b.axe2.args.forEach((_, i) => cases.push(rempli(b.paragraphes2[i])));
  return Math.round(100 * cases.filter(Boolean).length / cases.length);
}

/** Le devoir rédigé, d'un seul tenant, prêt à copier ou à envoyer. */
export function redaction(b: Brouillon): string {
  const p = (t: string | undefined) => (t ?? "").trim();
  const dev1 = [p(b.phraseIntro), ...b.axe1.args.map((_, i) => p(b.paragraphes1[i]))].filter(Boolean);
  const dev2 = b.axe2.args.map((_, i) => p(b.paragraphes2[i])).filter(Boolean);
  return [p(b.intro), ...dev1, p(b.transition), ...dev2, p(b.conclusion)].filter(Boolean).join("\n\n");
}
