import { contenuLibre } from "./libre";
import { read, write } from "./storage";
import { IDENTITES, IDENTITE_PAR_DEFAUT, type Identite } from "./identite-defaut";

export type { Identite };
const valide = (x: unknown): x is Identite => IDENTITES.includes(x as Identite);

/**
 * Identité visuelle en vigueur, par ordre de priorité :
 * 1. le choix fait sur ce téléphone (Mon espace, site d'essai seulement : pour comparer) ;
 * 2. le réglage du tableau de bord, s'il existe (champ « identite » du contenu libre) ;
 * 3. l'interrupteur IDENTITE_PAR_DEFAUT.
 * Le même calcul est fait très tôt dans index.html, avant l'écran d'ouverture.
 */
export function identiteActive(): Identite {
  const ici = read<Identite | null>("identite", null);
  if (valide(ici)) return ici;
  const tdb = (contenuLibre() as { identite?: string } | null)?.identite;
  if (valide(tdb)) return tdb;
  return IDENTITE_PAR_DEFAUT;
}

const COULEUR_BARRE: Record<Identite, string> = { nouvelle: "#26285E", "nouvelle-afrique": "#0F3D2E", ancienne: "#0F3D2E" };
const FAVICON: Record<Identite, string> = { nouvelle: "./identite/favicon.svg", "nouvelle-afrique": "./identite-afrique/favicon.svg", ancienne: "./favicon.svg" };

/** Pose la classe sur <html> (toute la nouvelle identité est rangée sous `.identite-nouvelle`), la couleur de barre et l'icône d'onglet. */
export function appliquerIdentite(id: Identite = identiteActive()) {
  const html = document.documentElement;
  html.classList.toggle("identite-nouvelle", id !== "ancienne");
  html.classList.toggle("couleurs-afrique", id === "nouvelle-afrique");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COULEUR_BARRE[id]);
  document.querySelector('link[rel="icon"][type="image/svg+xml"]')?.setAttribute("href", FAVICON[id]);
}

/** Choix fait sur ce téléphone (null : suivre le réglage général). */
export function choisirIdentite(id: Identite | null) {
  write("identite", id);
  appliquerIdentite();
}
export const identiteChoisieIci = () => read<Identite | null>("identite", null);

// Le tableau de bord a peut-être changé le réglage : on le reprend quand le contenu libre est actualisé.
window.addEventListener("contenu-libre", () => appliquerIdentite());
