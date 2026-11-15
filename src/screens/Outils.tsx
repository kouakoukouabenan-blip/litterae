import { Fragment } from "preact";
import outils from "../data/outils.json";
import type { Outils } from "../data/types";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { copyText } from "../components/Toast";
import { href, replaceRoute, useRoute } from "../lib/router";
import { FONCTIONS } from "../data/types";
import { fnClass } from "../lib/fonctions";
import { CoursOnglets } from "../components/SujetsOnglets";
import { DicoRecherche, DicoResultats } from "./Dictionnaire";
import { useGlisser } from "../lib/glisser";
import { CATEGORIES, PARTIES, categorie, formulesDe } from "../lib/formules";
import { Partie, FormuleExemple, FormuleTexte } from "../components/Formule";
import { ArgumentsFonction, fonctionArguments } from "../components/ArgumentsFonction";

const O = outils as Outils;
/** Trois rubriques seulement, toutes visibles sur un téléphone sans défiler de côté. */
const RUBRIQUES = [
  { id: "dictionnaire", label: "Dictionnaire" },
  { id: "formules", label: "Formules" },
  { id: "arguments", label: "Arguments" }
];
/** Anciennes adresses des groupes de formules (liens des leçons, de l'atelier, des messages déjà publiés). */
const ANCIENS: Record<string, string> = { introduction: "entree", conclusion: "bilan", expressions: "style" };
const idGroupe = (id: string | null) => id ? (ANCIENS[id] ?? id) : null;
/** Les connecteurs logiques, rangés à la fin de la liste des moments du devoir. */
const CONNECTEURS = "connecteurs";

export function OutilsScreen() {
  const { params } = useRoute();
  // Anciennes adresses (?vue=introduction, ?vue=connecteurs…) : on retombe sur la bonne rubrique.
  const brut = params.get("vue") ?? "dictionnaire";
  const ancienGroupe = categorie(idGroupe(brut) ?? "");
  // L'ancien onglet Vocabulaire est devenu Arguments ; ses connecteurs logiques sont rangés dans Formules.
  const connecteurs = brut === "connecteurs" || params.get("groupe") === CONNECTEURS;
  const vue = ancienGroupe || connecteurs ? "formules" : brut === "orientations" || brut === "vocabulaire" ? "arguments"
    : RUBRIQUES.some(r => r.id === brut) ? brut : "dictionnaire";
  const groupe = categorie(idGroupe(params.get("groupe")) ?? ancienGroupe?.id ?? "") ?? CATEGORIES[0];
  const fonctionArg = fonctionArguments(params.get("fonction"));
  const allerGroupe = (id: string) => { aller({ vue: "formules", groupe: id }); scrollTo(0, 0); };
  const q = params.get("q") ?? "";
  const fonction = params.get("fonction");

  const aller = (p: Record<string, string>) => replaceRoute(href(["outils"], p));
  const dico = (nq: string, nf: string | null) => {
    const p: Record<string, string> = { vue: "dictionnaire" };
    if (nq) p.q = nq;
    if (nf) p.fonction = nf;
    aller(p);
  };

  // Glisser de côté : rubrique voisine ; depuis le Dictionnaire vers la droite, retour aux Leçons.
  useGlisser(RUBRIQUES.findIndex(r => r.id === vue), RUBRIQUES.length, k => { aller({ vue: RUBRIQUES[k].id }); scrollTo(0, 0); }, 1);

  return (
    <Page title="Boîte à outils">
      <CoursOnglets actif="outils" />
      {/* Le bouton « Boîte à outils » au-dessus sert déjà de titre. */}
      <h1 class="sr-only">Boîte à outils</h1>

      <div class="sticky-bar">
        <div class="onglets" role="tablist" aria-label="Rubriques de la boîte à outils">
          {RUBRIQUES.map(r => (
            <button key={r.id} type="button" role="tab" aria-selected={vue === r.id} class="onglet"
              onClick={() => { aller({ vue: r.id }); scrollTo(0, 0); }}>
              {r.label}
            </button>
          ))}
        </div>
        {vue === "dictionnaire" && <DicoRecherche q={q} onChange={nq => dico(nq, fonction)} />}
        {vue === "arguments" && (
          <nav class="fn-rangee arg-fonctions" aria-label="Choisir une fonction">
            {FONCTIONS.map(f => (
              <button key={f} type="button" class={`fn-mini ${fnClass(f)}`} aria-pressed={f === fonctionArg}
                onClick={() => { aller({ vue: "arguments", fonction: f }); scrollTo(0, 0); }}>{f}</button>
            ))}
          </nav>
        )}
        {vue === "formules" && (
          <label class="outils-choix">
            <span class="sr-only">Moment du devoir</span>
            <select class="select outils-select" value={connecteurs ? CONNECTEURS : groupe.id} onChange={e => allerGroupe((e.target as HTMLSelectElement).value)}>
              {PARTIES.map(p => (
                <optgroup key={p.id} label={p.nom}>
                  {CATEGORIES.filter(c => c.partie === p.id).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </optgroup>
              ))}
              <optgroup label="Mots de liaison">
                <option value={CONNECTEURS}>Connecteurs logiques</option>
              </optgroup>
            </select>
          </label>
        )}
      </div>

      {vue === "dictionnaire" && <DicoResultats q={q} fonction={fonction} mot={params.get("mot")} onChange={dico} />}

      {vue === "formules" && connecteurs && (
        <div class="reading reading-left" role="tabpanel">
          <p class="small outils-intro"><strong>Partout dans le devoir.</strong> <span class="muted">Ils relient tes idées et guident le correcteur.</span></p>
          <dl class="vocab">
            {O.connecteurs.map(c => (
              <Fragment key={c.titre}>
                <dt>{c.titre}</dt>
                <dd>{c.mots.join(" · ")}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      )}

      {vue === "formules" && !connecteurs && (
        <div class="reading reading-left" role="tabpanel">
          <Partie cat={groupe.id} />
          <p class="small outils-intro"><strong>{groupe.place}.</strong> <span class="muted">{groupe.role}</span></p>
          <ul class="formulas">
            {formulesDe(groupe.id).map(f => (
              <li key={f.id} class="formula">
                <div class="formula-head">
                  <h3 class="formula-label">{f.nom}</h3>
                  <button type="button" class="icon-btn" onClick={() => copyText(f.texte, "Formule copiée.")} aria-label={`Copier : ${f.nom}`}>
                    <Icon name="content_copy" size={20} />
                  </button>
                </div>
                <p><FormuleTexte texte={f.texte} /></p>
                <FormuleExemple f={f} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {vue === "arguments" && <ArgumentsFonction fonction={fonctionArg} />}
    </Page>
  );
}
