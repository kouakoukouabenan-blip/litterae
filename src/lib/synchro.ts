import type { ContenuPayant } from "../data/types";
import { contenuEnRetard } from "./data";
import { actualiserContenuLibre, contenuLibre } from "./libre";
import { licence, rechargerContenu } from "./licence";
import { rafraichirFiches } from "./fiches";
import { rafraichirLecons } from "./lecons-libres";
import { rafraichirMots } from "./dictionnaire";

/**
 * Le contenu payant gardé sur l'appareil ne suit pas les derniers changements du tableau de bord
 * (leçon ou fiche ajoutée, texte corrigé) : son numéro diffère de celui du contenu libre.
 */
const enRetard = (c: ContenuPayant) => {
  const libre = contenuLibre();
  return contenuEnRetard(c) || (!!libre && c.revision !== libre.revision);
};

const ouverture = Date.now();
let enCours: Promise<boolean> | null = null, derniere = 0, relanceDemandee = false;

const saisieEnCours = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

/**
 * Les écrans lisent le contenu au lancement : la page est relancée pour afficher les nouveautés.
 * Juste après l'ouverture, tout de suite ; plus tard, au prochain changement d'écran,
 * pour ne jamais couper l'élève en pleine lecture ou en pleine saisie.
 */
function relancer(maintenant: boolean) {
  if (maintenant || (Date.now() - ouverture < 8000 && !saisieEnCours())) return location.reload();
  if (relanceDemandee) return;
  relanceDemandee = true;
  window.addEventListener("hashchange", () => location.reload(), { once: true });
}

/**
 * Va chercher les nouveautés publiées depuis le tableau de bord (liste des leçons, fiches, sujets…)
 * et, pour un élève qui a l'accès complet, le texte payant qui va avec.
 * Appelé à l'ouverture de l'appli et chaque fois que l'élève y revient ;
 * `force` : demandé par l'élève (bouton), la page est relancée tout de suite.
 */
export function synchroniser(force = false): Promise<boolean> {
  if (enCours) return enCours;
  if (!navigator.onLine || (!force && Date.now() - derniere < 60_000)) return Promise.resolve(false);
  derniere = Date.now();
  enCours = (async () => {
    let change = await actualiserContenuLibre();
    const l = licence();
    // Sans clé : les fiches, leçons et mots déjà ouverts suivent les corrections de l'éditeur.
    if (change && !l) await Promise.all([rafraichirFiches(), rafraichirLecons(), rafraichirMots()]);
    if (l && enRetard(l.contenu) && (await rechargerContenu())) {
      // Rechargé mais toujours en retard (serveur pas encore à jour) : pas de relance en boucle.
      const n = licence();
      if (n && !enRetard(n.contenu)) change = true;
    }
    if (change) relancer(force);
    return change;
  })().catch(() => false).finally(() => { enCours = null; });
  return enCours;
}
