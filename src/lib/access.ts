import { licence } from "./licence";
import { FICHES_GRATUITES, fichesGratuites, useFichesOuvertes } from "./fiches";

// Offre gratuite validée par l'auteur : cours et outils libres, 3 sujets corrigés,
// 10 fiches d'œuvres au choix de l'élève (comptées sur l'appareil, comme les mots du dictionnaire).
export const FREE_SUBJECTS = 3;
export const FREE_WORKS = FICHES_GRATUITES;
/** Promotion de lancement à 1 000 F jusqu'au 31 octobre 2026 inclus, puis 1 500 F (décision d'Atikan). */
export const PRICE = Date.now() < Date.UTC(2026, 10, 1) ? "1 000 F" : "1 500 F";

/** Accès aux contenus payants : complet dès qu'une clé de licence a été validée sur l'appareil. */
export function useAccess() {
  const premium = !!licence();
  const ouvertes = useFichesOuvertes();
  const nbOuvertes = Object.keys(ouvertes).length;
  const restantes = premium ? Infinity : Math.max(0, fichesGratuites() - nbOuvertes);
  return {
    premium,
    canOpenSubject: (index: number) => premium || index < FREE_SUBJECTS,
    /** Fiche déjà ouverte gratuitement sur cet appareil. */
    workOpened: (id: string) => !premium && !!ouvertes[id],
    /** L'élève peut lire la fiche : accès complet, fiche déjà ouverte, ou fiches gratuites restantes. */
    canOpenWork: (id: string) => premium || !!ouvertes[id] || restantes > 0,
    nbOuvertes,
    restantes
  };
}
