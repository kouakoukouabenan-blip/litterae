import { useAccess } from "../lib/access";
import { lienContact } from "../lib/contact";

/**
 * Ligne discrète en bas d'un contenu (fiche, sujet, leçon). Sans accès complet : signaler une erreur.
 * Avec l'accès complet : poser une question à l'auteur, dont la réponse arrive dans l'appli.
 */
export function LigneContact({ page, objet, quoi }: { page: string; objet: string; quoi: string }) {
  const { premium } = useAccess();
  return premium
    ? <p class="signaler">Une question ou une erreur sur {quoi} ? <a href={lienContact("question", page, objet)}>Écris à l'auteur</a>, la réponse arrive dans l'appli.</p>
    : <p class="signaler">Une erreur dans {quoi} ? <a href={lienContact("erreur", page, objet)}>Signale-la</a></p>;
}
