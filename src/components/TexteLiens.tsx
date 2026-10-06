import { Fragment } from "preact";
import { Texte } from "./Texte";

/** Lien vers un contenu de l'appli écrit par le prof dans sa réponse : [Une si longue lettre](#/oeuvres/si-longue-lettre). */
const LIEN = /\[([^\]\n]+)\]\((#\/[^)\s]+)\)/g;

/**
 * Texte du prof avec ses liens vers l'appli (œuvres, sujets, leçons, mots).
 * Seules les adresses internes (#/…) deviennent des liens : rien ne mène hors de l'appli.
 */
export function TexteLiens({ text }: { text: string }) {
  const parts = text.split(LIEN);
  const out = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) out.push(<Texte key={i} text={parts[i]} />);
    if (i + 2 < parts.length) out.push(<a key={i + 1} class="lien-contenu" href={parts[i + 2]}><Texte text={parts[i + 1]} /></a>);
  }
  return <Fragment>{out}</Fragment>;
}
