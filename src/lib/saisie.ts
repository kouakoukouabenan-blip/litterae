import { useEffect, useRef, useState } from "preact/hooks";

/**
 * Champ de recherche qui attend que l'élève ait fini de taper (un court instant) avant de chercher.
 * Pendant ce temps, `attente` est vrai : la loupe s'anime pour montrer que l'appli cherche.
 * « Rechercher » sur le clavier lance tout de suite la recherche et ferme le clavier.
 */
export function useSaisieDifferee(valeur: string, valider: (v: string) => void, delai = 350) {
  const [texte, setTexte] = useState(valeur);
  const [attente, setAttente] = useState(false);
  const minuteur = useRef<number>();
  const derniere = useRef(valider);
  derniere.current = valider;
  // Valeur changée ailleurs (filtre effacé, lien ouvert) : le champ suit, sauf pendant la frappe.
  useEffect(() => { if (minuteur.current == null) setTexte(valeur); }, [valeur]);
  useEffect(() => () => clearTimeout(minuteur.current), []);

  const lancer = (v: string) => {
    clearTimeout(minuteur.current);
    minuteur.current = undefined;
    setAttente(false);
    derniere.current(v);
  };
  return {
    texte,
    attente,
    saisir(v: string) {
      setTexte(v);
      setAttente(true);
      clearTimeout(minuteur.current);
      minuteur.current = window.setTimeout(() => lancer(v), delai);
    },
    /** Bouton « effacer » : le champ se vide et la recherche aussi, sans attendre. */
    effacer() { setTexte(""); lancer(""); },
    /** Touche « Rechercher » / Entrée : on cherche maintenant et on range le clavier. */
    clavier(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (minuteur.current != null) lancer(texte);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };
}
