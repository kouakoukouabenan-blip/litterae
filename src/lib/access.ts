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

/**
 * Durée de l'accès acheté aujourd'hui, réglée dans le tableau de bord : null tant que les clés sont sans limite.
 * Les textes de vente en dépendent (« pour 1 an » au lieu de « payés une seule fois »).
 */
function dureeDuJour() {
  const d = contenuLibre()?.duree;
  if (!d?.depuis || !d.mois) return null;
  const t = new Date();
  const aujourdhui = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  if (aujourdhui < d.depuis) return null;
  return d.mois === 12 ? "1 an" : d.mois % 12 === 0 ? `${d.mois / 12} ans` : `${d.mois} mois`;
}
/** « 1 an », « 2 ans »… ou null si l'accès acheté aujourd'hui est sans limite. */
export const DUREE = dureeDuJour();
/** Jour à partir duquel les clés achetées ont une durée (« 1er décembre 2026 »), ou null. */
export const DUREE_DEPUIS = DUREE ? new Date(`${contenuLibre()!.duree!.depuis}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;
/** « pour 1 an » ou « payés une seule fois », après le prix. */
export const PAYE = DUREE ? `pour ${DUREE}` : "payés une seule fois";

/** « 12 mars 2027 » */
export const dateFin = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
/** Jours restants avant la fin de l'accès (arrondi au-dessus). */
export const joursAvant = (t: number) => Math.ceil((t - Date.now()) / 864e5);

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
