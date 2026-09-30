import { PRICE } from "../lib/access";
import { ACHAT_URL } from "../lib/site";
import { toast } from "./Toast";

/** Lien vers la page du produit sur Chariow, où l'on achète la clé d'accès. */
export function AchatLien({ label = `Acheter une clé, ${PRICE}`, class: cls = "link-strong" }: { label?: string; class?: string }) {
  if (!ACHAT_URL) return null;
  return <a class={cls} href={ACHAT_URL} target="_blank" rel="noopener">{label}</a>;
}

/** Sans connexion, la page Chariow s'ouvrirait sur un écran noir : on prévient l'élève à la place. */
export function prevenirAchatHorsLigne() {
  document.addEventListener("click", e => {
    const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || !ACHAT_URL || !a.href.startsWith(ACHAT_URL) || navigator.onLine) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    toast("Pas de connexion internet. Reconnecte-toi pour acheter l'accès.");
  }, true);
}
