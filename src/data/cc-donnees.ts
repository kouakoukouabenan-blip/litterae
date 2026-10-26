import type { DonneesCC } from "./cc-types";
import apercu from "./cc-apercu.json";
import { licence } from "../lib/licence";

// Le contenu du commentaire composé arrive du serveur avec la clé d'accès (contenu payant).
// Sans clé, le site n'a que l'aperçu : les titres, auteurs et sources, pour afficher les listes avec un cadenas.
// Lu une fois au lancement : après l'activation d'une clé ou l'arrivée d'un nouveau contenu, la page est relancée.
export const CC: DonneesCC = licence()?.contenu.commentaire ?? (apercu as unknown as DonneesCC);

/** Le commentaire composé complet est sur l'appareil (clé activée et contenu reçu). */
export const CC_COMPLET = !!licence()?.contenu.commentaire;
/** Pour les écrans du commentaire composé : l'accès complet compte seulement si le contenu est arrivé. */
export const useAccesCC = () => ({ premium: CC_COMPLET });
