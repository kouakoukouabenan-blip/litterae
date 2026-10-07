import { Texte } from "./Texte";
import { useEffect, useMemo } from "preact/hooks";
import { suggestionOuverte, suggestionsVues } from "../lib/interets";
import { noter } from "../lib/stats";
import type { Suggestion } from "../lib/suggestions";

/** Compte, sans rien savoir de l'élève, les suggestions montrées (une fois par jour) et celles qui sont ouvertes. */
function montrees(liste: Suggestion[]) {
  const nouvelles = new Set(suggestionsVues(liste.map(s => s.cle)));
  for (const s of liste) if (s.type && nouvelles.has(s.cle)) noter({ t: "suggestion", ref: `vue:${s.type}` });
}
function ouverte(s: Suggestion) {
  suggestionOuverte(s.cle);
  if (s.type) noter({ t: "suggestion", ref: `clic:${s.type}` });
}
import { prochaineAction } from "../lib/suggestions";
import { Fil } from "./Fil";
import { Icon } from "./Icon";
import { Flamme } from "./Flamme";
import { OBJECTIF_DU_JOUR, recompenseVue, useBilan } from "../lib/progres";

/** « Pour toi » sur l'accueil : le fil du jour (suggestions personnelles et cartes à jouer), sous la série et l'objectif du jour. */
export function Suggestions({ apercu }: { apercu?: number } = {}) {
  const b = useBilan();
  const faites = Math.min(b.faitesAujourdhui, OBJECTIF_DU_JOUR);
  return (
    <section class="pour-toi" aria-labelledby="pour-toi-titre">
      <div class="pour-toi-tete">
        <h2 id="pour-toi-titre" class="pour-toi-titre">Pour toi</h2>
        {/* Série et objectif du jour : le détail est sur « Ma progression ». */}
        <a class="pour-toi-serie" href="#/progres" aria-label={`Ma progression : série de ${b.serie} jour${b.serie > 1 ? "s" : ""}, objectif du jour ${faites} sur ${OBJECTIF_DU_JOUR}`}>
          {b.serie > 0 && <span class="serie-badge"><Flamme taille={14} />{b.serie} j</span>}
          <span class="objectif-points" aria-hidden="true">
            {Array.from({ length: OBJECTIF_DU_JOUR }, (_, i) => <span key={i} class={i < faites ? "fait" : ""} />)}
          </span>
          <span class="pour-toi-lien">Ma progression</span>
          <Icon name="chevron_right" size={18} />
        </a>
      </div>
      <Fil apercu={apercu} />
    </section>
  );
}

/** « Ta prochaine action » : un seul gros bouton en tête de l'accueil, la chose la plus utile à faire maintenant. */
export function ProchaineAction() {
  const a = useMemo(() => prochaineAction(), []);
  const recompense = a.cle === "recompense";
  useEffect(() => { if (!recompense) montrees([a]); }, []);
  return (
    <a class={`prochaine${recompense ? " prochaine-recompense" : ""}`} href={a.lien} onClick={() => { if (recompense) recompenseVue(); else ouverte(a); }}>
      <span class="prochaine-icone" aria-hidden="true">{recompense ? <Flamme taille={22} /> : <Icon name={a.icone} size={22} />}</span>
      <span class="prochaine-texte">
        <span class="prochaine-etiquette">Ta prochaine action</span>
        <span class="prochaine-titre"><Texte text={a.titre} /></span>
        <span class="prochaine-detail"><Texte text={a.detail} /></span>
      </span>
      <Icon name="arrow_forward" size={22} />
    </a>
  );
}
