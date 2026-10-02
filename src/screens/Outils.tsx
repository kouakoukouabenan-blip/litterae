import { Fragment } from "preact";
import outils from "../data/outils.json";
import type { Outils } from "../data/types";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { copyText } from "../components/Toast";
import { href, replaceRoute, useRoute } from "../lib/router";
import { CoursOnglets } from "../components/SujetsOnglets";
import { DicoRecherche, DicoResultats } from "./Dictionnaire";

const O = outils as Outils;
/** Trois rubriques seulement, toutes visibles sur un téléphone sans défiler de côté. */
const RUBRIQUES = [
  { id: "dictionnaire", label: "Dictionnaire" },
  { id: "formules", label: "Formules" },
  { id: "vocabulaire", label: "Vocabulaire" }
];
/** Les groupes de formules, choisis dans une liste déroulante sous les onglets. */
const COURTS = ["Généralité", "Introduction", "Transition", "Jugement", "Conclusion", "Expressions"];
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const GROUPES = O.formules.map((g, i) => ({ id: slug(COURTS[i] ?? g.title), label: COURTS[i] ?? g.title, g }));

/** Les modèles contiennent des passages à adapter, balisés <em>[thème]</em> dans les données. */
function Modele({ text }: { text: string }) {
  const parts = text.split(/<em>(.*?)<\/em>/);
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} class="slot">{p}</span> : <Fragment key={i}>{p}</Fragment>))}</>;
}
const plain = (text: string) => text.replace(/<\/?em>/g, "");

export function OutilsScreen() {
  const { params } = useRoute();
  // Anciennes adresses (?vue=introduction, ?vue=connecteurs…) : on retombe sur la bonne rubrique.
  const brut = params.get("vue") ?? "dictionnaire";
  const ancienGroupe = GROUPES.find(g => g.id === brut);
  const vue = ancienGroupe ? "formules" : brut === "connecteurs" || brut === "orientations" ? "vocabulaire"
    : RUBRIQUES.some(r => r.id === brut) ? brut : "dictionnaire";
  const groupe = GROUPES.find(g => g.id === (params.get("groupe") ?? ancienGroupe?.id)) ?? GROUPES[0];
  const q = params.get("q") ?? "";
  const fonction = params.get("fonction");

  const aller = (p: Record<string, string>) => replaceRoute(href(["outils"], p));
  const dico = (nq: string, nf: string | null) => {
    const p: Record<string, string> = { vue: "dictionnaire" };
    if (nq) p.q = nq;
    if (nf) p.fonction = nf;
    aller(p);
  };

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
            <select class="select outils-select" value={groupe.id}
              onChange={e => { aller({ vue: "formules", groupe: (e.target as HTMLSelectElement).value }); scrollTo(0, 0); }}>
              {GROUPES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>
        )}
      </div>

      {vue === "dictionnaire" && <DicoResultats q={q} fonction={fonction} mot={params.get("mot")} onChange={dico} />}

      {vue === "formules" && (
        <div class="reading reading-left" role="tabpanel">
          <p class="small muted outils-intro">{groupe.g.desc}</p>
          <ul class="formulas">
            {groupe.g.items.map(it => (
              <li key={it.label} class="formula">
                <div class="formula-head">
                  <h3 class="formula-label">{it.label}</h3>
                  <button type="button" class="icon-btn" onClick={() => copyText(plain(it.text), "Formule copiée.")} aria-label={`Copier : ${it.label}`}>
                    <Icon name="content_copy" size={20} />
                  </button>
                </div>
                <p><Modele text={it.text} /></p>
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
