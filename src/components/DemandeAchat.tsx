import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./Icon";
import { CommentPayerBouton } from "./CommentPayer";
import { PRICE, PRIX_AVANT, PRIX_NORMAL, finPromo, finPromoDans } from "../lib/access";
import { ACHAT_URL } from "../lib/site";
import { licence } from "../lib/licence";
import { fichesGratuites, fichesOuvertes } from "../lib/fiches";
import { OEUVRES, SUJETS } from "../lib/data";
import { motsPublics } from "../lib/dictionnaire";
import { activite, bilan, jourLocal } from "../lib/progres";
import { read, write } from "../lib/storage";
import { noter } from "../lib/stats";

/** Ce que l'élève vient de faire : la fenêtre arrive juste après, jamais au milieu d'un travail. */
export type MomentAchat = "defi" | "serie" | "fiches";
const DERNIERE = "achat-propose";
const JOUR = 864e5;

/** Premier jour où l'élève a utilisé l'appli (gardé la première fois qu'on le voit). */
function premierJour() {
  const garde = read<string>("premier-jour", "");
  if (garde) return garde;
  const j = Object.keys(activite()).sort()[0] ?? jourLocal();
  write("premier-jour", j);
  return j;
}

let ouvrir: (m: MomentAchat) => void = () => {};

/**
 * Propose l'accès complet, de temps en temps : jamais les 2 premiers jours, seulement après un bon moment
 * (défi relevé, série de 3 jours, 7e fiche gratuite), au plus une fois tous les 3 jours (chaque jour à la fin de la promo),
 * jamais le jour où l'on a demandé les notifications, jamais dans l'atelier.
 */
export function proposerAchat(m: MomentAchat) {
  if (licence() || !ACHAT_URL || location.hash.startsWith("#/entrainement/")) return false;
  const auj = jourLocal();
  if (Date.now() - Date.parse(`${premierJour()}T12:00:00`) < 2 * JOUR) return false;
  if (read<string>("notif-proposee", "") === auj) return false;
  const fin = finPromoDans();
  const ecart = fin !== null && fin <= 2 ? 1 : 3;
  const derniere = read<string>(DERNIERE, "");
  if (derniere && Date.parse(`${auj}T12:00:00`) - Date.parse(`${derniere}T12:00:00`) < ecart * JOUR) return false;
  write(DERNIERE, auj);
  setTimeout(() => ouvrir(m), 900);
  return true;
}

const TITRES: Record<MomentAchat, (n: number) => string> = {
  defi: () => "Bien joué ! Prêt pour la suite ?",
  serie: n => `${n} jours d'affilée, bravo !`,
  fiches: () => "Tu prends de l'avance"
};

/** Fenêtre d'achat, montée une seule fois dans l'application. */
export function DemandeAchat() {
  const ref = useRef<HTMLDialogElement>(null);
  const [moment, setMoment] = useState<MomentAchat>("defi");
  ouvrir = m => {
    const d = ref.current;
    if (!d) return;
    setMoment(m);
    noter({ t: "progres", ref: `achat-vue:${m}` });
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  };
  // Moments signalés ailleurs dans l'appli (objectif du jour avec une série, 7e fiche). Les notifications passent d'abord.
  useEffect(() => {
    const ecoute = (e: Event) => {
      const m = (e as CustomEvent<string>).detail;
      setTimeout(() => {
        if (m === "fiches") proposerAchat("fiches");
        if (m === "serie" && bilan().serie >= 3) proposerAchat("serie");
      }, 0);
    };
    addEventListener("litterae-moment", ecoute);
    return () => removeEventListener("litterae-moment", ecoute);
  }, []);
  const fermer = () => { const d = ref.current; if (d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } };
  const lues = Object.keys(fichesOuvertes()).length;
  const fin = finPromoDans();
  const date = finPromo();
  return (
    <dialog ref={ref} class="sheet demande-achat" aria-labelledby="demande-achat-titre" onClick={e => e.target === ref.current && fermer()}>
      <div class="sheet-body">
        <span class="demande-notifs-icone"><Icon name="star" size={28} /></span>
        <h2 id="demande-achat-titre" class="section-title">{TITRES[moment](bilan().serie)}</h2>
        {lues > 0 && <p class="demande-achat-usage">Tu as lu {lues} de tes {fichesGratuites()} fiches gratuites.</p>}
        <ul class="demande-achat-liste">
          <li><Icon name="menu_book" size={20} /><span><strong>{OEUVRES.filter(w => w.detaillee).length} fiches d'œuvres</strong> avec leurs arguments</span></li>
          <li><Icon name="history_edu" size={20} /><span><strong>{SUJETS.length} sujets corrigés</strong>, partie par partie</span></li>
          <li><Icon name="inventory_2" size={20} /><span><strong>Tout le dictionnaire</strong> ({motsPublics().length} mots)</span></li>
        </ul>
        <p class="demande-achat-prix">
          {PRIX_AVANT && <><s class="prix-avant">{PRIX_AVANT}</s> </>}<strong>{PRICE}</strong>, payés une seule fois
        </p>
        {PRIX_AVANT && date && <p class={`small${fin !== null && fin <= 2 ? " demande-achat-urgent" : " muted"}`}>
          {fin === 0 ? `Dernier jour de la promo : ${PRIX_NORMAL} dès demain.` : fin === 1 ? `Promo jusqu'à demain soir, puis ${PRIX_NORMAL}.` : `Promo jusqu'au ${date}, puis ${PRIX_NORMAL}.`}
        </p>}
        <CommentPayerBouton />
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-secondary" onClick={fermer}>Plus tard</button>
        <a class="btn btn-primary" href={ACHAT_URL} target="_blank" rel="noopener" autoFocus
          onClick={() => { noter({ t: "progres", ref: `achat-clic:${moment}` }); fermer(); }}>Débloquer tout, {PRICE}</a>
      </div>
    </dialog>
  );
}
