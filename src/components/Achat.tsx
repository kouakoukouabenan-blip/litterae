import { PRICE } from "../lib/access";
import { ACHAT_URL } from "../lib/site";

/** Lien vers la page du produit sur Chariow, où l'on achète la clé d'accès. */
export function AchatLien({ label = `Acheter une clé, ${PRICE}`, class: cls = "link-strong" }: { label?: string; class?: string }) {
  if (!ACHAT_URL) return null;
  return <a class={cls} href={ACHAT_URL} target="_blank" rel="noopener">{label}</a>;
}
