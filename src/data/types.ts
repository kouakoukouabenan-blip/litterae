export type Fonction = "Engagement" | "Esthétique" | "Évasion" | "Lyrique" | "Sociale";
export const FONCTIONS: Fonction[] = ["Engagement", "Esthétique", "Évasion", "Lyrique", "Sociale"];

export interface IdeeIllustration {
  texte: string;
  fonction: Fonction;
  argument: string;
}

export interface Oeuvre {
  id: string;
  titre: string;
  auteur: string;
  pays: string[];
  paysTexte: string;
  aires: string[];
  genre: string;
  precision: string | null;
  resume: string | null;
  fonctions: Fonction[];
  themes: string[];
  motsCles: string[];
  idees: IdeeIllustration[];
  /** Phrase prête à recopier dans une copie (fiches détaillées). */
  exemple?: string | null;
  /** Résumé complet et idées d'illustration rédigées ; sinon, fiche courte. */
  detaillee?: boolean;
  /** Classes où l'œuvre est au programme officiel en Côte d'Ivoire. */
  niveaux?: string[];
  /** Édition au programme. */
  editeur?: string | null;
  /** Fiche ouverte à tous (choisie par l'auteur). */
  libre?: boolean;
}

export interface Argument {
  titre: string;
  expl: string;
  ex: string;
}

/** Ce que le site public connaît d'un sujet payant : de quoi l'afficher dans la liste. */
export interface SujetApercu {
  num: string;
  auteur: string;
  citation: string;
  orientation: string;
}

export interface Sujet extends SujetApercu {
  compreh: {
    theme: string;
    these: string;
    reformulation: string;
    orientation: string;
    motscles: { mot: string; def: string }[];
  };
  intro: string;
  axe1: { titre: string; args: Argument[] };
  transition: string;
  axe2: { titre: string; args: Argument[] };
  conclu: string;
}

export type BlocLecon =
  | { p: string }
  | { h: string }
  | { liste: string[] }
  | { astuce: string }
  | { etapes: [string, string][] }
  | { sujet: string }
  | { def: [string, string][] }
  | { modele: string }
  | { plan: string[] }
  | { lien: { texte: string; href: string } };

export interface Lecon {
  id: string;
  titre: string;
  duree: string;
  blocs: BlocLecon[];
}

export interface Outils {
  formules: { title: string; desc: string; items: { label: string; text: string }[] }[];
  connecteurs: { titre: string; mots: string[] }[];
  orientations: { titre: string; mots: string[]; oppose: string }[];
}

/** Contenu payant renvoyé par le serveur après validation d'une clé. */
export interface ContenuPayant {
  version: number;
  oeuvres: Record<string, { resume: string | null; idees: IdeeIllustration[]; exemple?: string | null }>;
  sujets: Sujet[];
  /** Quiz par leçon (absent des clés activées avant l'ajout des quiz). */
  quiz?: Record<string, QuestionQuiz[]>;
}

export interface QuestionQuiz {
  q: string;
  choix: string[];
  bonne: number;
  pourquoi: string;
}
