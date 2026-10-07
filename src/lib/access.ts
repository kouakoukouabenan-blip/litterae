import { licence } from "./licence";
import { FICHES_GRATUITES, fichesGratuites, useFichesOuvertes } from "./fiches";
import { contenuLibre, type Prix } from "./libre";

// Offre gratuite validée par l'auteur : cours et outils libres, 3 sujets corrigés,
// 10 fiches d'œuvres au choix de l'élève (comptées sur l'appareil, comme les mots du dictionnaire).
export const FREE_SUBJECTS = 3;
export const FREE_WORKS = FICHES_GRATUITES;
/** Prix de départ, utilisé tant que l'appli n'a pas reçu celui réglé dans le tableau de bord. */
const PRIX_DEPART: Prix = { normal: 1500, promo: 1000, jusqua: "2026-10-31" };
const francs = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} F`;
function prixDuJour() {
  const p = contenuLibre()?.prix ?? PRIX_DEPART;
  const d = new Date();
  const aujourdhui = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const promo = p.promo != null && (!p.jusqua || aujourdhui <= p.jusqua);
  return { prix: francs(promo ? p.promo! : p.normal), avant: promo ? francs(p.normal) : null };
}
const PRIX = prixDuJour();
/** Jours restants avant la fin de la promo (0 = dernier jour), ou null sans promo datée. */
export function finPromoDans(): number | null {
  const p = contenuLibre()?.prix ?? PRIX_DEPART;
  if (p.promo == null || !p.jusqua) return null;
  const d = new Date();
  const fin = new Date(`${p.jusqua}T12:00:00`).getTime(), midi = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
  const n = Math.round((fin - midi) / 864e5);
  return n >= 0 ? n : null;
}
/** Date de fin de la promo (« 31 octobre »), ou null. */
export function finPromo(): string | null {
  const p = contenuLibre()?.prix ?? PRIX_DEPART;
  return p.promo != null && p.jusqua ? new Date(`${p.jusqua}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;
}
export const PRIX_NORMAL = francs((contenuLibre()?.prix ?? PRIX_DEPART).normal);
/** Prix de l'accès complet, réglé par Atikan dans le tableau de bord (Élèves › Prix). */
export const PRICE = PRIX.prix;
/** Prix normal barré pendant une promo, sinon null. */
export const PRIX_AVANT = PRIX.avant;

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
