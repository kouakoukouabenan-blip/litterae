/**
 * L'INTERRUPTEUR UNIQUE de l'identité visuelle.
 * « nouvelle » : l'identité « La Synthèse » (encre indigo, terracotta, papier ; Space Grotesk, Inter, Fraunces).
 * « nouvelle-afrique » : la même identité avec les couleurs de l'ancien design (vert profond, terre cuite, ocre, crème).
 * « ancienne » : le design « Couleurs d'Afrique » (vert profond, terre cuite, ocre, frise).
 * Changer cette ligne puis republier suffit à revenir en arrière. Lu aussi par vite.config.ts (icônes, manifeste),
 * donc ce fichier ne doit rien importer.
 */
export type Identite = "nouvelle" | "nouvelle-afrique" | "ancienne";
export const IDENTITES: Identite[] = ["nouvelle-afrique", "nouvelle", "ancienne"];
export const IDENTITE_PAR_DEFAUT: Identite = "nouvelle-afrique";
