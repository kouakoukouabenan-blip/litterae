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
  /** Lien vers le livre (lecture, téléchargement ou site officiel), ajouté depuis le tableau de bord. */
  lien?: string | null;
  /** Texte du bouton : « Voir le livre », « Télécharger le livre » ou « Site officiel du livre ». */
  lienType?: "voir" | "telecharger" | "site" | null;
  /** Fiche ouverte à tous (choisie par l'auteur). */
  libre?: boolean;
  /** Fiche ajoutée depuis le tableau de bord. */
  ajout?: boolean;
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
  /** Idée du sujet en quelques mots (« Dénoncer l'injustice »). */
  notion?: string;
  /** Thèmes des œuvres qui peuvent l'illustrer (mêmes mots que les thèmes des fiches). */
  themes?: string[];
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
  /** Vide tant que le texte n'est pas sur l'appareil (accès complet ou leçon gratuite ouverte). */
  blocs: BlocLecon[];
}

export interface Outils {
  formules: { title: string; desc: string; items: { label: string; text: string }[] }[];
  connecteurs: { titre: string; mots: string[] }[];
  orientations: { titre: string; mots: string[]; oppose: string }[];
}

/** Mot du dictionnaire tel que publié dans le site : sans son sens (contenu payant). */
export interface MotDico {
  mot: string;
  nature: string;
  /** Fonctions reconnues, pour les filtres et les couleurs. */
  fonctions?: Fonction[];
  /** Mots de la définition en vrac, triés : la recherche les trouve sans que le texte soit publié. */
  cles?: string;
}

/** Une entrée complète du dictionnaire littéraire (mots des sujets de dissertation). */
export interface EntreeDico extends MotDico {
  sens: string;
  /** Indication de fonction telle que rédigée par l'auteur (avec ses nuances). */
  fonction?: string;
  note?: string;
  oeuvres?: string[];
  exemples?: string[];
}

export interface Dictionnaire {
  guide: { titre: string; blocs: (string | string[])[] }[];
  entrees: MotDico[];
}

/** Contenu payant renvoyé par le serveur après validation d'une clé. */
export interface ContenuPayant {
  version: number;
  /** Numéro des modifications faites depuis le tableau de bord (le même que celui du contenu libre). */
  revision?: number;
  oeuvres: Record<string, { resume: string | null; idees: IdeeIllustration[]; exemple?: string | null }>;
  sujets: Sujet[];
  /** Quiz par leçon (absent des clés activées avant l'ajout des quiz). */
  quiz?: Record<string, QuestionQuiz[]>;
  /** Dictionnaire littéraire complet (absent des clés activées avant son ajout). */
  dictionnaire?: EntreeDico[];
  /** Texte de toutes les leçons : celles du guide et celles ajoutées ou modifiées depuis le tableau de bord. */
  lecons?: Record<string, BlocLecon[]>;
}

export interface QuestionQuiz {
  q: string;
  choix: string[];
  bonne: number;
  pourquoi: string;
}
