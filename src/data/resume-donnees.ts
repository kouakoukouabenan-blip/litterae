import type { DonneesRS, ExerciceRS } from "./resume-types";
import apercu from "./resume-apercu.json";
import { licence } from "../lib/licence";

// Le contenu du résumé de texte arrive du serveur avec la clé d'accès (contenu payant), comme le commentaire composé.
// Sans clé, le site n'a que l'aperçu : les titres des leçons et des exercices, pour afficher les listes avec un cadenas.
// La page Outils (calculateur de mots et aide-mémoire) reste ouverte à tous.
export const RS: DonneesRS = licence()?.contenu.resume ?? (apercu as unknown as DonneesRS);

/** Le résumé de texte complet est sur l'appareil (clé activée et contenu reçu). */
export const RS_COMPLET = !!licence()?.contenu.resume;

export const LECONS_RS = RS.lecons;
export const QUIZ_RS = RS.quiz;
export const EXERCICES_RS = RS.exercices;
export const exerciceRS = (id: string): ExerciceRS | undefined => EXERCICES_RS.find(e => e.id === id);
