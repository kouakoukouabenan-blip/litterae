/**
 * Compte les mots comme au bac : toute lettre ou suite de lettres séparée de la suivante par un blanc,
 * une apostrophe ou un trait d'union compte pour un mot (« l'école » = 2, « c'est-à-dire » = 4) ;
 * un nombre écrit en chiffres ou un sigle compte pour un mot.
 */
export function compterMots(texte: string): number {
  return texte.split(/[\s'’\-–]+/).filter(m => /[\p{L}\p{N}]/u.test(m)).length;
}
