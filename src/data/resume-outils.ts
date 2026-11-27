// Aides du résumé de texte, partagées par la page Outils et l'atelier.

import type { Verbe } from "./resume-types";

export const CONNECTEURS_RS: [string, string[]][] = [
  ["Ajouter une idée", ["de plus", "en outre", "par ailleurs", "également", "d'abord", "ensuite", "enfin"]],
  ["Opposer", ["mais", "pourtant", "cependant", "toutefois", "en revanche"]],
  ["Concéder", ["certes… mais", "il est vrai que… mais", "bien que", "malgré"]],
  ["Donner une cause", ["car", "en effet", "parce que", "puisque", "grâce à"]],
  ["Tirer une conséquence", ["donc", "ainsi", "c'est pourquoi", "par conséquent", "aussi"]],
  ["Prouver", ["la preuve", "en témoigne", "comme le montre"]],
  ["Conclure", ["en somme", "finalement", "en définitive"]]
];

/** Connecteurs proposés entre deux idées, à l'étape « Enchaîner » de l'atelier. */
export const CONNECTEURS_ATELIER = ["Mais", "Pourtant", "Cependant", "Toutefois", "Certes", "En effet", "Car", "Donc", "Ainsi", "C'est pourquoi", "Par conséquent", "De plus", "Par ailleurs", "D'abord", "Ensuite", "Enfin", "En somme"];

export const TECHNIQUES_RS: [string, string][] = [
  ["Un synonyme qui convient au contexte", "Pas n'importe quel synonyme : celui qui garde le sens de la phrase."],
  ["Un verbe devient un nom", "« Les prix ont augmenté, et cela inquiète » → « La hausse des prix inquiète »."],
  ["Un complément du nom devient un adjectif, ou l'inverse", "« La vie de la ville » → « La vie urbaine »."],
  ["Une relative devient un adjectif ou un groupe nominal", "« Un élève qui ne se fatigue jamais » → « Un élève infatigable »."],
  ["Un long groupe de mots devient un seul mot", "« Ceux qui ne savent ni lire ni écrire » → « Les analphabètes »."],
  ["Une liste devient un mot qui la regroupe", "« Le breton, le provençal, le bambara » → « Les langues locales »."],
  ["Une phrase complexe devient une ou deux phrases simples", "On garde l'idée, on enlève les détours."],
  ["Deux phrases deviennent une seule", "« Tous les peuples ont une tradition orale. Elle est à la base des sociétés. » → « Universelle, la tradition orale est le socle des sociétés. »"],
  ["La négation devient affirmation, ou l'inverse", "« Ce n'est pas facile » → « C'est difficile »."],
  ["Une question ou une citation devient une affirmation", "« Y aurait-il eu d'écriture ? » → « L'écriture n'aurait pas existé »."]
];

export const DEBUTS_REPONSES: [string, string][] = [
  ["Le thème", "« Le thème abordé dans ce texte est… »"],
  ["La thèse", "« La thèse de l'auteur est la suivante : … »"],
  ["La visée argumentative", "« La visée argumentative de l'auteur est que… »"],
  ["Un mot ou une expression", "« Dans ce texte, l'expression « … » désigne… »"],
  ["Une phrase à relever", "« La phrase qui exprime la thèse de l'auteur est : « … » »"]
];

export const INTRO_PE = "Dans son texte intitulé « … », extrait de …, paru en …, … affirme : « … ». Dans notre analyse, nous allons … cette affirmation.";

export const PHRASES_INTRO_PE: Record<Verbe, string[]> = {
  "étayer": ["La thèse selon laquelle … se justifie à plusieurs niveaux.", "L'affirmation de l'auteur est fondée à plus d'un titre.", "Il est juste de dire que…, et plusieurs raisons le prouvent."],
  "réfuter": ["Il n'est pas justifiable de dire que…", "Il n'est pas loisible d'affirmer que…", "La thèse selon laquelle … ne résiste pas à l'examen."],
  "discuter": ["La thèse selon laquelle … est juste à bien des égards, mais elle a ses limites.", "S'il est vrai que…, il faut reconnaître que cette affirmation ne dit pas tout."]
};

export const BILANS_PE: Record<Verbe, string> = {
  "étayer": "Au terme de notre analyse, il apparaît que la thèse de l'auteur est justifiée : …",
  "réfuter": "Au terme de notre analyse, il apparaît que la thèse de l'auteur ne résiste pas à l'examen : …",
  "discuter": "Au terme de notre analyse, il apparaît que la thèse de l'auteur n'est vraie qu'en partie : …"
};

export const JUGEMENT_PE = "Pour notre part, nous pensons que…";
export const TRANSITION_PE = "Cependant, cette thèse a ses limites.";
