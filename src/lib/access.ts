import { licence } from "./licence";
import { oeuvre } from "./data";

// Offre gratuite validée par l'auteur : cours et outils libres, 3 sujets corrigés,
// 10 fiches d'œuvres choisies par l'auteur (liste dans le dépôt privé, gratuites.json).
export const FREE_SUBJECTS = 3;
export const FREE_WORKS = 10;
export const PRICE = "1 500 F";

/** Accès aux contenus payants : complet dès qu'une clé de licence a été validée sur l'appareil. */
export function useAccess() {
  const premium = !!licence();
  return {
    premium,
    canOpenSubject: (index: number) => premium || index < FREE_SUBJECTS,
    canOpenWork: (id: string) => premium || !!oeuvre(id)?.libre
  };
}
