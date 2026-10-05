// Leçons reprises de la partie 1 du guide « Dissertation Version Facile » : le titre seulement.
// Le texte est sur le serveur (litterae-contenu/contenu/lecons.json) : 5 leçons gratuites au choix,
// demandées une à une, et toutes avec l'accès complet.
import type { Lecon } from "./types";

export const LECONS: Lecon[] = [
 { id: "definition", titre: "Qu'est-ce que la dissertation littéraire ?", duree: "4 min", blocs: [] },
 { id: "comprendre", titre: "Comprendre le sujet", duree: "8 min", blocs: [] },
 { id: "introduction", titre: "Rédiger l'introduction", duree: "7 min", blocs: [] },
 { id: "developpement", titre: "Rédiger le développement", duree: "9 min", blocs: [] },
 { id: "conclusion", titre: "Rédiger la conclusion", duree: "5 min", blocs: [] }
];
