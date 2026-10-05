import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { OBJECTIF_DU_JOUR, useBilan } from "../lib/progres";
import { cartesDuJour, nbCartes, useSuivis } from "../lib/revisions";
import { maitrise } from "../lib/maitrise";
import { defiFaitAujourdhui, sujetDuJour } from "../lib/defi";
import { numero } from "../lib/entrainement";
import { plural } from "../lib/text";

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

/** Ma progression : série de jours, objectif du jour, semaine, révisions, défi et niveau par étape. */
export function ProgresScreen() {
  const b = useBilan();
  const suivis = useSuivis();
  const aRevoir = cartesDuJour(suivis).length;
  const cartes = nbCartes(suivis);
  const etapes = maitrise();
  const defiFait = defiFaitAujourdhui();
  const evolution = b.joursActifs - b.joursActifsAvant;

  return (
    <Page title="Ma progression" back="#/accueil">
      <PageHeader title="Ma progression" compact />

      <section class="progres-haut">
        <div class="progres-serie">
          <span class="progres-chiffre">{b.serie}</span>
          <span><strong>{b.serie > 1 ? "jours d'affilée" : "jour d'affilée"}</strong><span class="meta">Record : {plural(b.record, "jour")}</span></span>
        </div>
        <div class="progres-objectif">
          <span class="objectif-points" aria-hidden="true">
            {Array.from({ length: OBJECTIF_DU_JOUR }, (_, i) => <span key={i} class={i < b.faitesAujourdhui ? "fait" : ""} />)}
          </span>
          <span class="meta">{b.faitesAujourdhui >= OBJECTIF_DU_JOUR ? "Objectif du jour atteint" : `Objectif du jour : ${Math.min(b.faitesAujourdhui, OBJECTIF_DU_JOUR)} / ${OBJECTIF_DU_JOUR}`}</span>
        </div>
      </section>
      <p class="small muted progres-aide">Chaque fiche, leçon, mot, révision ou défi compte. Reviens chaque jour pour garder ta série.</p>

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
            <span class="meta">{aRevoir ? `${plural(aRevoir, "carte")} à revoir` : cartes.total ? "À jour pour aujourd'hui" : "Ouvre des mots et fais des quiz"}</span></span>
          <Icon name="chevron_right" size={20} />
        </a>
      </div>

      <section class="progres-section" aria-labelledby="semaine-titre">
        <h2 id="semaine-titre" class="section-title">Ta semaine</h2>
        <ol class="semaine" aria-label="Jours de la semaine">
          {b.semaine.map((n, i) => (
            <li key={i} class={n === null ? "a-venir" : n >= OBJECTIF_DU_JOUR ? "objectif" : n ? "actif" : ""}>
              <span class="semaine-rond" aria-hidden="true">{n !== null && n >= OBJECTIF_DU_JOUR ? <Icon name="check" size={16} /> : null}</span>
              <span class="semaine-jour">{JOURS[i]}</span>
            </li>
          ))}
        </ol>
        <p class="small">
          {plural(b.joursActifs, "jour actif", "jours actifs")} sur 7, {plural(b.objectifsAtteints, "objectif atteint", "objectifs atteints")}
          {b.defis ? `, ${plural(b.defis, "défi relevé", "défis relevés")}` : ""}{b.revisions ? `, ${plural(b.revisions, "carte révisée", "cartes révisées")}` : ""}.
          {" "}{b.joursActifsAvant ? (evolution > 0 ? "Mieux que la semaine dernière." : evolution < 0 ? `La semaine dernière : ${plural(b.joursActifsAvant, "jour actif", "jours actifs")}.` : "Comme la semaine dernière.") : ""}
        </p>
        {cartes.total > 0 && <p class="small muted">{plural(cartes.sues, "carte bien retenue", "cartes bien retenues")} sur {cartes.total}.</p>}
      </section>

      <section class="progres-section" aria-labelledby="maitrise-titre">
        <h2 id="maitrise-titre" class="section-title">Ta maîtrise de la dissertation</h2>
        <ul class="maitrise">
          {etapes.map(e => (
            <li key={e.id}>
              <span class="maitrise-haut"><strong>{e.nom}</strong><span class="meta">{e.niveau}</span></span>
              <span class="progress-bar" aria-hidden="true"><span style={{ width: `${Math.max(e.score, 3)}%` }} /></span>
              {e.score < 85 && <a class="small link-strong" href={e.conseil.lien}>{e.conseil.texte}</a>}
            </li>
          ))}
        </ul>
        <details class="repli">
          <summary>Comment c'est calculé ?</summary>
          <p>Pour chaque étape : la leçon lue, ton meilleur score au quiz, et ce que tu as rédigé dans l'atelier (pour les exemples, aussi les fiches lues et les défis). Tout est calculé sur ton téléphone.</p>
        </details>
      </section>
    </Page>
  );
}
