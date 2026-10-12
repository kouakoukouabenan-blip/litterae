import { useEffect, useRef } from "preact/hooks";
import { Icon } from "./Icon";
import { titulaire } from "../lib/licence";
import { OEUVRES, SUJETS } from "../lib/data";
import { motsPublics } from "../lib/dictionnaire";
import { read, write } from "../lib/storage";
import { noter } from "../lib/stats";

/** Posé par la page de la clé juste avant le redémarrage qui suit une activation réussie. */
export const BIENVENUE = "bienvenue-acces";

/** Message montré une seule fois, au redémarrage qui suit la première activation de la clé. */
export function Bienvenue() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d || !read<boolean>(BIENVENUE, false)) return;
    write(BIENVENUE, false);
    noter({ t: "progres", ref: "bienvenue-vue" });
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }, []);
  const fermer = () => { const d = ref.current; if (d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } };
  const prenom = titulaire()?.prenom;
  return (
    <dialog ref={ref} class="sheet demande-achat bienvenue" aria-labelledby="bienvenue-titre" onClick={e => e.target === ref.current && fermer()}>
      <div class="sheet-body">
        <span class="demande-notifs-icone"><Icon name="star" size={28} /></span>
        <h2 id="bienvenue-titre" class="section-title">{prenom ? `Bienvenue, ${prenom} !` : "Bienvenue !"}</h2>
        <p class="demande-achat-usage">Ton accès complet est actif. Tout Litterae est ouvert :</p>
        <ul class="demande-achat-liste">
          <li><Icon name="menu_book" size={20} /><span><strong>{OEUVRES.filter(w => w.detaillee).length} fiches d'œuvres</strong> avec leurs arguments</span></li>
          <li><Icon name="history_edu" size={20} /><span><strong>{SUJETS.length} sujets corrigés</strong>, partie par partie</span></li>
          <li><Icon name="local_library" size={20} /><span><strong>Tout le dictionnaire</strong> ({motsPublics().length} mots) et toutes les leçons</span></li>
          <li><Icon name="edit" size={20} /><span><strong>Ta copie corrigée</strong> : envoie-la au prof depuis l'atelier</span></li>
          <li><Icon name="mail" size={20} /><span><strong>Tes questions à l'auteur</strong>, réponses dans l'appli</span></li>
          <li><Icon name="wifi_off" size={20} /><span>Tout reste lisible <strong>hors connexion</strong>, sur 2 appareils</span></li>
        </ul>
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-primary" autoFocus onClick={fermer}>C'est parti</button>
      </div>
    </dialog>
  );
}
