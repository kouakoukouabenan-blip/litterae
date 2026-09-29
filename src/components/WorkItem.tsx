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
}

export function WorkItem({ w, terms = [], saved = false, note, open = true, free = false }: Props) {
  const locked = !open;
  return (
    <a class="work" href={`#/oeuvres/${w.id}`}>
      <span class="work-head">
        <span class="work-title"><Highlight text={w.titre} terms={terms} /></span>
        {saved && <span class="work-saved" title="Enregistrée"><Icon name="bookmark" filled size={18} /><span class="sr-only">Enregistrée</span></span>}
        {locked && <span class="work-lock" title="Réservée à l'accès complet"><Icon name="lock" size={18} /><span class="sr-only">Réservée à l'accès complet</span></span>}
      </span>
      <span class="meta"><Highlight text={w.auteur} terms={terms} />{w.paysTexte && ` · ${w.paysTexte}`} · {w.genre}</span>
      {note ? (
        <span class="work-summary work-note">Ma note : {note}</span>
      ) : w.resume && open ? (
        <span class="work-summary"><Highlight text={w.resume} terms={terms} /></span>
      ) : null}
      <span class="tags">
        {free && <span class="tag tag-free">Gratuite</span>}
        {w.fonctions.map(f => <span key={f} class={`tag ${fnClass(f)}`}>{f}</span>)}
      </span>
    </a>
  );
}
