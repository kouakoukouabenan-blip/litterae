import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./Icon";
import { activerNotifs, peutProposerNotifs, reporterNotifs } from "../lib/notifications";
import { preparerRappel } from "../lib/rappels";
import { aDecouvert } from "../lib/install";
import { read, write } from "../lib/storage";
import { jourLocal } from "../lib/progres";
import { noter } from "../lib/stats";

/** Ce que l'élève vient de faire : la demande parle de ce moment-là. */
export type Moment = "defi" | "fil" | "serie";
const TEXTES: Record<Moment, { titre: string; texte: string }> = {
  defi: { titre: "Bravo, défi relevé !", texte: "Veux-tu qu'on te prévienne pour le défi de demain ? Une notification par jour au plus, à l'heure où tu viens d'habitude." },
  fil: { titre: "Tu aimes ces questions ?", texte: "Reçois-en une chaque jour en notification, à jouer en 10 secondes. Une par jour au plus, jamais la nuit." },
  serie: { titre: "Ne perds pas ta série", texte: "On te prévient le soir si tu n'es pas encore venu, pour que ta flamme ne s'éteigne pas. Une notification par jour au plus." }
};

let ouvrir: (m: Moment) => void = () => {};

/**
 * Propose les notifications juste après un bon moment (défi relevé, questions jouées, série en cours).
 * Une fois par jour au plus, jamais avant que l'élève ait découvert l'appli, et « Plus tard » repousse de plus en plus loin.
 */
export function proposerNotifs(m: Moment) {
  if (!aDecouvert() || !peutProposerNotifs() || read<string>("notif-proposee", "") === jourLocal()) return;
  write("notif-proposee", jourLocal());
  setTimeout(() => ouvrir(m), 900);
}

/** Fenêtre de demande, montée une seule fois dans l'application. */
export function DemandeNotifs() {
  const ref = useRef<HTMLDialogElement>(null);
  const [moment, setMoment] = useState<Moment>("fil");
  const [erreur, setErreur] = useState<string | null>(null);
  const [attente, setAttente] = useState(false);
  ouvrir = m => {
    const d = ref.current;
    if (!d) return;
    setMoment(m); setErreur(null);
    noter({ t: "progres", ref: `notif-demande:${m}` });
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  };
  useEffect(() => {
    const ecoute = (e: Event) => proposerNotifs((e as CustomEvent<Moment>).detail);
    addEventListener("litterae-moment", ecoute);
    return () => removeEventListener("litterae-moment", ecoute);
  }, []);
  const fermer = () => { const d = ref.current; if (d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } };
  const t = TEXTES[moment];
  return (
    <dialog ref={ref} class="sheet demande-notifs" aria-labelledby="demande-notifs-titre">
      <div class="sheet-body">
        <span class="demande-notifs-icone"><Icon name="notifications" size={30} /></span>
        <h2 id="demande-notifs-titre" class="section-title">{t.titre}</h2>
        <p>{erreur ?? t.texte}</p>
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-secondary" onClick={() => { reporterNotifs(); fermer(); }}>Plus tard</button>
        <button type="button" class="btn btn-primary" autoFocus disabled={attente} onClick={async () => {
          setAttente(true);
          const e = await activerNotifs();
          setAttente(false);
          if (e) { setErreur(e); return; }
          noter({ t: "progres", ref: `notif-oui:${moment}` });
          preparerRappel();
          fermer();
        }}><Icon name="notifications" size={20} />Oui, préviens-moi</button>
      </div>
    </dialog>
  );
}
