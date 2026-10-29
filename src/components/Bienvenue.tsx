import { useEffect, useRef } from "preact/hooks";
import { Icon } from "./Icon";
import { titulaire } from "../lib/licence";
import { OEUVRES, SUJETS } from "../lib/data";
import { LECONS } from "../lib/lecons";
import { BANQUE } from "../lib/entrainement";
import { contenuLibre } from "../lib/libre";
import { motsPublics } from "../lib/dictionnaire";
import { METHODES } from "../lib/methodes";
import { CC } from "../data/cc-donnees";
import { plural } from "../lib/text";
import { read, write } from "../lib/storage";
import { noter } from "../lib/stats";

/** Posé par la page de la clé juste avant le redémarrage qui suit une activation réussie. */
export const BIENVENUE = "bienvenue-acces";

/**
 * Ce que contient chaque méthode, compté au moment où la fiche s'affiche :
 * les ajouts faits depuis le tableau de bord sont donc comptés.
 * Une nouvelle méthode sans ligne ici s'affiche quand même, avec son nom seul.
 */
const CONTENU: Record<string, () => string[]> = {
  dissertation: () => [
    plural(LECONS.length, "leçon"),
    plural(SUJETS.length, "sujet corrigé", "sujets corrigés"),
    plural(BANQUE.length + (contenuLibre()?.entrainement?.length ?? 0), "sujet d'entraînement", "sujets d'entraînement")
  ],
  commentaire: () => [
    plural(CC.lecons.length, "leçon"),
    plural(CC.corriges.length, "texte corrigé", "textes corrigés"),
    plural(CC.sujets.length, "texte d'entraînement", "textes d'entraînement"),
    plural(CC.familles.reduce((n, f) => n + f.figures.length, 0), "figure de style", "figures de style")
  ]
};

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
  const pretes = METHODES.filter(m => m.prete), bientot = METHODES.filter(m => !m.prete);
  return (
    <dialog ref={ref} class="sheet demande-achat bienvenue" aria-labelledby="bienvenue-titre" onClick={e => e.target === ref.current && fermer()}>
      <div class="sheet-body">
        <span class="demande-notifs-icone"><Icon name="star" size={28} /></span>
        <h2 id="bienvenue-titre" class="section-title">{prenom ? `Bienvenue, ${prenom} !` : "Bienvenue !"}</h2>
        <p class="demande-achat-usage">Ton accès complet est actif. Tout Litterae est ouvert :</p>
        <ul class="demande-achat-liste bienvenue-methodes">
          {pretes.map(m => (
            <li key={m.id} style={{ background: m.fond, borderLeftColor: m.couleur }}>
              <span>
                <strong style={{ color: m.encre }}>{m.nom}</strong>
                {CONTENU[m.id] && <span class="bienvenue-detail">{CONTENU[m.id]().join(" · ")}</span>}
              </span>
            </li>
          ))}
        </ul>
        <ul class="demande-achat-liste">
          <li><Icon name="menu_book" size={20} /><span><strong>{plural(OEUVRES.length, "fiche d'œuvre", "fiches d'œuvres")}</strong> avec leurs arguments</span></li>
          <li><Icon name="local_library" size={20} /><span><strong>Tout le dictionnaire</strong> ({plural(motsPublics().length, "mot")})</span></li>
          <li><Icon name="edit" size={20} /><span><strong>Ta copie corrigée</strong> : envoie-la au prof depuis l'atelier</span></li>
          <li><Icon name="mail" size={20} /><span><strong>Tes questions à l'auteur</strong>, réponses dans l'appli</span></li>
          <li><Icon name="wifi_off" size={20} /><span>Tout reste lisible <strong>hors connexion</strong>, sur 2 appareils</span></li>
        </ul>
        {bientot.length > 0 && (
          <p class="bienvenue-bientot">
            Bientôt : {bientot.map(m => m.nom).join(", ")}. {bientot.length > 1 ? "Ta clé les ouvrira aussi." : "Ta clé l'ouvrira aussi."}
          </p>
        )}
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-primary" autoFocus onClick={fermer}>C'est parti</button>
      </div>
    </dialog>
  );
}
