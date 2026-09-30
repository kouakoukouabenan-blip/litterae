import { Fragment } from "preact";
import outils from "../data/outils.json";
import type { Outils } from "../data/types";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { copyText } from "../components/Toast";
import { href, replaceRoute, useRoute } from "../lib/router";
import { DicoRecherche, DicoResultats } from "./Dictionnaire";

const O = outils as Outils;
/** Une rubrique par écran : chaque groupe de formules, puis les connecteurs et les orientations. */
const COURTS = ["Généralité", "Introduction", "Transition", "Jugement", "Conclusion", "Expressions"];
const slug = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const VUES = [
  { id: "dictionnaire", label: "Dictionnaire" },
  ...O.formules.map((g, i) => ({ id: slug(COURTS[i] ?? g.title), label: COURTS[i] ?? g.title })),
  { id: "connecteurs", label: "Connecteurs" },
  { id: "orientations", label: "Orientations" }
];

/** Les modèles contiennent des passages à adapter, balisés <em>[thème]</em> dans les données. */
function Modele({ text }: { text: string }) {
  const parts = text.split(/<em>(.*?)<\/em>/);
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} class="slot">{p}</span> : <Fragment key={i}>{p}</Fragment>))}</>;
}
const plain = (text: string) => text.replace(/<\/?em>/g, "");

export function OutilsScreen() {
  const { params } = useRoute();
  const vue = VUES.some(v => v.id === params.get("vue")) ? params.get("vue")! : VUES[0].id;
  const groupe = O.formules.find((_, i) => VUES[i + 1].id === vue);
  const q = params.get("q") ?? "";
  const fonction = params.get("fonction");
  const dico = (nq: string, nf: string | null) => {
    const p: Record<string, string> = { vue: "dictionnaire" };
    if (nq) p.q = nq;
    if (nf) p.fonction = nf;
    replaceRoute(href(["outils"], p));
  };

  return (
    <Page>
      <PageHeader eyebrow="Pendant la rédaction" title="Boîte à outils" compact>
        Le sens des mots des sujets, des formules à adapter, les connecteurs logiques et le vocabulaire de chaque orientation.
      </PageHeader>

      <div class="sticky-bar">
        <div class="chips" role="tablist" aria-label="Rubriques de la boîte à outils">
          {VUES.map(v => (
            <button key={v.id} type="button" role="tab" aria-selected={vue === v.id} class="chip"
              onClick={() => { replaceRoute(href(["outils"], { vue: v.id })); scrollTo(0, 0); }}>
              {v.label}
            </button>
          ))}
        </div>
        {vue === "dictionnaire" && <DicoRecherche q={q} onChange={nq => dico(nq, fonction)} />}
      </div>

      {vue === "dictionnaire" && <DicoResultats q={q} fonction={fonction} onChange={dico} />}

      {vue !== "dictionnaire" && <div class="reading reading-left" role="tabpanel">
        {groupe && [groupe].map(g => (
          <section key={g.title} class="tool-group">
            <h2 class="section-title">{g.title}</h2>
            <p class="muted">{g.desc}</p>
            <ul class="formulas">
              {g.items.map(it => (
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
          </section>
        ))}

        {vue === "connecteurs" && O.connecteurs.map(c => (
          <section key={c.titre} class="tool-group">
            <h2 class="section-title">{c.titre}</h2>
            <p class="words">{c.mots.map(m => <span key={m} class="word">{m}</span>)}</p>
          </section>
        ))}

        {vue === "orientations" && O.orientations.map(o => (
          <section key={o.titre} class="tool-group">
            <h2 class="section-title">{o.titre}</h2>
            <p class="words">{o.mots.map(m => <span key={m} class="word">{m}</span>)}</p>
            <p class="small muted">{o.oppose}</p>
          </section>
        ))}
      </div>}
    </Page>
  );
}
