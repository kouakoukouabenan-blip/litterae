import { Fragment } from "preact";
import outils from "../data/outils.json";
import type { Outils } from "../data/types";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { copyText } from "../components/Toast";
import { href, replaceRoute, useRoute } from "../lib/router";
import { CoursOnglets } from "../components/SujetsOnglets";
import { DicoRecherche, DicoResultats } from "./Dictionnaire";
import { useGlisser } from "../lib/glisser";
import { CATEGORIES, PARTIES, categorie, formulesDe } from "../lib/formules";
import { Etapes, FormuleExemple, FormuleTexte } from "../components/Formule";

const O = outils as Outils;
/** Trois rubriques seulement, toutes visibles sur un téléphone sans défiler de côté. */
const RUBRIQUES = [
  { id: "dictionnaire", label: "Dictionnaire" },
  { id: "formules", label: "Formules" },
  { id: "vocabulaire", label: "Vocabulaire" }
];
/** Anciennes adresses des groupes de formules (liens des leçons, de l'atelier, des messages déjà publiés). */
const ANCIENS: Record<string, string> = { introduction: "entree", conclusion: "bilan", expressions: "style" };
const idGroupe = (id: string | null) => id ? (ANCIENS[id] ?? id) : null;

export function OutilsScreen() {
  const { params } = useRoute();
  // Anciennes adresses (?vue=introduction, ?vue=connecteurs…) : on retombe sur la bonne rubrique.
  const brut = params.get("vue") ?? "dictionnaire";
  const ancienGroupe = categorie(idGroupe(brut) ?? "");
  const vue = ancienGroupe ? "formules" : brut === "connecteurs" || brut === "orientations" ? "vocabulaire"
    : RUBRIQUES.some(r => r.id === brut) ? brut : "dictionnaire";
  const groupe = categorie(idGroupe(params.get("groupe")) ?? ancienGroupe?.id ?? "") ?? CATEGORIES[0];
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
        {vue === "formules" && (
          <label class="outils-choix">
            <span class="sr-only">Moment du devoir</span>
            <select class="select outils-select" value={groupe.id} onChange={e => allerGroupe((e.target as HTMLSelectElement).value)}>
              {PARTIES.map(p => (
                <optgroup key={p.id} label={p.nom}>
                  {CATEGORIES.filter(c => c.partie === p.id).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        )}
      </div>

      {vue === "dictionnaire" && <DicoResultats q={q} fonction={fonction} mot={params.get("mot")} onChange={dico} />}

      {vue === "formules" && (
        <div class="reading reading-left" role="tabpanel">
          <Etapes cat={groupe.id} aller={allerGroupe} />
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

      {vue === "vocabulaire" && (
        <div class="reading reading-left" role="tabpanel">
          <h2 class="sub-title outils-titre">Connecteurs logiques</h2>
          <dl class="vocab">
            {O.connecteurs.map(c => (
              <Fragment key={c.titre}>
                <dt>{c.titre}</dt>
                <dd>{c.mots.join(" · ")}</dd>
              </Fragment>
            ))}
          </dl>
          <h2 class="sub-title outils-titre">Mots de chaque orientation</h2>
          <dl class="vocab">
            {O.orientations.map(o => (
              <Fragment key={o.titre}>
                <dt>{o.titre}</dt>
                <dd>{o.mots.join(" · ")}<span class="vocab-oppose">{o.oppose}</span></dd>
              </Fragment>
            ))}
          </dl>
        </div>
      )}
    </Page>
  );
}
