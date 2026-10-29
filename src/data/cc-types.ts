// Commentaire composé : types et parties visibles sans clé (définitions, sources).
// Le contenu payant (leçons, corrigés, textes, figures, tonalités, genres, quiz) vient du serveur avec la clé : voir cc-donnees.ts.
import type { BlocLecon, QuestionQuiz } from "./types";

export interface TexteEtudie {
  id: string;
  titre: string;
  auteur: string;
  /** Œuvre et date. */
  source: string;
  /** Vers : strophes séparées par une ligne vide. Prose : paragraphes séparés par une ligne vide. */
  texte: string;
  prose?: boolean;
  /** Dialogue de théâtre : chaque ligne commence par « Personnage : ». */
  theatre?: boolean;
  /** Phrase de présentation placée avant le texte. */
  chapeau?: string;
  /** Note de bas de texte (mot expliqué). */
  note?: string;
  consigne: string;
  /** Année où le texte est tombé au bac en Côte d'Ivoire. */
  bac?: number;
  /** Genre affiché dans les filtres ; sinon déduit : théâtre, prose = récit, vers = poésie. */
  genre?: GenreCC;
}

export const GENRES_CC = ["Poésie", "Récit", "Théâtre", "Argumentation", "Fable"] as const;
export type GenreCC = typeof GENRES_CC[number];
export const genreDe = (t: TexteEtudie): GenreCC => t.genre ?? (t.theatre ? "Théâtre" : t.prose ? "Récit" : "Poésie");

/** Blocs d'une leçon : ceux de la dissertation, plus un texte étudié et une liste d'exemples repliée. */
export type BlocCC = BlocLecon | { texte: TexteEtudie } | { plie: { titre: string; liste: string[] } };

export interface LeconCC { id: string; titre: string; duree: string; blocs: BlocCC[] }

export interface CorrigeCC extends TexteEtudie {
  intro: string;
  /** Les centres d'intérêt ; un seul sans titre quand le corrigé ne les sépare pas. */
  axes: { titre: string; paragraphes: string[] }[];
  transition?: string;
  conclusion: string;
}

export interface SujetCC extends TexteEtudie {
  /** Pistes de lecture, cachées tant que l'élève ne les demande pas. */
  pistes: string[];
}

export interface Indice { c: string; a: string; i: string }
export interface SousTitre { titre: string; indices: Indice[] }

export interface EtudeCC {
  paratexte: [string, string][];
  /** Hypothèses tirées du paratexte. */
  attentes: string;
  passive: string;
  active: string;
  type: string;
  tonalite: string;
  theme: string;
  idee: string;
  centres: { titre: string; sousTitres: SousTitre[] }[];
  /** Rédaction refaite quand celle des annales ne suit pas les sous-titres. */
  redaction?: { intro?: string; axes: { titre: string; paragraphes: string[] }[]; transition?: string; conclusion?: string };
}

export interface Figure {
  nom: string;
  /** Définition, en une ou deux phrases. */
  definition: string;
  /** Explications plus longues, repliées derrière « En savoir plus ». */
  details?: string[];
  exemples: string[];
  retenir: string;
}

export interface Famille {
  id: string;
  titre: string;
  intro: string;
  figures: Figure[];
  exercices: { titre: string; consigne: string; phrases: string[] }[];
}

export const FIGURES_SOURCE = "Cours de Renfo Français, collection Version simplifiée";

export const FIGURES_DEFINITION = {
  phrases: ["Phrase 1 : Je t'aime beaucoup.", "Phrase 2 : Dans le royaume de mon cœur, c'est toi la reine."],
  texte: [
    "Laquelle de ces deux phrases trouvez-vous agréable à entendre ? La deuxième, n'est-ce pas ? Avez-vous remarqué que les deux phrases signifient exactement la même chose ?",
    "Le narrateur fait, dans les deux cas, une déclaration d'amour. La raison pour laquelle la deuxième phrase semble agréable à entendre est sans doute l'utilisation des images. Par exemple, l'amour est symbolisé par le cœur dans cette phrase. Le cœur lui-même a une image de royaume. Celui qui aime devient un roi et celle qui est aimée est une reine.",
    "C'est cette manière d'utiliser la langue de façon imagée de sorte à l'embellir qu'on appelle figure de style."
  ],
  retenir: "On appelle figure de style une manière d'utiliser la langue de façon imagée dans le but de l'embellir."
};

export interface Tonalite {
  id: string;
  nom: string;
  /** Adjectif seul, pour retrouver les exercices corrigés de cette tonalité. */
  adjectif: string;
  definition: string;
  /** Comment la reconnaître. */
  indices: string[];
  /** Thèmes fréquents, quand le document en donne. */
  themes?: string;
  retenir: string;
  /** Ce que la tonalité apporte au commentaire composé. */
  commentaire: string;
  /** Exemples de centres d'intérêt qu'elle peut donner. */
  centres: string[];
  /** Phrase toute faite pour l'introduction. */
  formule: string;
  exemple: {
    titre: string;
    auteur: string;
    source: string;
    texte: string;
    prose?: boolean;
    chapeau?: string;
    /** Ce qu'on repère dans le texte. */
    reperes: string[];
    /** Remarque sur le choix du texte. */
    remarque?: string;
  };
}

export const TONALITES_SOURCE = "Cours de Renfo Français, collection Version simplifiée";

export const TONALITE_DEFINITION = {
  texte: [
    "En employant différents procédés d'écriture et en mettant en valeur certains thèmes, l'écrivain peut provoquer chez le lecteur ou le spectateur diverses émotions : le rire, la tristesse, l'angoisse, la terreur, etc.",
    "La tonalité littéraire est donc le ton que prend un texte. C'est l'impression qui se dégage lorsqu'on lit un texte.",
    "La tonalité d'un texte ne dépend pas forcément de son genre : un roman peut être comique et pathétique, tandis qu'un poème peut avoir une tonalité réaliste. Dans un même texte, on peut rencontrer plusieurs tonalités, mais c'est la plus dominante qu'il faut choisir.",
    "Pour connaître la tonalité d'un texte, il faut savoir lire correctement. Si le lecteur titube sur des mots, il lui sera difficile d'identifier la tonalité d'un texte."
  ],
  retenir: "La tonalité littéraire d'un texte est l'impression générale qui se dégage de la lecture d'un texte."
};

/** À quoi sert la tonalité dans le commentaire composé. */
export const TONALITE_COMMENTAIRE = [
  { titre: "Quand tu lis le texte", texte: "Demande-toi quelle émotion le texte fait naître en toi : pitié, rire, peur, admiration, colère… Cette émotion te met sur la piste de la tonalité. Note-la dans l'étape « Comprendre » de l'atelier." },
  { titre: "Dans l'introduction", texte: "Tu nommes la tonalité dominante en présentant le texte : « Dans ce poème lyrique… », « Dans cet extrait à la tonalité satirique… »." },
  { titre: "Dans le développement", texte: "La tonalité te donne souvent un centre d'intérêt, et ses marques (champ lexical, pronoms, ponctuation, figures) deviennent des indices à analyser." },
  { titre: "Attention", texte: "Nommer la tonalité ne suffit pas : prouve-la toujours par des indices tirés du texte, et dis l'effet qu'ils produisent sur le lecteur." }
];

/** Test : des extraits des textes de l'application, à rattacher à leur tonalité dominante. */
export interface QuestionTonalite {
  /** Identifiant du texte (exercice corrigé ou texte d'entraînement) d'où vient l'extrait. */
  texte: string;
  extrait: string;
  bonne: string;
  choix: string[];
  pourquoi: string;
}

export interface Notion { mot: string; sens: string }

export interface GenreLitteraire {
  id: string;
  nom: string;
  /** Une ligne sous le titre. */
  resume: string;
  definition: string[];
  notions: { titre: string; liste: Notion[] }[];
  sousGenres: Notion[];
  /** Ce qu'il faut regarder dans un commentaire de ce genre. */
  commentaire: string[];
  exercice: { texte: string; questions: { q: string; r: string }[] };
}

export const GENRES_SOURCE = "Cours de Renfo Français, collection Version simplifiée";

export const GENRE_DEFINITION = {
  texte: "Un genre littéraire est une famille dans laquelle on range un texte selon sa forme, ses thèmes et son contenu.",
  familles: [
    { mot: "Le genre narratif", sens: "Il raconte une histoire, vraie ou inventée, par la voix d'un narrateur : roman, nouvelle, conte, légende, épopée, biographie, autobiographie, mémoires." },
    { mot: "Le genre poétique", sens: "Il est le plus souvent écrit en vers et joue à la fois sur le rythme, la musique des mots et l'expression des sentiments." },
    { mot: "Le genre théâtral", sens: "Il est écrit sous forme de dialogue, pour être joué sur une scène ; il traite souvent de sujets de société." },
    { mot: "Le genre argumentatif", sens: "Il défend clairement une position et cherche à l'imposer au lecteur : essais, discours, pamphlets." },
    { mot: "Le genre épistolaire", sens: "De « épître », qui veut dire lettre : il regroupe les échanges de lettres." }
  ],
  retenir: "Au bac, le texte à commenter est presque toujours un extrait de roman, un poème ou une scène de théâtre. Reconnaître le genre te dit quoi observer."
};

/** À quoi sert le genre dans le commentaire composé. */
export const GENRE_COMMENTAIRE = [
  { titre: "Dans l'introduction", texte: "Tu situes le texte : « Ce poème extrait du recueil… », « Cet extrait du roman… », « Cette scène de la pièce… ». Nommer le bon genre montre au correcteur que tu as compris ce que tu lis." },
  { titre: "Dans le développement", texte: "Chaque genre a ses outils : le narrateur et le cadre dans un récit, les répliques et les didascalies au théâtre, les vers, les rimes et les strophes en poésie. Ce sont des indices à analyser, pas seulement à nommer." },
  { titre: "Genre et tonalité", texte: "Le genre, c'est la forme du texte ; la tonalité, c'est l'impression qu'il produit. Un roman peut être comique ou pathétique, un poème peut être lyrique ou satirique." }
];

/** Tout le contenu du commentaire composé, tel que le serveur l'envoie avec la clé. */
export interface DonneesCC {
  lecons: LeconCC[];
  corriges: CorrigeCC[];
  sujets: SujetCC[];
  etudes: Record<string, EtudeCC>;
  familles: Famille[];
  corrections: Record<string, string[][]>;
  formules: { moment: string; formules: string[] }[];
  verbes: string[];
  tonalites: Tonalite[];
  testTonalites: QuestionTonalite[];
  genres: GenreLitteraire[];
  quiz: Record<string, QuestionQuiz[]>;
}
