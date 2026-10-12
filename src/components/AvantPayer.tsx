import { useRef } from "preact/hooks";
import { Icon } from "./Icon";
import { CommentPayerBouton } from "./CommentPayer";
import { PRICE, PRIX_NORMAL, PRIX_AVANT, finPromo } from "../lib/access";
import { ACHAT_URL } from "../lib/site";
import { OEUVRES, SUJETS } from "../lib/data";
import { noter } from "../lib/stats";

let ouvrir: () => void = () => {};

/**
 * Tout lien vers la page Chariow ouvre d'abord cette petite préparation : ce qu'il faut avoir sous la main,
 * et un message tout prêt pour les parents quand l'élève n'a pas de Mobile Money.
 * Le lien « Continuer » de la fenêtre porte data-direct et part directement chez Chariow.
 */
export function preparerAvantPaiement() {
  document.addEventListener("click", e => {
    const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || !ACHAT_URL || !a.href.startsWith(ACHAT_URL) || a.dataset.direct != null || !navigator.onLine) return;
    e.preventDefault();
    ouvrir();
  }, true);
}

/** Message WhatsApp pour un parent : ce qu'est Litterae, le prix et le lien pour payer. */
function messageParents() {
  const promo = PRIX_AVANT && finPromo() ? ` (prix de promo jusqu'au ${finPromo()}, ensuite ${PRIX_NORMAL})` : "";
  return [
    "Bonjour, j'ai besoin de ton aide pour préparer la dissertation littéraire.",
    `Il y a une application, Litterae, avec ${OEUVRES.filter(w => w.detaillee).length} fiches d'œuvres, ${SUJETS.length} sujets corrigés et le cours complet.`,
    `L'accès complet coûte ${PRICE}, payés une seule fois${promo}, par Mobile Money (Wave, Orange Money, MTN, Moov).`,
    `Tu peux payer ici : ${ACHAT_URL}`,
    "Une clé arrive ensuite par e-mail : mets mon adresse e-mail au moment de payer, ou envoie-moi la clé. Merci !"
  ].join("\n\n");
}

/** Fenêtre « Avant de payer », montée une seule fois dans l'application. */
export function AvantPayer() {
  const ref = useRef<HTMLDialogElement>(null);
  ouvrir = () => {
    const d = ref.current;
    if (!d) return;
    noter({ t: "progres", ref: "paiement-vue" });
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  };
  const fermer = () => { const d = ref.current; if (d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } };
  return (
    <dialog ref={ref} class="sheet demande-achat avant-payer" aria-labelledby="avant-payer-titre" onClick={e => e.target === ref.current && fermer()}>
      <div class="sheet-body">
        <h2 id="avant-payer-titre" class="section-title">Avant de payer</h2>
        <p class="demande-achat-usage">Paiement sur Chariow, en 2 minutes. Prépare :</p>
        <ul class="demande-achat-liste">
          <li><Icon name="install_mobile" size={20} /><span><strong>Mobile Money</strong> : Wave, Orange Money, MTN ou Moov</span></li>
          <li><Icon name="mail" size={20} /><span><strong>Une adresse e-mail</strong> : ta clé arrive dedans</span></li>
          <li><Icon name="content_paste" size={20} /><span><strong>Ensuite</strong>, colle la clé page <a class="link-strong" href="#/acces" onClick={fermer}>Clé d'accès</a>.</span></li>
        </ul>
        <p class="small muted">Pas de Mobile Money ?</p>
        <a class="btn btn-secondary avant-payer-parents" href={`https://wa.me/?text=${encodeURIComponent(messageParents())}`} target="_blank" rel="noopener"
          onClick={() => { noter({ t: "progres", ref: "paiement-parents" }); fermer(); }}>
          <Icon name="groups" size={20} />Demande à tes parents
        </a>
        <CommentPayerBouton />
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-secondary" onClick={fermer}>Retour</button>
        <a class="btn btn-primary" href={ACHAT_URL} target="_blank" rel="noopener" data-direct="" autoFocus
          onClick={() => { noter({ t: "progres", ref: "paiement-continuer" }); fermer(); }}>Continuer, {PRICE}</a>
      </div>
    </dialog>
  );
}
