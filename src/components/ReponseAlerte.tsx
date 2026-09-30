import { useQuestions } from "../lib/contact";
import { EDITEUR } from "../lib/site";

/** Sur l'accueil : l'auteur a répondu à une question posée avec l'accès complet. */
export function ReponseAlerte() {
  const { nouvellesReponses } = useQuestions();
  if (!nouvellesReponses) return null;
  return (
    <a class="link-panel reponse-alerte" href="#/contact?vue=questions">
      <span class="link-panel-title">Prof {EDITEUR} a répondu à {nouvellesReponses > 1 ? `${nouvellesReponses} de tes questions` : "ta question"}</span>
      <span class="meta">Lire la réponse</span>
    </a>
  );
}
