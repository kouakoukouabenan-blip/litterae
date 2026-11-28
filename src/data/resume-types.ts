// Résumé de texte : types et règles partagés. Le contenu (leçons, quiz, exercices) est payant :
// il arrive du serveur avec la clé d'accès (voir resume-donnees.ts). Ses sources sont dans le dépôt privé.
import type { BlocLecon, QuestionQuiz } from "./types";
import type { TexteEtudie } from "./cc-types";

export type BlocRS = BlocLecon | { texte: TexteEtudie } | { plie: { titre: string; liste: string[] } };
export interface LeconRS { id: string; partie: string; titre: string; duree: string; blocs: BlocRS[] }

/** Les quatre parties du cours, dans l'ordre de l'épreuve. */
export const PARTIES_RS = [
  { id: "comprendre", titre: "Comprendre le texte" },
  { id: "questions", titre: "Répondre aux questions" },
  { id: "resume", titre: "Rédiger le résumé" },
  { id: "production", titre: "La production écrite" }
];

export type Verbe = "étayer" | "réfuter" | "discuter";

/** Une idée essentielle : les phrases du texte qui la portent (début exact de chaque phrase), et sa reformulation. */
export interface IdeeRS { cles: string[]; reformulation: string }
export interface ArgumentPE { argument: string; explication: string; exemple: string }

export interface ProductionRS {
  verbe: Verbe;
  /** Le sujet tel qu'il est posé. */
  consigne: string;
  citation: string;
  theme: string;
  these: string;
  /** L'introduction rédigée avec la formule de la leçon. */
  intro: string;
  /** Corrigés : la production entière. Entraînement : seulement des pistes. */
  phrase?: string;
  arguments?: ArgumentPE[];
  transition?: string;
  bilan?: string;
  jugement?: string;
  ouverture?: string;
  pistes?: string[];
}

export interface ExerciceRS {
  id: string;
  titre: string;
  auteur: string;
  source: string;
  date?: string;
  /** Nombre de mots annoncé par le sujet. */
  mots: number;
  fraction: 4 | 3;
  texte: string;
  note?: string;
  corrige: boolean;
  /** « debut » : texte court de niveau 3e, pour apprendre la méthode (rangé en tête de liste). */
  niveau?: "debut";
  paratexte: string;
  theme: string;
  these: string;
  visee: string;
  enonciation: string;
  structure: [string, string][];
  questions: { q: string; reponse: string }[];
  idees: IdeeRS[];
  enchainement: string;
  resume: string;
  pe: ProductionRS;
}

export const NOMS_VERBES: Record<Verbe, string> = { "étayer": "Étayer", "réfuter": "Réfuter", "discuter": "Discuter" };

/** Tout le résumé de texte, tel que le serveur l'envoie. */
export interface DonneesRS { lecons: LeconRS[]; quiz: Record<string, QuestionQuiz[]>; exercices: ExerciceRS[] }

/** Découpe un paragraphe en phrases (point, point d'exclamation ou d'interrogation, puis majuscule). */
export function phrasesDe(texte: string): { par: number; phrase: string }[] {
  const out: { par: number; phrase: string }[] = [];
  texte.split("\n\n").forEach((par, p) => {
    // Pas de « lookbehind » : les anciens iPhone ne le comprennent pas.
    par.replace(/([.!?…][»)]?)\s+(?=[«"(A-ZÀÂÉÈÊÎÔÛÇ])/g, "$1\u0001").split("\u0001").map(s => s.trim()).filter(Boolean).forEach(phrase => out.push({ par: p, phrase }));
  });
  return out;
}

/** Les phrases du texte qui portent une idée essentielle, avec l'idée correspondante. */
export function phrasesEssentielles(ex: ExerciceRS) {
  const phrases = phrasesDe(ex.texte);
  const idee = new Map<number, number>();
  ex.idees.forEach((d, k) => d.cles.forEach(c => {
    const i = phrases.findIndex(x => x.phrase.startsWith(c));
    if (i >= 0) idee.set(i, k);
  }));
  return { phrases, idee };
}
