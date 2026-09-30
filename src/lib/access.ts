import { licence } from "./licence";
import { OEUVRES, oeuvre } from "./data";

// Offre gratuite validée par l'auteur : cours et outils libres, 3 sujets corrigés,
// fiches d'œuvres choisies par l'auteur (10 au départ, nombre libre depuis le tableau de bord).
export const FREE_SUBJECTS = 3;
export const FREE_WORKS = OEUVRES.filter(w => w.libre).length || 10;
/** Promotion de lancement à 1 000 F jusqu'au 31 octobre 2026 inclus, puis 1 500 F (décision d'Atikan). */
export const PRICE = Date.now() < Date.UTC(2026, 10, 1) ? "1 000 F" : "1 500 F";

/** Accès aux contenus payants : complet dès qu'une clé de licence a été validée sur l'appareil. */
export function useAccess() {
  const premium = !!licence();
  return {
    premium,
    canOpenSubject: (index: number) => premium || index < FREE_SUBJECTS,
    canOpenWork: (id: string) => premium || !!oeuvre(id)?.libre
  };
}
