/** Les deux façons de travailler un sujet, côte à côte en haut de l'onglet Sujets. */
export function SujetsOnglets({ actif }: { actif: "corriges" | "entrainement" }) {
  return (
    <nav class="segments" aria-label="Sujets">
      <a class="segment" href="#/sujets" aria-current={actif === "corriges" ? "page" : undefined}>Corrigés</a>
      <a class="segment" href="#/entrainement" aria-current={actif === "entrainement" ? "page" : undefined}>M'entraîner</a>
    </nav>
  );
}
