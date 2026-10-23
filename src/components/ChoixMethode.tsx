import { useRef, useState } from "preact/hooks";
import { Icon } from "./Icon";
import { METHODES, METHODE_ACTIVE } from "../lib/methodes";
import { useAccess } from "../lib/access";

/** Bouton en tête de l'accueil : la méthode en cours, et la liste des autres méthodes. */
export function ChoixMethode() {
  const ref = useRef<HTMLDialogElement>(null);
  const { premium } = useAccess();
  const [bientot, setBientot] = useState<string | null>(null);
  const ouvrir = () => {
    setBientot(null);
    const d = ref.current;
    if (d) { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); }
  };
  const fermer = () => { const d = ref.current; if (d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } };

  return (
    <>
      <button type="button" class="methode-bouton" onClick={ouvrir} aria-haspopup="dialog">
        <span class="methode-point" style={{ background: METHODE_ACTIVE.couleur }} aria-hidden="true" />
        {METHODE_ACTIVE.nom}
        <Icon name="expand_more" size={20} />
      </button>
      <dialog ref={ref} class="sheet methode-feuille" aria-labelledby="methode-titre" onClick={e => e.target === ref.current && fermer()}>
        <div class="sheet-head">
          <h2 id="methode-titre" class="section-title">Choisis ta méthode</h2>
          <button type="button" class="icon-btn" onClick={fermer} aria-label="Fermer"><Icon name="close" /></button>
        </div>
        <div class="sheet-body">
          <p class="small muted">Chaque méthode s'achète à part.</p>
          <ul class="methode-liste">
            {METHODES.map(m => {
              const active = m.id === METHODE_ACTIVE.id;
              return (
                <li key={m.id}>
                  <button type="button" class={`methode-ligne ${active ? "is-active" : ""} ${m.prete ? "" : "is-bientot"}`}
                    aria-current={active ? "true" : undefined}
                    onClick={() => (m.prete ? fermer() : setBientot(m.id))}>
                    <span class="methode-point" style={m.prete ? { background: m.couleur } : { borderColor: m.couleur }} aria-hidden="true" />
                    <span class="methode-texte">
                      <strong>{m.nom}</strong>
                      <span>{m.prete ? (premium ? "Débloquée" : "Début gratuit") : "Bientôt"}</span>
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
