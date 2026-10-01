import type { Oeuvre } from "../data/types";
import { Highlight } from "./Highlight";
import { Icon } from "./Icon";
import { fnClass } from "../lib/fonctions";

interface Props {
  w: Oeuvre;
  terms?: string[];
  saved?: boolean;
  note?: string;
  /** Fiche accessible : le résumé peut s'afficher dans la liste. */
  open?: boolean;
  /** Fiche en accès libre, signalée tant que l'accès complet n'est pas activé. */
  free?: boolean;
  /** Recherche en cours, transmise à la fiche pour l'ouvrir sur l'argument qui correspond. */
  suite?: string;
}

export function WorkItem({ w, terms = [], saved = false, note, open = true, free = false, suite }: Props) {
  const locked = !open;
  return (
    <a class="work" href={`#/oeuvres/${w.id}${suite ? `?${suite}` : ""}`}>
      <span class="work-head">
        <span class="work-title"><Highlight text={w.titre} terms={terms} />{free && <span class="work-libre">Gratuite</span>}</span>
        {saved && <span class="work-saved" title="Enregistrée"><Icon name="bookmark" filled size={18} /><span class="sr-only">Enregistrée</span></span>}
        {locked && <span class="work-lock" title="Réservée à l'accès complet"><Icon name="lock" size={18} /><span class="sr-only">Réservée à l'accès complet</span></span>}
      </span>
      <span class="meta"><Highlight text={w.auteur} terms={terms} />{w.paysTexte && ` · ${w.paysTexte}`} · {w.genre}</span>
      {note ? (
        <span class="work-summary work-note">Ma note : {note}</span>
      ) : w.resume && open ? (
        <span class="work-summary"><Highlight text={w.resume} terms={terms} /></span>
      ) : null}
      {/* Les fonctions sur une seule ligne discrète, une pastille de couleur chacune. */}
      <span class="work-fonctions">
        {w.fonctions.map(f => <span key={f} class={`work-fn ${fnClass(f)}`}>{f}</span>)}
        {w.detaillee === false && <span class="work-fn work-court">Fiche courte</span>}
      </span>
    </a>
  );
}
