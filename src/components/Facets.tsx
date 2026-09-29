import { useState } from "preact/hooks";
import type { Facet, Filters } from "../lib/search";
import { normalize } from "../lib/text";
import { Icon } from "./Icon";

interface GroupProps {
  facet: Facet;
  counts: [string, number][];
  selected: string[];
  onToggle: (value: string) => void;
}

/** Une famille de filtres (fonction, thème…) : cases à cocher avec le nombre d'œuvres. */
function FacetGroup({ facet, counts, selected, onToggle }: GroupProps) {
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState("");
  const long = counts.length > 12;
  // Les valeurs cochées restent visibles, même repliées ou sans résultat.
  let values = counts.filter(([v, n]) => n > 0 || selected.includes(v));
  if (find) values = values.filter(([v]) => normalize(v).includes(normalize(find)));
  const shown = open || find ? values : values.slice(0, facet.visible);
  const rest = values.length - shown.length;
  const id = `facet-${facet.key}`;

  return (
    <fieldset class="facet">
      <legend class="facet-title">{facet.label}</legend>
      {long && (
        <label class="facet-find">
          <span class="sr-only">Chercher un {facet.label.toLowerCase()}</span>
          <input type="search" value={find} placeholder={`Chercher un ${facet.label.toLowerCase()}`}
            onInput={e => setFind((e.target as HTMLInputElement).value)} />
        </label>
      )}
      <ul class="facet-values" id={id}>
        {shown.map(([v, n]) => (
          <li key={v}>
            <label class="check">
              <input type="checkbox" checked={selected.includes(v)} onChange={() => onToggle(v)} />
              <span class="check-label">{v}</span>
              <span class="check-count">{n}</span>
            </label>
          </li>
        ))}
        {find && !values.length && <li class="small muted">Aucune valeur ne correspond.</li>}
      </ul>
      {(rest > 0 || (open && values.length > facet.visible)) && !find && (
        <button type="button" class="link-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          {open ? "Voir moins" : `Voir les ${rest} autres`}
          <Icon name={open ? "expand_less" : "expand_more"} size={18} />
        </button>
      )}
    </fieldset>
  );
}

interface PanelProps {
  facets: Facet[];
  counts: Map<string, [string, number][]>;
  filters: Filters;
  onToggle: (key: Facet["key"], value: string) => void;
}

export function FacetPanel({ facets, counts, filters, onToggle }: PanelProps) {
  return (
    <div class="facets">
      {facets.map(f => (
        <FacetGroup key={f.key} facet={f} counts={counts.get(f.key)!} selected={filters[f.key]} onToggle={v => onToggle(f.key, v)} />
      ))}
    </div>
  );
}
