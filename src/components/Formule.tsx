import { Fragment } from "preact";
import { Texte } from "./Texte";
import { SUJET_EXEMPLES, categorie, morceaux, nomPartie, type Formule } from "../lib/formules";

/** La formule, avec ses passages à adapter mis en évidence. */
export function FormuleTexte({ texte }: { texte: string }) {
  return <>{morceaux(texte).map((m, i) => m.trou ? <span key={i} class="slot">{m.texte}</span> : <Fragment key={i}>{m.texte}</Fragment>)}</>;
}

/** La partie de la copie où la formule s'utilise (Introduction, Développement, Conclusion). */
export function Partie({ cat }: { cat: string }) {
  const c = categorie(cat);
  // Une belle phrase n'a pas de place fixe : l'étiquette suffit.
  if (!c || c.partie === "partout") return null;
  return <p class={`formule-partie partie-${c.partie}`}>{nomPartie(c.partie)}</p>;
}

/** Exemple rédigé et conseil, repliés sous la formule. */
export function FormuleExemple({ f, role }: { f: Formule; role?: boolean }) {
  const c = categorie(f.cat);
  return (
    <details class="formule-detail">
      <summary>Voir un exemple</summary>
      {role && c && <p class="formule-role">{c.role}</p>}
      <p class="formule-sujet">Sur le sujet {SUJET_EXEMPLES}</p>
      <p class="formule-exemple"><Texte text={f.exemple} /></p>
      {f.conseil && <p class="formule-conseil"><Texte text={f.conseil} /></p>}
    </details>
  );
}
