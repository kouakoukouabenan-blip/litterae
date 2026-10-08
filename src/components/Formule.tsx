import { Fragment } from "preact";
import { Texte } from "./Texte";
import { SUJET_EXEMPLES, categorie, etapesDe, morceaux, nomPartie, type Formule } from "../lib/formules";

/** La formule, avec ses passages à adapter mis en évidence. */
export function FormuleTexte({ texte }: { texte: string }) {
  return <>{morceaux(texte).map((m, i) => m.trou ? <span key={i} class="slot">{m.texte}</span> : <Fragment key={i}>{m.texte}</Fragment>)}</>;
}

/**
 * Les moments d'une partie de la copie, dans l'ordre, avec celui de la formule en évidence :
 * l'élève voit tout de suite si c'est une généralité, une transition ou une ouverture, et où elle se place.
 * Avec `aller`, chaque moment est un bouton qui y mène.
 */
export function Etapes({ cat, aller }: { cat: string; aller?: (id: string) => void }) {
  const c = categorie(cat);
  // Une belle phrase n'a pas de place fixe : dans le fil, l'étiquette suffit.
  if (!c || (c.partie === "partout" && !aller)) return null;
  const etapes = c.partie === "partout" ? [c] : etapesDe(c.partie);
  return (
    <div class={`formule-etapes partie-${c.partie}`}>
      <strong class="formule-partie">{nomPartie(c.partie)}</strong>
      <ol aria-label={`Moments : ${nomPartie(c.partie)}`}>
        {etapes.map(e => (
          <li key={e.id} aria-current={e.id === cat ? "step" : undefined}>
            {aller && e.id !== cat ? <button type="button" onClick={() => aller(e.id)}>{e.nom}</button> : <span>{e.nom}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
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
