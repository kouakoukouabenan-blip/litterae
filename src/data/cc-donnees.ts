import type { DonneesCC } from "./cc-types";
import apercu from "./cc-apercu.json";
import { licence } from "../lib/licence";
import { contenuLibre } from "../lib/libre";

// Le contenu du commentaire composé arrive du serveur avec la clé d'accès (contenu payant).
// Sans clé, le site n'a que l'aperçu : les titres, auteurs et sources, pour afficher les listes avec un cadenas.
// Lu une fois au lancement : après l'activation d'une clé ou l'arrivée d'un nouveau contenu, la page est relancée.
// Les titres changés ou ajoutés depuis le tableau de bord arrivent avec le contenu libre.
function apercuAJour(): DonneesCC {
  const a = apercu as unknown as DonneesCC, maj = contenuLibre()?.commentaire;
  if (!maj) return a;
  const fusion = <T extends { id: string }>(liste: T[], changes: T[] = []) =>
    [...liste.map(x => changes.find(c => c.id === x.id) ?? x), ...changes.filter(c => !liste.some(x => x.id === c.id))];
  return { ...a, lecons: fusion(a.lecons, maj.lecons), corriges: fusion(a.corriges, maj.corriges), sujets: fusion(a.sujets, maj.sujets) };
}
export const CC: DonneesCC = licence()?.contenu.commentaire ?? apercuAJour();

/** Le commentaire composé complet est sur l'appareil (clé activée et contenu reçu). */
export const CC_COMPLET = !!licence()?.contenu.commentaire;
/** Pour les écrans du commentaire composé : l'accès complet compte seulement si le contenu est arrivé. */
export const useAccesCC = () => ({ premium: CC_COMPLET });
