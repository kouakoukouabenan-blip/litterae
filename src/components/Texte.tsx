import { Fragment } from "preact";
import { splitHighlight } from "../lib/text";
import { morceaux } from "../lib/italique";

interface Props {
  text: string;
  /** Termes cherchés à surligner, s'il y a une recherche en cours. */
  terms?: string[];
  /** Le texte est en entier un titre d'œuvre (une liste, un en-tête) : tout en italique. */
  titre?: boolean;
  /** Reconnaissance automatique des titres ; à couper là où un titre n'a rien à faire (un nom d'auteur). */
  auto?: boolean;
}

/**
 * Un texte de contenu : titres d'œuvres en italique, termes cherchés surlignés.
 * À utiliser partout où s'affiche du texte écrit par l'auteur (résumés, leçons, corrigés…).
 */
export function Texte({ text, terms = [], titre = false, auto = true }: Props) {
  const parts = titre ? [{ t: text, ital: true }] : morceaux(text, auto);
  return (
    <>
      {parts.map((p, i) => {
        const dedans = splitHighlight(p.t, terms).map((h, k) => (h.hit ? <mark key={k}>{h.t}</mark> : h.t));
        return p.ital ? <em key={i} class="titre-oeuvre">{dedans}</em> : <Fragment key={i}>{dedans}</Fragment>;
      })}
    </>
  );
}
