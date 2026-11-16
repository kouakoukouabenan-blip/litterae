import { useEffect, useRef } from "preact/hooks";
import { Icon } from "./Icon";
import { AchatLien } from "./Achat";
import { accesTermine } from "../lib/licence";
import { PRICE, dateFin } from "../lib/access";
import { read, write } from "../lib/storage";
import { noter } from "../lib/stats";

const VU = "fin-acces-vue";

/**
 * Montré une seule fois quand l'accès complet de l'élève prend fin : sobre, sans insister.
 * Ensuite, seules la page Mon espace et la page de la clé le rappellent.
 */
export function FinAcces() {
  const ref = useRef<HTMLDialogElement>(null);
  const termine = accesTermine();
  useEffect(() => {
    const d = ref.current;
    if (!d || !termine || read<number>(VU, 0) === termine.fin) return;
    write(VU, termine.fin);
    noter({ t: "progres", ref: "fin-acces-vue" });
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }, []);
  if (!termine) return null;
  const fermer = () => { const d = ref.current; if (d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } };
  const prenom = termine.titulaire?.prenom;
  return (
    <dialog ref={ref} class="sheet demande-achat" aria-labelledby="fin-acces-titre" onClick={e => e.target === ref.current && fermer()}>
      <div class="sheet-body">
        <span class="demande-notifs-icone"><Icon name="history_edu" size={28} /></span>
        <h2 id="fin-acces-titre" class="section-title">{prenom ? `${prenom}, ton accès est terminé` : "Ton accès est terminé"}</h2>
        <p class="demande-achat-usage">Ton accès complet a pris fin le {dateFin(termine.fin)}. Litterae repasse en version gratuite ; ce que tu as écrit reste sur ton téléphone.</p>
        <p class="small muted">Une nouvelle clé rouvre tout, sur ce téléphone.</p>
      </div>
      <div class="sheet-foot">
        <AchatLien class="btn btn-primary" label={`Renouveler, ${PRICE}`} />
        <button type="button" class="btn btn-secondary" onClick={fermer}>Plus tard</button>
      </div>
    </dialog>
  );
}
