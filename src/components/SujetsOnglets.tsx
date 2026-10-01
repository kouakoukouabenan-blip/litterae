/** Les deux façons de travailler un sujet, côte à côte en haut de l'onglet Sujets : s'entraîner d'abord. */
export function SujetsOnglets({ actif }: { actif: "corriges" | "entrainement" }) {
  return (
    <nav class="segments" aria-label="Sujets">
      <a class="segment" href="#/entrainement" aria-current={actif === "entrainement" ? "page" : undefined}>M'entraîner</a>
      <a class="segment" href="#/sujets" aria-current={actif === "corriges" ? "page" : undefined}>Corrigés</a>
    </nav>
  );
}

/** Les deux parties de l'onglet Cours : apprendre la méthode, puis les outils pour l'appliquer. */
export function CoursOnglets({ actif }: { actif: "lecons" | "outils" }) {
  return (
    <nav class="segments" aria-label="Cours">
      <a class="segment" href="#/cours" aria-current={actif === "lecons" ? "page" : undefined}>Leçons</a>
      <a class="segment" href="#/outils" aria-current={actif === "outils" ? "page" : undefined}>Boîte à outils</a>
    </nav>
  );
}
