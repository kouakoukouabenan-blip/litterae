import { Fragment } from "preact";
import donnees from "../data/arguments-fonctions.json";
import outils from "../data/outils.json";
import type { Fonction, Outils } from "../data/types";
import { FONCTIONS } from "../data/types";
import { OEUVRES } from "../lib/data";
import { href } from "../lib/router";
import { fnClass } from "../lib/fonctions";

/** Un argument de dissertation, rangé sous une fonction de la littérature. */
interface ArgumentFonction {
  id: string;
  fonction: Fonction;
  /** Petit intertitre qui regroupe les arguments voisins (Dénonciation, Satire…). */
  groupe: string;
  /** L'argument tel que l'élève peut l'écrire dans son axe. */
  phrase: string;
  explication: string;
  /** Ce qu'on peut lui opposer : utile pour l'antithèse ou pour nuancer. */
  limite: string;
  /** Identifiants d'œuvres de la base qui l'illustrent bien. */
  exemples: string[];
}

const ARGUMENTS = donnees as ArgumentFonction[];
const ORIENTATIONS = (outils as Outils).orientations;
const PAR_ID = new Map(OEUVRES.map(w => [w.id, w]));

export const fonctionArguments = (f: string | null): Fonction =>
  FONCTIONS.find(x => x === f) ?? FONCTIONS[0];

export const nombreArguments = ARGUMENTS.length;

export function ArgumentsFonction({ fonction }: { fonction: Fonction }) {
  const liste = ARGUMENTS.filter(a => a.fonction === fonction);
  const groupes = [...new Set(liste.map(a => a.groupe))];
  const orientation = ORIENTATIONS.find(o => o.titre.startsWith(fonction));

  return (
    <div class={`reading reading-left arg-panneau ${fnClass(fonction)}`} role="tabpanel">
      <p class="small outils-intro">
        <strong>{liste.length} arguments pour la fonction {fonction.toLowerCase()}.</strong>
        {orientation && <span class="muted"> {orientation.oppose}.</span>}
      </p>
      {orientation && (
        <details class="repli arg-mots">
          <summary>Mots de cette fonction</summary>
          <p>{orientation.mots.join(" · ")}</p>
        </details>
      )}

      {groupes.map(g => (
        <section key={g} class="arg-groupe" aria-label={g}>
          <h2 class="arg-groupe-titre">{g}</h2>
          <ul class="arg-liste">
            {liste.filter(a => a.groupe === g).map(a => (
              <li key={a.id} class="arg">
                <p class="arg-phrase">{a.phrase}</p>
                <details class="repli arg-detail">
                  <summary>Explication</summary>
                  <p>{a.explication}</p>
                  <Exemples ids={a.exemples} />
                  <p><strong>À nuancer :</strong> {a.limite}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Exemples({ ids }: { ids: string[] }) {
  const oeuvres = ids.map(id => PAR_ID.get(id)).filter(w => !!w);
  if (!oeuvres.length) return null;
  return (
    <p>
      <strong>{oeuvres.length > 1 ? "Exemples" : "Exemple"} :</strong>{" "}
      {oeuvres.map((w, i) => (
        <Fragment key={w!.id}>
          {i > 0 && " ; "}
          <a href={href(["oeuvres", w!.id])}><em>{w!.titre}</em></a> de {w!.auteur}
        </Fragment>
      ))}
    </p>
  );
}
