import { splitHighlight } from "../lib/text";

/** Surligne les termes de recherche dans un texte. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  return <>{splitHighlight(text, terms).map((p, i) => (p.hit ? <mark key={i}>{p.t}</mark> : p.t))}</>;
}
