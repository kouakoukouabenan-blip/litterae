import { FREE_SUBJECTS, FREE_WORKS, PRICE } from "../lib/access";
import { ACHAT_URL } from "../lib/site";
import { Icon } from "./Icon";

/** Explique ce qui est réservé et comment obtenir l'accès complet. */
export function LockPanel({ reason, contenu }: { reason: string; contenu?: string }) {
  return (
    <section class="lock" aria-labelledby="lock-title">
      <p class="eyebrow eyebrow-icon"><Icon name="lock" size={16} />Accès complet</p>
      <h2 id="lock-title" class="section-title">{reason}</h2>
      {contenu && <p class="lock-contenu">{contenu}</p>}
      <p>L'accès gratuit comprend le cours, la boîte à outils, les {FREE_SUBJECTS} premiers sujets corrigés et {FREE_WORKS} fiches d'œuvres. L'accès complet ouvre tout le reste, pour {PRICE} payés une seule fois.</p>
      <div class="lock-actions">
        {ACHAT_URL ? (
          <a class="btn btn-primary" href={ACHAT_URL} target="_blank" rel="noopener">Acheter l'accès, {PRICE}</a>
        ) : (
          <button class="btn btn-primary" type="button" disabled aria-describedby="lock-soon">Acheter l'accès, {PRICE}</button>
        )}
        <a class="btn btn-secondary" href="#/acces">J'ai une clé d'accès</a>
      </div>
      <p id="lock-soon" class="small muted">
        {ACHAT_URL
          ? "Paiement par Mobile Money (Wave, MTN MoMo, Moov Money…) sur Chariow. Ta clé d'accès arrive par e-mail juste après : pense à regarder dans les spams."
          : "Le paiement par Mobile Money ouvre très bientôt."}
      </p>
    </section>
  );
}
