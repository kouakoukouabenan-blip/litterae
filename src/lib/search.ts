import type { Oeuvre } from "../data/types";
import { FONCTIONS } from "../data/types";
import { normalize } from "./text";

interface Indexed {
  w: Oeuvre;
  titre: string;
  auteur: string;
  tags: string;
  idees: string;
  resume: string;
}

export interface Facet {
  key: FacetKey;
  label: string;
  values: (w: Oeuvre) => string[];
  order?: string[];
  /** Nombre de valeurs visibles avant « Voir plus ». */
  visible: number;
}

export type FacetKey = "programme" | "fonction" | "genre" | "aire" | "theme" | "argument" | "pays";
export type Filters = Record<FacetKey, string[]>;
export const EMPTY_FILTERS: Filters = { programme: [], fonction: [], genre: [], aire: [], theme: [], argument: [], pays: [] };

/** Classes où l'œuvre est au programme officiel en Côte d'Ivoire, de la terminale à la 6e. */
export const NIVEAUX = ["Terminale", "Première", "Seconde", "3e", "5e", "6e"];

export const FACETS: Facet[] = [
  { key: "programme", label: "Au programme en Côte d'Ivoire", values: w => w.niveaux ?? [], order: NIVEAUX, visible: 6 },
  { key: "fonction", label: "Fonction littéraire", values: w => w.fonctions, order: FONCTIONS, visible: 5 },
  { key: "theme", label: "Thème", values: w => w.themes, visible: 8 },
  { key: "genre", label: "Genre", values: w => [w.genre], order: ["Roman", "Théâtre", "Poésie", "Nouvelle", "Conte", "Essai"], visible: 6 },
  { key: "aire", label: "Aire géographique", values: w => w.aires, visible: 5 },
  { key: "pays", label: "Pays", values: w => w.pays, visible: 6 },
  { key: "argument", label: "Argument illustré", values: w => w.idees.map(i => i.argument), visible: 6 }
];

export function buildIndex(works: Oeuvre[]): Indexed[] {
  return works.map(w => ({
    w,
    titre: normalize(w.titre),
    auteur: normalize(w.auteur),
    tags: normalize([w.genre, w.precision, w.paysTexte, ...w.aires, ...w.themes, ...w.fonctions, ...w.motsCles, ...w.idees.map(i => i.argument)].join(" ")),
    idees: normalize(w.idees.map(i => i.texte).join(" ")),
    resume: normalize(w.resume)
  }));
}

export const queryTerms = (q: string) => normalize(q).split(" ").filter(t => t.length > 1);

/** Chaque terme doit apparaître quelque part ; le titre et l'auteur pèsent plus que le résumé. */
function score(x: Indexed, terms: string[]) {
  let total = 0;
  for (const t of terms) {
    const s = x.titre.includes(t) ? 8 : x.auteur.includes(t) ? 6 : x.tags.includes(t) ? 3 : x.idees.includes(t) ? 2 : x.resume.includes(t) ? 1 : 0;
    if (!s) return 0;
    total += s;
  }
  return total;
}

function matches(w: Oeuvre, filters: Filters, except?: FacetKey) {
  return FACETS.every(f => {
    if (f.key === except) return true;
    const selected = filters[f.key];
    return !selected.length || f.values(w).some(v => selected.includes(v));
  });
}

export function search(index: Indexed[], q: string, filters: Filters, except?: FacetKey): Oeuvre[] {
  const terms = queryTerms(q);
  return index
    .map(x => ({ w: x.w, s: terms.length ? score(x, terms) : 1 }))
    .filter(r => r.s > 0 && matches(r.w, filters, except))
    .sort((a, b) => b.s - a.s || a.w.titre.localeCompare(b.w.titre, "fr"))
    .map(r => r.w);
}

/** Nombre d'œuvres par valeur, en tenant compte de la recherche et des autres filtres. */
export function facetCounts(index: Indexed[], q: string, filters: Filters, f: Facet): [string, number][] {
  const counts = new Map<string, number>();
  for (const w of search(index, q, filters, f.key)) for (const v of new Set(f.values(w))) counts.set(v, (counts.get(v) ?? 0) + 1);
  const all = new Map<string, number>();
  for (const x of index) for (const v of new Set(f.values(x.w))) all.set(v, (all.get(v) ?? 0) + 1);
  const values = f.order
    ? f.order.filter(v => all.has(v))
    : [...all.keys()].sort((a, b) => (all.get(b)! - all.get(a)!) || a.localeCompare(b, "fr"));
  return values.map(v => [v, counts.get(v) ?? 0]);
}

export function filtersFromParams(p: URLSearchParams): Filters {
  const f = { ...EMPTY_FILTERS };
  for (const k of Object.keys(f) as FacetKey[]) f[k] = p.getAll(k);
  return f;
}

export function paramsFrom(q: string, filters: Filters) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  for (const [k, vs] of Object.entries(filters)) for (const v of vs) p.append(k, v);
  return p;
}

export const countFilters = (f: Filters) => Object.values(f).reduce((n, v) => n + v.length, 0);
