import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { Flamme } from "../components/Flamme";
import { OBJECTIF_DU_JOUR, PALIER_RECOMPENSE, useBilan } from "../lib/progres";
import { useAccess } from "../lib/access";
import { cartesDuJour, nbCartes, useSuivis } from "../lib/revisions";
import { maitrise } from "../lib/maitrise";
import { defiFaitAujourdhui, sujetDuJour } from "../lib/defi";
import { numero } from "../lib/entrainement";
import { plural } from "../lib/text";

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

/** Ma progression : série de jours, objectif du jour, semaine, révisions, défi et niveau par étape. */
export function ProgresScreen() {
  const b = useBilan();
  const { premium } = useAccess();
  const suivis = useSuivis();
  const aRevoir = cartesDuJour(suivis).length;
  const cartes = nbCartes(suivis);
  const etapes = maitrise();
  const defiFait = defiFaitAujourdhui();

  // Un seul conseil : l'étape la plus faible, pour ne pas noyer l'élève.
  const faible = [...etapes].sort((a, c) => a.score - c.score)[0];
  const faites = Math.min(b.faitesAujourdhui, OBJECTIF_DU_JOUR);

  return (
    <Page title="Ma progression" back="#/accueil">
      <PageHeader title="Ma progression" compact />

      <section class="progres-haut">
        <div class="progres-serie">
          <Flamme taille={34} eteinte={!b.serie} />
          <span class="progres-chiffre">{b.serie}</span>
          <span class="progres-serie-texte"><strong>{b.serie > 1 ? "jours d'affilée" : "jour d'affilée"}</strong>
            {!premium && b.serie > 0 ? <span class="meta">Fiche offerte dans {plural(PALIER_RECOMPENSE - (b.serie % PALIER_RECOMPENSE), "jour")}</span>
              : b.record > b.serie && <span class="meta">Record : {plural(b.record, "jour")}</span>}</span>
        </div>
        <div class="progres-objectif">
          <span class="objectif-points" aria-hidden="true">
            {Array.from({ length: OBJECTIF_DU_JOUR }, (_, i) => <span key={i} class={i < faites ? "fait" : ""} />)}
          </span>
          <span class="meta">{faites >= OBJECTIF_DU_JOUR ? "Objectif du jour atteint" : `Aujourd'hui : ${faites} / ${OBJECTIF_DU_JOUR}`}</span>
        </div>
      </section>

      <div class="progres-actions">
        <a class={`progres-action${defiFait ? " fait" : ""}`} href="#/defi">
          <Icon name={defiFait ? "check" : "edit"} size={22} />
          <span class="row-body"><span class="row-title">Défi du jour</span>
            <span class="meta">{defiFait ? "Relevé, à demain" : `Sujet ${numero(sujetDuJour().num)}, 5 minutes`}</span></span>
          <Icon name="chevron_right" size={20} />
        </a>
        <a class={`progres-action${aRevoir ? "" : " fait"}`} href="#/revisions">
          <Icon name={aRevoir ? "history_edu" : "check"} size={22} />
          <span class="row-body"><span class="row-title">Révisions</span>
            <span class="meta">{aRevoir ? `${plural(aRevoir, "carte")} à revoir` : cartes.total ? "À jour" : "Rien à revoir pour l'instant"}</span></span>
          <Icon name="chevron_right" size={20} />
        </a>
      </div>

      <section class="progres-section" aria-labelledby="semaine-titre">
        <div class="progres-titre">
          <h2 id="semaine-titre" class="section-title">Cette semaine</h2>
          <span class="meta">{plural(b.joursActifs, "jour actif", "jours actifs")} sur 7</span>
        </div>
        <p class="small muted progres-protection">{b.protectionDispo ? "Un jour manqué par semaine ne casse pas ta série." : "Jour manqué pardonné cette semaine : ta série continue."}</p>
        <ol class="semaine" aria-label="Jours de la semaine">
          {b.semaine.map((n, i) => (
            <li key={i} class={n === null ? "a-venir" : n >= OBJECTIF_DU_JOUR ? "objectif" : n ? "actif" : b.protegees.includes(b.jours[i]) ? "protege" : ""}>
              <span class="semaine-rond" aria-hidden="true">{n !== null && n >= OBJECTIF_DU_JOUR ? <Icon name="check" size={16} /> : !n && b.protegees.includes(b.jours[i]) ? <Flamme taille={13} /> : null}</span>
              <span class="semaine-jour">{JOURS[i]}</span>
            </li>
          ))}
        </ol>
      </section>

      <section class="progres-section" aria-labelledby="maitrise-titre">
        <h2 id="maitrise-titre" class="section-title">Ta dissertation</h2>
        <ul class="maitrise">
          {etapes.map(e => (
            <li key={e.id}>
              <span class="maitrise-haut"><span>{e.nom}</span><span class="meta">{e.niveau}</span></span>
              <span class="progress-bar" aria-hidden="true"><span style={{ width: `${Math.max(e.score, 3)}%` }} /></span>
            </li>
          ))}
        </ul>
        {faible && faible.score < 85 && (
          <a class="progres-action" href={faible.conseil.lien}>
            <Icon name="edit" size={22} />
            <span class="row-body"><span class="row-title">{faible.conseil.texte}</span>
              <span class="meta">Pour progresser sur : {faible.nom.toLowerCase()}</span></span>
            <Icon name="chevron_right" size={20} />
          </a>
        )}
      </section>
    </Page>
  );
}
