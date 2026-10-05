import apercu from "../data/quiz-apercu.json";
import { avancement, lireBrouillon, type Brouillon } from "./atelier";
import { historique } from "./historique";
import { activite } from "./progres";
import { cles, read } from "./storage";
import { LECONS } from "./lecons";

/**
 * Niveau de maîtrise de chaque étape de la dissertation, calculé sur le téléphone :
 * la leçon lue, le meilleur score au quiz et la pratique dans l'atelier (et, pour les exemples,
 * les fiches d'œuvres lues et les défis relevés). Sert à la page « Ma progression »
 * et à proposer en priorité l'étape la plus faible.
 */
export interface Etape {
  id: string;
  nom: string;
  /** Étape correspondante de l'atelier (0 à 4). */
  atelier: number;
  lecon: string;
  score: number;
  niveau: string;
  /** Ce qui ferait progresser le plus, en une phrase, avec le lien. */
  conseil: { texte: string; lien: string };
}

const rempli = (s: string | undefined) => (s ?? "").trim().length > 0;
const DEFS: { id: string; nom: string; atelier: number; lecon: string; fait: (b: Brouillon) => boolean }[] = [
  { id: "comprendre", nom: "Comprendre le sujet", atelier: 0, lecon: "comprendre",
    fait: b => rempli(b.theme) && rempli(b.these) && rempli(b.reformulation) && rempli(b.problematique) },
  { id: "plan", nom: "Construire le plan", atelier: 1, lecon: "developpement",
    fait: b => [b.axe1, b.axe2].every(a => rempli(a.titre) && a.args.filter(x => rempli(x.arg) && rempli(x.expl)).length >= 2) },
  { id: "introduction", nom: "Rédiger l'introduction", atelier: 2, lecon: "introduction", fait: b => rempli(b.intro) },
  { id: "exemples", nom: "Illustrer avec des œuvres", atelier: 3, lecon: "developpement",
    fait: b => [...b.axe1.args, ...b.axe2.args].filter(x => rempli(x.ex)).length >= 3 },
  { id: "conclusion", nom: "Rédiger la conclusion", atelier: 4, lecon: "conclusion", fait: b => rempli(b.conclusion) }
];

export function niveau(score: number) {
  return score >= 85 ? "Maîtrisé" : score >= 60 ? "Bien" : score >= 25 ? "En progrès" : "À découvrir";
}

export function maitrise(): Etape[] {
  const lues = read<string[]>("lecons-lues", []);
  const meilleurs = read<Record<string, number>>("quiz-meilleurs", {});
  const brouillons = cles("atelier:").map(k => ({ num: k.slice(8), b: lireBrouillon(k.slice(8)) })).filter(x => x.b && avancement(x.b) > 0);
  const enCours = brouillons.sort((a, b) => (b.b!.modifie ?? 0) - (a.b!.modifie ?? 0))[0]?.num;
  const oeuvres = new Set(historique().filter(v => v.t === "oeuvre").map(v => v.id)).size;
  const defis = Object.values(activite()).filter(j => j.includes("defi")).length;
  const total = apercu as Record<string, number>;
  return DEFS.map(d => {
    const lecture = lues.includes(d.lecon) ? 20 : 0;
    const quiz = total[d.lecon] ? 30 * Math.min(1, (meilleurs[d.lecon] ?? 0) / total[d.lecon]) : 0;
    const faits = brouillons.filter(x => d.fait(x.b!)).length;
    let pratique = 50 * Math.min(1, faits / 3);
    if (d.id === "exemples") pratique = 20 * Math.min(1, faits / 3) + 15 * Math.min(1, oeuvres / 12) + 15 * Math.min(1, defis / 5);
    const score = Math.round(lecture + quiz + pratique);
    const rang = LECONS.findIndex(l => l.id === d.lecon) + 1;
    const conseil = !lecture
      ? { texte: `Lis la leçon ${rang}`, lien: `#/cours/${d.lecon}` }
      : quiz < 24 && total[d.lecon]
        ? { texte: `Fais le quiz de la leçon ${rang}`, lien: `#/cours/${d.lecon}` }
        : d.id === "exemples" && oeuvres < 12
          ? { texte: "Lis d'autres fiches d'œuvres", lien: "#/oeuvres" }
          : { texte: "Entraîne-toi dans l'atelier", lien: enCours ? `#/entrainement/${enCours}${d.atelier ? `?etape=${d.atelier}` : ""}` : "#/entrainement" };
    return { id: d.id, nom: d.nom, atelier: d.atelier, lecon: d.lecon, score, niveau: niveau(score), conseil };
  });
}

/** Étape la plus faible, une fois que l'élève a commencé quelque chose (sinon rien à conseiller). */
export function etapeFaible(): Etape | null {
  const m = maitrise();
  if (m.every(e => e.score === 0)) return null;
  return [...m].sort((a, b) => a.score - b.score)[0];
}
