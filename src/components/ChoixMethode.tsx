import { useRef, useState } from "preact/hooks";
import { Icon } from "./Icon";
import { METHODES, useMethode } from "../lib/methodes";
import { useAccess } from "../lib/access";

/** Bouton de la barre du haut : la méthode en cours, et la liste des autres méthodes. */
export function ChoixMethode() {
  const ref = useRef<HTMLDialogElement>(null);
  const { premium } = useAccess();
  const [METHODE_ACTIVE, choisir] = useMethode();
  const [bientot, setBientot] = useState<string | null>(null);
  const ouvrir = () => {
    setBientot(null);
    const d = ref.current;
    if (d) { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); }
  };
  const fermer = () => { const d = ref.current; if (d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } };

  return (
    <>
      <button type="button" class="methode-bouton" style={{ borderColor: METHODE_ACTIVE.couleur, color: METHODE_ACTIVE.encre }} onClick={ouvrir} aria-haspopup="dialog"
        aria-label={`Méthode : ${METHODE_ACTIVE.nom}. Changer de méthode`}>
        <span class="methode-point" style={{ background: METHODE_ACTIVE.couleur }} aria-hidden="true" />
        <span class="methode-nom">{METHODE_ACTIVE.court}</span>
        <Icon name="expand_more" size={18} />
      </button>
      <dialog ref={ref} class="sheet methode-feuille" aria-labelledby="methode-titre" onClick={e => e.target === ref.current && fermer()}>
        <div class="sheet-head">
          <h2 id="methode-titre" class="section-title">Choisis ta méthode</h2>
          <button type="button" class="icon-btn" onClick={fermer} aria-label="Fermer"><Icon name="close" /></button>
        </div>
        <div class="sheet-body">
          <p class="small muted">Une seule clé d'accès ouvre toutes les méthodes.</p>
          <ul class="methode-liste">
            {METHODES.map(m => {
              const active = m.id === METHODE_ACTIVE.id;
              return (
                <li key={m.id}>
                  <button type="button" class={`methode-ligne ${active ? "is-active" : ""} ${m.prete ? "" : "is-bientot"}`}
                    aria-current={active ? "true" : undefined}
                    onClick={() => { if (!m.prete) return setBientot(m.id); choisir(m.id); fermer(); if (location.hash !== "#/accueil") location.hash = "#/accueil"; }}>
                    <span class="methode-point" style={m.prete ? { background: m.couleur } : { borderColor: m.couleur }} aria-hidden="true" />
                    <span class="methode-texte">
                      <strong>{m.nom}</strong>
                      <span>{!m.prete ? "Bientôt" : premium ? "Ouverte avec ta clé" : m.id === "dissertation" ? "Début gratuit" : "Avec l'accès complet"}</span>
                    </span>
                    {active && <Icon name="check" size={20} />}
                  </button>
                  {bientot === m.id && <p class="methode-note">En préparation. Tu verras un message sur l'accueil dès que c'est prêt.</p>}
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}
